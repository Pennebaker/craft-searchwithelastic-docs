# Basic Search Examples

Practical examples using the Search with Elastic template variables.

## Quick Start

The simplest possible search:

```twig
{# templates/search.twig #}
{% set query = craft.app.request.getParam('q') %}

{% if query %}
    {# Basic search #}
    {% set results = craft.searchWithElastic.search(query) %}
    
    <h2>{{ results|length }} results for "{{ query }}"</h2>
    
    {% for result in results %}
        <article class="search-result">
            <h3><a href="{{ result.url }}">{{ result.title }}</a></h3>
            {% if result.highlight %}
                <p>{{ result.highlight|raw }}</p>
            {% endif %}
        </article>
    {% endfor %}
{% endif %}
```

## Search with Options

Add fuzzy matching and field selection:

```twig
{# Advanced search with options #}
{% set query = craft.app.request.getParam('q') %}
{% set fuzzy = craft.app.request.getParam('fuzzy', '1') == '1' %}

{% if query %}
    {% set results = craft.searchWithElastic.searchExtra(query, {
        fuzzy: fuzzy,                              # Enable typo tolerance
        fields: ['title', 'content', 'summary'],   # Search specific fields
        size: 20                                    # Limit results
    }) %}
    
    {% for result in results %}
        <article>
            <h3>{{ result.title }}</h3>
            <p>{{ result.highlight|raw }}</p>
            <a href="{{ result.url }}">Read more</a>
        </article>
    {% endfor %}
{% endif %}
```

## PHP Search Examples

Use the search service in your modules:

```php
use pennebaker\searchwithelastic\SearchWithElastic;

class SearchHelper
{
    public function performSearch($term)
    {
        $elasticsearch = SearchWithElastic::getInstance()->elasticsearch;
        
        // Basic search
        $results = $elasticsearch->search($term);
        
        // Advanced search with options
        $results = $elasticsearch->advancedSearch($term, [
            'fuzzy' => true,
            'fields' => ['title', 'content'],
            'size' => 20
        ]);
        
        return $results;
    }
}
```

## AJAX Search with CSRF Protection

AJAX search implementation:

```html
<!-- Add CSRF token -->
<meta name="csrf-token" content="{{ craft.app.request.csrfToken }}">

<!-- Search form -->
<form id="search-form">
    <input type="search" name="query" placeholder="Search...">
    <button type="submit">Search</button>
</form>
<div id="results"></div>

<script>
document.getElementById('search-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const query = e.target.query.value;
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
    
    try {
        const response = await fetch('/search-with-elastic/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({ 
                query: query
            })
        });
        
        const data = await response.json();
        displayResults(data.results || data);
    } catch (error) {
        console.error('Search failed:', error);
    }
});

function displayResults(results) {
    if (!Array.isArray(results)) {
        console.error('Invalid results format');
        return;
    }
    
    const html = results.map(r => `
        <article>
            <h3><a href="${r.url}">${r.title}</a></h3>
            ${r.highlight ? `<p>${r.highlight}</p>` : ''}
        </article>
    `).join('');
    
    document.getElementById('results').innerHTML = html;
}
</script>
```

## Simple Pagination

```twig
{% set query = craft.app.request.getParam('q') %}
{% set page = craft.app.request.getParam('page', 1) %}
{% set perPage = 20 %}

{% if query %}
    {# Get all results #}
    {% set allResults = craft.searchWithElastic.search(query) %}
    
    {# Paginate results #}
    {% set offset = (page - 1) * perPage %}
    {% set results = allResults|slice(offset, perPage) %}
    {% set totalPages = (allResults|length / perPage)|round(0, 'ceil') %}
    
    {# Display results #}
    {% for result in results %}
        <article>
            <h3>{{ result.title }}</h3>
            <p>{{ result.highlight|raw }}</p>
        </article>
    {% endfor %}
    
    {# Pagination links #}
    {% if totalPages > 1 %}
        <nav class="pagination">
            {% if page > 1 %}
                <a href="?q={{ query }}&page={{ page - 1 }}">Previous</a>
            {% endif %}
            
            Page {{ page }} of {{ totalPages }}
            
            {% if page < totalPages %}
                <a href="?q={{ query }}&page={{ page + 1 }}">Next</a>
            {% endif %}
        </nav>
    {% endif %}
{% endif %}
```

## Search with Highlighting

Display search results with highlighting:

```twig
{% set query = craft.app.request.getParam('q') %}

{% if query %}
    {% set results = craft.searchWithElastic.search(query) %}
    
    {% for result in results %}
        <article>
            <h3>{{ result.title }}</h3>
            
            {# Display highlights if available #}
            {% if result.highlight %}
                <p>{{ result.highlight|raw }}</p>
            {% elseif result._source.content is defined %}
                {# Fallback to content excerpt #}
                <p>{{ result._source.content|striptags|truncate(200) }}</p>
            {% endif %}
            
            <a href="{{ result.url }}">Read more</a>
        </article>
    {% endfor %}
{% endif %}
```

