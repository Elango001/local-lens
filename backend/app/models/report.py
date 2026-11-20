import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class ReportReason(str, enum.Enum):
    EXPIRED = "expired"
    FAKE_DISCOUNT = "fake_discount"
    SHOP_CLOSED = "shop_closed"
    REFUSED_OFFER = "refused_offer"
    INACCURATE_INFO = "inaccurate_info"
    OTHER = "other"

class ReportStatus(str, enum.Enum):
    PENDING = "pending"                               # Within 24-hour grace period
    MERCHANT_RESOLVED = "merchant_resolved"           # Merchant clarified or fixed the deal
    MERCHANT_TAKEDOWN = "merchant_takedown"           # Merchant took down offer voluntarily
    AUTO_TAKEN_DOWN = "auto_taken_down"               # 24h grace expired without merchant action -> auto paused
    DISMISSED = "dismissed"                           # Admin or customer closed false alarm

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    offer_id = Column(Integer, ForeignKey("offers.id", ondelete="CASCADE"), nullable=False)
    business_id = Column(Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=True)
    
    reporter_email = Column(String, nullable=True)
    reason = Column(
        Enum(ReportReason, values_callable=lambda x: [e.value for e in x], native_enum=False),
        default=ReportReason.EXPIRED,
        nullable=False
    )
    description = Column(Text, nullable=True)
    
    # 24-Hour Grace Period & Resolution Flow
    grace_period_hours = Column(Integer, default=24, nullable=False)
    auto_taken_down = Column(Boolean, default=False)       # True if system auto-paused the offer after 24h
    merchant_notified = Column(Boolean, default=True)     # Reaches merchant dashboard instantly
    merchant_response = Column(Text, nullable=True)       # Merchant's clarification or resolution note
    
    status = Column(
        Enum(ReportStatus, values_callable=lambda x: [e.value for e in x], native_enum=False),
        default=ReportStatus.PENDING,
        nullable=False,
        index=True
    )
    admin_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    offer = relationship("Offer", back_populates="reports")
    business = relationship("Business", back_populates="reports")
