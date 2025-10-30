"""
Test simple pour démontrer l'efficacité du pruning précoce
"""

import sys
sys.path.insert(0, '.')

# Version simple sans les prints du fichier principal
class LayerClassifierSimple:
    def __init__(self):
        self.relations = []
        self.entities = set()
        self.distances = {}
        self.iterations_count = 0  # Pour tracker le nombre d'itérations

    def add_relation(self, left, right):
        self.relations.append((left, right))
        self.entities.add(left)
        self.entities.add(right)
        self.distances[(left, right)] = 1
        self._update_distances()

    def _update_distances(self):
        """Floyd-Warshall avec pruning précoce"""
        max_iterations = len(self.entities)
        iteration = 0

        while iteration < max_iterations:
            iteration += 1
            self.iterations_count = iteration
            changed_in_pass = False

            for k in self.entities:
                for i in self.entities:
                    for j in self.entities:
                        if i != j and i != k and j != k:
                            if (i, k) in self.distances and (k, j) in self.distances:
                                dist_via_k = self.distances[(i, k)] + self.distances[(k, j)]
                                if (i, j) in self.distances:
                                    if dist_via_k > self.distances[(i, j)]:
                                        self.distances[(i, j)] = dist_via_k
                                        changed_in_pass = True
                                else:
                                    self.distances[(i, j)] = dist_via_k
                                    changed_in_pass = True

            # Pruning précoce
            if not changed_in_pass:
                break


print("="*80)
print("DÉMONSTRATION DU PRUNING PRÉCOCE")
print("="*80)

# Test 1: Chaîne linéaire simple (converge en 1 itération)
print("\n1. CHAÎNE LINÉAIRE (A -> B -> C -> D -> E)")
relations_1 = [('A', 'B'), ('B', 'C'), ('C', 'D'), ('D', 'E')]
classifier_1 = LayerClassifierSimple()
for left, right in relations_1:
    classifier_1.add_relation(left, right)

print(f"   Entités: {len(classifier_1.entities)}")
print(f"   Itérations Floyd-Warshall: {classifier_1.iterations_count}")
print(f"   Maximum théorique: {len(classifier_1.entities)} itérations")
print(f"   Gain: {len(classifier_1.entities) - classifier_1.iterations_count} itérations évitées")
print(f"   Distances calculées: {len(classifier_1.distances)}")


# Test 2: Graphe avec conflit (nécessite plusieurs itérations)
print("\n2. GRAPHE AVEC CONFLIT (projects -> teams DIRECT + projects -> posts -> users -> teams)")
relations_2 = [
    ('projects', 'teams'),
    ('projects', 'posts'),
    ('posts', 'users'),
    ('users', 'teams'),
]
classifier_2 = LayerClassifierSimple()
for left, right in relations_2:
    classifier_2.add_relation(left, right)

print(f"   Entités: {len(classifier_2.entities)}")
print(f"   Itérations Floyd-Warshall: {classifier_2.iterations_count}")
print(f"   Maximum théorique: {len(classifier_2.entities)} itérations")
print(f"   Gain: {len(classifier_2.entities) - classifier_2.iterations_count} itérations évitées")
print(f"   Distance(projects, teams): {classifier_2.distances.get(('projects', 'teams'), 'N/A')}")
print(f"   (Devrait être 3 grâce à l'intercalation)")


# Test 3: Graphe dense (diamants multiples)
print("\n3. GRAPHE DENSE (5 diamants connectés)")
relations_3 = []
for i in range(5):
    base = i * 4
    relations_3.append((f'N{base}', f'N{base+1}'))
    relations_3.append((f'N{base}', f'N{base+2}'))
    relations_3.append((f'N{base+1}', f'N{base+3}'))
    relations_3.append((f'N{base+2}', f'N{base+3}'))
    if i < 4:
        relations_3.append((f'N{base+3}', f'N{base+4}'))

classifier_3 = LayerClassifierSimple()
for left, right in relations_3:
    classifier_3.add_relation(left, right)

print(f"   Entités: {len(classifier_3.entities)}")
print(f"   Itérations Floyd-Warshall: {classifier_3.iterations_count}")
print(f"   Maximum théorique: {len(classifier_3.entities)} itérations")
print(f"   Gain: {len(classifier_3.entities) - classifier_3.iterations_count} itérations évitées")
print(f"   Distances calculées: {len(classifier_3.distances)}")
print(f"   Plus longue distance: {max(classifier_3.distances.values())}")


print("\n" + "="*80)
print("CONCLUSION")
print("="*80)
print("\nLe pruning précoce réduit significativement le nombre d'itérations:")
print(f"  - Chaîne linéaire: {classifier_1.iterations_count}/{len(classifier_1.entities)} itérations")
print(f"  - Graphe conflit: {classifier_2.iterations_count}/{len(classifier_2.entities)} itérations")
print(f"  - Graphe dense: {classifier_3.iterations_count}/{len(classifier_3.entities)} itérations")
print("\nL'algorithme s'arrête dès que les distances convergent,")
print("évitant des calculs inutiles tout en garantissant la correction.")
