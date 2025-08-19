# Field Mapping Helpers

The `ElasticsearchHelper` class provides constants and utilities for working with Elasticsearch field mappings in your custom code.

## Field Mapping Constants

Use these predefined constants for consistent field mappings across your application:

### Text Fields

#### Text with Keyword Multi-field
```php
use pennebaker\searchwithelastic\helpers\ElasticsearchHelper;

// Allows both full-text search and exact matching/aggregations
$mapping = ElasticsearchHelper::TEXT_WITH_KEYWORD_MAPPING;
```

**Resulting mapping:**
```json
{
    "type": "text",
    "fields": {
        "keyword": {
            "type": "keyword",
            "ignore_above": 256
        }
    }
}
```

**Use cases:**
- Fields that need both full-text search and exact matching
- Fields used in aggregations or sorting
- Title fields, category names, tags

#### Stored Text Field
```php
$mapping = ElasticsearchHelper::STORED_TEXT_FIELD_MAPPING;
```

**Resulting mapping:**
```json
{
    "type": "text",
    "store": true
}
```

**Use cases:**
- Content fields that need to be retrieved separately
- Fields used in highlighting
- Large text fields that aren't always needed

### Date Fields

```php
$mapping = ElasticsearchHelper::DATE_FIELD_MAPPING;
```

**Resulting mapping:**
```json
{
    "type": "date",
    "format": "yyyy-MM-dd HH:mm:ss",
    "store": true
}
```

**Use cases:**
- Date/time fields
- Timestamps
- Event dates

### Boolean Fields

```php
$mapping = ElasticsearchHelper::BOOLEAN_FIELD_MAPPING;
```

**Resulting mapping:**
```json
{
    "type": "boolean",
    "store": true
}
```

**Use cases:**
- Feature flags
- Published/unpublished status
- Any true/false fields

### Keyword Fields

```php
$mapping = ElasticsearchHelper::KEYWORD_FIELD_MAPPING;
```

**Resulting mapping:**
```json
{
    "type": "keyword",
    "store": true
}
```

**Use cases:**
- IDs and codes
- Exact match fields
- Fields used for filtering and aggregations
- URLs, email addresses

## Usage Examples

### Custom Field Configuration

```php
use pennebaker\searchwithelastic\helpers\ElasticsearchHelper;

// In your custom module or plugin
$myFields = [
    'productTitle' => [
        'mapping' => ElasticsearchHelper::TEXT_WITH_KEYWORD_MAPPING,
        'value' => function($element) {
            return $element->title;
        }
    ],
    'isAvailable' => [
        'mapping' => ElasticsearchHelper::BOOLEAN_FIELD_MAPPING,
        'value' => function($element) {
            return $element->stock > 0;
        }
    ],
    'publishDate' => [
        'mapping' => ElasticsearchHelper::DATE_FIELD_MAPPING,
        'value' => function($element) {
            return $element->postDate;
        }
    ],
    'sku' => [
        'mapping' => ElasticsearchHelper::KEYWORD_FIELD_MAPPING,
        'value' => function($element) {
            return $element->sku;
        }
    ]
];
```

### Extending Field Mappings

```php
use pennebaker\searchwithelastic\helpers\ElasticsearchHelper;
use pennebaker\searchwithelastic\events\RegisterExtraFieldsEvent;

Event::on(
    IndexableElementModel::class,
    IndexableElementModel::EVENT_REGISTER_EXTRA_FIELDS,
    function(RegisterExtraFieldsEvent $event) {
        // Use the predefined constants for consistent mappings
        $event->extraFields['customStatus'] = [
            'mapping' => ElasticsearchHelper::KEYWORD_FIELD_MAPPING,
            'highlighter' => (object)[],
            'value' => function($element) {
                return $element->getCustomStatus();
            }
        ];
        
        $event->extraFields['description'] = [
            'mapping' => ElasticsearchHelper::TEXT_WITH_KEYWORD_MAPPING,
            'highlighter' => [
                'fragment_size' => 150,
                'number_of_fragments' => 3
            ],
            'value' => function($element) {
                return $element->description;
            }
        ];
    }
);
```

## Helper Methods

### Field Value Accessor

Creates a field configuration that safely extracts values from Craft fields:

```php
use pennebaker\searchwithelastic\helpers\ElasticsearchHelper;

// Automatically handles field value extraction
$fieldConfig = ElasticsearchHelper::createFieldValueAccessor('myCustomField');

// With custom mapping
$fieldConfig = ElasticsearchHelper::createFieldValueAccessor(
    'myCustomField', 
    ElasticsearchHelper::TEXT_WITH_KEYWORD_MAPPING
);
```

This helper:
- Safely extracts values from field objects
- Handles arrays of field values
- Converts objects to appropriate scalar values
- Returns null for invalid or missing fields

### Order Field

Creates a field for sorting based on element position:

```php
$orderField = ElasticsearchHelper::createOrderField();

// With custom mapping
$orderField = ElasticsearchHelper::createOrderField(
    ElasticsearchHelper::KEYWORD_FIELD_MAPPING
);
```

### Image Field

Creates a nested field configuration for image assets:

```php
// Basic image field
$imageField = ElasticsearchHelper::createImageField('heroImage');

// With additional subfields
$imageField = ElasticsearchHelper::createImageField('heroImage', [
    'altText' => true,
    'caption' => true
]);
```

### Asset Field

Creates a nested field configuration for file assets:

```php
$assetField = ElasticsearchHelper::createAssetField('downloadFile');
```

## Best Practices

### Choosing the Right Mapping

1. **Use `TEXT_WITH_KEYWORD_MAPPING` when:**
   - You need both search and exact matching
   - The field is used in aggregations
   - You want to support both analyzed and not-analyzed queries

2. **Use `KEYWORD_FIELD_MAPPING` when:**
   - You only need exact matching
   - The field contains IDs, codes, or enums
   - You're using the field for filtering or sorting

3. **Use `STORED_TEXT_FIELD_MAPPING` when:**
   - The field contains large text content
   - You need to retrieve the field separately
   - You're using highlighting on the field

4. **Always store fields (`store: true`) when:**
   - You need to retrieve specific fields without the entire document
   - You're using highlighting
   - The field is frequently accessed independently

### Performance Considerations

- Use `keyword` type for fields that don't need text analysis
- Limit the `ignore_above` setting for keyword fields to prevent indexing very long strings
- Consider using `index: false` for fields that are only retrieved, never searched
- Use nested types sparingly as they impact performance

## Migration Guide

If you're updating from hardcoded mappings to use the new constants:

```php
// Before
$mapping = [
    'type' => 'text',
    'store' => true
];

// After
$mapping = ElasticsearchHelper::STORED_TEXT_FIELD_MAPPING;

// Before
$mapping = [
    'type' => 'keyword',
    'store' => true
];

// After
$mapping = ElasticsearchHelper::KEYWORD_FIELD_MAPPING;
```

## See Also

- [Events Reference](./events.md) - Available events for customization
- [Extending the Plugin](./extending.md) - Extension points and customization
- [Services API](./services-api.md) - Available services and methods