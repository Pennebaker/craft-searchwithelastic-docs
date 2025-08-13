# Custom implementations

Specialized search solutions for specific industries and use cases.

## Knowledge base search

Implement intelligent documentation search with context-aware results:

```twig
{# templates/kb/search.twig #}
{% set searchTerm = craft.app.request.getParam('q') %}
{% set category = craft.app.request.getParam('category') %}
{% set difficulty = craft.app.request.getParam('difficulty') %}

{% set query = {
    query: {
        bool: {
            must: [
                {
                    multi_match: {
                        query: searchTerm,
                        fields: [
                            'title^4',
                            'summary^3', 
                            'content^2',
                            'tags^2',
                            'keywords^1.5'
                        ],
                        type: 'best_fields',
                        fuzziness: 'AUTO'
                    }
                }
            ],
            should: [
                {
                    match_phrase: {
                        title: {
                            query: searchTerm,
                            boost: 3
                        }
                    }
                },
                {
                    nested: {
                        path: 'related_articles',
                        query: {
                            match: {
                                'related_articles.title': searchTerm
                            }
                        },
                        boost: 1.5
                    }
                }
            ],
            filter: []
        }
    },
    highlight: {
        fields: {
            title: {
                pre_tags: ['<mark class="highlight-title">'],
                post_tags: ['</mark>']
            },
            content: {
                pre_tags: ['<mark class="highlight-content">'],
                post_tags: ['</mark>'],
                fragment_size: 200,
                number_of_fragments: 3,
                fragmenter: 'span'
            }
        }
    },
    aggs: {
        categories: {
            terms: {
                field: 'category.keyword',
                size: 10
            }
        },
        difficulty_levels: {
            terms: {
                field: 'difficultyLevel.keyword',
                size: 5
            }
        },
        content_types: {
            terms: {
                field: 'contentType.keyword',
                size: 8
            }
        },
        popular_tags: {
            terms: {
                field: 'tags.keyword',
                size: 15,
                order: { _count: 'desc' }
            }
        }
    },
    suggest: {
        article_suggestions: {
            text: searchTerm,
            term: {
                field: 'title',
                suggest_mode: 'popular',
                min_word_length: 3
            }
        }
    },
    size: 15
} %}

{# Apply filters #}
{% if category %}
    {% set query = query|merge({
        query: {
            bool: query.query.bool|merge({
                filter: query.query.bool.filter|merge([
                    { term: { 'category.keyword': category } }
                ])
            })
        }
    }) %}
{% endif %}

{% if difficulty %}
    {% set query = query|merge({
        query: {
            bool: query.query.bool|merge({
                filter: query.query.bool.filter|merge([
                    { term: { 'difficultyLevel.keyword': difficulty } }
                ])
            })
        }
    }) %}
{% endif %}

{% set results = craft.searchWithElastic.search(query) %}

<div class="kb-search">
    <div class="search-header">
        <h1>Knowledge Base</h1>
        
        <form method="get" class="kb-search-form">
            <div class="search-input-group">
                <input type="text" 
                       name="q" 
                       value="{{ searchTerm }}" 
                       placeholder="What can we help you find?"
                       autocomplete="off">
                <button type="submit">
                    <svg class="search-icon"><!-- search icon --></svg>
                </button>
            </div>
            
            <div class="search-filters">
                <select name="category">
                    <option value="">All Categories</option>
                    {% for bucket in results.aggregations.categories.buckets %}
                        <option value="{{ bucket.key }}" {{ category == bucket.key ? 'selected' : '' }}>
                            {{ bucket.key|title }} ({{ bucket.doc_count }})
                        </option>
                    {% endfor %}
                </select>
                
                <select name="difficulty">
                    <option value="">All Levels</option>
                    <option value="beginner" {{ difficulty == 'beginner' ? 'selected' : '' }}>Beginner</option>
                    <option value="intermediate" {{ difficulty == 'intermediate' ? 'selected' : '' }}>Intermediate</option>
                    <option value="advanced" {{ difficulty == 'advanced' ? 'selected' : '' }}>Advanced</option>
                </select>
            </div>
        </form>
    </div>
    
    {% if searchTerm %}
        {# Show suggestions if no results #}
        {% if results.total == 0 and results.suggest.article_suggestions %}
            <div class="search-suggestions">
                <h3>Did you mean:</h3>
                {% for suggestion in results.suggest.article_suggestions %}
                    {% for option in suggestion.options %}
                        <a href="?q={{ option.text }}" class="suggestion-link">{{ option.text }}</a>
                    {% endfor %}
                {% endfor %}
            </div>
        {% endif %}
        
        <div class="search-results">
            <div class="results-header">
                <h2>{{ results.total }} articles found</h2>
                <small>Search completed in {{ results.took }}ms</small>
            </div>
            
            {% for article in results.hits %}
                <article class="kb-article">
                    <div class="article-meta">
                        <span class="category">{{ article._source.category }}</span>
                        <span class="difficulty difficulty-{{ article._source.difficultyLevel|lower }}">
                            {{ article._source.difficultyLevel }}
                        </span>
                        <span class="type">{{ article._source.contentType }}</span>
                    </div>
                    
                    <h3 class="article-title">
                        <a href="{{ article._source.url }}">
                            {% if article.highlight.title %}
                                {{ article.highlight.title[0]|raw }}
                            {% else %}
                                {{ article._source.title }}
                            {% endif %}
                        </a>
                    </h3>
                    
                    <div class="article-excerpt">
                        {% if article.highlight.content %}
                            {% for fragment in article.highlight.content %}
                                <p>{{ fragment|raw }}</p>
                            {% endfor %}
                        {% else %}
                            <p>{{ article._source.summary }}</p>
                        {% endif %}
                    </div>
                    
                    <div class="article-footer">
                        <div class="article-stats">
                            <span class="views">{{ article._source.views }} views</span>
                            <span class="rating">
                                {% set rating = article._source.averageRating|round %}
                                {% for i in 1..5 %}
                                    <span class="star {{ i <= rating ? 'filled' : '' }}">★</span>
                                {% endfor %}
                                ({{ article._source.ratingCount }})
                            </span>
                            <span class="updated">Updated {{ article._source.dateUpdated|date('M j, Y') }}</span>
                        </div>
                        
                        {% if article._source.tags %}
                            <div class="article-tags">
                                {% for tag in article._source.tags|slice(0, 5) %}
                                    <span class="tag">{{ tag }}</span>
                                {% endfor %}
                            </div>
                        {% endif %}
                    </div>
                </article>
            {% endfor %}
        </div>
    {% else %}
        {# Popular articles and categories when no search #}
        <div class="kb-home">
            <div class="popular-categories">
                <h3>Browse by Category</h3>
                {% for bucket in results.aggregations.categories.buckets %}
                    <a href="?category={{ bucket.key }}" class="category-card">
                        <h4>{{ bucket.key|title }}</h4>
                        <p>{{ bucket.doc_count }} articles</p>
                    </a>
                {% endfor %}
            </div>
            
            <div class="popular-tags">
                <h3>Popular Topics</h3>
                {% for bucket in results.aggregations.popular_tags.buckets|slice(0, 20) %}
                    <a href="?q={{ bucket.key }}" class="tag-link" style="font-size: {{ 0.8 + (bucket.doc_count / 100) }}em">
                        {{ bucket.key }}
                    </a>
                {% endfor %}
            </div>
        </div>
    {% endif %}
</div>
```

