# Template Integration

Learn how to integrate Elasticsearch search functionality directly into your Twig templates using the built-in variable methods and helpers.

## Twig Variable Access

The plugin provides a global Twig variable that gives you access to all search functionality:

```twig
{{ craft.searchWithElastic }}
```

All search methods are accessible through this variable, allowing you to perform searches, get index statistics, and debug your search implementation directly from templates.

## Core Search Methods

### Basic Search

Perform a simple search across title and content fields:

```twig
{# Basic search with current site #}
{% set results = craft.searchWithElastic.search('coffee recipes') %}

{# Search specific site #}
{% set results = craft.searchWithElastic.search('coffee recipes', 2) %}
```

**Parameters:**
- `query` (string, required) - The search term
- `siteId` (int, optional) - Site ID to search, defaults to current site

**Returns:** Array of search results with highlighting and element data

### Advanced Search

Use the advanced search method for more control over search behavior, including direct Elasticsearch queries:

```twig
{# Simple advanced search with options #}
{% set results = craft.searchWithElastic.searchExtra('coffee recipes', {
    fuzzy: true,
    fields: ['title', 'content', 'customField'],
    siteId: 2,
    size: 20
}) %}

{# Direct Elasticsearch query #}
{% set searchOptions = {
    size: 20,
    query: {
        multi_match: {
            query: 'coffee',
            fields: ['title^2', 'content'],
            type: 'best_fields'
        }
    },
    highlight: {
        fields: {
            content: {
                fragment_size: 150,
                number_of_fragments: 2
            }
        }
    }
} %}
{% set results = craft.searchWithElastic.searchExtra(null, searchOptions) %}
```

**Parameters:**
- `query` (string/null) - The search term (can be null when using direct query in options)
- `options` (array, optional) - Configuration options:
  - `fuzzy` (bool) - Enable fuzzy matching (default: true)
  - `fields` (array) - Fields to search in (default: ['title', 'content'])
  - `siteId` (int) - Site ID to search (default: current site)
  - `size` (int) - Number of results to return (default: 50)
  - `query` (array) - Direct Elasticsearch query object
  - `aggs` (array) - Elasticsearch aggregations
  - `highlight` (array) - Highlight configuration
  - `sort` (array) - Sort configuration

## Working with Search Results

Search results are returned as an array of hit objects. Each result contains the indexed document data and optional highlighting:

```twig
{% set results = craft.searchWithElastic.search('coffee') %}

{% for hit in results %}
    <article class="search-result">
        <h3>{{ hit._source.title }}</h3>
        <p>{{ hit._source.content | slice(0, 200) }}...</p>
        
        {# Display highlighted snippets if available #}
        {% if hit.highlight %}
            {% for field, highlights in hit.highlight %}
                {% for highlight in highlights %}
                    <p class="highlight">{{ highlight | raw }}</p>
                {% endfor %}
            {% endfor %}
        {% endif %}
        
        {# Access element metadata #}
        <div class="meta">
            <span>Type: {{ hit._source.elementType }}</span>
            <span>ID: {{ hit._source.elementId }}</span>
            {% if hit._source.url %}
                <a href="{{ hit._source.url }}">View Full Article</a>
            {% endif %}
        </div>
    </article>
{% endfor %}
```

### Available Source Fields

Each search result's `_source` object typically contains:

- `title` - Element title
- `content` - Extracted text content
- `elementType` - Craft element type (entry, asset, category, etc.)
- `elementId` - Craft element ID
- `siteId` - Site ID
- `url` - Public URL (if available)
- `dateCreated` - Creation date
- `dateUpdated` - Last update date
- Custom fields based on your indexing configuration

## Debugging and Development

### Get Index Statistics

Check if your indexes exist and contain documents:

