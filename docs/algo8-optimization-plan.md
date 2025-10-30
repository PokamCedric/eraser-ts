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

### ✅ Phase 1 (Quick wins - 1-2h de dev) - **TERMINÉE**
**Gain réel: 4.7% (algo9 vs algo8)**

- [x] **Optimisation #4** : Optimiser `_count_connections` (10-15% gain)
  - Complexité: O(n × r) → O(r)
  - Impact: Facile et immédiat

- [x] **Optimisation #3** : Utiliser des sets au lieu de listes (5% gain)
  - Complexité: O(n) → O(1) pour lookups
  - Impact: Très facile

- [x] **Optimisation #1** : Pré-calculer les clusters (15-20% gain)
  - Complexité: O(n × r) → O(r)
  - Impact: Moyen, structure à maintenir

**Livrable Phase 1** : ✅ algo9.py avec optimisations 1, 3, 4

**Résultats Phase 1:**
- algo8: 0.589 ms
- algo9: 0.562 ms
- **Amélioration: 4.7%** (1.05x speedup)

**Analyse:** Le gain est modeste car l'algorithme est déjà très rapide et ces optimisations ciblent des opérations peu fréquentes.

---

### ✅ Phase 2 (Impact majeur - 3-4h de dev) - **TERMINÉE**
**Gain réel: 3.9% (algo10 vs algo9), 8.4% total vs algo8**

- [x] **Optimisation #2** : Index inversé pour propagation (30-40% gain)
  - Complexité: O(n) → O(d)
  - Impact: Majeur, nécessite refactoring de propagation

- [x] **Optimisation #5** : Early exit dans propagation (5-10% gain)
  - Complexité: Ajout de tracking visited
  - Impact: Facile à ajouter après #2

**Livrable Phase 2** : ✅ algo10.py avec toutes les optimisations 1-5

**Résultats Phase 2:**
- algo8: 0.589 ms
- algo9: 0.562 ms
- algo10: 0.540 ms
- **Amélioration Phase 2: 3.9%** (1.04x speedup vs algo9)
- **Amélioration totale: 8.4%** (1.09x speedup vs algo8)

**Analyse:** Le gain est également modeste car sur le dataset CRM, la propagation ne se déclenche pas souvent (peu d'intercalations complexes). Les optimisations seraient plus impactantes sur des graphes plus denses avec plus d'intercalations.

---

### ⚠️ Phase 3 (Si nécessaire - avancé) - **TERMINÉE** ❌
**Gain réel: -2.5% (algo11 vs algo10) - RÉGRESSION**

- [x] **Optimisation #6** : Batch processing (20-25% gain estimé)
  - Complexité: Réécriture de la propagation récursive
  - Impact: **NÉGATIF sur ce dataset**

- [ ] **Optimisation #7** : Sparse storage (Variable)
  - Complexité: Optimisation mémoire
  - Impact: Pour très grands graphes
  - **Statut: Non implémentée** (pas nécessaire)

**Livrable Phase 3** : ✅ algo11.py (implémenté mais plus lent)

**Résultats Phase 3:**
- algo8: 0.630 ms
- algo9: 0.568 ms
- algo10: 0.562 ms
- algo11: 0.576 ms (❌ **plus lent que algo10**)
- **Régression Phase 3: -2.5%** vs algo10

**Analyse:** Le batch processing introduit un overhead supplémentaire (gestion de la queue, déqueue operations) qui est plus coûteux que le gain apporté par l'évitement de la récursion. Sur un petit graphe avec peu de propagations profondes, la récursion reste plus efficace.

---

## 📈 Résultats Finaux des Benchmarks

| Version | Temps moyen (ms) | Speedup vs algo7 | Amélioration vs algo8 | Statut |
|---------|------------------|------------------|----------------------|--------|
| algo7 (Floyd-Warshall) | 46.812 | 1x | - | ✅ Baseline |
| algo8 (Cedric) | 0.630 | **74.3x** | - | ✅ Baseline progressive |
| algo9 (Phase 1) | 0.568 | **82.4x** | **+9.9%** | ✅ Recommandé |
| algo10 (Phase 2) | 0.562 | **83.3x** | **+10.8%** | ✅ **MEILLEUR** |
| algo11 (Phase 3) | 0.576 | 81.2x | +8.6% | ❌ Régression vs algo10 |

### 🏆 Recommandation Finale

**Utiliser algo10** comme version de production !

**Raisons:**
- ✅ **Meilleur temps**: 0.562 ms (le plus rapide)
- ✅ **83.3x plus rapide** que Floyd-Warshall
- ✅ **10.8% plus rapide** que algo8
- ✅ Code propre et maintenable
- ✅ Optimisations efficaces (cache, sets, index inversé)

**Ne PAS utiliser algo11:**
- ❌ Plus lent que algo10 (-2.5%)
- ❌ Overhead du batch processing non justifié sur petits graphes

**Note:** Les résultats réels sont moins spectaculaires que prévu car:
1. L'algorithme algo8 est déjà extrêmement rapide (< 1ms)
2. Le dataset CRM est relativement petit (41 entités, 59 relations)
3. Peu d'intercalations complexes dans ce graphe spécifique

Les optimisations montreraient des gains plus importants sur:
- Graphes plus grands (>100 entités)
- Graphes plus denses (plus de relations par entité)
- Graphes avec plus d'intercalations transitives

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

**Dernière mise à jour**: 2025-10-30
**Prochaine étape**: ✅ Toutes les phases terminées - algo10 recommandé

---

## ⚠️ Phase 4 (Mise à Jour Incrémentale) - **ABANDONNÉE**

### Algo12: Incremental Updates

- **Date**: 2025-10-30
- **Objectif**: Optimiser pour visualisation ERP temps réel (add/remove relation)
- **Approche**: Mise à jour incrémentale au lieu de recalcul complet
- **Résultats**: ❌ **PLUS LENT que algo10**

#### Résultats des Benchmarks

| Opération | Algo10 (Full) | Algo12 (Incremental) | Verdict |
|-----------|---------------|----------------------|---------|
| Add single relation | 0.108 ms | 0.132 ms | ❌ 22% plus lent |
| Add 5 relations | 0.578 ms | 0.592 ms | ≈ Équivalent |
| Remove relation | 0.125 ms | 0.142 ms | ❌ 13% plus lent |

#### Analyse

**Pourquoi plus lent?**
1. **Graphe trop petit** (30 entités, 42 relations)
2. **Recalcul complet déjà ultra-rapide** (0.1ms)
3. **Overhead de l'approche incrémentale** (propagation, tracking, cache)
4. **Algo10 déjà optimisé** (83x plus rapide que Floyd-Warshall)

**Conclusion**:
- ❌ Ne PAS utiliser algo12 en production
- ✅ Rester sur algo10 (0.1ms = instantané pour utilisateur)
- 📊 Réévaluer seulement si graphe > 500 entités

#### Documentation

Voir: `docs/algo12-incremental-update-analysis.md`

---
