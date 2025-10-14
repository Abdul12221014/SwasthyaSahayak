# SwasthyaSahayak ML Datasets

## Overview
This document describes all datasets used for training and evaluating the SwasthyaSahayak ML models.

## Directory Structure
```
data/
├── raw/                  # Original, immutable data
├── processed/            # Cleaned and preprocessed data
└── datasets.md          # This file
```

## Datasets

### 1. Health Query-Document Pairs
**Purpose**: Training embedding model for semantic search  
**Format**: CSV with columns `[query, document, similarity_score]`  
**Size**: TBD  
**Languages**: English, Hindi, Odia, Assamese  

**Location**:
- Raw: `./raw/health_qa_pairs.csv`
- Processed: `./processed/train_pairs.csv`, `./processed/val_pairs.csv`

**Source**:
- MoHFW public health guidelines
- WHO FAQs
- UNICEF India health content
- Curated rural health queries

**Preprocessing Steps**:
1. Text cleaning (remove HTML tags, special characters)
2. Language detection and filtering
3. Deduplication
4. Train/val/test split (80/10/10)

---

### 2. Emergency Classification Dataset
**Purpose**: Training binary classifier for emergency detection  
**Format**: CSV with columns `[query, is_emergency, language]`  
**Size**: TBD  
**Languages**: English, Hindi, Odia, Assamese  

**Location**:
- Raw: `./raw/emergency_queries.csv`
- Processed: `./processed/emergency_train.csv`, `./processed/emergency_val.csv`

**Labels**:
- `0`: Non-emergency query
- `1`: Emergency situation

**Examples**:
- Emergency: "Severe chest pain for 30 minutes", "Baby not breathing"
- Non-emergency: "Common cold symptoms", "Vaccination schedule"

**Data Collection**:
- Medical triage guidelines
- Emergency department keywords
- Synthetic data generation for edge cases
- Multilingual translation of emergency scenarios

---

### 3. Translation Pairs
**Purpose**: Fine-tuning translation model for medical domain  
**Format**: CSV with columns `[source_text, target_text, source_lang, target_lang]`  
**Size**: TBD  
**Language Pairs**: hi→en, or→en, as→en, en→hi, en→or, en→as  

**Location**:
- Raw: `./raw/translation_pairs.csv`
- Processed: `./processed/translation_train.csv`

**Domain**: Medical terminology, health symptoms, treatment descriptions

---

### 4. Knowledge Base Documents
**Purpose**: RAG retrieval corpus  
**Format**: JSON with fields `{id, content, metadata{source, category, language, link}}`  
**Size**: TBD  
**Languages**: Primarily English (with multilingual support)  

**Location**:
- Raw: `./raw/knowledge_base.json`
- Processed: `./processed/knowledge_base_embedded.json` (with embeddings)

**Categories**:
- Vaccination schedules
- Common diseases (malaria, TB, diarrhea, fever)
- Maternal & child health
- Emergency care
- Preventive health

**Sources**:
- WHO fact sheets
- MoHFW guidelines
- UNICEF health resources
- National health programs (UIP, NTEP, NVBDCP)

---

## Data Quality Standards

1. **Accuracy**: All medical information verified against official sources
2. **Completeness**: Minimum 1000 samples per category
3. **Balance**: Equal representation across languages where applicable
4. **Privacy**: No PII or patient data
5. **Versioning**: All datasets versioned (v1, v2, etc.)

## Ethical Considerations

- **No patient data**: Only public health information
- **Source attribution**: All content properly cited
- **Cultural sensitivity**: Content reviewed by native speakers
- **Accessibility**: Focus on rural health context

## Future Datasets

1. **User interaction logs** (anonymized)
2. **Feedback data** for model improvement
3. **Outbreak/epidemic data** for timely updates
4. **Regional disease prevalence** data

## Data Update Schedule

- **Weekly**: Check for new WHO/MoHFW guidelines
- **Monthly**: Retrain models with accumulated feedback
- **Quarterly**: Major dataset refresh and model versioning

---

**Last Updated**: 2025-01-13  
**Maintained By**: SwasthyaSahayak ML Team

