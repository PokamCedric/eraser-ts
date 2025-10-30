"""
Phase 0: Relation Parser

Parses DSL input and extracts entity relations.
"""

from typing import List, Tuple


class RelationParser:
    """
    Parses DSL relations into normalized (left, right) tuples

    Supported formats:
    - A -> B  : A points to B
    - A > B   : A points to B
    - A - B   : A points to B
    - A < B   : A points to B (A is left of B)
    - A <> B  : bidirectional (A -> B)
    """

    @staticmethod
    def extract_entity_name(field_ref: str) -> str:
        """
        Extract entity name from field reference

        Examples:
        - "users.id" -> "users"
        - "accounts" -> "accounts"
        """
        field_ref = field_ref.strip()
        if '.' in field_ref:
            return field_ref.split('.')[0]
        return field_ref

    @classmethod
    def parse(cls, dsl_input: str) -> List[Tuple[str, str]]:
        """
        Parse DSL input into list of directed relations

        Args:
            dsl_input: Multi-line DSL string with relations

        Returns: [(left, right), ...] where left -> right
        """
        relations_raw = []

        for line in dsl_input.strip().split('\n'):
            line = line.strip()
            if not line or line.startswith('//'):
                continue

            # Detect relation type and parse
            if '<>' in line:
                parts = line.split('<>')
                a = cls.extract_entity_name(parts[0])
                b = cls.extract_entity_name(parts[1])
                relations_raw.append((a, b))
            elif '->' in line:
                parts = line.split('->')
                a = cls.extract_entity_name(parts[0])
                b = cls.extract_entity_name(parts[1])
                relations_raw.append((a, b))
            elif '>' in line:
                parts = line.split('>')
                a = cls.extract_entity_name(parts[0])
                b = cls.extract_entity_name(parts[1])
                relations_raw.append((a, b))
            elif '<' in line:
                parts = line.split('<')
                a = cls.extract_entity_name(parts[0])
                b = cls.extract_entity_name(parts[1])
                relations_raw.append((a, b))  # A < B means A is left of B, so A -> B
            elif '-' in line:
                parts = line.split('-')
                a = cls.extract_entity_name(parts[0])
                b = cls.extract_entity_name(parts[1])
                relations_raw.append((a, b))

        return relations_raw
