"""
Granular permission system.

Permissions follow the pattern: module.action
Examples: pos.view, stock.create, sales.validate, purchase.delete

Special permissions:
  - *.* : superadmin wildcard
  - sales.validate_above_threshold : validate sales above amount threshold
  - pos.refund : process POS refunds (requires PIN)
  - pos.discount_above_threshold : apply discounts above configured threshold
  - pos.cancel_sale : cancel a POS sale (requires PIN)
  - pos.early_close : close register early (requires PIN)
"""

from enum import Enum


class Module(str, Enum):
    POS = "pos"
    STOCK = "stock"
    SALES = "sales"
    PURCHASE = "purchase"
    INVOICING = "invoicing"
    MRP = "mrp"
    ACCOUNTING = "accounting"
    ADMIN = "admin"
    THIRD_PARTY = "third_party"


class Action(str, Enum):
    VIEW = "view"
    CREATE = "create"
    EDIT = "edit"
    DELETE = "delete"
    VALIDATE = "validate"
    EXPORT = "export"


# Actions that require PIN verification
PIN_REQUIRED_ACTIONS: set[str] = {
    "pos.refund",
    "pos.discount_above_threshold",
    "pos.cancel_sale",
    "pos.early_close",
    "sales.cancel",
}

# Default role definitions
DEFAULT_ROLES: dict[str, dict] = {
    "super_admin": {
        "label": "Super Administrateur",
        "is_superadmin": True,
        "permissions": ["*.*"],
        "multi_company": True,
    },
    "manager": {
        "label": "Gerant",
        "is_superadmin": False,
        "permissions": [
            "pos.*",
            "stock.*",
            "sales.*",
            "purchase.*",
            "invoicing.*",
            "accounting.*",
            "third_party.*",
            "admin.view",
            "admin.edit",
        ],
        "multi_company": False,
    },
    "seller": {
        "label": "Vendeur",
        "permissions": [
            "sales.view",
            "sales.create",
            "sales.edit",
            "stock.view",
            "third_party.view",
            "third_party.create",
        ],
        "multi_company": False,
    },
    "cashier": {
        "label": "Caissier",
        "permissions": [
            "pos.view",
            "pos.create",
            "pos.edit",
            "third_party.view",
        ],
        "multi_company": False,
    },
    "warehouse_clerk": {
        "label": "Magasinier",
        "permissions": [
            "stock.*",
            "third_party.view",
        ],
        "multi_company": False,
    },
    "accountant": {
        "label": "Comptable",
        "permissions": [
            "invoicing.*",
            "accounting.*",
            "sales.view",
            "purchase.view",
            "third_party.view",
            "third_party.edit",
        ],
        "multi_company": False,
    },
}


def has_permission(user_permissions: list[str], required: str) -> bool:
    """Check if a list of permission strings satisfies the required permission."""
    if "*.*" in user_permissions:
        return True

    req_module, req_action = required.split(".", 1)

    for perm in user_permissions:
        p_module, p_action = perm.split(".", 1)
        if p_module == "*" or p_module == req_module:
            if p_action == "*" or p_action == req_action:
                return True
    return False


def requires_pin(permission: str) -> bool:
    """Check if an action requires PIN verification."""
    return permission in PIN_REQUIRED_ACTIONS
