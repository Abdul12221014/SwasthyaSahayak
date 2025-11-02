# SwasthyaSahayak (स्वास्थ्य सहायक)

**AI-Powered Multilingual Health Companion for Rural India**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)

## 🎯 Overview

SwasthyaSahayak is a deep learning + RAG-powered health chatbot that provides verified medical information in multiple Indian languages. Built for rural India, it combines advanced ML models with retrieval-augmented generation to deliver accurate, culturally-sensitive health guidance.

### Key Features

- 🌍 **Multilingual Support**: English, Hindi, Odia, Assamese
- 🚨 **Emergency Detection**: AI-powered critical situation identification
- 📚 **Verified Information**: Sourced from WHO, MoHFW, UNICEF
- 📱 **Multi-Channel**: Web, WhatsApp, SMS integration
- 🤖 **Deep Learning**: Custom ML models for embeddings, classification, translation
- 🔍 **RAG Pipeline**: Semantic search with pgvector + LLM inference

---

## 🏗️ Architecture

### Technology Stack

**Frontend**
- React 18 + TypeScript
- Tailwind CSS + Shadcn UI
- React Query (TanStack)
- Vite

**Backend**
- Supabase Edge Functions (Deno)
- PostgreSQL with pgvector
- TypeScript/Deno runtime

**ML/AI**
- Python 3.10+
- PyTorch
- HuggingFace Transformers
- Sentence Transformers
- FastAPI (Inference Service)

**Infrastructure**
- Docker + Docker Compose
- Supabase (Database + Auth + Functions)
- Twilio (WhatsApp/SMS)

### Project Structure

```
gnana-setu-bot/
├── src/
│   ├── frontend/              # React application
│   │   ├── components/
│   │   │   ├── chat/          # Chat interface components
│   │   │   ├── admin/         # Admin dashboard components
│   │   │   └── ui/            # Reusable UI components (shadcn)
│   │   ├── pages/             # Route pages
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Frontend utilities
│   │   └── types/             # Frontend TypeScript types
│   │
│   ├── backend/               # Backend logic
│   │   ├── api/               # API endpoints (Supabase Edge Functions)
│   │   │   ├── health-query.ts
│   │   │   ├── whatsapp-webhook.ts
│   │   │   ├── sms-webhook.ts
│   │   │   └── admin-queries.ts
│   │   ├── rag/               # RAG pipeline
│   │   │   ├── retriever.ts   # Vector similarity search
│   │   │   ├── embedder.ts    # Embedding generation
│   │   │   ├── reranker.ts    # Result reranking
│   │   │   └── evaluator.ts   # Evaluation metrics
│   │   ├── db/                # Database management
│   │   │   ├── client.ts
│   │   │   └── migrations/
│   │   ├── utils/             # Backend utilities
│   │   └── integrations/      # Third-party integrations
│   │
│   ├── ml/                    # Machine Learning pipeline
│   │   ├── data/
│   │   │   ├── raw/           # Original datasets
│   │   │   ├── processed/     # Preprocessed data
│   │   │   └── datasets.md    # Dataset documentation
│   │   ├── models/
│   │   │   ├── embedding_model.py
│   │   │   ├── emergency_classifier.py
│   │   │   └── translation_model.py
│   │   ├── training/          # Training scripts
│   │   │   ├── train_embeddings.py
│   │   │   └── config.yaml
│   │   ├── evaluation/        # Model evaluation
│   │   ├── inference/         # Production inference
│   │   │   └── service.py     # FastAPI ML service
│   │   └── utils/             # ML utilities
│   │
│   └── shared/                # Shared code
│       ├── constants/         # App-wide constants
│       ├── types/             # Shared TypeScript types
│       └── utils/             # Shared utilities
│
├── supabase/                  # Supabase configuration
│   ├── functions/             # Original edge functions
│   ├── migrations/            # SQL migrations
│   └── config.toml
│
├── notebooks/                 # Jupyter notebooks for research
├── requirements.txt           # Python dependencies
├── package.json               # Node dependencies
├── docker-compose.yml         # Local development setup
├── .prettierrc                # Code formatting (JS/TS)
├── pyproject.toml             # Python tool configuration
└── README.md                  # This file
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20.x
- **Python** >= 3.10
- **Docker** (optional, for containerized development)
- **Supabase Account** (for database and edge functions)

### 1. Clone Repository

```bash
git clone https://github.com/Abdul12221014/gnana-setu-bot.git
cd gnana-setu-bot
```

### 2. Install Dependencies

```bash
# Frontend/Backend dependencies
npm install

# Python ML dependencies
pip install -r requirements.txt
```

### 3. Environment Setup

```bash
# Copy environment template
cp env.template .env

