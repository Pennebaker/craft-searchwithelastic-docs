# Index settings

Configure Elasticsearch indexes for optimal search performance, custom field mapping, and advanced content processing. This guide covers index naming strategies, field mapping, and performance optimization.

## Index naming strategies

The plugin creates indexes using a specific naming pattern that supports multiple sites and element types.

### Index naming pattern

All indexes follow this structure:
```
{indexPrefix}{indexName}_{siteId}
```

Examples:
- `craft-elements_1` (default)
- `mysite-entries_1` (custom prefix and element type)
- `prod-content_2` (production environment, site 2)

### Configuring index names

:::code-group

```php [Single index approach]
return [
    'indexPrefix' => 'craft-',
    'fallbackIndexName' => 'elements',
    
    // All element types use the same index
    'elementTypeIndexNames' => [
        'craft\\elements\\Entry' => '',
        'craft\\elements\\Asset' => '',
        'craft\\elements\\Category' => '',
        'craft\\commerce\\elements\\Product' => '',
    ],
];
// Results in: craft-elements_1, craft-elements_2, etc.
```

```php [Separate indexes per type]
return [
    'indexPrefix' => 'craft-',
    'fallbackIndexName' => 'elements',
    
    // Each element type gets its own index
    'elementTypeIndexNames' => [
        'craft\\elements\\Entry' => 'entries',
        'craft\\elements\\Asset' => 'assets', 
        'craft\\elements\\Category' => 'categories',
        'craft\\commerce\\elements\\Product' => 'products',
        'craft\\digitalproducts\\elements\\Product' => 'digital-products',
    ],
];
// Results in: craft-entries_1, craft-assets_1, craft-categories_1, etc.
```

```php [Mixed approach]
return [
    'indexPrefix' => 'mysite-',
    'fallbackIndexName' => 'content',
    
    // Some types get dedicated indexes, others share
    'elementTypeIndexNames' => [
        'craft\\elements\\Entry' => 'entries',      // Dedicated: mysite-entries_1
        'craft\\elements\\Asset' => '',             // Shared: mysite-content_1
        'craft\\elements\\Category' => '',          // Shared: mysite-content_1  
        'craft\\commerce\\elements\\Product' => 'products', // Dedicated: mysite-products_1
    ],
];
```

:::

### Index naming best practices

**Single index approach (recommended for most sites):**
- Simpler management and queries
- Better for smaller to medium sites
- Easier cross-element-type searches
- Lower Elasticsearch resource usage

**Separate indexes approach:**
- Better for large sites with distinct content types
- Allows different mapping and settings per type
- Better performance for type-specific queries
- More complex management

**Environment-specific prefixes:**
```php
// Different prefixes per environment
'dev' => ['indexPrefix' => 'dev-'],
'staging' => ['indexPrefix' => 'staging-'],  
'production' => ['indexPrefix' => 'prod-'],
```

## Field mapping and indexing

Configure which content gets indexed and how it's processed.

### Default indexed fields

The plugin automatically indexes these fields for all elements:

- `id` - Element ID (keyword)
- `siteId` - Site ID (keyword)  
- `slug` - Element slug (keyword)
- `uri` - Element URI (keyword)
- `title` - Element title (text, analyzed)
- `content` - Rendered content (text, analyzed)
- `summary` - Content summary (text, analyzed)
- `elementType` - Element class name (keyword)
- `postDate` - Post date (date)
- `dateUpdated` - Last updated (date)
- `dateCreated` - Created date (date)

### Custom field mapping

Add custom fields to the search index using the `extraFields` configuration:

:::code-group

