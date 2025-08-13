# Results Display

Learn how to format search results effectively with highlighting, pagination, sorting, and responsive design patterns.

## Basic Result Display

Start with a clean, accessible result layout:

```twig
{% if results %}
    <div class="search-results" role="main" aria-label="Search results">
        <header class="results-header">
            <h2>{{ results | length }} results for "{{ query }}"</h2>
            <div class="results-meta">
                <span class="search-time">Search completed in {{ searchTime ?? 'N/A' }}ms</span>
            </div>
        </header>
        
        <ul class="results-list">
            {% for hit in results %}
                <li class="result-item">
                    <article class="search-result">
                        <header class="result-header">
                            <h3 class="result-title">
                                {% if hit._source.url %}
                                    <a href="{{ hit._source.url }}">{{ hit._source.title }}</a>
                                {% else %}
                                    {{ hit._source.title }}
                                {% endif %}
                            </h3>
                            
                            <div class="result-meta">
                                <span class="result-type">{{ hit._source.elementType | title }}</span>
                                {% if hit._source.dateCreated %}
                                    <time datetime="{{ hit._source.dateCreated | date('c') }}">
                                        {{ hit._source.dateCreated | date('M j, Y') }}
                                    </time>
                                {% endif %}
                            </div>
                        </header>
                        
                        <div class="result-content">
                            {% if hit.highlight and hit.highlight.content %}
                                {# Display highlighted snippets #}
                                {% for snippet in hit.highlight.content %}
                                    <p class="highlighted-snippet">{{ snippet | raw }}</p>
                                {% endfor %}
                            {% else %}
                                {# Fallback to regular content excerpt #}
                                <p class="result-excerpt">
                                    {{ hit._source.content | striptags | truncate(200) }}
                                </p>
                            {% endif %}
                        </div>
                        
                        {% if hit._source.url %}
                            <footer class="result-footer">
                                <a href="{{ hit._source.url }}" class="result-link">
                                    Read more <span class="sr-only">about {{ hit._source.title }}</span>
                                </a>
                                <span class="result-url">{{ hit._source.url }}</span>
                            </footer>
                        {% endif %}
                    </article>
                </li>
            {% endfor %}
        </ul>
    </div>
{% endif %}
```

## Highlight Configuration

Make search terms stand out with proper highlighting:

```twig
{# Custom highlight styles #}
<style>
.highlight {
    background-color: #fff3cd;
    color: #856404;
    padding: 0 0.25em;
    border-radius: 0.125em;
    font-weight: 600;
}

.highlighted-snippet {
    margin: 0.5em 0;
    line-height: 1.6;
}

.highlighted-snippet .highlight {
    background-color: #ffeaa7;
    color: #2d3436;
}
</style>

{# Process highlighting intelligently #}
{% for hit in results %}
    <div class="search-result">
        <h3>
            {% if hit.highlight and hit.highlight.title %}
                {{ hit.highlight.title[0] | raw }}
            {% else %}
                {{ hit._source.title }}
            {% endif %}
        </h3>
        
        <div class="result-snippets">
            {% if hit.highlight %}
                {# Show highlights from multiple fields #}
                {% for fieldName, highlights in hit.highlight %}
                    {% if fieldName != 'title' %}
                        <div class="highlight-group" data-field="{{ fieldName }}">
                            <label class="highlight-field">{{ fieldName | title }}:</label>
                            {% for highlight in highlights %}
                                <p class="highlighted-snippet">{{ highlight | raw }}</p>
                            {% endfor %}
                        </div>
                    {% endif %}
                {% endfor %}
            {% else %}
                {# No highlighting available - show excerpt #}
                <p class="result-excerpt">
                    {{ hit._source.content | striptags | truncate(250) }}
                </p>
            {% endif %}
        </div>
    </div>
{% endfor %}
```

## Result Grouping and Categorization

Group results by type or other criteria:

