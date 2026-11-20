from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.business import Business, BusinessStatus
from app.models.offer import Offer, OfferStatus
from app.models.report import Report, ReportStatus
from app.schemas.business import BusinessCreate, BusinessUpdate, BusinessOut
from app.schemas.offer import OfferBase, OfferUpdate, OfferOut
from app.schemas.report import ReportOut
from app.core.security import get_current_merchant

router = APIRouter(prefix="/merchant", tags=["Merchant Portal"])

class MerchantReportResponse(BaseModel):
    merchant_response: str
    take_down_offer: Optional[bool] = False

def check_and_update_expiry(db: Session, business_id: Optional[int] = None):
    now = datetime.utcnow()
    query = db.query(Offer).filter(Offer.end_date < now, Offer.status == OfferStatus.ACTIVE)
    if business_id:
        query = query.filter(Offer.business_id == business_id)
    query.update({Offer.status: OfferStatus.EXPIRED}, synchronize_session=False)

    # Check 24-hour grace periods on reports
    expired_pending_reports = db.query(Report).filter(
        Report.status == ReportStatus.PENDING,
        Report.created_at <= now - timedelta(hours=24)
    ).all()

    for rep in expired_pending_reports:
        rep.status = ReportStatus.AUTO_TAKEN_DOWN
        rep.auto_taken_down = True
        rep.admin_notes = "Auto-taken down: 24-hour merchant response window elapsed."
        if rep.offer:
            rep.offer.is_paused = True
            rep.offer.status = OfferStatus.FLAGGED

    db.commit()

@router.get("/businesses", response_model=List[BusinessOut])
def get_my_businesses(
    db: Session = Depends(get_db),
    merchant: User = Depends(get_current_merchant),
):
    query = db.query(Business)
    if merchant.role != UserRole.ADMIN:
        query = query.filter(Business.owner_id == merchant.id)
    
    businesses = query.order_by(Business.created_at.desc()).all()
    res = []
    for b in businesses:
        b_out = BusinessOut.from_orm(b)
        b_out.offers_count = len(b.offers)
        res.append(b_out)
    return res

@router.post("/businesses", response_model=BusinessOut, status_code=status.HTTP_201_CREATED)
def register_business(
    biz_in: BusinessCreate,
    db: Session = Depends(get_db),
    merchant: User = Depends(get_current_merchant),
):
    business = Business(
        owner_id=merchant.id,
        name=biz_in.name,
        category=biz_in.category,
        description=biz_in.description,
        address=biz_in.address,
        city=biz_in.city,
        latitude=biz_in.latitude,
        longitude=biz_in.longitude,
        phone=biz_in.phone,
        email=biz_in.email or merchant.email,
        website=biz_in.website,
        tax_or_license_number=biz_in.tax_or_license_number,
        verification_documents=biz_in.verification_documents,
        status=BusinessStatus.PENDING,
    )
    db.add(business)
    db.commit()
    db.refresh(business)
    
    b_out = BusinessOut.from_orm(business)
    b_out.offers_count = 0
    return b_out

