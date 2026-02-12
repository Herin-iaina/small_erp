# ERP System - Application Modulaire

Application ERP multi-tenant avec gestion granulaire des permissions, verification par PIN et architecture modulaire.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2 (async), Alembic |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Shadcn/ui, Zustand |
| Base de donnees | PostgreSQL 16 |
| Cache | Redis 7 |
| Containerisation | Docker Compose |

## Demarrage rapide

### Prerequis

- Docker et Docker Compose installes
- (Optionnel) Node.js 20+ et Python 3.12+ pour le developpement local

### Lancement avec Docker

```bash
# 1. Cloner et entrer dans le repertoire
cd ERP

# 2. Copier la config (ajuster si necessaire)
cp .env.example .env

# 3. Lancer tous les services
docker compose up --build
```

Les services seront disponibles :
- **Frontend** : http://localhost:5173
- **Backend API** : http://localhost:8000
- **Swagger / OpenAPI** : http://localhost:8000/docs
- **PostgreSQL** : localhost:5432
- **Redis** : localhost:6379

### Compte par defaut

| Champ | Valeur |
|-------|--------|
| Email | `admin@erp.local` |
| Mot de passe | `admin123` |

> Ce compte Super Admin est cree automatiquement au premier demarrage.

### Developpement local (sans Docker)

**Backend :**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configurer les variables (adapter POSTGRES_HOST=localhost)
export POSTGRES_HOST=localhost

uvicorn app.main:app --reload
```

**Frontend :**
```bash
cd frontend
npm install
npm run dev
```

## Architecture

```
ERP/
├── docker-compose.yml
├── .env / .env.example
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/              # Migrations DB
│   └── app/
│       ├── main.py           # Point d'entree FastAPI + seed
│       ├── core/
│       │   ├── config.py     # Settings (pydantic-settings)
│       │   ├── database.py   # Engine + session async
│       │   ├── security.py   # JWT, hash password/PIN
│       │   ├── permissions.py # Systeme RBAC, roles par defaut
│       │   └── dependencies.py # Auth + permission guards
│       ├── models/           # SQLAlchemy models
│       │   ├── base.py       # Base declarative (id, timestamps)
│       │   ├── user.py       # User (avec PIN)
│       │   ├── company.py    # Company (multi-tenant)
│       │   ├── role.py       # Role + permissions JSON
│       │   ├── third_party.py # ThirdParty + Address + Contact
│       │   ├── payment_term.py
│       │   ├── audit_log.py  # Tracabilite complete
│       │   └── stock.py      # Product, Warehouse, Location, Lot, Movement, Inventory, StockLevel
│       ├── schemas/          # Pydantic validation
│       │   ├── stock.py      # Schemas stock (Product, Warehouse, Lot, Movement, Inventory, Dashboard)
│       │   └── ...
│       ├── api/v1/           # Routes REST
│       │   ├── auth.py       # Login, refresh, /me, verify-pin
│       │   ├── users.py      # CRUD users, set PIN, change password
│       │   ├── companies.py  # CRUD companies
│       │   ├── roles.py      # CRUD roles + permissions dispo
│       │   ├── third_parties.py # CRUD tiers + addresses + contacts
│       │   ├── categories.py    # CRUD categories produits
│       │   ├── products.py      # CRUD produits + stock summary
│       │   ├── warehouses.py    # CRUD entrepots + emplacements
│       │   ├── lots.py          # CRUD lots (tracabilite)
│       │   ├── stock_movements.py # Mouvements stock (CRUD + validation)
│       │   ├── inventories.py   # Inventaires physiques (CRUD + lignes)
│       │   └── stock_dashboard.py # KPIs, alertes, valorisation
│       └── services/         # Logique metier
│           ├── product.py        # Produits + stock summary
│           ├── warehouse.py      # Entrepots + emplacements
│           ├── lot.py            # Lots (tracabilite)
│           ├── stock_movement.py # Mouvements + validation + CUMP
│           ├── inventory.py      # Inventaires + lignes
│           ├── stock_dashboard.py # KPIs, alertes, valorisation
│           └── ...
└── frontend/
    ├── Dockerfile
    └── src/
        ├── components/
        │   ├── ui/           # Shadcn (Button, Input, Card, Label)
        │   ├── layout/       # Sidebar, Header, MainLayout
        │   ├── auth/         # LoginForm, ProtectedRoute
        │   └── stock/        # FormDialogs (Product, Lot, Movement, Location, Inventory)
        ├── pages/
        │   ├── stock/        # Dashboard, Products, Warehouses, Lots, Movements, Inventories
        │   └── ...           # Login, Dashboard, Users, Companies
        ├── stores/           # Zustand (auth, ui)
        ├── hooks/            # useAuth, usePermissions, useDataFetch
        ├── services/         # Axios API client (api.ts, stock.ts)
        ├── types/            # TypeScript interfaces (stock.ts)
        └── utils/            # Navigation filtree par permissions
