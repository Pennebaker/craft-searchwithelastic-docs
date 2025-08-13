# Architecture Overview

The Craft Search with Elastic plugin architecture is designed for maintainability, minimal code duplication, and scalability. This document outlines the architectural patterns and design principles.

## Architectural Principles

### 1. Single Responsibility Principle (SRP)
Each class and trait has a single, well-defined responsibility:
- **Services**: Handle specific business logic domains
- **Traits**: Provide reusable functionality
- **Factories**: Create and configure objects
- **Events**: Communicate state changes
- **Models**: Represent data structures

### 2. Don't Repeat Yourself (DRY)
Common functionality is extracted into reusable components:
- **Traits**: Eliminate ~330 lines of duplicated code
- **Generic Methods**: Single implementation for multiple element types
- **Factory Pattern**: Centralized object creation

### 3. Open/Closed Principle (OCP)
The architecture supports extension without modification:
- **Event System**: Extensible through event listeners
- **Generic Methods**: Support element types without code changes
- **Trait System**: Add functionality through composition

### 4. Dependency Inversion Principle (DIP)
High-level modules don't depend on low-level modules:
- **Service Layer**: Abstract business logic from implementation details
- **Factory Pattern**: Abstract object creation from usage
- **Event System**: Decouple components through messaging

## Core Components

### Service Layer

The service layer provides the main business logic APIs:

```
ElasticsearchService
├── Connection management
├── Search operations
├── Index status checking
└── Statistics gathering

ElementIndexerService
├── Element indexing
├── Element removal
├── Content extraction
└── Index result management

IndexManagementService
├── Index creation/deletion
├── Index naming
├── Bulk operations
└── Index lifecycle management

QueryService (Refactored)
├── Generic query creation
├── Element type management
├── Query configuration
└── Multi-type operations

ModelService
├── Model creation
├── Factory integration
└── Model validation

RecordService
├── Record persistence
├── Element tracking
└── Status management

ReindexQueueManagementService
├── Queue management
├── Job tracking
├── Batch operations
└── Progress monitoring
```

### Trait System

Traits provide reusable functionality across multiple classes:

```
FrontendFetchingTrait (~150 lines saved)
├── Frontend fetch configuration
├── Multi-site handling
├── Type exclusion logic
└── Settings integration

StatusFilteringTrait (~60 lines saved)
├── Status filtering
├── Convenient filter methods
├── Status validation
└── Query building

PriceFilteringTrait (~80 lines saved)
├── Price range filtering
├── Price validation
├── Convenience methods
└── Commerce integration

ErrorHandlingTrait (~40 lines saved)
├── Exception handling
├── Logging management
├── User messaging
└── Safe execution
```

### Factory Pattern

The factory pattern centralizes object creation:

```
IndexableElementModelFactory
├── Element data processing
├── Type-specific handling
├── Batch operations
├── Data validation
└── Error handling
```

### Event System

Events are organized by functional area:

```
events/
├── connection/
│   ├── ConnectionTestEvent
│   └── ErrorEvent
├── indexing/
│   ├── ContentExtractionEvent
│   ├── ElementContentEvent
│   ├── ExtraFieldsEvent
│   ├── IndexElementEvent
│   ├── IndexManagementEvent
│   ├── ModelEvent
│   ├── QueueEvent
│   └── RecordEvent
└── search/
    ├── QueryEvent
    ├── ResultFormattingEvent
    └── SearchEvent
```

## Refactoring Impact

### Code Reduction

The refactoring eliminated approximately **330 lines** of duplicated code:

| Component | Lines Saved | Benefit |
|-----------|-------------|---------|
| FrontendFetchingTrait | ~150 | Consistent frontend fetching logic |
| PriceFilteringTrait | ~80 | Centralized price filtering |
| StatusFilteringTrait | ~60 | Unified status handling |
| ErrorHandlingTrait | ~40 | Consistent error management |

### Generic Methods

The generic methods in `QueryService` provide unified element handling:

**Element-specific approach:**
```php
// Separate method for each element type
public function getIndexableEntryQuery(int $siteId): IndexableEntryQuery
public function getIndexableAssetQuery(int $siteId): IndexableAssetQuery  
public function getIndexableCategoryQuery(int $siteId): IndexableCategoryQuery
// ... more specific methods
```

**Generic/Factory approach:**
```php
// Single generic method handles all types
public function getIndexableElementQuery(string $elementType, int $siteId): IndexableElementQuery
public function getElementQuery(string $elementType, int $siteId): mixed
```

### Factory Integration

Model creation is centralized and consistent:

**Element-specific approach:**
```php
// Manual model creation in multiple places
$model = new IndexableElementModel();
$model->elementId = $element->id;
$model->siteId = $element->siteId;
// ... repetitive property setting
```

**Generic/Factory approach:**
```php
// Centralized creation through factory
$factory = new IndexableElementModelFactory();
$model = $factory->createFromElement($element);
```

## Data Flow

### Indexing Flow

```
Element Change
    ↓
Event Listener
    ↓
ElementIndexerService
    ↓ (uses)
ModelService + Factory
    ↓ (creates)
IndexableElementModel
    ↓
ElasticsearchService
    ↓
Elasticsearch Index
```

### Search Flow

```
Search Request
    ↓
ElasticsearchService
    ↓ (uses)
QueryService
    ↓ (creates)
Query Objects (with Traits)
    ↓
Elasticsearch Query
    ↓
Search Results
    ↓
Result Formatting
```

