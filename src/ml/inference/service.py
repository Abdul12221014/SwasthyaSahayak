"""
ML Model Inference Service

FastAPI service that exposes trained ML models for:
1. Embedding generation
2. Emergency classification
3. Translation

Usage:
    uvicorn service:app --host 0.0.0.0 --port 8000

Endpoints:
    POST /embed - Generate embeddings
    POST /classify-emergency - Detect emergencies
    POST /translate - Translate text
    GET /health - Health check
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import sys
from pathlib import Path
import os

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from models.embedding_model import EmbeddingModel
from models.emergency_classifier import EmergencyClassifier
from models.translation_model import TranslationModel
from loguru import logger

# Initialize FastAPI app
app = FastAPI(
    title="SwasthyaSahayak ML Inference Service",
    description="AI/ML models for health chatbot",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models (loaded at startup)
embedding_model: Optional[EmbeddingModel] = None
emergency_classifier: Optional[EmergencyClassifier] = None
translation_model: Optional[TranslationModel] = None

# Model versions
model_versions: dict = {}


# Request/Response models
class EmbedRequest(BaseModel):
    texts: List[str] = Field(..., description="List of texts to embed")
    model: str = Field(default="default", description="Model version")
    normalize: bool = Field(default=True, description="Normalize embeddings")


class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    dimension: int
    model: str


class ClassifyRequest(BaseModel):
    texts: List[str] = Field(..., description="Health queries to classify")
    use_keyword_fallback: bool = Field(default=True)


class ClassifyResponse(BaseModel):
    predictions: List[dict]  # [{is_emergency: bool, confidence: float}]


class TranslateRequest(BaseModel):
    texts: List[str]
    source_lang: Optional[str] = None
    target_lang: str = "en"


class TranslateResponse(BaseModel):
    translations: List[str]
    detected_languages: List[str]


# Startup event: Load models
@app.on_event("startup")
async def load_models():
    """Load ML models at startup"""
    global embedding_model, emergency_classifier, translation_model, model_versions
    
    try:
        logger.info("=" * 60)
        logger.info("🚀 Starting SwasthyaSahayak ML Inference Service")
        logger.info("=" * 60)
        
        # Load model registry
        registry_path = Path(__file__).parent.parent / "models" / "registry.json"
        if registry_path.exists():
            import json
            with open(registry_path, 'r') as f:
                registry = json.load(f)
                model_versions = {
                    'embedding_model': registry.get('embedding_model', 'unknown'),
                    'emergency_classifier': registry.get('emergency_classifier', 'unknown'),
                    'translation_model': registry.get('translation_model', 'unknown'),
                    'last_updated': registry.get('last_updated', 'unknown')
                }
            logger.info(f"📋 Model Registry Loaded:")
            for name, version in model_versions.items():
                if name != 'last_updated':
                    logger.info(f"   • {name}: {version}")
        else:
            logger.warning(f"⚠️  Model registry not found at {registry_path}")
            model_versions = {
                'embedding_model': 'v1.0.0',
                'emergency_classifier': 'v1.0.0',
                'translation_model': 'v1.0.0',
                'last_updated': 'unknown'
            }
        
        logger.info("")
        logger.info("Loading ML models...")
        
        # Load embedding model
        embedding_path = os.getenv("EMBEDDING_MODEL_PATH", "./models/embeddings/model_v1")
        if Path(embedding_path).exists():
            logger.info(f"✓ Loading embedding model from {embedding_path}")
            embedding_model = EmbeddingModel.load(embedding_path)
        else:
            logger.warning(f"⚠️  Embedding model not found at {embedding_path}, using default")
            embedding_model = EmbeddingModel()
        
        # Load emergency classifier
        classifier_path = os.getenv("EMERGENCY_CLASSIFIER_PATH", "./models/emergency/model_v1")
        if Path(classifier_path).exists():
            logger.info(f"✓ Loading emergency classifier from {classifier_path}")
            emergency_classifier = EmergencyClassifier.load(classifier_path)
        else:
            logger.warning(f"⚠️  Emergency classifier not found, using default")
            emergency_classifier = EmergencyClassifier()
        
        # Load translation model
        translation_path = os.getenv("TRANSLATION_MODEL_PATH", "./models/translation/model_v1")
        if Path(translation_path).exists():
            logger.info(f"✓ Loading translation model from {translation_path}")
            translation_model = TranslationModel.load(translation_path)
        else:
            logger.warning(f"⚠️  Translation model not found, using default")
            translation_model = TranslationModel()
        
        logger.info("")
        logger.info("=" * 60)
        logger.info("✅ All models loaded successfully!")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"❌ Error loading models: {e}")
        raise


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "models": {
            "embedding": embedding_model is not None,
            "emergency_classifier": emergency_classifier is not None,
            "translation": translation_model is not None
        },
        "versions": model_versions
    }


@app.get("/versions")
async def get_versions():
    """
    Get model version information.
    
    Returns model versions from registry.json
    """
    return model_versions


@app.post("/embed", response_model=EmbedResponse)
async def generate_embeddings(request: EmbedRequest):
    """
    Generate embeddings for input texts.
    
    Example:
        POST /embed
        {
            "texts": ["What are malaria symptoms?", "How to prevent TB?"],
            "normalize": true
        }
    """
    if embedding_model is None:
        raise HTTPException(status_code=503, detail="Embedding model not loaded")
    
    try:
        embeddings = embedding_model.encode(
            request.texts,
            normalize=request.normalize
        )
        
        return EmbedResponse(
            embeddings=embeddings.tolist(),
            dimension=embeddings.shape[1],
            model=request.model
        )
    
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embed-batch", response_model=EmbedResponse)
async def generate_embeddings_batch(request: EmbedRequest):
    """
    Batch embedding generation for large knowledge base ingestion.
    Optimized for processing hundreds/thousands of document chunks.
    
    Example:
        POST /embed-batch
        {
            "texts": ["chunk1...", "chunk2...", "chunk3...", ...],
            "normalize": true
        }
    
    Returns embeddings in same order as input texts.
    Batch size is handled internally for optimal GPU utilization.
    """
    if embedding_model is None:
        raise HTTPException(status_code=503, detail="Embedding model not loaded")
    
    try:
        logger.info(f"Batch embedding request: {len(request.texts)} texts")
        
        # Process in optimal batches (32 at a time for GPU efficiency)
        batch_size = 32
        embeddings = embedding_model.encode(
            request.texts,
            batch_size=batch_size,
            normalize=request.normalize
        )
        
        logger.info(f"✅ Generated {len(embeddings)} embeddings")
        
        return EmbedResponse(
            embeddings=embeddings.tolist(),
            dimension=embeddings.shape[1],
            model=request.model
        )
    
    except Exception as e:
        logger.error(f"Batch embedding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/classify-emergency", response_model=ClassifyResponse)
async def classify_emergency(request: ClassifyRequest):
    """
    Classify health queries as emergency or non-emergency.
    
    Example:
        POST /classify-emergency
        {
            "texts": ["I have severe chest pain", "Common cold symptoms?"],
            "use_keyword_fallback": true
        }
    """
    if emergency_classifier is None:
        raise HTTPException(status_code=503, detail="Emergency classifier not loaded")
    
    try:
        predictions = emergency_classifier.predict(
            request.texts,
            use_keyword_fallback=request.use_keyword_fallback
        )
        
        return ClassifyResponse(
            predictions=[
                {"is_emergency": is_emerg, "confidence": conf}
                for is_emerg, conf in predictions
            ]
        )
    
    except Exception as e:
        logger.error(f"Classification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/translate", response_model=TranslateResponse)
async def translate_text(request: TranslateRequest):
    """
    Translate text between languages.
    
    Example:
        POST /translate
        {
            "texts": ["मुझे बुखार है"],
            "target_lang": "en"
        }
    """
    if translation_model is None:
        raise HTTPException(status_code=503, detail="Translation model not loaded")
    
    try:
        # Detect languages if not provided
        detected_langs = []
        if request.source_lang is None:
            for text in request.texts:
                detected_langs.append(translation_model.detect_language(text))
        else:
            detected_langs = [request.source_lang] * len(request.texts)
        
        # Translate
        translations = translation_model.translate(
            request.texts,
            source_lang=request.source_lang,
            target_lang=request.target_lang
        )
        
        if isinstance(translations, str):
            translations = [translations]
        
        return TranslateResponse(
            translations=translations,
            detected_languages=detected_langs
        )
    
    except Exception as e:
        logger.error(f"Translation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("ML_SERVICE_PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)

