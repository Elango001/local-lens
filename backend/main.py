from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import auth, admin, merchant, discovery
from app.seed import seed_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables and seed initial data
    try:
        Base.metadata.create_all(bind=engine)
        seed_database()
    except Exception as e:
        print(f"\n=======================================================")
        print(f"[DATABASE ERROR] Could not connect or initialize database:")
        print(f"Target URL: {settings.DATABASE_URL}")
        print(f"Details: {e}")
        print(f"Hint: Ensure PostgreSQL is running and update backend/.env")
        print(f"      with your credentials (see backend/.env.example).")
        print(f"=======================================================\n")
        raise e
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
)

# CORS setup - explicit trusted origins for credential safety
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Standard Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "0"
    return response

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(merchant.router, prefix=settings.API_V1_STR)
app.include_router(discovery.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs",
    }

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
