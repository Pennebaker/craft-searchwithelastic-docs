# Services API Reference

The Craft Search with Elastic plugin provides several service classes that expose APIs for interacting with Elasticsearch. All services are accessible through the main plugin instance.

## Service Access

All services are accessible via the plugin instance:

```php
use pennebaker\searchwithelastic\SearchWithElastic;

$plugin = SearchWithElastic::getInstance();

// Service access
$elasticsearch = $plugin->service;
$elementIndexer = $plugin->elementIndexerService;
$indexManagement = $plugin->indexManagementService;
$models = $plugin->models;
$queries = $plugin->queries;
$records = $plugin->records;
$reindexQueue = $plugin->reindexQueueManagementService;
```

## ElasticsearchService

The main service for Elasticsearch operations including search, connection testing, and index management.

**Service Property:** `$plugin->service`  
**Class:** `pennebaker\searchwithelastic\services\ElasticsearchService`

### Events

| Event Name | Trigger | Event Class |
|------------|---------|-------------|
| `EVENT_BEFORE_SEARCH` | Before executing a search query | `SearchEvent` |
| `EVENT_AFTER_SEARCH` | After executing a search query | `SearchEvent` |
| `EVENT_BEFORE_CONNECTION_TEST` | Before testing connection | `ConnectionTestEvent` |
| `EVENT_AFTER_CONNECTION_TEST` | After testing connection | `ConnectionTestEvent` |

### Methods

#### testConnection()

Tests the connection to the Elasticsearch server.

```php
public function testConnection(): bool
```

**Returns:** `bool` - `true` if connection succeeds, `false` otherwise.

**Example:**
```php
$plugin = SearchWithElastic::getInstance();
if ($plugin->service->testConnection()) {
    echo "Connection successful!";
} else {
    echo "Connection failed!";
}
```

#### search()

Performs a basic search with default parameters.

```php
public function search(string $query, ?int $siteId = null): array
```

**Parameters:**
- `$query` (string): The search query
- `$siteId` (?int): The site ID to search, or null for current site

**Returns:** `array` - Search results from Elasticsearch

**Example:**
```php
$results = $plugin->service->search('craft cms', 1);
foreach ($results as $hit) {
    echo $hit['_source']['title'];
}
```

#### advancedSearch()

Performs advanced search with configurable options.

```php
public function advancedSearch(string $query, array $options = []): array
```

**Parameters:**
- `$query` (string): The search query
- `$options` (array): Search configuration options

**Options Array:**
- `siteId` (?int): Site ID to search
- `fuzzy` (bool): Enable fuzzy matching (default: true)
- `fields` (array): Fields to search in (default: ['title', 'content'])
- `size` (int): Number of results to return (default: 50)

**Returns:** `array` - Search results from Elasticsearch

**Example:**
```php
$results = $plugin->service->advancedSearch('craft', [
    'siteId' => 1,
    'fuzzy' => true,
    'fields' => ['title', 'content', 'summary'],
    'size' => 20
]);
```

#### getElementIndex()

Retrieves element index record from the database.

```php
public function getElementIndex(Element $element): ?object
```

**Parameters:**
- `$element` (Element): The element to get the index record for

**Returns:** `?object` - Index record or null if not found

#### getElementIndexStatus()

Gets the indexing status of an element.

```php
public function getElementIndexStatus(Element $element): string
```

**Parameters:**
- `$element` (Element): The element to check

**Returns:** `string` - One of: 'indexed', 'partial', 'not_indexed', 'outdated'

**Example:**
```php
$entry = craft\elements\Entry::find()->one();
$status = $plugin->service->getElementIndexStatus($entry);

switch ($status) {
    case 'indexed':
        echo "Element is fully indexed";
        break;
    case 'partial':
        echo "Element is partially indexed (missing content)";
        break;
    case 'not_indexed':
        echo "Element is not indexed";
        break;
    case 'outdated':
        echo "Element index is outdated";
        break;
}
```

#### getIndexStats()

