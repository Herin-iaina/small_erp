from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.permissions import has_permission
from app.core.security import decode_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise credentials_exception
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    stmt = (
        select(User)
        .options(selectinload(User.role))
        .where(User.id == int(user_id))
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise credentials_exception
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


class PermissionChecker:
    """Dependency that checks a user has a specific permission."""

    def __init__(self, required_permission: str):
        self.required_permission = required_permission

    async def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role and current_user.role.is_superadmin:
            return current_user

        user_permissions: list[str] = []
        if current_user.role and current_user.role.permissions:
            user_permissions = current_user.role.permissions

        if not has_permission(user_permissions, self.required_permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission required: {self.required_permission}",
            )
        return current_user


class CompanyAccessChecker:
    """Dependency that checks a user can access a given company."""

    async def __call__(
        self,
        company_id: int,
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role and current_user.role.is_superadmin:
            return current_user

        if current_user.role and current_user.role.multi_company:
            return current_user

        if current_user.company_id != company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this company",
            )
        return current_user
