# Security Services API

Documentation for the security-related services provided by the plugin.

## SearchTemplateService

The `SearchTemplateService` manages secure, parameterized search templates that prevent query injection attacks.

### Basic Usage

```php
use pennebaker\searchwithelastic\SearchWithElastic;

// Get the template service
$templateService = SearchWithElastic::getInstance()->searchTemplate;

// Initialize all templates (done automatically on first use)
$templateService->initializeTemplates();

// Execute a search template
$results = $templateService->executeTemplate(
    'craft_basic_search',
    [
        'query_text' => $userInput,
        'search_fields' => ['title', 'content']
    ],
    'craft-elements_1' // Index name
);
```

### Available Methods

#### initializeTemplates()

Registers all search templates with Elasticsearch.

```php
public function initializeTemplates(): bool
```

**Returns:** `bool` - True if all templates were successfully initialized

**Throws:** `Exception` - If template initialization fails

**Example:**
```php
try {
    $success = $templateService->initializeTemplates();
    if ($success) {
        Craft::info('Templates initialized successfully');
    }
} catch (Exception $e) {
    Craft::error('Template initialization failed: ' . $e->getMessage());
}
```

#### executeTemplate()

Executes a search template with provided parameters.

```php
public function executeTemplate(
    string $templateId, 
    array $params, 
    string $indexName
): array
```

**Parameters:**
- `$templateId` - The template identifier (use constants from `SearchTemplates` model)
- `$params` - Parameters to pass to the template
- `$indexName` - The Elasticsearch index to search

**Returns:** Array of search results

**Throws:** 
- `InvalidArgumentException` - If required parameters are missing
- `Exception` - If template execution fails

**Example:**
```php
use pennebaker\searchwithelastic\models\SearchTemplates;

// Fuzzy search example
$results = $templateService->executeTemplate(
    SearchTemplates::TEMPLATE_FUZZY_SEARCH,
    [
        'query_text' => 'elastcsearch', // Typo will be handled
        'search_fields' => ['title', 'content'],
        'fuzziness' => 'AUTO'
    ],
    $indexName
);
```

#### validateTemplateParameters()

Validates parameters for a specific template.

```php
public function validateTemplateParameters(
    string $templateId, 
    array $params
): bool
```

**Parameters:**
- `$templateId` - The template identifier
- `$params` - Parameters to validate

**Returns:** `bool` - True if parameters are valid

**Example:**
```php
$params = [
    'query_text' => $userInput,
    'search_fields' => ['title']
];

if ($templateService->validateTemplateParameters('craft_basic_search', $params)) {
    // Parameters are valid, proceed with search
    $results = $templateService->executeTemplate('craft_basic_search', $params, $indexName);
}
```

#### getTemplate()

Retrieves a specific template definition.

```php
public function getTemplate(string $templateId): ?array
```

**Parameters:**
- `$templateId` - The template identifier

**Returns:** Template definition array or null if not found

**Example:**
```php
$template = $templateService->getTemplate('craft_basic_search');
if ($template) {
    // Inspect template structure
    $source = json_decode($template['source'], true);
}
```

#### clearTemplateCache()

Clears the internal template cache.

```php
public function clearTemplateCache(): void
```

**Example:**
```php
// Clear cache after updating templates
$templateService->clearTemplateCache();
$templateService->initializeTemplates();
```

## RateLimiterService

The `RateLimiterService` implements token bucket algorithm for rate limiting search endpoints.

### Basic Usage

```php
use pennebaker\searchwithelastic\SearchWithElastic;

// Get the rate limiter service
$rateLimiter = SearchWithElastic::getInstance()->rateLimiter;

// Check if request is allowed
if ($rateLimiter->allowRequest()) {
    // Process search
} else {
    // Return 429 Too Many Requests
    throw new TooManyRequestsHttpException();
}
```

### Available Methods

#### allowRequest()

Checks if a request should be allowed based on rate limiting rules.

```php
public function allowRequest(?string $identifier = null): bool
```

**Parameters:**
- `$identifier` - Optional custom identifier (defaults to automatic detection)

**Returns:** `bool` - True if request is allowed

