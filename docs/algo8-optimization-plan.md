# Plan d'Optimisation pour algo8

## État Actuel
- **algo8 (Cedric)** : 0.631 ms en moyenne (100 itérations sur CRM dataset)
- **73.10x plus rapide** que Floyd-Warshall (algo7)

## Objectif
Optimiser encore plus l'algo8 pour atteindre **120-140x plus rapide** que Floyd-Warshall

---

## 🚀 Propositions d'Optimisation

### 1. **Pré-calculer les clusters** (Priorité: ⭐⭐⭐⭐⭐)
- **Gain estimé**: 15-20%
- **Difficulté**: 🟢 Facile
- **Statut**: ⬜ À faire

**Problème actuel** : À chaque step, on parcourt TOUTES les relations pour trouver le cluster
```python
# Ligne 204-207 : O(r) à chaque step
cluster_elements = []
for left, right in self.relations:
    if right == reference_entity and left not in cluster_elements:
        cluster_elements.append(left)
```

**Solution** : Pré-calculer les clusters une seule fois
```python
def __init__(self):
    self.clusters_cache = {}  # {entity: [cluster_elements]}

def _precompute_clusters(self):
    """Pré-calcule tous les clusters une seule fois"""
    for entity in self.entities:
        self.clusters_cache[entity] = [left for left, right in self.relations
                                       if right == entity]
```

**Gain** : O(n × r) → O(r) une seule fois

---

### 2. **Index inversé pour la propagation** (Priorité: ⭐⭐⭐⭐⭐)
- **Gain estimé**: 30-40%
- **Difficulté**: 🟡 Moyen
- **Statut**: ⬜ À faire

**Problème actuel** : La propagation parcourt TOUTES les entités
```python
# Ligne 170-184 : O(n) à chaque propagation
for entity in self.entity_reference_distances:
    if updated_entity in self.entity_reference_distances[entity]:
        # propagate...
```

**Solution** : Maintenir un index "qui dépend de qui"
```python
def __init__(self):
    self.dependents = defaultdict(set)  # {entity: {entities_that_depend_on_it}}

# Au lieu de parcourir tout le monde :
for entity in self.dependents[updated_entity]:
    # Only iterate over actual dependents
```

**Gain** : O(n) → O(d) où d = nombre de dépendances (souvent << n)

---

### 3. **Utiliser des sets au lieu de listes pour cluster_elements** (Priorité: ⭐⭐⭐)
- **Gain estimé**: 5%
- **Difficulté**: 🟢 Facile
- **Statut**: ⬜ À faire

**Problème** : `left not in cluster_elements` est O(n) avec une liste

**Solution** :
```python
cluster_elements = set()
for left, right in self.relations:
    if right == reference_entity:
        cluster_elements.add(left)
```

**Gain** : O(n) → O(1) pour les lookups

---

### 4. **Éviter les re-calculs dans `_count_connections`** (Priorité: ⭐⭐⭐⭐)
- **Gain estimé**: 10-15%
- **Difficulté**: 🟢 Facile
- **Statut**: ⬜ À faire

**Problème actuel** : Ligne 263-272, on parcourt toutes les relations pour chaque entité
```python
def _count_connections(self):
    for entity in self.entities:
        count = 0
        for left, right in self.relations:  # O(n × r)
            if left == entity or right == entity:
                count += 1
```

**Solution** : Calculer une seule fois
```python
def _count_connections_optimized(self):
    connections = defaultdict(int)
    for left, right in self.relations:  # O(r) seulement
        connections[left] += 1
        connections[right] += 1
    return dict(connections)
```

**Gain** : O(n × r) → O(r)

---

### 5. **Early exit dans la propagation** (Priorité: ⭐⭐⭐)
- **Gain estimé**: 5-10%
- **Difficulté**: 🟢 Facile
- **Statut**: ⬜ À faire

**Problème** : La propagation peut refaire des calculs inutiles

**Solution** : Ajouter un check
```python
def _propagate_distance_update(self, updated_entity, updated_ref, new_dist, visited=None):
    if visited is None:
        visited = set()

    if (updated_entity, updated_ref) in visited:
        return  # Already propagated this path

    visited.add((updated_entity, updated_ref))
    # ... rest of propagation
```

---

### 6. **Batch processing des mises à jour** (Priorité: ⭐⭐)
- **Gain estimé**: 20-25%
- **Difficulté**: 🔴 Difficile
- **Statut**: ⬜ À faire (Phase 3)

**Problème** : La récursion peut être coûteuse

**Solution** : Queue de mises à jour
```python
def _propagate_distance_update_batch(self, initial_updates):
    queue = deque(initial_updates)

    while queue:
        updated_entity, updated_ref, new_dist = queue.popleft()

        for entity in self.dependents[updated_entity]:
            # Calculate and queue updates
            # Évite la récursion profonde
```

---

### 7. **Optimisation mémoire : Sparse storage** (Priorité: ⭐)
- **Gain estimé**: Variable
- **Difficulté**: 🟡 Moyen
- **Statut**: ⬜ À faire (Optionnel)

**Problème** : `entity_reference_distances` peut devenir grand