```

## Systeme de permissions

### Roles predefinis

| Role | Acces | Multi-societe |
|------|-------|---------------|
| Super Admin | Tous les modules | Oui |
| Gerant | Tous sauf admin complet | Non |
| Vendeur | Ventes + Stock (lecture) | Non |
| Caissier | POS uniquement | Non |
| Magasinier | Stock complet | Non |
| Comptable | Facturation + Compta | Non |

### Format des permissions

`module.action` - exemples : `pos.view`, `stock.create`, `sales.validate`

Modules : `pos`, `stock`, `sales`, `purchase`, `invoicing`, `mrp`, `accounting`, `admin`, `third_party`

Actions : `view`, `create`, `edit`, `delete`, `validate`, `export`

Wildcards : `stock.*` (toutes actions sur stock), `*.*` (superadmin)

### Verification par PIN

Certaines actions sensibles necessitent la saisie d'un PIN 4-6 chiffres :
- Remboursements POS
- Remises au-dela du seuil parametre
- Annulation de vente
- Cloture anticipee de caisse

Chaque verification PIN est tracee dans l'audit log.

## Modele ThirdParty (Tiers unifie)

Un seul modele gere clients, fournisseurs et employes via des flags :
- `is_customer` / `is_supplier` / `is_employee`
- Un tiers peut avoir plusieurs casquettes simultanement
- Chaque role a ses propres champs (code client, conditions paiement fournisseur, etc.)
- Adresses et contacts multiples par tiers

## Module Stock

### Vue d'ensemble

Le module stock gere l'ensemble du cycle de vie des produits : catalogage, stockage, tracabilite par lots, mouvements de stock et inventaires physiques.

### Modeles de donnees

| Modele | Description |
|--------|-------------|
| **ProductCategory** | Categories hierarchiques (parent/enfant) pour classer les produits |
| **Product** | Articles avec type (stockable, consommable, service), prix, seuils d'alerte, methode de valorisation |
| **Warehouse** | Entrepots physiques avec code unique par societe |
| **StockLocation** | Emplacements dans un entrepot (allee, etagere, casier) avec type (stockage, reception, expedition, production) |
| **Lot** | Tracabilite par lot : numero, dates (fabrication, peremption, DLUO), fournisseur |
| **StockMovement** | Mouvements : entree, sortie, transfert, ajustement. Cycle brouillon → valide / annule |
| **StockLevel** | Niveaux de stock en temps reel par produit/emplacement/lot (quantite, reserve, disponible) |
| **Inventory** | Inventaires physiques : brouillon → en cours → valide/annule |
| **InventoryLine** | Lignes d'inventaire : quantite attendue vs comptee, ecart calcule |

### Flux de mouvements

```
Brouillon  ──(valider)──►  Valide  (met a jour StockLevel + calcul CUMP)
    │
    └──(annuler)──►  Annule
