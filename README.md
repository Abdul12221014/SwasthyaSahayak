# 🏥 SwasthyaSahayak

**AI-Powered Healthcare Assistant for Rural India - Enterprise Healthcare Chatbot Platform**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://react.dev/)
[![Deno](https://img.shields.io/badge/Deno-1.40-green)](https://deno.land/)
[![Python](https://img.shields.io/badge/Python-3.8+-3776ab)](https://www.python.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Vector-orange)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📋 Overview

**SwasthyaSahayak** is a production-ready, enterprise-grade healthcare chatbot platform powered by Retrieval-Augmented Generation (RAG) technology. Designed specifically for rural India, it delivers intelligent, multilingual health assistance through web, SMS, and WhatsApp channels.

### Key Features
- 🤖 **AI-Powered RAG System** - Vector search with 969+ health documents
- 🌐 **Multi-Language Support** - English, Hindi, Odia, and Assamese
- 🚨 **Emergency Detection** - ML-based emergency classification with PHC lookup
- 💉 **Vaccination Information** - Integrated vaccination schedules
- 📍 **PHC Directory** - Find nearest Primary Health Centres
- 📱 **Multi-Channel Access** - Web, SMS (Twilio), and WhatsApp
- 🔍 **Semantic Search** - pgvector for accurate health information retrieval
- 📊 **Analytics Dashboard** - Query analytics and insights

---

## 🏗️ Architecture

### Tech Stack
- **Frontend:** React 18.3 + TypeScript + Vite + Shadcn/UI + TailwindCSS
- **Backend:** Deno + TypeScript + REST APIs
- **ML Service:** Python 3.8+ + FastAPI + Deep Learning Models
- **Database:** Supabase (PostgreSQL + pgvector)
- **Vector Search:** pgvector extension for semantic similarity

### System Architecture
```
┌─────────────────────────────────────┐
│     Frontend (React + Vite)         │
│     Port: 3000                      │
└──────────────┬──────────────────────┘
               │ HTTP/REST
┌──────────────▼──────────────────────┐
│     Backend (Deno + TypeScript)     │
│     Port: 3001                      │
│     - RAG Pipeline                  │
│     - API Endpoints                 │
└─────┬───────────────┬───────────────┘
      │               │
      │ HTTP          │ HTTP
┌─────▼──────┐  ┌─────▼──────────────┐
│ ML Service │  │ Supabase (Cloud)   │
│ Port: 8000 │  │ - PostgreSQL       │
│ - Embed    │  │ - pgvector         │
│ - Classify │  │ - RPC Functions    │
└────────────┘  └────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (for frontend)
- **Deno** 1.40+ (for backend)
- **Python** 3.8+ (for ML service)
- **Supabase Account** (for database)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd gnana-setu-bot
```

2. **Install dependencies**
```bash
# Frontend
npm install

# Backend (Deno handles dependencies automatically)
# ML Service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Configure environment variables**
```bash
# Copy environment template
cp env.template .env

# Edit .env with your credentials
# Required variables:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - GEMINI_API_KEY (optional)
# - ML_SERVICE_URL (optional, defaults to http://localhost:8000)
# - TWILIO_ACCOUNT_SID (for SMS/WhatsApp)
# - TWILIO_AUTH_TOKEN (for SMS/WhatsApp)
```

4. **Set up Supabase**
   - Create a Supabase project
   - Run database migrations from `src/backend/db/migrations/`
   - Enable pgvector extension
   - Create RPC functions for vector search

5. **Run the application**
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
deno run --allow-net --allow-env --allow-read --allow-write src/backend/server.ts

# Terminal 3: ML Service (optional)
cd src/ml
uvicorn inference.service:app --host 0.0.0.0 --port 8000
```

### Access the Application
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **ML Service:** http://localhost:8000
- **Health Check:** http://localhost:3001/api/healthz

---

## 📁 Project Structure

```
gnana-setu-bot/
├── src/
│   ├── frontend/          # React frontend application
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   └── lib/           # Utilities
│   ├── backend/           # Deno backend server
│   │   ├── api/           # API endpoints
│   │   ├── db/            # Database migrations
│   │   ├── integrations/  # External service integrations
│   │   ├── rag/           # RAG retriever and reranker
│   │   ├── utils/         # Utility functions
│   │   └── tests/         # Test files
│   ├── ml/                # ML service (Python)
│   │   ├── inference/     # ML inference service
│   │   ├── models/        # ML models
│   │   └── training/      # Model training scripts
│   └── shared/            # Shared types and configs
├── supabase/              # Supabase Edge Functions
│   ├── functions/         # Edge function handlers
│   └── migrations/        # Supabase migrations
├── public/                # Static assets
├── .env                   # Environment variables (not in git)
├── package.json           # Frontend dependencies
├── requirements.txt       # Python dependencies
└── README.md              # This file
```

---

## 🔌 API Endpoints

### Health & Status
- `GET /api/healthz` - Health check endpoint
- `GET /api/readyz` - Readiness check endpoint
- `GET /api/test-supabase` - Supabase integration test

### Core Features
- `POST /api/health-query` - Process health queries with RAG
- `GET /api/admin-queries` - Get query analytics
- `POST /api/ingest-documents` - Ingest health documents (admin)
- `POST /api/reembed-kb` - Re-embed knowledge base (admin)

### Additional Features
- `GET /api/vaccination-schedule` - Get vaccination schedules
- `GET /api/outbreak-alerts` - Get outbreak alerts
- `POST /api/sms-webhook` - Twilio SMS webhook
- `POST /api/whatsapp-webhook` - Twilio WhatsApp webhook

### Example Request
```bash
curl -X POST http://localhost:3001/api/health-query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the symptoms of fever?",
    "user_language": "en",
    "channel": "web"
  }'
```

---

## 🧠 RAG System

### How It Works
1. **User Query** → Translated to English (if needed)
2. **Query Embedding** → Generated via ML service
3. **Vector Search** → Retrieves similar documents from database
4. **Response Generation** → Uses retrieved documents with Gemini API
5. **Citations** → Includes document sources

### Vector Search
- **Model:** `pritamdeka/S-BioClinicalBERT-MS-MARCO` (768 dimensions)
- **Database:** Supabase with pgvector extension
- **RPC Function:** `match_health_documents()`
- **Similarity Threshold:** 0.6 (configurable)
- **Top K:** 5 documents

### Fallback Mechanism
- Falls back to keyword matching if:
  - ML service unavailable
  - Supabase credentials missing
  - Embedding generation fails
  - No documents found

---

## 🗄️ Database

### Tables
- **health_documents** - Health knowledge base with embeddings
- **health_queries** - User queries and responses
- **kb_meta** - Knowledge base metadata
- **session_history** - Conversation context

### Migrations
Run migrations in order:
1. `001_health_queries_FIXED.sql` - Health queries table
2. `002_pgvector_kb.sql` - Vector search setup (pgvector)
3. `003_policies_harden.sql` - Security policies
4. `004_session_history.sql` - Session management

### RPC Functions
- `match_health_documents()` - Vector similarity search
- `hybrid_search_health_documents()` - Hybrid search (vector + text)

---

## 🔒 Security

### Current Implementation
- ✅ Row Level Security (RLS) policies
- ✅ Input validation
- ✅ CORS headers
- ✅ Admin token authentication
- ✅ Secret redaction in logs

### Recommendations (Before Production)
- ⚠️ Restrict CORS to specific domains
- ⚠️ Implement JWT authentication
- ⚠️ Add rate limiting
- ⚠️ Remove default secrets
- ⚠️ Enforce HTTPS
- ⚠️ Add request size limits

---

## 🧪 Testing

### Run Tests
```bash
# Backend tests
npm run test

# ML service tests
npm run test:ml

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

### Load Testing
```bash
# Using k6
k6 run k6/health-query.js
```

---

## 📊 Monitoring

### Logs
- Structured logging with request ID tracking
- Log levels: error, warn, info, debug
- Secret redaction for sensitive data

### Metrics
- Request counts
- Latency histograms
- Error rates
- RAG retrieval metrics

### Health Checks
- `GET /api/healthz` - Service health
- `GET /api/readyz` - Readiness status
- `GET /api/test-supabase` - Integration test

---

## 🚢 Deployment

### Production Deployment

1. **Frontend**
   - Build: `npm run build`
   - Deploy to: Vercel, Netlify, or Cloudflare Pages

2. **Backend**
   - Deploy to: Deno Deploy, Fly.io, or Railway
   - Set environment variables
   - Configure CORS for production domain

3. **ML Service**
   - Deploy to: Fly.io, Railway, or AWS Lambda
   - Set `ML_SERVICE_URL` in backend environment

4. **Database**
   - Use Supabase Cloud (already configured)
   - Run migrations in production
   - Set up backups

### Environment Variables
```bash
# Required
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional
ML_SERVICE_URL=http://localhost:8000
GEMINI_API_KEY=your_gemini_api_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
ADMIN_INGEST_TOKEN=your_admin_token
LOG_LEVEL=info
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. RAG Not Working
**Symptoms:** Using keyword matching instead of vector search
**Solutions:**
- Check ML service is running
- Verify Supabase credentials
- Run database migrations
- Check embedding dimensions (should be 768)

#### 2. Database Connection Issues
**Symptoms:** Cannot connect to Supabase
**Solutions:**
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Check network connectivity
- Verify Supabase project is active

#### 3. ML Service Not Available
**Symptoms:** Fallback to keyword matching
**Solutions:**
- Start ML service: `uvicorn inference.service:app --port 8000`
- Check `ML_SERVICE_URL` environment variable
- Verify ML service health endpoint

#### 4. Embedding Dimension Mismatch
**Symptoms:** Vector search fails
**Solutions:**
- Verify embedding model outputs 768 dimensions
- Re-ingest documents with correct model
- Check Colab ingestion script

---

## 📚 Documentation

### Code Documentation
- TypeScript types and interfaces
- JSDoc comments for functions
- SQL comments in migrations

### API Documentation
- Endpoint descriptions in code
- Example requests in README
- Error response formats

---

## 🤝 Contributing

### Development Workflow
1. Create a feature branch
2. Make changes
3. Run tests
4. Submit a pull request

### Code Style
- TypeScript strict mode
- ESLint for linting
- Prettier for formatting

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🆘 Support

### Issues
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)
- Email: support@swasthyasahayak.com

### Resources
- [Supabase Documentation](https://supabase.com/docs)
- [Deno Documentation](https://deno.land/docs)
- [React Documentation](https://react.dev)

---

## 🎯 Roadmap

### Phase 1: Core Features ✅
- [x] RAG system implementation
- [x] Multi-language support
- [x] Emergency detection
- [x] PHC directory integration

### Phase 2: Enhancements 🚧
- [ ] Enhanced security (JWT, rate limiting)
- [ ] Caching layer (Redis)
- [ ] Monitoring dashboard
- [ ] API documentation (OpenAPI/Swagger)

### Phase 3: Scaling 📋
- [ ] Load balancing
- [ ] CDN integration
- [ ] Database optimization
- [ ] Performance monitoring

---

## 📞 Contact

**Project Maintainer:** [Your Name]  
**Email:** [your-email@example.com]  
**Website:** [https://swasthyasahayak.com]

---

**Last Updated:** November 8, 2025