## Real estate search

Location-based property search with geographic filtering:

```twig
{% set searchParams = {
    location: craft.app.request.getParam('location'),
    propertyType: craft.app.request.getParam('type'),
    minPrice: craft.app.request.getParam('min_price')|number_format,
    maxPrice: craft.app.request.getParam('max_price')|number_format,
    bedrooms: craft.app.request.getParam('bedrooms')|number_format,
    bathrooms: craft.app.request.getParam('bathrooms')|number_format,
    radius: craft.app.request.getParam('radius')|default(10)|number_format
} %}

{% set query = {
    query: {
        bool: {
            must: [
                { term: { status: 'active' } }
            ],
            filter: []
        }
    },
    aggs: {
        property_types: {
            terms: {
                field: 'propertyType.keyword',
                size: 10
            }
        },
        price_ranges: {
            range: {
                field: 'price',
                ranges: [
                    { key: 'under_200k', to: 200000 },
                    { key: '200k_to_400k', from: 200000, to: 400000 },
                    { key: '400k_to_600k', from: 400000, to: 600000 },
                    { key: '600k_to_800k', from: 600000, to: 800000 },
                    { key: 'over_800k', from: 800000 }
                ]
            }
        },
        neighborhoods: {
            terms: {
                field: 'neighborhood.keyword',
                size: 20
            }
        },
        features: {
            terms: {
                field: 'features.keyword',
                size: 15
            }
        }
    },
    sort: [
        { featured: { order: 'desc' } },
        { _score: { order: 'desc' } }
    ],
    size: 24
} %}

{# Location-based search #}
{% if searchParams.location %}
    {# Geocode location to coordinates (implementation depends on geocoding service) #}
    {% set coords = craft.searchWithElastic.geocode(searchParams.location) %}
    
    {% if coords %}
        {% set query = query|merge({
            query: {
                bool: query.query.bool|merge({
                    must: query.query.bool.must|merge([
                        {
                            geo_distance: {
                                distance: searchParams.radius ~ 'mi',
                                location: {
                                    lat: coords.lat,
                                    lon: coords.lng
                                }
                            }
                        }
                    ])
                })
            }
        }) %}
        
        {# Add distance sorting #}
        {% set query = query|merge({
            sort: [
                { featured: { order: 'desc' } },
                {
                    _geo_distance: {
                        location: coords,
                        order: 'asc',
                        unit: 'mi'
                    }
                }
            ]
        }) %}
    {% endif %}
{% endif %}

{# Property type filter #}
{% if searchParams.propertyType %}
    {% set query = query|merge({
        query: {
            bool: query.query.bool|merge({
                filter: query.query.bool.filter|merge([
                    { term: { 'propertyType.keyword': searchParams.propertyType } }
                ])
            })
        }
    }) %}
{% endif %}

{# Price range filter #}
{% if searchParams.minPrice or searchParams.maxPrice %}
    {% set priceRange = { range: { price: {} } } %}
    
    {% if searchParams.minPrice %}
        {% set priceRange = priceRange|merge({
            range: { price: priceRange.range.price|merge({ gte: searchParams.minPrice }) }
        }) %}
    {% endif %}
    
    {% if searchParams.maxPrice %}
        {% set priceRange = priceRange|merge({
            range: { price: priceRange.range.price|merge({ lte: searchParams.maxPrice }) }
        }) %}
    {% endif %}
    
    {% set query = query|merge({
        query: {
            bool: query.query.bool|merge({
                filter: query.query.bool.filter|merge([priceRange])
            })
        }
    }) %}
{% endif %}

{# Bedroom/bathroom filters #}
{% if searchParams.bedrooms %}
    {% set query = query|merge({
        query: {
            bool: query.query.bool|merge({
                filter: query.query.bool.filter|merge([
                    { range: { bedrooms: { gte: searchParams.bedrooms } } }
                ])
            })
        }
    }) %}
{% endif %}

{% if searchParams.bathrooms %}
    {% set query = query|merge({
        query: {
            bool: query.query.bool|merge({
                filter: query.query.bool.filter|merge([
                    { range: { bathrooms: { gte: searchParams.bathrooms } } }
                ])
            })
        }
    }) %}
{% endif %}

{% set results = craft.searchWithElastic.search(query) %}

<div class="property-search">
    <div class="search-form-container">
        <form method="get" class="property-search-form">
            <div class="search-row">
                <div class="location-input">
                    <input type="text" 
                           name="location" 
                           value="{{ searchParams.location }}" 
                           placeholder="City, ZIP, or neighborhood">
                </div>
                
                <select name="type">
                    <option value="">Property Type</option>
                    <option value="house" {{ searchParams.propertyType == 'house' ? 'selected' : '' }}>House</option>
                    <option value="condo" {{ searchParams.propertyType == 'condo' ? 'selected' : '' }}>Condo</option>
                    <option value="townhouse" {{ searchParams.propertyType == 'townhouse' ? 'selected' : '' }}>Townhouse</option>
                    <option value="apartment" {{ searchParams.propertyType == 'apartment' ? 'selected' : '' }}>Apartment</option>
                </select>
                
                <div class="price-inputs">
                    <input type="number" 
                           name="min_price" 
                           value="{{ searchParams.minPrice }}" 
                           placeholder="Min Price">
                    <input type="number" 
                           name="max_price" 
                           value="{{ searchParams.maxPrice }}" 
                           placeholder="Max Price">
                </div>
                
                <select name="bedrooms">
                    <option value="">Beds</option>
                    <option value="1" {{ searchParams.bedrooms == 1 ? 'selected' : '' }}>1+</option>
                    <option value="2" {{ searchParams.bedrooms == 2 ? 'selected' : '' }}>2+</option>
                    <option value="3" {{ searchParams.bedrooms == 3 ? 'selected' : '' }}>3+</option>
                    <option value="4" {{ searchParams.bedrooms == 4 ? 'selected' : '' }}>4+</option>
                </select>
                
                <select name="bathrooms">
                    <option value="">Baths</option>
                    <option value="1" {{ searchParams.bathrooms == 1 ? 'selected' : '' }}>1+</option>
                    <option value="2" {{ searchParams.bathrooms == 2 ? 'selected' : '' }}>2+</option>
                    <option value="3" {{ searchParams.bathrooms == 3 ? 'selected' : '' }}>3+</option>
                </select>
                
                <button type="submit" class="search-btn">Search</button>
            </div>
        </form>
    </div>
    
    <div class="search-results-container">
        <div class="results-header">
            <h2>{{ results.total }} Properties Found</h2>
            
            <div class="view-toggle">
                <button class="view-btn active" data-view="grid">Grid</button>
                <button class="view-btn" data-view="list">List</button>
                <button class="view-btn" data-view="map">Map</button>
            </div>
        </div>
        
        <div class="properties-grid" id="properties-container">
            {% for property in results.hits %}
                <div class="property-card" data-lat="{{ property._source.location.lat }}" data-lng="{{ property._source.location.lon }}">
                    <div class="property-images">
                        <img src="{{ property._source.images[0] }}" alt="{{ property._source.title }}">
                        {% if property._source.featured %}
                            <div class="featured-badge">Featured</div>
                        {% endif %}
                        <div class="image-count">{{ property._source.images|length }} photos</div>
                    </div>
                    
                    <div class="property-details">
                        <div class="property-price">
                            ${{ property._source.price|number_format }}
                            {% if property._source.pricePerSqft %}
                                <small>${{ property._source.pricePerSqft }}/sqft</small>
                            {% endif %}
                        </div>
                        
                        <div class="property-specs">
                            <span class="beds">{{ property._source.bedrooms }} bed</span>
                            <span class="baths">{{ property._source.bathrooms }} bath</span>
                            {% if property._source.squareFootage %}
                                <span class="sqft">{{ property._source.squareFootage|number_format }} sqft</span>
                            {% endif %}
                        </div>
                        
                        <div class="property-address">
                            {{ property._source.address }}, {{ property._source.city }}, {{ property._source.state }}
                        </div>
                        
                        {% if coords and property._source.location %}
                            <div class="property-distance">
                                {{ craft.searchWithElastic.calculateDistance(coords, property._source.location)|number_format(1) }} miles away
                            </div>
                        {% endif %}
                        
                        <div class="property-features">
                            {% for feature in property._source.features|slice(0, 3) %}
                                <span class="feature">{{ feature }}</span>
                            {% endfor %}
                        </div>
                        
                        <div class="property-actions">
                            <a href="{{ property._source.url }}" class="btn-primary">View Details</a>
                            <button class="btn-secondary favorite-btn" data-id="{{ property._source.id }}">♡</button>
                        </div>
                    </div>
                </div>
            {% endfor %}
        </div>
        
        {# Map view container #}
        <div id="map-container" style="display: none; height: 600px;"></div>
    </div>
</div>

<script>
// Map integration (using Google Maps API)
let map, markers = [];

function initMap() {
    map = new google.maps.Map(document.getElementById('map-container'), {
        zoom: 12,
        center: {{ coords ? '{lat: ' ~ coords.lat ~ ', lng: ' ~ coords.lng ~ '}' : '{lat: 40.7128, lng: -74.0060}' }}
    });
    
    // Add property markers
    {% for property in results.hits %}
        {% if property._source.location %}
            const marker{{ loop.index }} = new google.maps.Marker({
                position: { lat: {{ property._source.location.lat }}, lng: {{ property._source.location.lon }} },
                map: map,
                title: '{{ property._source.title|e('js') }}'
            });
            
            const infoWindow{{ loop.index }} = new google.maps.InfoWindow({
                content: `
                    <div class="map-info-window">
                        <img src="{{ property._source.images[0] }}" alt="{{ property._source.title|e('js') }}" style="width: 200px; height: 120px; object-fit: cover;">
                        <div class="info-content">
                            <h4>${{ property._source.price|number_format }}</h4>
                            <p>{{ property._source.bedrooms }} bed, {{ property._source.bathrooms }} bath</p>
                            <p>{{ property._source.address|e('js') }}</p>
                            <a href="{{ property._source.url }}" class="btn-primary">View Details</a>
                        </div>
                    </div>
                `
            });
            
            marker{{ loop.index }}.addListener('click', () => {
                infoWindow{{ loop.index }}.open(map, marker{{ loop.index }});
            });
            
            markers.push(marker{{ loop.index }});
        {% endif %}
    {% endfor %}
}

// View toggle functionality
document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        const view = this.dataset.view;
        const gridContainer = document.getElementById('properties-container');
        const mapContainer = document.getElementById('map-container');
        
        if (view === 'map') {
            gridContainer.style.display = 'none';
            mapContainer.style.display = 'block';
            setTimeout(() => google.maps.event.trigger(map, 'resize'), 100);
        } else {
            gridContainer.style.display = view === 'list' ? 'block' : 'grid';
            mapContainer.style.display = 'none';
            
            if (view === 'list') {
                gridContainer.classList.add('list-view');
            } else {
                gridContainer.classList.remove('list-view');
            }
        }
    });
});
</script>
```

