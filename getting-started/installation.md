---
title: Installation Guide
description: Complete installation guide for Search with Elastic
---

# Installation Guide

This guide walks you through installing and configuring Search with Elastic.

## Prerequisites

Before beginning, ensure your environment meets the [system requirements](/getting-started/requirements):

- **Craft CMS** 4.x
- **PHP** 8.x
- **Elasticsearch** 7.x or 8.x (must be available and accessible)

## Step 1: Verify Elasticsearch

Test that Elasticsearch is available and running:

::: code-group

```bash [cURL]
curl -X GET "localhost:9200/_cluster/health?pretty"
```

```bash [Browser]
# Visit in your browser:
http://localhost:9200/_cluster/health
```

:::

You should see a response like:

```json
{
  "cluster_name": "elasticsearch",
  "status": "green",
  "timed_out": false,
  "number_of_nodes": 1
}
```

## Step 2: Install the Plugin

Install Search with Elastic via Composer:

::: code-group

```bash [Composer]
composer require pennebaker/craft-searchwithelastic
```

```bash [DDEV]
ddev composer require pennebaker/craft-searchwithelastic
```

```bash [Docker]
docker-compose exec web composer require pennebaker/craft-searchwithelastic
```

:::

## Step 3: Install in Craft

1. Navigate to **Settings → Plugins** in your Craft control panel
2. Find "Search with Elastic" and click **Install**
3. Or install via CLI:

```bash
php craft plugin/install search-with-elastic
```

## Step 4: Basic Configuration

### Access Plugin Settings

Go to **Settings → Plugins → Search with Elastic → Settings**

### Connection Settings

Configure your Elasticsearch connection:

| Setting | Value | Description |
|---------|-------|-------------|
| **Elasticsearch Endpoint** | `localhost:9200` | Your Elasticsearch server URL |
| **Enable Authentication** | `false` | Enable if using auth |
| **Username** | (optional) | HTTP Basic auth username |
| **Password** | (optional) | HTTP Basic auth password |

::: code-group

```php [config/search-with-elastic.php]
<?php

return [
    // Connection settings
    'elasticsearchEndpoint' => env('ELASTICSEARCH_ENDPOINT') ?: 'localhost:9200',
    'isAuthEnabled' => env('ELASTICSEARCH_AUTH_ENABLED') ?: false,
    'username' => env('ELASTICSEARCH_USERNAME') ?: '',
    'password' => env('ELASTICSEARCH_PASSWORD') ?: '',
    
    // Index configuration
    'indexPrefix' => env('ELASTICSEARCH_INDEX_PREFIX') ?: 'craft-',
    'fallbackIndexName' => 'elements',
    
    // Element filtering
    'indexableEntryStatuses' => ['pending', 'live'],
    'indexableProductStatuses' => ['pending', 'live'],
    'indexableDigitalProductStatuses' => ['pending', 'live'],
    'indexableCategoryStatuses' => ['enabled'],
    
    // Frontend content fetching
    'enableFrontendFetching' => true,
    'indexElementsWithoutUrls' => true,
    
    // Asset handling
    'assetKinds' => ['pdf', 'text', 'json', 'xml'],
    'frontendFetchingAssetKinds' => ['text', 'json', 'xml', 'javascript', 'html'],
];
```

```env [.env]
# Elasticsearch Configuration
ELASTICSEARCH_ENDPOINT=localhost:9200
ELASTICSEARCH_AUTH_ENABLED=false
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
ELASTICSEARCH_INDEX_PREFIX=craft-
```

:::

### Index Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| **Index Prefix** | `craft-` | Prefix for all index names |
| **Fallback Index Name** | `elements` | Default index suffix |

Your indexes will be named: `{prefix}{indexName}-{siteId}`

Example: `craft-elements-1`, `craft-products-1`

## Step 5: Test Connection

### Via Control Panel

1. Go to plugin settings
2. Click **Test Connection** button
3. Verify you see a green success message

### Via CLI

```bash
php craft search-with-elastic/elasticsearch/test-connection
```

Expected output:
```
Testing Elasticsearch connection...
✓ Successfully connected to localhost:9200
```

