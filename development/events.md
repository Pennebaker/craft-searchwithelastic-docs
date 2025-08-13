# Events Reference

The Craft Search with Elastic plugin provides a comprehensive event system that allows developers to extend and customize the plugin's functionality. Events are triggered at key points during search, indexing, and management operations.

## Event Registration

Events follow Craft's standard event pattern. Register event listeners in your module, plugin, or bootstrap file:

```php
use yii\base\Event;
use pennebaker\searchwithelastic\services\ElasticsearchService;
use pennebaker\searchwithelastic\events\SearchEvent;

Event::on(
    ElasticsearchService::class,
    ElasticsearchService::EVENT_BEFORE_SEARCH,
    function(SearchEvent $event) {
        // Your event handler code
    }
);
```

## Search Events

### SearchEvent

**Namespace:** `pennebaker\searchwithelastic\events\SearchEvent`

Triggered when search queries are executed against Elasticsearch.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `$query` | `string\|array` | The search query (can be modified by event handlers) |
| `$params` | `array` | Additional search parameters |
| `$siteId` | `?int` | The site ID where the search is being performed |
| `$skipDefaultSearch` | `bool` | Whether the default search execution should be skipped |

#### Events

| Event Constant | Service | Trigger Point |
|----------------|---------|---------------|
| `EVENT_BEFORE_SEARCH` | `ElasticsearchService` | Before executing a search query |
| `EVENT_AFTER_SEARCH` | `ElasticsearchService` | After executing a search query |

#### Usage Examples

**Modify search query before execution:**

```php
use yii\base\Event;
use pennebaker\searchwithelastic\services\ElasticsearchService;
use pennebaker\searchwithelastic\events\SearchEvent;

Event::on(
    ElasticsearchService::class,
    ElasticsearchService::EVENT_BEFORE_SEARCH,
    function(SearchEvent $event) {
        // Add site-specific boost
        if ($event->siteId === 1) {
            $event->params['boost'] = 1.5;
        }
        
        // Sanitize query
        $event->query = trim(strip_tags($event->query));
        
        // Add automatic filters
        if (!isset($event->params['filters'])) {
            $event->params['filters'] = [];
        }
        $event->params['filters']['status'] = 'live';
    }
);
```

**Custom search analytics:**

```php
Event::on(
    ElasticsearchService::class,
    ElasticsearchService::EVENT_AFTER_SEARCH,
    function(SearchEvent $event) {
        // Log search analytics
        $resultCount = count($event->params['results'] ?? []);
        
        \Craft::info("Search performed: '{$event->query}' on site {$event->siteId}, {$resultCount} results", 'search-analytics');
        
        // Store in custom analytics table
        (new \craft\db\Query())
            ->createCommand()
            ->insert('{{%search_analytics}}', [
                'query' => $event->query,
                'siteId' => $event->siteId,
                'resultCount' => $resultCount,
                'dateCreated' => \craft\helpers\Db::prepareDateForDb(new \DateTime())
            ])
            ->execute();
    }
);
```

### ConnectionTestEvent

**Namespace:** `pennebaker\searchwithelastic\events\ConnectionTestEvent`

Triggered when testing connections to Elasticsearch.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `$endpoint` | `string` | The Elasticsearch endpoint being tested |
| `$config` | `array` | Connection configuration (passwords masked) |
| `$result` | `?bool` | The test result (null initially, set during test) |
| `$errorMessage` | `?string` | Error message if test failed |
| `$skipDefaultTest` | `bool` | Whether to skip the default test |

#### Events

| Event Constant | Service | Trigger Point |
|----------------|---------|---------------|
| `EVENT_BEFORE_CONNECTION_TEST` | `ElasticsearchService` | Before testing connection |
| `EVENT_AFTER_CONNECTION_TEST` | `ElasticsearchService` | After testing connection |

#### Usage Examples

**Custom connection validation:**

