---
title: Quick Start Guide
description: Get Search with Elastic configured and running
---

# Quick Start Guide

This guide will help you configure Search with Elastic and get it running. This guide assumes you have Elasticsearch already available.

## Prerequisites
- **Craft CMS** 4.x
- **PHP** 8.x
- **Elasticsearch** 7.x or 8.x (must be available and accessible)

## Step 1: Install Plugin

Install via Composer:

```bash
composer require pennebaker/craft-searchwithelastic
```

Install in Craft:

```bash
php craft plugin/install search-with-elastic
```

## Step 2: Verify Elasticsearch

Verify Elasticsearch is running:

```bash
curl -s localhost:9200/_cluster/health | grep -o '"status":"[^"]*"'
```

Expected: `"status":"green"` or `"status":"yellow"`

## Step 3: Configure Connection

Go to **Settings → Plugins → Search with Elastic → Settings**

**Minimal required settings:**

| Field | Value |
|-------|-------|
| Elasticsearch Endpoint | `localhost:9200` |
| Enable Authentication | ☐ (unchecked) |

Click **Save** and verify you see the green "✓ Connection successful" message.

## Step 4: Index Your Content

Create indexes and add content:

```bash
# Create empty indexes
php craft search-with-elastic/index/recreate-empty-indexes

# Index all content (or start small with just entries)
php craft search-with-elastic/index/reindex-entries
```

You'll see progress output:
```
Reindexing 25 entries ...
    - [1/25] Reindexing Homepage (1) ... done
    - [2/25] Reindexing About (2) ... done
    ...
Done reindexing entries.
```

## Step 5: Test Search

Create a test template at `templates/search-test.twig`:

```twig
{# Quick search test #}
{% set searchTerm = craft.app.request.getQueryParam('q', 'home') %}
{% set results = craft.searchWithElastic.search(searchTerm) %}

<h1>Search Test</h1>
<p>Searching for: "{{ searchTerm }}"</p>
<p>Found: {{ results|length }} results</p>

{% for result in results %}
<div style="border: 1px solid #ccc; margin: 10px; padding: 10px;">
    <h3>{{ result.title }}</h3>
    <p>{{ result.url }}</p>
    <small>Type: {{ result.elementType }}</small>
</div>
{% endfor %}

<hr>
<form>
    <input type="text" name="q" value="{{ searchTerm }}" placeholder="Search...">
    <button type="submit">Search</button>
</form>
```

Visit `/search-test` in your browser and try searching!

## Setup Complete

You now have Elasticsearch-powered search running. Your content is indexed and searchable.

## What You Just Set Up

- ✅ Plugin installed and connected to Elasticsearch
- ✅ Default configuration (indexes all live entries, assets, categories)
- ✅ Content indexed and searchable
- ✅ Basic search functionality working

## Quick Customization

### Index More Content Types

```bash
# Add assets (PDFs, documents)
php craft search-with-elastic/index/reindex-assets

# Add categories  
php craft search-with-elastic/index/reindex-categories

# Everything at once
php craft search-with-elastic/index/reindex-all
```

### Basic Search Template

Replace your test template with a proper search page:

```twig
{# templates/search.twig #}
{% set searchTerm = craft.app.request.getQueryParam('q', '') %}
{% set results = searchTerm ? craft.searchWithElastic.search(searchTerm) : [] %}

<div class="search-page">
    <form class="search-form">
        <input type="text" name="q" value="{{ searchTerm }}" 
               placeholder="Search..." required>
        <button type="submit">Search</button>
    </form>

    {% if searchTerm %}
        <h2>{{ results|length }} results for "{{ searchTerm }}"</h2>
        
        {% for result in results %}
            <article class="search-result">
                <h3><a href="{{ result.url }}">{{ result.title }}</a></h3>
                {% if result.summary %}
                    <p>{{ result.summary|striptags|slice(0, 200) }}...</p>
                {% endif %}
                <small>{{ result.elementType }} • {{ result.dateUpdated|date('M j, Y') }}</small>
            </article>
        {% endfor %}
    {% endif %}
</div>
```

### Filter by Content Type

```twig
{# The search results include an elementType field that can be used for filtering #}
{% set allResults = craft.searchWithElastic.search(searchTerm) %}

{# Filter results by type after searching #}
{% set entryResults = allResults|filter(r => r._source.elementType == 'entry') %}
{% set assetResults = allResults|filter(r => r._source.elementType == 'asset') %}
```

## Common Next Steps

### 1. Customize What Gets Indexed

Go to **Settings → Search with Elastic** and configure:

- **Element Type Settings** - Exclude specific entry types, asset volumes, etc.
- **Status Filtering** - Choose which statuses to index (live, pending, etc.)
- **Asset Types** - Select which file types to process (PDFs, docs, etc.)

### 2. Add Search to Your Templates

```twig
{# Add to your layout #}
<form action="/search" method="get" class="site-search">
    <input type="text" name="q" placeholder="Search site...">
    <button type="submit">Search</button>
</form>
```

### 3. Configure Highlighting

Highlighting can be configured in `config/search-with-elastic.php`:

```php
<?php
return [
    'highlight' => [
        'pre_tags' => '<mark>',
        'post_tags' => '</mark>',
    ],
];
```

### 4. Automatic Indexing

The plugin automatically indexes content when you save or delete entries, assets, categories, and products.

## Troubleshooting

**Search returns no results?**
- Check that content was indexed: `curl localhost:9200/_cat/indices`
- Verify connection in plugin settings
- Try reindexing: `php craft search-with-elastic/index/reindex-entries`

**Plugin settings won't save?**
- Check Elasticsearch is running: `curl localhost:9200`
- Verify endpoint URL (include protocol if using HTTPS)
- Check server logs for detailed errors

## Next Steps

- **[Complete Installation Guide](/getting-started/installation)** - Advanced configuration options
- **[Configuration Guide](/configuration/basic-setup)** - Customize indexing and search behavior  
- **[Template Usage](/usage/template-integration)** - Advanced search templates and filtering
- **[Events Documentation](/development/events)** - Service APIs and events for developers