**Example:**
```php
// Automatic identifier detection (IP or user)
if (!$rateLimiter->allowRequest()) {
    return $this->asJson([
        'error' => 'Rate limit exceeded',
        'retry_after' => $rateLimiter->getRetryAfter()
    ])->setStatusCode(429);
}

// Custom identifier
$customId = 'api_key_' . $apiKey;
if ($rateLimiter->allowRequest($customId)) {
    // Process request
}
```

#### consumeTokens()

Consumes multiple tokens from the rate limit bucket.

```php
public function consumeTokens(
    ?string $identifier = null, 
    int $tokens = 1
): void
```

**Parameters:**
- `$identifier` - Optional custom identifier
- `$tokens` - Number of tokens to consume

**Throws:** `TooManyRequestsHttpException` - If rate limit exceeded

**Example:**
```php
// Consume multiple tokens for expensive operations
try {
    $rateLimiter->consumeTokens(null, 5); // Expensive operation costs 5 tokens
    performExpensiveSearch();
} catch (TooManyRequestsHttpException $e) {
    // Handle rate limit exceeded
}
```

#### getStatus()

Gets the current rate limit status for an identifier.

```php
public function getStatus(?string $identifier = null): array
```

**Parameters:**
- `$identifier` - Optional custom identifier

**Returns:** Array with status information

**Example:**
```php
$status = $rateLimiter->getStatus();
// Returns:
// [
//     'remaining' => 45,
//     'limit' => 60,
//     'reset_at' => 1704067200,
//     'reset_in' => 35
// ]
```

#### getRetryAfter()

Gets the number of seconds until rate limit resets.

```php
public function getRetryAfter(?string $identifier = null): int
```

**Parameters:**
- `$identifier` - Optional custom identifier

**Returns:** Seconds until reset

**Example:**
```php
if (!$rateLimiter->allowRequest()) {
    $retryAfter = $rateLimiter->getRetryAfter();
    
    return $this->asJson(['error' => 'Rate limited'])
        ->setStatusCode(429)
        ->headers->set('Retry-After', $retryAfter);
}
```

#### isExempt()

Checks if an identifier is exempt from rate limiting.

```php
public function isExempt(string $identifier): bool
```

**Parameters:**
- `$identifier` - The identifier to check

**Returns:** `bool` - True if exempt

**Example:**
```php
$ip = Craft::$app->request->getUserIP();
if ($rateLimiter->isExempt($ip)) {
    // Process without rate limiting
}
```

#### reset()

Resets rate limit for a specific identifier.

```php
public function reset(?string $identifier = null): void
```

**Parameters:**
- `$identifier` - Optional custom identifier

**Example:**
```php
// Reset rate limit for a user after subscription upgrade
$userId = 'user_' . $user->id;
$rateLimiter->reset($userId);
```

## ValidationHelper

The `ValidationHelper` provides comprehensive input validation for search operations.

### Basic Usage

```php
use pennebaker\searchwithelastic\helpers\validation\ValidationHelper;

// Validate search query
$cleanQuery = ValidationHelper::validateSearchQuery($userInput);

// Validate index name
if (ValidationHelper::validateIndexName($indexName)) {
    // Index name is safe to use
}
```

### Available Methods

#### validateSearchQuery()

Sanitizes and validates search query input.

```php
public static function validateSearchQuery(
    string $query, 
    array $options = []
): string
```

**Parameters:**
- `$query` - The search query to validate
- `$options` - Optional validation options

**Returns:** Sanitized query string

**Example:**
```php
$options = [
    'max_length' => 1000,
    'allow_wildcards' => true,
    'strip_html' => true
];

$cleanQuery = ValidationHelper::validateSearchQuery($userInput, $options);
```

#### validateIndexName()

Validates Elasticsearch index names.

```php
public static function validateIndexName(string $indexName): bool
```

**Parameters:**
- `$indexName` - The index name to validate

**Returns:** `bool` - True if valid

**Example:**
```php
$indexName = 'craft-elements_1';
if (ValidationHelper::validateIndexName($indexName)) {
    // Safe to use with Elasticsearch
} else {
    throw new InvalidArgumentException('Invalid index name');
}
```

#### validateFieldNames()

Validates field names for search operations.

```php
public static function validateFieldNames(array $fields): array
```

**Parameters:**
- `$fields` - Array of field names

**Returns:** Array of validated field names