```php [Basic custom fields]
use pennebaker\searchwithelastic\helpers\ElasticsearchHelper;

return [
    'extraFields' => [
        // Simple field value accessor
        'headline' => ElasticsearchHelper::createFieldValueAccessor('headline'),
        'description' => ElasticsearchHelper::createFieldValueAccessor('description'),
        
        // Element metadata
        'sectionHandle' => ElasticsearchHelper::createFieldHandleAccessor('section'),
        'entryTypeHandle' => ElasticsearchHelper::createFieldHandleAccessor('type'),
        
        // Formatted dates
        'publishedDate' => ElasticsearchHelper::createFormattedDateField('postDate'),
        'publishYear' => ElasticsearchHelper::createYearField('postDate'),
    ],
];
```

```php [Advanced field mapping]
use pennebaker\searchwithelastic\helpers\ElasticsearchHelper;

return [
    'extraFields' => [
        // Custom text field with analyzer
        'searchableContent' => [
            'mapping' => [
                'type' => 'text',
                'analyzer' => 'english',
                'fields' => [
                    'keyword' => [
                        'type' => 'keyword',
                        'ignore_above' => 256
                    ]
                ]
            ],
            'value' => function (\craft\base\ElementInterface $element) {
                return $element->customContent ?? '';
            }
        ],
        
        // Nested object field  
        'productDetails' => [
            'mapping' => [
                'type' => 'object',
                'properties' => [
                    'price' => ['type' => 'float'],
                    'currency' => ['type' => 'keyword'],
                    'inStock' => ['type' => 'boolean']
                ]
            ],
            'value' => function (\craft\base\ElementInterface $element) {
                if ($element instanceof \craft\commerce\elements\Product) {
                    return [
                        'price' => $element->getDefaultVariant()->price,
                        'currency' => $element->getDefaultVariant()->getPurchasable()->getPaymentCurrency(),
                        'inStock' => $element->getDefaultVariant()->hasUnlimitedStock || $element->getDefaultVariant()->stock > 0
                    ];
                }
                return null;
            }
        ],
    ],
];
```

```php [Relationship fields]
use pennebaker\searchwithelastic\helpers\ElasticsearchHelper;

return [
    'extraFields' => [
        // Category relationships
        'categoryTitles' => ElasticsearchHelper::createRelationTitlesField('categories'),
        'categoryParents' => ElasticsearchHelper::createCategoryParentField('categories'),
        
        // Asset relationships
        'featuredImage' => ElasticsearchHelper::createAssetField('featuredImage'),
        'attachments' => ElasticsearchHelper::createAssetField('attachments'),
        
        // User relationships
        'authorName' => [
            'mapping' => ['type' => 'keyword'],
            'value' => function (\craft\base\ElementInterface $element) {
                return $element->getAuthor()->fullName ?? '';
            }
        ],
    ],
];
```

:::

### Available field helpers

The `ElasticsearchHelper` class provides convenient methods for common field types:

```php
// Basic field accessors
ElasticsearchHelper::createFieldValueAccessor('fieldHandle', $mapping = null)
ElasticsearchHelper::createFieldHandleAccessor('property') // section, type, etc.

// Date fields
ElasticsearchHelper::createFormattedDateField('dateField')
ElasticsearchHelper::createYearField('dateField', $groupingLimit = null)

// Element metadata
ElasticsearchHelper::createTypeNameField() // Element type name
ElasticsearchHelper::createOrderField()    // Element order/position

// Relationship fields
ElasticsearchHelper::createRelationTitlesField('relationField')
ElasticsearchHelper::createCategoryParentField('categoryField')
ElasticsearchHelper::createCategoryChildField('categoryField')
ElasticsearchHelper::createAssetField('assetField')
ElasticsearchHelper::createImageField('imageField')
```

## Content processing

Configure how content is extracted and processed before indexing.

### Frontend content fetching

The plugin can fetch rendered HTML from your site's frontend URLs:

```php
return [
    // Enable frontend fetching
    'enableFrontendFetching' => true,
    
    // Index elements without URLs using metadata only
    'indexElementsWithoutUrls' => true,
    
    // Configure which asset types should be fetched from frontend
    'frontendFetchingAssetKinds' => ['text', 'html', 'json', 'xml'],
];
```