@router.get("/businesses/{business_id}", response_model=BusinessOut)
def get_business(
    business_id: int,
    db: Session = Depends(get_db),
    merchant: User = Depends(get_current_merchant),
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    if merchant.role != UserRole.ADMIN and business.owner_id != merchant.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this business")

    b_out = BusinessOut.from_orm(business)
    b_out.offers_count = len(business.offers)
    return b_out

@router.put("/businesses/{business_id}", response_model=BusinessOut)
def update_business(
    business_id: int,
    biz_update: BusinessUpdate,
    db: Session = Depends(get_db),
    merchant: User = Depends(get_current_merchant),
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    if merchant.role != UserRole.ADMIN and business.owner_id != merchant.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this business")

    update_data = biz_update.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(business, field, val)

    # If the business was rejected and owner updates license/tax info, set status back to PENDING for admin re-review
    if business.status == BusinessStatus.REJECTED and (biz_update.tax_or_license_number or biz_update.description):
        business.status = BusinessStatus.PENDING
        business.verification_notes = "Updated by merchant. Awaiting re-evaluation."

    db.commit()
    db.refresh(business)

    b_out = BusinessOut.from_orm(business)
    b_out.offers_count = len(business.offers)
    return b_out

# Offers
@router.get("/businesses/{business_id}/offers", response_model=List[OfferOut])
def get_business_offers(
    business_id: int,
    db: Session = Depends(get_db),
    merchant: User = Depends(get_current_merchant),
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    if merchant.role != UserRole.ADMIN and business.owner_id != merchant.id:
        raise HTTPException(status_code=403, detail="Not authorized to view offers for this business")

    check_and_update_expiry(db, business_id)

    offers = db.query(Offer).filter(Offer.business_id == business_id).order_by(Offer.created_at.desc()).all()
    res = []
    for o in offers:
        o_out = OfferOut.from_orm(o)
        o_out.reports_count = len(o.reports)
        res.append(o_out)
    return res

@router.post("/businesses/{business_id}/offers", response_model=OfferOut, status_code=status.HTTP_201_CREATED)
def create_offer(
    business_id: int,
    offer_in: OfferBase,
    db: Session = Depends(get_db),
    merchant: User = Depends(get_current_merchant),
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    if merchant.role != UserRole.ADMIN and business.owner_id != merchant.id:
        raise HTTPException(status_code=403, detail="Not authorized to create offers for this business")

    # Business verification check
    if business.status != BusinessStatus.VERIFIED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This business is '{business.status}'. Only verified businesses can publish live deals.",
        )

    offer = Offer(
        business_id=business_id,
        title=offer_in.title,
        description=offer_in.description,
        discount_type=offer_in.discount_type,
        discount_value=offer_in.discount_value,
        terms_and_conditions=offer_in.terms_and_conditions,
        start_date=offer_in.start_date,
        end_date=offer_in.end_date,
        is_paused=False,
        status=OfferStatus.ACTIVE,
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)

    o_out = OfferOut.from_orm(offer)
    o_out.reports_count = 0
    return o_out

@router.put("/offers/{offer_id}", response_model=OfferOut)
def update_offer(
    offer_id: int,
    offer_update: OfferUpdate,
    db: Session = Depends(get_db),
    merchant: User = Depends(get_current_merchant),
):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    if merchant.role != UserRole.ADMIN and offer.business.owner_id != merchant.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this offer")

    update_data = offer_update.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(offer, field, val)

    db.commit()
    db.refresh(offer)

    o_out = OfferOut.from_orm(offer)
    o_out.reports_count = len(offer.reports)
    return o_out

@router.post("/offers/{offer_id}/toggle-pause", response_model=OfferOut)
def toggle_pause_offer(
    offer_id: int,
    db: Session = Depends(get_db),
    merchant: User = Depends(get_current_merchant),
):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    if merchant.role != UserRole.ADMIN and offer.business.owner_id != merchant.id:
        raise HTTPException(status_code=403, detail="Not authorized to toggle this offer")

    # Toggle pause state
    new_paused = not offer.is_paused
    if not new_paused and offer.business.status != BusinessStatus.VERIFIED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot resume offer: Business is currently '{offer.business.status.value}'. Admin verification required.",
        )

    offer.is_paused = new_paused
    if new_paused:
        offer.status = OfferStatus.PAUSED
    else:
        # Check if already expired
        if offer.end_date < datetime.utcnow():
            offer.status = OfferStatus.EXPIRED
        else:
            offer.status = OfferStatus.ACTIVE

    db.commit()
    db.refresh(offer)

    o_out = OfferOut.from_orm(offer)
    o_out.reports_count = len(offer.reports)
    return o_out

@router.delete("/offers/{offer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_offer(
    offer_id: int,
    db: Session = Depends(get_db),
    merchant: User = Depends(get_current_merchant),
):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    if merchant.role != UserRole.ADMIN and offer.business.owner_id != merchant.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this offer")

    db.delete(offer)
    db.commit()
    return None

# Reports for this merchant's businesses
@router.get("/businesses/{business_id}/reports", response_model=List[ReportOut])
def get_business_reports(
    business_id: int,
    db: Session = Depends(get_db),
    merchant: User = Depends(get_current_merchant),
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    if merchant.role != UserRole.ADMIN and business.owner_id != merchant.id:
        raise HTTPException(status_code=403, detail="Not authorized to view reports for this business")

    check_and_update_expiry(db, business_id)

    reports = db.query(Report).filter(Report.business_id == business_id).order_by(Report.created_at.desc()).all()
    return [ReportOut.from_orm(r) for r in reports]

@router.post("/reports/{report_id}/respond", response_model=ReportOut)
def respond_to_report(
    report_id: int,
    payload: MerchantReportResponse,
    db: Session = Depends(get_db),
    merchant: User = Depends(get_current_merchant),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if merchant.role != UserRole.ADMIN and (not report.business or report.business.owner_id != merchant.id):
        raise HTTPException(status_code=403, detail="Not authorized to respond to this report")

    report.merchant_response = payload.merchant_response
    report.resolved_at = datetime.utcnow()

    if payload.take_down_offer:
        report.status = ReportStatus.MERCHANT_TAKEDOWN
        if report.offer:
            report.offer.is_paused = True
            report.offer.status = OfferStatus.PAUSED
    else:
        report.status = ReportStatus.MERCHANT_RESOLVED
        if report.offer and report.offer.status == OfferStatus.FLAGGED:
            if report.business and report.business.status != BusinessStatus.VERIFIED:
                report.offer.is_paused = True
                report.offer.status = OfferStatus.PAUSED
            elif report.offer.end_date < datetime.utcnow():
                report.offer.is_paused = True
                report.offer.status = OfferStatus.EXPIRED
            else:
                report.offer.status = OfferStatus.ACTIVE
                report.offer.is_paused = False

    db.commit()
    db.refresh(report)
    return ReportOut.from_orm(report)
