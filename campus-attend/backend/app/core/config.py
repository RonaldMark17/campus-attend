import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Base Directory: backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

class Settings(BaseModel):
    PROJECT_NAME: str = "CampusAttend"
    API_V1_STR: str = "/api/v1"
    
    # Database: Defaults to local SQLite for instant zero-dependency testing,
    # easily overridden with PostgreSQL (e.g. postgresql+psycopg2://postgres:postgres@localhost:5432/campusattend)
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/campusattend.db")
    
    # Session & Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "campusattend-offline-lan-insecure-secret-key-change-in-prod")
    SESSION_COOKIE_NAME: str = "campusattend_session"
    SESSION_EXPIRE_MINUTES: int = 480  # 8 hours
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    COOKIE_SAMESITE: str = "lax"
    
    # LAN & Server Config
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))

settings = Settings()
