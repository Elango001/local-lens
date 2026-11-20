import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class DiscountType(str, enum.Enum):
    PERCENTAGE = "percentage"
    FLAT = "flat"
    BOGO = "bogo"
    CUSTOM = "custom"

class OfferStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    EXPIRED = "expired"
    FLAGGED = "flagged"

class Offer(Base):
    __tablename__ = "offers"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)
    
    discount_type = Column(
        Enum(DiscountType, values_callable=lambda x: [e.value for e in x], native_enum=False),
        default=DiscountType.PERCENTAGE,
        nullable=False
    )
    discount_value = Column(String, nullable=False) # e.g. "25%", "$15 Off", "Buy 1 Get 1"
    terms_and_conditions = Column(Text, nullable=True)
    
    start_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=False)
    
    is_paused = Column(Boolean, default=False)
    status = Column(
        Enum(OfferStatus, values_callable=lambda x: [e.value for e in x], native_enum=False),
        default=OfferStatus.ACTIVE,
        nullable=False,
        index=True
    )
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    business = relationship("Business", back_populates="offers")
    reports = relationship("Report", back_populates="offer", cascade="all, delete-orphan")