## Job search portal

Skills-based job matching with salary ranges and remote options:

```twig
{% set searchParams = {
    keywords: craft.app.request.getParam('q'),
    location: craft.app.request.getParam('location'),
    jobType: craft.app.request.getParam('job_type'),
    salaryMin: craft.app.request.getParam('salary_min')|number_format,
    salaryMax: craft.app.request.getParam('salary_max')|number_format,
    experience: craft.app.request.getParam('experience'),
    remote: craft.app.request.getParam('remote')|default(false),
    skills: craft.app.request.getParam('skills')|split(',')
} %}

{% set query = {
    query: {
        bool: {
            must: [],
            should: [],
            filter: [
                { term: { status: 'active' } },
                { range: { expiryDate: { gte: 'now' } } }
            ]
        }
    },
    aggs: {
        job_types: {
            terms: {
                field: 'jobType.keyword',
                size: 10
            }
        },
        experience_levels: {
            terms: {
                field: 'experienceLevel.keyword',
                size: 6
            }
        },
        companies: {
            terms: {
                field: 'company.keyword',
                size: 20
            }
        },
        locations: {
            terms: {
                field: 'location.keyword',
                size: 15,
                exclude: ['Remote', 'Work from home']
            }
        },
        skills: {
            terms: {
                field: 'requiredSkills.keyword',
                size: 30
            }
        },
        salary_ranges: {
            range: {
                field: 'salaryMax',
                ranges: [
                    { key: 'under_50k', to: 50000 },
                    { key: '50k_to_75k', from: 50000, to: 75000 },
                    { key: '75k_to_100k', from: 75000, to: 100000 },
                    { key: '100k_to_150k', from: 100000, to: 150000 },
                    { key: 'over_150k', from: 150000 }
                ]
            }
        }
    },
    sort: [
        { featured: { order: 'desc' } },
        { datePosted: { order: 'desc' } }
    ],
    size: 20
} %}

{# Keyword search #}
{% if searchParams.keywords %}
    {% set query = query|merge({
        query: {
            bool: query.query.bool|merge({
                must: [
                    {
                        multi_match: {
                            query: searchParams.keywords,
                            fields: [
                                'title^4',
                                'company^2',
                                'description^1',
                                'requiredSkills^3',
                                'preferredSkills^2'
                            ],
                            type: 'best_fields',
                            fuzziness: 'AUTO'
                        }
                    }
                ]
            })
        }
    }) %}
{% endif %}

{# Skills matching #}
{% if searchParams.skills and searchParams.skills[0] %}
    {% for skill in searchParams.skills %}
        {% if skill|trim %}
            {% set query = query|merge({
                query: {
                    bool: query.query.bool|merge({
                        should: query.query.bool.should|merge([
                            {
                                match: {
                                    requiredSkills: {
                                        query: skill|trim,
                                        boost: 3
                                    }
                                }
                            },
                            {
                                match: {
                                    preferredSkills: {
                                        query: skill|trim,
                                        boost: 1.5
                                    }
                                }
                            }
                        ])
                    })
                }
            }) %}
        {% endif %}
    {% endfor %}
    
    {% set query = query|merge({
        query: {
            bool: query.query.bool|merge({
                minimum_should_match: 1
            })
        }
    }) %}
{% endif %}

{# Location filter #}
{% if searchParams.location and not searchParams.remote %}
    {% set query = query|merge({
        query: {
            bool: query.query.bool|merge({
                filter: query.query.bool.filter|merge([
                    {
                        bool: {
                            should: [
                                { match: { location: searchParams.location } },
                                { term: { remoteWork: true } }
                            ]
                        }
                    }
                ])
            })
        }
    }) %}
{% endif %}

{# Remote work filter #}
{% if searchParams.remote %}
    {% set query = query|merge({
        query: {
            bool: query.query.bool|merge({
                filter: query.query.bool.filter|merge([
                    { term: { remoteWork: true } }
                ])
            })
        }
    }) %}
{% endif %}

{# Apply other filters... #}

{% set results = craft.searchWithElastic.search(query) %}

<div class="job-search">
    <div class="search-form-section">
        <form method="get" class="job-search-form">
            <div class="main-search">
                <input type="text" 
                       name="q" 
                       value="{{ searchParams.keywords }}" 
                       placeholder="Job title, skills, or company">
                
                <input type="text" 
                       name="location" 
                       value="{{ searchParams.location }}" 
                       placeholder="City or remote">
                
                <button type="submit" class="search-btn">Find Jobs</button>
            </div>
            
            <div class="advanced-filters">
                <select name="job_type">
                    <option value="">Job Type</option>
                    <option value="full-time" {{ searchParams.jobType == 'full-time' ? 'selected' : '' }}>Full-time</option>
                    <option value="part-time" {{ searchParams.jobType == 'part-time' ? 'selected' : '' }}>Part-time</option>
                    <option value="contract" {{ searchParams.jobType == 'contract' ? 'selected' : '' }}>Contract</option>
                    <option value="freelance" {{ searchParams.jobType == 'freelance' ? 'selected' : '' }}>Freelance</option>
                </select>
                
                <select name="experience">
                    <option value="">Experience Level</option>
                    <option value="entry" {{ searchParams.experience == 'entry' ? 'selected' : '' }}>Entry Level</option>
                    <option value="mid" {{ searchParams.experience == 'mid' ? 'selected' : '' }}>Mid Level</option>
                    <option value="senior" {{ searchParams.experience == 'senior' ? 'selected' : '' }}>Senior Level</option>
                    <option value="executive" {{ searchParams.experience == 'executive' ? 'selected' : '' }}>Executive</option>
                </select>
                
                <div class="salary-range">
                    <input type="number" 
                           name="salary_min" 
                           value="{{ searchParams.salaryMin }}" 
                           placeholder="Min Salary">
                    <input type="number" 
                           name="salary_max" 
                           value="{{ searchParams.salaryMax }}" 
                           placeholder="Max Salary">
                </div>
                
                <label class="checkbox-label">
                    <input type="checkbox" 
                           name="remote" 
                           value="1" 
                           {{ searchParams.remote ? 'checked' : '' }}>
                    Remote OK
                </label>
            </div>
            
            <div class="skills-input">
                <input type="text" 
                       name="skills" 
                       value="{{ searchParams.skills|join(',') }}" 
                       placeholder="Skills (comma-separated)">
            </div>
        </form>
    </div>
    
    <div class="search-results-section">
        <div class="results-header">
            <h2>{{ results.total }} Jobs Found</h2>
            
            <div class="sort-options">
                <select name="sort" onchange="updateSort(this.value)">
                    <option value="relevance">Most Relevant</option>
                    <option value="date">Most Recent</option>
                    <option value="salary">Highest Salary</option>
                    <option value="company">Company A-Z</option>
                </select>
            </div>
        </div>
        
        <div class="job-listings">
            {% for job in results.hits %}
                <div class="job-card" data-job-id="{{ job._source.id }}">
                    <div class="job-header">
                        <div class="company-logo">
                            {% if job._source.companyLogo %}
                                <img src="{{ job._source.companyLogo }}" alt="{{ job._source.company }}">
                            {% else %}
                                <div class="logo-placeholder">{{ job._source.company|slice(0, 2)|upper }}</div>
                            {% endif %}
                        </div>
                        
                        <div class="job-basic-info">
                            <h3 class="job-title">
                                <a href="{{ job._source.url }}">{{ job._source.title }}</a>
                                {% if job._source.featured %}
                                    <span class="featured-badge">Featured</span>
                                {% endif %}
                            </h3>
                            
                            <div class="company-info">
                                <span class="company-name">{{ job._source.company }}</span>
                                <span class="location">{{ job._source.location }}</span>
                                {% if job._source.remoteWork %}
                                    <span class="remote-badge">Remote</span>
                                {% endif %}
                            </div>
                        </div>
                        
                        <div class="job-actions">
                            <button class="save-job-btn" data-id="{{ job._source.id }}">♡</button>
                            <a href="{{ job._source.applyUrl }}" class="apply-btn">Apply</a>
                        </div>
                    </div>
                    
                    <div class="job-details">
                        <div class="job-meta">
                            <span class="job-type">{{ job._source.jobType|title }}</span>
                            <span class="experience-level">{{ job._source.experienceLevel|title }}</span>
                            {% if job._source.salaryMin or job._source.salaryMax %}
                                <span class="salary-range">
                                    {% if job._source.salaryMin and job._source.salaryMax %}
                                        ${{ job._source.salaryMin|number_format }} - ${{ job._source.salaryMax|number_format }}
                                    {% elseif job._source.salaryMin %}
                                        From ${{ job._source.salaryMin|number_format }}
                                    {% else %}
                                        Up to ${{ job._source.salaryMax|number_format }}
                                    {% endif %}
                                </span>
                            {% endif %}
                            <span class="posted-date">{{ job._source.datePosted|date('M j, Y') }}</span>
                        </div>
                        
                        <div class="job-description">
                            {{ job._source.summary|slice(0, 300) }}...
                        </div>
                        
                        <div class="required-skills">
                            <strong>Required Skills:</strong>
                            {% for skill in job._source.requiredSkills|slice(0, 6) %}
                                <span class="skill-tag">{{ skill }}</span>
                            {% endfor %}
                            {% if job._source.requiredSkills|length > 6 %}
                                <span class="more-skills">+{{ job._source.requiredSkills|length - 6 }} more</span>
                            {% endif %}
                        </div>
                        
                        {% if searchParams.skills and searchParams.skills[0] %}
                            <div class="skill-match">
                                {% set matchedSkills = [] %}
                                {% for userSkill in searchParams.skills %}
                                    {% for jobSkill in job._source.requiredSkills %}
                                        {% if userSkill|trim|lower in jobSkill|lower %}
                                            {% set matchedSkills = matchedSkills|merge([jobSkill]) %}
                                        {% endif %}
                                    {% endfor %}
                                {% endfor %}
                                
                                {% if matchedSkills %}
                                    <div class="match-indicator">
                                        <span class="match-score">{{ (matchedSkills|length / job._source.requiredSkills|length * 100)|round }}% Match</span>
                                        <small>Your skills: {{ matchedSkills|join(', ') }}</small>
                                    </div>
                                {% endif %}
                            </div>
                        {% endif %}
                    </div>
                </div>
            {% endfor %}
        </div>
    </div>
</div>
```

