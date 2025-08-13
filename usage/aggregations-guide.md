# Aggregations Guide

Learn how to use Elasticsearch aggregations (facets) for advanced search features like filters, statistics, and content analytics.

## Understanding Aggregations

Aggregations in Elasticsearch allow you to get statistics and summaries about your search results. They're commonly used for:
- Faceted navigation (filter by category, status, type)
- Content statistics (document counts, averages)
- Date histograms (posts per month)
- Price ranges (for e-commerce)

## Important: Aggregation Template Fix

**Note:** The aggregation template was updated to properly return both documents AND aggregations. Previous versions had `size: 0` which only returned aggregations without documents.

## Basic Aggregation Search

Here's a simple example that gets both search results and aggregations:

```twig
{# Build search options with aggregations #}
{% set searchOptions = {
    size: 20,
    query: {
        match_all: {}  {# or use a search query #}
    },
    aggs: {
        by_type: {
            terms: {
                field: 'elementType',
                size: 10
            }
        },
        by_status: {
            terms: {
                field: 'status',
                size: 10
            }
        }
    }
} %}

{# Execute search #}
{% set results = craft.searchWithElastic.searchExtra(null, searchOptions) %}

{# Access results and aggregations #}
<p>Found {{ results.hits|length }} results</p>

{% if results.aggregations is defined %}
    {% for bucket in results.aggregations.by_type.buckets %}
        <div>
            {{ bucket.key|split('\\')|last }}: {{ bucket.doc_count }} items
        </div>
    {% endfor %}
{% endif %}
```

## Searching with Aggregations

When you want to search AND get facets:

```twig
{% set query = 'your search term' %}

{% set searchOptions = {
    size: 20,
    query: {
        multi_match: {
            query: query,
            fields: ['title^2', 'content'],
            type: 'best_fields'
        }
    },
    aggs: {
        elementType: {
            terms: {
                field: 'elementType',
                size: 10
            }
        },
        status: {
            terms: {
                field: 'status',
                size: 10
            }
        }
    }
} %}

{% set results = craft.searchWithElastic.searchExtra(null, searchOptions) %}
```

## Getting All Documents with Facets

To browse all content with facets (no search term):

```twig
{% set searchOptions = {
    size: 20,
    query: {
        match_all: {}  {# Returns all documents #}
    },
    aggs: {
        types: {
            terms: {
                field: 'elementType',
                size: 10
            }
        }
    }
} %}

{% set results = craft.searchWithElastic.searchExtra(null, searchOptions) %}
```

## Using Post Filters

Post filters allow you to filter results while preserving aggregation counts:

```twig
{% set filterType = craft.app.request.getParam('type') %}

{% set searchOptions = {
    size: 20,
    query: {
        match_all: {}
    },
    aggs: {
        types: {
            terms: {
                field: 'elementType',
                size: 10
            }
        }
    }
} %}

{# Add post_filter if a filter is selected #}
{% if filterType %}
    {% set searchOptions = searchOptions|merge({
        post_filter: {
            term: {
                elementType: filterType
            }
        }
    }) %}
{% endif %}

{% set results = craft.searchWithElastic.searchExtra(null, searchOptions) %}
```

## Complete Faceted Search Example

Here's a working example from `simple-faceted-search.twig`:

```twig
{# Get search parameters #}
{% set searchQuery = craft.app.request.getParam('q') ?? '' %}
{% set filterType = craft.app.request.getParam('type') ?? null %}

{# Build query #}
{% if searchQuery %}
    {% set queryClause = {
        multi_match: {
            query: searchQuery,
            fields: ['title^2', 'content'],
            type: 'best_fields'
        }
    } %}
{% else %}
    {% set queryClause = {
        match_all: {}
    } %}
{% endif %}

{# Build search options #}
{% set searchOptions = {
    size: 20,
    query: queryClause,
    aggs: {
        types: {
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
        }
    }
} %}

{# Add post_filter if filtering #}
{% if filterType %}
    {% set searchOptions = searchOptions|merge({
        post_filter: {
            term: {
                elementType: filterType
            }
        }
    }) %}
{% endif %}

{# Perform search #}
{% set results = craft.searchWithElastic.searchExtra(null, searchOptions) %}

{# Display facets #}
{% if results.aggregations is defined %}
    <div class="facets">
        <h3>Filter by Type</h3>
        {% for bucket in results.aggregations.types.buckets ?? [] %}
            {% set typeLabel = bucket.key|split('\\')|last %}
            {% set isActive = filterType == bucket.key %}
            <a href="?type={{ bucket.key }}{% if searchQuery %}&q={{ searchQuery }}{% endif %}" 
               class="{{ isActive ? 'active' : '' }}">
                {{ typeLabel }} ({{ bucket.doc_count }})
            </a>
        {% endfor %}
    </div>
{% endif %}

{# Display results #}
{% for hit in results.hits ?? [] %}
    <div class="result">
        <h3>{{ hit._source.title }}</h3>
        <p>{{ hit._source.content|slice(0, 200) }}...</p>
    </div>
{% endfor %}
```

## Available Fields for Aggregation

Common fields you can aggregate on:

- `elementType` - The Craft element type (Entry, Asset, Category)
- `status` - Content status (live, pending, expired)
- `enabled` - Whether the element is enabled
- `siteId` - Site ID for multi-site setups
- `dateCreated` - Creation date (use with date_histogram)
- `dateUpdated` - Last update date

To see all available fields in your index:

```twig
{% set sample = craft.searchWithElastic.getSampleDocument() %}
{% if sample.fields is defined %}
    Available fields: {{ sample.fields|join(', ') }}
{% endif %}
```

## Aggregation Types

### Terms Aggregation
Most common - groups by unique values:

```twig
aggs: {
    categories: {
        terms: {
            field: 'category',
            size: 20  {# Number of buckets to return #}
        }
    }
}
```

### Range Aggregation
For numeric or date ranges:

```twig
aggs: {
    price_ranges: {
        range: {
            field: 'price',
            ranges: [
                { to: 50 },
                { from: 50, to: 100 },
                { from: 100 }
            ]
        }
    }
}
```

### Date Histogram
For time-based data:

```twig
aggs: {
    posts_over_time: {
        date_histogram: {
            field: 'dateCreated',
            calendar_interval: 'month'
        }
    }
}
```

### Stats Aggregation
Get min, max, avg, sum:

```twig
aggs: {
    price_stats: {
        stats: {
            field: 'price'
        }
    }
}
```

## Troubleshooting

### No Aggregation Results

If you're not getting aggregation results:

1. **Check the field exists**: Use `getSampleDocument()` to verify field names
2. **Check for keyword fields**: Text fields need `.keyword` suffix for terms aggregations
3. **Verify response structure**: Aggregations are in `results.aggregations`
4. **Check size parameter**: Ensure you're not setting `size: 0` unless you only want aggregations

### Fields Not Aggregatable

Some fields can't be aggregated on directly:
- Long text fields (use `.keyword` suffix if available)
- Analyzed text fields (need keyword mapping)

### Empty Buckets

If aggregations return but buckets are empty:
- The field might not have any values
- The field name might be incorrect
- The field might not be indexed properly

## Performance Tips

1. **Limit aggregation size**: Don't request more buckets than needed
2. **Use post_filter**: Preserves aggregation counts when filtering
3. **Cache aggregation results**: They don't change frequently
4. **Consider cardinality**: High-cardinality fields (many unique values) are expensive

## See Also

- [Simple Faceted Search Template](/templates/simple-faceted-search.twig)
- [Search Examples Template](/templates/search-examples.twig)
- [Template Integration Guide](template-integration.md)