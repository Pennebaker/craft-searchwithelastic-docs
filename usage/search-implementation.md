# Search Implementation

Implement search functionality using the plugin's template variables.

## Search Methods Overview

The plugin provides two main search methods:

### 1. Basic Search
Standard search functionality.
```twig
{# Basic search #}
{% set results = craft.searchWithElastic.search('coffee recipes') %}
```

### 2. Advanced Search (searchExtra)
Search with additional options.
```twig
{% set results = craft.searchWithElastic.searchExtra(query, {
    fuzzy: true,
    fields: ['title', 'content', 'summary'],
    size: 20,
    siteId: 2
}) %}
```

## Basic Search Form

```twig
{# search.twig #}
<form method="get" action="{{ url('search') }}" class="search-form">
    <input 
        type="search" 
        name="q" 
        value="{{ craft.app.request.getParam('q', '') | e('html_attr') }}"
        placeholder="Search..."
        required
    >
    <button type="submit">Search</button>
</form>
```

## Processing Search Queries

```twig
{# Get search query #}
{% set query = craft.app.request.getParam('q', '') | trim %}

{% if query | length >= 2 %}
    {# Simple search (recommended for most cases) #}
    {% set results = craft.searchWithElastic.search(query) %}
    
    {# Or advanced search with options #}
    {% set results = craft.searchWithElastic.searchExtra(query, {
        fuzzy: true,
        size: 20,
        fields: ['title', 'content']
    }) %}
    
    {# Display results #}
    <h2>{{ results | length }} results for "{{ query }}"</h2>
    
    {% for result in results %}
        <article>
            <h3>{{ result.title }}</h3>
            <p>{{ result.highlight|raw }}</p>
            <a href="{{ result.url }}">Read more</a>
        </article>
    {% endfor %}
{% endif %}
```

## Search Options

### Basic Search
Standard search across all indexed content:
```twig
{% set results = craft.searchWithElastic.search('coffee brewing') %}
```

### Advanced Search with Options
Search with fuzzy matching enabled:
```twig
{% set results = craft.searchWithElastic.searchExtra('coffee recipes', {
    fuzzy: true,
    fields: ['title', 'content']
}) %}
```

### Field-Specific Search
Target specific fields:
```twig
{# Search with field specification #}
{% set results = craft.searchWithElastic.searchExtra(query, {
    fields: ['title'],
    fuzzy: false
}) %}

{# Multiple fields #}
{% set results = craft.searchWithElastic.searchExtra(query, {
    fields: ['title', 'summary', 'content']
}) %}
```

### Multi-Site Search
Search within specific sites:
```twig
{# Search current site #}
{% set results = craft.searchWithElastic.search(query, currentSite.id) %}

{# Search specific site #}
{% set results = craft.searchWithElastic.searchExtra(query, {
    siteId: 2
}) %}
```

## PHP Implementation

For module or plugin development, use the service methods directly:

```php
use pennebaker\searchwithelastic\SearchWithElastic;

// Get the Elasticsearch service
$elasticsearch = SearchWithElastic::getInstance()->elasticsearch;

// Basic search
$results = $elasticsearch->search('coffee brewing');

// Advanced search with options
$results = $elasticsearch->advancedSearch(
    'coffee',
    [
        'fuzzy' => true,
        'fields' => ['title', 'content'],
        'size' => 20
    ]
);
```

## Search Filters

Filter results after searching:

```twig
{# Get search results #}
{% set results = craft.searchWithElastic.search(query) %}

{# Filter by element type #}
{% set entries = results | filter(r => r._source.elementType == 'entry') %}
{% set assets = results | filter(r => r._source.elementType == 'asset') %}

{# Filter by date #}
{% set recentResults = results | filter(r => 
    r._source.dateCreated | date('U') > date('-30 days') | date('U')
) %}

{# Filter by section #}
{% set blogPosts = results | filter(r => 
    r._source.section is defined and r._source.section == 'blog'
) %}
```

## Pagination

Implement pagination for large result sets:

