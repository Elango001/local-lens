from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserRole

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    email: str
    full_name: Optional[str] = None

class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=128)

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128, description="Password must be between 6 and 128 characters")
    full_name: Optional[str] = Field(None, max_length=100)
    role: UserRole = UserRole.CUSTOMER

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
