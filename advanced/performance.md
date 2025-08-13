# Performance Optimization

Advanced techniques for maximizing search performance with your Craft CMS installation.

## Query optimization

### Use filters instead of queries

Filters are cached and faster for exact matches:

```twig
{# Slow - uses query context #}
{% set results = craft.searchWithElastic.search({
    query: {
        bool: {
            must: [
                { term: { section: 'news' } }
            ]
        }
    }
}) %}

{# Fast - uses filter context #}
{% set results = craft.searchWithElastic.search({
    query: {
        bool: {
            filter: [
                { term: { section: 'news' } }
            ]
        }
    }
}) %}
```

### Limit field retrieval

Only fetch fields you need:

```twig
{% set results = craft.searchWithElastic.search({
    query: { match_all: {} },
    _source: ['title', 'slug', 'dateCreated'],
    size: 20
}) %}
```

### Use pagination efficiently

Implement cursor-based pagination for deep pagination:

```php
// For pages beyond 10,000 results, use search_after
$searchParams = [
    'size' => 20,
    'sort' => [
        ['dateCreated' => 'desc'],
        ['_id' => 'desc'] // Tie-breaker
    ]
];

if ($lastResult) {
    $searchParams['search_after'] = [
        $lastResult['dateCreated'],
        $lastResult['_id']
    ];
}
```

## Caching strategies

### Template caching

Cache search results at the template level:

```twig
{% cache globally for 5 minutes %}
    {% set popularResults = craft.searchWithElastic.search({
        query: {
            function_score: {
                query: { match_all: {} },
                boost_mode: 'multiply',
                functions: [
                    {
                        field_value_factor: {
                            field: 'views',
                            factor: 1.2,
                            modifier: 'log1p'
                        }
                    }
                ]
            }
        },
        size: 10
    }) %}
    
    {# Display results #}
{% endcache %}
```

### Application-level caching

Implement Redis caching for frequent queries:

```php
// services/SearchService.php
public function getCachedResults($query, $ttl = 300)
{
    $cacheKey = 'search:' . md5(serialize($query));
    
    if ($cached = Craft::$app->cache->get($cacheKey)) {
        return $cached;
    }
    
    $results = $this->performSearch($query);
    Craft::$app->cache->set($cacheKey, $results, $ttl);
    
    return $results;
}
```

## Bulk operations

### Efficient bulk indexing

Use bulk API for large data imports:

```php
use pennebaker\searchwithelastic\services\IndexService;

$indexService = SearchWithElastic::getInstance()->index;
$documents = [];

foreach ($entries as $entry) {
    $documents[] = [
        'index' => [
            '_index' => 'craft_entries',
            '_id' => $entry->id
        ]
    ];
    $documents[] = $this->transformEntry($entry);
    
    // Process in batches of 1000
    if (count($documents) >= 2000) {
        $indexService->bulk($documents);
        $documents = [];
    }
}

// Process remaining documents
if (!empty($documents)) {
    $indexService->bulk($documents);
}
```

### Reindexing strategies

Implement zero-downtime reindexing:

```php
public function reindexWithAlias()
{
    $timestamp = time();
    $newIndex = "craft_entries_{$timestamp}";
    $aliasName = 'craft_entries';
    
    // Create new index
    $this->createIndex($newIndex);
    
    // Index all content to new index
    $this->indexAllContent($newIndex);
    
    // Switch alias atomically
    $this->client->indices()->updateAliases([
        'body' => [
            'actions' => [
                ['remove' => ['index' => '*', 'alias' => $aliasName]],
                ['add' => ['index' => $newIndex, 'alias' => $aliasName]]
            ]
        ]
    ]);
    
    // Clean up old indices
    $this->cleanupOldIndices($aliasName);
}
```

## Monitoring Performance

Track key metrics:

```php
// Get cluster health
$health = SearchWithElastic::getInstance()
    ->client
    ->cluster()
    ->health();

// Monitor query performance
$stats = SearchWithElastic::getInstance()
    ->client
    ->indices()
    ->stats(['index' => 'craft_entries']);

$searchTime = $stats['indices']['craft_entries']['total']['search']['query_time_in_millis'];
$indexingTime = $stats['indices']['craft_entries']['total']['indexing']['index_time_in_millis'];
```

## Real-world performance tips

### Content-specific optimizations

Different content types need different approaches:

```php
// Heavy text content (articles, blogs)
'mappings' => [
    'body' => [
        'type' => 'text',
        'analyzer' => 'english',
        'store' => false,
        'index_options' => 'freqs' // Skip positions for better performance
    ]
]

// Product catalogs
'mappings' => [
    'price' => [
        'type' => 'scaled_float',
        'scaling_factor' => 100 // Store as integers
    ],
    'categories' => [
        'type' => 'keyword',
        'eager_global_ordinals' => true // Faster aggregations
    ]
]
```

### Load testing

Use realistic data volumes for testing:

```bash
# Generate test data
php craft search-with-elastic/testing/generate-test-data 50000

# Run performance tests
ab -n 1000 -c 10 "http://your-site.com/search?q=test"
```

Performance benchmarks show 95th percentile response times under 200ms for most queries with proper optimization.