```php
use pennebaker\searchwithelastic\events\ConnectionTestEvent;

Event::on(
    ElasticsearchService::class,
    ElasticsearchService::EVENT_BEFORE_CONNECTION_TEST,
    function(ConnectionTestEvent $event) {
        // Perform custom validation
        if (strpos($event->endpoint, 'localhost') !== false && \Craft::$app->getConfig()->general->devMode === false) {
            $event->result = false;
            $event->errorMessage = 'Localhost connections not allowed in production';
            $event->skipDefaultTest = true;
        }
    }
);
```

## Indexing Events

### IndexElementEvent

**Namespace:** `pennebaker\searchwithelastic\events\IndexElementEvent`

Triggered when indexing or removing elements from Elasticsearch.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `$element` | `Element` | The element being indexed or removed |
| `$documentData` | `array` | The document data that will be indexed (modifiable) |
| `$indexName` | `string` | The Elasticsearch index name |
| `$isNew` | `bool` | Whether the element is being newly created |
| `$skipDefaultOperation` | `bool` | Whether to skip the default operation |

#### Events

| Event Constant | Service | Trigger Point |
|----------------|---------|---------------|
| `EVENT_BEFORE_INDEX_ELEMENT` | `ElementIndexerService` | Before indexing an element |
| `EVENT_AFTER_INDEX_ELEMENT` | `ElementIndexerService` | After indexing an element |
| `EVENT_BEFORE_REMOVE_ELEMENT` | `ElementIndexerService` | Before removing an element |
| `EVENT_AFTER_REMOVE_ELEMENT` | `ElementIndexerService` | After removing an element |

#### Usage Examples

**Add custom fields to index:**

```php
use pennebaker\searchwithelastic\services\ElementIndexerService;
use pennebaker\searchwithelastic\events\IndexElementEvent;

Event::on(
    ElementIndexerService::class,
    ElementIndexerService::EVENT_BEFORE_INDEX_ELEMENT,
    function(IndexElementEvent $event) {
        $element = $event->element;
        
        // Add custom metadata
        $event->documentData['customCategory'] = $element->getFieldValue('category')?->title ?? 'Uncategorized';
        $event->documentData['authorName'] = $element->getAuthor()?->fullName ?? 'Anonymous';
        $event->documentData['wordCount'] = str_word_count(strip_tags($event->documentData['content'] ?? ''));
        
        // Add computed fields
        if ($element instanceof \craft\elements\Entry) {
            $event->documentData['entryAge'] = time() - $element->postDate->getTimestamp();
            $event->documentData['isRecent'] = $event->documentData['entryAge'] < (30 * 24 * 60 * 60); // 30 days
        }
        
        // Add tags from related elements
        $tags = [];
        foreach ($element->getFieldValue('relatedTags')->all() as $tag) {
            $tags[] = $tag->title;
        }
        $event->documentData['tags'] = $tags;
    }
);
```

**Custom indexing logic:**

```php
Event::on(
    ElementIndexerService::class,
    ElementIndexerService::EVENT_BEFORE_INDEX_ELEMENT,
    function(IndexElementEvent $event) {
        // Skip indexing draft entries in production
        if (!Craft::$app->getConfig()->general->devMode && $event->element->getIsDraft()) {
            $event->skipDefaultOperation = true;
            return;
        }
        
        // Custom privacy handling
        if ($event->element->getFieldValue('isPrivate')) {
            $event->documentData['content'] = '[Private content]';
            $event->documentData['searchable'] = false;
        }
    }
);
```

**Post-indexing operations:**

```php
Event::on(
    ElementIndexerService::class,
    ElementIndexerService::EVENT_AFTER_INDEX_ELEMENT,
    function(IndexElementEvent $event) {
        // Invalidate related caches
        \Craft::$app->getCache()->delete("search_cache_site_{$event->element->siteId}");
        
        // Update related counters
        if ($event->element instanceof \craft\elements\Entry) {
            $this->updateCategoryCounter($event->element->getFieldValue('category'));
        }
        
        // Send webhook notification
        $this->sendWebhookNotification('element_indexed', [
            'elementId' => $event->element->id,
            'elementType' => get_class($event->element),
            'siteId' => $event->element->siteId,
            'indexName' => $event->indexName
        ]);
    }
);
```

### ContentExtractionEvent

