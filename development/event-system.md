# Event System Documentation

The Craft Search with Elastic plugin provides a comprehensive event system organized by functional areas. This allows developers to hook into various operations and extend or modify plugin behavior.

## Event Organization

Events are organized into three main categories:

```
events/
├── connection/          # Connection and infrastructure events
├── indexing/           # Element indexing and model events
└── search/             # Search operations and query events
```

## Connection Events

Events related to Elasticsearch connection management and testing.

### ConnectionTestEvent

Triggered when testing connections to Elasticsearch.

**Namespace:** `pennebaker\searchwithelastic\events\connection\ConnectionTestEvent`

**Properties:**
- `$connectionConfig` (array): Connection configuration
- `$testResult` (bool): Test result (set after test)
- `$errorMessage` (?string): Error message if test failed

**Usage:**
```php
use pennebaker\searchwithelastic\events\connection\ConnectionTestEvent;
use pennebaker\searchwithelastic\services\ElasticsearchService;

Event::on(
    ElasticsearchService::class,
    ElasticsearchService::EVENT_BEFORE_CONNECTION_TEST,
    function(ConnectionTestEvent $event) {
        // Modify connection config before testing
        $event->connectionConfig['timeout'] = 30;
        
        // Log connection attempt
        Craft::info("Testing connection to: " . $event->connectionConfig['host']);
    }
);

Event::on(
    ElasticsearchService::class,
    ElasticsearchService::EVENT_AFTER_CONNECTION_TEST,
    function(ConnectionTestEvent $event) {
        if ($event->testResult) {
            Craft::info("Connection test successful");
        } else {
            Craft::warning("Connection test failed: " . $event->errorMessage);
        }
    }
);
```

### ErrorEvent

Triggered when connection errors occur.

**Namespace:** `pennebaker\searchwithelastic\events\connection\ErrorEvent`

**Properties:**
- `$exception` (\Throwable): The exception that occurred
- `$context` (string): Context where error occurred
- `$handled` (bool): Whether error was handled

**Usage:**
```php
use pennebaker\searchwithelastic\events\connection\ErrorEvent;

Event::on(
    ElasticsearchService::class,
    'connectionError',
    function(ErrorEvent $event) {
        // Custom error handling
        if ($event->exception instanceof \yii\elasticsearch\Exception) {
            // Handle Elasticsearch-specific errors
            $this->handleElasticsearchError($event->exception);
        }
        
        $event->handled = true;
    }
);
```

## Indexing Events

Events related to element indexing, model creation, and index management.

### ContentExtractionEvent

Triggered during content extraction from HTML.

**Namespace:** `pennebaker\searchwithelastic\events\indexing\ContentExtractionEvent`

**Properties:**
- `$htmlContent` (string): Original HTML content
- `$extractedContent` (string): Extracted plain text
- `$element` (ElementInterface): Source element

**Usage:**
```php
use pennebaker\searchwithelastic\events\indexing\ContentExtractionEvent;
use pennebaker\searchwithelastic\services\ElementIndexerService;

Event::on(
    ElementIndexerService::class,
    ElementIndexerService::EVENT_CONTENT_EXTRACTION,
    function(ContentExtractionEvent $event) {
        // Custom content processing
        $content = $event->extractedContent;
        
        // Remove unwanted content
        $content = preg_replace('/\[private\].*?\[\/private\]/s', '', $content);
        
        // Enhance content with metadata
        if ($event->element instanceof Entry) {
            $content .= " " . $event->element->section->name;
        }
        
        $event->extractedContent = $content;
    }
);
```

### ElementContentEvent

Triggered when preparing element content for indexing.

**Namespace:** `pennebaker\searchwithelastic\events\indexing\ElementContentEvent`

**Properties:**
- `$element` (ElementInterface): Element being processed
- `$content` (array): Content data array
- `$fields` (array): Field data

**Usage:**
```php
use pennebaker\searchwithelastic\events\indexing\ElementContentEvent;

Event::on(
    ElementIndexerService::class,
    'prepareElementContent',
    function(ElementContentEvent $event) {
        // Add custom fields to content
        if ($event->element instanceof Entry) {
            $event->content['customField'] = $event->element->getCustomFieldValue();
            $event->content['category'] = $event->element->section->name;
        }
    }
);
```

### ExtraFieldsEvent

Triggered when adding extra fields to indexed content.

**Namespace:** `pennebaker\searchwithelastic\events\indexing\ExtraFieldsEvent`

**Properties:**
- `$element` (ElementInterface): Element being indexed
- `$extraFields` (array): Extra fields to add to index