# Edit .env with your credentials
#  - Supabase URL & keys
#  - Twilio credentials
#  - AI API keys (Lovable/OpenAI)
```

### 4. Run Development Servers

**Option A: Without Docker**

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: ML Inference Service (optional)
cd src/ml/inference
python service.py

# Terminal 3: Supabase (if running locally)
supabase start
```

**Option B: With Docker**

```bash
docker-compose up
```

Access the application:
- **Frontend**: http://localhost:8080
- **ML Service**: http://localhost:8000
- **Database**: postgresql://localhost:5432

---

## 📊 ML Models

### 1. Embedding Model
**Purpose**: Semantic search for health queries  
**Architecture**: Fine-tuned multilingual sentence transformer  
**Dimension**: 768  
**Training**: `python src/ml/training/train_embeddings.py`

### 2. Emergency Classifier
**Purpose**: Detect medical emergencies  
**Architecture**: BERT-based binary classifier  
**Languages**: English, Hindi, Odia, Assamese  
**Accuracy**: 95%+ (target)

### 3. Translation Model
**Purpose**: Indic language ↔ English translation  
**Architecture**: m2M100 or IndicTrans2  
**Pairs**: hi↔en, or↔en, as↔en

### Model Training

```bash
# Train embedding model
python src/ml/training/train_embeddings.py --config src/ml/training/config.yaml

# Train emergency classifier
python src/ml/training/train_emergency_detector.py

# Evaluate models
python src/ml/evaluation/evaluate_embeddings.py
```

### ML Inference Service

```bash
# Start FastAPI service
uvicorn src.ml.inference.service:app --reload --port 8000

# API endpoints
POST /embed                 # Generate embeddings
POST /classify-emergency    # Detect emergencies
POST /translate             # Translate text
GET /health                 # Health check
```

---

## 🧪 Testing

```bash
# Frontend tests
npm test

# Python tests
pytest src/ml/tests --cov

# Lint & Format
npm run lint            # TypeScript/JavaScript
black src/ml            # Python formatting
mypy src/ml             # Python type checking
```

---

## 🤖 Model Versioning & MLOps Workflow

### Model Registry System

All ML models are versioned using `src/ml/models/registry.json`:

```json
{
  "embedding_model": "v1.0.0",
  "emergency_classifier": "v1.0.0",
  "translation_model": "v1.0.0",
  "last_updated": "2025-01-13T00:00:00Z"
}
```

### Training → Deployment Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    MLOps Pipeline                            │
└─────────────────────────────────────────────────────────────┘

1. Train Model
   └─> python src/ml/training/train_embeddings.py

2. Auto-Version Bump ✨
   └─> v1.0.0 → v1.0.1 (automatic)

3. Save Model
   └─> src/ml/models/embeddings/model_v1/

4. Update Registry
   └─> registry.json updated

5. Deploy ML Service
   └─> docker-compose up ml-service

6. Backend Integration
   └─> /health-query calls ML API

7. Admin Dashboard
   └─> Shows model versions & status
```

### Manual Version Update

```bash
# Bump embedding model version
python src/ml/training/update_registry.py embedding_model v1.1.0

# Bump classifier version
python src/ml/training/update_registry.py emergency_classifier v2.0.0
```

### View Model Status

**Admin Dashboard** automatically displays:
- Model versions (from registry.json)
- Online/offline status
- Last updated timestamp
- Auto-refreshes every 60 seconds

**ML API Endpoints**:
```bash
# Check model versions
curl http://localhost:8000/versions

# Health check
curl http://localhost:8000/health
```

---

## 🏥 Government Integrations & PHC Lookup

### Feature Flags
- `FEATURE_VACCINATION_API=true` - Enable vaccination schedule API
- `FEATURE_OUTBREAK_API=true` - Enable outbreak alerts API  
- `FEATURE_PHC_LOOKUP=true` - Enable PHC facility lookup

### Environment Variables
```bash
# Government API Integration
ODISHA_HEALTH_API_BASE=https://api.odisha-health.example
ODISHA_HEALTH_API_KEY=change-me
PHC_FACILITIES_CSV=src/ml/data/processed/odisha_phc_directory.csv

# Geo Location
GEOIP_PROVIDER=none
DEFAULT_DISTRICT=Cuttack
```

### API Endpoints

#### Vaccination Schedule
```bash
POST /api/vaccination-schedule
{
  "age_months": 6,
  "phone_number": "+916123456789",
  "channel": "web"
}

Response:
{
  "success": true,
  "age_months": 6,
  "age_group": "6 months",
  "vaccines": ["OPV", "IPV", "Pentavalent", "Rotavirus"],
  "message": "Vaccination schedule for 6 months:",
  "source": "Government Health API"
}
```

#### Outbreak Alerts
```bash
POST /api/outbreak-alerts
{
  "district": "Cuttack",
  "phone_number": "+916123456789",
  "channel": "web"
}