**Namespace:** `pennebaker\searchwithelastic\events\ContentExtractionEvent`

Triggered when extracting indexable content from HTML.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `$rawContent` | `string` | The raw HTML content to extract from |
| `$extractedContent` | `string` | The extracted content (modifiable) |
| `$element` | `?Element` | The element being indexed (optional context) |
| `$skipDefaultExtraction` | `bool` | Whether to skip the default extraction |

#### Events

| Event Constant | Service | Trigger Point |
|----------------|---------|---------------|
| `EVENT_CONTENT_EXTRACTION` | `ElementIndexerService` | During content extraction from HTML |

#### Usage Examples

**Custom content extraction:**

```php
use pennebaker\searchwithelastic\services\ElementIndexerService;
use pennebaker\searchwithelastic\events\ContentExtractionEvent;

Event::on(
    ElementIndexerService::class,
    ElementIndexerService::EVENT_CONTENT_EXTRACTION,
    function(ContentExtractionEvent $event) {
        // Custom extraction for specific element types
        if ($event->element instanceof \craft\elements\Entry && $event->element->section->handle === 'products') {
            // Extract product-specific information
            $dom = new \DOMDocument();
            @$dom->loadHTML($event->rawContent);
            
            $xpath = new \DOMXPath($dom);
            
            // Extract product specifications
            $specs = $xpath->query('//div[@class="product-specs"]//text()');
            $specText = '';
            foreach ($specs as $spec) {
                $specText .= trim($spec->nodeValue) . ' ';
            }
            
            // Extract reviews
            $reviews = $xpath->query('//div[@class="reviews"]//p/text()');
            $reviewText = '';
            foreach ($reviews as $review) {
                $reviewText .= trim($review->nodeValue) . ' ';
            }
            
            $event->extractedContent = trim($specText . ' ' . $reviewText);
            $event->skipDefaultExtraction = true;
        }
    }
);
```

**Content filtering and enhancement:**

```php
Event::on(
    ElementIndexerService::class,
    ElementIndexerService::EVENT_CONTENT_EXTRACTION,
    function(ContentExtractionEvent $event) {
        // Remove unwanted content
        $event->extractedContent = preg_replace('/\bPassword:\s*\S+/i', '[Password Removed]', $event->extractedContent);
        $event->extractedContent = preg_replace('/\b\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}\b/', '[Card Number Removed]', $event->extractedContent);
        
        // Enhance content with metadata
        if ($event->element) {
            $author = $event->element->getAuthor();
            if ($author) {
                $event->extractedContent .= " Author: {$author->fullName}";
            }
            
            // Add field values to searchable content
            $category = $event->element->getFieldValue('category');
            if ($category) {
                $event->extractedContent .= " Category: {$category->title}";
            }
        }
    }
);
```

## Management Events

### IndexManagementEvent

**Namespace:** `pennebaker\searchwithelastic\events\IndexManagementEvent`

Triggered during index management operations.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `$siteId` | `int` | The site ID |
| `$indexName` | `string` | The Elasticsearch index name |
| `$indexConfig` | `array` | The index configuration (modifiable) |
| `$operation` | `string` | The operation type ('create', 'delete', 'recreate') |
| `$indexExisted` | `bool` | Whether the index existed before the operation |
| `$skipDefaultOperation` | `bool` | Whether to skip the default operation |

#### Events

| Event Constant | Service | Trigger Point |
|----------------|---------|---------------|
| `EVENT_BEFORE_CREATE_INDEX` | `IndexManagementService` | Before creating an index |
| `EVENT_AFTER_CREATE_INDEX` | `IndexManagementService` | After creating an index |
| `EVENT_BEFORE_DELETE_INDEX` | `IndexManagementService` | Before deleting an index |
| `EVENT_AFTER_DELETE_INDEX` | `IndexManagementService` | After deleting an index |
| `EVENT_BEFORE_RECREATE_INDEX` | `IndexManagementService` | Before recreating an index |
| `EVENT_AFTER_RECREATE_INDEX` | `IndexManagementService` | After recreating an index |

#### Usage Examples

**Custom index configuration:**

