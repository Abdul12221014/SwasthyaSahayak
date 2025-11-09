# 🏥 SwasthyaSahayak

**Enterprise-Grade AI-Powered Healthcare Assistant for Rural India**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://react.dev/)
[![Deno](https://img.shields.io/badge/Deno-1.40-green)](https://deno.land/)
[![Python](https://img.shields.io/badge/Python-3.8+-3776ab)](https://www.python.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Vector-orange)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📋 Executive Summary

**SwasthyaSahayak** is a production-ready, enterprise-grade healthcare chatbot platform that leverages Retrieval-Augmented Generation (RAG) technology to deliver intelligent, multilingual health assistance. Designed specifically for rural India, the platform provides accessible healthcare information through multiple channels: web, SMS, and WhatsApp.

### Business Value
- **Scalable AI Solution**: Handles 969+ health documents with semantic search
- **Multi-Channel Access**: Web, SMS, and WhatsApp integration
- **Multilingual Support**: English, Hindi, Odia, and Assamese
- **Emergency Detection**: ML-based emergency classification with PHC lookup
- **Production-Ready**: Robust error handling, fallback mechanisms, and monitoring

---

## 🎯 Key Features

### Core Capabilities
- 🤖 **AI-Powered RAG System** - Vector search with 969+ health documents using pgvector
- 🌐 **Multi-Language Support** - English, Hindi, Odia, and Assamese with automatic translation
- 🚨 **Emergency Detection** - ML-based emergency classification with nearest PHC lookup
- 💉 **Vaccination Information** - Integrated vaccination schedules and recommendations
- 📍 **PHC Directory** - Find nearest Primary Health Centres with location-based search
- 📱 **Multi-Channel Access** - Web interface, SMS (Twilio), and WhatsApp integration
- 🔍 **Semantic Search** - pgvector for accurate health information retrieval
- 📊 **Analytics Dashboard** - Query analytics, insights, and usage metrics
- 🔒 **Enterprise Security** - Row-level security, input validation, and secure authentication

### Technical Highlights
- **Vector Search**: 768-dimensional embeddings using biomedical models
- **Fallback Mechanism**: Graceful degradation to keyword matching
- **Scalable Architecture**: Microservices-based design with horizontal scaling
- **Real-time Processing**: Sub-2-second response times
- **Production Monitoring**: Structured logging, metrics, and health checks

---

## 🏗️ System Architecture

### Tech Stack
- **Frontend**: React 18.3 + TypeScript + Vite + Shadcn/UI + TailwindCSS
- **Backend**: Deno + TypeScript + REST APIs
- **ML Service**: Python 3.8+ + FastAPI + Deep Learning Models
- **Database**: Supabase (PostgreSQL + pgvector extension)
- **Vector Search**: pgvector for semantic similarity search
- **API Integration**: Gemini API for response generation
- **Messaging**: Twilio for SMS and WhatsApp

### Architecture Diagram
```
┌─────────────────────────────────────┐
│     Frontend (React + Vite)         │
│     Port: 3000                      │
│     - Chat Interface                │
│     - Admin Dashboard               │
└──────────────┬──────────────────────┘
               │ HTTP/REST
┌──────────────▼──────────────────────┐
│     Backend (Deno + TypeScript)     │
│     Port: 3001                      │
│     - RAG Pipeline                  │
│     - API Endpoints                 │
│     - Session Management            │
└─────┬───────────────┬───────────────┘
      │               │
      │ HTTP          │ HTTP
┌─────▼──────┐  ┌─────▼──────────────┐
│ ML Service │  │ Supabase (Cloud)   │
│ Port: 8000 │  │ - PostgreSQL       │
│ - Embed    │  │ - pgvector         │
│ - Classify │  │ - RPC Functions    │
│ - Translate│  │ - Edge Functions   │
└────────────┘  └────────────────────┘
```

### Data Flow
1. **User Query** → Frontend receives input
2. **Language Detection** → Automatic language identification
3. **Translation** → Translate to English if needed
4. **Embedding Generation** → ML service generates query embedding
5. **Vector Search** → Retrieve similar documents from database
6. **Response Generation** → Generate response using Gemini API
7. **Emergency Detection** → ML-based emergency classification
8. **PHC Lookup** → Find nearest health center if emergency
9. **Response Delivery** → Return formatted response with citations

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** 18+ (for frontend)
- **Deno** 1.40+ (for backend)
- **Python** 3.8+ (for ML service)
- **Supabase Account** (for database)
- **Git** (for version control)

### Installation Steps

#### 1. Clone the Repository
```bash
git clone https://github.com/Abdul12221014/SwasthyaSahayak.git
cd gnana-setu-bot
```

#### 2. Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
Deno handles dependencies automatically - no installation needed.

**ML Service:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### 3. Configure Environment Variables

Create a `.env` file in the root directory:
```bash
# Required - Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional - ML Service
ML_SERVICE_URL=http://localhost:8000

# Optional - Gemini API (for response generation)
GEMINI_API_KEY=your_gemini_api_key

# Optional - Twilio (for SMS/WhatsApp)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token

# Optional - Admin
ADMIN_INGEST_TOKEN=your_admin_token

# Optional - Logging
LOG_LEVEL=info
```

#### 4. Set Up Supabase Database

**Step 1: Create Supabase Project**
- Go to https://supabase.com/dashboard
- Create a new project
- Note your project URL and service role key

**Step 2: Run Database Migrations**
- Open Supabase Dashboard → SQL Editor
- Run migrations in order:
  1. `src/backend/db/migrations/001_health_queries_FIXED.sql` - Health queries table
  2. `src/backend/db/migrations/002_pgvector_kb.sql` - Vector search setup (pgvector) ⚠️ **REQUIRED**
  3. `src/backend/db/migrations/003_policies_harden.sql` - Security policies
  4. `src/backend/db/migrations/004_session_history.sql` - Session management

**Step 3: Verify Migration**
```bash
deno run --allow-net --allow-env verify-migration.ts
```

**Step 4: Enable pgvector Extension**
The migration automatically enables pgvector, but verify:
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

#### 5. Start the Application

**Terminal 1: Frontend**
```bash
npm run dev
```

**Terminal 2: Backend**
```bash
deno run --allow-net --allow-env --allow-read --allow-write src/backend/server.ts
```

**Terminal 3: ML Service (Optional but Recommended)**
```bash
cd src/ml/inference
source ../../../venv/bin/activate
uvicorn service:app --host 0.0.0.0 --port 8000
```

### Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **ML Service**: http://localhost:8000
- **Health Check**: http://localhost:3001/api/healthz
- **Supabase Test**: http://localhost:3001/api/test-supabase

---

## 📁 Project Structure

```
gnana-setu-bot/
├── src/
│   ├── frontend/              # React frontend application
│   │   ├── components/        # UI components (Shadcn/UI)
│   │   ├── pages/             # Page components (Chat, Admin, etc.)
│   │   ├── hooks/             # React hooks
│   │   └── lib/               # Utilities and helpers
│   ├── backend/               # Deno backend server
│   │   ├── api/               # API endpoints
│   │   │   ├── health-query.ts        # Main RAG endpoint
│   │   │   ├── ingest-documents.ts    # Document ingestion
│   │   │   ├── test-supabase.ts       # Supabase verification
│   │   │   └── ...                    # Other endpoints
│   │   ├── db/                # Database migrations
│   │   │   └── migrations/    # SQL migration files
│   │   ├── integrations/      # External service integrations
│   │   │   ├── ml-service.ts          # ML service client
│   │   │   ├── gemini-agent.ts        # Gemini API integration
│   │   │   └── phc-directory.ts       # PHC directory lookup
│   │   ├── rag/               # RAG retriever and reranker
│   │   │   └── retriever.ts           # Vector search implementation
│   │   ├── utils/             # Utility functions
│   │   │   ├── logger.ts              # Structured logging
│   │   │   ├── metrics.ts             # Metrics collection
│   │   │   └── session-store.ts       # Session management
│   │   └── tests/             # Test files
│   ├── ml/                    # ML service (Python)
│   │   ├── inference/         # ML inference service
│   │   │   └── service.py             # FastAPI service
│   │   ├── models/            # ML models
│   │   │   ├── embedding_model.py     # Embedding model
│   │   │   ├── emergency_classifier.py # Emergency classifier
│   │   │   └── translation_model.py   # Translation model
│   │   └── training/          # Model training scripts
│   └── shared/                # Shared types and configs
│       └── config.ts          # Shared configuration
├── supabase/                  # Supabase Edge Functions
│   ├── functions/             # Edge function handlers
│   │   ├── health-query/      # Health query handler
│   │   ├── sms-webhook/       # SMS webhook handler
│   │   └── whatsapp-webhook/  # WhatsApp webhook handler
│   └── migrations/            # Supabase migrations
├── public/                    # Static assets
├── .env                       # Environment variables (not in git)
├── .gitignore                 # Git ignore rules
├── package.json               # Frontend dependencies
├── requirements.txt           # Python dependencies
├── verify-migration.ts        # Migration verification script
├── SUPABASE_MIGRATION_GUIDE.md # Migration guide
└── README.md                  # This file
```

---

## 🔌 API Documentation

### Health & Status Endpoints

#### `GET /api/healthz`
Health check endpoint for service monitoring.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-08T16:47:18.312Z",
  "uptime": 1762620438312,
  "service": "swasthya-sahayak-backend",
  "version": "1.0.0"
}
```

#### `GET /api/readyz`
Readiness check endpoint for Kubernetes/Docker health probes.

#### `GET /api/test-supabase`
Comprehensive Supabase integration test.

**Response:**
```json
{
  "success": true,
  "summary": {
    "passed": 10,
    "failed": 0,
    "warnings": 0,
    "total": 10
  },
  "results": [...]
}
```

### Core Feature Endpoints

#### `POST /api/health-query`
Process health queries with RAG retrieval and AI response generation.

**Request:**
```json
{
  "query": "What are the symptoms of fever?",
  "user_language": "en",
  "channel": "web",
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "id": "uuid",
  "translated_query": "What are the symptoms of fever?",
  "response": "Fever is characterized by...",
  "citations": ["WHO - Fever Management Guidelines: https://..."],
  "is_emergency": false,
  "user_language": "en"
}
```

#### `GET /api/admin-queries`
Get query analytics and insights (admin only).

#### `POST /api/ingest-documents`
Ingest health documents into the knowledge base (admin only).

**Request:**
```json
{
  "title": "Document Title",
  "content": "Full document text...",
  "language": "en",
  "source": "WHO",
  "category": "fever"
}
```

#### `POST /api/reembed-kb`
Re-embed the entire knowledge base (admin only).

### Additional Feature Endpoints

#### `GET /api/vaccination-schedule`
Get vaccination schedules for different age groups.

#### `GET /api/outbreak-alerts`
Get outbreak alerts and health advisories.

#### `POST /api/sms-webhook`
Twilio SMS webhook handler.

#### `POST /api/whatsapp-webhook`
Twilio WhatsApp webhook handler.

### Example Usage

```bash
# Health Query
curl -X POST http://localhost:3001/api/health-query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the symptoms of fever?",
    "user_language": "en",
    "channel": "web"
  }'

# Health Check
curl http://localhost:3001/api/healthz

# Supabase Test
curl http://localhost:3001/api/test-supabase
```

---

## 🧠 RAG System Architecture

### How RAG Works
1. **User Query** → Received and validated
2. **Language Detection** → Automatic language identification
3. **Translation** → Translate to English if needed (using ML service)
4. **Query Embedding** → Generate 768-dimensional embedding via ML service
5. **Vector Search** → Retrieve similar documents from database using pgvector
6. **Document Retrieval** → Top 5 most similar documents (similarity threshold: 0.6)
7. **Response Generation** → Generate response using Gemini API with retrieved context
8. **Emergency Detection** → ML-based emergency classification
9. **PHC Lookup** → Find nearest Primary Health Centre if emergency
10. **Citations** → Include document sources in response

### Vector Search Configuration
- **Model**: `pritamdeka/S-BioClinicalBERT-MS-MARCO` (768 dimensions)
- **Database**: Supabase with pgvector extension
- **RPC Function**: `match_health_documents()`
- **Similarity Threshold**: 0.6 (configurable)
- **Top K**: 5 documents
- **Index Type**: IVFFlat (100 lists)

### Fallback Mechanism
The system gracefully falls back to keyword matching if:
- ML service is unavailable
- Supabase credentials are missing
- Embedding generation fails
- No documents found via vector search
- RPC functions are not available

This ensures the system remains functional even if some components are unavailable.

### Knowledge Base
- **Total Documents**: 969+ health documents
- **Languages**: English, Hindi, Odia, Assamese
- **Categories**: Fever, Malaria, TB, Vaccination, Diarrhea, etc.
- **Sources**: WHO, UNICEF, MoHFW India, National Health Programs
- **Embedding Dimension**: 768 (matching ML model output)

---

## 🗄️ Database Schema

### Tables

#### `health_documents`
Health knowledge base with embeddings for RAG retrieval.

**Columns:**
- `id` (UUID) - Primary key
- `title` (TEXT) - Document title
- `language` (TEXT) - Language code (en, hi, or, as)
- `source` (TEXT) - Source URL or identifier
- `category` (TEXT) - Category (fever, malaria, etc.)
- `content` (TEXT) - Document content (chunked)
- `chunk_index` (INT) - Position in original document
- `embedding` (VECTOR(768)) - 768-dimensional embedding vector
- `metadata` (JSONB) - Additional metadata
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Update timestamp

**Indexes:**
- `idx_health_doc_source` - Source index
- `idx_health_doc_lang` - Language index
- `idx_health_doc_category` - Category index
- `idx_health_doc_ts` - Full-text search index (GIN)
- `idx_health_doc_embed` - Vector similarity index (IVFFlat)

#### `health_queries`
User queries and responses for analytics.

**Columns:**
- `id` (UUID) - Primary key
- `query` (TEXT) - User query
- `response` (TEXT) - Generated response
- `language` (TEXT) - Query language
- `channel` (TEXT) - Channel (web, sms, whatsapp)
- `is_emergency` (BOOLEAN) - Emergency flag
- `created_at` (TIMESTAMPTZ) - Creation timestamp

#### `kb_meta`
Knowledge base metadata for tracking.

**Columns:**
- `key` (TEXT) - Metadata key (primary key)
- `value` (TEXT) - Metadata value
- `updated_at` (TIMESTAMPTZ) - Update timestamp

#### `session_history`
Conversation context for session management.

**Columns:**
- `id` (UUID) - Primary key
- `session_id` (TEXT) - Session identifier
- `query` (TEXT) - User query
- `response` (TEXT) - Generated response
- `metadata` (JSONB) - Session metadata
- `created_at` (TIMESTAMPTZ) - Creation timestamp

### RPC Functions

#### `match_health_documents()`
Vector similarity search using cosine distance.

**Parameters:**
- `query_embedding` (VECTOR(768)) - Query embedding vector
- `match_count` (INT) - Number of results to return (default: 5)
- `similarity_threshold` (FLOAT) - Minimum similarity score (default: 0.7)

**Returns:**
- `id` (UUID) - Document ID
- `content` (TEXT) - Document content
- `title` (TEXT) - Document title
- `source` (TEXT) - Source URL
- `category` (TEXT) - Category
- `language` (TEXT) - Language
- `similarity` (FLOAT) - Similarity score

#### `hybrid_search_health_documents()`
Hybrid search combining vector similarity and BM25 text ranking.

**Parameters:**
- `query_embedding` (VECTOR(768)) - Query embedding vector
- `query_text` (TEXT) - Query text for full-text search
- `match_count` (INT) - Number of results to return (default: 5)
- `vector_weight` (FLOAT) - Vector weight (default: 0.6)
- `text_weight` (FLOAT) - Text weight (default: 0.4)

**Returns:**
- Same as `match_health_documents()` plus:
- `vector_similarity` (FLOAT) - Vector similarity score
- `text_rank` (FLOAT) - Text ranking score
- `hybrid_score` (FLOAT) - Combined hybrid score

### Migrations
Run migrations in order:
1. `001_health_queries_FIXED.sql` - Health queries table
2. `002_pgvector_kb.sql` - Vector search setup (pgvector) ⚠️ **REQUIRED**
3. `003_policies_harden.sql` - Security policies
4. `004_session_history.sql` - Session management

**⚠️ Important**: Migration `002_pgvector_kb.sql` must be run for vector search to work. See `SUPABASE_MIGRATION_GUIDE.md` for detailed instructions.

---

## 🔒 Security

### Current Implementation
- ✅ **Row Level Security (RLS)** - Policies on all tables
- ✅ **Input Validation** - All inputs validated and sanitized
- ✅ **CORS Headers** - Configurable CORS settings
- ✅ **Admin Token Authentication** - Secure admin endpoints
- ✅ **Secret Redaction** - Secrets redacted in logs
- ✅ **SQL Injection Prevention** - Parameterized queries
- ✅ **XSS Protection** - Input sanitization

### Security Recommendations (Before Production)
- ⚠️ **Restrict CORS** - Limit to specific domains
- ⚠️ **Implement JWT Authentication** - User authentication
- ⚠️ **Add Rate Limiting** - Prevent abuse
- ⚠️ **Remove Default Secrets** - Use secure secrets management
- ⚠️ **Enforce HTTPS** - TLS/SSL encryption
- ⚠️ **Add Request Size Limits** - Prevent large payload attacks
- ⚠️ **Implement API Key Rotation** - Regular key rotation
- ⚠️ **Add Audit Logging** - Track all admin actions
- ⚠️ **Enable Database Backups** - Regular backups
- ⚠️ **Implement Monitoring** - Security monitoring and alerts

---

## 🧪 Testing

### Running Tests

```bash
# Backend tests
npm run test

# ML service tests
npm run test:ml

# E2E tests
npm run test:e2e

# All tests
npm run test:all

# Load testing with k6
npm run load:k6
```

### Test Coverage
- Unit tests for backend functions
- Integration tests for API endpoints
- ML model tests for embeddings and classification
- E2E tests for complete user flows
- Load tests for performance validation

### Verification Scripts

#### Verify Migration
```bash
deno run --allow-net --allow-env verify-migration.ts
```

This script verifies:
- Supabase connection
- Table existence
- RPC function availability
- Migration status

---

## 📊 Monitoring & Logging

### Logging
- **Structured Logging** - JSON-formatted logs with request ID tracking
- **Log Levels** - error, warn, info, debug
- **Secret Redaction** - Sensitive data automatically redacted
- **Request Tracking** - Unique request IDs for tracing

### Metrics
- **Request Counts** - API endpoint usage statistics
- **Latency Histograms** - Response time distributions
- **Error Rates** - Error frequency and types
- **RAG Retrieval Metrics** - Vector search performance
- **ML Service Metrics** - Embedding generation times

### Health Checks
- `GET /api/healthz` - Service health status
- `GET /api/readyz` - Readiness status for Kubernetes
- `GET /api/test-supabase` - Comprehensive integration test

### Monitoring Tools
- Structured logs for log aggregation
- Metrics endpoint for Prometheus integration
- Health checks for Kubernetes/Docker
- Error tracking for issue identification

---

## 🚢 Deployment

### Production Deployment Guide

#### 1. Frontend Deployment
```bash
# Build production bundle
npm run build

# Deploy to:
# - Vercel: vercel deploy
# - Netlify: netlify deploy --prod
# - Cloudflare Pages: wrangler pages deploy dist
```

#### 2. Backend Deployment
```bash
# Deploy to:
# - Deno Deploy: deno deploy --project=your-project src/backend/server.ts
# - Fly.io: flyctl deploy
# - Railway: railway up
```

**Environment Variables:**
- Set all required environment variables
- Configure CORS for production domain
- Set up monitoring and logging

#### 3. ML Service Deployment
```bash
# Deploy to:
# - Fly.io: flyctl deploy
# - Railway: railway up
# - AWS Lambda: serverless deploy
```

**Requirements:**
- GPU support for model inference (recommended)
- Sufficient memory for model loading
- Set `ML_SERVICE_URL` in backend environment

#### 4. Database Setup
- Use Supabase Cloud (already configured)
- Run migrations in production
- Set up automated backups
- Configure monitoring and alerts

### Environment Variables for Production
```bash
# Required
SUPABASE_URL=your_production_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# Optional but Recommended
ML_SERVICE_URL=your_ml_service_url
GEMINI_API_KEY=your_gemini_api_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
ADMIN_INGEST_TOKEN=your_secure_admin_token
LOG_LEVEL=info

# Production-specific
NODE_ENV=production
CORS_ORIGINS=https://your-domain.com
```

### Deployment Checklist
- [ ] All environment variables configured
- [ ] Database migrations run
- [ ] RPC functions created and verified
- [ ] CORS configured for production domain
- [ ] HTTPS enabled
- [ ] Monitoring and logging set up
- [ ] Backups configured
- [ ] Security policies applied
- [ ] Load testing completed
- [ ] Documentation updated

---

## 🐛 Troubleshooting

### Common Issues and Solutions

#### 1. RAG Not Working - Using Keyword Matching Instead of Vector Search

**Symptoms:**
- Logs show "ML service not available, using keyword fallback"
- No vector search results
- Fallback to keyword matching

**Solutions:**
1. **Check ML Service:**
   ```bash
   # Verify ML service is running
   curl http://localhost:8000/health
   
   # Start ML service if not running
   cd src/ml/inference
   uvicorn service:app --host 0.0.0.0 --port 8000
   ```

2. **Verify Supabase Credentials:**
   ```bash
   # Check environment variables
   echo $SUPABASE_URL
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```

3. **Run Database Migrations:**
   ```bash
   # Verify migration status
   deno run --allow-net --allow-env verify-migration.ts
   
   # If migration not applied, run:
   # Go to Supabase Dashboard → SQL Editor
   # Run: src/backend/db/migrations/002_pgvector_kb.sql
   ```

4. **Check Embedding Dimensions:**
   - Verify embeddings are 768 dimensions
   - Re-ingest documents if dimensions are incorrect

#### 2. Database Connection Issues

**Symptoms:**
- Cannot connect to Supabase
- Authentication errors
- Connection timeouts

**Solutions:**
1. **Verify Credentials:**
   ```bash
   # Check environment variables
   echo $SUPABASE_URL
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```

2. **Test Connection:**
   ```bash
   # Test Supabase connection
   curl http://localhost:3001/api/test-supabase
   ```

3. **Check Network:**
   - Verify internet connectivity
   - Check firewall settings
   - Verify Supabase project is active

#### 3. ML Service Not Available

**Symptoms:**
- Fallback to keyword matching
- Embedding generation fails
- ML service health check fails

**Solutions:**
1. **Start ML Service:**
   ```bash
   cd src/ml/inference
   source ../../../venv/bin/activate
   uvicorn service:app --host 0.0.0.0 --port 8000
   ```

2. **Check ML Service URL:**
   ```bash
   # Verify ML_SERVICE_URL environment variable
   echo $ML_SERVICE_URL
   # Default: http://localhost:8000
   ```

3. **Verify ML Service Health:**
   ```bash
   curl http://localhost:8000/health
   ```

#### 4. RPC Functions Not Found

**Symptoms:**
- Error: "Could not find the function public.match_health_documents"
- Vector search fails
- Migration not applied

**Solutions:**
1. **Run Migration:**
   ```bash
   # Go to Supabase Dashboard → SQL Editor
   # Run: src/backend/db/migrations/002_pgvector_kb.sql
   ```

2. **Verify Migration:**
   ```bash
   deno run --allow-net --allow-env verify-migration.ts
   ```

3. **Check Migration Status:**
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name IN ('match_health_documents', 'hybrid_search_health_documents');
   ```

#### 5. Embedding Dimension Mismatch

**Symptoms:**
- Vector search fails
- Embedding dimension errors
- Database errors

**Solutions:**
1. **Verify Embedding Dimensions:**
   - Check ML model outputs 768 dimensions
   - Verify database column is VECTOR(768)

2. **Re-ingest Documents:**
   - Use Colab script to re-ingest documents
   - Ensure embeddings are 768 dimensions
   - Verify embeddings are stored correctly

3. **Check Model Configuration:**
   - Verify ML model is configured correctly
   - Check model output dimensions
   - Verify normalization settings

### Getting Help
- Check logs for detailed error messages
- Review troubleshooting guide in `SUPABASE_MIGRATION_GUIDE.md`
- Verify all prerequisites are met
- Check Supabase dashboard for database issues
- Review ML service logs for model issues

---

## 📚 Additional Documentation

### Migration Guide
See `SUPABASE_MIGRATION_GUIDE.md` for detailed migration instructions.

### Code Documentation
- TypeScript types and interfaces
- JSDoc comments for functions
- SQL comments in migrations
- API endpoint documentation

### API Documentation
- Endpoint descriptions in code
- Example requests in README
- Error response formats
- Request/response schemas

---

## 🤝 Contributing

### Development Workflow
1. Create a feature branch
2. Make changes following code style
3. Run tests and verify functionality
4. Submit a pull request

### Code Style
- TypeScript strict mode
- ESLint for linting
- Prettier for formatting
- JSDoc comments for functions
- Clear variable and function names

### Testing Requirements
- Unit tests for new functions
- Integration tests for API endpoints
- E2E tests for user flows
- Load tests for performance

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🆘 Support & Contact

### Issues & Support
- **GitHub Issues**: [Create an issue](https://github.com/Abdul12221014/SwasthyaSahayak/issues)
- **Email**: support@swasthyasahayak.com
- **Documentation**: See project README and migration guides

### Resources
- [Supabase Documentation](https://supabase.com/docs)
- [Deno Documentation](https://deno.land/docs)
- [React Documentation](https://react.dev)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [pgvector Documentation](https://github.com/pgvector/pgvector)

---

## 🎯 Roadmap

### Phase 1: Core Features ✅
- [x] RAG system implementation
- [x] Multi-language support
- [x] Emergency detection
- [x] PHC directory integration
- [x] Vector search with pgvector
- [x] Multi-channel access (Web, SMS, WhatsApp)

### Phase 2: Enhancements 🚧
- [ ] Enhanced security (JWT, rate limiting)
- [ ] Caching layer (Redis)
- [ ] Monitoring dashboard
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Advanced analytics
- [ ] User authentication

### Phase 3: Scaling 📋
- [ ] Load balancing
- [ ] CDN integration
- [ ] Database optimization
- [ ] Performance monitoring
- [ ] Auto-scaling
- [ ] Multi-region deployment

---

## 📞 Project Information

**Project Name:** SwasthyaSahayak  
**Version:** 1.0.0  
**License:** MIT  
**Repository:** https://github.com/Abdul12221014/SwasthyaSahayak  
**Last Updated:** November 8, 2025

---

**Built with ❤️ for Rural India - Empowering healthcare access through AI technology**
