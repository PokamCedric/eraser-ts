# Layer Classifier - Rust Native Module

Ce module implémente l'algorithme de classification par couches (Floyd-Warshall inversé) en Rust pour de meilleures performances.

## Prérequis

1. **Installer Rust** (si ce n'est pas déjà fait):
   ```bash
   # Windows (via rustup)
   https://rustup.rs/
   # Téléchargez et exécutez rustup-init.exe
   ```

2. **Vérifier l'installation**:
   ```bash
   rustc --version
   cargo --version
   ```

## Compilation

### Mode Release (Production)
```bash
npm run build:rust
```

### Mode Debug (Développement)
```bash
npm run build:rust:debug
```

Le module compilé sera placé dans `src/infrastructure/layout/native/`.

## Utilisation

Le module est automatiquement utilisé par `LayerClassificationEngine` si disponible:

```typescript
import { LayerClassificationEngine } from './infrastructure/layout/LayerClassificationEngine';

// L'engine détectera automatiquement si le module Rust est disponible
const result = LayerClassificationEngine.layout(entities, relationships);
```

### Fallback TypeScript

Si le module Rust n'est pas disponible, l'implémentation TypeScript sera utilisée automatiquement:
- `LayerClassifier.ts` - Implémentation TypeScript originale
- `LayerClassifierRust.ts` - Wrapper pour le module natif Rust

## Performance

L'implémentation Rust devrait être **10-100x plus rapide** que la version TypeScript pour les gros graphes (>1000 entités).

### Benchmarks attendus (à venir)

| Entités | Relations | TypeScript | Rust | Speedup |
|---------|-----------|------------|------|---------|
| 100     | 200       | ~50ms      | ~5ms | 10x     |
| 500     | 1000      | ~500ms     | ~25ms| 20x     |
| 1000    | 2000      | ~2s        | ~50ms| 40x     |

## Architecture

```
rust/
├── Cargo.toml          # Configuration Rust
├── build.rs            # Script de build napi
├── src/
│   └── lib.rs          # Implémentation LayerClassifier en Rust
└── README.md           # Ce fichier

src/infrastructure/layout/
├── LayerClassifier.ts          # Implémentation TypeScript (fallback)
├── LayerClassifierRust.ts      # Wrapper TypeScript pour le module natif
├── LayerClassificationEngine.ts # Orchestrateur (utilise Rust si disponible)
└── native/                      # Module natif compilé (généré)
    └── layer-classifier-native.node
```

## Troubleshooting

### Erreur: "rustc: command not found"
- Installez Rust: https://rustup.rs/
- Redémarrez votre terminal après installation

### Erreur: "Module natif non disponible"
- Compilez le module: `npm run build:rust`
- Vérifiez que le fichier `.node` existe dans `src/infrastructure/layout/native/`

### Erreur de compilation Rust
- Mettez à jour Rust: `rustup update`
- Nettoyez le cache: `cargo clean` (dans le dossier `rust/`)

## Développement

Pour modifier l'implémentation Rust:

1. Éditez `rust/src/lib.rs`
2. Recompilez: `npm run build:rust:debug`
3. Testez dans votre application TypeScript

Le module utilise **napi-rs** pour l'interopérabilité Rust ↔ Node.js.

## Documentation

- [napi-rs documentation](https://napi.rs/)
- [Algorithme Floyd-Warshall](https://en.wikipedia.org/wiki/Floyd%E2%80%93Warshall_algorithm)
- Documentation du projet: `docs/layer-classification-algorithm.md`
