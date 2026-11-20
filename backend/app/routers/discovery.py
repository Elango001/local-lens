import math
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.database import get_db
from app.models.business import Business, BusinessStatus
from app.models.offer import Offer, OfferStatus
from app.models.report import Report, ReportStatus, ReportReason
from app.schemas.discovery import DiscoveryOfferOut, BusinessDiscoveryBrief, CustomerReportCreate, PaginatedDiscoveryOffersOut
from app.schemas.report import ReportOut
from app.routers.admin import apply_auto_takedowns_and_expiry
from app.services.search_service import expand_search_query

router = APIRouter(prefix="/discovery", tags=["Customer Discovery"])

def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> Optional[float]:
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None
    R = 6371.0 # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)

@router.get("/offers", response_model=PaginatedDiscoveryOffersOut)
def get_discovered_offers(
    category: Optional[str] = Query(None, max_length=50, description="Category filter"),
    city: Optional[str] = Query(None, max_length=50, description="City filter"),
    search: Optional[str] = Query(None, max_length=100, description="Search term for offer or store"),
    lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="User latitude for distance calculation"),
    lng: Optional[float] = Query(None, ge=-180.0, le=180.0, description="User longitude for distance calculation"),
    radius_km: Optional[float] = Query(None, ge=0.1, le=500.0, description="Radius in km"),
    sort_by: Optional[str] = Query("distance", pattern="^(distance|expiring_soon|newest)$", description="Sort by: distance | expiring_soon | newest"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=50, description="Items per page"),
    db: Session = Depends(get_db),
):
    """
    Customer deal discovery endpoint.
    - Excludes expired, paused, or unverified business offers.
    - Computes real-time geographic distance.
    - Supports radius and category filtering.
    """
    apply_auto_takedowns_and_expiry(db)

    now = datetime.utcnow()
    query = (
        db.query(Offer)
        .join(Business, Offer.business_id == Business.id)
        .filter(
            Offer.status == OfferStatus.ACTIVE,
            Offer.is_paused == False,
            Offer.end_date >= now,
            Business.status == BusinessStatus.VERIFIED,
        )
    )

    if category and category != "all":
        query = query.filter(Business.category == category)

    if city and city != "all":
        query = query.filter(Business.city.ilike(f"%{city}%"))

    corrected_search: Optional[str] = None
    if search:
        expanded_terms, matched_cats, corrected_search = expand_search_query(search)

        search_clauses = []
        for term in expanded_terms:
            search_pattern = f"%{term}%"
            search_clauses.append(Offer.title.ilike(search_pattern))
            search_clauses.append(Offer.description.ilike(search_pattern))
            search_clauses.append(Business.name.ilike(search_pattern))

        for cat in matched_cats:
            search_clauses.append(Business.category == cat)

        if search_clauses:
            query = query.filter(or_(*search_clauses))

    offers = query.all()

    # Compute distances and build result list
    result = []
    for offer in offers:
        dist = None
        if lat is not None and lng is not None and offer.business.latitude and offer.business.longitude:
            dist = calculate_distance_km(lat, lng, offer.business.latitude, offer.business.longitude)

        # Check radius filter
        if radius_km is not None and dist is not None:
            if dist > radius_km:
                continue

        # Prepare payload
        item = DiscoveryOfferOut(
            id=offer.id,
            business_id=offer.business_id,
            title=offer.title,
            description=offer.description,
            discount_type=offer.discount_type,
            discount_value=offer.discount_value,
            terms_and_conditions=offer.terms_and_conditions,
            start_date=offer.start_date,
            end_date=offer.end_date,
            is_paused=offer.is_paused,
            status=offer.status,
            created_at=offer.created_at,
            updated_at=offer.updated_at,
            business=BusinessDiscoveryBrief(
                id=offer.business.id,
                name=offer.business.name,
                category=offer.business.category,
                description=offer.business.description,
                address=offer.business.address,
                city=offer.business.city,
                latitude=offer.business.latitude,
                longitude=offer.business.longitude,
                phone=offer.business.phone,
                email=offer.business.email,
                website=offer.business.website,
                status=offer.business.status.value,
            ),
            distance_km=dist,
        )
        result.append(item)

    # Sort
    if sort_by == "distance" and lat is not None and lng is not None:
        result.sort(key=lambda x: (x.distance_km is None, x.distance_km or 999999))
    elif sort_by == "expiring_soon":
        result.sort(key=lambda x: x.end_date)
    elif sort_by == "newest":
        result.sort(key=lambda x: x.created_at, reverse=True)

    total = len(result)
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_items = result[start_idx:end_idx]

    return PaginatedDiscoveryOffersOut(
        items=paginated_items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        corrected_query=corrected_search,
    )

