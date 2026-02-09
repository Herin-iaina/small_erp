erp-system/
├── backend/
│   ├── app/
│   │   ├── core/          # Configuration, sécurité, database
│   │   ├── models/        # Modèles SQLAlchemy
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── api/           # Routes par module
│   │   ├── services/      # Logique métier
│   │   └── utils/         # Utilitaires
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/    # Composants réutilisables
│   │   ├── modules/       # Un dossier par module métier
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API calls
│   │   ├── stores/        # State management
│   │   └── utils/         # Utilitaires
│   └── public/
└── docker-compose.yml