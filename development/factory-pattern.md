# Factory Pattern Documentation

The Craft Search with Elastic plugin implements the Factory pattern to centralize and standardize the creation of `IndexableElementModel` instances. This reduces code duplication and ensures consistent model creation across the codebase.

## Overview

The `IndexableElementModelFactory` provides a centralized way to create `IndexableElementModel` instances from various data sources, including:

- Raw element data arrays
- Craft Element instances
- Batch operations for multiple elements

## IndexableElementModelFactory

### Namespace

```php
pennebaker\searchwithelastic\factories\IndexableElementModelFactory
```

### Class Definition

```php
class IndexableElementModelFactory
```

### Supported Element Types

The factory supports the following element types out of the box:

| Element Type | Specific Attributes |
|--------------|-------------------|
| `craft\elements\Entry` | `sectionId`, `typeId`, `postDate`, `expiryDate`, `authorId` |
| `craft\elements\Asset` | `volumeId`, `folderId`, `filename`, `kind`, `size`, `width`, `height`, `alt` |
| `craft\elements\Category` | `groupId`, `level`, `lft`, `rgt` |
| `craft\commerce\elements\Product` | (if Commerce plugin installed) |
| `craft\digitalproducts\elements\Product` | (if Digital Products plugin installed) |

### Methods

#### createFromElementData()

Create `IndexableElementModel` from element data array.

```php
public function createFromElementData(string $elementType, array $elementData): IndexableElementModel
```

**Parameters:**
- `$elementType` (string): The element type class name
- `$elementData` (array): Raw element data

**Returns:** `IndexableElementModel` - The created model

**Throws:** 
- `\InvalidArgumentException` - If element type is unsupported or data is invalid

**Required Data Fields:**
- `elementId` (int): Element ID (must be > 0)
- `siteId` (int): Site ID (must be > 0)

**Optional Data Fields:**
- `title` (string): Element title
- `slug` (string): Element slug
- `uri` (string): Element URI
- `status` (string): Element status
- `dateCreated` (string): Creation date in Y-m-d H:i:s format
- `dateUpdated` (string): Update date in Y-m-d H:i:s format
- Element-specific fields based on type

**Example:**
```php
use pennebaker\searchwithelastic\factories\IndexableElementModelFactory;
use craft\elements\Entry;

$factory = new IndexableElementModelFactory();

$elementData = [
    'elementId' => 123,
    'siteId' => 1,
    'title' => 'My Blog Post',
    'slug' => 'my-blog-post',
    'uri' => 'blog/my-blog-post',
    'status' => 'live',
    'dateCreated' => '2025-01-01 12:00:00',
    'dateUpdated' => '2025-01-02 13:30:00',
    'sectionId' => 2,
    'typeId' => 5,
    'authorId' => 1
];

$model = $factory->createFromElementData(Entry::class, $elementData);

echo $model->elementId; // 123
echo $model->title;     // 'My Blog Post'
echo $model->sectionId; // 2
```

#### createFromElement()

Create `IndexableElementModel` from element instance.

```php
public function createFromElement(?ElementInterface $element): IndexableElementModel
```

**Parameters:**
- `$element` (ElementInterface|null): The element instance

**Returns:** `IndexableElementModel` - The created model

**Throws:** 
- `\InvalidArgumentException` - If element is null

**Example:**
```php
use craft\elements\Entry;

$factory = new IndexableElementModelFactory();

// Get an entry from Craft
$entry = Entry::find()->id(123)->one();

// Create model from the entry
$model = $factory->createFromElement($entry);

echo $model->elementId; // 123
echo $model->type;      // craft\elements\Entry
echo $model->title;     // Entry title
```

#### createBatch()

Create multiple `IndexableElementModel` instances efficiently.

```php
public function createBatch(string $elementType, array $elementsData): array
```

**Parameters:**
- `$elementType` (string): The element type class name
- `$elementsData` (array): Array of element data arrays

**Returns:** `IndexableElementModel[]` - Array of created models

**Note:** Invalid element data is silently skipped in batch operations to prevent one bad record from failing the entire batch.

**Example:**
```php
use craft\elements\Entry;

$factory = new IndexableElementModelFactory();

$elementsData = [
    [
        'elementId' => 123,
        'siteId' => 1,
        'title' => 'First Post',
        'sectionId' => 2
    ],
    [
        'elementId' => 124,
        'siteId' => 1,
        'title' => 'Second Post',
        'sectionId' => 2
    ],
    [
        // Invalid data - will be skipped
        'elementId' => -1,
        'siteId' => 1
    ]
];

$models = $factory->createBatch(Entry::class, $elementsData);

echo count($models); // 2 (invalid record was skipped)

foreach ($models as $model) {
    echo $model->title . "\n";
}
// Output:
// First Post
// Second Post
```