Gets basic index information for debugging.

```php
public function getIndexStats(string|int $indexOrSiteId): array
```

**Parameters:**
- `$indexOrSiteId` (string|int): Index name (string) or site ID (integer)

**Returns:** `array` - Index information including existence and document count

**Example:**
```php
$stats = $plugin->service->getIndexStats(1);
if ($stats['exists']) {
    echo "Index has {$stats['documentCount']} documents";
}
```

#### getAllIndexStats()

Gets statistics for all Craft-related indexes.

```php
public function getAllIndexStats(): array
```

**Returns:** `array` - Array of index statistics

#### getSampleDocument()

Gets a sample document from the index for debugging.

```php
public function getSampleDocument(int $siteId = null): array
```

**Parameters:**
- `$siteId` (?int): The site ID, or null for current site

**Returns:** `array` - Sample document to see what fields exist

#### isIndexInSync()

Checks if the index is in sync with all elements.

```php
public function isIndexInSync(): bool
```

**Returns:** `bool` - True if all indexes are in sync

#### getIndexableElementModels()

Gets indexable element models based on criteria.

```php
public function getIndexableElementModels(
    array $siteIds = null, 
    array $elementTypes = [], 
    string $reindexMode = 'reset'
): array
```

**Parameters:**
- `$siteIds` (?array): Site IDs to include, or null for all sites
- `$elementTypes` (array): Element types to include
- `$reindexMode` (string): Reindex mode: 'reset', 'all', 'missing', 'updated', 'missing-updated'

**Returns:** `array` - Array of indexable element models

## ElementIndexerService

Service for indexing individual elements in Elasticsearch.

**Service Property:** `$plugin->elementIndexerService`  
**Class:** `pennebaker\searchwithelastic\services\ElementIndexerService`

### Events

| Event Name | Trigger | Event Class |
|------------|---------|-------------|
| `EVENT_CONTENT_EXTRACTION` | During content extraction from HTML | `ContentExtractionEvent` |
| `EVENT_BEFORE_INDEX_ELEMENT` | Before indexing an element | `IndexElementEvent` |
| `EVENT_AFTER_INDEX_ELEMENT` | After indexing an element | `IndexElementEvent` |
| `EVENT_BEFORE_REMOVE_ELEMENT` | Before removing an element | `IndexElementEvent` |
| `EVENT_AFTER_REMOVE_ELEMENT` | After removing an element | `IndexElementEvent` |

### Methods

#### indexElement()

Indexes an element in Elasticsearch.

```php
public function indexElement(Element $element): IndexingResult
```

**Parameters:**
- `$element` (Element): The element to index

**Returns:** `IndexingResult` - The indexing result with status and details

**Example:**
```php
$entry = craft\elements\Entry::find()->one();
$result = $plugin->elementIndexerService->indexElement($entry);

if ($result->isSuccess()) {
    echo "Element indexed successfully";
} elseif ($result->isPartial()) {
    echo "Element partially indexed: " . $result->getMessage();
} else {
    echo "Indexing failed: " . $result->getMessage();
}
```

#### deleteElement()

Deletes an element from the Elasticsearch index.

```php
public function deleteElement(Element $element): int
```

**Parameters:**
- `$element` (Element): The element to delete

**Returns:** `int` - The number of indexes the element was deleted from

**Throws:** `IndexElementException` - If deletion fails

**Example:**
```php
$entry = craft\elements\Entry::find()->one();
$deletedCount = $plugin->elementIndexerService->deleteElement($entry);
echo "Element deleted from {$deletedCount} indexes";
```

## IndexManagementService

Service for managing Elasticsearch indexes.

**Service Property:** `$plugin->indexManagementService`  
**Class:** `pennebaker\searchwithelastic\services\IndexManagementService`

### Events

