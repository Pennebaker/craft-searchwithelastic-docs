# Faceted search examples

Advanced search implementations with filters, aggregations, and faceted navigation.

## Basic faceted search

Create a search interface with multiple filter options:

```twig
{# templates/search/faceted.twig #}
{% set searchTerm = craft.app.request.getParam('q') %}
{% set filters = {
    elementType: craft.app.request.getParam('elementType'),
    status: craft.app.request.getParam('status'),
    siteId: craft.app.request.getParam('siteId'),
    dateRange: craft.app.request.getParam('dateRange')
} %}

{% set query = {
    query: {
        bool: {
            must: [],
            filter: []
        }
    },
    aggs: {
        elementTypes: {
            terms: {
                field: 'elementType',
                size: 10
            }
        },
        statuses: {
            terms: {
                field: 'status',
                size: 10
            }
        },
        sites: {
            terms: {
                field: 'siteId',
                size: 15
            }
        },
        date_ranges: {
            date_range: {
                field: 'dateCreated',
                ranges: [
                    { key: 'last_week', from: 'now-1w' },
                    { key: 'last_month', from: 'now-1M' },
                    { key: 'last_year', from: 'now-1y' }
                ]
            }
        }
    },
    size: 20
} %}

{# Add text search if provided #}
{% if searchTerm %}
    {% set query = query|merge({
        query: {
            bool: query.query.bool|merge({
                must: [
                    {
                        multi_match: {
                            query: searchTerm,
                            fields: ['title^3', 'content^1']
                        }
                    }
                ]
            })
        }
    }) %}
{% endif %}

{# Apply filters #}
{% for filterName, filterValue in filters %}
    {% if filterValue %}
        {% if filterName == 'dateRange' %}
            {% set dateFilter = {
                range: {
                    dateCreated: {}
                }
            } %}
            
            {% if filterValue == 'last_week' %}
                {% set dateFilter = dateFilter|merge({
                    range: { dateCreated: { gte: 'now-1w' } }
                }) %}
            {% elseif filterValue == 'last_month' %}
                {% set dateFilter = dateFilter|merge({
                    range: { dateCreated: { gte: 'now-1M' } }
                }) %}
            {% elseif filterValue == 'last_year' %}
                {% set dateFilter = dateFilter|merge({
                    range: { dateCreated: { gte: 'now-1y' } }
                }) %}
            {% endif %}
            
            {% set query = query|merge({
                query: {
                    bool: query.query.bool|merge({
                        filter: query.query.bool.filter|merge([dateFilter])
                    })
                }
            }) %}
        {% else %}
            {% set termFilter = {} %}
            {% set termFilter = termFilter|merge({
                (filterName): filterValue
            }) %}
            
            {% set query = query|merge({
                query: {
                    bool: query.query.bool|merge({
                        filter: query.query.bool.filter|merge([{ term: termFilter }])
                    })
                }
            }) %}
        {% endif %}
    {% endif %}
{% endfor %}

{% set results = craft.searchWithElastic.searchExtra(null, query) %}

<div class="faceted-search">
    <div class="search-sidebar">
        <h3>Refine Results</h3>
        
        {# Search form #}
        <form method="get" class="search-form">
            <input type="text" name="q" value="{{ searchTerm }}" placeholder="Search...">
            
            {# Preserve existing filters #}
            {% for name, value in filters %}
                {% if value %}
                    <input type="hidden" name="{{ name }}" value="{{ value }}">
                {% endif %}
            {% endfor %}
            
            <button type="submit">Search</button>
        </form>
        
        {# Element Type facets #}
        {% if results.aggregations.elementTypes.buckets %}
            <div class="facet-group">
                <h4>Content Type</h4>
                {% for bucket in results.aggregations.elementTypes.buckets %}
                    <label class="facet-option">
                        <input type="checkbox" 
                               name="elementType" 
                               value="{{ bucket.key }}"
                               {{ filters.elementType == bucket.key ? 'checked' : '' }}
                               onchange="updateFilter(this)">
                        {{ bucket.key|split('\\')|last }} ({{ bucket.doc_count }})
                    </label>
                {% endfor %}
            </div>
        {% endif %}
        
        {# Status facets #}
        {% if results.aggregations.statuses.buckets %}
            <div class="facet-group">
                <h4>Status</h4>
                {% for bucket in results.aggregations.statuses.buckets %}
                    <label class="facet-option">
                        <input type="checkbox" 
                               name="status" 
                               value="{{ bucket.key }}"
                               {{ filters.status == bucket.key ? 'checked' : '' }}
                               onchange="updateFilter(this)">
                        {{ bucket.key|capitalize }} ({{ bucket.doc_count }})
                    </label>
                {% endfor %}
            </div>
        {% endif %}
        
        {# Site facets #}
        {% if results.aggregations.sites.buckets %}
            <div class="facet-group">
                <h4>Site</h4>
                {% for bucket in results.aggregations.sites.buckets %}
                    <label class="facet-option">
                        <input type="checkbox" 
                               name="siteId" 
                               value="{{ bucket.key }}"
                               {{ filters.siteId == bucket.key ? 'checked' : '' }}
                               onchange="updateFilter(this)">
                        Site {{ bucket.key }} ({{ bucket.doc_count }})
                    </label>
                {% endfor %}
            </div>
        {% endif %}
        
        {# Date range facets #}
        <div class="facet-group">
            <h4>Date Range</h4>
            {% for bucket in results.aggregations.date_ranges.buckets %}
                <label class="facet-option">
                    <input type="radio" 
                           name="dateRange" 
                           value="{{ bucket.key }}"
                           {{ filters.dateRange == bucket.key ? 'checked' : '' }}
                           onchange="updateFilter(this)">
                    {{ bucket.key|replace('_', ' ')|title }} ({{ bucket.doc_count }})
                </label>
            {% endfor %}
        </div>
    </div>
    
    <div class="search-results">
        {# Active filters display #}
        {% set activeFilters = filters|filter(v => v) %}
        {% if activeFilters|length > 0 %}
            <div class="active-filters">
                <h4>Active Filters:</h4>
                {% for name, value in activeFilters %}
                    <span class="filter-tag">
                        {{ name|title }}: {{ value }}
                        <a href="?{{ craft.app.request.queryString|replace(name ~ '=' ~ value, '')|replace('&&', '&')|trim('&') }}">×</a>
                    </span>
                {% endfor %}
                <a href="/search{% if searchTerm %}?q={{ searchTerm }}{% endif %}" class="clear-all">Clear All</a>
            </div>
        {% endif %}
        
        {# Results #}
        <div class="results-header">
            <h2>{{ results.total }} Results{% if searchTerm %} for "{{ searchTerm }}"{% endif %}</h2>
            <small>Search took {{ results.took }}ms</small>
        </div>
        
        {% for result in results.hits %}
            <article class="search-result">
                <h3><a href="{{ result._source.url }}">{{ result._source.title }}</a></h3>
                <p>{{ result._source.summary|slice(0, 200) }}...</p>
                <div class="result-meta">
                    <span class="type">{{ result._source.elementType|split('\\')|last }}</span>
                    <span class="status">{{ result._source.status|capitalize }}</span>
                    <span class="date">{{ result._source.dateCreated|date('M j, Y') }}</span>
                </div>
            </article>
        {% endfor %}
    </div>
</div>

<script>
function updateFilter(checkbox) {
    const form = document.querySelector('.search-form');
    const url = new URL(window.location);
    
    if (checkbox.checked) {
        url.searchParams.set(checkbox.name, checkbox.value);
    } else {
        url.searchParams.delete(checkbox.name);
    }
    
    window.location.href = url.toString();
}
</script>
```