```twig
{# Get stats for current site #}
{% set stats = craft.searchWithElastic.getIndexStats() %}

{# Get stats for specific site #}
{% set stats = craft.searchWithElastic.getIndexStats(2) %}

{# Get stats for specific index by name #}
{% set stats = craft.searchWithElastic.getIndexStats('craft-entries-site-1') %}

<div class="debug-info">
    <h4>Index Status</h4>
    <p>Exists: {{ stats.exists ? 'Yes' : 'No' }}</p>
    <p>Documents: {{ stats.documentCount }}</p>
    <p>Index Name: {{ stats.indexName }}</p>
</div>
```

### Get All Index Statistics

View comprehensive statistics for all your Craft-related indexes:

```twig
{% set allStats = craft.searchWithElastic.getAllIndexStats() %}

<div class="debug-panel">
    <h4>All Indexes ({{ allStats.totalIndexes }})</h4>
    <p>Total Documents: {{ allStats.totalDocuments }}</p>
    
    {% for index in allStats.indexes %}
        <div class="index-info">
            <h5>{{ index.name }}</h5>
            <ul>
                <li>Documents: {{ index.documentCount }}</li>
                <li>Size: {{ index.size }}</li>
                {% if index.settings %}
                    <li>Shards: {{ index.settings.numberOfShards }}</li>
                    <li>Replicas: {{ index.settings.numberOfReplicas }}</li>
                    <li>Created: {{ index.settings.creationDate }}</li>
                {% endif %}
            </ul>
        </div>
    {% endfor %}
</div>
```

### Sample Document Inspection

Examine what fields are available in your index:

```twig
{% set sample = craft.searchWithElastic.getSampleDocument() %}

{% if sample.success %}
    <div class="sample-document">
        <h4>Available Fields</h4>
        <ul>
            {% for field in sample.fields %}
                <li><code>{{ field }}</code></li>
            {% endfor %}
        </ul>
        
        <h4>Sample Document</h4>
        <pre>{{ sample.document | json_encode(constant('JSON_PRETTY_PRINT')) }}</pre>
    </div>
{% else %}
    <p class="error">Error: {{ sample.error }}</p>
{% endif %}
```

## Error Handling

Always handle potential search errors gracefully:

```twig
{% set query = craft.app.request.getParam('q', '') %}

{% if query %}
    {% set results = craft.searchWithElastic.search(query) %}
    
    {% if results %}
        <div class="search-results">
            <h2>Found {{ results | length }} results for "{{ query }}"</h2>
            {# Display results... #}
        </div>
    {% else %}
        <div class="no-results">
            <p>No results found for "{{ query }}". Try different keywords.</p>
        </div>
    {% endif %}
{% endif %}
```

## Multi-Site Considerations

When working with multi-site setups, be explicit about which site youre searching:

```twig
{# Search all sites #}
{% set allSites = craft.app.sites.allSites %}
{% set allResults = [] %}

{% for site in allSites %}
    {% set siteResults = craft.searchWithElastic.search(query, site.id) %}
    {% if siteResults %}
        {% set allResults = allResults | merge(siteResults) %}
    {% endif %}
{% endfor %}

{# Or search current site specifically #}
{% set currentSiteResults = craft.searchWithElastic.search(query, craft.app.sites.currentSite.id) %}
```

## Performance Tips

1. **Limit Result Size**: Use the `size` parameter to control how many results are returned
2. **Cache Results**: Consider caching search results for popular queries
3. **Field Selection**: Limit search fields to only what you need
4. **Debug in Development**: Use the debugging methods to ensure your indexes are properly populated

```twig
{# Cache popular searches for 1 hour #}
{% cache using global key "search-#{query | hash}" for 1 hour %}
    {% set results = craft.searchWithElastic.searchExtra(query, {
        size: 10,
        fields: ['title']
    }) %}
    
    {# Render results... #}
{% endcache %}
```

## Next Steps

Now that you understand the basic template integration, explore:

- [Search Implementation](search-implementation.md) - Building search forms and handling user input
- [Results Display](results-display.md) - Advanced result formatting and pagination
- [Frontend Examples](frontend-examples.md) - Complete implementations with AJAX and autocomplete