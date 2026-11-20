import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class BusinessStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"

class Business(Base):
    __tablename__ = "businesses"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False, index=True) # Restaurant, Retail, Services, Health, etc.
    description = Column(Text, nullable=True)
    
    # Contact & Location
    address = Column(String, nullable=False)
    city = Column(String, nullable=False, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    website = Column(String, nullable=True)

    # Verification Details
    status = Column(
        Enum(BusinessStatus, values_callable=lambda x: [e.value for e in x], native_enum=False),
        default=BusinessStatus.PENDING,
        nullable=False,
        index=True
    )
    tax_or_license_number = Column(String, nullable=True)
    verification_documents = Column(Text, nullable=True) # URLs or notes submitted for verification
    verification_notes = Column(Text, nullable=True)    # Admin feedback or reason for rejection
    verified_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="businesses")
    offers = relationship("Offer", back_populates="business", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="business", cascade="all, delete-orphan")
