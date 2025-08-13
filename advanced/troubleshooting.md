# Troubleshooting guide

Common issues and their solutions when working with Search with Elastic.

## Connection issues

### Elasticsearch server unreachable

**Symptoms:**
- "Connection refused" errors
- Timeout exceptions during search
- Plugin shows "Disconnected" status

**Solutions:**

Check Elasticsearch service status:
```bash
# Linux/Mac
sudo systemctl status elasticsearch

# Windows
sc query elasticsearch
```

Verify connection settings:
```php
// config/search-with-elastic.php
return [
    'host' => 'localhost:9200',
    'username' => 'elastic',
    'password' => 'your-password',
    'ssl' => false,
    'timeout' => 30
];
```

Test connection manually:
```bash
curl -X GET "localhost:9200/_cluster/health?pretty"
```

### SSL/TLS certificate issues

**Symptoms:**
- "SSL certificate verification failed"
- "SSL connection error"

**Solutions:**

Disable SSL verification for development:
```php
return [
    'client' => [
        'verify' => false,
        'timeout' => 30
    ]
];
```

For production, add proper certificates:
```php
return [
    'client' => [
        'ca_bundle' => '/path/to/ca-certificates.crt'
    ]
];
```

## Rate Limiting Issues

### Rate limiting not working

**Symptoms:**
- Unlimited requests being processed
- No 429 responses when testing
- Rate limit headers missing

**Solutions:**

1. Verify rate limiting is enabled:
```php
// config/search-with-elastic.php
return [
    'rateLimitingEnabled' => true,
    'rateLimitRequestsPerMinute' => 60,
];
```

2. Check cache is configured:
```bash
# Test cache functionality
php craft cache/flush-all
php craft cache/test
```

3. Verify tracking method matches your setup:
```php
// For anonymous users
'rateLimitTrackingMethod' => 'ip',

// For authenticated users only
'rateLimitTrackingMethod' => 'user',
```

4. Check rate limit status programmatically:
```php
$rateLimiter = SearchWithElastic::getInstance()->rateLimiter;
$status = $rateLimiter->getStatus();
Craft::info('Rate limit status: ' . json_encode($status), __METHOD__);
```

### Getting rate limited too quickly

**Symptoms:**
- HTTP 429 errors during normal usage
- "Too Many Requests" responses
- Search functionality blocked

**Solutions:**

1. Increase rate limits:
```php
'rateLimitRequestsPerMinute' => 120, // Double the default
'rateLimitBurstSize' => 20, // Allow more burst capacity
```

2. Exempt trusted IPs:
```php
'rateLimitExemptIps' => [
    '127.0.0.1',
    '::1',
    '192.168.1.0/24', // Internal network
    '$TRUSTED_IP_1', // From environment
],
```

3. Implement client-side throttling:
```javascript
// Debounce search input
let searchTimeout;
function debounceSearch(query) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        performSearch(query);
    }, 300); // 300ms delay
}
```

### Rate limit headers missing

**Symptoms:**
- No `X-RateLimit-*` headers in responses
- Can't determine remaining requests
- No retry-after information

**Solutions:**

1. Check web server configuration allows custom headers:
```apache
# Apache
Header always set X-RateLimit-Limit "expr=%{env:RATE_LIMIT}"
Header always set X-RateLimit-Remaining "expr=%{env:RATE_REMAINING}"
```

```nginx
# Nginx
add_header X-RateLimit-Limit $rate_limit;
add_header X-RateLimit-Remaining $rate_remaining;
```

2. Verify headers aren't being stripped by proxy/CDN
3. Test directly against the server without intermediaries

### Cache-related rate limit issues

**Symptoms:**
- Rate limits reset unexpectedly
- Inconsistent rate limiting behavior
- Limits not persisting between requests

**Solutions:**

1. Use persistent cache storage like Redis or database caching instead of file-based caching.

2. Increase cache duration:
```php
// In RateLimiterService (for reference)
private const CACHE_DURATION = 3600; // 1 hour
```

3. Monitor cache performance:
```bash
php craft cache/info
```

## Indexing problems

### Documents not appearing in search

**Debug steps:**

1. Check if documents are indexed:
```bash
php craft search-with-elastic/debug/count-documents
```

2. Verify index mapping:
```bash
php craft search-with-elastic/debug/show-mapping entries
```

3. Check for indexing errors:
```bash
php craft search-with-elastic/debug/show-logs --level=error
```

**Common causes:**

- **Wrong field types:** Text stored as keyword prevents full-text search
- **Disabled entries:** Draft or disabled entries aren't indexed by default
- **Permission issues:** Check user permissions for entry sections

### Slow indexing performance

**Symptoms:**
- Queue jobs timing out
- Long delays between content updates and search availability

**Solutions:**

Optimize bulk indexing:
```php
// config/search-with-elastic.php
return [
    'bulkIndexing' => [
        'batchSize' => 500, // Reduce batch size if needed
        'maxRetries' => 3,
        'refreshInterval' => '30s'
    ]
];
```

Enable async indexing:
```php
return [
    'queueJobs' => true,
    'indexingMode' => 'async'
];
```

Monitor queue processing:
```bash
php craft queue/info
php craft queue/run
```

## Search query issues

### No results for valid queries

**Debug process:**

