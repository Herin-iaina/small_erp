import logging
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

# Resolve .env: check backend/.env, then project root .env
_backend_dir = Path(__file__).resolve().parent.parent.parent  # backend/
_root_dir = _backend_dir.parent  # ERP/

_env_file: Path | None = None
for candidate in [_backend_dir / ".env", _root_dir / ".env"]:
    if candidate.is_file():
        _env_file = candidate
        break


class Settings(BaseSettings):
    # Database
    POSTGRES_USER: str = "erp_user"
    POSTGRES_PASSWORD: str = "erp_password_change_me"
    POSTGRES_DB: str = "erp_db"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def DATABASE_URL_SYNC(self) -> str:
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # JWT
    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    # First superadmin
    FIRST_SUPERADMIN_EMAIL: str = "admin@erp.local"
    FIRST_SUPERADMIN_PASSWORD: str = "admin123"

    # Redis
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379

    model_config = SettingsConfigDict(
        env_file=str(_env_file) if _env_file else None,
        env_file_encoding="utf-8",
        case_sensitive=True,
        # env vars always win over .env file values
        env_nested_delimiter=None,
    )


settings = Settings()

# Log the config source at startup
if _env_file:
    logger.info("Config loaded from: %s (env vars override)", _env_file)
else:
    logger.warning(
        "No .env file found, using environment variables and defaults"
    )
