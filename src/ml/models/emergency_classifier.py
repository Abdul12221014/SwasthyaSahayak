"""
Emergency Situation Classifier

Binary classifier to detect medical emergencies from user queries.
Helps prioritize urgent cases and trigger immediate response protocols.

Input: Health query text (any supported language)
Output: Binary label (emergency: 1, non-emergency: 0) + confidence score

Model: BERT-based classifier fine-tuned on emergency medical scenarios
"""

import torch
import torch.nn as nn
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from typing import List, Tuple, Union
import numpy as np


class EmergencyClassifier:
    """
    Multilingual emergency detection for health queries.
    
    Detects critical situations like:
    - Chest pain, heart attack
    - Severe breathing difficulties
    - Unconsciousness, seizures
    - Heavy bleeding, severe injuries
    - Stroke symptoms
    - Severe allergic reactions
    """
    
    # Emergency keywords for rule-based fallback
    EMERGENCY_KEYWORDS = {
        'english': [
            'chest pain', 'heart attack', 'severe breathing', "can't breathe",
            'difficulty breathing', 'unconscious', 'seizure', 'heavy bleeding',
            'severe injury', 'stroke', 'anaphylaxis', 'baby not breathing',
            'high fever child', 'severe allergic reaction', 'loss of consciousness'
        ],
        'hindi': [
            'सीने में दर्द', 'हार्ट अटैक', 'सांस लेने में तकलीफ', 'बेहोश',
            'दौरा', 'भारी रक्तस्राव', 'गंभीर चोट', 'stroke'
        ],
        'odia': [
            'ଛାତି ବଥା', 'ହାର୍ଟ ଆଟାକ୍', 'ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ', 'ଚେତାଶୂନ୍ୟ'
        ],
        'assamese': [
            'বুকুৰ বিষ', 'হাৰ্ট এটেক', 'উশাহ লোৱাত কষ্ট', 'অজ্ঞান'
        ]
    }
    
    def __init__(
        self,
        model_name: str = "bert-base-multilingual-cased",
        device: str = "cuda" if torch.cuda.is_available() else "cpu",
        threshold: float = 0.75
    ):
        """
        Initialize emergency classifier.
        
        Args:
            model_name: Pretrained model or path to fine-tuned model
            device: Computing device
            threshold: Confidence threshold for emergency classification
        """
        self.device = device
        self.threshold = threshold
        
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(
            model_name,
            num_labels=2  # Binary: emergency vs non-emergency
        ).to(device)
        self.model.eval()
    
    def keyword_based_detection(self, text: str) -> bool:
        """Fallback rule-based emergency detection"""
        text_lower = text.lower()
        for lang_keywords in self.EMERGENCY_KEYWORDS.values():
            if any(keyword in text_lower for keyword in lang_keywords):
                return True
        return False
    
    def predict(
        self,
        texts: Union[str, List[str]],
        use_keyword_fallback: bool = True
    ) -> List[Tuple[bool, float]]:
        """
        Predict emergency status for query/queries.
        
        Args:
            texts: Single query or list of queries
            use_keyword_fallback: Whether to use keyword matching as fallback
            
        Returns:
            List of tuples: (is_emergency: bool, confidence: float)
        """
        if isinstance(texts, str):
            texts = [texts]
        
        results = []
        
        with torch.no_grad():
            # Tokenize
            encoded = self.tokenizer(
                texts,
                padding=True,
                truncation=True,
                max_length=512,
                return_tensors='pt'
            ).to(self.device)
            
            # Get predictions
            outputs = self.model(**encoded)
            probabilities = torch.softmax(outputs.logits, dim=1)
            
            # Process each prediction
            for i, text in enumerate(texts):
                emergency_prob = probabilities[i][1].item()  # Probability of emergency class
                is_emergency = emergency_prob > self.threshold
                
                # Apply keyword fallback if enabled and confidence is low
                if use_keyword_fallback and not is_emergency:
                    if self.keyword_based_detection(text):
                        is_emergency = True
                        emergency_prob = 0.90  # Assign high confidence for keyword match
                
                results.append((is_emergency, emergency_prob))
        
        return results
    
    def save(self, path: str):
        """Save fine-tuned model"""
        self.model.save_pretrained(path)
        self.tokenizer.save_pretrained(path)
    
    @classmethod
    def load(cls, path: str, device: str = None, threshold: float = 0.75):
        """Load fine-tuned model"""
        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        return cls(model_name=path, device=device, threshold=threshold)


if __name__ == "__main__":
    # Example usage
    classifier = EmergencyClassifier()
    
    queries = [
        "I have severe chest pain and can't breathe",  # Emergency
        "What are the symptoms of common cold?",       # Non-emergency
        "मुझे तेज सीने में दर्द है"                    # Emergency (Hindi)
    ]
    
    predictions = classifier.predict(queries)
    
    for query, (is_emergency, confidence) in zip(queries, predictions):
        status = "🚨 EMERGENCY" if is_emergency else "✅ Normal"
        print(f"{status} ({confidence:.2%}): {query}")