## Filter Search Results

Filter results after searching:

```twig
{% set query = craft.app.request.getParam('q') %}
{% set filterType = craft.app.request.getParam('type', 'all') %}

{% if query %}
    {# Get all results #}
    {% set allResults = craft.searchWithElastic.search(query) %}
    
    {# Filter by type #}
    {% if filterType == 'entries' %}
        {% set results = allResults|filter(r => r._source.elementType == 'entry') %}
    {% elseif filterType == 'assets' %}
        {% set results = allResults|filter(r => r._source.elementType == 'asset') %}
    {% else %}
        {% set results = allResults %}
    {% endif %}
    
    {# Filter navigation #}
    <nav class="filters">
        <a href="?q={{ query }}" class="{{ filterType == 'all' ? 'active' }}">All</a>
        <a href="?q={{ query }}&type=entries" class="{{ filterType == 'entries' ? 'active' }}">Entries</a>
        <a href="?q={{ query }}&type=assets" class="{{ filterType == 'assets' ? 'active' }}">Files</a>
    </nav>
    
    {# Display filtered results #}
    <h2>{{ results|length }} {{ filterType }} results</h2>
    {% for result in results %}
        <article>
            <h3>{{ result.title }}</h3>
            <p>{{ result.highlight|raw }}</p>
        </article>
    {% endfor %}
{% endif %}
```

## Multi-Site Search

Search across or within specific sites:

```twig
{% set query = craft.app.request.getParam('q') %}
{% set siteId = craft.app.request.getParam('site') %}

{% if query %}
    {% if siteId %}
        {# Search specific site #}
        {% set results = craft.searchWithElastic.search(query, siteId) %}
    {% else %}
        {# Search current site #}
        {% set results = craft.searchWithElastic.search(query, currentSite.id) %}
    {% endif %}
    
    {# Site selector #}
    <select onchange="location.href='?q={{ query }}&site=' + this.value">
        <option value="">Current Site</option>
        {% for site in craft.app.sites.allSites %}
            <option value="{{ site.id }}" {{ siteId == site.id ? 'selected' }}>
                {{ site.name }}
            </option>
        {% endfor %}
    </select>
    
    {# Display results #}
    {% for result in results %}
        <article>
            <h3>{{ result.title }}</h3>
            <p>{{ result.highlight|raw }}</p>
        </article>
    {% endfor %}
{% endif %}
```

## Complete Search Page

A complete search page implementation:

```twig
{# templates/search/index.twig #}
{% extends "_layout" %}

{% set query = craft.app.request.getParam('q', '')|trim %}

{% block content %}
    <div class="search-page">
        <h1>Search</h1>
        
        {# Search form #}
        <form method="get" class="search-form">
            <div class="search-bar">
                <input 
                    type="search" 
                    name="q" 
                    value="{{ query|e('html_attr') }}"
                    placeholder="What are you looking for?"
                    required
                    autofocus
                >
                <button type="submit">Search</button>
            </div>
        </form>
        
        {# Search results #}
        {% if query|length >= 2 %}
            {% set results = craft.searchWithElastic.search(query) %}
            
            <div class="search-results">
                <h2>{{ results|length }} results for "{{ query }}"</h2>
                
                {% if results|length %}
                    {% for result in results %}
                        <article class="search-result">
                            <header>
                                <h3>
                                    <a href="{{ result.url }}">{{ result.title }}</a>
                                </h3>
                                {% if result._source.elementType is defined %}
                                    <span class="type">{{ result._source.elementType|title }}</span>
                                {% endif %}
                            </header>
                            
                            {% if result.highlight %}
                                <div class="excerpt">
                                    {{ result.highlight|raw }}
                                </div>
                            {% endif %}
                            
                            {% if result._source.dateCreated is defined %}
                                <footer>
                                    <time>{{ result._source.dateCreated|date('M j, Y') }}</time>
                                </footer>
                            {% endif %}
                        </article>
                    {% endfor %}
                {% else %}
                    <div class="no-results">
                        <p>No results found for "{{ query }}"</p>
                        <p>Try different keywords or check your spelling</p>
                    </div>
                {% endif %}
            </div>
        {% elseif query %}
            <p class="search-hint">Please enter at least 2 characters to search</p>
        {% endif %}
    </div>
{% endblock %}
```

## Next Steps

- [AJAX Endpoints](../usage/ajax-endpoints.md) - Build dynamic search interfaces
- [Template Integration](../usage/template-integration.md) - Advanced template usage
- [Configuration](../configuration/basic-setup.md) - Configure plugin settings