| Event Name | Trigger | Event Class |
|------------|---------|-------------|
| `EVENT_BEFORE_CREATE_INDEX` | Before creating an index | `IndexManagementEvent` |
| `EVENT_AFTER_CREATE_INDEX` | After creating an index | `IndexManagementEvent` |
| `EVENT_BEFORE_DELETE_INDEX` | Before deleting an index | `IndexManagementEvent` |
| `EVENT_AFTER_DELETE_INDEX` | After deleting an index | `IndexManagementEvent` |
| `EVENT_BEFORE_RECREATE_INDEX` | Before recreating an index | `IndexManagementEvent` |
| `EVENT_AFTER_RECREATE_INDEX` | After recreating an index | `IndexManagementEvent` |

### Methods

#### getIndexName()

Generates the Elasticsearch index name for a specific site and element type.

```php
public function getIndexName(int $siteId, ?string $elementType = null): string
```

**Parameters:**
- `$siteId` (int): The site ID
- `$elementType` (?string): The element type class name (optional)

**Returns:** `string` - The constructed index name

**Example:**
```php
$indexName = $plugin->indexManagementService->getIndexName(1, Entry::class);
echo $indexName; // Output: craft-entries_1
```

#### getAllIndexNames()

Retrieves all possible index names for a site.

```php
public function getAllIndexNames(int $siteId): array
```

**Parameters:**
- `$siteId` (int): The site ID

**Returns:** `array` - Array of index names for the site

#### createSiteIndex()

Creates an Elasticsearch index for the specified site.

```php
public function createSiteIndex(int $siteId): void
```

**Parameters:**
- `$siteId` (int): The site ID

**Throws:** 
- `\yii\elasticsearch\Exception` - When index creation fails
- `\Exception` - When other errors occur

#### removeSiteIndex()

Removes the Elasticsearch index for the specified site.

```php
public function removeSiteIndex(int $siteId): void
```

**Parameters:**
- `$siteId` (int): The site ID

**Throws:** `\Exception` - When index removal fails

#### recreateSiteIndex()

Recreates the Elasticsearch index for the specified site.

```php
public function recreateSiteIndex(int $siteId): void
```

**Parameters:**
- `$siteId` (int): The site ID

**Throws:** `\Exception` - When index recreation fails

#### recreateIndexesForAllSites()

Recreates Elasticsearch indexes for all sites.

```php
public function recreateIndexesForAllSites(): void
```

## ModelService

Service for managing indexable element models.

**Service Property:** `$plugin->models`  
**Class:** `pennebaker\searchwithelastic\services\ModelService`

### Events

| Event Name | Trigger | Event Class |
|------------|---------|-------------|
| `EVENT_BEFORE_CREATE_MODEL` | Before creating a model | `ModelEvent` |
| `EVENT_AFTER_CREATE_MODEL` | After creating a model | `ModelEvent` |

### Methods

#### createIndexableElementModel()

Creates an IndexableElementModel instance from a Craft element.

```php
public function createIndexableElementModel(Element $element, int $siteId): IndexableElementModel
```

**Parameters:**
- `$element` (Element): The Craft element to create a model for
- `$siteId` (int): The site ID for the element

**Returns:** `IndexableElementModel` - The created indexable element model

**Example:**
```php
$entry = craft\elements\Entry::find()->one();
$model = $plugin->models->createIndexableElementModel($entry, 1);

echo $model->elementId; // Element ID
echo $model->siteId;    // Site ID
echo $model->type;      // Element class name
```

## QueryService

Service for managing indexable element queries.

**Service Property:** `$plugin->queries`  
**Class:** `pennebaker\searchwithelastic\services\QueryService`

### Events

| Event Name | Trigger | Event Class |
|------------|---------|-------------|
| `EVENT_BEFORE_BUILD_QUERY` | Before building a query | `QueryEvent` |
| `EVENT_AFTER_BUILD_QUERY` | After building a query | `QueryEvent` |

### Methods

## New Generic Methods

The QueryService now provides generic methods that work with any supported element type, reducing code duplication and providing better extensibility.

#### getIndexableElementQuery()

**Generic query builder factory for indexable elements filtered by site.**

