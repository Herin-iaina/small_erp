from fastapi import APIRouter

from app.api.v1.audit_logs import router as audit_logs_router
from app.api.v1.auth import router as auth_router
from app.api.v1.categories import router as categories_router
from app.api.v1.companies import router as companies_router
from app.api.v1.inventories import router as inventories_router
from app.api.v1.inventory_cycles import router as inventory_cycles_router
from app.api.v1.lots import router as lots_router
from app.api.v1.products import router as products_router
from app.api.v1.replenishment import router as replenishment_router
from app.api.v1.reservations import router as reservations_router
from app.api.v1.roles import router as roles_router
from app.api.v1.stock_dashboard import router as stock_dashboard_router
from app.api.v1.stock_movements import router as stock_movements_router
from app.api.v1.stock_transfers import router as stock_transfers_router
from app.api.v1.third_parties import router as third_parties_router
from app.api.v1.traceability import router as traceability_router
from app.api.v1.uom import router as uom_router
from app.api.v1.users import router as users_router
from app.api.v1.warehouses import router as warehouses_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(companies_router)
api_router.include_router(roles_router)
api_router.include_router(third_parties_router)
api_router.include_router(audit_logs_router)
api_router.include_router(categories_router)
api_router.include_router(products_router)
api_router.include_router(warehouses_router)
api_router.include_router(lots_router)
api_router.include_router(stock_movements_router)
api_router.include_router(inventories_router)
api_router.include_router(stock_dashboard_router)
api_router.include_router(reservations_router)
api_router.include_router(replenishment_router)
api_router.include_router(traceability_router)
api_router.include_router(stock_transfers_router)
api_router.include_router(inventory_cycles_router)
api_router.include_router(uom_router)
