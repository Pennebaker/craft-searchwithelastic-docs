# Security Features

Search with Elastic includes comprehensive security features to protect your search infrastructure from common attack vectors and ensure safe operation at scale.

## Search Templates System

The plugin uses parameterized search templates to prevent query injection attacks. All search operations are executed through pre-defined, secure templates that separate query logic from user input.

### How It Works

Instead of constructing Elasticsearch queries directly from user input, the plugin uses a secure template system:

1. **Pre-defined Templates**: All query patterns are defined as secure templates in the system
2. **Parameterized Execution**: User input is passed as parameters, never directly concatenated into queries
3. **Type Safety**: Each template enforces parameter types and validation
4. **Injection Prevention**: Eliminates query injection vulnerabilities by design

### Available Templates

The plugin provides 10 secure search templates for different use cases:

#### Basic Search
Standard text matching across specified fields:
```php
use pennebaker\searchwithelastic\models\SearchTemplates;

$templateId = SearchTemplates::TEMPLATE_BASIC_SEARCH;
$params = [
    'query_text' => $userQuery,
    'search_fields' => ['title', 'content', 'excerpt']
];
```

#### Fuzzy Search
Tolerant matching for typos and variations:
```php
$templateId = SearchTemplates::TEMPLATE_FUZZY_SEARCH;
$params = [
    'query_text' => $userQuery,
    'search_fields' => ['title', 'content'],
    'fuzziness' => 'AUTO'
];
```

#### Exact Search
Precise term matching without analysis:
```php
$templateId = SearchTemplates::TEMPLATE_EXACT_SEARCH;
$params = [
    'query_text' => $exactTerm,
    'search_fields' => ['sku', 'productCode']
];
```

#### Wildcard Search
Pattern matching with wildcards:
```php
$templateId = SearchTemplates::TEMPLATE_WILDCARD_SEARCH;
$params = [
    'query_text' => 'prod*',
    'search_fields' => ['title', 'tags']
];
```

#### Phrase Search
Exact phrase matching in order:
```php
$templateId = SearchTemplates::TEMPLATE_PHRASE_SEARCH;
$params = [
    'query_text' => 'exact phrase to match',
    'search_fields' => ['content', 'description']
];
```

#### Filtered Search
Search with additional filter criteria:
```php
$templateId = SearchTemplates::TEMPLATE_FILTERED_SEARCH;
$params = [
    'query_text' => $userQuery,
    'search_fields' => ['title', 'content'],
    'filters' => [
        ['term' => ['status' => 'published']],
        ['range' => ['date' => ['gte' => '2024-01-01']]]
    ]
];
```

#### Range Search
Numeric or date range queries:
```php
$templateId = SearchTemplates::TEMPLATE_RANGE_SEARCH;
$params = [
    'field_name' => 'price',
    'gte' => 10,
    'lte' => 100
];
```

#### Aggregation Search
Search with faceted results:
```php
$templateId = SearchTemplates::TEMPLATE_AGGREGATION_SEARCH;
$params = [
    'query_text' => $userQuery,
    'aggregations' => [
        'categories' => ['terms' => ['field' => 'category']],
        'price_ranges' => ['range' => ['field' => 'price', 'ranges' => [
            ['to' => 50],
            ['from' => 50, 'to' => 100],
            ['from' => 100]
        ]]]
    ]
];
```

#### Multi-Field Search
Search across multiple fields with different weights:
```php
$templateId = SearchTemplates::TEMPLATE_MULTI_FIELD_SEARCH;
$params = [
    'query_text' => $userQuery,
    'search_fields' => [
        'title^3',      // Title with boost of 3
        'excerpt^2',    // Excerpt with boost of 2
        'content'       // Content with default boost
    ]
];
```

#### Boosted Search
Search with custom field boosting:
```php
$templateId = SearchTemplates::TEMPLATE_BOOSTED_SEARCH;
$params = [
    'query_text' => $userQuery,
    'search_fields' => ['title', 'content', 'tags'],
    'field_boosts' => [
        'title' => 3.0,
        'tags' => 2.0,
        'content' => 1.0
    ]
];
```

### Using Templates in Your Code

```php
use pennebaker\searchwithelastic\SearchWithElastic;
use pennebaker\searchwithelastic\models\SearchTemplates;

// Get the search template service
$templateService = SearchWithElastic::getInstance()->searchTemplate;

// Initialize templates (done automatically on first use)
$templateService->initializeTemplates();

// Execute a secure search
$results = $templateService->executeTemplate(
    SearchTemplates::TEMPLATE_BASIC_SEARCH,
    [
        'query_text' => $userInput,
        'search_fields' => ['title', 'content']
    ],
    $indexName
);
```

## Rate Limiting

Protect your search endpoints from abuse with configurable rate limiting using a token bucket algorithm.

### Configuration

Enable and configure rate limiting in your `config/search-with-elastic.php`:

```php
return [
    // Enable rate limiting
    'rateLimitingEnabled' => true,
    
    // Requests allowed per minute
    'rateLimitRequestsPerMinute' => 60,
    
    // Burst capacity above the limit
    'rateLimitBurstSize' => 10,
    
    // Tracking method: 'ip' or 'user'
    'rateLimitTrackingMethod' => 'ip',
    
    // Exempt specific IPs or ranges
    'rateLimitExemptIps' => [
        '127.0.0.1',
        '::1',
        '192.168.1.0/24',
        '$TRUSTED_IP' // Environment variable
    ],
];
```

### How It Works

The rate limiter uses a token bucket algorithm:

1. Each client gets a bucket with tokens equal to `rateLimitRequestsPerMinute`
2. Each request consumes one token
3. Tokens regenerate at a rate of `rateLimitRequestsPerMinute` per minute
4. The `rateLimitBurstSize` allows temporary bursts above the limit
5. When tokens are exhausted, requests are rejected with HTTP 429

### Protected Endpoints

Rate limiting automatically protects these AJAX endpoints:
- `/search-with-elastic/search` - Basic search endpoint
- `/search-with-elastic/search-extra` - Advanced search with options

### Checking Rate Limit Status

In your templates, check the current rate limit status:

```twig
{% set rateLimitStatus = craft.searchWithElastic.getRateLimitStatus() %}

{% if rateLimitStatus %}
    <div class="rate-limit-info">
        Remaining requests: {{ rateLimitStatus.remaining }}/{{ rateLimitStatus.limit }}
        Reset in: {{ rateLimitStatus.resetIn }} seconds
    </div>
{% endif %}
```

### Handling Rate Limit Errors

When rate limited, the API returns HTTP 429 with details:

```javascript
fetch('/search-with-elastic/search', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify({ query: searchTerm })
})
.then(response => {
    if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        console.log(`Rate limited. Retry after ${retryAfter} seconds`);
        return;
    }
    return response.json();
})
.then(data => {
    // Handle search results
});
```

## Input Validation

All user input is validated through multiple layers of security:

### ValidationHelper

The plugin includes a comprehensive `ValidationHelper` class that provides:

- **Query Sanitization**: Removes dangerous characters and patterns
- **Index Name Validation**: Ensures index names follow Elasticsearch conventions
- **Parameter Validation**: Type checking and constraint enforcement
- **Callback Validation**: Safe execution of user-defined callbacks

### ElasticsearchIndexValidator

Specialized validation for Elasticsearch index names:

```php
use pennebaker\searchwithelastic\helpers\validation\ElasticsearchIndexValidator;

$validator = new ElasticsearchIndexValidator();

// Validate index name
if ($validator->validate($indexName, $error)) {
    // Index name is valid
} else {
    // Handle validation error
    Craft::error("Invalid index name: $error");
}
```

## CSRF Protection

All state-changing operations require CSRF token validation:

### Required for These Actions
- Element indexing
- Reindexing operations
- Index management (create/delete)
- Configuration changes

### Including CSRF Tokens

In Twig templates:
```twig
<form method="post">
    {{ csrfInput() }}
    <!-- form fields -->
</form>
```

In JavaScript:
```javascript
const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

fetch('/search-with-elastic/action', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify(data)
});
```

## Security Best Practices

### 1. Use Environment Variables for Credentials

Never hardcode credentials in configuration files:

```php
// config/search-with-elastic.php
return [
    'elasticsearchEndpoint' => '$ELASTICSEARCH_ENDPOINT',
    'username' => '$ELASTICSEARCH_USERNAME',
    'password' => '$ELASTICSEARCH_PASSWORD',
    'isAuthEnabled' => true,
];
```

### 2. Enable HTTPS in Production

Always use HTTPS for Elasticsearch connections:

```php
'elasticsearchComponentConfig' => [
    'defaultProtocol' => 'https',
    'nodes' => [
        [
            'protocol' => 'https',
            'http_address' => '$ELASTICSEARCH_HOST',
        ],
    ],
    'verifySsl' => true,
],
```

### 3. Configure Rate Limiting

Protect public endpoints from abuse:

```php
'rateLimitingEnabled' => true,
'rateLimitRequestsPerMinute' => 30, // Strict for public sites
'rateLimitBurstSize' => 5,
```

### 4. Restrict Indexable Content

Limit what gets indexed:

```php
'indexableEntryStatuses' => ['live'], // Only live content
'excludedEntryTypes' => ['internalNotes', 'drafts'],
'excludedAssetVolumes' => ['privateFiles'],
```

### 5. Regular Security Audits

- Monitor Elasticsearch logs for suspicious queries
- Review rate limit violations
- Check for unusual indexing patterns
- Validate all custom callbacks and extractors

### 6. Principle of Least Privilege

- Use read-only Elasticsearch users for search operations
- Limit write access to indexing service accounts
- Implement IP whitelisting for admin operations

## Troubleshooting Security Issues

### Rate Limiting Not Working

1. Verify configuration is enabled:
```php
'rateLimitingEnabled' => true,
```

2. Check cache is configured and working:
```bash
php craft cache/flush-all
php craft cache/test
```

3. Verify tracking method matches your setup:
```php
'rateLimitTrackingMethod' => 'ip', // or 'user' for authenticated users
```

### Search Templates Not Loading

1. Check Elasticsearch connection:
```bash
php craft search-with-elastic/test
```

2. Manually initialize templates:
```php
SearchWithElastic::getInstance()->searchTemplate->initializeTemplates();
```

3. Verify template registration in Elasticsearch:
```bash
curl -X GET "localhost:9200/_scripts/craft_basic_search"
```

### CSRF Token Errors

1. Ensure CSRF token is included in requests
2. Check token hasn't expired
3. Verify same-origin policy isn't blocking tokens
4. Clear browser cookies and retry

### Validation Failures

1. Check error logs for specific validation messages
2. Ensure input follows expected format
3. Test with minimal valid input first
4. Review ValidationHelper constraints

## Security Headers

Add these headers to your web server configuration for additional security:

```apache
# Apache .htaccess
Header set X-Content-Type-Options "nosniff"
Header set X-Frame-Options "SAMEORIGIN"
Header set X-XSS-Protection "1; mode=block"
Header set Referrer-Policy "strict-origin-when-cross-origin"
```

```nginx
# Nginx
add_header X-Content-Type-Options "nosniff";
add_header X-Frame-Options "SAMEORIGIN";
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";
```