@router.get("/offers/{offer_id}", response_model=DiscoveryOfferOut)
def get_offer_details(
    offer_id: int,
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Get detailed offer information including branch details, validity, and conditions.
    """
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found",
        )
    
    dist = None
    if lat is not None and lng is not None and offer.business.latitude and offer.business.longitude:
        dist = calculate_distance_km(lat, lng, offer.business.latitude, offer.business.longitude)

    return DiscoveryOfferOut(
        id=offer.id,
        business_id=offer.business_id,
        title=offer.title,
        description=offer.description,
        discount_type=offer.discount_type,
        discount_value=offer.discount_value,
        terms_and_conditions=offer.terms_and_conditions,
        start_date=offer.start_date,
        end_date=offer.end_date,
        is_paused=offer.is_paused,
        status=offer.status,
        created_at=offer.created_at,
        updated_at=offer.updated_at,
        business=BusinessDiscoveryBrief(
            id=offer.business.id,
            name=offer.business.name,
            category=offer.business.category,
            description=offer.business.description,
            address=offer.business.address,
            city=offer.business.city,
            latitude=offer.business.latitude,
            longitude=offer.business.longitude,
            phone=offer.business.phone,
            email=offer.business.email,
            website=offer.business.website,
            status=offer.business.status.value,
        ),
        distance_km=dist,
    )

@router.get("/businesses", response_model=List[BusinessDiscoveryBrief])
def get_discovered_businesses(
    category: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    List verified businesses available for customer discovery.
    """
    query = db.query(Business).filter(Business.status == BusinessStatus.VERIFIED)
    if category and category != "all":
        query = query.filter(Business.category == category)
    if city and city != "all":
        query = query.filter(Business.city.ilike(f"%{city}%"))

    businesses = query.all()
    now = datetime.utcnow()
    result = []
    for b in businesses:
        active_count = db.query(Offer).filter(
            Offer.business_id == b.id,
            Offer.status == OfferStatus.ACTIVE,
            Offer.is_paused == False,
            Offer.end_date >= now,
        ).count()

        result.append(BusinessDiscoveryBrief(
            id=b.id,
            name=b.name,
            category=b.category,
            description=b.description,
            address=b.address,
            city=b.city,
            latitude=b.latitude,
            longitude=b.longitude,
            phone=b.phone,
            email=b.email,
            website=b.website,
            status=b.status.value,
            active_offers_count=active_count,
        ))

    return result

@router.post("/reports", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def submit_customer_report(
    report_in: CustomerReportCreate,
    db: Session = Depends(get_db),
):
    """
    Customer submits an inaccurate offer report.
    - Instantly notifies merchant on their dashboard.
    - Initiates the 24-hour grace window before automatic take-down.
    - Appears in SuperAdmin Customer Reports inbox for tracking.
    - Rate-limits duplicate pending reports to avoid abuse.
    """
    offer = db.query(Offer).filter(Offer.id == report_in.offer_id).first()
    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found",
        )

    norm_email = report_in.reporter_email.strip().lower() if report_in.reporter_email else None

    # Anti-Spam Check: Duplicate pending report from same reporter
    if norm_email:
        existing_report = db.query(Report).filter(
            Report.offer_id == offer.id,
            Report.reporter_email == norm_email,
            Report.status == ReportStatus.PENDING,
        ).first()
        if existing_report:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="A pending report from this email for this offer is already under active review.",
            )
    else:
        # Prevent rapid anonymous flood reports for identical reasons within 1 hour
        recent_dup = db.query(Report).filter(
            Report.offer_id == offer.id,
            Report.reason == report_in.reason,
            Report.status == ReportStatus.PENDING,
            Report.created_at >= datetime.utcnow() - timedelta(hours=1),
        ).first()
        if recent_dup:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="A similar report for this offer was recently submitted and is currently under merchant review.",
            )

    report = Report(
        offer_id=offer.id,
        business_id=offer.business_id,
        reporter_email=norm_email,
        reason=report_in.reason,
        description=report_in.description.strip() if report_in.description else None,
        grace_period_hours=24,
        auto_taken_down=False,
        merchant_notified=True,
        status=ReportStatus.PENDING,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return report