1. Test query directly:
```twig
{% set debug = craft.searchWithElastic.search({
    query: { match_all: {} }
}) %}
{{ dump(debug) }}
```

2. Check analyzer behavior:
```bash
php craft search-with-elastic/debug/analyze-text "your search term"
```

3. Validate query structure:
```php
// Log actual Elasticsearch query
SearchWithElastic::getInstance()->client->search([
    'index' => 'craft_entries',
    'body' => $query,
    'client' => ['verbose' => true]
]);
```

**Common fixes:**

Wrong analyzer configuration:
```php
// Fix: Use appropriate analyzer
'mappings' => [
    'title' => [
        'type' => 'text',
        'analyzer' => 'standard' // Not 'keyword' for full-text
    ]
]
```

Case sensitivity issues:
```twig
{# Use case-insensitive search #}
{% set results = craft.searchWithElastic.search({
    query: {
        match: {
            title: {
                query: searchTerm,
                operator: 'and'
            }
        }
    }
}) %}
```

### Relevance scoring problems

**Issue:** Results appear in wrong order

**Solutions:**

Boost important fields:
```php
'query' => [
    'multi_match' => [
        'query' => $searchTerm,
        'fields' => [
            'title^3',    // 3x boost
            'body^1',     // Normal relevance
            'tags^2'      // 2x boost
        ]
    ]
]
```

Use function scoring:
```php
'query' => [
    'function_score' => [
        'query' => ['match_all' => new \stdClass()],
        'functions' => [
            [
                'filter' => ['term' => ['featured' => true]],
                'boost_factor' => 2
            ],
            [
                'field_value_factor' => [
                    'field' => 'views',
                    'factor' => 1.2,
                    'modifier' => 'log1p'
                ]
            ]
        ]
    ]
]
```

## Memory and performance issues

### Out of memory errors

**Symptoms:**
- PHP fatal errors during large operations
- High server load during search

**Solutions:**

Increase PHP memory limit:
```php
// config/app.php
'components' => [
    'searchWithElastic' => [
        'memoryLimit' => '512M'
    ]
]
```

Limit result sets:
```php
return [
    'searchSettings' => [
        'maxResults' => 1000,
        'defaultSize' => 20
    ]
];
```

Use result pagination:
```twig
{% set results = craft.searchWithElastic.search({
    query: query,
    from: (currentPage - 1) * 20,
    size: 20
}) %}
```

### Query timeout errors

**Symptoms:**
- "Request timeout" exceptions
- Incomplete search results
- Long page load times

**Solutions:**

Increase timeout settings:
```php
return [
    'client' => [
        'timeout' => 60, // seconds
        'connection_timeout' => 10
    ]
];
```

Optimize complex queries:
```php
// Use filters instead of queries when possible
'query' => [
    'bool' => [
        'filter' => [
            ['term' => ['section' => 'news']],
            ['range' => ['dateCreated' => ['gte' => 'now-1y']]]
        ],
        'must' => [
            ['match' => ['title' => $searchTerm]]
        ]
    ]
]
```

## Multi-site issues

### Wrong site content in results

**Debug:**
```twig
{% for result in results %}
    Site ID: {{ result._source.siteId }}
    Current Site: {{ currentSite.id }}
{% endfor %}
```

**Fix site filtering:**
```php
// Ensure site-specific queries
$query['query']['bool']['filter'][] = [
    'term' => ['siteId' => Craft::$app->sites->currentSite->id]
];
```

### Inconsistent cross-site search

**Solution:**
```php
// config/search-with-elastic.php
return [
    'multiSite' => [
        'indexPerSite' => false, // Single index for all sites
        'crossSiteSearch' => true
    ]
];
```

## Debug mode and logging

### Enable verbose logging

```php
// config/search-with-elastic.php
return [
    'logging' => [
        'enabled' => true,
        'level' => 'debug',
        'logQueries' => true,
        'logResults' => false // Disable in production
    ]
];
```

### View debug information

```bash
# Show recent error logs
php craft search-with-elastic/debug/show-logs --hours=24

# Export index statistics
php craft search-with-elastic/debug/export-stats > debug-info.json

# Test specific queries
php craft search-with-elastic/debug/test-query "your search term"
```

### Check system requirements

```bash
# Verify system compatibility
php craft search-with-elastic/debug/system-check

# Test Elasticsearch features
php craft search-with-elastic/debug/feature-test
```

## Common error messages

### "No alive nodes found"

**Cause:** Elasticsearch is down or unreachable

**Solution:**
1. Restart Elasticsearch service
2. Check network connectivity
3. Verify Elasticsearch is running

### "Index not found exception"

**Cause:** Index was deleted or never created

**Solution:**
```bash
php craft search-with-elastic/index/create-all
php craft search-with-elastic/index/populate
```

### "Mapping conflict" errors

**Cause:** Field type mismatch between documents

**Solution:**
```bash
# Delete and recreate index with correct mapping
php craft search-with-elastic/index/delete entries
php craft search-with-elastic/index/create entries
php craft search-with-elastic/index/populate entries
```


## Getting help

When reporting issues, include:

- Plugin version and Craft CMS version
- Elasticsearch version and configuration
- Error messages and stack traces
- Index mapping and settings
- Sample queries that fail

Use the debug export command to gather diagnostic information:
```bash
php craft search-with-elastic/debug/export-full-report
```

This creates a comprehensive report you can share when seeking support.