```twig
{# Group results by element type #}
{% set resultsByType = {} %}
{% for hit in results %}
    {% set elementType = hit._source.elementType %}
    {% if not resultsByType[elementType] %}
        {% set resultsByType = resultsByType | merge({ (elementType): [] }) %}
    {% endif %}
    {% set resultsByType = resultsByType | merge({ 
        (elementType): resultsByType[elementType] | merge([hit])
    }) %}
{% endfor %}

{# Display grouped results #}
{% for elementType, typeResults in resultsByType %}
    <section class="result-group" data-type="{{ elementType }}">
        <header class="group-header">
            <h3>{{ elementType | title }}s ({{ typeResults | length }})</h3>
            <button class="toggle-group" aria-expanded="true">
                <span class="sr-only">Toggle {{ elementType }} results</span>
                <svg class="collapse-icon" width="16" height="16">
                    <path d="M8 12l-4-4h8l-4 4z"/>
                </svg>
            </button>
        </header>
        
        <ul class="grouped-results">
            {% for hit in typeResults %}
                <li class="result-item">
                    {# Standard result display #}
                </li>
            {% endfor %}
        </ul>
    </section>
{% endfor %}
```

## Pagination Implementation

Implement efficient pagination for large result sets:

```twig
{# Pagination configuration #}
{% set resultsPerPage = 20 %}
{% set currentPage = craft.app.request.getParam('page', 1) | number_format(0) %}
{% set offset = (currentPage - 1) * resultsPerPage %}

{# Get paginated results #}
{% set searchOptions = searchOptions | merge({
    size: resultsPerPage,
    from: offset
}) %}

{% set results = craft.searchWithElastic.searchExtra(query, searchOptions) %}

{# Calculate pagination info #}
{% set hasNextPage = results | length >= resultsPerPage %}
{% set hasPrevPage = currentPage > 1 %}

{# Pagination component #}
{% if hasPrevPage or hasNextPage %}
    <nav class="pagination" role="navigation" aria-label="Search results pagination">
        <ul class="pagination-list">
            {% if hasPrevPage %}
                <li class="pagination-item">
                    <a href="{{ url('search', craft.app.request.getQueryParams() | merge({ page: currentPage - 1 })) }}" 
                       class="pagination-link pagination-prev" rel="prev">
                        <span aria-hidden="true">&laquo;</span>
                        <span class="sr-only">Previous page</span>
                    </a>
                </li>
            {% endif %}
            
            {# Page numbers (simplified - showing current page context) #}
            {% set startPage = max(1, currentPage - 2) %}
            {% set endPage = currentPage + 2 %}
            
            {% if startPage > 1 %}
                <li class="pagination-item">
                    <a href="{{ url('search', craft.app.request.getQueryParams() | merge({ page: 1 })) }}" 
                       class="pagination-link">1</a>
                </li>
                {% if startPage > 2 %}
                    <li class="pagination-item pagination-ellipsis">
                        <span>&hellip;</span>
                    </li>
                {% endif %}
            {% endif %}
            
            {% for pageNum in range(startPage, endPage) %}
                <li class="pagination-item">
                    {% if pageNum == currentPage %}
                        <span class="pagination-link pagination-current" aria-current="page">
                            {{ pageNum }}
                        </span>
                    {% else %}
                        <a href="{{ url('search', craft.app.request.getQueryParams() | merge({ page: pageNum })) }}" 
                           class="pagination-link">{{ pageNum }}</a>
                    {% endif %}
                </li>
            {% endfor %}
            
            {% if hasNextPage %}
                <li class="pagination-item">
                    <a href="{{ url('search', craft.app.request.getQueryParams() | merge({ page: currentPage + 1 })) }}" 
                       class="pagination-link pagination-next" rel="next">
                        <span class="sr-only">Next page</span>
                        <span aria-hidden="true">&raquo;</span>
                    </a>
                </li>
            {% endif %}
        </ul>
        
        <div class="pagination-info">
            <p>
                Page {{ currentPage }} 
                {% if results | length < resultsPerPage %}
                    ({{ results | length }} results)
                {% else %}
                    (showing {{ resultsPerPage }} results per page)
                {% endif %}
            </p>
        </div>
    </nav>
{% endif %}
```