Response:
{
  "success": true,
  "district": "Cuttack",
  "outbreaks": [
    {
      "district": "Cuttack",
      "disease": "Malaria",
      "cases": 12,
      "last_updated": "2025-01-10"
    }
  ],
  "total_cases": 12,
  "source": "Government Health API"
}
```

### PHC Lookup Integration
- Emergency queries automatically include nearest PHC facilities
- CSV-based facility directory with distance calculation
- Fallback to curated data when CSV unavailable
- District inference from phone numbers

### Admin Dashboard Features
- **VaccinesLookup**: Age-based vaccination schedule lookup
- **OutbreaksCard**: District-based outbreak alerts
- Real-time API testing with feature flag awareness
- Curated fallback data when APIs unavailable

### Safety & Fallbacks
- All government APIs have curated fallback data
- Feature flags allow safe deployment without external dependencies
- Graceful degradation when APIs are unavailable
- No network errors exposed to users

## 🔍 Observability & Monitoring

### Structured Logging
- **Request ID Tracking**: Every request gets a unique ID for tracing
- **Secret Redaction**: Automatic redaction of tokens, keys, and sensitive data
- **Phone Number Hashing**: PII protection with secure hashing
- **Structured JSON Logs**: Machine-readable logs for analysis

### Metrics Collection
- **RAG Performance**: Request counts, latency histograms, error rates
- **Cache Metrics**: Hit/miss ratios for performance optimization
- **Webhook Metrics**: Success/failure rates for WhatsApp/SMS
- **Government API Metrics**: External service health monitoring

### Health Endpoints
- **GET /api/healthz**: Basic health check with uptime and environment info
- **GET /api/readyz**: Readiness check with database and ML service connectivity
- **GET /api/metrics**: Prometheus-format metrics for monitoring

## 🔒 Security & Validation

### Input Validation
- **Zod Schemas**: Strict validation for all API inputs
- **Phone Number Validation**: Indian phone number format validation
- **Query Length Limits**: Prevention of abuse through input size limits
- **Channel Validation**: Restricted to web/whatsapp/sms channels

### Outbound Security
- **Host Allowlist**: Restricts outbound requests to trusted domains
- **Feature Flag Control**: Can be disabled for development
- **Government Domain Validation**: Only trusted health domains allowed

### Consent Management
- **Opt-in Required**: Users must explicitly consent to receive messages
- **STOP Command**: Immediate opt-out processing
- **Consent Storage**: Persistent consent tracking in database

## 🧪 E2E & Load Testing

### End-to-End Tests
- **Web Interface**: Admin dashboard component rendering and functionality
- **API Integration**: Health query, vaccination, and outbreak endpoints
- **Webhook Testing**: WhatsApp/SMS message processing and database storage

### Load Testing (k6)
- **Spike Testing**: 50 RPS burst load simulation
- **Steady Load**: 10 RPS sustained load testing
- **Performance Thresholds**: 95th percentile < 3 seconds
- **Error Rate Monitoring**: < 1% error rate requirement

### Test Scripts
```bash
# Run all tests
npm run test:all

# E2E tests only
npm run test:e2e

# Load testing
npm run load:k6
```

## 🚀 CI/CD Pipeline

### GitHub Actions Workflow
1. **Lint & Type Check**: TypeScript and Python code quality
2. **Unit & E2E Tests**: Comprehensive test suite execution
3. **Docker Build**: Container image creation and testing
4. **Staging Deployment**: Automated staging environment deployment
5. **Health Checks**: Database and ML service connectivity verification
6. **Load Testing**: k6 smoke test on staging
7. **Production Deployment**: Manual approval gated production release

### Environment Promotion
- **Development**: Local development with mock data
- **Staging**: Production-like environment with real integrations
- **Production**: Live environment with full monitoring

### Secrets Management
- **Environment Variables**: All secrets stored in GitHub Secrets
- **Supabase Integration**: Production secrets via Supabase dashboard
- **No Plaintext**: Zero secrets committed to repository

### Deployment Artifacts
- **Docker Images**: Tagged with commit SHA and environment
- **Test Coverage**: Comprehensive coverage reports
- **k6 Results**: Load testing performance summaries

## 📚 KB Ingestion & Re-embed Pipeline

### Knowledge Base Management

SwasthyaSahayak uses a **vector database (pgvector)** to store health documents as embeddings for RAG retrieval.

**Workflow**:
```
Document → Chunking → Embedding → Storage → Retrieval
```

### Ingest New Documents

**Via Admin Dashboard**:
1. Navigate to `/admin`
2. Use "Knowledge Base Management" widget
3. Fill in:
   - Title: "WHO Malaria Fact Sheet"
   - Source URL: https://who.int/...
   - Language: English/Hindi/Odia/Assamese
   - Category: malaria, fever, vaccination, etc.
   - Content: (paste full document text)
4. Click "Ingest Document"
5. System automatically:
   - Chunks text (sentence-aware, ~500 tokens, 70 token overlap)
   - Generates embeddings via ML service
   - Stores in `health_documents` table

**Via API**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/ingest-documents \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: your-admin-token" \
  -d '{
    "title": "WHO Dengue Guidelines",
    "source": "https://www.who.int/dengue",
    "language": "en",
    "category": "dengue",
    "content": "Long document text..."
  }'

# Response:
# {
#   "success": true,
#   "chunks_created": 12,
#   "embeddings_generated": 12
# }
```