#### getSupportedElementTypes()

Get supported element types.

```php
public function getSupportedElementTypes(): array
```

**Returns:** `array` - Array of supported element type class names

**Example:**
```php
$factory = new IndexableElementModelFactory();
$supportedTypes = $factory->getSupportedElementTypes();

foreach ($supportedTypes as $elementType) {
    echo "Supported: " . $elementType . "\n";
}
// Output:
// Supported: craft\elements\Entry
// Supported: craft\elements\Asset
// Supported: craft\elements\Category
// Supported: craft\commerce\elements\Product (if installed)
// Supported: craft\digitalproducts\elements\Product (if installed)
```

#### isElementTypeSupported()

Check if element type is supported.

```php
public function isElementTypeSupported(string $elementType): bool
```

**Parameters:**
- `$elementType` (string): The element type class name

**Returns:** `bool` - True if supported

**Example:**
```php
$factory = new IndexableElementModelFactory();

if ($factory->isElementTypeSupported(\craft\elements\Entry::class)) {
    echo "Entries are supported";
}

if (!$factory->isElementTypeSupported('CustomElement')) {
    echo "CustomElement is not supported";
}
```

#### validateElementData()

Validate element data array.

```php
public function validateElementData(array $elementData): bool
```

**Parameters:**
- `$elementData` (array): The element data to validate

**Returns:** `bool` - True if valid

**Validation Rules:**
- `elementId` must be present and be a positive integer
- `siteId` must be present and be a positive integer

**Example:**
```php
$factory = new IndexableElementModelFactory();

$validData = [
    'elementId' => 123,
    'siteId' => 1,
    'title' => 'Test'
];

$invalidData = [
    'elementId' => -1, // Invalid: negative ID
    'siteId' => 1
];

echo $factory->validateElementData($validData) ? 'Valid' : 'Invalid';   // Valid
echo $factory->validateElementData($invalidData) ? 'Valid' : 'Invalid'; // Invalid
```

## Usage Patterns

### Service Integration

The factory is typically used within services to create models consistently:

```php
use pennebaker\searchwithelastic\factories\IndexableElementModelFactory;

class ModelService extends Component
{
    private IndexableElementModelFactory $factory;
    
    public function __construct()
    {
        $this->factory = new IndexableElementModelFactory();
    }
    
    public function createIndexableElementModel(Element $element, int $siteId): IndexableElementModel
    {
        // Use factory to ensure consistent creation
        return $this->factory->createFromElement($element);
    }
}
```

### Batch Processing

For processing large numbers of elements efficiently:

```php
use pennebaker\searchwithelastic\factories\IndexableElementModelFactory;

$factory = new IndexableElementModelFactory();

// Get raw data from database or API
$elementsData = $this->fetchElementsDataFromDatabase();

// Create models in batch
$models = $factory->createBatch(\craft\elements\Entry::class, $elementsData);

// Process models
foreach ($models as $model) {
    $this->indexModel($model);
}
```

### Element Type Detection

For dynamic element processing:

```php
$factory = new IndexableElementModelFactory();
$supportedTypes = $factory->getSupportedElementTypes();

foreach ($supportedTypes as $elementType) {
    if ($factory->isElementTypeSupported($elementType)) {
        // Process elements of this type
        $elements = $elementType::find()->all();
        
        foreach ($elements as $element) {
            $model = $factory->createFromElement($element);
            // ... process model
        }
    }
}
```

## Advanced Usage

### Custom Element Type Support

While the factory has built-in support for core Craft elements and common plugins, you can extend support by creating a custom factory:

```php
class ExtendedIndexableElementModelFactory extends IndexableElementModelFactory
{
    private const CUSTOM_ELEMENT_TYPES = [
        'MyPlugin\elements\CustomElement' => [
            'customField1', 'customField2'
        ]
    ];
    
    public function getSupportedElementTypes(): array
    {
        return array_merge(
            parent::getSupportedElementTypes(),
            array_keys(self::CUSTOM_ELEMENT_TYPES)
        );
    }
    
    // Override methods to handle custom types
}
```

### Validation Customization

For stricter validation requirements:

```php
class StrictIndexableElementModelFactory extends IndexableElementModelFactory
{
    public function validateElementData(array $elementData): bool
    {
        // Call parent validation first
        if (!parent::validateElementData($elementData)) {
            return false;
        }
        
        // Additional strict validation
        if (empty($elementData['title'])) {
            return false;
        }
        
        if (empty($elementData['status'])) {
            return false;
        }
        
        return true;
    }
}
```