```php
use pennebaker\searchwithelastic\services\IndexManagementService;
use pennebaker\searchwithelastic\events\IndexManagementEvent;

Event::on(
    IndexManagementService::class,
    IndexManagementService::EVENT_BEFORE_CREATE_INDEX,
    function(IndexManagementEvent $event) {
        // Add custom analyzers
        $event->indexConfig['settings']['analysis']['analyzer']['custom_html'] = [
            'type' => 'custom',
            'tokenizer' => 'standard',
            'char_filter' => ['html_strip'],
            'filter' => ['lowercase', 'stop']
        ];
        
        // Add custom field mappings
        $event->indexConfig['mappings']['properties']['customField'] = [
            'type' => 'text',
            'analyzer' => 'custom_html'
        ];
        
        // Increase shards for high-traffic sites
        if ($event->siteId === 1) {
            $event->indexConfig['settings']['number_of_shards'] = 3;
            $event->indexConfig['settings']['number_of_replicas'] = 1;
        }
    }
);
```

**Index lifecycle hooks:**

```php
Event::on(
    IndexManagementService::class,
    IndexManagementService::EVENT_AFTER_CREATE_INDEX,
    function(IndexManagementEvent $event) {
        // Set up index aliases
        $connection = \pennebaker\searchwithelastic\SearchWithElastic::getConnection();
        $aliasName = "craft-site-{$event->siteId}";
        
        $connection->post(['_aliases'], [], json_encode([
            'actions' => [
                ['add' => ['index' => $event->indexName, 'alias' => $aliasName]]
            ]
        ]));
        
        // Log index creation
        \Craft::info("Created index {$event->indexName} for site {$event->siteId}", 'elasticsearch');
    }
);
```

## Queue Events

### QueueEvent

**Namespace:** `pennebaker\searchwithelastic\events\QueueEvent`

Triggered during queue management operations.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `$elementModels` | `array` | Array of IndexableElementModel instances |
| `$operation` | `string` | The operation type ('enqueue', 'clear') |
| `$jobIds` | `?array` | Array of job IDs (set after enqueue) |
| `$skipDefaultOperation` | `bool` | Whether to skip the default operation |

#### Events

| Event Constant | Service | Trigger Point |
|----------------|---------|---------------|
| `EVENT_BEFORE_ENQUEUE_JOBS` | `ReindexQueueManagementService` | Before enqueuing jobs |
| `EVENT_AFTER_ENQUEUE_JOBS` | `ReindexQueueManagementService` | After enqueuing jobs |
| `EVENT_BEFORE_CLEAR_QUEUE` | `ReindexQueueManagementService` | Before clearing queue |
| `EVENT_AFTER_CLEAR_QUEUE` | `ReindexQueueManagementService` | After clearing queue |

#### Usage Examples

**Custom queue management:**

```php
use pennebaker\searchwithelastic\services\ReindexQueueManagementService;
use pennebaker\searchwithelastic\events\QueueEvent;

Event::on(
    ReindexQueueManagementService::class,
    ReindexQueueManagementService::EVENT_BEFORE_ENQUEUE_JOBS,
    function(QueueEvent $event) {
        // Filter out certain element types during peak hours
        if (date('G') >= 9 && date('G') <= 17) { // Business hours
            $event->elementModels = array_filter($event->elementModels, function($model) {
                return $model->type !== \craft\elements\Asset::class;
            });
        }
        
        // Prioritize certain element types
        usort($event->elementModels, function($a, $b) {
            $priority = [
                \craft\elements\Entry::class => 1,
                \craft\elements\Category::class => 2,
                \craft\elements\Asset::class => 3,
            ];
            
            return ($priority[$a->type] ?? 999) <=> ($priority[$b->type] ?? 999);
        });
    }
);
```

## Model Events

### ModelEvent

**Namespace:** `pennebaker\searchwithelastic\events\ModelEvent`

Triggered during model creation operations.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `$element` | `Element` | The Craft element |
| `$siteId` | `int` | The site ID |
| `$model` | `IndexableElementModel` | The indexable element model (modifiable) |
| `$skipDefaultCreation` | `bool` | Whether to skip default model creation |

#### Events