### Re-embed on Model Update

When you train a new embedding model:

1. **Model version auto-bumps** (v1.0.0 → v1.0.1)
2. **Registry updates** automatically
3. **Re-embed KB**:

**Via Admin Dashboard**:
- Click "Re-embed All Documents" button
- System checks version mismatch
- Re-generates all embeddings with new model
- Updates `kb_meta` table

**Via API**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/reembed-kb \
  -H "X-Admin-Token: your-admin-token"

# Response:
# {
#   "success": true,
#   "documents_updated": 150,
#   "old_version": "v1.0.0",
#   "new_version": "v1.0.1"
# }
```

### Hybrid Search (Vector + BM25)

**RAG retrieval combines**:
- **Vector similarity** (60% weight): Semantic meaning
- **BM25 text search** (40% weight): Keyword relevance
- **Hybrid score**: Blended for best results

**Database function**:
```sql
SELECT * FROM hybrid_search_health_documents(
  query_embedding := embedding_vector,
  query_text := 'malaria symptoms',
  match_count := 5
);
-- Returns: ranked results with hybrid scores
```

### Citation Validation & Safety

**All responses filtered**:
- ✅ Only trusted sources (WHO, MoHFW, UNICEF, ICMR)
- ❌ Untrusted domains removed
- ⚠️ Dosage/prescriptions blocked
- ⚠️ Medical safety checks applied

**If unsafe content detected**:
```
⚠️ Medical Safety Notice:
I cannot provide specific dosage information.
Please consult a healthcare professional.
```

---

## 📦 Deployment

### Full Stack Deployment

```bash
# Start everything with Docker
docker-compose up

# Access services:
# - Frontend: http://localhost:8080
# - ML Service: http://localhost:8000
# - Database: postgresql://localhost:5432
```

### Supabase Edge Functions

```bash
# Deploy all functions
supabase functions deploy health-query
supabase functions deploy whatsapp-webhook
supabase functions deploy sms-webhook
supabase functions deploy admin-queries
```

### ML Service Deployment

```bash
# Build Docker image
docker build -f Dockerfile.ml -t swasthya-ml:latest .

# Run ML service
docker run -p 8000:8000 \
  -e EMBEDDING_MODEL_PATH=/models/embeddings/model_v1 \
  -v ./src/ml/models:/models \
  swasthya-ml:latest

# Deploy to cloud (AWS/GCP/Azure)
# ... cloud-specific deployment steps
```

---

## 🔧 Configuration

### Frontend (Vite)
- `vite.config.ts`: Build configuration
- `tailwind.config.ts`: Styling
- `tsconfig.json`: TypeScript settings

### Backend
- `supabase/config.toml`: Edge function configuration
- Environment variables in `.env`

### ML
- `src/ml/training/config.yaml`: Training hyperparameters
- `requirements.txt`: Python dependencies
- `pyproject.toml`: Code quality tools

---

## 📖 Documentation

- **Dataset Documentation**: `src/ml/data/datasets.md`
- **API Documentation**: Auto-generated at `/docs` (FastAPI)
- **Architecture Diagram**: (TODO)

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Code Style**: 
   - JavaScript/TypeScript: Prettier + ESLint
   - Python: Black + mypy

2. **Commit Convention**: 
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation
   - `refactor:` Code refactoring

3. **Testing**: Add tests for new features

4. **Pull Requests**: Create PR against `main` branch

---

## 📜 License

MIT License - see LICENSE file

---

## 👥 Team

**SwasthyaSahayak Development Team**

---

## 🙏 Acknowledgments

- **Data Sources**: WHO, MoHFW India, UNICEF
- **ML Frameworks**: HuggingFace, PyTorch
- **Infrastructure**: Supabase, Twilio

---

## 📞 Support

For issues and questions:
- GitHub Issues: [Create Issue](https://github.com/Abdul12221014/gnana-setu-bot/issues)
- Email: support@swasthyasahayak.org

---

**Made with ❤️ for Rural India**