## E-commerce faceted search

Product search with price ranges, ratings, and attributes:

```twig
{% set query = {
    query: {
        bool: {
            must: [],
            filter: []
        }
    },
    aggs: {
        price_ranges: {
            range: {
                field: 'price',
                ranges: [
                    { key: 'under_25', to: 25 },
                    { key: '25_to_50', from: 25, to: 50 },
                    { key: '50_to_100', from: 50, to: 100 },
                    { key: '100_to_200', from: 100, to: 200 },
                    { key: 'over_200', from: 200 }
                ]
            }
        },
        brands: {
            terms: {
                field: 'brand.keyword',
                size: 20
            }
        },
        categories: {
            terms: {
                field: 'productCategory.keyword',
                size: 15
            }
        },
        colors: {
            terms: {
                field: 'colors.keyword',
                size: 10
            }
        },
        sizes: {
            terms: {
                field: 'sizes.keyword',
                size: 8
            }
        },
        ratings: {
            range: {
                field: 'averageRating',
                ranges: [
                    { key: '4_plus', from: 4 },
                    { key: '3_plus', from: 3 },
                    { key: '2_plus', from: 2 }
                ]
            }
        },
        availability: {
            terms: {
                field: 'inStock'
            }
        }
    },
    sort: [
        { _score: 'desc' }
    ],
    size: 24
} %}

{# Apply search term #}
{% set searchTerm = craft.app.request.getParam('q') %}
{% if searchTerm %}
    {% set query = query|merge({
        query: {
            bool: query.query.bool|merge({
                must: [
                    {
                        multi_match: {
                            query: searchTerm,
                            fields: [
                                'title^3', 
                                'description^1', 
                                'brand^2',
                                'tags^2',
                                'sku^1.5'
                            ]
                        }
                    }
                ]
            })
        }
    }) %}
{% endif %}

{# Apply filters... (similar to above but for product fields) #}

{% set results = craft.searchWithElastic.searchExtra(null, query) %}

<div class="product-search">
    <div class="filters-sidebar">
        {# Price Range Filter #}
        <div class="filter-group">
            <h4>Price Range</h4>
            {% for bucket in results.aggregations.price_ranges.buckets %}
                {% set label = bucket.key|replace('_', ' ')|title %}
                {% if bucket.key == 'under_25' %}
                    {% set label = 'Under $25' %}
                {% elseif bucket.key == 'over_200' %}
                    {% set label = 'Over $200' %}
                {% else %}
                    {% set parts = bucket.key|split('_to_') %}
                    {% set label = '$' ~ parts[0] ~ ' - $' ~ parts[1] %}
                {% endif %}
                
                <label class="filter-option">
                    <input type="checkbox" name="price" value="{{ bucket.key }}">
                    {{ label }} ({{ bucket.doc_count }})
                </label>
            {% endfor %}
        </div>
        
        {# Brand Filter #}
        <div class="filter-group">
            <h4>Brand</h4>
            {% for bucket in results.aggregations.brands.buckets|slice(0, 10) %}
                <label class="filter-option">
                    <input type="checkbox" name="brand" value="{{ bucket.key }}">
                    {{ bucket.key }} ({{ bucket.doc_count }})
                </label>
            {% endfor %}
            {% if results.aggregations.brands.buckets|length > 10 %}
                <button class="show-more" onclick="toggleMoreFilters(this)">Show More</button>
            {% endif %}
        </div>
        
        {# Color Filter with Color Swatches #}
        <div class="filter-group color-filter">
            <h4>Color</h4>
            {% for bucket in results.aggregations.colors.buckets %}
                <label class="color-option">
                    <input type="checkbox" name="color" value="{{ bucket.key }}">
                    <span class="color-swatch" style="background-color: {{ bucket.key|lower }}"></span>
                    {{ bucket.key }} ({{ bucket.doc_count }})
                </label>
            {% endfor %}
        </div>
        
        {# Size Filter #}
        <div class="filter-group size-filter">
            <h4>Size</h4>
            {% for bucket in results.aggregations.sizes.buckets %}
                <label class="size-option">
                    <input type="checkbox" name="size" value="{{ bucket.key }}">
                    <span class="size-label">{{ bucket.key }}</span>
                    <small>({{ bucket.doc_count }})</small>
                </label>
            {% endfor %}
        </div>
        
        {# Rating Filter #}
        <div class="filter-group">
            <h4>Customer Rating</h4>
            {% for bucket in results.aggregations.ratings.buckets %}
                <label class="rating-option">
                    <input type="checkbox" name="rating" value="{{ bucket.key }}">
                    {% set stars = bucket.key|split('_')[0]|number_format %}
                    {% for i in 1..5 %}
                        <span class="star {{ i <= stars ? 'filled' : '' }}">★</span>
                    {% endfor %}
                    & Up ({{ bucket.doc_count }})
                </label>
            {% endfor %}
        </div>
        
        {# Availability Filter #}
        <div class="filter-group">
            <h4>Availability</h4>
            {% for bucket in results.aggregations.availability.buckets %}
                <label class="filter-option">
                    <input type="checkbox" name="availability" value="{{ bucket.key }}">
                    {{ bucket.key ? 'In Stock' : 'Out of Stock' }} ({{ bucket.doc_count }})
                </label>
            {% endfor %}
        </div>
    </div>
    
    <div class="products-grid">
        <div class="results-toolbar">
            <div class="results-count">
                {{ results.total }} Products
            </div>
            
            <div class="sort-options">
                <select name="sort" onchange="updateSort(this.value)">
                    <option value="relevance">Best Match</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="rating">Customer Rating</option>
                    <option value="newest">Newest First</option>
                    <option value="bestseller">Best Sellers</option>
                </select>
            </div>
            
            <div class="view-options">
                <button class="grid-view active" onclick="setView('grid')">Grid</button>
                <button class="list-view" onclick="setView('list')">List</button>
            </div>
        </div>
        
        <div class="products" id="products-container">
            {% for product in results.hits %}
                <div class="product-card">
                    <div class="product-image">
                        <img src="{{ product._source.image }}" alt="{{ product._source.title }}">
                        {% if not product._source.inStock %}
                            <div class="out-of-stock-badge">Out of Stock</div>
                        {% endif %}
                    </div>
                    
                    <div class="product-info">
                        <h3 class="product-title">
                            <a href="{{ product._source.url }}">{{ product._source.title }}</a>
                        </h3>
                        
                        <div class="product-brand">{{ product._source.brand }}</div>
                        
                        <div class="product-rating">
                            {% set rating = product._source.averageRating|round %}
                            {% for i in 1..5 %}
                                <span class="star {{ i <= rating ? 'filled' : '' }}">★</span>
                            {% endfor %}
                            <small>({{ product._source.reviewCount }} reviews)</small>
                        </div>
                        
                        <div class="product-price">
                            {% if product._source.salePrice %}
                                <span class="sale-price">${{ product._source.salePrice }}</span>
                                <span class="regular-price">${{ product._source.price }}</span>
                            {% else %}
                                <span class="price">${{ product._source.price }}</span>
                            {% endif %}
                        </div>
                        
                        <div class="product-colors">
                            {% for color in product._source.colors|slice(0, 4) %}
                                <span class="color-dot" style="background-color: {{ color|lower }}"></span>
                            {% endfor %}
                            {% if product._source.colors|length > 4 %}
                                <span class="more-colors">+{{ product._source.colors|length - 4 }}</span>
                            {% endif %}
                        </div>
                    </div>
                </div>
            {% endfor %}
        </div>
    </div>
</div>
```