```twig
{% set page = craft.app.request.getParam('page', 1) %}
{% set perPage = 20 %}
{% set offset = (page - 1) * perPage %}

{# Search with pagination #}
{% set allResults = craft.searchWithElastic.search(query) %}
{% set totalResults = allResults | length %}
{% set results = allResults | slice(offset, perPage) %}

{# Display pagination #}
{% if totalResults > perPage %}
    {% set totalPages = (totalResults / perPage) | round(0, 'ceil') %}
    
    <nav class="pagination">
        {% if page > 1 %}
            <a href="?q={{ query }}&page={{ page - 1 }}">Previous</a>
        {% endif %}
        
        {% for p in 1..totalPages %}
            <a href="?q={{ query }}&page={{ p }}" 
               class="{{ p == page ? 'active' : '' }}">{{ p }}</a>
        {% endfor %}
        
        {% if page < totalPages %}
            <a href="?q={{ query }}&page={{ page + 1 }}">Next</a>
        {% endif %}
    </nav>
{% endif %}
```

## Error Handling

Gracefully handle search failures:

```twig
{% if query %}
    {% try %}
        {% set results = craft.searchWithElastic.search(query) %}
    {% catch %}
        {# Fallback to Craft's native search #}
        {% set results = craft.entries.search(query).limit(20).all() %}
        <div class="notice">
            Using backup search. Some features may be limited.
        </div>
    {% endtry %}
{% endif %}
```

## Rate Limit Status

Display rate limit information to users:

```twig
{# Check rate limit status #}
{% set rateLimit = craft.searchWithElastic.getRateLimitStatus() %}

{% if rateLimit.enabled %}
    <div class="rate-limit-info">
        Searches remaining: {{ rateLimit.remaining }} / {{ rateLimit.limit }}
    </div>
{% endif %}
```

## Index Statistics

Display search index health:

```twig
{# Get index stats for debugging #}
{% set stats = craft.searchWithElastic.getIndexStats() %}

<div class="index-stats">
    <p>Index: {{ stats.index_name }}</p>
    <p>Documents: {{ stats.count }}</p>
    <p>Status: {{ stats.exists ? 'Active' : 'Missing' }}</p>
</div>

{# Get all index stats #}
{% set allStats = craft.searchWithElastic.getAllIndexStats() %}
```

## Complete Example

A full search page implementation:

```twig
{# templates/search/index.twig #}
{% extends "_layout" %}

{% set query = craft.app.request.getParam('q', '') | trim %}

{% block content %}
    <h1>Search</h1>
    
    <form method="get" class="search-form">
        <input 
            type="search" 
            name="q" 
            value="{{ query | e('html_attr') }}"
            placeholder="What are you looking for?"
            required
        >
        <button type="submit">Search</button>
    </form>
    
    {% if query | length >= 2 %}
        {% try %}
            {# Perform search #}
            {% set results = craft.searchWithElastic.searchExtra(query, {
                fuzzy: true,
                size: 20,
                fields: ['title', 'content', 'summary']
            }) %}
            
            <div class="search-results">
                <h2>{{ results | length }} results for "{{ query }}"</h2>
                
                {% for result in results %}
                    <article class="search-result">
                        <h3>
                            <a href="{{ result.url }}">{{ result.title }}</a>
                        </h3>
                        {% if result.highlight %}
                            <p class="highlight">{{ result.highlight | raw }}</p>
                        {% endif %}
                        <footer>
                            <span class="type">{{ result._source.elementType | title }}</span>
                            <time>{{ result._source.dateCreated | date('M j, Y') }}</time>
                        </footer>
                    </article>
                {% else %}
                    <p>No results found. Try different keywords or check your spelling.</p>
                {% endfor %}
            </div>
        {% catch %}
            <div class="error">
                <p>Search is temporarily unavailable. Please try again later.</p>
            </div>
        {% endtry %}
    {% elseif query %}
        <p>Please enter at least 2 characters to search.</p>
    {% endif %}
{% endblock %}
```

## Next Steps

- [AJAX Endpoints](ajax-endpoints.md) - Build dynamic search experiences
- [Frontend Examples](frontend-examples.md) - JavaScript implementations
- [Results Display](results-display.md) - Advanced result formatting