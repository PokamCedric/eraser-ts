# ERP Visual Designer 🎨 (TypeScript Edition)

**Real-time Entity Relationship Diagram Generator**

A powerful visual tool to create ER diagrams in real-time from a simple and intuitive DSL (Domain Specific Language).

**This is the TypeScript version with Clean Architecture implementation.**

![ERP Visual Designer](screenshot.png)

## ✨ Fonctionnalités

### 🎯 Core Features
- **Éditeur DSL en temps réel** - Monaco Editor (VS Code dans le navigateur)
- **Rendu de diagrammes interactifs** - Canvas HTML5 avec drag & drop
- **Synchronisation instantanée** - Les diagrammes se mettent à jour en temps réel
- **Layout automatique** - Positionnement intelligent des entités
- **Zoom & Pan** - Navigation fluide dans le canvas
- **Export multi-format** - DSL, JSON, SQL, TypeScript

### 🎨 Interface
- **Canvas (3/4 de l'écran)** - Espace visuel pour les diagrammes
- **Éditeur DSL (1/4)** - Éditeur de code avec coloration syntaxique
- **Redimensionnable** - Ajustez les proportions selon vos besoins
- **Dark theme** - Interface moderne et professionnelle

### 🔧 Outils
- **Auto-layout** - Réorganisation automatique des entités
- **Fit to screen** - Adapter le diagramme à l'écran
- **Zoom in/out** - Contrôle précis du niveau de zoom
- **Validation** - Vérification de la syntaxe DSL
- **Formatage** - Indentation automatique du code

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Type check
npm run type-check
```

The application will open at http://localhost:8001

### Utilisation

1. **Écrivez votre DSL** dans l'éditeur de droite
2. **Visualisez** le diagramme se générer automatiquement à gauche
3. **Interagissez** - Déplacez les entités, zoomez, etc.
4. **Exportez** votre schéma dans le format souhaité

## 📝 Syntaxe DSL

### Définir une Entité

```dsl
user [icon:user, color: #60a5fa] {
    id string @pk
    email string @unique
    first_name string
    last_name string @required
    phone string
    is_active bool @default(true)
    gender string @enum(fields: [male, female, other])
    created_at timestamp @default(now())
}
```

### Métadonnées d'Entité

```dsl
entity_name [icon:icon-name, color: #hexcolor] {
    // fields...
}
```

- `icon` - Nom de l'icône (Lucide icons)
- `color` - Couleur de l'en-tête (hex, rgb, ou nom CSS)

### Types de Champs

| Type | Description |
|------|-------------|
| `string` | Chaîne de caractères |
| `int`, `integer`, `num` | Nombre entier |
| `double`, `float`, `decimal` | Nombre décimal |
| `bool`, `boolean` | Booléen |
| `timestamp`, `datetime`, `date` | Date/heure |

### Décorateurs

| Décorateur | Description | Exemple |
|------------|-------------|---------|
| `@pk` | Clé primaire | `id string @pk` |
| `@fk` | Clé étrangère | `user_id string @fk` |
| `@unique` | Valeur unique | `email string @unique` |
| `@required` | Champ obligatoire | `name string @required` |
| `@default(value)` | Valeur par défaut | `is_active bool @default(true)` |
| `@enum(fields: [...])` | Énumération | `role string @enum(fields: [admin, user])` |

### Définir des Relations

```dsl
// Syntaxe: champ_source -> entité_cible.champ_cible
user_id -> user.id
```

Cela crée une relation de `tweet.user_id` vers `user.id`.

## 📋 Exemples Complets

### Blog System

```dsl
// User entity
user [icon:user, color: #3b82f6] {
    id string @pk
    username string @unique @required
    email string @unique @required
    password_hash string @required
    created_at timestamp @default(now())
}

// Post entity
post [icon:file-text, color: #10b981] {
    id string @pk
    title string @required
    content string @required
    author_id string @fk
    published bool @default(false)
    created_at timestamp @default(now())
}

// Comment entity
comment [icon:message-square, color: #f59e0b] {
    id string @pk
    content string @required
    post_id string @fk
    author_id string @fk
    created_at timestamp @default(now())
}

// Relations
post.author_id -> user.id
comment.post_id -> post.id
comment.author_id -> user.id
```

### E-Commerce

```dsl
customer [icon:user, color: #6366f1] {
    id string @pk
    email string @unique @required
    name string @required
    phone string
    created_at timestamp @default(now())
}

product [icon:package, color: #8b5cf6] {
    id string @pk
    name string @required
    description string
    price double @required
    stock int @default(0)
    is_available bool @default(true)
}

order [icon:shopping-cart, color: #ec4899] {
    id string @pk
    customer_id string @fk
    total_amount double @required
    status string @enum(fields: [pending, paid, shipped, delivered])
    created_at timestamp @default(now())
}

order_item [icon:list, color: #f97316] {
    id string @pk
    order_id string @fk
    product_id string @fk
    quantity int @required
    unit_price double @required
}

// Relations
order.customer_id -> customer.id
order_item.order_id -> order.id
order_item.product_id -> product.id
```

## 🎮 Raccourcis Clavier

| Raccourci | Action |
|-----------|--------|
| `Ctrl/Cmd + S` | Sauvegarder le DSL |
| `Ctrl/Cmd + F` | Formater le DSL |
| `Ctrl/Cmd + E` | Exporter |
| `Molette` | Zoom in/out |
| `Clic + Glisser` | Déplacer une entité |
| `Clic droit + Glisser` | Pan canvas |

## 🔧 Fonctionnalités Avancées

### Export Formats

1. **DSL** - Format natif (texte)
2. **JSON Schema** - Schéma JSON structuré
3. **SQL DDL** - Commandes CREATE TABLE
4. **TypeScript** - Interfaces TypeScript

### Auto-Layout

Cliquez sur le bouton "Auto Layout" pour réorganiser automatiquement les entités selon un algorithme de grille.

### Validation

Cliquez sur "Validate" pour vérifier que votre DSL est correct et identifier les erreurs.

## 🛠️ Technologies Used

- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Monaco Editor** - Code editor (VS Code in browser)
- **HTML5 Canvas** - Diagram rendering
- **Lucide Icons** - Modern icons
- **Clean Architecture** - Maintainable and testable code structure

## 🏗️ Architecture

This project follows Clean Architecture principles with clear separation of concerns:

```
src/
├── domain/                 # Business logic & entities
│   ├── entities/          # Core domain models
│   │   ├── Entity.ts
│   │   ├── Field.ts
│   │   └── Relationship.ts
│   ├── value-objects/     # Value objects
│   │   └── Position.ts
│   └── repositories/      # Repository interfaces
│       ├── IDiagramRepository.ts
│       └── IRenderer.ts
│
├── application/           # Use cases & services
│   ├── use-cases/        # Business operations
│   │   ├── ParseDSLUseCase.ts
│   │   ├── RenderDiagramUseCase.ts
│   │   └── ExportCodeUseCase.ts
│   └── services/         # Application services
│       └── DiagramService.ts
│
├── infrastructure/        # External dependencies
│   ├── parsers/          # DSL parsing
│   │   └── DSLParserAdapter.ts
│   ├── renderers/        # Canvas rendering (includes hierarchical layout at line 133)
│   │   └── CanvasRendererAdapter.ts
│   └── exporters/        # Code generation
│       ├── SQLExporter.ts
│       ├── TypeScriptExporter.ts
│       └── JSONExporter.ts
│
├── presentation/          # UI layer
│   ├── controllers/      # UI coordination
│   │   └── AppController.ts
│   └── factories/        # UI component factories
│       └── MonacoEditorFactory.ts
│
└── main.ts               # Application bootstrap
```

### Key Features of the Architecture:

- **Domain Layer**: Pure business logic with no external dependencies
- **Application Layer**: Orchestrates domain entities through use cases
- **Infrastructure Layer**: Implements technical details (parsers, renderers, exporters)
- **Presentation Layer**: Handles UI interactions and user input

### Hierarchical Layout Algorithm

The most important algorithm is in `CanvasRendererAdapter.ts` at line 133 (`autoLayout()` method):

1. **Graph Construction**: Builds a directed graph from entity relationships
2. **Level Assignment**: Uses BFS to assign hierarchical levels
3. **Barycenter Ordering**: Minimizes edge crossings within levels
4. **Position Calculation**: Computes final x,y coordinates
5. **Auto-fit**: Automatically scales and centers the diagram

## 🚀 Déploiement SAAS

### Option 1: Hébergement Statique

Déployez sur:
- **Vercel** - `vercel deploy`
- **Netlify** - Drag & drop
- **GitHub Pages** - Commit et push
- **AWS S3 + CloudFront** - Hébergement professionnel

### Option 2: Serveur Web

```bash
# Avec Python
python -m http.server 8000

# Avec Node.js
npx http-server

# Avec PHP
php -S localhost:8000
```

### Option 3: Dockeriser

```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
```

## 📈 Roadmap

### Phase 1 (Actuel)
- ✅ Éditeur DSL avec Monaco
- ✅ Rendu de diagrammes en temps réel
- ✅ Drag & drop des entités
- ✅ Zoom et pan
- ✅ Export multi-format

### Phase 2 (Prochain)
- [ ] Sauvegarde dans le cloud
- [ ] Collaboration en temps réel
- [ ] Templates prédéfinis
- [ ] Génération de code (Dart, Python, etc.)
- [ ] Import depuis bases de données existantes

### Phase 3 (Future)
- [ ] Versionning des schémas
- [ ] API REST pour intégration
- [ ] Plugins personnalisés
- [ ] Migration de bases de données
- [ ] Reverse engineering (DB → DSL)

## 🤝 Contribution

Les contributions sont les bienvenues !

1. Fork le projet
2. Créez une branche (`git checkout -b feature/amazing-feature`)
3. Commit vos changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir `LICENSE` pour plus d'informations.

## 🙏 Remerciements

- **Monaco Editor** - Microsoft
- **Lucide Icons** - Communauté Lucide
- **Inspiration** - dbdiagram.io, draw.io

## 📞 Support

Pour toute question ou suggestion:
- Ouvrez une issue sur GitHub
- Email: support@erp-designer.com
- Discord: [Rejoindre notre communauté](#)

---

**Fait avec ❤️ pour les développeurs qui aiment la productivité**

🌟 N'oubliez pas de donner une étoile si ce projet vous aide !
