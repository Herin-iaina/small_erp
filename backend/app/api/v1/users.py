from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import PermissionChecker, get_current_user
from app.models.user import User
from app.schemas.user import (
    UserChangePassword,
    UserCreate,
    UserRead,
    UserSetPin,
    UserUpdate,
)
from app.services.user import (
    change_password,
    create_user,
    get_user,
    list_users,
    set_user_pin,
    update_user,
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=dict)
async def list_users_endpoint(
    company_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("admin.view")),
):
    result = await list_users(db, company_id=company_id, page=page, page_size=page_size)
    result["items"] = [UserRead.model_validate(u) for u in result["items"]]
    return result


@router.post("", response_model=UserRead, status_code=201)
async def create_user_endpoint(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("admin.create")),
):
    user = await create_user(db, body)
    return UserRead.model_validate(user)


@router.get("/{user_id}", response_model=UserRead)
async def get_user_endpoint(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("admin.view")),
):
    user = await get_user(db, user_id)
    return UserRead.model_validate(user)


@router.patch("/{user_id}", response_model=UserRead)
async def update_user_endpoint(
    user_id: int,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("admin.edit")),
):
    user = await update_user(db, user_id, body)
    return UserRead.model_validate(user)


@router.post("/{user_id}/set-pin", response_model=UserRead)
async def set_pin_endpoint(
    user_id: int,
    body: UserSetPin,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Users can set their own PIN, admins can set anyone's
    if current_user.id != user_id:
        PermissionChecker("admin.edit")
    user = await set_user_pin(db, user_id, body.pin)
    return UserRead.model_validate(user)


@router.post("/me/change-password", response_model=UserRead)
async def change_password_endpoint(
    body: UserChangePassword,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await change_password(db, current_user, body.current_password, body.new_password)
    return UserRead.model_validate(user)
