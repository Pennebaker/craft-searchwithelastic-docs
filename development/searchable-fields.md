# Searchable Fields Indexer

The SearchableFieldsIndexer service extracts searchable field data from Craft elements for Elasticsearch indexing.

## Overview

The `SearchableFieldsIndexer` service leverages Craft CMS's native searchable field settings to automatically extract and transform field content for indexing. It processes fields marked as searchable in the Craft field settings and handles various field types including Matrix, Neo, SuperTable, and standard Craft fields.

## Basic Usage

```php
use pennebaker\searchwithelastic\SearchWithElastic;

$plugin = SearchWithElastic::getInstance();
$indexer = $plugin->searchableFieldsIndexer;

// Extract searchable fields from an element
$element = Entry::find()->id(123)->one();
$searchableData = $indexer->extractSearchableFields($element);
```

## Events

### EVENT_BEFORE_EXTRACT_FIELDS

Triggered before extracting searchable fields from an element.

```php
use yii\base\Event;
use pennebaker\searchwithelastic\services\SearchableFieldsIndexer;
use pennebaker\searchwithelastic\events\SearchableFieldExtractionEvent;

Event::on(
    SearchableFieldsIndexer::class,
    SearchableFieldsIndexer::EVENT_BEFORE_EXTRACT_FIELDS,
    function(SearchableFieldExtractionEvent $event) {
        // Access the element being processed
        $element = $event->element;
        
        // Modify extraction config
        $event->config['customOption'] = true;
        
        // Prevent extraction by setting isValid to false
        if ($element->section->handle === 'privateContent') {
            $event->isValid = false;
        }
    }
);
```

### EVENT_AFTER_EXTRACT_FIELDS

Triggered after extracting searchable fields from an element.

```php
Event::on(
    SearchableFieldsIndexer::class,
    SearchableFieldsIndexer::EVENT_AFTER_EXTRACT_FIELDS,
    function(SearchableFieldExtractionEvent $event) {
        // Modify extracted fields
        $event->fields['customField'] = [
            'value' => 'custom value',
            'keywords' => 'searchable keywords',
            'searchable' => true
        ];
    }
);
```

### EVENT_TRANSFORM_FIELD_DATA

Triggered when transforming field data for Elasticsearch.

```php
use pennebaker\searchwithelastic\events\FieldDataTransformEvent;

Event::on(
    SearchableFieldsIndexer::class,
    SearchableFieldsIndexer::EVENT_TRANSFORM_FIELD_DATA,
    function(FieldDataTransformEvent $event) {
        // Access field and element
        $field = $event->field;
        $element = $event->element;
        
        // Modify transformed data
        if ($field->handle === 'specialField') {
            $event->transformedData['custom_property'] = 'custom value';
        }
    }
);
```

## Field Data Structure

Each extracted field contains:

```php
[
    'keywords' => 'searchable text content',
    'field_type' => 'craft\\fields\\PlainText',
    'field_handle' => 'fieldHandle',
    'field_name' => 'Field Name',
    'searchable' => true,
    'structured_type' => 'simple', // or 'matrix', 'entries', etc.
    'value' => // Field-specific structured data
]
```

## Supported Field Types

### Text Fields
- Plain Text
- Redactor/CKEditor (HTML stripped for keywords)
- URL fields

### Relational Fields
- **Assets**: Extracts id, title, filename, url, dimensions, alt text
- **Entries**: Extracts id, title, slug, uri, section/type handles
- **Categories**: Extracts id, title, slug, level, group handle
- **Tags**: Extracts id, title, slug, group handle
- **Users**: Extracts id, username, email, full name

### Structure Fields
- **Matrix**: Recursively processes searchable fields in blocks
- **Neo**: Recursively processes searchable fields with level support
- **SuperTable**: Processes searchable fields in table rows

### Special Fields
- **Table**: Extracts cell values (skips DateTime objects)
- **TableMaker**: Extracts column headings and row data
- **Country**: Extracts country code and label
- **Date/Time**: Formats as ISO 8601 string
- **Money**: Extracts amount, currency, and formatted value

## Matrix and Nested Fields

Matrix, Neo, and SuperTable fields are automatically traversed to extract searchable sub-fields:

```php
// Matrix field structure in extracted data
[
    'handle' => 'contentBuilder',
    'structured_type' => 'matrix',
    'value' => [
        [
            'id' => 123,
            'typeHandle' => 'textBlock',
            'fields' => [
                'heading' => [...], // If searchable
                'body' => [...]     // If searchable
            ]
        ]
    ]
]
```

## Field Mapping for Elasticsearch

The service provides mapping configuration for different field types:

```php
$mapping = $indexer->getFieldMapping($field);
```

Mappings include:
- Text fields with standard analyzer
- Nested mappings for relational fields
- Object mappings for table fields
- Keyword mappings for identifiers

## Testing Tool

A console command is available for testing field extraction:

```bash
# Test extraction for a specific element
php craft searchwithelastic/test-searchable-fields/extract --elementId=123

# Compare with frontend fetching
php craft searchwithelastic/test-searchable-fields/compare --elementId=123

# Show combined output
php craft searchwithelastic/test-searchable-fields/extract --showCombined=1
```