### Content extraction callbacks

Process fetched content before indexing:

:::code-group

```php [Extract specific content sections]
'contentExtractorCallback' => function (string $htmlContent) {
    // Extract content between specific HTML comments
    if (preg_match('/<!-- BEGIN search content -->(.*)<!-- END search content -->/s', $htmlContent, $matches)) {
        return strip_tags($matches[1]);
    }
    
    // Fallback to full content
    return strip_tags($htmlContent);
},
```

```php [Clean and format content]
'contentExtractorCallback' => function (string $htmlContent) {
    // Remove navigation and footer content
    $dom = new DOMDocument();
    @$dom->loadHTML('<?xml encoding="utf-8" ?>' . $htmlContent);
    
    // Remove elements that shouldn't be indexed
    $xpath = new DOMXPath($dom);
    $elementsToRemove = $xpath->query('//nav | //footer | //*[@class="no-index"]');
    
    foreach ($elementsToRemove as $element) {
        $element->parentNode->removeChild($element);
    }
    
    // Extract text content
    $textContent = $dom->textContent;
    
    // Clean up whitespace
    return preg_replace('/\s+/', ' ', trim($textContent));
},
```

```php [Language-specific processing]
'contentExtractorCallback' => function (string $htmlContent) {
    // Remove HTML tags
    $text = strip_tags($htmlContent);
    
    // Normalize Unicode characters
    $text = Normalizer::normalize($text, Normalizer::FORM_C);
    
    // Remove extra whitespace
    $text = preg_replace('/\s+/', ' ', trim($text));
    
    // Language-specific processing (example for removing stop words)
    if (Craft::$app->sites->getCurrentSite()->language === 'en-US') {
        // English-specific processing
        $stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        $words = explode(' ', strtolower($text));
        $words = array_diff($words, $stopWords);
        $text = implode(' ', $words);
    }
    
    return $text;
},
```

:::

### Custom element content provider

Override the default content fetching entirely:

```php
'elementContentCallback' => function (\craft\base\ElementInterface $element) {
    // Custom content generation for different element types
    if ($element instanceof \craft\elements\Entry) {
        // Build custom content string from specific fields
        $content = [];
        $content[] = $element->title;
        
        if ($element->summary) {
            $content[] = $element->summary;
        }
        
        if ($element->bodyContent) {
            $content[] = strip_tags($element->bodyContent);
        }
        
        // Add category names
        if ($element->categories) {
            foreach ($element->categories->all() as $category) {
                $content[] = $category->title;
            }
        }
        
        return implode(' ', $content);
    }
    
    // Fallback to default behavior
    return null;
},
```

## Search result formatting

Configure how search results are formatted before being returned to templates.

### Result highlighting

Configure search term highlighting in results:

:::code-group

```php [HTML highlighting]
'highlight' => [
    'pre_tags'  => '<mark class="search-highlight">',
    'post_tags' => '</mark>',
],
```

```php [Simple highlighting]
'highlight' => [
    'pre_tags'  => '**',
    'post_tags' => '**',
],
```

```php [Custom highlight processing]
'resultFormatterCallback' => function (array $formattedResult, $elasticsearchResult) {
    // Custom highlighting logic
    if (isset($elasticsearchResult['highlight'])) {
        foreach ($elasticsearchResult['highlight'] as $field => $highlights) {
            $formattedResult['highlighted'][$field] = $highlights;
        }
    }
    
    // Add custom result data
    $formattedResult['score'] = $elasticsearchResult['_score'];
    $formattedResult['index'] = $elasticsearchResult['_index'];
    
    return $formattedResult;
},
```

:::

### Result formatting callback

Process and enhance search results:

```php
'resultFormatterCallback' => function (array $formattedResult, $elasticsearchResult) {
    // Add element-specific data
    if ($formattedResult['elementType'] === 'craft\\elements\\Entry') {
        // Add entry-specific metadata
        $formattedResult['sectionHandle'] = $formattedResult['section']['handle'] ?? '';
        $formattedResult['entryTypeHandle'] = $formattedResult['type']['handle'] ?? '';
    }
    
    // Add computed fields
    $formattedResult['searchScore'] = round($elasticsearchResult['_score'], 2);
    $formattedResult['matchedFields'] = array_keys($elasticsearchResult['highlight'] ?? []);
    
    // Format dates
    if (isset($formattedResult['postDate'])) {
        $formattedResult['formattedDate'] = date('Y-m-d', strtotime($formattedResult['postDate']));
    }
    
    return $formattedResult;
},
```

## Performance optimization

### Index performance settings

```php
return [
    // Optimize for search performance
    'enableFrontendFetching' => true,
    'indexElementsWithoutUrls' => false, // Skip elements without URLs
    
    // Selective content indexing
    'assetKinds' => ['pdf', 'text'], // Limit to essential asset types
    'frontendFetchingAssetKinds' => ['text', 'html'], // Only text-based assets
    
    // Exclude unnecessary content
    'excludedEntryTypes' => ['internalPages', 'redirects'],
    'excludedAssetVolumes' => ['cache', 'temp'],
];
```

### Elasticsearch cluster settings

For production cluster setups, configure cluster-specific settings:

```php
'elasticsearchComponentConfig' => [
    'nodes' => [
        ['protocol' => 'https', 'http_address' => 'es-node-1:9200'],
        ['protocol' => 'https', 'http_address' => 'es-node-2:9200'],
        ['protocol' => 'https', 'http_address' => 'es-node-3:9200'],
    ],
    
    // Connection optimization
    'connectionTimeout' => 10,
    'dataTimeout' => 30,
    'maxConnections' => 20,
    'keepAlive' => true,
    
    // Retry settings
    'retries' => 3,
    'retryOnTimeout' => true,
],
```

### Bulk indexing optimization

For large sites, optimize bulk operations:

```php
// In your console commands or jobs
$batchSize = 100; // Process elements in batches
$concurrency = 4; // Number of parallel workers

// Queue configuration for better performance
'production' => [
    'queuePriority' => 1024,      // Higher priority for indexing jobs
    'queueDelay' => 0,            // No delay for immediate processing
    'queueTtr' => 300,            // 5 minutes timeout for indexing jobs
],
```

## Index maintenance

### Monitoring index health

```php
// Custom health check function
function checkElasticsearchHealth() {
    $elasticsearch = \pennebaker\searchwithelastic\SearchWithElastic::getInstance()->service;
    
    try {
        $health = $elasticsearch->cluster()->health();
        return $health['status'] === 'green';
    } catch (Exception $e) {
        return false;
    }
}
```

### Index optimization commands

Regular maintenance tasks:

```bash
# Reindex all content
php craft search-with-elastic/elasticsearch/reindex-all-sites

# Reindex specific site
php craft search-with-elastic/elasticsearch/reindex-site --siteId=1

# Clear and rebuild indexes
php craft search-with-elastic/elasticsearch/clear-index --siteId=1
php craft search-with-elastic/elasticsearch/reindex-site --siteId=1

# Check index status
curl -X GET "localhost:9200/_cat/indices?v&pretty"

# Optimize indexes (force merge)
curl -X POST "localhost:9200/craft-*/_forcemerge?max_num_segments=1"
```

### Backup and recovery

```bash
# Create snapshot repository
curl -X PUT "localhost:9200/_snapshot/backup_repo" -H 'Content-Type: application/json' -d'
{
  "type": "fs",
  "settings": {
    "location": "/backup/elasticsearch"
  }
}'

# Create snapshot
curl -X PUT "localhost:9200/_snapshot/backup_repo/snapshot_$(date +%Y%m%d_%H%M%S)"

# Restore from snapshot
curl -X POST "localhost:9200/_snapshot/backup_repo/snapshot_20250101_120000/_restore"
```