**Example:**
```php
$fields = ['title', 'content', 'invalid!field'];
$validFields = ValidationHelper::validateFieldNames($fields);
// Returns: ['title', 'content']
```

#### validateNumericRange()

Validates numeric range parameters.

```php
public static function validateNumericRange(
    $value, 
    $min = null, 
    $max = null
): ?float
```

**Parameters:**
- `$value` - The value to validate
- `$min` - Minimum allowed value
- `$max` - Maximum allowed value

**Returns:** Validated float or null if invalid

**Example:**
```php
$size = ValidationHelper::validateNumericRange($request->getParam('size'), 1, 100);
if ($size === null) {
    $size = 10; // Default
}
```

#### sanitizeHighlight()

Sanitizes HTML in search result highlights.

```php
public static function sanitizeHighlight(
    string $text, 
    array $allowedTags = ['mark']
): string
```

**Parameters:**
- `$text` - Text containing highlights
- `$allowedTags` - HTML tags to allow

**Returns:** Sanitized HTML string

**Example:**
```php
$highlight = '<mark>search term</mark> <script>alert("xss")</script>';
$safe = ValidationHelper::sanitizeHighlight($highlight);
// Returns: '<mark>search term</mark> '
```

## CallbackValidator

The `CallbackValidator` ensures safe execution of user-defined callbacks.

### Basic Usage

```php
use pennebaker\searchwithelastic\helpers\validation\CallbackValidator;

$validator = new CallbackValidator();

// Validate a callback
if ($validator->validate($callback)) {
    $result = $validator->execute($callback, $element);
}
```

### Available Methods

#### validate()

Validates a callback for safe execution.

```php
public function validate($callback): bool
```

**Parameters:**
- `$callback` - The callback to validate

**Returns:** `bool` - True if callback is safe

**Example:**
```php
$callback = function($element) {
    return $element->title;
};

if ($validator->validate($callback)) {
    // Callback is safe to execute
}
```

#### execute()

Safely executes a validated callback.

```php
public function execute(
    callable $callback, 
    ...$args
): mixed
```

**Parameters:**
- `$callback` - The callback to execute
- `$args` - Arguments to pass to callback

**Returns:** Callback result

**Throws:** `Exception` - If execution fails

**Example:**
```php
try {
    $result = $validator->execute($callback, $element);
} catch (Exception $e) {
    Craft::error('Callback execution failed: ' . $e->getMessage());
    $result = null;
}
```

#### setSafeClasses()

Sets classes considered safe for callbacks.

```php
public function setSafeClasses(array $classes): void
```

**Parameters:**
- `$classes` - Array of safe class names

**Example:**
```php
$validator->setSafeClasses([
    'craft\elements\Entry',
    'craft\elements\Asset',
    'MyCustomClass'
]);
```

## ElasticsearchIndexValidator

Validates Elasticsearch index names according to naming rules.

### Basic Usage

```php
use pennebaker\searchwithelastic\helpers\validation\ElasticsearchIndexValidator;

$validator = new ElasticsearchIndexValidator();

if ($validator->validate($indexName, $error)) {
    // Index name is valid
} else {
    // Handle error
    Craft::error("Invalid index name: $error");
}
```

### Available Methods

#### validate()

Validates an index name.

```php
public function validate(
    string $indexName, 
    ?string &$error = null
): bool
```

**Parameters:**
- `$indexName` - The index name to validate
- `$error` - Variable to store error message

**Returns:** `bool` - True if valid

**Example:**
```php
$indexName = 'my-index_123';
$error = null;

if (!$validator->validate($indexName, $error)) {
    throw new InvalidArgumentException($error);
}
```

#### sanitize()

Sanitizes an index name to make it valid.

```php
public function sanitize(string $indexName): string
```

**Parameters:**
- `$indexName` - The index name to sanitize

**Returns:** Sanitized index name

**Example:**
```php
$unsafeName = 'My Index!@#';
$safeName = $validator->sanitize($unsafeName);
// Returns: 'my-index'
```

## Integration Examples

### Secure Search Implementation