### Error Handling

The factory provides detailed error messages for troubleshooting:

```php
$factory = new IndexableElementModelFactory();

try {
    $model = $factory->createFromElementData('UnsupportedElement', $data);
} catch (\InvalidArgumentException $e) {
    echo "Factory error: " . $e->getMessage();
    // Factory error: Unsupported element type: UnsupportedElement
}

try {
    $model = $factory->createFromElement(null);
} catch (\InvalidArgumentException $e) {
    echo "Factory error: " . $e->getMessage();
    // Factory error: Element cannot be null
}
```

## Performance Considerations

### Memory Usage

The factory is lightweight and can be instantiated as needed. For batch operations, consider processing in chunks:

```php
$factory = new IndexableElementModelFactory();
$batchSize = 100;
$total = count($allElementsData);

for ($offset = 0; $offset < $total; $offset += $batchSize) {
    $batch = array_slice($allElementsData, $offset, $batchSize);
    $models = $factory->createBatch(\craft\elements\Entry::class, $batch);
    
    // Process batch
    foreach ($models as $model) {
        $this->processModel($model);
    }
    
    // Clear memory
    unset($models, $batch);
}
```

### Validation Performance

The `validateElementData()` method performs minimal validation by design. For high-throughput scenarios, you can skip validation if you're certain of data quality:

```php
// Skip validation for trusted data sources
$model = new IndexableElementModel();
$model->elementId = $trustedData['elementId'];
$model->siteId = $trustedData['siteId'];
// ... set other properties directly
```

## Testing

### Unit Testing Factory Methods

```php
use pennebaker\searchwithelastic\factories\IndexableElementModelFactory;
use craft\elements\Entry;

class IndexableElementModelFactoryTest extends TestCase
{
    private IndexableElementModelFactory $factory;
    
    protected function setUp(): void
    {
        $this->factory = new IndexableElementModelFactory();
    }
    
    public function testCreateFromElementData(): void
    {
        $elementData = [
            'elementId' => 123,
            'siteId' => 1,
            'title' => 'Test Entry'
        ];
        
        $model = $this->factory->createFromElementData(Entry::class, $elementData);
        
        $this->assertEquals(123, $model->elementId);
        $this->assertEquals(1, $model->siteId);
        $this->assertEquals('Test Entry', $model->title);
        $this->assertEquals(Entry::class, $model->type);
    }
    
    public function testValidateElementData(): void
    {
        $validData = ['elementId' => 123, 'siteId' => 1];
        $invalidData = ['elementId' => -1, 'siteId' => 1];
        
        $this->assertTrue($this->factory->validateElementData($validData));
        $this->assertFalse($this->factory->validateElementData($invalidData));
    }
}
```

## Migration Guide

### From Direct Model Creation

Before (manual model creation):
```php
$model = new IndexableElementModel();
$model->elementId = $element->id;
$model->siteId = $element->siteId;
$model->type = get_class($element);
$model->title = $element->title;
// ... manual property setting
```

After (using factory):
```php
$factory = new IndexableElementModelFactory();
$model = $factory->createFromElement($element);
```

### From Service Methods

Before (service creating models):
```php
class ModelService extends Component
{
    public function createIndexableElementModel(Element $element, int $siteId): IndexableElementModel
    {
        $model = new IndexableElementModel();
        // ... complex creation logic
        return $model;
    }
}
```

After (service using factory):
```php
class ModelService extends Component
{
    private IndexableElementModelFactory $factory;
    
    public function __construct()
    {
        $this->factory = new IndexableElementModelFactory();
    }
    
    public function createIndexableElementModel(Element $element, int $siteId): IndexableElementModel
    {
        return $this->factory->createFromElement($element);
    }
}
```

## Best Practices

1. **Single Responsibility**: Use the factory only for model creation, not for business logic
2. **Validation**: Always validate data when creating from untrusted sources
3. **Error Handling**: Catch and handle `InvalidArgumentException` appropriately
4. **Batch Processing**: Use `createBatch()` for multiple elements to improve performance
5. **Memory Management**: Clear large arrays after processing to prevent memory leaks
6. **Type Safety**: Use proper type hints and validate element types before processing
7. **Testing**: Test factory methods with various data combinations to ensure reliability

The factory pattern centralizes model creation logic, making the codebase more maintainable and ensuring consistent behavior across all components that need to create `IndexableElementModel` instances.