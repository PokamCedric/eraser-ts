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
        changed = True
        max_iterations = len(self.entities) ** 2
        iteration = 0

        while changed and iteration < max_iterations:
            changed = False
            iteration += 1

            for (x, z) in self.relations:
                for y in self.entities:
                    if y != x and y != z:
                        if (x, y) in self.distances and (y, z) in self.distances:
                            new_distance = self.distances[(x, y)] + self.distances[(y, z)]
                            if (x, z) in self.distances:
                                if self.distances[(x, z)] < new_distance:
                                    self.distances[(x, z)] = new_distance
                                    changed = True
                            else:
                                self.distances[(x, z)] = new_distance
                                changed = True

    def _count_connections(self):
        """Compte le nombre de connexions pour chaque entité"""
        connections = {}
        for entity in self.entities:
            count = 0
            for left, right in self.relations:
                if left == entity or right == entity:
                    count += 1
            connections[entity] = count
        return connections

    def compute_layers(self):
        """Calcule les layers en utilisant l'entité la plus connectée comme référence"""
        if not self.entities:
            return []

        # Étape 1: Trouver l'entité la plus connectée
        connections = self._count_connections()
        reference_entity = max(connections.items(), key=lambda x: x[1])[0]

        print(f"\n[DEBUG] Entite de reference: {reference_entity} ({connections[reference_entity]} connexions)")

        # Étape 2: Trier les relations par connectivité
        sorted_distances = sorted(
            self.distances.items(),
            key=lambda item: connections[item[0][0]] + connections[item[0][1]],
            reverse=True
        )

        print(f"\n[DEBUG] === Relations triees par connectivite ===")
        for idx, ((left, right), distance) in enumerate(sorted_distances[:15], 1):
            conn_sum = connections[left] + connections[right]
            print(f"[DEBUG] {idx}. {left}({connections[left]}) r {right}({connections[right]}) = {conn_sum} connexions")

        # Étape 3: Placer l'entité de référence au layer 0
        layers = {reference_entity: 0}

        # Étape 4: Propager depuis l'entité de référence
        max_iterations = len(self.entities) ** 2
        iteration = 0

        while len(layers) < len(self.entities) and iteration < max_iterations:
            iteration += 1
            progress = False

            for (left, right), distance in sorted_distances:
                if left in layers and right not in layers:
                    layers[right] = layers[left] + distance
                    progress = True

                elif right in layers and left not in layers:
                    layers[left] = layers[right] - distance
                    progress = True

                elif left in layers and right in layers:
                    expected = layers[left] + distance
                    if layers[right] < expected:
                        layers[right] = expected
                        progress = True

            if not progress:
                for entity in self.entities:
                    if entity not in layers:
                        layers[entity] = 0

        # Afficher résumé
        print(f"\n[DEBUG] ========================================")
        print(f"[DEBUG] DISTANCES PAR RAPPORT A {reference_entity.upper()}")
        print(f"[DEBUG] ========================================")

        by_distance = {}
        for entity in layers.keys():
            if entity != reference_entity:
                dist = layers[entity]
                if dist not in by_distance:
                    by_distance[dist] = []
                by_distance[dist].append(entity)

        for dist in sorted(by_distance.keys()):
            direction = "GAUCHE" if dist < 0 else ("DROITE" if dist > 0 else "MEME LAYER")
            print(f"[DEBUG] Distance {dist:+d} ({direction}):")
            for entity in sorted(by_distance[dist]):
                print(f"[DEBUG]   - {entity}")

        # Normaliser
        if layers:
            min_layer = min(layers.values())
            layers = {e: l - min_layer for e, l in layers.items()}
            print(f"\n[DEBUG] Normalisation: decalage de {-min_layer}")
            print(f"[DEBUG] {reference_entity} est maintenant au layer {layers[reference_entity]}")

        # Grouper par layer
        layer_dict = {}
        for entity, layer in layers.items():
            if layer not in layer_dict:
                layer_dict[layer] = []
            layer_dict[layer].append(entity)

        sorted_layers = [sorted(layer_dict[i]) for i in sorted(layer_dict.keys())]
        return sorted_layers

    def __str__(self):
        layers = self.compute_layers()
        return " - ".join(["(" + ", ".join(layer) + ")" for layer in layers])


# === Test avec clusters CRM ===
classifier = LayerClassifier()

# Interprétation des clusters selon votre notation
# Format: Cluster-label: [entités] r [cible]

relations = [
    # Cluster-users vers users
    ("user_roles", "users"),
    ("team_members", "users"),
    ("teams", "users"),
    ("accounts", "users"),
    ("leads", "users"),
    ("opportunities", "users"),
    ("activities", "users"),
    ("activity_assignments", "users"),
    ("cases", "users"),
    ("notes", "users"),
    ("attachments", "users"),
    ("audit_logs", "users"),
    ("api_keys", "users"),

    # Relations supplémentaires des clusters
    ("team_members", "teams"),
    ("contacts", "accounts"),
    ("contacts_accounts", "accounts"),
    ("opportunities", "accounts"),  # opportunities aussi vers accounts
    ("quotes", "accounts"),
    ("orders", "accounts"),
    ("invoices", "accounts"),
    ("payments", "accounts"),
    ("cases", "accounts"),  # cases aussi vers accounts
    ("emails", "accounts"),

    ("campaign_members", "leads"),

    ("opportunity_products", "opportunities"),
    ("quotes", "opportunities"),  # quotes aussi vers opportunities

    ("activity_assignments", "activities"),

    ("contacts", "notes"),
    ("accounts", "attachments"),  # accounts aussi vers attachments

    # Nouvelles relations des clusters
    ("contacts_accounts", "contacts"),
    ("campaign_members", "contacts"),
    ("opportunities", "contacts"),  # opportunities aussi vers contacts
    ("cases", "contacts"),  # cases aussi vers contacts

    ("orders", "quotes"),
    ("invoices", "orders"),
    ("payments", "invoices"),
]

print("=== Classification CRM avec clusters ===\n")

# Ajouter toutes les relations
for left, right in relations:
    classifier.add_relation(left, right)

# Afficher le résultat
print("\n=== RESULTAT FINAL ===")
layers = classifier.compute_layers()
for i, layer in enumerate(layers):
    print(f"Layer {i}: {layer}")

print(f"\n{classifier}")

# Statistiques
print(f"\n=== STATISTIQUES ===")
print(f"Nombre d'entites: {len(classifier.entities)}")
print(f"Nombre de relations: {len(relations)}")
print(f"Nombre de layers: {len(layers)}")

# Intercalations
print(f"\n=== INTERCALATIONS DETECTEES ===")
intercalations = []
for (x, z) in classifier.relations:
    for y in classifier.entities:
        if y != x and y != z:
            if (x, y) in classifier.relations and (y, z) in classifier.relations:
                intercalations.append((x, y, z))

if intercalations:
    for (x, y, z) in sorted(set(intercalations)):
        print(f"  {y} entre {x} et {z}")
else:
    print("  Aucune intercalation")

# Distances > 1
print(f"\n=== DISTANCES > 1 ===")
distances_gt1 = [(left, right, dist) for (left, right), dist in sorted(classifier.distances.items()) if dist > 1]
if distances_gt1:
    for left, right, distance in distances_gt1:
        print(f"  distance({left}, {right}) = {distance}")
else:
    print("  Toutes les distances = 1")
