from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import Token, UserLogin, UserCreate, UserOut
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if user_in.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SuperAdmin accounts cannot be self-registered via public API.",
        )

    existing = db.query(User).filter(User.email == user_in.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )
    
    user = User(
        email=user_in.email.lower().strip(),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value}
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role.value,
        email=user.email,
        full_name=user.full_name,
    )

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email.lower().strip()).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact support.",
        )
    
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value}
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role.value,
        email=user.email,
        full_name=user.full_name,
    )

@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user
