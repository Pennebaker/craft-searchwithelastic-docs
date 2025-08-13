---
layout: home
title: Search with Elastic
titleTemplate: Elasticsearch integration for Craft CMS

hero:
  name: Search with Elastic
  text: Elasticsearch integration for Craft CMS
  tagline: Provides Elasticsearch-powered search functionality with real-time indexing for Craft CMS.
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/quick-start
    - theme: alt
      text: View Examples
      link: /examples/basic-search

features:
  - icon: 🔍
    title: Search API
    details: Template variables for searching indexed content
  - icon: ⚡
    title: Real-time Updates
    details: Automatic indexing when content is saved or deleted
  - icon: 🎛️
    title: Rate Limiting
    details: Optional rate limiting for search endpoints
  - icon: 📊
    title: Multiple Content Types
    details: Indexes entries, assets, categories, and Commerce products
---

::: info
These docs were written by AI and may contain errors. Please [report](https://github.com/Pennebaker/craft-searchwithelastic-docs/issues) any issues or inconsistencies.
:::

## Supported Content Types

Search with Elastic indexes the following Craft content types:

- **Entries** - All entry types with configurable status filtering
- **Assets** - Files with content extraction from PDFs and documents  
- **Categories** - Category trees with hierarchical search
- **Commerce Products** - Product catalog with variant support
- **Digital Products** - Digital product collections

## Installation

:::code-group

```shell [Composer]
composer require pennebaker/craft-searchwithelastic
```

```shell [DDEV]
ddev composer require pennebaker/craft-searchwithelastic
ddev add-on get ddev/ddev-elasticsearch
```

```shell [Docker]
docker-compose exec web composer require pennebaker/craft-searchwithelastic
```

:::

::: tip Getting Started
See the [Quick Start Guide](/getting-started/quick-start) for setup instructions.
:::

## Available Search Methods

### Template Variables
The plugin provides template variables for searching:

```twig
{# Basic search #}
{% set results = craft.searchWithElastic.search(query) %}

{# Advanced search with options #}
{% set results = craft.searchWithElastic.searchExtra(query, {
    fuzzy: true,
    fields: ['title', 'content'],
    size: 20
}) %}
```

### Configuration Options
- **Authentication**: Optional authentication for Elasticsearch
- **Rate Limiting**: Configurable rate limits when enabled
- **Index Management**: CLI commands and control panel utilities

## System Requirements

- **Craft CMS** 4.x
- **PHP** 8.x
- **Elasticsearch** 7.x or 8.x

[View detailed requirements →](/getting-started/requirements)

## Getting Started

### 1. Install & Configure
```php
// config/search-with-elastic.php
return [
    'elasticsearchEndpoint' => getenv('ELASTICSEARCH_ENDPOINT'),
    'isAuthEnabled' => true,
    'username' => getenv('ELASTICSEARCH_USERNAME'),
    'password' => getenv('ELASTICSEARCH_PASSWORD'),
];
```

### 2. Index Your Content
```bash
# Via CLI
./craft search-with-elastic/index/reindex-all

# Or via Control Panel
# Utilities → Refresh Elasticsearch Index
```

### 3. Start Searching
```twig
{% set results = craft.searchWithElastic.search(query) %}
```

