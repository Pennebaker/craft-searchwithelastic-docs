# Search Templates Guide

Understanding and working with Elasticsearch search templates in the Search With Elastic plugin.

## Overview

The `SearchTemplates.php` file contains pre-defined Elasticsearch search templates using Mustache syntax. These templates provide structured query patterns for different search scenarios.

## Critical Fix: Aggregation Template

### The Problem

The original aggregation template had a critical issue where it set `size: 0`, which meant:
- Only aggregations were returned
- No actual search results (documents) were included
- Users couldn't display both facets AND search results together

### The Solution

The aggregation template was updated to use dynamic sizing with Mustache conditionals:

```php
// OLD (Broken - returns only aggregations)
'size' => 0,

// NEW (Fixed - returns both documents and aggregations)
'size' => '{{#size}}{{size}}{{/size}}{{^size}}20{{/size}}',
```

This change allows:
- Custom size via parameters: `size: 30`
- Default of 20 results when size not specified
- Both documents AND aggregations in the response

## Template Structure

### Basic Search Template

```php
public function getBasicSearchTemplate()
{
    return [
        'id' => 'basic-search',
        'source' => [
            'query' => [
                'multi_match' => [
                    'query' => '{{query_text}}',
                    'fields' => '{{#search_fields}}{{.}} {{/search_fields}}{{^search_fields}}title content{{/search_fields}}',
                    'type' => 'best_fields'
                ]
            ],
            'size' => '{{#size}}{{size}}{{/size}}{{^size}}50{{/size}}'
        ]
    ];
}
```

### Aggregation Search Template (Fixed)

```php
public function getAggregationSearchTemplate()
{
    return [
        'id' => 'aggregation-search',
        'source' => [
            // Optional query support
            '{{#query_text}}' => [
                'query' => [
                    'multi_match' => [
                        'query' => '{{query_text}}',
                        'fields' => '{{#search_fields}}{{.}} {{/search_fields}}{{^search_fields}}title content{{/search_fields}}',
                        'type' => 'best_fields'
                    ]
                ]
            ],
            '{{/query_text}}' => null,
            
            // Match all when no query provided
            '{{^query_text}}' => [
                'query' => [
                    'match_all' => []
                ]
            ],
            '{{/query_text}}' => null,
            
            // Dynamic aggregations
            'aggs' => '{{&aggregations}}',
            
            // Fixed: Dynamic size with default
            'size' => '{{#size}}{{size}}{{/size}}{{^size}}20{{/size}}'
        ]
    ];
}
```

Key improvements:
1. **Dynamic size**: Returns documents with aggregations
2. **Optional query**: Works with or without search terms
3. **Match all fallback**: Shows all content when browsing without search

## Mustache Syntax in Templates

### Conditionals

```mustache
{{#variable}}
  Content shown when variable exists
{{/variable}}

{{^variable}}
  Content shown when variable doesn't exist
{{/variable}}
```

### Lists/Arrays

```mustache
{{#search_fields}}
  {{.}}  # Current item in the list
{{/search_fields}}
```

### Raw HTML/JSON

```mustache
{{&aggregations}}  # Unescaped output for JSON structures
```

## Using Templates in Code

### From ElasticsearchService

```php
// Check for aggregation search type
if ($searchType === 'aggregation' && isset($options['aggregations'])) {
    $templateService = SearchWithElastic::getInstance()->searchTemplates;
    $templateService->initializeTemplates();
    
    // Build params for aggregation template
    $params = [
        'aggregations' => $options['aggregations'],
        'size' => $size ?? 20,  // Default to 20 if not specified
        'query_text' => $query  // Optional
    ];
    
    // Use the aggregation template
    $searchResponse = $this->client->searchTemplate([
        'index' => $indexName,
        'id' => 'aggregation-search',
        'params' => $params
    ]);
}
```

### From Twig Templates

