"""
Embedding Model for RAG Retrieval

Generates semantic embeddings for health queries and knowledge base documents.
Supports multilingual text (English, Hindi, Odia, Assamese).

Input: Text string in any supported language
Output: 768-dimensional embedding vector

Model: Fine-tuned sentence-transformers on health domain data
"""

import torch
import torch.nn as nn
from typing import List, Union
from transformers import AutoTokenizer, AutoModel
import numpy as np


class EmbeddingModel:
    """
    Multilingual embedding model for semantic search in health domain.
    
    Attributes:
        model_name: Base model identifier (e.g., 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2')
        device: Computing device (cuda/cpu)
        max_length: Maximum sequence length
    """
    
    def __init__(
        self,
        model_name: str = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2",
        device: str = "cuda" if torch.cuda.is_available() else "cpu",
        max_length: int = 512
    ):
        self.model_name = model_name
        self.device = device
        self.max_length = max_length
        
        # Load tokenizer and model
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name).to(device)
        self.model.eval()
    
    def mean_pooling(self, model_output, attention_mask):
        """Apply mean pooling to get sentence embeddings"""
        token_embeddings = model_output[0]
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)
    
    def encode(
        self,
        texts: Union[str, List[str]],
        batch_size: int = 32,
        normalize: bool = True
    ) -> np.ndarray:
        """
        Encode text(s) into embedding vectors.
        
        Args:
            texts: Single text string or list of texts
            batch_size: Number of texts to process at once
            normalize: Whether to L2 normalize embeddings
            
        Returns:
            numpy array of shape (num_texts, embedding_dim)
        """
        if isinstance(texts, str):
            texts = [texts]
        
        embeddings = []
        
        with torch.no_grad():
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                
                # Tokenize
                encoded = self.tokenizer(
                    batch,
                    padding=True,
                    truncation=True,
                    max_length=self.max_length,
                    return_tensors='pt'
                ).to(self.device)
                
                # Generate embeddings
                model_output = self.model(**encoded)
                batch_embeddings = self.mean_pooling(model_output, encoded['attention_mask'])
                
                # Normalize if requested
                if normalize:
                    batch_embeddings = torch.nn.functional.normalize(batch_embeddings, p=2, dim=1)
                
                embeddings.append(batch_embeddings.cpu().numpy())
        
        return np.vstack(embeddings)
    
    def save(self, path: str):
        """Save model to disk"""
        self.model.save_pretrained(path)
        self.tokenizer.save_pretrained(path)
    
    @classmethod
    def load(cls, path: str, device: str = None):
        """Load model from disk"""
        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        return cls(model_name=path, device=device)


if __name__ == "__main__":
    # Example usage
    model = EmbeddingModel()
    
    texts = [
        "What are the symptoms of malaria?",
        "मलेरिया के लक्षण क्या हैं?",
        "ମ୍ୟାଲେରିଆର ଲକ୍ଷଣ କ'ଣ?"
    ]
    
    embeddings = model.encode(texts)
    print(f"Generated embeddings shape: {embeddings.shape}")
    print(f"Embedding dimension: {embeddings.shape[1]}")