## Step 6: Initial Indexing

### Create Indexes

Create empty indexes for all sites:

```bash
php craft search-with-elastic/elasticsearch/recreate-empty-indexes
```

### Index Your Content

Start with a small test to verify everything works:

::: code-group

```bash [All Content]
php craft search-with-elastic/elasticsearch/reindex-all
```

```bash [Just Entries]
php craft search-with-elastic/elasticsearch/reindex-entries
```

```bash [Just Assets]
php craft search-with-elastic/elasticsearch/reindex-assets
```

:::

You should see output like:
```
Reindexing 150 entries ...
    - [1/150] Reindexing Homepage (1) ... done
    - [2/150] Reindexing About Us (2) ... done
    ...
Done reindexing entries.
```

## Step 7: Verify Installation

### Check Index Status

Visit your Elasticsearch endpoint to verify indexes were created:

```bash
curl -X GET "localhost:9200/_cat/indices?v"
```

You should see indexes like:
```
health status index           uuid                   pri rep docs.count
green  open   craft-elements-1 4rF8tOFxTdK... 1   0        150
```

### Test Search Functionality

Create a simple test template to verify search works:

```twig
{# templates/search/test.twig #}
{% set query = craft.searchWithElastic.search()
    .query('test')
    .limit(10) %}

{% set results = query.all() %}

<h1>Search Test</h1>
<p>Found {{ results | length }} results</p>

{% for result in results %}
    <div>
        <h3>{{ result.title }}</h3>
        <p>{{ result.url }}</p>
    </div>
{% endfor %}
```

## Configuration Options

### Element Type Settings

Configure which content gets indexed:

```php
// config/search-with-elastic.php
return [
    // Exclude specific entry types
    'excludedEntryTypes' => ['systemPages', 'redirects'],
    
    // Exclude asset volumes
    'excludedAssetVolumes' => ['cache', 'temp'],
    
    // Exclude category groups
    'excludedCategoryGroups' => ['internal'],
    
    // Asset file types to index
    'assetKinds' => ['pdf', 'text', 'json', 'xml', 'html'],
];
```

### Advanced Configuration

```php
// config/search-with-elastic.php
return [
    // Custom index names per element type
    'elementTypeIndexNames' => [
        'craft\\elements\\Entry' => 'content',
        'craft\\elements\\Asset' => 'files', 
        'craft\\commerce\\elements\\Product' => 'products',
    ],
    
    // Search result highlighting
    'highlight' => [
        'pre_tags' => '<mark>',
        'post_tags' => '</mark>',
    ],
    
    // Custom content extraction
    'contentExtractorCallback' => function($html) {
        // Custom HTML processing logic
        return strip_tags($html);
    },
];
```

## Troubleshooting

### Common Issues

**Connection Failed**
```
✗ Failed to connect to localhost:9200
```

**Solutions:**
- Verify Elasticsearch is running: `curl localhost:9200`
- Verify endpoint URL in settings
- Check authentication credentials

**Memory Issues During Indexing**
```
Fatal error: Allowed memory size exhausted
```

**Solutions:**
- Increase PHP memory limit: `ini_set('memory_limit', '1G')`
- Index content types separately
- Use queue workers for large sites

**Permission Errors**
```
403 Forbidden: cluster_block_exception
```

**Solutions:**
- Check Elasticsearch disk space
- Verify authentication settings
- Check Elasticsearch logs

### Debug Mode

Enable debug logging in your Craft config:

```php
// config/app.php
return [
    'components' => [
        'log' => [
            'targets' => [
                [
                    'class' => craft\log\FileTarget::class,
                    'logFile' => '@storage/logs/search-elastic.log',
                    'categories' => ['pennebaker\searchwithelastic\*'],
                    'logVars' => [],
                ],
            ],
        ],
    ],
];
```

## Next Steps

Now that installation is complete:

1. **[Follow the Quick Start guide](/getting-started/quick-start)** for immediate setup
2. **Configure element filtering** to match your content strategy
3. **Set up search templates** for your frontend
4. **Explore advanced features** like custom callbacks and events