## Multi-level category navigation

Hierarchical category filtering:

```twig
{% set query = {
    query: { match_all: {} },
    aggs: {
        categories: {
            terms: {
                field: 'categoryPath.keyword',
                size: 100
            },
            aggs: {
                subcategories: {
                    terms: {
                        field: 'subcategory.keyword',
                        size: 50
                    }
                }
            }
        }
    }
} %}

{% set results = craft.searchWithElastic.searchExtra(null, query) %}

<div class="category-navigation">
    {% set categoryTree = {} %}
    {% for bucket in results.aggregations.categories.buckets %}
        {% set pathParts = bucket.key|split('/') %}
        {% set mainCategory = pathParts[0] %}
        
        {% if not categoryTree[mainCategory] %}
            {% set categoryTree = categoryTree|merge({
                (mainCategory): {
                    count: 0,
                    subcategories: {}
                }
            }) %}
        {% endif %}
        
        {% set categoryTree = categoryTree|merge({
            (mainCategory): categoryTree[mainCategory]|merge({
                count: categoryTree[mainCategory].count + bucket.doc_count
            })
        }) %}
        
        {% if pathParts|length > 1 %}
            {% set subCategory = pathParts[1] %}
            {% set categoryTree = categoryTree|merge({
                (mainCategory): categoryTree[mainCategory]|merge({
                    subcategories: categoryTree[mainCategory].subcategories|merge({
                        (subCategory): bucket.doc_count
                    })
                })
            }) %}
        {% endif %}
    {% endfor %}
    
    {% for categoryName, categoryData in categoryTree %}
        <div class="category-group">
            <h3 class="category-header">
                <a href="?category={{ categoryName }}">
                    {{ categoryName|title }} ({{ categoryData.count }})
                </a>
            </h3>
            
            {% if categoryData.subcategories %}
                <ul class="subcategory-list">
                    {% for subName, subCount in categoryData.subcategories %}
                        <li>
                            <a href="?category={{ categoryName }}&subcategory={{ subName }}">
                                {{ subName|title }} ({{ subCount }})
                            </a>
                        </li>
                    {% endfor %}
                </ul>
            {% endif %}
        </div>
    {% endfor %}
</div>
```