### Query Building Flow

```
Query Request
    ↓
QueryService.getElementQuery()
    ↓ (determines)
Element Type → Query Class Mapping
    ↓ (creates)
Specific Query Class
    ↓ (applies)
Traits (Frontend, Status, Price)
    ↓ (triggers)
Query Events
    ↓
Configured Query Object
```

## Performance Optimizations

### Memory Usage

1. **Reduced Object Count**: Generic methods reduce the number of specialized objects
2. **Trait Composition**: Functionality is loaded only when needed
3. **Factory Pattern**: Efficient object creation with minimal overhead
4. **Batch Operations**: Process multiple items efficiently

### Execution Speed

1. **Less Code Paths**: Generic methods reduce branching
2. **Cached Mappings**: Element type mappings are cached
3. **Event Optimization**: Events only fire when handlers are registered
4. **Safe Execution**: Error handling doesn't impact normal flow

### Database Queries

1. **Query Reuse**: Generic queries can be reused across element types
2. **Batch Processing**: Factory supports batch model creation
3. **Efficient Filtering**: Traits provide optimized filtering logic

## Extension Points

### Custom Element Types

Add support for custom element types:

```php
// In your plugin's service
public function addCustomElementSupport(): void
{
    // Extend the query service mapping
    Event::on(
        QueryService::class,
        QueryService::EVENT_BEFORE_BUILD_QUERY,
        function(QueryEvent $event) {
            if ($event->elementType === MyCustomElement::class) {
                $event->query = new MyCustomElementQuery();
            }
        }
    );
}
```

### Custom Traits

Create custom traits for specialized functionality:

```php
trait CustomFilteringTrait
{
    protected $customFilter;
    
    public function customFilter($value): self
    {
        $this->customFilter = $value;
        return $this;
    }
}

// Use in query classes
class MyCustomQuery extends IndexableElementQuery
{
    use FrontendFetchingTrait;
    use CustomFilteringTrait;
}
```

### Service Extension

Extend services with custom functionality:

```php
class ExtendedElasticsearchService extends ElasticsearchService
{
    use CustomAnalyticsTrait;
    
    public function performCustomSearch(array $criteria): array
    {
        // Custom search implementation
        return $this->safeExecute(
            fn() => $this->executeCustomQuery($criteria),
            'Custom search operation',
            []
        );
    }
}
```

## Testing Strategy

### Unit Testing

Each component can be tested in isolation:

```php
// Test traits independently
class FrontendFetchingTraitTest extends TestCase
{
    use FrontendFetchingTrait;
    
    public function testFrontendFetchConfiguration(): void
    {
        $this->frontendFetch(true);
        $this->assertTrue($this->isFrontendFetchEnabled());
    }
}

// Test factory methods
class IndexableElementModelFactoryTest extends TestCase
{
    public function testModelCreation(): void
    {
        $factory = new IndexableElementModelFactory();
        $model = $factory->createFromElement($element);
        
        $this->assertInstanceOf(IndexableElementModel::class, $model);
    }
}
```

### Integration Testing

Test component interactions:

```php
class RefactoredComponentsIntegrationTest extends TestCase
{
    public function testGenericQueryCreation(): void
    {
        $queryService = new QueryService();
        $query = $queryService->getElementQuery(Entry::class, 1);
        
        $this->assertInstanceOf(IndexableEntryQuery::class, $query);
        $this->assertTrue(method_exists($query, 'frontendFetch'));
    }
}
```

## Migration Compatibility

### Backward Compatibility

The refactoring maintains backward compatibility:

1. **Legacy Methods**: Existing specific methods still work
2. **API Consistency**: Method signatures remain unchanged
3. **Event Compatibility**: Existing event handlers continue to work
4. **Service Access**: Services are still accessible through the same properties

### Migration Path

For developers wanting to adopt the new patterns:

1. **Phase 1**: Update to use generic methods
2. **Phase 2**: Adopt factory pattern for model creation  
3. **Phase 3**: Implement error handling traits in custom services
4. **Phase 4**: Add custom traits for specialized functionality

## Benefits

### For Plugin Developers

1. **Reduced Code**: Less boilerplate code to write and maintain
2. **Consistency**: Uniform behavior across all components
3. **Extensibility**: Easy to add custom functionality
4. **Testing**: Simpler to test individual components

### For Site Developers

1. **Performance**: Faster execution and lower memory usage
2. **Reliability**: Consistent error handling and logging
3. **Flexibility**: More configuration options through generic methods
4. **Compatibility**: Existing code continues to work

### For Maintainers

1. **Maintainability**: Changes in one place affect all implementations
2. **Debugging**: Centralized error handling and logging
3. **Documentation**: Clear separation of concerns
4. **Evolution**: Easy to add new features and element types

## Future Considerations

### Planned Enhancements

1. **Additional Traits**: More specialized functionality traits
2. **Enhanced Factory**: Support for more complex object creation patterns
3. **Event Optimization**: More granular event system
4. **Performance Monitoring**: Built-in performance tracking

### Extension Possibilities

1. **Plugin Integration**: Better integration with other Craft plugins
2. **Custom Elements**: Enhanced support for custom element types  
3. **Advanced Querying**: More sophisticated query building capabilities
4. **Caching Layer**: Advanced caching for improved performance

The new architecture provides a solid foundation for future development while maintaining compatibility with existing implementations.