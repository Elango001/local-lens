from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from app.models.offer import DiscountType, OfferStatus
from app.models.report import ReportReason

class BusinessDiscoveryBrief(BaseModel):
    id: int
    name: str
    category: str
    description: Optional[str] = None
    address: str
    city: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    status: str
    active_offers_count: Optional[int] = 0

    class Config:
        from_attributes = True

class DiscoveryOfferOut(BaseModel):
    id: int
    business_id: int
    title: str
    description: str
    discount_type: DiscountType
    discount_value: str
    terms_and_conditions: Optional[str] = None
    start_date: datetime
    end_date: datetime
    is_paused: bool
    status: OfferStatus
    created_at: datetime
    updated_at: datetime
    business: BusinessDiscoveryBrief
    distance_km: Optional[float] = None

    class Config:
        from_attributes = True

class CustomerReportCreate(BaseModel):
    offer_id: int
    reporter_email: Optional[EmailStr] = None
    reason: ReportReason
    description: Optional[str] = Field(None, max_length=1000)

class PaginatedDiscoveryOffersOut(BaseModel):
    items: List[DiscoveryOfferOut]
    total: int
    page: int
    page_size: int
    total_pages: int
    corrected_query: Optional[str] = None
