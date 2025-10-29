# Algorithme de Classification en Layers V2 : L'Approche Progressive Sans Floyd-Warshall

## Introduction

Cette version 2 de l'algorithme remplace Floyd-Warshall par une approche **progressive et intuitive** qui calcule les distances étape par étape en suivant l'ordre de traitement des entités.

**Différence clé avec la V1** :
- **V1** : Utilise Floyd-Warshall (O(n³)) pour calculer toutes les distances transitives en une seule passe
- **V2** : Calcule les distances progressivement en suivant l'ordre de connectivité des entités, avec propagation automatique des mises à jour

**Avantages de la V2** :
1. ✅ **Plus intuitive** : Suit le raisonnement naturel (traiter les entités une par une dans l'ordre)
2. ✅ **Plus facile à débugger** : Chaque étape montre clairement comment les distances évoluent
3. ✅ **Plus transparente** : On peut visualiser le processus étape par étape
4. ⚠️ **Même résultat** : Produit exactement les mêmes distances que Floyd-Warshall
5. ⚠️ **Complexité similaire** : O(n²) à O(n³) selon la structure du graphe (avec propagation récursive)

---

## Vue d'ensemble : L'Approche en Trois Phases

La structure globale reste identique à la V1 :

```
PHASE 1: Pré-processing (identique à V1)
   ↓
PHASE 2: Calcul progressif des distances (NOUVEAU - remplace Floyd-Warshall)
   ↓
PHASE 3: Classification en layers (identique à V1)
```

Seule la **Phase 2** change radicalement. Les Phases 1 et 3 sont identiques à la V1.

---

## PHASE 1 : Le Pré-processing - Identique à V1

Cette phase est **exactement la même** que dans la V1. Voir la [documentation V1](./layer-classification-algorithm.md#phase-1--le-pré-processing---nettoyer-et-ordonner) pour les détails.

En résumé :
1. Normaliser les relations (gérer les flèches)
2. Éliminer les doublons
3. Calculer l'ordre de traitement (entité la plus connectée en premier)

**Résultat** : Une liste ordonnée d'entités à traiter, par exemple :
```
Ordre: users > accounts > contacts > opportunities > leads > ...
```

---

## PHASE 2 : Le Calcul Progressif des Distances - La Nouvelle Approche

C'est ici que réside toute l'innovation de la V2.

### L'Idée Centrale : Traiter les Entités dans l'Ordre de Connectivité

Au lieu d'utiliser Floyd-Warshall qui teste tous les nœuds intermédiaires possibles, on traite les entités **une par une** dans l'ordre de connectivité calculé en Phase 1.

**Pourquoi cet ordre fonctionne ?**

Parce que les entités les plus connectées sont traitées en premier, elles servent de "ponts" naturels pour propager les distances aux entités moins connectées.

### Principe 2.1 : Les Clusters et les Distances de Référence

Pour chaque entité `E` traitée (appelée "entité de référence"), on :

1. **Identifie son cluster** : Toutes les entités qui pointent directement vers `E`
2. **Calcule les distances** : Chaque élément du cluster obtient une distance directe de `1` vers `E`
3. **Hérite les distances transitives** : Si `E` a déjà des distances vers d'autres références, les éléments du cluster héritent ces distances

**Exemple visuel** :

```
Étape 1: Traitement de 'users'
   Cluster: [accounts, leads, opportunities, ...]

   accounts → users (distance = 1)
   leads → users (distance = 1)
   opportunities → users (distance = 1)
   ...
```

```
Étape 2: Traitement de 'accounts'
   Cluster: [contacts, quotes, orders, ...]

   contacts → accounts (distance = 1)
   contacts → users (distance = 2) ← Héritée via accounts!

   Pourquoi 2? Parce que:
   - contacts → accounts = 1
   - accounts → users = 1 (calculé à l'étape 1)
   - Total: 1 + 1 = 2
```

### Principe 2.2 : Le Vecteur Multi-Références

Contrairement à Floyd-Warshall qui stocke une seule distance entre deux entités, notre approche stocke un **vecteur de distances** pour chaque entité :

```python
entity_reference_distances = {
    'contacts': {
        'accounts': 1,
        'users': 2
    },
    'opportunities': {
        'users': 1,
        'accounts': 1,
        'contacts': 1
    }
}
```

Chaque entité connaît sa distance vers **toutes les entités de référence** déjà traitées.

**Avantage** : On peut tracer le chemin complet et voir toutes les intercalations d'un coup d'œil.

### Principe 2.3 : La Règle de Maximalité (Inchangée)

Quand on calcule une nouvelle distance via un chemin transitif, on applique toujours la règle :

> **Garder la distance maximale** (le chemin avec le plus d'intercalations)

**Exemple** :

```
contacts → users = 2 (via accounts, calculé à l'étape 2)

Mais à l'étape 3, on traite 'notes' qui pointe vers 'contacts'.
Si on découvre que:
  contacts → notes = 1
Et que notes → accounts = 2, notes → users = 3

Alors:
  contacts → users = MAX(2, 3) = 3 ← Mise à jour!
```

Cette règle est **identique** à celle de Floyd-Warshall inversé dans la V1.

### Le Problème : La Mise à Jour en Cascade

**Le bug que nous avons rencontré** :

Quand une distance est mise à jour (comme `contacts → users` passant de 2 à 3), **toutes les entités qui dépendent de `contacts` doivent aussi être mises à jour** !

**Exemple du bug** :

```
Étape 2:
  contacts → accounts = 1
  contacts → users = 2

Étape 3:
  campaign_members → contacts = 1
  campaign_members → users = 3 (via contacts : 1 + 2)

Étape 23 (beaucoup plus tard):
  accounts → attachments = 1
  accounts → users = 1 → 2 (via attachments) [MISE À JOUR]

  PROBLÈME: contacts dépend de accounts!
  contacts → users devrait passer de 2 à 3

  ET EN CASCADE:
  campaign_members → users devrait passer de 3 à 4
```

Sans propagation, les distances deviennent **incohérentes**.

### La Solution : La Propagation Récursive

Chaque fois qu'une distance est mise à jour, on **propage** cette mise à jour à toutes les entités dépendantes :

```python
def _propagate_distance_update(updated_entity, updated_ref, new_dist):
    """
    Quand la distance de updated_entity vers updated_ref est mise à jour,
    propager cette mise à jour à toutes les entités qui dépendent de updated_entity.
    """
    for entity in entity_reference_distances:
        if updated_entity in entity_reference_distances[entity]:
            dist_to_updated = entity_reference_distances[entity][updated_entity]
            inherited_dist = dist_to_updated + new_dist

            if inherited_dist > entity_reference_distances[entity][updated_ref]:
                entity_reference_distances[entity][updated_ref] = inherited_dist
                # RÉCURSIF: Propager encore plus loin
                _propagate_distance_update(entity, updated_ref, inherited_dist)
```

**Exemple de propagation** :

```
Étape 23:
  accounts → users = 1 → 2 [MISE À JOUR]

  [PROPAGATION] contacts → users = 2 → 3 (via accounts)
  [PROPAGATION] campaign_members → users = 3 → 4 (via contacts)
  [PROPAGATION] opportunities → users = 2 → 3 (via accounts)
  [PROPAGATION] quotes → users = 4 → 5 (via opportunities)
  [PROPAGATION] orders → users = 5 → 6 (via quotes)
  [PROPAGATION] invoices → users = 6 → 7 (via orders)
  [PROPAGATION] payments → users = 7 → 8 (via invoices)
  ...
```

La propagation se fait **en cascade automatiquement** jusqu'à ce que toutes les entités dépendantes soient à jour.

### Algorithme Complet de la Phase 2

```python
def _update_distances_step_by_step(entity_order):
    """
    Calcule les distances progressivement en suivant l'ordre de traitement.
    """
    for reference_entity in entity_order:
        # 1. Identifier le cluster de cette entité
        cluster_elements = find_all_entities_pointing_to(reference_entity)

        for element in cluster_elements:
            # 2. Distance directe = 1 (atomique)
            entity_reference_distances[element][reference_entity] = 1

            # 3. Hériter les distances transitives
            if reference_entity has distances to other refs:
                for prev_ref, prev_dist in reference_entity.distances:
                    inherited_dist = 1 + prev_dist

                    # 4. Appliquer la règle de maximalité
                    if inherited_dist > current_dist(element, prev_ref):
                        entity_reference_distances[element][prev_ref] = inherited_dist

                        # 5. PROPAGER la mise à jour
                        _propagate_distance_update(element, prev_ref, inherited_dist)
```

**Les 5 étapes clés** :
1. **Cluster** : Identifier qui pointe vers l'entité de référence
2. **Distance directe** : Atomique = 1
3. **Héritage** : Calculer les distances transitives via la référence
4. **Maximalité** : Garder la distance la plus longue
5. **Propagation** : Mettre à jour en cascade toutes les entités dépendantes

### Exemple Complet Pas-à-Pas

**Relations de départ** :
```
users > profiles
accounts > users
contacts > accounts
quotes > accounts
orders > quotes
```

**Ordre de traitement** : `users > accounts > contacts > quotes > orders`

---

**ÉTAPE 1 : Traiter 'users'**

Cluster de users : `[accounts]`

```
accounts → users = 1
```

Résultat après Étape 1 :
```
Layer 0: [accounts]
Layer 1: [users]
```

---

**ÉTAPE 2 : Traiter 'accounts'**

Cluster de accounts : `[contacts, quotes]`

```
contacts → accounts = 1
contacts → users = 2 (hérité via accounts : 1 + 1)

quotes → accounts = 1
quotes → users = 2 (hérité via accounts : 1 + 1)
```

Résultat après Étape 2 :
```
Layer 0: [contacts, quotes]
Layer 1: [accounts]
Layer 2: [users]
```

---

**ÉTAPE 3 : Traiter 'contacts'**

Cluster de contacts : `[]` (aucune entité ne pointe vers contacts dans cet exemple)

Pas de changement.

---

**ÉTAPE 4 : Traiter 'quotes'**

Cluster de quotes : `[orders]`

```
orders → quotes = 1
orders → accounts = 2 (hérité via quotes : 1 + 1)
orders → users = 3 (hérité via quotes : 1 + 2)
```

Résultat après Étape 4 :
```
Layer 0: [orders]
Layer 1: [contacts, quotes]
Layer 2: [accounts]
Layer 3: [users]
```

---

**ÉTAPE 5 : Traiter 'orders'**

Cluster de orders : `[]`

Pas de changement.

---

**Résultat final** :
```
entity_reference_distances = {
    'accounts': {'users': 1},
    'contacts': {'accounts': 1, 'users': 2},
    'quotes': {'accounts': 1, 'users': 2},
    'orders': {'quotes': 1, 'accounts': 2, 'users': 3}
}
```

### Propriétés Mathématiques de l'Approche Progressive

1. **Complétude** : Toutes les distances transitives sont calculées (grâce à la propagation)
2. **Maximalité** : On garde toujours la distance maximale (même règle que Floyd-Warshall)
3. **Convergence** : L'algorithme termine car chaque distance ne peut être mise à jour qu'un nombre fini de fois
4. **Cohérence** : La propagation garantit que toutes les entités dépendantes sont à jour

### Complexité de l'Approche Progressive

**Cas moyen** : O(n²)
- On traite chaque entité une fois : O(n)
- Pour chaque entité, on traite son cluster : O(taille du cluster)
- Propagation moyenne : O(profondeur du graphe)

**Pire cas** : O(n³)
- Graphe très dense où chaque mise à jour déclenche une propagation en cascade à travers toutes les entités
- Équivalent à Floyd-Warshall dans le pire cas

**Cas optimal** : O(n × r) où r = nombre de relations
- Graphe clairsemé avec peu de mises à jour en cascade
- Meilleur que Floyd-Warshall dans ce cas

---

## PHASE 3 : Classification en Layers - Identique à V1

Cette phase est **exactement la même** que dans la V1. Voir la [documentation V1](./layer-classification-algorithm.md#phase-3--classification-en-layers) pour les détails.

En résumé :
1. Choisir l'entité de référence (la plus connectée)
2. Propager les positions relatives
3. Normaliser les layers (décaler pour commencer à 0)

---

## Comparaison V1 vs V2

| Aspect | V1 (Floyd-Warshall) | V2 (Progressive) |
|--------|---------------------|------------------|
| **Algorithme** | Floyd-Warshall inversé (MAX) | Traitement progressif avec propagation |
| **Complexité** | O(n³) garanti | O(n²) en moyenne, O(n³) pire cas |
| **Intuitivité** | ⭐⭐ Nécessite de comprendre Floyd-Warshall | ⭐⭐⭐⭐ Suit l'ordre naturel de traitement |
| **Débogage** | ⭐⭐ Difficile (toutes les distances en une fois) | ⭐⭐⭐⭐⭐ Facile (étape par étape) |
| **Visualisation** | ⭐⭐ Résultat final uniquement | ⭐⭐⭐⭐⭐ On voit chaque étape intermédiaire |
| **Résultat** | ✅ Correct | ✅ Correct (identique à V1) |
| **Performance** | ✅ Prévisible | ✅✅ **73x plus rapide !** |
| **Code** | ⭐⭐⭐ Plus compact | ⭐⭐⭐⭐ Plus verbeux mais plus clair |

### Résultats de Performance (Benchmark)

Test réalisé sur le dataset CRM (100 itérations chacun, debug=false) :

**algo7 (Floyd Marshall - V1) :**
- Moyenne : **0.046089s** (~46.1 ms)
- Min : 0.043228s
- Max : 0.063692s

**algo8 (Cedric - V2) :**
- Moyenne : **0.000631s** (~0.63 ms)
- Min : 0.000537s
- Max : 0.002058s

**🏆 Gagnant : algo8 (Cedric - V2)**
- **Speedup : 73.10x plus rapide** que Floyd Marshall
- **Amélioration : ~7200% de gain de performance**

**Détails du dataset de test :**
- Dataset : relations_input_crm
- Nombre d'entités : 41 entités
- Nombre de relations : 59 relations
- Complexité : Graphe CRM avec hiérarchies multiples et intercalations

**Conclusion :** L'algorithme progressif (V2) n'est pas seulement plus intuitif et facile à débugger, il est également **dramatiquement plus rapide** en pratique ! Le calcul progressif évite le triple parcours de Floyd-Warshall et ne recalcule que ce qui est nécessaire.

### Quand Utiliser Quelle Version ?

**⚠️ MISE À JOUR : Après le benchmark, la recommandation a changé !**

**Utiliser V2 (Progressive)** dans **TOUS les cas** :
- ✅ **73x plus rapide** que V1
- ✅ Plus intuitif et facile à comprendre
- ✅ Facile à débugger avec visualisation étape par étape
- ✅ Performance exceptionnelle sur graphes réels (CRM, e-commerce, etc.)
- ✅ Code plus clair et maintenable

**Utiliser V1 (Floyd-Warshall)** seulement si :
- 📚 Objectif pédagogique pour comprendre Floyd-Warshall
- 🔬 Recherche théorique nécessitant l'algorithme classique
- ⚠️ **Note : V1 est maintenant obsolète pour la production**

**Recommandation officielle** : **Utiliser V2 (algo8) pour tous les projets.** Les résultats du benchmark sont sans appel : V2 est supérieur à V1 sur tous les aspects (performance, clarté, débogage).

---

## Avantages Pédagogiques de la V2

### 1. Observation du Processus en Temps Réel

Avec la V2, on peut afficher les résultats intermédiaires après chaque étape :

```
== RESULT STEP 1 ===
Layer 0: [accounts, leads, opportunities, ...]
Layer 1: [users]

== RESULT STEP 2 ===
Layer 0: [contacts, quotes, orders, ...]
Layer 1: [accounts, leads, opportunities, ...]
Layer 2: [users]

== RESULT STEP 3 ===
Layer 0: [campaign_members, ...]
Layer 1: [contacts, quotes, orders, ...]
Layer 2: [accounts, leads, opportunities, ...]
Layer 3: [users]
```

**Bénéfice** : On **voit** comment les layers se construisent progressivement.

### 2. Traçabilité Complète des Distances

Chaque entité garde la trace de ses distances vers toutes les références :

```
opportunities distances: [3, 2, 1] to [users, accounts, contacts]
```

On peut lire : "opportunities est à distance 3 de users, 2 de accounts, et 1 de contacts"

**Bénéfice** : On comprend **pourquoi** une entité est placée à tel layer.

### 3. Détection Explicite des Intercalations

Quand une distance est mise à jour, on l'affiche clairement :

```
[DEBUG] dist(accounts, users) = 1 → 2 (via attachments) [MORE INTERCALATIONS]
[DEBUG] [PROPAGATION] contacts → users = 2 → 3 (via accounts)
```

**Bénéfice** : On voit **exactement** quelles intercalations sont détectées et comment elles se propagent.

### 4. Construction Pédagogique : Fonction `printlayer`

Une fonction simple à implémenter pour visualiser les layers à chaque étape :

```python
def print_layer(entity_reference_distances, current_reference):
    """
    Affiche les layers après avoir traité une entité de référence.
    """
    # Grouper les entités par leur distance à current_reference
    layers = defaultdict(list)

    for entity, distances in entity_reference_distances.items():
        if current_reference in distances:
            dist = distances[current_reference]
            layers[dist].append(entity)

    # Afficher
    print(f"\n== RESULT AFTER PROCESSING '{current_reference}' ===")
    for layer_idx in sorted(layers.keys()):
        print(f"Layer {layer_idx}: {layers[layer_idx]}")
```

Cette fonction est appelée après chaque étape pour montrer la progression.

---

## Cas Limites et Solutions - Identiques à V1

Les cas limites (entités déconnectées, cycles, relations contradictoires) sont gérés **exactement de la même manière** que dans la V1.

La propagation récursive garantit que toutes les mises à jour en cascade sont appliquées correctement.

---

## Optimisations Possibles

### 1. Détection de Stabilité (Pruning Précoce)

Si après avoir traité plusieurs entités, aucune distance n'est mise à jour, on peut arrêter :

```python
for reference_entity in entity_order:
    changes = process_entity(reference_entity)

    if not changes:
        # Aucune mise à jour, on peut potentiellement arrêter
        consecutive_no_changes += 1
        if consecutive_no_changes > threshold:
            break
```

### 2. Propagation par Batch

Au lieu de propager immédiatement à chaque mise à jour, accumuler les mises à jour et les appliquer en batch :

```python
updates_queue = []

# Accumuler
updates_queue.append((entity, ref, new_dist))

# Appliquer en batch
for entity, ref, new_dist in updates_queue:
    apply_update(entity, ref, new_dist)
```

Cela réduit le nombre d'appels récursifs.

### 3. Memoization des Chemins

Stocker les chemins déjà calculés pour éviter de recalculer les mêmes distances :

```python
distance_cache = {}

def get_distance(entity, ref):
    if (entity, ref) in distance_cache:
        return distance_cache[(entity, ref)]

    dist = calculate_distance(entity, ref)
    distance_cache[(entity, ref)] = dist
    return dist
```

---

## Pourquoi Cette Approche Fonctionne

La V2 fonctionne pour les mêmes raisons que la V1, avec un principe supplémentaire :

### 1-4. Principes Identiques à V1

- ✅ Cohérence transitive
- ✅ Atomicité des relations
- ✅ Maximalité des distances
- ✅ Centralité de la référence

### 5. Nouveau Principe : Propagation Garantie

> Toute mise à jour de distance est automatiquement propagée à toutes les entités dépendantes, en cascade, jusqu'à convergence.

Ce principe garantit que les distances restent **cohérentes** même quand des intercalations sont découvertes tardivement dans le processus.

**Exemple** :

```
Si A dépend de B, et B dépend de C,
et que C → ref est mis à jour,
alors B → ref sera mis à jour,
puis A → ref sera mis à jour.

En cascade, automatiquement.
```

Sans ce principe, l'approche progressive serait **incorrecte**. Avec ce principe, elle est **mathématiquement équivalente** à Floyd-Warshall.

---

## Code Simplifié - Vue d'Ensemble

```python
class LayerClassifier:
    def __init__(self):
        self.relations = []
        self.entities = set()
        self.entity_reference_distances = defaultdict(dict)

    def _propagate_distance_update(self, updated_entity, updated_ref, new_dist):
        """Propage une mise à jour de distance à toutes les entités dépendantes"""
        for entity in self.entity_reference_distances:
            if updated_entity in self.entity_reference_distances[entity]:
                dist_to_updated = self.entity_reference_distances[entity][updated_entity]
                inherited_dist = dist_to_updated + new_dist

                if inherited_dist > self.entity_reference_distances[entity].get(updated_ref, 0):
                    self.entity_reference_distances[entity][updated_ref] = inherited_dist
                    # Récursif
                    self._propagate_distance_update(entity, updated_ref, inherited_dist)

    def _update_distances_step_by_step(self, entity_order):
        """Calcule les distances progressivement"""
        for reference_entity in entity_order:
            # 1. Identifier le cluster
            cluster_elements = [left for left, right in self.relations
                               if right == reference_entity]

            for element in cluster_elements:
                # 2. Distance directe = 1
                self.entity_reference_distances[element][reference_entity] = 1

                # 3. Hériter les distances transitives
                if reference_entity in self.entity_reference_distances:
                    for prev_ref, prev_dist in self.entity_reference_distances[reference_entity].items():
                        inherited_dist = 1 + prev_dist

                        # 4. Maximalité
                        current = self.entity_reference_distances[element].get(prev_ref, 0)
                        if inherited_dist > current:
                            self.entity_reference_distances[element][prev_ref] = inherited_dist
                            # 5. Propagation
                            self._propagate_distance_update(element, prev_ref, inherited_dist)
```

---

## Conclusion : Simplicité et Transparence

La V2 sacrifie un peu de compacité de code pour gagner énormément en :

1. **Compréhension** : On suit le raisonnement pas-à-pas
2. **Transparence** : On voit exactement ce qui se passe à chaque étape
3. **Débogage** : Facile de trouver où une distance a été calculée
4. **Pédagogie** : Idéal pour expliquer l'algorithme à d'autres développeurs

La V1 (Floyd-Warshall) reste valide et peut-être préférable pour des graphes très denses ou des besoins de performance prévisible.

**Les deux versions produisent exactement les mêmes résultats**, mais la V2 rend le processus **visible et compréhensible**.

---

*"La clarté est la politesse de l'homme de lettres."* - Jules Renard

Notre V2 illustre ce principe : en rendant chaque étape explicite et traçable, nous transformons un algorithme complexe en un processus transparent que tout développeur peut comprendre, débugger et améliorer.

---

## Annexe : Exemple de Sortie Détaillée

Voici un exemple réel de sortie de l'algorithme V2 :

```
================================================================================
ÉTAPE 4.2 : CALCULATE ALL RELATIVE DISTANCES
================================================================================

[DEBUG] === STEP-BY-STEP DISTANCE CALCULATION ===

[DEBUG] Step 1: Processing reference 'users'
[DEBUG]   Cluster elements: ['accounts', 'leads', 'opportunities', ...]
[DEBUG]     dist(accounts, users) = 1
[DEBUG]     dist(leads, users) = 1
[DEBUG]     dist(opportunities, users) = 1

[DEBUG] Step 2: Processing reference 'accounts'
[DEBUG]   Cluster elements: ['contacts', 'quotes', 'orders', ...]
[DEBUG]     dist(contacts, accounts) = 1
[DEBUG]     dist(contacts, users) = 2 (via accounts)
[DEBUG]     => contacts distances: [1, 2] to [accounts, users]
[DEBUG]     dist(quotes, accounts) = 1
[DEBUG]     dist(quotes, users) = 2 (via accounts)
[DEBUG]     => quotes distances: [1, 2] to [accounts, users]

[DEBUG] Step 3: Processing reference 'contacts'
[DEBUG]   Cluster elements: ['campaign_members', ...]
[DEBUG]     dist(campaign_members, contacts) = 1
[DEBUG]     dist(campaign_members, accounts) = 2 (via contacts)
[DEBUG]     dist(campaign_members, users) = 3 (via contacts)
[DEBUG]     => campaign_members distances: [1, 2, 3] to [contacts, accounts, users]

[DEBUG] Step 23: Processing reference 'attachments'
[DEBUG]   Cluster elements: ['accounts']
[DEBUG]     dist(accounts, attachments) = 1
[DEBUG]     dist(accounts, users) = 1 → 2 (via attachments) [MORE INTERCALATIONS]
[DEBUG]     [PROPAGATION] contacts → users = 2 → 3 (via accounts)
[DEBUG]     [PROPAGATION] campaign_members → users = 3 → 4 (via contacts)
[DEBUG]     [PROPAGATION] quotes → users = 2 → 4 (via accounts)
[DEBUG]     [PROPAGATION] orders → users = 3 → 5 (via quotes)
[DEBUG]     => accounts distances: [2, 1] to [users, attachments]
```

On voit clairement :
- ✅ Chaque étape de calcul
- ✅ Les distances héritées
- ✅ Les mises à jour quand des intercalations sont découvertes
- ✅ La propagation en cascade automatique

C'est cette **transparence** qui rend la V2 si précieuse pour comprendre et débugger l'algorithme.