## Result Sorting Options

Allow users to sort results by different criteria:

```twig
{# Sorting controls #}
<div class="search-controls">
    <div class="sort-options">
        <label for="sort-select">Sort by:</label>
        {% set currentSort = craft.app.request.getParam('sort', 'relevance') %}
        <select id="sort-select" name="sort" onchange="this.form.submit()">
            <option value="relevance" {{ currentSort == 'relevance' ? 'selected' : '' }}>
                Relevance
            </option>
            <option value="date-desc" {{ currentSort == 'date-desc' ? 'selected' : '' }}>
                Newest First
            </option>
            <option value="date-asc" {{ currentSort == 'date-asc' ? 'selected' : '' }}>
                Oldest First
            </option>
            <option value="title-asc" {{ currentSort == 'title-asc' ? 'selected' : '' }}>
                Title A-Z
            </option>
        </select>
    </div>
</div>

{# Apply sorting to results #}
{% set sortedResults = results %}

{% if currentSort != 'relevance' %}
    {% switch currentSort %}
        {% case 'date-desc' %}
            {% set sortedResults = results | sort((a, b) => b._source.dateCreated <=> a._source.dateCreated) %}
        
        {% case 'date-asc' %}
            {% set sortedResults = results | sort((a, b) => a._source.dateCreated <=> b._source.dateCreated) %}
        
        {% case 'title-asc' %}
            {% set sortedResults = results | sort((a, b) => a._source.title <=> b._source.title) %}
    {% endswitch %}
{% endif %}

{# Display sorted results #}
{% for hit in sortedResults %}
    {# Result display... #}
{% endfor %}
```

## Mobile-Responsive Results

Design results that work well on all screen sizes:

```css
/* Mobile-first result styling */
.search-results {
    padding: 1rem;
}

.result-item {
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #e9ecef;
}

.result-header {
    margin-bottom: 0.75rem;
}

.result-title {
    font-size: 1.25rem;
    line-height: 1.3;
    margin-bottom: 0.5rem;
}

.result-title a {
    color: #0066cc;
    text-decoration: none;
}

.result-title a:hover {
    text-decoration: underline;
}

.result-meta {
    font-size: 0.875rem;
    color: #6c757d;
    margin-bottom: 0.5rem;
}

.result-meta > * {
    display: inline-block;
    margin-right: 1rem;
}

.result-content {
    margin-bottom: 1rem;
}

.highlighted-snippet {
    font-size: 0.95rem;
    line-height: 1.6;
    margin-bottom: 0.5rem;
}

.result-footer {
    font-size: 0.875rem;
}

.result-url {
    color: #28a745;
    word-break: break-all;
}

/* Tablet styles */
@media (min-width: 768px) {
    .search-results {
        padding: 2rem;
    }
    
    .result-item {
        display: flex;
        flex-direction: column;
    }
    
    .result-title {
        font-size: 1.5rem;
    }
    
    .grouped-results {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
    }
}

/* Desktop styles */
@media (min-width: 1024px) {
    .result-item {
        flex-direction: row;
        align-items: flex-start;
    }
    
    .result-header {
        flex: 0 0 200px;
        margin-right: 2rem;
        margin-bottom: 0;
    }
    
    .result-content {
        flex: 1;
    }
}
```

## Advanced Result Features

### Result Thumbnails

Display thumbnails for assets and entries with images:

```twig
<div class="result-with-thumbnail">
    {% set thumbnail = null %}
    
    {# Get thumbnail based on element type #}
    {% if hit._source.elementType == 'asset' %}
        {% set asset = craft.assets.id(hit._source.elementId).one() %}
        {% if asset and asset.kind == 'image' %}
            {% set thumbnail = asset.getUrl({ width: 120, height: 80 }) %}
        {% endif %}
    {% elseif hit._source.elementType == 'entry' %}
        {% set entry = craft.entries.id(hit._source.elementId).one() %}
        {% if entry and entry.featuredImage.one() %}
            {% set thumbnail = entry.featuredImage.one().getUrl({ width: 120, height: 80 }) %}
        {% endif %}
    {% endif %}
    
    <div class="result-layout {{ thumbnail ? 'has-thumbnail' : 'no-thumbnail' }}">
        {% if thumbnail %}
            <div class="result-thumbnail">
                <img src="{{ thumbnail }}" alt="{{ hit._source.title }}" loading="lazy">
            </div>
        {% endif %}
        
        <div class="result-details">
            {# Standard result content #}
        </div>
    </div>
</div>
```

### Related Suggestions

Show related content based on search results:

```twig
{# Get related content based on search results #}
{% if results | length > 0 %}
    {% set relatedTerms = [] %}
    {% for hit in results | slice(0, 5) %}
        {% if hit._source.tags %}
            {% set relatedTerms = relatedTerms | merge(hit._source.tags) %}
        {% endif %}
    {% endfor %}
    
    {% if relatedTerms | length > 0 %}
        <aside class="related-searches">
            <h3>Related Topics</h3>
            <ul class="tag-list">
                {% for term in relatedTerms | unique | slice(0, 8) %}
                    <li>
                        <a href="{{ url('search/' ~ term | url_encode) }}" class="tag-link">
                            {{ term }}
                        </a>
                    </li>
                {% endfor %}
            </ul>
        </aside>
    {% endif %}
{% endif %}
```

## Performance Optimization

Optimize result display for better performance:

```twig
{# Lazy load images in results #}
<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E"
     data-src="{{ thumbnail }}"
     alt="{{ hit._source.title }}"
     class="lazy-load"
     loading="lazy">

{# Virtual scrolling for large result sets #}
<div class="results-container" data-virtual-scroll="true">
    <div class="results-viewport" style="height: 600px; overflow-y: auto;">
        <div class="results-content" id="results-content">
            {# Results loaded via JavaScript for better performance #}
        </div>
    </div>
</div>

<script>
// Intersection Observer for lazy loading
const lazyImages = document.querySelectorAll('.lazy-load');
const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy-load');
            observer.unobserve(img);
        }
    });
});

lazyImages.forEach(img => imageObserver.observe(img));
</script>
```

## Accessibility Features

Ensure search results are accessible to all users:

```twig
<div class="search-results" role="main" aria-live="polite">
    <div class="sr-only" id="results-announcement">
        {{ results | length }} search results found for {{ query }}
    </div>
    
    <ul class="results-list" role="list">
        {% for hit in results %}
            <li class="result-item" role="listitem">
                <article class="search-result" 
                         aria-labelledby="result-{{ loop.index }}-title"
                         aria-describedby="result-{{ loop.index }}-content">
                    
                    <h3 id="result-{{ loop.index }}-title" class="result-title">
                        <a href="{{ hit._source.url }}" 
                           aria-describedby="result-{{ loop.index }}-meta">
                            {{ hit._source.title }}
                        </a>
                    </h3>
                    
                    <div id="result-{{ loop.index }}-meta" class="result-meta">
                        <span class="result-type" aria-label="Content type">
                            {{ hit._source.elementType | title }}
                        </span>
                        <time datetime="{{ hit._source.dateCreated | date('c') }}"
                              aria-label="Published date">
                            {{ hit._source.dateCreated | date('M j, Y') }}
                        </time>
                    </div>
                    
                    <div id="result-{{ loop.index }}-content" class="result-content">
                        {# Highlighted content #}
                    </div>
                </article>
            </li>
        {% endfor %}
    </ul>
</div>
```

## Next Steps

Complete your search implementation:

- [Frontend Examples](frontend-examples.md) - See complete working examples with AJAX and autocomplete
- [Search Implementation](search-implementation.md) - Learn about query processing and form handling
- [Template Integration](template-integration.md) - Review core Twig variable methods