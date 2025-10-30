"""
Layer Classification Orchestrator

Main coordinator that runs all phases:
- Phase 0: Parsing
- Phase 1-2: Preprocessing
- Phase 3: Horizontal alignment (X-axis)
- Phase 4: Vertical alignment (Y-axis)
"""

from typing import List, Tuple

from relation_parser import RelationParser
from graph_preprocessor import GraphPreprocessor
from horizontal_layer_classifier import HorizontalLayerClassifier
from pivot_based_vertical_optimizer_v2 import PivotBasedVerticalOptimizerV2
from crossing_minimizer import CrossingMinimizer


class LayerClassificationOrchestrator:
    """
    Orchestrates the complete layer classification pipeline

    Usage:
        orchestrator = LayerClassificationOrchestrator(dsl_input, debug=True)
        final_layers = orchestrator.run()
    """

    def __init__(self, dsl_input: str, debug: bool = False):
        """
        Initialize orchestrator

        Args:
            dsl_input: Multi-line DSL string with relations
            debug: Enable debug logging
        """
        self.dsl_input = dsl_input
        self.debug = debug

        # Results from each phase
        self.raw_relations: List[Tuple[str, str]] = []
        self.relations: List[Tuple[str, str]] = []
        self.entity_order: List[str] = []
        self.horizontal_layers: List[List[str]] = []
        self.direct_predecessors = {}
        self.final_layers: List[List[str]] = []

    def run(self) -> List[List[str]]:
        """
        Run complete pipeline

        Returns: Final optimized layers
        """
        self._log_phase("PHASE 0: PARSING")
        self.raw_relations = RelationParser.parse(self.dsl_input)
        self._log(f"Parsed {len(self.raw_relations)} raw relations")

        self._log_phase("PHASE 1-2: PREPROCESSING")
        preprocessor = GraphPreprocessor()
        self.relations = preprocessor.deduplicate(self.raw_relations)
        self._log(f"After deduplication: {len(self.relations)} unique relations")

        self.entity_order = preprocessor.build_entity_order(self.relations)
        self._log(f"Entity order (top 10): {self.entity_order[:10]}")

        self._log_phase("PHASE 3: HORIZONTAL ALIGNMENT (X-AXIS)")
        horizontal_classifier = HorizontalLayerClassifier()
        for left, right in self.relations:
            horizontal_classifier.add_relation(left, right)

        self.horizontal_layers = horizontal_classifier.compute_layers(self.entity_order)
        self._log(f"Horizontal layers: {len(self.horizontal_layers)} layers")
        for idx, layer in enumerate(self.horizontal_layers):
            self._log(f"  Layer {idx}: {layer}")

        self._log_phase("PHASE 4: SOURCE-AWARE VERTICAL ALIGNMENT (Y-AXIS)")
        vertical_optimizer = PivotBasedVerticalOptimizerV2(self.relations)
        vertical_layers = vertical_optimizer.optimize(
            self.horizontal_layers,
            self.entity_order
        )
        self._log("Source-aware vertical optimization complete")

        self._log_phase("PHASE 5: CROSSING MINIMIZATION")
        crossing_minimizer = CrossingMinimizer(self.relations)
        self.final_layers = crossing_minimizer.minimize_crossings(vertical_layers, max_iterations=4)
        self._log("Crossing minimization complete")

        self._log_phase("FINAL RESULT")
        for idx, layer in enumerate(self.final_layers):
            self._log(f"Layer {idx}: {layer}")

        return self.final_layers

    def _log_phase(self, title: str):
        """Log phase title"""
        if self.debug:
            print(f"\n{'='*80}")
            print(title)
            print('='*80)

    def _log(self, message: str):
        """Log message"""
        if self.debug:
            print(message)