```php
use pennebaker\searchwithelastic\SearchWithElastic;
use pennebaker\searchwithelastic\models\SearchTemplates;
use pennebaker\searchwithelastic\helpers\validation\ValidationHelper;
use yii\web\TooManyRequestsHttpException;

class SecureSearchService
{
    public function search(string $query, array $options = []): array
    {
        $plugin = SearchWithElastic::getInstance();
        
        // Rate limiting check
        if (!$plugin->rateLimiter->allowRequest()) {
            throw new TooManyRequestsHttpException(
                'Rate limit exceeded',
                429,
                ['Retry-After' => $plugin->rateLimiter->getRetryAfter()]
            );
        }
        
        // Validate and sanitize input
        $cleanQuery = ValidationHelper::validateSearchQuery($query);
        $validFields = ValidationHelper::validateFieldNames(
            $options['fields'] ?? ['title', 'content']
        );
        
        // Execute secure template
        try {
            $results = $plugin->searchTemplate->executeTemplate(
                SearchTemplates::TEMPLATE_BASIC_SEARCH,
                [
                    'query_text' => $cleanQuery,
                    'search_fields' => $validFields
                ],
                $this->getIndexName()
            );
            
            // Sanitize highlights in results
            foreach ($results as &$result) {
                if (isset($result['highlight'])) {
                    foreach ($result['highlight'] as $field => &$highlights) {
                        $highlights = array_map(
                            [ValidationHelper::class, 'sanitizeHighlight'],
                            $highlights
                        );
                    }
                }
            }
            
            return $results;
            
        } catch (Exception $e) {
            Craft::error('Search failed: ' . $e->getMessage(), __METHOD__);
            throw new ServerErrorHttpException('Search service unavailable');
        }
    }
    
    private function getIndexName(): string
    {
        $siteId = Craft::$app->sites->currentSite->id;
        return "craft-elements_{$siteId}";
    }
}
```

### Custom Rate Limiting Rules

```php
use pennebaker\searchwithelastic\SearchWithElastic;

class CustomRateLimiter
{
    public function checkRateLimit($user = null): bool
    {
        $rateLimiter = SearchWithElastic::getInstance()->rateLimiter;
        
        if ($user && $user->isInGroup('premium')) {
            // Premium users get higher limits
            $identifier = 'premium_' . $user->id;
            $rateLimiter->setLimit($identifier, 200); // 200 requests per minute
        } elseif ($user) {
            // Regular users
            $identifier = 'user_' . $user->id;
            $rateLimiter->setLimit($identifier, 100);
        } else {
            // Anonymous users use IP-based limiting
            $identifier = null; // Uses automatic IP detection
        }
        
        return $rateLimiter->allowRequest($identifier);
    }
    
    public function getRateLimitHeaders($identifier = null): array
    {
        $rateLimiter = SearchWithElastic::getInstance()->rateLimiter;
        $status = $rateLimiter->getStatus($identifier);
        
        return [
            'X-RateLimit-Limit' => $status['limit'],
            'X-RateLimit-Remaining' => $status['remaining'],
            'X-RateLimit-Reset' => $status['reset_at']
        ];
    }
}
```

### Example: Advanced Template Usage

This example shows how you could use the template service to build custom search functionality in your own module:

```php
use pennebaker\searchwithelastic\SearchWithElastic;
use pennebaker\searchwithelastic\models\SearchTemplates;

// EXAMPLE CODE - This demonstrates how to use the template service
// These specific search methods are not built into the plugin
class MyCustomSearchModule
{
    private $templateService;
    
    public function __construct()
    {
        $this->templateService = SearchWithElastic::getInstance()->searchTemplates;
    }
    
    public function searchWithFilters(
        string $query,
        array $filters,
        array $aggregations = []
    ): array {
        // Build filter array
        $filterArray = [];
        foreach ($filters as $field => $value) {
            $filterArray[] = ['term' => [$field => $value]];
        }
        
        // Execute filtered search with aggregations
        return $this->templateService->executeTemplate(
            SearchTemplates::TEMPLATE_FILTERED_SEARCH,
            [
                'query_text' => $query,
                'search_fields' => ['title', 'content', 'excerpt'],
                'filters' => $filterArray,
                'aggregations' => $aggregations
            ],
            $this->getIndexName()
        );
    }
    
    private function getIndexName(): string
    {
        return 'craft-elements_' . Craft::$app->sites->currentSite->id;
    }
}
```