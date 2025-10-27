class LayerClassifier:
    def __init__(self):
        self.relations = []  # liste des relations (left, right)
        self.entities = set()  # toutes les entités
        self.distances = {}  # distances entre entités : (left, right) -> distance

    def add_relation(self, left, right):
        """Ajoute une relation A r B (A doit être à gauche de B)"""
        self.relations.append((left, right))
        self.entities.add(left)
        self.entities.add(right)
        # Distance initiale = 1
        self.distances[(left, right)] = 1
        # Recalculer toutes les distances avec les intercalations
        self._update_distances()

    def must_be_before(self, entity1, entity2):
        """Vérifie si entity1 doit strictement être avant entity2"""
        # entity1 r entity2 directement
        if (entity1, entity2) in self.relations:
            return True
        # Transitivité : entity1 r X et X avant entity2
        for (a, b) in self.relations:
            if a == entity1 and self.must_be_before(b, entity2):
                return True
        return False

    def can_be_in_same_layer(self, entity1, entity2):
        """Vérifie si deux entités peuvent être dans le même layer"""
        # Pas de contrainte directe ou transitive entre elles
        return not self.must_be_before(entity1, entity2) and not self.must_be_before(entity2, entity1)

    def _update_distances(self):
        """Met à jour les distances en détectant les intercalations (Théorème de Thalès)"""
        # Itérer jusqu'à ce que les distances se stabilisent
        changed = True
        max_iterations = len(self.entities) ** 2
        iteration = 0

        while changed and iteration < max_iterations:
            changed = False
            iteration += 1

            # Pour chaque relation X r Z
            for (x, z) in self.relations:
                # Chercher tous les Y tels que X r Y et Y r Z (intercalation)
                for y in self.entities:
                    if y != x and y != z:
                        if (x, y) in self.distances and (y, z) in self.distances:
                            # Y s'intercale entre X et Z
                            # Nouvelle distance : distance(X, Z) = distance(X, Y) + distance(Y, Z)
                            new_distance = self.distances[(x, y)] + self.distances[(y, z)]
                            if (x, z) in self.distances:
                                if self.distances[(x, z)] < new_distance:
                                    self.distances[(x, z)] = new_distance
                                    changed = True
                            else:
                                self.distances[(x, z)] = new_distance
                                changed = True

    def find_intercalations(self):
        """Trouve toutes les intercalations : Y entre X et Z si X r Z, Y r Z et X r Y"""
        intercalations = []  # liste de (X, Y, Z) où Y est entre X et Z

        for (x, z) in self.relations:
            # Chercher tous les Y tels que X r Y et Y r Z
            for y in self.entities:
                if y != x and y != z:
                    if (x, y) in self.relations and (y, z) in self.relations:
                        intercalations.append((x, y, z))

        return intercalations

    def compute_layers(self):
        """Calcule les layers basés sur les distances (depuis gauche ET droite)"""
        if not self.entities:
            return []

        # Étape 1: Calculer les layers minimum (depuis la gauche)
        min_layers = {entity: 0 for entity in self.entities}

        for _ in range(len(self.entities) ** 2):
            for (left, right), distance in self.distances.items():
                new_layer = min_layers[left] + distance
                if min_layers[right] < new_layer:
                    min_layers[right] = new_layer

        # Étape 2: Calculer les layers maximum (depuis la droite)
        # Initialiser à min_layers (position minimale garantie)
        max_layers = min_layers.copy()

        # Propager depuis la droite pour pousser vers la droite
        for _ in range(len(self.entities) ** 2):
            for (left, right), distance in self.distances.items():
                # left peut être poussé vers la droite si right l'est aussi
                # left peut être au max à right - distance
                desired_layer = max_layers[right] - distance
                # Mais on veut MAXIMISER, donc on prend le max entre actuel et désiré
                # SAUF si ça viole la contrainte min (left doit être >= min_layers[left])
                if desired_layer >= min_layers[left]:
                    max_layers[left] = max(max_layers[left], desired_layer)

        # Étape 3: Recalculer les positions finales depuis la gauche avec max_layers
        # Car certaines entités (sans successeurs) n'ont pas été mises à jour
        final_layers = max_layers.copy()

        for _ in range(len(self.entities) ** 2):
            for (left, right), distance in self.distances.items():
                # right doit être à left + distance
                new_layer = final_layers[left] + distance
                if final_layers[right] < new_layer:
                    final_layers[right] = new_layer

        # Grouper par layer
        layer_dict = {}
        for entity, layer in final_layers.items():
            if layer not in layer_dict:
                layer_dict[layer] = []
            layer_dict[layer].append(entity)

        sorted_layers = [sorted(layer_dict[i]) for i in sorted(layer_dict.keys())]
        return sorted_layers

    def _max_depth(self, entity):
        """Calcule la profondeur maximale de la chaîne partant de cette entité"""
        max_depth = 0
        for (a, b) in self.relations:
            if a == entity:
                max_depth = max(max_depth, 1 + self._max_depth(b))
        return max_depth

    def __str__(self):
        """Affiche les layers sous forme (A, B) - (C, D) - ..."""
        layers = self.compute_layers()
        return " - ".join(["(" + ", ".join(layer) + ")" for layer in layers])

    def get_intermediates(self, left, right):
        """Trouve toutes les entités C telles que left r C et C r right"""
        intermediates = set()
        for (a, b) in self.relations:
            if a == left:
                # left r b, vérifier si b r right
                for (c, d) in self.relations:
                    if c == b and d == right:
                        intermediates.add(b)
        return intermediates


