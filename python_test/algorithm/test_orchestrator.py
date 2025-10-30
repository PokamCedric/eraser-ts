"""
Simple test script for the layer classification orchestrator
"""

from layer_classification_orchestrator import LayerClassificationOrchestrator
from test_data import relations_input_crm


def main():
    print("="*80)
    print("LAYER CLASSIFICATION TEST")
    print("="*80)

    # Run orchestrator
    orchestrator = LayerClassificationOrchestrator(
        relations_input_crm,
        debug=True
    )
    final_layers = orchestrator.run()

    print("\n" + "="*80)
    print("TEST COMPLETE")
    print("="*80)
    print(f"Total layers: {len(final_layers)}")


if __name__ == "__main__":
    main()
