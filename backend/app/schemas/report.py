from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, computed_field
from app.models.report import ReportReason, ReportStatus

class ReportBase(BaseModel):
    offer_id: int
    business_id: Optional[int] = None
    reporter_email: Optional[str] = None
    reason: ReportReason
    description: Optional[str] = None

class ReportCreate(ReportBase):
    pass

class ReportResolveRequest(BaseModel):
    status: ReportStatus
    admin_notes: Optional[str] = None
    take_down_offer: Optional[bool] = False # True forces takedown / pause of the offer
    restore_offer: Optional[bool] = False   # True unpauses/restores offer if dismissed or resolved

class OfferBriefForReport(BaseModel):
    id: int
    title: str
    discount_value: str
    status: str
    business_id: int
    is_paused: bool

    class Config:
        from_attributes = True

class BusinessBriefForReport(BaseModel):
    id: int
    name: str
    category: str
    city: str
    phone: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True

class ReportOut(ReportBase):
    id: int
    grace_period_hours: int = 24
    auto_taken_down: bool
    merchant_notified: bool
    merchant_response: Optional[str] = None
    status: ReportStatus
    admin_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    offer: Optional[OfferBriefForReport] = None
    business: Optional[BusinessBriefForReport] = None

    @computed_field
    def deadline(self) -> datetime:
        return self.created_at + timedelta(hours=self.grace_period_hours)

    @computed_field
    def is_grace_period_expired(self) -> bool:
        return datetime.utcnow() > (self.created_at + timedelta(hours=self.grace_period_hours))

    class Config:
        from_attributes = True
