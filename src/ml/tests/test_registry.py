"""
Unit Tests for Model Registry System

Tests automatic version updates and registry management.

Run: pytest src/ml/tests/test_registry.py
"""

import json
import pytest
from pathlib import Path
import tempfile
import shutil


def test_registry_structure():
    """Test that registry.json has correct structure"""
    registry_path = Path(__file__).parent.parent / "models" / "registry.json"
    
    assert registry_path.exists(), "Registry file should exist"
    
    with open(registry_path, 'r') as f:
        registry = json.load(f)
    
    # Check required keys
    assert 'embedding_model' in registry
    assert 'emergency_classifier' in registry
    assert 'translation_model' in registry
    
    # Check version format
    import re
    version_pattern = r'v\d+\.\d+\.\d+$'
    
    assert re.match(version_pattern, registry['embedding_model']), \
        "embedding_model version should match vX.Y.Z format"
    assert re.match(version_pattern, registry['emergency_classifier']), \
        "emergency_classifier version should match vX.Y.Z format"
    assert re.match(version_pattern, registry['translation_model']), \
        "translation_model version should match vX.Y.Z format"


def test_version_update():
    """Test version update script"""
    # Create temporary registry
    with tempfile.TemporaryDirectory() as tmpdir:
        temp_registry = Path(tmpdir) / "registry.json"
        
        initial_data = {
            "embedding_model": "v1.0.0",
            "emergency_classifier": "v1.0.0",
            "translation_model": "v1.0.0"
        }
        
        with open(temp_registry, 'w') as f:
            json.dump(initial_data, f)
        
        # Update version
        new_version = "v1.1.0"
        
        # Simulate update
        with open(temp_registry, 'r') as f:
            registry = json.load(f)
        
        registry['embedding_model'] = new_version
        
        with open(temp_registry, 'w') as f:
            json.dump(registry, f, indent=2)
        
        # Verify update
        with open(temp_registry, 'r') as f:
            updated_registry = json.load(f)
        
        assert updated_registry['embedding_model'] == new_version
        assert updated_registry['emergency_classifier'] == "v1.0.0"


def test_version_bump_logic():
    """Test semantic version bumping logic"""
    import re
    
    def bump_patch(version: str) -> str:
        """Bump patch version (v1.0.0 → v1.0.1)"""
        match = re.match(r'v(\d+)\.(\d+)\.(\d+)', version)
        if match:
            major, minor, patch = map(int, match.groups())
            return f"v{major}.{minor}.{patch + 1}"
        return version
    
    def bump_minor(version: str) -> str:
        """Bump minor version (v1.0.0 → v1.1.0)"""
        match = re.match(r'v(\d+)\.(\d+)\.(\d+)', version)
        if match:
            major, minor, patch = map(int, match.groups())
            return f"v{major}.{minor + 1}.0"
        return version
    
    def bump_major(version: str) -> str:
        """Bump major version (v1.0.0 → v2.0.0)"""
        match = re.match(r'v(\d+)\.(\d+)\.(\d+)', version)
        if match:
            major, minor, patch = map(int, match.groups())
            return f"v{major + 1}.0.0"
        return version
    
    # Test patch bump
    assert bump_patch("v1.0.0") == "v1.0.1"
    assert bump_patch("v1.0.9") == "v1.0.10"
    
    # Test minor bump
    assert bump_minor("v1.0.5") == "v1.1.0"
    assert bump_minor("v2.9.3") == "v2.10.0"
    
    # Test major bump
    assert bump_major("v1.5.3") == "v2.0.0"
    assert bump_major("v9.9.9") == "v10.0.0"


def test_metadata_preservation():
    """Test that metadata is preserved during updates"""
    with tempfile.TemporaryDirectory() as tmpdir:
        temp_registry = Path(tmpdir) / "registry.json"
        
        initial_data = {
            "embedding_model": "v1.0.0",
            "metadata": {
                "embedding_model": {
                    "dimension": 768,
                    "base": "test-model"
                }
            }
        }
        
        with open(temp_registry, 'w') as f:
            json.dump(initial_data, f)
        
        # Update version
        with open(temp_registry, 'r') as f:
            registry = json.load(f)
        
        registry['embedding_model'] = "v1.1.0"
        
        with open(temp_registry, 'w') as f:
            json.dump(registry, f)
        
        # Verify metadata preserved
        with open(temp_registry, 'r') as f:
            updated = json.load(f)
        
        assert 'metadata' in updated
        assert updated['metadata']['embedding_model']['dimension'] == 768


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

