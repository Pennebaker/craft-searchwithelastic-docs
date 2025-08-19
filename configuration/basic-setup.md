# Basic Configuration

Configure Search with Elastic plugin settings.

## Quick Start Configuration

Create a `config/search-with-elastic.php` file with recommended security settings:

:::code-group

```php [Recommended Setup]
<?php

return [
    // Elasticsearch connection
    'elasticsearchEndpoint' => getenv('ELASTICSEARCH_ENDPOINT'),
    'isAuthEnabled' => true,
    
    // Authentication credentials
    'username' => getenv('ELASTICSEARCH_USERNAME'),
    'password' => getenv('ELASTICSEARCH_PASSWORD'),
    
    // Rate limiting (recommended)
    'rateLimitingEnabled' => true,
    'rateLimitRequestsPerMinute' => 60,
    'rateLimitBurstSize' => 10,
    
    // Index settings
    'indexPrefix' => 'craft-',
    'enableFrontendFetching' => true,
];
```

```php [Simple Setup]
<?php

return [
    // Basic connection (development only)
    'elasticsearchEndpoint' => 'localhost:9200',
    'isAuthEnabled' => false,
    
    // Minimal settings
    'indexPrefix' => 'craft-',
    'fallbackIndexName' => 'elements',
];
```

```yaml [docker-compose.yml]
version: '3.8'
services:
  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

volumes:
  elasticsearch_data:
```

```bash [.env]
# Basic environment variables
ELASTICSEARCH_ENDPOINT=elasticsearch:9200
ELASTICSEARCH_AUTH_ENABLED=false
```

:::

## Connection settings

Configure how the plugin connects to your Elasticsearch instance.

### Elasticsearch endpoint

The `elasticsearchEndpoint` setting defines where your Elasticsearch server runs. It supports both traditional `hostname:port` format and full URLs with protocols:

```php
// Local development (hostname:port format)
'elasticsearchEndpoint' => 'localhost:9200',

// Docker container (hostname:port format)
'elasticsearchEndpoint' => 'elasticsearch:9200',

// Full URL with protocol (recommended for remote servers)
'elasticsearchEndpoint' => 'https://my-elasticsearch.example.com:9200',

// Using environment variables (recommended for production)
'elasticsearchEndpoint' => '$ELASTICSEARCH_ENDPOINT',
```

::: tip Protocol Handling
- If no protocol is specified in `hostname:port` format, the plugin will use HTTP by default
- Full URLs with `https://` will use HTTPS
- Environment variables are automatically parsed using Craft's `App::parseEnv()`
:::

### Authentication

Configure authentication for your Elasticsearch instance:

```php
// Enable authentication
'isAuthEnabled' => true,
'username' => getenv('ELASTICSEARCH_USERNAME'),
'password' => getenv('ELASTICSEARCH_PASSWORD'),
```

### Rate Limiting

Protect against search abuse with configurable rate limits:

```php
// Enable rate limiting
'rateLimitingEnabled' => true,

// Requests allowed per minute
'rateLimitRequestsPerMinute' => 60,

// Burst size for sudden traffic
'rateLimitBurstSize' => 10,

// Tracking method: 'ip' or 'user'
'rateLimitTrackingMethod' => 'ip',
```

#### Rate Limiting in Templates

```twig
{# Check rate limit status #}
{% set rateLimit = craft.searchWithElastic.getRateLimitStatus() %}

{% if rateLimit.enabled %}
    <div class="rate-info">
        Searches remaining: {{ rateLimit.remaining }} / {{ rateLimit.limit }}
    </div>
{% endif %}
```

## Security Configuration

Configure security settings for the plugin.

### Rate limiting

Prevent abuse and DoS attacks on your search endpoints:

```php
// Enable rate limiting
'rateLimitingEnabled' => true,

// Requests allowed per minute (default: 60)
'rateLimitRequestsPerMinute' => 60,

// Extra burst capacity (default: 10)
'rateLimitBurstSize' => 10,

// Track by IP address or user ID
'rateLimitTrackingMethod' => 'ip', // 'ip' or 'user'

// Exempt trusted IPs
'rateLimitExemptIps' => [
    '127.0.0.1',
    '::1',
    '192.168.1.0/24',
    '$TRUSTED_IP_ADDRESS',
],
```

#### Configuration examples

:::code-group

```php [Public site]
// Strict limits for public websites
'rateLimitingEnabled' => true,
'rateLimitRequestsPerMinute' => 30,
'rateLimitBurstSize' => 5,
'rateLimitTrackingMethod' => 'ip',
```

```php [Authenticated users]
// More lenient for logged-in users
'rateLimitingEnabled' => true,
'rateLimitRequestsPerMinute' => 120,
'rateLimitBurstSize' => 20,
'rateLimitTrackingMethod' => 'user',
```

```php [Development]
// Disabled for local development
'rateLimitingEnabled' => false,
```

```php [Internal network]
// Exempt internal network from limits
'rateLimitingEnabled' => true,
'rateLimitRequestsPerMinute' => 60,
'rateLimitExemptIps' => [
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16',
],
```

:::

### Secure credentials

Best practices for managing Elasticsearch credentials:

```php
// RECOMMENDED: Use environment variables
return [
    'elasticsearchEndpoint' => '$ELASTICSEARCH_ENDPOINT',
    'isAuthEnabled' => true,
    'username' => '$ELASTICSEARCH_USERNAME',
    'password' => '$ELASTICSEARCH_PASSWORD',
];
```

Set environment variables in your `.env` file:

```bash
ELASTICSEARCH_ENDPOINT="https://secure-es.example.com:9200"
ELASTICSEARCH_USERNAME="search_user"
ELASTICSEARCH_PASSWORD="secure_password_here"
```

::: tip Production security
- Always use HTTPS in production
- Create read-only Elasticsearch users for search operations
- Use strong, unique passwords
- Rotate credentials regularly
- Never expose Elasticsearch directly to the internet
:::

## Index configuration

Control how the plugin creates and names Elasticsearch indexes.

### Index naming structure

The plugin creates indexes using this pattern: `{prefix}{indexName}_{siteId}`

```php
// Results in indexes like: craft-elements_1, craft-elements_2
'indexPrefix' => 'craft-',
'fallbackIndexName' => 'elements',

// Custom prefix for multiple Craft instances
'indexPrefix' => 'mysite-',
'fallbackIndexName' => 'content',
// Results in: mysite-content_1, mysite-content_2

// No prefix
'indexPrefix' => '',
'fallbackIndexName' => 'elements',
// Results in: elements_1, elements_2
```

### Element-specific indexes

Override index names for specific element types:

```php
'elementTypeIndexNames' => [
    'craft\\elements\\Entry' => 'entries',        // craft-entries_1
    'craft\\elements\\Asset' => 'assets',         // craft-assets_1
    'craft\\elements\\Category' => 'categories',  // craft-categories_1
    'craft\\commerce\\elements\\Product' => 'products', // craft-products_1
],
```

Leave empty to use the fallback name:

```php
'elementTypeIndexNames' => [
    'craft\\elements\\Entry' => '',     // Uses fallback: craft-elements_1
    'craft\\elements\\Asset' => '',     // Uses fallback: craft-elements_1
],
```

## Content indexing

Configure what content gets indexed and how it's processed.

### Element types and statuses

Choose which element statuses to include in your search index:

:::code-group

```php [Entries]
// Include pending and live entries
'indexableEntryStatuses' => ['pending', 'live'],

// Only live entries
'indexableEntryStatuses' => ['live'],

// Include expired entries for search history
'indexableEntryStatuses' => ['pending', 'live', 'expired'],
```

```php [Categories]
// Only enabled categories
'indexableCategoryStatuses' => ['enabled'],

// Include disabled categories
'indexableCategoryStatuses' => ['enabled', 'disabled'],
```