This is the recommended method for creating queries as it provides a unified interface for all supported element types.

```php
public function getIndexableElementQuery(string $elementType, int $siteId): IndexableElementQuery
```

**Parameters:**
- `$elementType` (string): The element type class name (e.g., `Entry::class`, `Asset::class`)
- `$siteId` (int): The site ID to filter by

**Returns:** `IndexableElementQuery` - The configured query for the specified element type

**Throws:** `\InvalidArgumentException` - If element type is not supported

**Example:**
```php
use craft\elements\Entry;
use craft\elements\Asset;
use craft\elements\Category;

// Create entry query
$entryQuery = $plugin->queries->getIndexableElementQuery(Entry::class, 1);
$entries = $entryQuery->entryTypes(['news', 'blog'])->all();

// Create asset query  
$assetQuery = $plugin->queries->getIndexableElementQuery(Asset::class, 1);
$assets = $assetQuery->volumeId(2)->all();

// Create category query
$categoryQuery = $plugin->queries->getIndexableElementQuery(Category::class, 1);
$categories = $categoryQuery->groupId(3)->all();
```

#### getElementQuery()

**Most generic method to create query for any supported element type.**

This method provides the most flexible interface for creating element queries.

```php
public function getElementQuery(string $elementType, int $siteId): mixed
```

**Parameters:**
- `$elementType` (string): The element type class name
- `$siteId` (int): The site ID to filter by

**Returns:** `mixed` - The configured query instance (return type varies by element type)

**Throws:** `\InvalidArgumentException` - If element type is not supported

**Example:**
```php
// Generic approach - works for any supported element type
$query = $plugin->queries->getElementQuery(\craft\elements\Entry::class, 1);
$elements = $query->limit(10)->all();
```

#### getSupportedElementTypes()

**Get all supported element types.**

```php
public function getSupportedElementTypes(): array
```

**Returns:** `array` - Array of supported element type class names

**Example:**
```php
$supportedTypes = $plugin->queries->getSupportedElementTypes();
foreach ($supportedTypes as $elementType) {
    echo "Supported: " . $elementType . "\n";
}
// Output:
// Supported: craft\elements\Asset
// Supported: craft\elements\Category  
// Supported: craft\elements\Entry
// Supported: craft\commerce\elements\Product (if Commerce installed)
// Supported: craft\digitalproducts\elements\Product (if Digital Products installed)
```

#### isElementTypeSupported()

**Check if an element type is supported.**

```php
public function isElementTypeSupported(string $elementType): bool
```

**Parameters:**
- `$elementType` (string): The element type class name

**Returns:** `bool` - True if the element type is supported

**Example:**
```php
if ($plugin->queries->isElementTypeSupported(\craft\elements\Entry::class)) {
    echo "Entries are supported";
}
```

#### createQueryForElements()

**Create queries for multiple element types.**

```php
public function createQueryForElements(array $elementTypes, int $siteId): array
```

**Parameters:**
- `$elementTypes` (array): Array of element type class names
- `$siteId` (int): The site ID to filter by

**Returns:** `array` - Array of queries keyed by element type

**Example:**
```php
$elementTypes = [
    \craft\elements\Entry::class,
    \craft\elements\Asset::class,
    \craft\elements\Category::class
];

$queries = $plugin->queries->createQueryForElements($elementTypes, 1);

foreach ($queries as $elementType => $query) {
    $count = $query->count();
    echo "{$elementType}: {$count} elements\n";
}
```

#### createQueryFromConfig()

**Create query from configuration array.**

```php
public function createQueryFromConfig(array $config): mixed
```

**Parameters:**
- `$config` (array): Configuration array with elementType, siteId, and optional parameters

**Returns:** `mixed` - The configured query instance

**Throws:** `\InvalidArgumentException` - If configuration is invalid

**Configuration Array:**
- `elementType` (string): Required - Element type class name
- `siteId` (int): Required - Site ID  
- Additional parameters: Any method available on the query class

