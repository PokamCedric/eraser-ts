# System Architecture

This document describes the overall system architecture of the ERP Visual Designer application.

## High-Level System Architecture

```mermaid
graph TB
    subgraph "Presentation Layer"
        UI[User Interface<br/>HTML/CSS/JavaScript]
        Controllers[Controllers<br/>AppController, EditorController, etc.]
        Factories[Factories<br/>MonacoEditorFactory]
    end

    subgraph "Application Layer"
        Services[Application Services<br/>DiagramService]
        UseCases[Use Cases<br/>ParseDSLUseCase, ExportDSLUseCase]
        Registry[Strategy Registry<br/>ExportFormatRegistry]
    end

    subgraph "Domain Layer"
        Entities[Domain Entities<br/>Entity, Relationship, Field]
        ValueObjects[Value Objects<br/>Position]
        DomainServices[Domain Services<br/>Layout Algorithms]
        Interfaces[Repository Interfaces<br/>IRenderer, IDiagramRepository]
    end

    subgraph "Infrastructure Layer"
        Renderers[Renderers<br/>CanvasRendererAdapter, SVGRenderer]
        Parsers[Parsers<br/>DSLParserAdapter + Sub-parsers]
        Exporters[Exporters<br/>SQLExporter, TypeScriptExporter]
        Utils[Utilities<br/>Logger, TypeMapper]
    end

    subgraph "Data Layer"
        Models[Data Models<br/>utils, default_data]
    end

    UI --> Controllers
    Controllers --> Services
    Controllers --> Factories
    Services --> UseCases
    Services --> Interfaces
    UseCases --> DomainServices
    UseCases --> Entities
    DomainServices --> Entities
    DomainServices --> ValueObjects
    Interfaces -.implemented by.-> Renderers
    Interfaces -.implemented by.-> Parsers
    Renderers --> Entities
    Parsers --> Entities
    Services --> Registry
    Registry --> Exporters
    Exporters --> Entities
    Models --> Entities

    style Entities fill:#e1f5ff
    style Interfaces fill:#fff3e0
    style DomainServices fill:#f3e5f5
    style Controllers fill:#e8f5e9
    style Services fill:#e8f5e9
    style Renderers fill:#fce4ec
    style Parsers fill:#fce4ec
```

## Clean Architecture Layers

```mermaid
graph LR
    subgraph "Outer Circle - Frameworks & Drivers"
        A[UI<br/>Monaco Editor<br/>Canvas API]
    end

    subgraph "Interface Adapters"
        B[Controllers<br/>Presenters<br/>Gateways]
    end

    subgraph "Application Business Rules"
        C[Use Cases<br/>Application Services]
    end

    subgraph "Inner Circle - Enterprise Business Rules"
        D[Entities<br/>Domain Services<br/>Value Objects]
    end

    A --> B
    B --> C
    C --> D

    style D fill:#4CAF50,color:#fff
    style C fill:#8BC34A,color:#fff
    style B fill:#CDDC39,color:#000
    style A fill:#FFEB3B,color:#000
```

## Dependency Flow

The architecture follows the **Dependency Inversion Principle** where:
- Outer layers depend on inner layers
- Inner layers are independent of outer layers
- All dependencies point inward toward the domain

```mermaid
flowchart TD
    UI[Presentation Layer] -->|depends on| App[Application Layer]
    App -->|depends on| Domain[Domain Layer]
    Infra[Infrastructure Layer] -.implements.-> Domain

    style Domain fill:#4CAF50,color:#fff
    style App fill:#8BC34A,color:#fff
    style UI fill:#CDDC39,color:#000
    style Infra fill:#FF9800,color:#fff
```

## Key Architectural Principles Applied

### 1. Clean Architecture
- **Separation of Concerns**: Each layer has distinct responsibilities
- **Dependency Rule**: Dependencies point inward
- **Framework Independence**: Core business logic independent of frameworks

### 2. SOLID Principles (90% Score)
- ✅ **Single Responsibility**: Each class has one reason to change
- ✅ **Open/Closed**: Open for extension, closed for modification
- ✅ **Liskov Substitution**: Subtypes are substitutable (documented)
- ✅ **Interface Segregation**: Focused, client-specific interfaces
- ✅ **Dependency Inversion**: Depend on abstractions, not concretions

### 3. Design Patterns
- **Strategy Pattern**: ExportFormatRegistry, TypeMapper
- **Factory Pattern**: MonacoEditorFactory
- **Adapter Pattern**: CanvasRendererAdapter, DSLParserAdapter
- **Orchestrator Pattern**: AppController, LayerClassificationOrchestrator
- **Singleton Pattern**: Logger

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Controller
    participant Service
    participant UseCase
    participant Domain
    participant Infra

    User->>UI: Edit DSL
    UI->>Controller: onChange event
    Controller->>Service: parseDSL(dsl)
    Service->>UseCase: execute(dsl)
    UseCase->>Infra: parser.parseDSL(dsl)
    Infra->>Domain: create Entities
    Domain-->>UseCase: entities[]
    UseCase-->>Service: ParseResult
    Service->>Infra: renderer.setData()
    Service->>Infra: renderer.render()
    Infra->>UI: Update Canvas
    UI-->>User: Visual Feedback
```

## Benefits of This Architecture

1. **Testability**: Easy to mock dependencies and test in isolation
2. **Maintainability**: Clear structure makes code easy to understand and modify
3. **Scalability**: Easy to add new features without modifying existing code
4. **Flexibility**: Easy to swap implementations (e.g., Canvas ↔ SVG renderer)
5. **Reusability**: Domain logic can be reused across different interfaces
6. **Independence**: Business logic independent of UI, database, or frameworks