# === Test ===
classifier = LayerClassifier()

relations = [
    ("A", "B"),
    ("D", "B"),
    ("D", "C"),
    ("F", "B"),
    ("G", "B"),
    ("F", "G"),
    ("D", "F"),
]

print("=== Ajout progressif des relations ===\n")

for idx, (left, right) in enumerate(relations):
    classifier.add_relation(left, right)
    result = str(classifier)
    print(f"{left} r {right} -> {result}")

    # Debug pour lignes 6 et 7
    if idx == 5 or idx == 6:
        print(f"  DEBUG ligne {idx+1}:")
        print(f"    Relations: {sorted(classifier.relations)}")
        print(f"    Distances: {sorted(classifier.distances.items())}")
        layers_debug = classifier.compute_layers()
        print(f"    Layers détaillés: {layers_debug}")

print("\n=== Résultat final ===")
print(f"Layers: {classifier}")

print("\n=== Détails des intermédiaires ===")
print(f"Nombre de relations: {len(relations)}")
for left, right in relations:
    inter = classifier.get_intermediates(left, right)
    if inter:
        print(f"  {left} r {right}: intermédiaires = {inter}")

print("\n=== Intercalations détectées ===")
intercalations = classifier.find_intercalations()
for (x, y, z) in intercalations:
    print(f"  {y} entre {x} et {z}")

print("\n=== Relations actuelles ===")
for (left, right) in sorted(classifier.relations):
    print(f"  {left} r {right}")

print("\n=== Layers depuis la gauche ===")
layers_from_left = {entity: 0 for entity in classifier.entities}
for _ in range(len(classifier.entities) ** 2):
    for (left, right) in classifier.relations:
        new_layer = layers_from_left[left] + 1
        if layers_from_left[right] < new_layer:
            layers_from_left[right] = new_layer

for entity in sorted(classifier.entities):
    print(f"  {entity}: layer {layers_from_left[entity]}")

print("\n=== Layers depuis la droite (inversés) ===")
max_layer = max(layers_from_left.values())
layers_from_right = {entity: max_layer for entity in classifier.entities}
for _ in range(len(classifier.entities) ** 2):
    for (left, right) in classifier.relations:
        new_layer = layers_from_right[right] - 1
        if layers_from_right[left] > new_layer:
            layers_from_right[left] = new_layer

for entity in sorted(classifier.entities):
    print(f"  {entity}: layer {layers_from_right[entity]}")