**Usage:**
```php
use pennebaker\searchwithelastic\events\indexing\ExtraFieldsEvent;

Event::on(
    ElementIndexerService::class,
    'addExtraFields',
    function(ExtraFieldsEvent $event) {
        // Add computed fields
        $event->extraFields['word_count'] = str_word_count(
            strip_tags($event->element->getFieldValue('body'))
        );
        
        // Add taxonomy information
        if ($event->element instanceof Entry) {
            $categories = $event->element->categories->all();
            $event->extraFields['category_names'] = array_map(
                fn($cat) => $cat->title,
                $categories
            );
        }
    }
);
```

### IndexElementEvent

Triggered before and after indexing elements.

**Namespace:** `pennebaker\searchwithelastic\events\indexing\IndexElementEvent`

**Properties:**
- `$element` (ElementInterface): Element being indexed
- `$indexData` (array): Data being indexed
- `$result` (?IndexingResult): Indexing result (after indexing)

**Usage:**
```php
use pennebaker\searchwithelastic\events\indexing\IndexElementEvent;
use pennebaker\searchwithelastic\services\ElementIndexerService;

Event::on(
    ElementIndexerService::class,
    ElementIndexerService::EVENT_BEFORE_INDEX_ELEMENT,
    function(IndexElementEvent $event) {
        // Pre-indexing validation
        if (!$event->element->getIsIndexable()) {
            $event->handled = true; // Skip indexing
            return;
        }
        
        // Modify index data
        $event->indexData['timestamp'] = time();
        $event->indexData['version'] = '2.0';
    }
);

Event::on(
    ElementIndexerService::class,
    ElementIndexerService::EVENT_AFTER_INDEX_ELEMENT,
    function(IndexElementEvent $event) {
        if ($event->result && $event->result->isSuccess()) {
            // Trigger additional processing
            $this->notifyIndexingComplete($event->element);
        }
    }
);
```

### IndexManagementEvent

Triggered during index creation, deletion, and management operations.

**Namespace:** `pennebaker\searchwithelastic\events\indexing\IndexManagementEvent`

**Properties:**
- `$indexName` (string): Index name
- `$siteId` (int): Site ID
- `$operation` (string): Operation type ('create', 'delete', 'recreate')
- `$config` (array): Index configuration

**Usage:**
```php
use pennebaker\searchwithelastic\events\indexing\IndexManagementEvent;
use pennebaker\searchwithelastic\services\IndexManagementService;

Event::on(
    IndexManagementService::class,
    IndexManagementService::EVENT_BEFORE_CREATE_INDEX,
    function(IndexManagementEvent $event) {
        // Customize index settings
        $event->config['settings']['number_of_replicas'] = 2;
        $event->config['settings']['refresh_interval'] = '30s';
        
        // Add custom analyzers
        $event->config['settings']['analysis'] = [
            'analyzer' => [
                'custom_analyzer' => [
                    'type' => 'custom',
                    'tokenizer' => 'standard'
                ]
            ]
        ];
    }
);
```

### ModelEvent

Triggered during model creation and processing.

**Namespace:** `pennebaker\searchwithelastic\events\indexing\ModelEvent`

**Properties:**
- `$model` (IndexableElementModel): Model being processed
- `$element` (?ElementInterface): Source element
- `$data` (array): Model data

**Usage:**
```php
use pennebaker\searchwithelastic\events\indexing\ModelEvent;
use pennebaker\searchwithelastic\services\ModelService;

Event::on(
    ModelService::class,
    ModelService::EVENT_BEFORE_CREATE_MODEL,
    function(ModelEvent $event) {
        // Validate model data
        if (empty($event->data['title'])) {
            throw new \InvalidArgumentException('Title is required');
        }
    }
);

Event::on(
    ModelService::class,
    ModelService::EVENT_AFTER_CREATE_MODEL,
    function(ModelEvent $event) {
        // Post-processing
        $event->model->customProperty = $this->calculateCustomValue($event->model);
    }
);
```

### QueueEvent

Triggered during queue management operations.

**Namespace:** `pennebaker\searchwithelastic\events\indexing\QueueEvent`

**Properties:**
- `$jobs` (array): Job data array
- `$operation` (string): Operation type
- `$count` (int): Number of jobs affected

**Usage:**
```php
use pennebaker\searchwithelastic\events\indexing\QueueEvent;
use pennebaker\searchwithelastic\services\ReindexQueueManagementService;

Event::on(
    ReindexQueueManagementService::class,
    ReindexQueueManagementService::EVENT_BEFORE_ENQUEUE_JOBS,
    function(QueueEvent $event) {
        // Log queue operations
        Craft::info("Enqueuing {$event->count} indexing jobs");
        
        // Modify job priority based on element type
        foreach ($event->jobs as &$job) {
            if ($job['elementType'] === Entry::class) {
                $job['priority'] = 1024; // High priority for entries
            }
        }
    }
);
```

### RecordEvent

Triggered during record operations.

