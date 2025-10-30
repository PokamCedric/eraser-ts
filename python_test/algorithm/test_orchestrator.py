"""
Simple test script for the layer classification orchestrator
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from layer_classification_orchestrator import LayerClassificationOrchestrator
from test_data import relations_input_1


def main():
    print("="*80)
    print("LAYER CLASSIFICATION TEST")
    print("="*80)

    # Run orchestrator
    orchestrator = LayerClassificationOrchestrator(
        relations_input_1,
        debug=True
    )
    final_layers = orchestrator.run()

    print("\n" + "="*80)
    print("TEST COMPLETE")
    print("="*80)
    print(f"Total layers: {len(final_layers)}")


if __name__ == "__main__":
    main()