| Event Constant | Service | Trigger Point |
|----------------|---------|---------------|
| `EVENT_BEFORE_CREATE_MODEL` | `ModelService` | Before creating a model |
| `EVENT_AFTER_CREATE_MODEL` | `ModelService` | After creating a model |

## Record Events

### RecordEvent

**Namespace:** `pennebaker\searchwithelastic\events\RecordEvent`

Triggered during record operations.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `$element` | `Element` | The element |
| `$documentId` | `?string` | The document ID |
| `$operation` | `string` | The operation type ('save', 'delete') |
| `$result` | `bool` | The operation result |
| `$skipDefaultOperation` | `bool` | Whether to skip the default operation |

#### Events

| Event Constant | Service | Trigger Point |
|----------------|---------|---------------|
| `EVENT_BEFORE_SAVE_RECORD` | `RecordService` | Before saving a record |
| `EVENT_AFTER_SAVE_RECORD` | `RecordService` | After saving a record |
| `EVENT_BEFORE_DELETE_RECORD` | `RecordService` | Before deleting a record |
| `EVENT_AFTER_DELETE_RECORD` | `RecordService` | After deleting a record |

## Query Events

### QueryEvent

**Namespace:** `pennebaker\searchwithelastic\events\QueryEvent`

Triggered during query building operations.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `$siteId` | `int` | The site ID |
| `$elementType` | `string` | The element type class name |
| `$query` | `mixed` | The query builder instance (modifiable) |

#### Events

| Event Constant | Service | Trigger Point |
|----------------|---------|---------------|
| `EVENT_BEFORE_BUILD_QUERY` | `QueryService` | Before building a query |
| `EVENT_AFTER_BUILD_QUERY` | `QueryService` | After building a query |

#### Usage Example

**Custom query modifications:**

```php
use pennebaker\searchwithelastic\services\QueryService;
use pennebaker\searchwithelastic\events\QueryEvent;

Event::on(
    QueryService::class,
    QueryService::EVENT_BEFORE_BUILD_QUERY,
    function(QueryEvent $event) {
        // Add custom filtering for specific sites
        if ($event->siteId === 2 && $event->elementType === \craft\elements\Entry::class) {
            $event->query->section('news'); // Only news section for site 2
        }
        
        // Add date-based filtering
        if ($event->elementType === \craft\elements\Entry::class) {
            $event->query->postDate('>= ' . (new \DateTime('-1 year'))->format('Y-m-d'));
        }
    }
);
```

## Best Practices

### Event Handler Performance

Keep event handlers lightweight and fast:

```php
// Good: Quick operations
Event::on(Service::class, Service::EVENT_NAME, function($event) {
    $event->data['customField'] = 'value';
});

// Avoid: Heavy operations in events
Event::on(Service::class, Service::EVENT_NAME, function($event) {
    // Don't do this - it will slow down indexing
    $heavyData = $this->performExpensiveApiCall();
    $event->data['heavyData'] = $heavyData;
});
```

### Error Handling

Always include error handling in event listeners:

```php
Event::on(Service::class, Service::EVENT_NAME, function($event) {
    try {
        // Your event handling code
        $event->data['processed'] = $this->processData($event->data);
    } catch (\Exception $e) {
        \Craft::error("Event handler failed: " . $e->getMessage(), 'search-plugin');
        // Don't re-throw - let the operation continue
    }
});
```

### Conditional Processing

Use conditional logic to avoid unnecessary processing:

```php
Event::on(Service::class, Service::EVENT_NAME, function($event) {
    // Skip processing for certain element types
    if (!$event->element instanceof \craft\elements\Entry) {
        return;
    }
    
    // Skip processing for disabled sites
    if (!$event->element->getSite()->enabled) {
        return;
    }
    
    // Your processing code here
});
```

### Memory Management

For events that process many elements, be mindful of memory usage:

```php
Event::on(Service::class, Service::EVENT_NAME, function($event) {
    // Process data
    $processedData = $this->processElement($event->element);
    $event->data = array_merge($event->data, $processedData);
    
    // Clear references to prevent memory leaks
    unset($processedData);
});
```