**Example:**
```php
$config = [
    'elementType' => \craft\elements\Entry::class,
    'siteId' => 1,
    'entryTypes' => ['news', 'blog'],
    'limit' => 20,
    'status' => 'live'
];

$query = $plugin->queries->createQueryFromConfig($config);
$entries = $query->all();
```

#### validateQueryConfig()

**Validate query configuration.**

```php
public function validateQueryConfig(array $config): bool
```

**Parameters:**
- `$config` (array): Configuration array to validate

**Returns:** `bool` - True if configuration is valid

**Example:**
```php
$config = ['elementType' => \craft\elements\Entry::class, 'siteId' => 1];

if ($plugin->queries->validateQueryConfig($config)) {
    $query = $plugin->queries->createQueryFromConfig($config);
}
```

---

## Legacy Element-Specific Methods

The following methods are maintained for backward compatibility. **It's recommended to use the generic methods above for new implementations.**

#### getIndexableEntryQuery()

Creates a query builder for indexable entries filtered by site.

```php
public function getIndexableEntryQuery(int $siteId): IndexableEntryQuery
```

**Parameters:**
- `$siteId` (int): The site ID to filter by

**Returns:** `IndexableEntryQuery` - The configured entry query

**Example:**
```php
$entryQuery = $plugin->queries->getIndexableEntryQuery(1);
$entries = $entryQuery->entryTypes(['news', 'blog'])->all();
```

#### getIndexableAssetQuery()

Creates a query builder for indexable assets filtered by site.

```php
public function getIndexableAssetQuery(int $siteId): IndexableAssetQuery
```

**Parameters:**
- `$siteId` (int): The site ID to filter by

**Returns:** `IndexableAssetQuery` - The configured asset query

#### getIndexableCategoryQuery()

Creates a query builder for indexable categories filtered by site.

```php
public function getIndexableCategoryQuery(int $siteId): IndexableCategoryQuery
```

**Parameters:**
- `$siteId` (int): The site ID to filter by

**Returns:** `IndexableCategoryQuery` - The configured category query

#### getIndexableProductQuery()

Creates a query builder for indexable products filtered by site.

```php
public function getIndexableProductQuery(int $siteId): IndexableProductQuery
```

**Parameters:**
- `$siteId` (int): The site ID to filter by

**Returns:** `IndexableProductQuery` - The configured product query

#### getIndexableDigitalProductQuery()

Creates a query builder for indexable digital products filtered by site.

```php
public function getIndexableDigitalProductQuery(int $siteId): IndexableDigitalProductQuery
```

**Parameters:**
- `$siteId` (int): The site ID to filter by

**Returns:** `IndexableDigitalProductQuery` - The configured digital product query

## RecordService

Service for managing Elasticsearch records.

**Service Property:** `$plugin->records`  
**Class:** `pennebaker\searchwithelastic\services\RecordService`

### Events

| Event Name | Trigger | Event Class |
|------------|---------|-------------|
| `EVENT_BEFORE_SAVE_RECORD` | Before saving a record | `RecordEvent` |
| `EVENT_AFTER_SAVE_RECORD` | After saving a record | `RecordEvent` |
| `EVENT_BEFORE_DELETE_RECORD` | Before deleting a record | `RecordEvent` |
| `EVENT_AFTER_DELETE_RECORD` | After deleting a record | `RecordEvent` |

### Methods

#### getElementRecord()

Retrieves element record from Elasticsearch if it exists.

```php
public function getElementRecord(Element $element): ?object
```

**Parameters:**
- `$element` (Element): The element to look up

**Returns:** `?object` - The element record object or null if not found

#### getPendingElementsCount()

Returns the count of pending elements for a site.

```php
public function getPendingElementsCount(int $siteId): int
```

**Parameters:**
- `$siteId` (int): The site ID

**Returns:** `int` - Always returns 0 (no database tracking)

#### saveElementRecord()

Records element save operation.

```php
public function saveElementRecord(Element $element, string $documentId): bool
```

