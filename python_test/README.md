# Hierarchical Layout Engine - Python Implementation

Implémentation Python de l'algorithme de classification hiérarchique pour tester et analyser les layouts d'entités basés sur leurs dépendances.

## 📋 Description

Cet algorithme calcule des couches hiérarchiques pour les entités en fonction de leurs dépendances :
- **Layer 0 (gauche)** : Entités qui dépendent d'autres (feuilles)
- **Layer max (droite)** : Entités dont d'autres dépendent (racines)

L'algorithme est identique à celui utilisé dans `HierarchicalLayoutEngine.ts`.

## 🚀 Utilisation

### Option 1 : Script avec DSL intégré

```bash
python hierarchical_layout.py
```

Ce script contient un exemple de DSL et affiche une analyse complète.

### Option 2 : Lire depuis un fichier

```bash
python run_test.py test_dsl.txt
```

ou simplement :

```bash
python run_test.py
```

(utilise `test_dsl.txt` par défaut)

### Option 3 : Fichier personnalisé

```bash
python run_test.py mon_schema.txt
```

## 📝 Format DSL

Le DSL supporte les relations suivantes :

### Syntaxe

```
// Commentaires commencent par //

// Many-to-One (A dépend de B)
entity1.field > entity2.field

// One-to-One (A dépend de B)
entity1.field - entity2.field

// Reversed Many-to-One (B dépend de A)
entity1.field < entity2.field
```

### Exemple

```
// Users dépendent de Teams
users.teamId > teams.id

// Posts dépendent de Users
posts.authorId > users.id

// Comments dépendent de Posts
comments.postId > posts.id

// Relation inversée
projects.id < posts.projectId
```

## 📊 Sortie

Le script affiche :

1. **Nombre de layers** : Nombre de couches hiérarchiques
2. **Entités par layer** : Liste des entités dans chaque couche (de gauche à droite)

### Exemple de sortie

```
============================================================
📊 HIERARCHICAL LAYOUT RESULTS
============================================================

✨ Number of layers: 4

Layer 0: attachments, comments, milestones, notifications, post_tags, posts, role_permissions, user_projects, user_roles
Layer 1: projects, tags
Layer 2: profiles, users
Layer 3: permissions, roles, teams

============================================================
```

## 🔍 Interprétation des résultats

### Layer 0 (Gauche)
Entités **feuilles** qui dépendent d'autres mais dont personne ne dépend directement.
- Exemple : `comments`, `attachments`, `notifications`
- Ces entités sont généralement des "détails" ou des "transactions"

### Layers intermédiaires
Entités qui ont à la fois des dépendances et des dépendants.
- Exemple : `users`, `posts`, `projects`
- Ces entités sont généralement des "entités métier principales"

### Layer max (Droite)
Entités **racines** dont beaucoup dépendent mais qui ne dépendent de personne.
- Exemple : `teams`, `roles`, `permissions`
- Ces entités sont généralement des "entités de référence" ou "configurations"

## 🧪 Test avec vos propres données

1. Créez un fichier `.txt` avec vos relations DSL
2. Exécutez : `python run_test.py votre_fichier.txt`
3. Analysez les résultats pour comprendre la hiérarchie

## 🎯 Cas d'usage

- **Tester différents schémas** de base de données
- **Comprendre les dépendances** entre entités
- **Optimiser le layout** avant de l'implémenter dans TypeScript
- **Déboguer des problèmes** de positionnement d'entités
- **Analyser la complexité** d'un schéma de données

## 📦 Fichiers

- `hierarchical_layout.py` - Implémentation complète avec DSL intégré
- `run_test.py` - Script simple pour tester avec un fichier
- `test_dsl.txt` - Exemple de fichier DSL
- `README.md` - Cette documentation

## 🔧 Algorithme

L'algorithme utilise une approche récursive :

1. **Construction du graphe** : Création d'un graphe de dépendances dirigé
2. **Calcul initial** : Chaque nœud reçoit une couche = max(couches des dépendances) + 1
3. **Inversion** : Les couches sont inversées pour placer les racines à droite
4. **Regroupement** : Les entités sont groupées par couche

### Complexité

- **Temps** : O(N + E) où N = nombre d'entités, E = nombre de relations
- **Espace** : O(N + E)

## 🐍 Prérequis

- Python 3.7+
- Aucune dépendance externe (utilise uniquement la bibliothèque standard)

## 💡 Astuces

### Déboguer un layout

Si le layout ne correspond pas à vos attentes :

1. Vérifiez la **direction des flèches** : `>` vs `<`
2. Vérifiez les **cycles** : L'algorithme détecte les cycles et les place à la couche 0
3. Analysez les **dépendances transitives** : A→B→C place C plus à droite

### Optimiser un schéma

- **Minimiser les couches** : Réduire les dépendances transitives
- **Équilibrer les couches** : Répartir les entités uniformément
- **Séparer les concerns** : Entités de référence à droite, transactions à gauche