```

**Types de mouvements** :
- **Entree** (`in`) : reception de marchandise → destination obligatoire
- **Sortie** (`out`) : expedition → source obligatoire
- **Transfert** (`transfer`) : deplacement interne → source + destination
- **Ajustement** (`adjustment`) : correction de stock → destination obligatoire

### Valorisation CUMP

A chaque entree validee avec cout unitaire, le Cout Unitaire Moyen Pondere (CUMP) du produit est recalcule :

```
nouveau_cump = (stock_actuel * ancien_cump + quantite_entree * cout_unitaire) / (stock_actuel + quantite_entree)
```

### Inventaire physique

1. Creer un inventaire (lie a un entrepot)
2. Ajouter les articles a compter (manuellement ou auto depuis les niveaux de stock)
3. Demarrer l'inventaire → saisir les quantites comptees
4. Valider → les ecarts generent automatiquement des mouvements d'ajustement

### Pages frontend

| Page | Route | Description |
|------|-------|-------------|
| Tableau de bord | `/stock` | KPIs (valeur stock, alertes, ruptures), graphiques |
| Articles | `/stock/products` | CRUD produits avec colonne stock temps reel |
| Entrepots | `/stock/warehouses` | CRUD entrepots + emplacements imbriques |
| Lots | `/stock/lots` | CRUD lots avec tracabilite fournisseur |
| Mouvements | `/stock/movements` | CRUD mouvements + validation/annulation |
| Inventaires | `/stock/inventories` | Liste des inventaires + detail avec saisie |

## Endpoints API (v1)

### Administration

| Methode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/v1/auth/login` | Authentification |
| POST | `/api/v1/auth/refresh` | Rafraichir le token |
| GET | `/api/v1/auth/me` | Profil + permissions |
| POST | `/api/v1/auth/verify-pin` | Verifier PIN |
| GET/POST | `/api/v1/users` | Lister / creer utilisateurs |
| GET/PATCH | `/api/v1/users/{id}` | Voir / modifier utilisateur |
| POST | `/api/v1/users/{id}/set-pin` | Definir PIN |
| GET/POST | `/api/v1/companies` | Lister / creer societes |
| GET/PATCH | `/api/v1/companies/{id}` | Voir / modifier societe |
| GET/POST | `/api/v1/roles` | Lister / creer roles |
| GET | `/api/v1/roles/available-permissions` | Permissions disponibles |
| GET/POST | `/api/v1/third-parties` | Lister / creer tiers |
| GET/PATCH | `/api/v1/third-parties/{id}` | Voir / modifier tiers |
| POST | `/api/v1/third-parties/{id}/addresses` | Ajouter adresse |
| POST | `/api/v1/third-parties/{id}/contacts` | Ajouter contact |

### Module Stock

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET/POST | `/api/v1/categories` | Lister / creer categories |
| PATCH/DELETE | `/api/v1/categories/{id}` | Modifier / supprimer categorie |
| GET | `/api/v1/categories/tree` | Arborescence des categories |
| GET/POST | `/api/v1/products` | Lister / creer produits |
| GET/PATCH | `/api/v1/products/{id}` | Voir / modifier produit |
| POST | `/api/v1/products/{id}/toggle-status` | Activer / desactiver produit |
| GET | `/api/v1/products/{id}/stock` | Resume stock par emplacement |
| GET/POST | `/api/v1/warehouses` | Lister / creer entrepots |
| GET/PATCH | `/api/v1/warehouses/{id}` | Voir / modifier entrepot |
| GET/POST | `/api/v1/warehouses/{id}/locations` | Lister / creer emplacements |
| PATCH/DELETE | `/api/v1/warehouses/locations/{id}` | Modifier / supprimer emplacement |
| GET/POST | `/api/v1/lots` | Lister / creer lots |
| GET/PATCH | `/api/v1/lots/{id}` | Voir / modifier lot |
| GET/POST | `/api/v1/stock-movements` | Lister / creer mouvements |
| GET/PATCH | `/api/v1/stock-movements/{id}` | Voir / modifier mouvement |
| POST | `/api/v1/stock-movements/{id}/validate` | Valider mouvement |
| POST | `/api/v1/stock-movements/{id}/cancel` | Annuler mouvement |
| GET/POST | `/api/v1/inventories` | Lister / creer inventaires |
| GET | `/api/v1/inventories/{id}` | Detail inventaire + lignes |
| POST | `/api/v1/inventories/{id}/lines` | Ajouter une ligne |
| PATCH | `/api/v1/inventories/{id}/lines/{line_id}` | Saisir quantite comptee |
| POST | `/api/v1/inventories/{id}/start` | Demarrer inventaire |
| POST | `/api/v1/inventories/{id}/validate` | Valider inventaire |
| POST | `/api/v1/inventories/{id}/cancel` | Annuler inventaire |
| GET | `/api/v1/stock-dashboard/kpis` | KPIs stock |
| GET | `/api/v1/stock-dashboard/alerts` | Alertes stock bas / rupture |
| GET | `/api/v1/stock-dashboard/valuation` | Valorisation stock |
| GET | `/api/v1/stock-dashboard/product-stock-totals` | Totaux stock par produit |

## Prochaines etapes

Les modules metier sont ajoutes progressivement :
1. ~~**Module Stock** : Produits, mouvements, inventaires, alertes~~ ✅
2. **Module Ventes** : Devis, commandes, bons de livraison
3. **Module POS** : Caisse, sessions, encaissements
4. **Module Achats** : Commandes fournisseurs, receptions
5. **Module Facturation** : Factures, avoirs, reglements
6. **Module MRP** : Nomenclatures, ordres de fabrication
