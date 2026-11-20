from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.business import BusinessStatus

class BusinessBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    category: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    address: str = Field(..., min_length=1, max_length=255)
    city: str = Field(..., min_length=1, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    phone: Optional[str] = Field(None, max_length=30)
    email: Optional[str] = Field(None, max_length=150)
    website: Optional[str] = Field(None, max_length=255)
    tax_or_license_number: Optional[str] = Field(None, max_length=100)
    verification_documents: Optional[str] = Field(None, max_length=5000)

class BusinessCreate(BusinessBase):
    pass

class BusinessUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    address: Optional[str] = Field(None, min_length=1, max_length=255)
    city: Optional[str] = Field(None, min_length=1, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    phone: Optional[str] = Field(None, max_length=30)
    email: Optional[str] = Field(None, max_length=150)
    website: Optional[str] = Field(None, max_length=255)
    tax_or_license_number: Optional[str] = Field(None, max_length=100)

class BusinessVerifyRequest(BaseModel):
    status: BusinessStatus # VERIFIED or REJECTED
    verification_notes: Optional[str] = Field(None, max_length=2000)

class BusinessOwnerInfo(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None

    class Config:
        from_attributes = True

class BusinessOut(BusinessBase):
    id: int
    owner_id: int
    status: BusinessStatus
    verification_notes: Optional[str] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    owner: Optional[BusinessOwnerInfo] = None
    offers_count: Optional[int] = 0

    class Config:
        from_attributes = True
