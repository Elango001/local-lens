from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, model_validator
from app.models.offer import DiscountType, OfferStatus

class OfferBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    description: str = Field(..., min_length=5, max_length=2000)
    discount_type: DiscountType = DiscountType.PERCENTAGE
    discount_value: str = Field(..., min_length=1, max_length=50)
    terms_and_conditions: Optional[str] = Field(None, max_length=3000)
    start_date: datetime
    end_date: datetime

    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be strictly after start_date")
        return self

class OfferCreate(OfferBase):
    business_id: int

class OfferUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=150)
    description: Optional[str] = Field(None, min_length=5, max_length=2000)
    discount_type: Optional[DiscountType] = None
    discount_value: Optional[str] = Field(None, min_length=1, max_length=50)
    terms_and_conditions: Optional[str] = Field(None, max_length=3000)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_paused: Optional[bool] = None

    @model_validator(mode="after")
    def validate_update_dates(self):
        if self.start_date and self.end_date and self.end_date <= self.start_date:
            raise ValueError("end_date must be strictly after start_date")
        return self

class OfferStatusUpdate(BaseModel):
    status: OfferStatus
    is_paused: Optional[bool] = None

class BusinessBrief(BaseModel):
    id: int
    name: str
    category: str
    city: str

    class Config:
        from_attributes = True

class OfferOut(OfferBase):
    id: int
    business_id: int
    is_paused: bool
    status: OfferStatus
    created_at: datetime
    updated_at: datetime
    business: Optional[BusinessBrief] = None
    reports_count: Optional[int] = 0

    class Config:
        from_attributes = True
