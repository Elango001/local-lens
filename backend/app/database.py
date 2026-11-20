from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# Normalize legacy 'postgres://' schema to 'postgresql://' for SQLAlchemy 2.0+ compatibility
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# PostgreSQL engine with production connection pooling and health checks
engine = create_engine(
    db_url,
    pool_pre_ping=True,      # Tests connection liveness to avoid stale disconnected sockets
    pool_size=10,            # Steady-state connection pool size
    max_overflow=20,         # Maximum temporary burst connections
    pool_timeout=30,         # Timeout waiting for a free connection
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
