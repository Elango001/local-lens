import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from app.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MERCHANT = "merchant"
    CUSTOMER = "customer"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(
        Enum(UserRole, values_callable=lambda x: [e.value for e in x], native_enum=False),
        default=UserRole.CUSTOMER,
        nullable=False
    )
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    businesses = relationship("Business", back_populates="owner", cascade="all, delete-orphan")
