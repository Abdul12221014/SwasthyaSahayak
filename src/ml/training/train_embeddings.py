"""
Training Script for Health Embedding Model

Fine-tunes a multilingual sentence transformer on health domain data.
Optimizes for semantic similarity in medical query-document matching.

Usage:
    python train_embeddings.py --config config.yaml
"""

import torch
from sentence_transformers import SentenceTransformer, InputExample, losses
from sentence_transformers.evaluation import EmbeddingSimilarityEvaluator
from torch.utils.data import DataLoader
import argparse
import yaml
from pathlib import Path
from typing import List, Tuple
import wandb
from loguru import logger


class HealthEmbeddingTrainer:
    """
    Trainer for health domain embedding models.
    """
    
    def __init__(self, config: dict):
        self.config = config
        self.model_name = config['model']['base_model']
        self.output_dir = Path(config['training']['output_dir'])
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize model
        self.model = SentenceTransformer(self.model_name)
        
        # Setup logging
        if config['training'].get('use_wandb', False):
            wandb.init(project="swasthya-sahayak", config=config)
    
    def load_training_data(self) -> List[InputExample]:
        """
        Load training pairs (query, document, label).
        
        Format: CSV with columns [query, document, similarity_score]
        """
        data_path = Path(self.config['data']['train_path'])
        logger.info(f"Loading training data from {data_path}")
        
        examples = []
        
        # TODO: Implement actual data loading
        # For now, placeholder structure
        sample_data = [
            ("What are malaria symptoms?", "Malaria symptoms include fever, chills, headache", 0.9),
            ("How to prevent TB?", "TB prevention includes BCG vaccination, avoiding close contact", 0.85),
        ]
        
        for query, doc, score in sample_data:
            examples.append(InputExample(texts=[query, doc], label=float(score)))
        
        logger.info(f"Loaded {len(examples)} training examples")
        return examples
    
    def load_validation_data(self) -> List[Tuple[str, str, float]]:
        """Load validation data for evaluation"""
        val_path = Path(self.config['data']['val_path'])
        logger.info(f"Loading validation data from {val_path}")
        
        # Placeholder
        return [
            ("दस्त का इलाज क्या है?", "ORS solution and zinc supplements for diarrhea", 0.8),
        ]
    
    def train(self):
        """Execute training loop"""
        # Load data
        train_examples = self.load_training_data()
        val_data = self.load_validation_data()
        
        # Create dataloader
        train_dataloader = DataLoader(
            train_examples,
            shuffle=True,
            batch_size=self.config['training']['batch_size']
        )
        
        # Define loss function
        train_loss = losses.CosineSimilarityLoss(self.model)
        
        # Setup evaluator
        sentences1 = [item[0] for item in val_data]
        sentences2 = [item[1] for item in val_data]
        scores = [item[2] for item in val_data]
        
        evaluator = EmbeddingSimilarityEvaluator(
            sentences1, sentences2, scores,
            name='health-val'
        )
        
        # Training configuration
        num_epochs = self.config['training']['num_epochs']
        warmup_steps = int(len(train_dataloader) * num_epochs * 0.1)
        
        logger.info(f"Starting training for {num_epochs} epochs")
        
        # Train
        self.model.fit(
            train_objectives=[(train_dataloader, train_loss)],
            evaluator=evaluator,
            epochs=num_epochs,
            warmup_steps=warmup_steps,
            output_path=str(self.output_dir),
            save_best_model=True,
            evaluation_steps=self.config['training']['eval_steps'],
            checkpoint_save_steps=self.config['training']['save_steps'],
        )
        
        logger.info(f"Training complete. Model saved to {self.output_dir}")
        
        # Auto-update model registry
        if self.config['training'].get('auto_version_bump', True):
            import subprocess
            import re
            
            # Extract current version from registry
            registry_path = Path(__file__).parent.parent / "models" / "registry.json"
            if registry_path.exists():
                import json
                with open(registry_path, 'r') as f:
                    registry = json.load(f)
                current_version = registry.get('embedding_model', 'v1.0.0')
                
                # Bump patch version (v1.0.0 → v1.0.1)
                match = re.match(r'v(\d+)\.(\d+)\.(\d+)', current_version)
                if match:
                    major, minor, patch = map(int, match.groups())
                    new_version = f"v{major}.{minor}.{patch + 1}"
                    
                    # Update registry
                    try:
                        subprocess.run([
                            'python', 
                            str(Path(__file__).parent / 'update_registry.py'),
                            'embedding_model',
                            new_version
                        ], check=True)
                        logger.info(f"✅ Model version updated: {current_version} → {new_version}")
                    except Exception as e:
                        logger.warning(f"⚠️  Failed to update registry: {e}")
        
        if self.config['training'].get('use_wandb', False):
            wandb.finish()


def main():
    parser = argparse.ArgumentParser(description='Train health embedding model')
    parser.add_argument('--config', type=str, default='config.yaml',
                       help='Path to configuration file')
    args = parser.parse_args()
    
    # Load config
    with open(args.config, 'r') as f:
        config = yaml.safe_load(f)
    
    # Train
    trainer = HealthEmbeddingTrainer(config)
    trainer.train()


if __name__ == '__main__':
    main()

