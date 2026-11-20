from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.user import User
from app.models.business import Business, BusinessStatus
from app.models.offer import Offer, OfferStatus
from app.models.report import Report, ReportStatus
from app.schemas.business import BusinessOut, BusinessVerifyRequest
from app.schemas.report import ReportOut, ReportResolveRequest
from app.schemas.admin import AdminStatsOut
from app.core.security import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

def apply_auto_takedowns_and_expiry(db: Session):
    now = datetime.utcnow()
    # 1. Auto-expire any offers where end_date < now
    db.query(Offer).filter(Offer.end_date < now, Offer.status == OfferStatus.ACTIVE).update(
        {Offer.status: OfferStatus.EXPIRED}, synchronize_session=False
    )

    # 2. 24-Hour Grace Period Auto-Takedown for Customer Reports:
    # If 24 hours have passed without merchant resolution or takedown, system auto-pauses the offer.
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

@router.get("/stats", response_model=AdminStatsOut)
def get_admin_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    apply_auto_takedowns_and_expiry(db)

    total_registered_businesses = db.query(Business).count()
    pending_verifications = db.query(Business).filter(Business.status == BusinessStatus.PENDING).count()
    verified_businesses = db.query(Business).filter(Business.status == BusinessStatus.VERIFIED).count()
    rejected_businesses = db.query(Business).filter(Business.status == BusinessStatus.REJECTED).count()

    pending_reports = db.query(Report).filter(Report.status == ReportStatus.PENDING).count()
    total_reports = db.query(Report).count()
    auto_takedowns_count = db.query(Report).filter(Report.auto_taken_down == True).count()

    # Category breakdown of registered businesses
    cat_query = db.query(Business.category, func.count(Business.id)).group_by(Business.category).all()
    categories_breakdown = {cat: count for cat, count in cat_query if cat}

    # City breakdown of registered businesses
    city_query = db.query(Business.city, func.count(Business.id)).group_by(Business.city).all()
    cities_breakdown = {city: count for city, count in city_query if city}

    return AdminStatsOut(
        total_registered_businesses=total_registered_businesses,
        pending_verifications=pending_verifications,
        verified_businesses=verified_businesses,
        rejected_businesses=rejected_businesses,
        pending_reports=pending_reports,
        auto_takedowns_count=auto_takedowns_count,
        total_reports=total_reports,
        categories_breakdown=categories_breakdown,
        cities_breakdown=cities_breakdown,
    )

@router.get("/businesses", response_model=List[BusinessOut])
def list_registered_businesses(
    status_filter: Optional[BusinessStatus] = Query(None, alias="status"),
    category: Optional[str] = None,
    city: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = db.query(Business)
    if status_filter:
        query = query.filter(Business.status == status_filter)
    if category:
        query = query.filter(Business.category.ilike(f"%{category}%"))
    if city:
        query = query.filter(Business.city.ilike(f"%{city}%"))
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (Business.name.ilike(search_fmt)) |
            (Business.city.ilike(search_fmt)) |
            (Business.address.ilike(search_fmt)) |
            (Business.tax_or_license_number.ilike(search_fmt))
        )
    
    businesses = query.order_by(Business.created_at.desc()).all()
    
    res = []
    for b in businesses:
        b_out = BusinessOut.from_orm(b)
        b_out.offers_count = len(b.offers)
        res.append(b_out)
    return res

@router.get("/businesses/{business_id}", response_model=BusinessOut)
def get_business_details(
    business_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    b_out = BusinessOut.from_orm(business)
    b_out.offers_count = len(business.offers)
    return b_out

@router.post("/businesses/{business_id}/verify", response_model=BusinessOut)
def review_business_verification(
    business_id: int,
    payload: BusinessVerifyRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    business.status = payload.status
    business.verification_notes = payload.verification_notes
    if payload.status == BusinessStatus.VERIFIED:
        business.verified_at = datetime.utcnow()
    else:
        business.verified_at = None
    
    db.commit()
    db.refresh(business)
    
    b_out = BusinessOut.from_orm(business)
    b_out.offers_count = len(business.offers)
    return b_out

@router.get("/reports", response_model=List[ReportOut])
def list_customer_reports(
    status_filter: Optional[ReportStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    apply_auto_takedowns_and_expiry(db)

    query = db.query(Report)
    if status_filter:
        query = query.filter(Report.status == status_filter)
    
    reports = query.order_by(Report.created_at.desc()).all()
    return [ReportOut.from_orm(r) for r in reports]

@router.post("/reports/{report_id}/resolve", response_model=ReportOut)
def resolve_customer_report(
    report_id: int,
    payload: ReportResolveRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    report.status = payload.status
    report.admin_notes = payload.admin_notes
    report.resolved_at = datetime.utcnow()
    
    # If take_down_offer is selected, pause and flag the offer immediately
    if payload.take_down_offer and report.offer:
        report.offer.status = OfferStatus.FLAGGED
        report.offer.is_paused = True
        report.auto_taken_down = True
    
    # If restore_offer is selected, unpause and restore offer to active
    if payload.restore_offer and report.offer:
        if report.business and report.business.status != BusinessStatus.VERIFIED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot restore offer: Business is '{report.business.status.value}'. Must be verified.",
            )
        if report.offer.end_date < datetime.utcnow():
            report.offer.status = OfferStatus.EXPIRED
            report.offer.is_paused = True
            report.auto_taken_down = False
        else:
            report.offer.status = OfferStatus.ACTIVE
            report.offer.is_paused = False
            report.auto_taken_down = False
    
    db.commit()
    db.refresh(report)
    return ReportOut.from_orm(report)