```php [Commerce products]
// Pending and live products
'indexableProductStatuses' => ['pending', 'live'],

// Only live products
'indexableProductStatuses' => ['live'],
```

:::

### Asset indexing

Control which asset types get indexed:

```php
// Only PDF files
'assetKinds' => ['pdf'],

// Text-based assets
'assetKinds' => ['pdf', 'text', 'html', 'json', 'xml'],

// Document formats
'assetKinds' => ['pdf', 'word', 'excel', 'powerpoint'],

// All asset types (metadata only for non-text formats)
'assetKinds' => ['pdf', 'text', 'html', 'json', 'xml', 'word', 'excel', 'powerpoint', 'image', 'video', 'audio'],
```

Available asset kinds:
- `pdf`, `word`, `excel`, `powerpoint` - Documents
- `text`, `html`, `json`, `xml`, `javascript`, `php` - Text files  
- `image`, `video`, `audio` - Media files (metadata only)
- `compressed`, `flash`, `illustrator`, `photoshop` - Other formats

## Frontend content fetching

The plugin can fetch rendered HTML content from your site's frontend URLs to include in the search index.

### Basic frontend fetching

```php
// Enable frontend content fetching (default)
'enableFrontendFetching' => true,

// Disable to index only element metadata
'enableFrontendFetching' => false,

// Index elements without URLs using their metadata
'indexElementsWithoutUrls' => true,
```

### Asset frontend fetching

Configure which asset types should have their content fetched from frontend URLs:

```php
// No frontend fetching for assets (default)
'frontendFetchingAssetKinds' => [],

// Fetch content for text-based assets
'frontendFetchingAssetKinds' => ['text', 'html', 'json', 'xml'],

// Include JavaScript and PHP files
'frontendFetchingAssetKinds' => ['text', 'html', 'json', 'xml', 'javascript', 'php'],
```

## Exclusions

Exclude specific content types from indexing entirely.

### Exclude element types

```php
// Exclude specific entry types by handle
'excludedEntryTypes' => ['internalPages', 'adminNotes'],

// Exclude asset volumes by handle
'excludedAssetVolumes' => ['privateFiles', 'adminAssets'],

// Exclude category groups by handle
'excludedCategoryGroups' => ['internalCategories'],

// Commerce exclusions
'excludedProductTypes' => ['internalProducts'],
'excludedDigitalProductTypes' => ['adminOnly'],
```

### Exclude from frontend fetching

Skip frontend content fetching for specific element types while still indexing their metadata:

```php
'excludedFrontendFetchingEntryTypes' => ['news', 'internalPages'],
'excludedFrontendFetchingAssetVolumes' => ['privateFiles'],
'excludedFrontendFetchingCategoryGroups' => ['internalCategories'],
'excludedFrontendFetchingProductTypes' => ['internalProducts'],
'excludedFrontendFetchingDigitalProductTypes' => ['adminOnly'],
```

## Search result highlighting

Configure how search terms are highlighted in results:

:::code-group

```php [HTML highlighting]
'highlight' => [
    'pre_tags'  => '<mark>',
    'post_tags' => '</mark>',
],
```

```php [Custom highlighting]
'highlight' => [
    'pre_tags'  => '<span class="highlight">',
    'post_tags' => '</span>',
],
```

```php [No highlighting]
'highlight' => [
    'pre_tags'  => '',
    'post_tags' => '',
],
```

:::

## Testing your configuration

After setting up your configuration:

1. **Test the connection**: Go to Settings → Search with Elastic in your Craft control panel
2. **Reindex content**: Use the utility or console command:
   ```bash
   php craft search-with-elastic/index/reindex-all
   ```
3. **Verify indexes**: Check that indexes were created in Elasticsearch:
   ```bash
   curl http://localhost:9200/_cat/indices
   ```

## Next steps

- [Environment-specific configuration](./environment-config.md) for production deployments
- [Index settings](./index-settings.md) for performance optimization
- [Multi-site configuration](./multi-site.md) for complex setups