**Solution** : Ne stocker que les distances > 1
```python
# Au lieu de stocker toutes les distances de 1
# Ne stocker que celles qui ont été calculées transitivement
```

---

## 📊 Estimation des Gains Cumulatifs

| Optimisation | Gain estimé | Difficulté | Priorité | Phase |
|--------------|-------------|------------|----------|-------|
| 1. Pré-calculer clusters | 15-20% | 🟢 Facile | ⭐⭐⭐⭐⭐ | Phase 1 |
| 2. Index inversé propagation | 30-40% | 🟡 Moyen | ⭐⭐⭐⭐⭐ | Phase 2 |
| 3. Sets au lieu de listes | 5% | 🟢 Facile | ⭐⭐⭐ | Phase 1 |
| 4. Optimiser count_connections | 10-15% | 🟢 Facile | ⭐⭐⭐⭐ | Phase 1 |
| 5. Early exit propagation | 5-10% | 🟢 Facile | ⭐⭐⭐ | Phase 2 |
| 6. Batch processing | 20-25% | 🔴 Difficile | ⭐⭐ | Phase 3 |
| 7. Sparse storage | Variable | 🟡 Moyen | ⭐ | Optionnel |

**Gain total estimé avec optimisations 1-5 : 65-90% supplémentaire**

**Objectif final : ~120-140x plus rapide que Floyd-Warshall !**

---

## 🎯 Plan d'Action

### ✅ Phase 1 (Quick wins - 1-2h de dev)
**Gain estimé: 30-40% supplémentaire**

- [ ] **Optimisation #4** : Optimiser `_count_connections` (10-15% gain)
  - Complexité: O(n × r) → O(r)
  - Impact: Facile et immédiat

- [ ] **Optimisation #3** : Utiliser des sets au lieu de listes (5% gain)
  - Complexité: O(n) → O(1) pour lookups
  - Impact: Très facile

- [ ] **Optimisation #1** : Pré-calculer les clusters (15-20% gain)
  - Complexité: O(n × r) → O(r)
  - Impact: Moyen, structure à maintenir

**Livrable Phase 1** : algo9.py avec optimisations 1, 3, 4

---

### ✅ Phase 2 (Impact majeur - 3-4h de dev)
**Gain estimé: 35-50% supplémentaire**

- [ ] **Optimisation #2** : Index inversé pour propagation (30-40% gain)
  - Complexité: O(n) → O(d)
  - Impact: Majeur, nécessite refactoring de propagation

- [ ] **Optimisation #5** : Early exit dans propagation (5-10% gain)
  - Complexité: Ajout de tracking visited
  - Impact: Facile à ajouter après #2

**Livrable Phase 2** : algo10.py avec toutes les optimisations 1-5

---

### ⚠️ Phase 3 (Si nécessaire - avancé)
**Gain estimé: 20-25% supplémentaire**

- [ ] **Optimisation #6** : Batch processing (20-25% gain)
  - Complexité: Réécriture de la propagation récursive
  - Impact: Seulement si données très denses

- [ ] **Optimisation #7** : Sparse storage (Variable)
  - Complexité: Optimisation mémoire
  - Impact: Pour très grands graphes

**Livrable Phase 3** : algo11.py (si nécessaire)

---

## 📈 Benchmarks Prévus

Après chaque phase, lancer le benchmark:
```bash
python performance_test.py
```

| Version | Temps moyen (ms) | Speedup vs algo7 | Amélioration vs algo8 |
|---------|------------------|------------------|----------------------|
| algo7 (Floyd-Warshall) | 46.089 | 1x | - |
| algo8 (Cedric) | 0.631 | 73x | - |
| algo9 (Phase 1) | ~0.40 (estimé) | ~115x | ~37% |
| algo10 (Phase 2) | ~0.30 (estimé) | ~154x | ~53% |
| algo11 (Phase 3) | ~0.24 (estimé) | ~192x | ~62% |

---

## 📝 Notes de Développement

### Checklist Phase 1
1. Créer algo9.py à partir de algo8.py
2. Implémenter optimisation #4 (`_count_connections_optimized`)
3. Implémenter optimisation #3 (sets pour clusters)
4. Implémenter optimisation #1 (cache des clusters)
5. Tester que les résultats sont identiques
6. Lancer benchmark 100 itérations
7. Mettre à jour la documentation

### Validation
- ✅ Les résultats doivent être **exactement identiques** à algo8
- ✅ Le temps d'exécution doit être réduit de ~30-40%
- ✅ Pas de régression sur les cas limites

---

## 🔄 Historique des Versions

| Version | Date | Description | Performance |
|---------|------|-------------|-------------|
| algo7 | 2025-10-29 | Floyd-Warshall inversé | 46.089 ms |
| algo8 | 2025-10-29 | Progressive step-by-step | 0.631 ms (73x) |
| algo9 | À venir | Phase 1 optimizations | TBD |
| algo10 | À venir | Phase 2 optimizations | TBD |
| algo11 | À venir | Phase 3 optimizations | TBD |

---

**Dernière mise à jour**: 2025-10-29
**Prochaine étape**: Phase 1 - Quick wins
