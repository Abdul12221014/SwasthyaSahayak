"""
Model Registry Updater

Automatically updates model versions in registry.json after training.
Part of MLOps workflow for version tracking and deployment.

Usage:
    python update_registry.py <model_name> <new_version>

Example:
    python update_registry.py embedding_model v1.1.0
"""

import json
import sys
from pathlib import Path
from datetime import datetime


def update_model_version(model_name: str, new_version: str):
    """Update model version in registry"""
    registry_path = Path(__file__).parent.parent / "models" / "registry.json"
    
    if not registry_path.exists():
        print(f"❌ Registry not found at {registry_path}")
        sys.exit(1)
    
    # Load registry
    with open(registry_path, 'r') as f:
        registry = json.load(f)
    
    # Validate model name
    if model_name not in registry:
        print(f"❌ Model '{model_name}' not found in registry")
        print(f"Available models: {list(registry.keys())}")
        sys.exit(1)
    
    # Update version
    old_version = registry.get(model_name, "unknown")
    registry[model_name] = new_version
    registry["last_updated"] = datetime.utcnow().isoformat() + "Z"
    
    # Save registry
    with open(registry_path, 'w') as f:
        json.dump(registry, f, indent=2)
    
    print(f"✅ Updated {model_name}: {old_version} → {new_version}")
    print(f"📝 Registry saved to {registry_path}")


def main():
    if len(sys.argv) != 3:
        print("Usage: python update_registry.py <model_name> <new_version>")
        print("\nExample:")
        print("  python update_registry.py embedding_model v1.1.0")
        sys.exit(1)
    
    model_name = sys.argv[1]
    new_version = sys.argv[2]
    
    # Validate version format
    if not new_version.startswith('v'):
        print("⚠️  Version should start with 'v' (e.g., v1.0.0)")
        new_version = f"v{new_version}"
    
    update_model_version(model_name, new_version)


if __name__ == "__main__":
    main()

