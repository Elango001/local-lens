import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "LocalLens API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "locallens-super-secret-jwt-key-2026-development")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database Configuration:
    # Set DATABASE_URL in your backend/.env file to your PostgreSQL instance.
    # Example: postgresql://<username>:<password>@<host>:<port>/<database_name>
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:Elango2006@localhost:5432/locallens"
    )

    # Allowed CORS Origins for cross-origin credentials security
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