## Advanced filtering with ranges

Numeric and date range filters:

```twig
{% set query = {
    aggs: {
        price_stats: {
            stats: {
                field: 'price'
            }
        },
        date_histogram: {
            date_histogram: {
                field: 'dateCreated',
                calendar_interval: 'month',
                format: 'yyyy-MM'
            }
        }
    }
} %}

{% set results = craft.searchWithElastic.searchExtra(null, query) %}

<div class="advanced-filters">
    {# Price Range Slider #}
    <div class="filter-group">
        <h4>Price Range</h4>
        {% set priceStats = results.aggregations.price_stats %}
        <div class="range-slider">
            <input type="range" 
                   id="price-min" 
                   name="price_min"
                   min="{{ priceStats.min|round }}" 
                   max="{{ priceStats.max|round }}"
                   value="{{ craft.app.request.getParam('price_min')|default(priceStats.min|round) }}">
            <input type="range" 
                   id="price-max" 
                   name="price_max"
                   min="{{ priceStats.min|round }}" 
                   max="{{ priceStats.max|round }}"
                   value="{{ craft.app.request.getParam('price_max')|default(priceStats.max|round) }}">
            <div class="range-display">
                $<span id="price-min-display">{{ craft.app.request.getParam('price_min')|default(priceStats.min|round) }}</span>
                - $<span id="price-max-display">{{ craft.app.request.getParam('price_max')|default(priceStats.max|round) }}</span>
            </div>
        </div>
    </div>
    
    {# Date Range Picker #}
    <div class="filter-group">
        <h4>Date Range</h4>
        <div class="date-range-picker">
            <input type="date" 
                   name="date_from" 
                   value="{{ craft.app.request.getParam('date_from') }}">
            <span>to</span>
            <input type="date" 
                   name="date_to" 
                   value="{{ craft.app.request.getParam('date_to') }}">
        </div>
        
        {# Quick date filters #}
        <div class="quick-dates">
            <button onclick="setDateRange('today')">Today</button>
            <button onclick="setDateRange('week')">This Week</button>
            <button onclick="setDateRange('month')">This Month</button>
            <button onclick="setDateRange('year')">This Year</button>
        </div>
    </div>
</div>

<script>
// Price range slider functionality
const priceMinSlider = document.getElementById('price-min');
const priceMaxSlider = document.getElementById('price-max');
const priceMinDisplay = document.getElementById('price-min-display');
const priceMaxDisplay = document.getElementById('price-max-display');

function updatePriceRange() {
    const min = parseInt(priceMinSlider.value);
    const max = parseInt(priceMaxSlider.value);
    
    if (min >= max) {
        priceMinSlider.value = max - 1;
    }
    
    priceMinDisplay.textContent = priceMinSlider.value;
    priceMaxDisplay.textContent = priceMaxSlider.value;
    
    // Update URL with new price range
    const url = new URL(window.location);
    url.searchParams.set('price_min', priceMinSlider.value);
    url.searchParams.set('price_max', priceMaxSlider.value);
    
    // Debounced update
    clearTimeout(window.priceUpdateTimeout);
    window.priceUpdateTimeout = setTimeout(() => {
        window.location.href = url.toString();
    }, 1000);
}

priceMinSlider.addEventListener('input', updatePriceRange);
priceMaxSlider.addEventListener('input', updatePriceRange);

// Date range quick filters
function setDateRange(period) {
    const now = new Date();
    const url = new URL(window.location);
    
    let fromDate, toDate = now.toISOString().split('T')[0];
    
    switch (period) {
        case 'today':
            fromDate = toDate;
            break;
        case 'week':
            fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            break;
        case 'month':
            fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            break;
        case 'year':
            fromDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
            break;
    }
    
    url.searchParams.set('date_from', fromDate);
    url.searchParams.set('date_to', toDate);
    window.location.href = url.toString();
}
</script>
```

These examples show how to implement various types of facets and filters for search results.