**Namespace:** `pennebaker\searchwithelastic\events\indexing\RecordEvent`

**Properties:**
- `$element` (ElementInterface): Element being recorded
- `$record` (?object): Record data
- `$documentId` (?string): Elasticsearch document ID

**Usage:**
```php
use pennebaker\searchwithelastic\events\indexing\RecordEvent;
use pennebaker\searchwithelastic\services\RecordService;

Event::on(
    RecordService::class,
    RecordService::EVENT_BEFORE_SAVE_RECORD,
    function(RecordEvent $event) {
        // Custom record processing
        $this->logRecordOperation($event->element, 'save');
    }
);
```

## Search Events

Events related to search operations and query building.

### QueryEvent

Triggered during query building and processing.

**Namespace:** `pennebaker\searchwithelastic\events\search\QueryEvent`

**Properties:**
- `$query` (mixed): Query object
- `$siteId` (int): Site ID
- `$elementType` (string): Element type
- `$params` (array): Query parameters

**Usage:**
```php
use pennebaker\searchwithelastic\events\search\QueryEvent;
use pennebaker\searchwithelastic\services\QueryService;

Event::on(
    QueryService::class,
    QueryService::EVENT_BEFORE_BUILD_QUERY,
    function(QueryEvent $event) {
        // Modify query based on element type
        if ($event->elementType === Entry::class) {
            $event->query->status(['live']);
            $event->query->section(['news', 'blog']);
        }
        
        // Add site-specific filtering
        if ($event->siteId === 2) {
            $event->query->frontendFetch(false);
        }
    }
);

Event::on(
    QueryService::class,
    QueryService::EVENT_AFTER_BUILD_QUERY,
    function(QueryEvent $event) {
        // Log query construction
        Craft::info("Built query for {$event->elementType} on site {$event->siteId}");
    }
);
```

### SearchEvent

Triggered before and after search operations.

**Namespace:** `pennebaker\searchwithelastic\events\search\SearchEvent`

**Properties:**
- `$query` (string): Search query
- `$options` (array): Search options
- `$results` (?array): Search results (after search)

**Usage:**
```php
use pennebaker\searchwithelastic\events\search\SearchEvent;
use pennebaker\searchwithelastic\services\ElasticsearchService;

Event::on(
    ElasticsearchService::class,
    ElasticsearchService::EVENT_BEFORE_SEARCH,
    function(SearchEvent $event) {
        // Log search queries
        Craft::info("Searching for: " . $event->query);
        
        // Modify search options
        $event->options['highlight'] = [
            'fields' => [
                'title' => new \stdClass(),
                'content' => new \stdClass()
            ]
        ];
    }
);

Event::on(
    ElasticsearchService::class,
    ElasticsearchService::EVENT_AFTER_SEARCH,
    function(SearchEvent $event) {
        // Process search results
        if ($event->results) {
            $hitCount = count($event->results['hits']['hits'] ?? []);
            Craft::info("Search returned {$hitCount} results");
        }
    }
);
```

### ResultFormattingEvent

Triggered when formatting search results.

**Namespace:** `pennebaker\searchwithelastic\events\search\ResultFormattingEvent`

**Properties:**
- `$rawResults` (array): Raw Elasticsearch results
- `$formattedResults` (array): Formatted results
- `$query` (string): Original search query

**Usage:**
```php
use pennebaker\searchwithelastic\events\search\ResultFormattingEvent;

Event::on(
    ElasticsearchService::class,
    'formatResults',
    function(ResultFormattingEvent $event) {
        // Add custom formatting
        foreach ($event->formattedResults as &$result) {
            // Add computed fields
            $result['relevanceScore'] = $this->calculateRelevance(
                $result,
                $event->query
            );
            
            // Add URL
            if (isset($result['uri'])) {
                $result['url'] = UrlHelper::siteUrl($result['uri']);
            }
        }
    }
);
```

## Event Handler Examples

### Comprehensive Indexing Workflow

```php
use pennebaker\searchwithelastic\events\indexing\IndexElementEvent;
use pennebaker\searchwithelastic\services\ElementIndexerService;

class IndexingWorkflowHandler
{
    public function register(): void
    {
        Event::on(
            ElementIndexerService::class,
            ElementIndexerService::EVENT_BEFORE_INDEX_ELEMENT,
            [$this, 'beforeIndexElement']
        );
        
        Event::on(
            ElementIndexerService::class,
            ElementIndexerService::EVENT_AFTER_INDEX_ELEMENT,
            [$this, 'afterIndexElement']
        );
    }
    
    public function beforeIndexElement(IndexElementEvent $event): void
    {
        // Pre-processing
        $this->validateElement($event->element);
        $this->enrichIndexData($event->indexData, $event->element);
        $this->logIndexingStart($event->element);
    }
    
    public function afterIndexElement(IndexElementEvent $event): void
    {
        // Post-processing
        if ($event->result && $event->result->isSuccess()) {
            $this->updateSearchStatistics($event->element);
            $this->notifyWebhooks($event->element);
        } else {
            $this->handleIndexingFailure($event->element, $event->result);
        }
        
        $this->logIndexingComplete($event->element, $event->result);
    }
    
    private function enrichIndexData(array &$indexData, ElementInterface $element): void
    {
        // Add computed fields
        $indexData['wordCount'] = $this->calculateWordCount($element);
        $indexData['readingTime'] = $this->calculateReadingTime($element);
        $indexData['popularity'] = $this->getPopularityScore($element);
    }
}
```