## News and media search

Content search with date relevance and topic clustering:

```twig
{% set query = {
    query: {
        bool: {
            must: [],
            should: [
                {
                    function_score: {
                        query: { match_all: {} },
                        functions: [
                            {
                                gauss: {
                                    datePublished: {
                                        origin: 'now',
                                        scale: '7d',
                                        decay: 0.5
                                    }
                                },
                                weight: 2
                            },
                            {
                                field_value_factor: {
                                    field: 'views',
                                    factor: 0.1,
                                    modifier: 'log1p'
                                }
                            },
                            {
                                field_value_factor: {
                                    field: 'socialShares',
                                    factor: 0.2,
                                    modifier: 'sqrt'
                                }
                            }
                        ],
                        boost_mode: 'multiply'
                    }
                }
            ]
        }
    },
    aggs: {
        topics: {
            significant_terms: {
                field: 'tags.keyword',
                size: 20
            }
        },
        trending_topics: {
            terms: {
                field: 'tags.keyword',
                size: 10,
                order: { avg_score: 'desc' }
            },
            aggs: {
                avg_score: {
                    avg: {
                        script: '_score'
                    }
                }
            }
        },
        date_histogram: {
            date_histogram: {
                field: 'datePublished',
                calendar_interval: 'day',
                min_doc_count: 1
            }
        }
    },
    sort: [
        { _score: 'desc' },
        { datePublished: 'desc' }
    ]
} %}

{# Add text search if provided #}
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
                                'headline^4',
                                'summary^3',
                                'content^2',
                                'tags^2',
                                'author^1.5'
                            ],
                            type: 'best_fields'
                        }
                    }
                ]
            })
        }
    }) %}
{% endif %}

{% set results = craft.searchWithElastic.search(query) %}

<div class="news-search">
    {% if searchTerm %}
        <div class="search-results">
            <h2>{{ results.total }} articles found for "{{ searchTerm }}"</h2>
            
            {% for article in results.hits %}
                <article class="news-article">
                    <div class="article-image">
                        {% if article._source.image %}
                            <img src="{{ article._source.image }}" alt="{{ article._source.headline }}">
                        {% endif %}
                        <div class="article-category">{{ article._source.category }}</div>
                    </div>
                    
                    <div class="article-content">
                        <h3><a href="{{ article._source.url }}">{{ article._source.headline }}</a></h3>
                        <p class="article-summary">{{ article._source.summary }}</p>
                        
                        <div class="article-meta">
                            <span class="author">{{ article._source.author }}</span>
                            <span class="date">{{ article._source.datePublished|date('M j, Y g:i A') }}</span>
                            <span class="reading-time">{{ article._source.readingTime }} min read</span>
                        </div>
                        
                        <div class="article-engagement">
                            <span class="views">{{ article._source.views|number_format }} views</span>
                            <span class="shares">{{ article._source.socialShares }} shares</span>
                            <span class="comments">{{ article._source.commentCount }} comments</span>
                        </div>
                        
                        <div class="article-tags">
                            {% for tag in article._source.tags|slice(0, 5) %}
                                <a href="?q={{ tag }}" class="tag">{{ tag }}</a>
                            {% endfor %}
                        </div>
                    </div>
                </article>
            {% endfor %}
        </div>
    {% else %}
        {# Trending topics and recent news #}
        <div class="news-home">
            <div class="trending-section">
                <h3>Trending Topics</h3>
                <div class="trending-topics">
                    {% for bucket in results.aggregations.trending_topics.buckets %}
                        <a href="?q={{ bucket.key }}" 
                           class="trending-topic"
                           style="font-size: {{ 1 + (bucket.doc_count / 50) }}em">
                            {{ bucket.key }}
                            <small>({{ bucket.doc_count }})</small>
                        </a>
                    {% endfor %}
                </div>
            </div>
            
            <div class="recent-news">
                <h3>Latest News</h3>
                {# Display recent articles without search term #}
            </div>
        </div>
    {% endif %}
</div>
```

These custom implementations demonstrate how to adapt Search with Elastic for specific industries and use cases. Each example shows specialized filtering, scoring, and user interface patterns that work well for different types of content and user needs.