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
│       │   └── audit_log.py  # Tracabilite complete
│       ├── schemas/          # Pydantic validation
│       ├── api/v1/           # Routes REST
│       │   ├── auth.py       # Login, refresh, /me, verify-pin
│       │   ├── users.py      # CRUD users, set PIN, change password
│       │   ├── companies.py  # CRUD companies
│       │   ├── roles.py      # CRUD roles + permissions dispo
│       │   └── third_parties.py # CRUD tiers + addresses + contacts
│       └── services/         # Logique metier
└── frontend/
    ├── Dockerfile
    └── src/
        ├── components/
        │   ├── ui/           # Shadcn (Button, Input, Card, Label)
        │   ├── layout/       # Sidebar, Header, MainLayout
        │   └── auth/         # LoginForm, ProtectedRoute
        ├── pages/            # Login, Dashboard, Users, Companies
        ├── stores/           # Zustand (auth, ui)
        ├── hooks/            # useAuth, usePermissions
        ├── services/         # Axios API client
        ├── types/            # TypeScript interfaces
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

## Endpoints API (v1)

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

## Prochaines etapes

Les modules metier seront ajoutes progressivement :
1. **Module Stock** : Produits, mouvements, inventaires, alertes
2. **Module Ventes** : Devis, commandes, bons de livraison
3. **Module POS** : Caisse, sessions, encaissements
4. **Module Achats** : Commandes fournisseurs, receptions
5. **Module Facturation** : Factures, avoirs, reglements
6. **Module MRP** : Nomenclatures, ordres de fabrication
