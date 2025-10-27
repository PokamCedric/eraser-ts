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

    def __str__(self):
        """Affiche les layers sous forme (A, B) - (C, D) - ..."""
        layers = self.compute_layers()
        return " - ".join(["(" + ", ".join(layer) + ")" for layer in layers])


# === Test avec le DSL ERP ===
classifier = LayerClassifier()

# Relations du DSL
relations = [
    ("users", "teams"),
    ("workspaces", "folders"),
    ("workspaces", "teams"),
    ("chat", "workspaces"),
    ("invite", "workspaces"),
    ("invite", "users"),
    ("users", "orders"),
    ("orders", "order_items"),
    ("order_items", "products"),
    ("products", "categories"),
    ("users", "reviews"),
    ("products", "reviews"),
    ("orders", "payments"),
    ("users", "payments"),
    ("orders", "shipments"),
    ("shipments", "addresses"),
    ("users", "carts"),
    ("carts", "cart_items"),
    ("cart_items", "products"),
    ("users", "addresses"),
]

print("=== Classification des entités ERP en layers ===\n")

# Ajouter toutes les relations
for left, right in relations:
    classifier.add_relation(left, right)

# Afficher le résultat final
print("Résultat final:")
layers = classifier.compute_layers()
for i, layer in enumerate(layers):
    print(f"Layer {i}: {', '.join(layer)}")

print(f"\n{classifier}")

# Afficher quelques statistiques
print(f"\n=== Statistiques ===")
print(f"Nombre d'entités: {len(classifier.entities)}")
print(f"Nombre de relations: {len(relations)}")
print(f"Nombre de layers: {len(layers)}")

# Afficher les intercalations détectées
print(f"\n=== Intercalations détectées ===")
intercalations = []
for (x, z) in classifier.relations:
    for y in classifier.entities:
        if y != x and y != z:
            if (x, y) in classifier.relations and (y, z) in classifier.relations:
                intercalations.append((x, y, z))

if intercalations:
    for (x, y, z) in intercalations:
        print(f"  {y} entre {x} et {z}")
else:
    print("  Aucune intercalation détectée")

# Afficher les distances calculées
print(f"\n=== Distances calculées ===")
for (left, right), distance in sorted(classifier.distances.items()):
    if distance > 1:
        print(f"  distance({left}, {right}) = {distance}")
