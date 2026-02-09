from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import PermissionChecker
from app.core.permissions import Module, Action
from app.models.user import User
from app.schemas.role import RoleCreate, RoleRead, RoleUpdate
from app.services.role import create_role, delete_role, get_role, list_roles, update_role

router = APIRouter(prefix="/roles", tags=["Roles"])


@router.get("", response_model=dict)
async def list_roles_endpoint(
    company_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("admin.view")),
):
    result = await list_roles(db, company_id=company_id, page=page, page_size=page_size)
    result["items"] = [RoleRead.model_validate(r) for r in result["items"]]
    return result


@router.post("", response_model=RoleRead, status_code=201)
async def create_role_endpoint(
    body: RoleCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("admin.create")),
):
    role = await create_role(db, body)
    return RoleRead.model_validate(role)


@router.get("/available-permissions")
async def available_permissions(
    _: User = Depends(PermissionChecker("admin.view")),
):
    """Returns all possible module.action permission combinations."""
    perms = []
    for module in Module:
        for action in Action:
            perms.append(f"{module.value}.{action.value}")
        perms.append(f"{module.value}.*")
    return {"permissions": perms}


@router.get("/{role_id}", response_model=RoleRead)
async def get_role_endpoint(
    role_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("admin.view")),
):
    role = await get_role(db, role_id)
    return RoleRead.model_validate(role)


@router.patch("/{role_id}", response_model=RoleRead)
async def update_role_endpoint(
    role_id: int,
    body: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("admin.edit")),
):
    role = await update_role(db, role_id, body)
    return RoleRead.model_validate(role)


@router.delete("/{role_id}", status_code=204)
async def delete_role_endpoint(
    role_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(PermissionChecker("admin.delete")),
):
    await delete_role(db, role_id)
