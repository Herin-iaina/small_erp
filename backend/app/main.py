import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import AsyncSessionLocal, engine
from app.core.permissions import DEFAULT_ROLES
from app.core.security import hash_password
from app.models.base import Base
from app.models.company import Company
from app.models.role import Role
from app.models.user import User

logger = logging.getLogger(__name__)


async def ensure_database_exists() -> None:
    """Connect to the default 'postgres' database and create the target DB if missing."""
    admin_url = (
        f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
        f"@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/postgres"
    )
    tmp_engine = create_async_engine(admin_url, isolation_level="AUTOCOMMIT")
    try:
        async with tmp_engine.connect() as conn:
            result = await conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :dbname"),
                {"dbname": settings.POSTGRES_DB},
            )
            if not result.scalar():
                await conn.execute(text(f'CREATE DATABASE "{settings.POSTGRES_DB}"'))
                logger.info("Created database '%s'", settings.POSTGRES_DB)
            else:
                logger.debug("Database '%s' already exists", settings.POSTGRES_DB)
    finally:
        await tmp_engine.dispose()


async def seed_defaults() -> None:
    """Create default roles + first superadmin on first startup."""
    async with AsyncSessionLocal() as db:
        # Check if already seeded
        result = await db.execute(select(Role).where(Role.is_system.is_(True)).limit(1))
        if result.scalar_one_or_none():
            return

        # Create default company
        company = Company(
            name="Ma Societe",
            currency="EUR",
            country="France",
        )
        db.add(company)
        await db.flush()

        # Create default roles
        role_map: dict[str, Role] = {}
        for role_key, role_def in DEFAULT_ROLES.items():
            role = Role(
                name=role_key,
                label=role_def["label"],
                permissions=role_def["permissions"],
                is_superadmin=role_def.get("is_superadmin", False),
                multi_company=role_def.get("multi_company", False),
                is_system=True,
                company_id=None if role_def.get("is_superadmin") else company.id,
            )
            db.add(role)
            role_map[role_key] = role
        await db.flush()

        # Create superadmin user
        admin = User(
            email=settings.FIRST_SUPERADMIN_EMAIL,
            hashed_password=hash_password(settings.FIRST_SUPERADMIN_PASSWORD),
            first_name="Super",
            last_name="Admin",
            is_active=True,
            company_id=company.id,
            role_id=role_map["super_admin"].id,
        )
        db.add(admin)
        await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure DB exists, create tables, seed
    await ensure_database_exists()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_defaults()
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title="ERP System",
    version="0.1.0",
    description="Modular ERP with multi-tenancy, RBAC and PIN verification",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