```twig
{# Build aggregation options #}
{% set searchOptions = {
    size: 20,  {# Important: specify size for results #}
    searchType: 'aggregation',
    aggregations: {
        by_type: {
            terms: {
                field: 'elementType',
                size: 10
            }
        }
    }
} %}

{# Execute search - will use aggregation template #}
{% set results = craft.searchWithElastic.searchExtra('search term', searchOptions) %}

{# Access both results and aggregations #}
<p>Found {{ results.hits|length }} results</p>

{% for bucket in results.aggregations.by_type.buckets %}
    <div>{{ bucket.key }}: {{ bucket.doc_count }}</div>
{% endfor %}
```

## Template Types

### 1. Basic Search
- Simple text matching across fields
- Default fields: title, content
- Configurable field boosting

### 2. Fuzzy Search
- Tolerates typos and variations
- Uses fuzziness parameter
- Good for user-friendly search

### 3. Aggregation Search
- Returns facets/statistics
- **Fixed to also return documents**
- Supports optional queries

### 4. Phrase Search
- Exact phrase matching
- Maintains word order
- Uses match_phrase query

### 5. Boolean Search
- Combines multiple conditions
- Must/should/must_not clauses
- Complex query logic

## Common Issues and Solutions

### Issue: Aggregations Return No Documents

**Problem**: Setting `size: 0` in aggregation queries
**Solution**: Always specify a size > 0 or rely on the default

```twig
{# Wrong - only aggregations, no documents #}
{% set options = {
    size: 0,
    aggs: { ... }
} %}

{# Right - returns both #}
{% set options = {
    size: 20,  {# or omit for default #}
    aggs: { ... }
} %}
```

### Issue: Template Not Found

**Problem**: Templates not initialized in Elasticsearch
**Solution**: Ensure templates are initialized:

```php
$templateService = SearchWithElastic::getInstance()->searchTemplates;
$templateService->initializeTemplates();  // Creates/updates templates
```

### Issue: Wrong Field Names

**Problem**: Using non-existent or incorrectly named fields
**Solution**: Check actual field names in index:

```twig
{% set sample = craft.searchWithElastic.getSampleDocument() %}
Available fields: {{ sample.fields|join(', ') }}
```

Common field name corrections:
- ❌ `section.keyword` → ✅ `elementType`
- ❌ `typeHandle.keyword` → ✅ `elementType`
- ❌ `category.keyword` → ✅ `categories`

## Testing Templates

### Direct Template Testing

```php
// Test aggregation template directly
$params = [
    'query_text' => 'test',
    'size' => 10,
    'aggregations' => json_encode([
        'types' => [
            'terms' => ['field' => 'elementType']
        ]
    ])
];

$response = $client->searchTemplate([
    'index' => 'your-index',
    'id' => 'aggregation-search',
    'params' => $params
]);

// Should return both hits and aggregations
assert(count($response['hits']['hits']) > 0);
assert(isset($response['aggregations']));
```

### Viewing Template Source

```php
// Get the actual template stored in Elasticsearch
$template = $client->getScript([
    'id' => 'aggregation-search'
]);

echo json_encode($template['script']['source'], JSON_PRETTY_PRINT);
```

## Best Practices

1. **Always specify size for aggregations**: Don't use `size: 0` unless you truly only want aggregations
2. **Use templates for common patterns**: Reduces code duplication
3. **Test with getSampleDocument()**: Verify field names before using
4. **Initialize templates on plugin install**: Ensures they're available
5. **Use Mustache conditionals**: Make templates flexible with optional parameters

## Migration Notes

If upgrading from a version with the broken aggregation template:

1. The fix is automatic - templates are re-initialized on plugin update
2. Review any custom code that might have worked around the issue
3. Remove any `size: 0` overrides that were compensating for the bug
4. Test faceted search implementations to ensure they show results

## See Also

- [Aggregations Guide](../usage/aggregations-guide.md) - Using aggregations in templates
- [Template Integration](../usage/template-integration.md) - Twig template usage
- [ElasticsearchService API](elasticsearch-service-api.md) - Service layer documentation