**Parameters:**
- `$element` (Element): The element being saved
- `$documentId` (string): The document ID in Elasticsearch

**Returns:** `bool` - Always returns true

#### deleteElementRecord()

Records element deletion operation.

```php
public function deleteElementRecord(Element $element): bool
```

**Parameters:**
- `$element` (Element): The element being deleted

**Returns:** `bool` - Always returns true

## ReindexQueueManagementService

Service for managing reindex queue operations.

**Service Property:** `$plugin->reindexQueueManagementService`  
**Class:** `pennebaker\searchwithelastic\services\ReindexQueueManagementService`

### Events

| Event Name | Trigger | Event Class |
|------------|---------|-------------|
| `EVENT_BEFORE_ENQUEUE_JOBS` | Before enqueuing jobs | `QueueEvent` |
| `EVENT_AFTER_ENQUEUE_JOBS` | After enqueuing jobs | `QueueEvent` |
| `EVENT_BEFORE_CLEAR_QUEUE` | Before clearing queue | `QueueEvent` |
| `EVENT_AFTER_CLEAR_QUEUE` | After clearing queue | `QueueEvent` |

### Methods

#### enqueueReindexJobs()

Enqueues reindex jobs for multiple indexable element models.

```php
public function enqueueReindexJobs(array $indexableElementModels): void
```

**Parameters:**
- `$indexableElementModels` (array): Array of IndexableElementModel instances

#### clearJobs()

Clears all tracked reindex jobs from the cache.

```php
public function clearJobs(): void
```

#### removeJob()

Removes a specific job from the tracking cache.

```php
public function removeJob(int $id): void
```

**Parameters:**
- `$id` (int): The job ID to remove

#### enqueueJob()

Enqueues a single reindex job and tracks it in cache.

```php
public function enqueueJob(int $elementId, int $siteId, string $elementType): int
```

**Parameters:**
- `$elementId` (int): The element ID to index
- `$siteId` (int): The site ID
- `$elementType` (string): The element type class name

**Returns:** `int` - The job ID

**Example:**
```php
$jobId = $plugin->reindexQueueManagementService->enqueueJob(
    123, // element ID
    1,   // site ID
    Entry::class
);
echo "Queued job with ID: {$jobId}";
```

## Performance Considerations

### Connection Management

The plugin manages Elasticsearch connections efficiently:

- Connections are established on-demand
- Connection pooling is handled by the underlying Elasticsearch client
- Connections are automatically closed when operations complete

### Batch Operations

For bulk operations, use the queue management service:

```php
// Good: Use bulk operations
$models = $plugin->service->getIndexableElementModels();
$plugin->reindexQueueManagementService->enqueueReindexJobs($models);

// Avoid: Individual synchronous operations
foreach ($entries as $entry) {
    $plugin->elementIndexerService->indexElement($entry); // Slow
}
```

### Memory Management

When working with large datasets:

- Use queries with limits and offsets
- Process elements in batches
- Clear object references when done

```php
// Process in batches
$query = $plugin->queries->getIndexableEntryQuery(1);
$total = $query->count();
$batchSize = 100;

for ($offset = 0; $offset < $total; $offset += $batchSize) {
    $entries = $query->offset($offset)->limit($batchSize)->all();
    
    foreach ($entries as $entry) {
        $plugin->elementIndexerService->indexElement($entry);
    }
    
    // Clear memory
    unset($entries);
}
```

## Error Handling

All service methods use appropriate error handling:

- Methods throw documented exceptions for recoverable errors
- Critical errors are logged to Craft's error log
- Connection errors are handled gracefully with fallbacks

```php
try {
    $result = $plugin->elementIndexerService->indexElement($entry);
    if (!$result->isSuccess()) {
        \Craft::warning("Indexing failed: " . $result->getMessage());
    }
} catch (\pennebaker\searchwithelastic\exceptions\IndexElementException $e) {
    \Craft::error("Critical indexing error: " . $e->getMessage());
}
```