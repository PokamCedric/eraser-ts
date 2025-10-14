# Guide d'utilisation - Hierarchical Layout Engine (Python)

## 🎯 Objectif

Tester et analyser l'algorithme de classification hiérarchique des entités en Python avant de l'utiliser dans TypeScript.

## 🚀 Démarrage rapide

### Test avec DSL intégré (analyse complète)
```bash
python hierarchical_layout.py
```

### Test avec un fichier DSL
```bash
python run_test.py test_dsl.txt
```

### Test avec l'exemple simple
```bash
python run_test.py example_simple.txt
```

## 📁 Fichiers disponibles

| Fichier | Description |
|---------|-------------|
| `hierarchical_layout.py` | Implémentation complète avec DSL intégré et statistiques détaillées |
| `run_test.py` | Script simple pour tester avec un fichier DSL externe |
| `test_dsl.txt` | Exemple complexe de DSL (16 entités, 19 relations) |
| `example_simple.txt` | Exemple simple (3 entités, 2 relations) |
| `README.md` | Documentation complète |
| `USAGE.md` | Ce guide |

## 📊 Sortie attendue

### Format de sortie (run_test.py)
```
============================================================
HIERARCHICAL LAYOUT RESULTS
============================================================

[!] Number of layers: 3

Layer 0: comments
Layer 1: posts
Layer 2: users

============================================================
```

### Interprétation

- **Layer 0** (gauche) : Entités feuilles (dépendent d'autres, personne ne dépend d'elles)
- **Layer N** (milieu) : Entités intermédiaires
- **Layer max** (droite) : Entités racines (autres dépendent d'elles, elles ne dépendent de personne)

## 🔧 Créer votre propre test

1. Créez un fichier `.txt` avec vos relations DSL
2. Exécutez : `python run_test.py votre_fichier.txt`

### Exemple de fichier DSL personnalisé

Créez `mon_schema.txt` :
```
// E-commerce simple
orders.userId > users.id
order_items.orderId > orders.id
order_items.productId > products.id
```

Exécutez :
```bash
python run_test.py mon_schema.txt
```

Résultat attendu :
```
[!] Number of layers: 3

Layer 0: order_items
Layer 1: orders
Layer 2: products, users
```

## 📝 Syntaxe DSL

### Relations supportées

```
// Many-to-One: A dépend de B
entityA.fieldX > entityB.fieldY

// One-to-One: A dépend de B
entityA.fieldX - entityB.fieldY

// Reversed: B dépend de A
entityA.fieldX < entityB.fieldY

// Commentaires
// Tout ce qui suit // est ignoré
```

### Exemples

```
// Blog basique
posts.authorId > users.id        // posts dépend de users
comments.postId > posts.id       // comments dépend de posts

// One-to-One
users.profileId - profiles.id    // users dépend de profiles

// Reversed
projects.id < tasks.projectId    // tasks dépend de projects
```

## 🎓 Comprendre l'algorithme

### Principe

1. **Construction du graphe** : Les relations DSL créent un graphe de dépendances dirigé
2. **Calcul récursif** : Chaque entité reçoit une couche basée sur ses dépendances
   - Pas de dépendances → Layer 0 (initialement)
   - Avec dépendances → Layer = max(layers des dépendances) + 1
3. **Inversion** : Les layers sont inversés pour placer les racines à droite
4. **Regroupement** : Les entités sont groupées par layer

### Exemple détaillé

DSL :
```
comments.postId > posts.id
posts.authorId > users.id
```

Étapes :
1. **Graphe** : `comments → posts → users`
2. **Calcul initial** :
   - `users` : pas de dépendances → Layer 0
   - `posts` : dépend de `users` (layer 0) → Layer 1
   - `comments` : dépend de `posts` (layer 1) → Layer 2
3. **Inversion** (max layer = 2) :
   - `users` : 2 - 0 = Layer 2
   - `posts` : 2 - 1 = Layer 1
   - `comments` : 2 - 2 = Layer 0
4. **Résultat** : `comments` (L0), `posts` (L1), `users` (L2)

## 🔍 Analyse des résultats

### Identifier les problèmes

**Trop de layers** → Dépendances chaînées trop longues
```
Solution : Dénormaliser ou ajouter des raccourcis
```

**Layer déséquilibré** → Trop d'entités dans un seul layer
```
Solution : Réorganiser les dépendances
```

**Cycles détectés** → Entités placées à Layer 0
```
Solution : Vérifier et corriger les dépendances circulaires
```

### Optimisation

Pour un layout optimal :
- **3-5 layers** : Idéal pour la lisibilité
- **Équilibré** : ~3-5 entités par layer
- **Séparation claire** : Références (droite), Transactions (gauche), Métier (milieu)

## 💡 Cas d'usage

### 1. Prototypage rapide
Testez différents schémas de dépendances rapidement

### 2. Validation de schéma
Vérifiez que votre schéma de BD a une hiérarchie logique

### 3. Documentation
Générez une vue hiérarchique de votre architecture de données

### 4. Refactoring
Identifiez les dépendances problématiques avant de coder

## ⚡ Astuces

### Tester rapidement une idée

Créez un petit fichier test :
```bash
echo "orders.userId > users.id" > test_quick.txt
echo "items.orderId > orders.id" >> test_quick.txt
python run_test.py test_quick.txt
```

### Comparer deux schémas

```bash
python run_test.py schema_v1.txt > result_v1.txt
python run_test.py schema_v2.txt > result_v2.txt
diff result_v1.txt result_v2.txt
```

### Analyse statistique détaillée

Utilisez le script complet :
```bash
python hierarchical_layout.py
```

Vous obtiendrez :
- Nombre d'entités et relations
- Entités racines (root)
- Entités feuilles (leaf)
- Moyenne d'entités par layer

## 🐛 Résolution de problèmes

### Erreur "File not found"
```
[X] Error: test_dsl.txt not found
```
**Solution** : Vérifiez que vous êtes dans le bon répertoire (`python_test/`)

### Aucun layer généré
**Cause** : Format DSL incorrect
**Solution** : Vérifiez la syntaxe (doit être `entity.field > entity.field`)

### Résultats inattendus
**Cause** : Confusion entre `>` et `<`
**Solution** : `A > B` signifie "A dépend de B"

## 📚 Ressources

- `README.md` - Documentation complète de l'algorithme
- `hierarchical_layout.py` - Code source commenté
- `../src/infrastructure/layout/HierarchicalLayoutEngine.ts` - Version TypeScript originale