### Search Analytics Handler

```php
use pennebaker\searchwithelastic\events\search\SearchEvent;
use pennebaker\searchwithelastic\services\ElasticsearchService;

class SearchAnalyticsHandler
{
    public function register(): void
    {
        Event::on(
            ElasticsearchService::class,
            ElasticsearchService::EVENT_AFTER_SEARCH,
            [$this, 'trackSearch']
        );
    }
    
    public function trackSearch(SearchEvent $event): void
    {
        $hitCount = 0;
        if ($event->results && isset($event->results['hits']['total'])) {
            $hitCount = $event->results['hits']['total']['value'] ?? 0;
        }
        
        // Log to analytics
        $this->recordSearchMetrics([
            'query' => $event->query,
            'results_count' => $hitCount,
            'user_id' => Craft::$app->getUser()->getId(),
            'timestamp' => time(),
            'site_id' => Craft::$app->getSites()->getCurrentSite()->id
        ]);
        
        // Update search suggestions
        if ($hitCount === 0) {
            $this->recordFailedSearch($event->query);
        }
    }
}
```

## Event Performance Considerations

### Efficient Event Handlers

1. **Keep Handlers Light**: Avoid heavy processing in event handlers
2. **Use Queues**: Queue heavy operations instead of doing them synchronously
3. **Conditional Logic**: Check conditions early to avoid unnecessary work
4. **Batch Operations**: Group multiple operations when possible

```php
Event::on(
    ElementIndexerService::class,
    ElementIndexerService::EVENT_AFTER_INDEX_ELEMENT,
    function(IndexElementEvent $event) {
        // Good: Light processing
        if ($event->result && $event->result->isSuccess()) {
            // Queue heavy operation instead of doing it here
            Craft::$app->getQueue()->push(new ProcessIndexedElementJob([
                'elementId' => $event->element->id
            ]));
        }
    }
);
```

### Memory Management

```php
Event::on(
    ElementIndexerService::class,
    ElementIndexerService::EVENT_AFTER_INDEX_ELEMENT,
    function(IndexElementEvent $event) {
        // Process and clear
        $this->processResult($event->result);
        
        // Clear references to prevent memory leaks
        $event->result = null;
        unset($event->indexData);
    }
);
```

## Testing Event Handlers

### Unit Testing

```php
use PHPUnit\Framework\TestCase;
use pennebaker\searchwithelastic\events\search\SearchEvent;

class SearchEventTest extends TestCase
{
    public function testSearchEventHandler(): void
    {
        $event = new SearchEvent([
            'query' => 'test query',
            'options' => [],
            'results' => null
        ]);
        
        // Test event properties
        $this->assertEquals('test query', $event->query);
        $this->assertIsArray($event->options);
        
        // Test handler
        $handler = new SearchAnalyticsHandler();
        $handler->trackSearch($event);
        
        // Verify handler behavior
        // ... assertions
    }
}
```

### Integration Testing

```php
class EventIntegrationTest extends TestCase
{
    public function testIndexingEventFlow(): void
    {
        $handlerCalled = false;
        
        Event::on(
            ElementIndexerService::class,
            ElementIndexerService::EVENT_AFTER_INDEX_ELEMENT,
            function() use (&$handlerCalled) {
                $handlerCalled = true;
            }
        );
        
        // Trigger indexing
        $plugin = SearchWithElastic::getInstance();
        $entry = Entry::find()->one();
        $plugin->elementIndexerService->indexElement($entry);
        
        $this->assertTrue($handlerCalled);
    }
}
```

## Best Practices

1. **Use Type Hints**: Always use proper type hints for event parameters
2. **Handle Errors**: Wrap event handlers in try-catch blocks
3. **Document Events**: Document custom events and their parameters
4. **Test Handlers**: Write tests for complex event handlers
5. **Performance**: Keep event handlers lightweight and efficient
6. **Naming**: Use descriptive names for event handler methods
7. **Organization**: Group related event handlers in dedicated classes

The event system provides powerful hooks into the plugin's operations while maintaining clean separation of concerns and extensibility.