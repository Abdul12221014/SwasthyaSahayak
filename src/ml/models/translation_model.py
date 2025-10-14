"""
Translation Model for Indic Languages

Handles translation between English and Indic languages (Hindi, Odia, Assamese).
Uses IndicTrans2 or mBART-based models for high-quality medical domain translation.

Input: Text in source language
Output: Translated text in target language

Model: IndicTrans2 or custom fine-tuned mBART for medical terminology
"""

import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, M2M100ForConditionalGeneration, M2M100Tokenizer
from typing import List, Union, Optional
import re


class TranslationModel:
    """
    Multilingual translation for Indic languages.
    
    Supports:
    - English ↔ Hindi
    - English ↔ Odia  
    - English ↔ Assamese
    """
    
    # Language codes
    LANG_CODES = {
        'english': 'en',
        'hindi': 'hi',
        'odia': 'or',
        'assamese': 'as'
    }
    
    # Unicode patterns for language detection
    UNICODE_PATTERNS = {
        'odia': r'[\u0B00-\u0B7F]',
        'hindi': r'[\u0900-\u097F]',
        'assamese': r'[\u0980-\u09FF]'
    }
    
    def __init__(
        self,
        model_name: str = "facebook/m2m100_418M",
        device: str = "cuda" if torch.cuda.is_available() else "cpu"
    ):
        """
        Initialize translation model.
        
        Args:
            model_name: Pretrained model (e.g., 'm2m100', 'IndicTrans2')
            device: Computing device
        """
        self.device = device
        self.model_name = model_name
        
        if "m2m100" in model_name.lower():
            self.tokenizer = M2M100Tokenizer.from_pretrained(model_name)
            self.model = M2M100ForConditionalGeneration.from_pretrained(model_name).to(device)
        else:
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name).to(device)
        
        self.model.eval()
    
    def detect_language(self, text: str) -> str:
        """
        Detect language from text using Unicode patterns.
        
        Args:
            text: Input text
            
        Returns:
            Language code ('en', 'hi', 'or', 'as')
        """
        for lang, pattern in self.UNICODE_PATTERNS.items():
            if re.search(pattern, text):
                return self.LANG_CODES[lang]
        return 'en'  # Default to English
    
    def translate(
        self,
        texts: Union[str, List[str]],
        source_lang: Optional[str] = None,
        target_lang: str = 'en',
        max_length: int = 512
    ) -> Union[str, List[str]]:
        """
        Translate text(s) from source to target language.
        
        Args:
            texts: Text or list of texts to translate
            source_lang: Source language code (auto-detected if None)
            target_lang: Target language code
            max_length: Maximum sequence length
            
        Returns:
            Translated text(s)
        """
        single_input = isinstance(texts, str)
        if single_input:
            texts = [texts]
        
        translated = []
        
        with torch.no_grad():
            for text in texts:
                # Auto-detect source language if not provided
                if source_lang is None:
                    detected_lang = self.detect_language(text)
                else:
                    detected_lang = source_lang
                
                # Skip translation if source and target are the same
                if detected_lang == target_lang:
                    translated.append(text)
                    continue
                
                # Set source language for tokenizer
                if hasattr(self.tokenizer, 'src_lang'):
                    self.tokenizer.src_lang = detected_lang
                
                # Tokenize
                encoded = self.tokenizer(
                    text,
                    return_tensors="pt",
                    padding=True,
                    truncation=True,
                    max_length=max_length
                ).to(self.device)
                
                # Generate translation
                if hasattr(self.tokenizer, 'get_lang_id'):
                    # M2M100 model
                    forced_bos_token_id = self.tokenizer.get_lang_id(target_lang)
                    generated = self.model.generate(
                        **encoded,
                        forced_bos_token_id=forced_bos_token_id,
                        max_length=max_length,
                        num_beams=5,
                        early_stopping=True
                    )
                else:
                    generated = self.model.generate(
                        **encoded,
                        max_length=max_length,
                        num_beams=5,
                        early_stopping=True
                    )
                
                # Decode
                translated_text = self.tokenizer.decode(generated[0], skip_special_tokens=True)
                translated.append(translated_text)
        
        return translated[0] if single_input else translated
    
    def translate_to_english(self, text: str) -> str:
        """Convenience method to translate any Indic language to English"""
        return self.translate(text, target_lang='en')
    
    def translate_from_english(self, text: str, target_lang: str) -> str:
        """Convenience method to translate English to Indic language"""
        return self.translate(text, source_lang='en', target_lang=target_lang)
    
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
    translator = TranslationModel()
    
    # Test translations
    hindi_text = "मुझे बुखार है"
    english_translation = translator.translate_to_english(hindi_text)
    print(f"Hindi → English: '{hindi_text}' → '{english_translation}'")
    
    english_text = "What are the symptoms of malaria?"
    hindi_translation = translator.translate_from_english(english_text, 'hi')
    print(f"English → Hindi: '{english_text}' → '{hindi_translation}'")

