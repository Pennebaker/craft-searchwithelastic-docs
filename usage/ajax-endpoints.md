# AJAX Search Endpoints

Search with Elastic provides secure AJAX endpoints for implementing dynamic search experiences in your frontend templates.

## Available Endpoints

### Basic Search
`POST /search-with-elastic/search`

Simple search endpoint for basic text queries.

#### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | The search query text |
| `siteId` | integer | No | Site ID to search within (defaults to current site) |

#### Response Format
```json
{
    "success": true,
    "results": [
        {
            "id": 123,
            "title": "Search Result Title",
            "url": "/path/to/content",
            "score": 0.95,
            "highlight": {
                "title": ["Search Result <mark>Title</mark>"],
                "content": ["...matching <mark>content</mark> excerpt..."]
            }
        }
    ],
    "meta": {
        "query": "search term",
        "siteId": 1,
        "timestamp": 1704067200
    }
}
```

### Advanced Search
`POST /search-with-elastic/search-extra`

Extended search endpoint with additional options for complex queries.

#### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | The search query text |
| `fuzzy` | boolean | No | Enable fuzzy matching for typos |
| `fields` | array/string | No | Specific fields to search in |
| `siteId` | integer | No | Site ID to search within |
| `size` | integer | No | Number of results to return (default: 10) |
| `from` | integer | No | Offset for pagination (default: 0) |

#### Response Format
```json
{
    "success": true,
    "results": [...],
    "meta": {
        "query": "search term",
        "siteId": 1,
        "timestamp": 1704067200,
        "options": {
            "fuzzy": true,
            "fields": ["title", "content"],
            "size": 10,
            "from": 0
        }
    }
}
```

## Implementation Examples

### Basic Search with JavaScript

```javascript
// Simple search implementation
async function performSearch(searchTerm) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
    
    try {
        const response = await fetch('/search-with-elastic/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({
                query: searchTerm
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            displayResults(data.results);
        } else if (response.status === 429) {
            handleRateLimit(response);
        } else {
            console.error('Search failed:', response.statusText);
        }
    } catch (error) {
        console.error('Search error:', error);
    }
}

function displayResults(results) {
    const container = document.getElementById('search-results');
    container.innerHTML = results.map(result => `
        <div class="search-result">
            <h3><a href="${result.url}">${result.title}</a></h3>
            <p>${result.highlight?.content?.[0] || result.excerpt}</p>
            <small>Score: ${result.score.toFixed(2)}</small>
        </div>
    `).join('');
}

function handleRateLimit(response) {
    const retryAfter = response.headers.get('Retry-After');
    console.warn(`Rate limited. Retry after ${retryAfter} seconds`);
    // Show user-friendly message
    document.getElementById('search-error').textContent = 
        'Too many searches. Please wait a moment and try again.';
}
```

### Advanced Search with Options

```javascript
// Advanced search with fuzzy matching and field selection
async function advancedSearch(query, options = {}) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
    
    const searchParams = {
        query: query,
        fuzzy: options.fuzzy || false,
        fields: options.fields || ['title', 'content'],
        size: options.size || 10,
        from: options.from || 0
    };
    
    try {
        const response = await fetch('/search-with-elastic/search-extra', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify(searchParams)
        });
        
        if (response.ok) {
            return await response.json();
        }
        throw new Error(`Search failed: ${response.statusText}`);
    } catch (error) {
        console.error('Advanced search error:', error);
        throw error;
    }
}

// Usage example
advancedSearch('craft cms', {
    fuzzy: true,
    fields: ['title', 'excerpt', 'content'],
    size: 20
}).then(data => {
    console.log(`Found ${data.results.length} results`);
    displayResults(data.results);
});
```

### Search with jQuery

```javascript
// jQuery implementation
$(document).ready(function() {
    $('#search-form').on('submit', function(e) {
        e.preventDefault();
        
        const searchTerm = $('#search-input').val();
        const csrfToken = $('meta[name="csrf-token"]').attr('content');
        
        $.ajax({
            url: '/search-with-elastic/search',
            method: 'POST',
            headers: {
                'X-CSRF-Token': csrfToken
            },
            data: JSON.stringify({ query: searchTerm }),
            contentType: 'application/json',
            success: function(data) {
                displaySearchResults(data.results);
            },
            error: function(xhr) {
                if (xhr.status === 429) {
                    const retryAfter = xhr.getResponseHeader('Retry-After');
                    showRateLimitMessage(retryAfter);
                } else {
                    showErrorMessage('Search failed. Please try again.');
                }
            }
        });
    });
});
```

### React Component Example

```jsx
import React, { useState, useCallback } from 'react';

function SearchComponent() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const performSearch = useCallback(async () => {
        if (!query.trim()) return;
        
        setLoading(true);
        setError(null);
        
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
        
        try {
            const response = await fetch('/search-with-elastic/search-extra', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    query: query,
                    fuzzy: true,
                    size: 20
                })
            });
            
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                setError(`Rate limited. Please wait ${retryAfter} seconds.`);
                return;
            }
            
            if (!response.ok) {
                throw new Error('Search failed');
            }
            
            const data = await response.json();
            setResults(data.results);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [query]);
    
    return (
        <div className="search-component">
            <form onSubmit={(e) => { e.preventDefault(); performSearch(); }}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search..."
                    disabled={loading}
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </form>
            
            {error && <div className="error">{error}</div>}
            
            <div className="results">
                {results.map(result => (
                    <div key={result.id} className="result-item">
                        <h3><a href={result.url}>{result.title}</a></h3>
                        <p dangerouslySetInnerHTML={{ 
                            __html: result.highlight?.content?.[0] || result.excerpt 
                        }} />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default SearchComponent;
```

## CSRF Token Setup

All AJAX requests require a CSRF token for security. Include it in your layout:

```twig
{# In your layout template #}
<meta name="csrf-token" content="{{ craft.app.request.csrfToken }}">
```

Alternative method using Craft's JavaScript variables:

```twig
{% js %}
    window.csrfTokenName = "{{ craft.app.config.general.csrfTokenName }}";
    window.csrfTokenValue = "{{ craft.app.request.csrfToken }}";
{% endjs %}
```

## Rate Limiting Handling

When rate limiting is enabled, the endpoints return HTTP 429 when limits are exceeded:

```javascript
// Complete rate limiting handler
function handleSearchWithRateLimit(searchTerm) {
    const startTime = Date.now();
    
    performSearch(searchTerm)
        .then(handleSuccess)
        .catch(error => {
            if (error.status === 429) {
                const retryAfter = parseInt(error.headers.get('Retry-After')) || 60;
                const remainingRequests = error.headers.get('X-RateLimit-Remaining');
                const resetTime = error.headers.get('X-RateLimit-Reset');
                
                console.log(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
                console.log(`Remaining requests: ${remainingRequests}`);
                console.log(`Reset time: ${new Date(resetTime * 1000).toLocaleTimeString()}`);
                
                // Implement exponential backoff
                setTimeout(() => {
                    handleSearchWithRateLimit(searchTerm);
                }, retryAfter * 1000);
                
                // Show user message
                showUserMessage({
                    type: 'warning',
                    message: `Search limit reached. Please wait ${retryAfter} seconds.`,
                    duration: retryAfter * 1000
                });
            } else {
                console.error('Search failed:', error);
                showUserMessage({
                    type: 'error',
                    message: 'Search failed. Please try again later.'
                });
            }
        });
}
```

## Pagination Implementation

Implement pagination using the `size` and `from` parameters:

```javascript
class SearchPagination {
    constructor(resultsPerPage = 10) {
        this.resultsPerPage = resultsPerPage;
        this.currentPage = 1;
        this.totalResults = 0;
    }
    
    async search(query, page = 1) {
        this.currentPage = page;
        const from = (page - 1) * this.resultsPerPage;
        
        const response = await fetch('/search-with-elastic/search-extra', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': this.getCsrfToken()
            },
            body: JSON.stringify({
                query: query,
                size: this.resultsPerPage,
                from: from
            })
        });
        
        const data = await response.json();
        this.totalResults = data.meta.total || data.results.length;
        
        return {
            results: data.results,
            pagination: {
                current: this.currentPage,
                total: Math.ceil(this.totalResults / this.resultsPerPage),
                hasNext: from + this.resultsPerPage < this.totalResults,
                hasPrev: page > 1
            }
        };
    }
    
    getCsrfToken() {
        return document.querySelector('meta[name="csrf-token"]')?.content || '';
    }
}

// Usage
const paginator = new SearchPagination(20);
paginator.search('craft cms', 1).then(({ results, pagination }) => {
    displayResults(results);
    displayPagination(pagination);
});
```

## Search Suggestions

Implement type-ahead suggestions with debouncing:

```javascript
class SearchSuggestions {
    constructor(inputElement, options = {}) {
        this.input = inputElement;
        this.debounceTime = options.debounceTime || 300;
        this.minChars = options.minChars || 3;
        this.maxSuggestions = options.maxSuggestions || 5;
        this.debounceTimer = null;
        
        this.init();
    }
    
    init() {
        this.input.addEventListener('input', (e) => {
            this.handleInput(e.target.value);
        });
    }
    
    handleInput(value) {
        clearTimeout(this.debounceTimer);
        
        if (value.length < this.minChars) {
            this.hideSuggestions();
            return;
        }
        
        this.debounceTimer = setTimeout(() => {
            this.fetchSuggestions(value);
        }, this.debounceTime);
    }
    
    async fetchSuggestions(query) {
        try {
            const response = await fetch('/search-with-elastic/search-extra', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.getCsrfToken()
                },
                body: JSON.stringify({
                    query: query,
                    size: this.maxSuggestions,
                    fields: ['title'] // Search only in titles for suggestions
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.displaySuggestions(data.results);
            }
        } catch (error) {
            console.error('Suggestion fetch error:', error);
        }
    }
    
    displaySuggestions(results) {
        // Implementation for displaying suggestions dropdown
        const container = this.getSuggestionsContainer();
        container.innerHTML = results.map(r => `
            <div class="suggestion-item" data-url="${r.url}">
                ${r.title}
            </div>
        `).join('');
        container.style.display = 'block';
    }
    
    hideSuggestions() {
        const container = this.getSuggestionsContainer();
        container.style.display = 'none';
    }
    
    getSuggestionsContainer() {
        // Get or create suggestions container
        let container = document.getElementById('search-suggestions');
        if (!container) {
            container = document.createElement('div');
            container.id = 'search-suggestions';
            container.className = 'suggestions-dropdown';
            this.input.parentNode.appendChild(container);
        }
        return container;
    }
    
    getCsrfToken() {
        return document.querySelector('meta[name="csrf-token"]')?.content || '';
    }
}

// Initialize suggestions
new SearchSuggestions(document.getElementById('search-input'), {
    debounceTime: 250,
    minChars: 2,
    maxSuggestions: 8
});
```

## Error Handling Best Practices

```javascript
class SearchErrorHandler {
    static handle(error, response = null) {
        // Rate limiting
        if (response?.status === 429) {
            return {
                type: 'rate_limit',
                message: 'Too many requests. Please wait.',
                retryAfter: response.headers.get('Retry-After')
            };
        }
        
        // Network errors
        if (error.name === 'NetworkError' || !navigator.onLine) {
            return {
                type: 'network',
                message: 'Network error. Check your connection.'
            };
        }
        
        // Timeout
        if (error.name === 'AbortError') {
            return {
                type: 'timeout',
                message: 'Search timed out. Try again.'
            };
        }
        
        // Server errors
        if (response?.status >= 500) {
            return {
                type: 'server',
                message: 'Server error. Please try later.'
            };
        }
        
        // Client errors
        if (response?.status >= 400) {
            return {
                type: 'client',
                message: 'Invalid search request.'
            };
        }
        
        // Unknown errors
        return {
            type: 'unknown',
            message: 'An error occurred during search.'
        };
    }
}
```

## Testing AJAX Endpoints

Test your endpoints using curl or a REST client:

```bash
# Basic search test
curl -X POST https://yoursite.com/search-with-elastic/search \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: your-csrf-token" \
  -d '{"query": "test search"}'

# Advanced search test
curl -X POST https://yoursite.com/search-with-elastic/search-extra \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: your-csrf-token" \
  -d '{
    "query": "craft cms",
    "fuzzy": true,
    "fields": ["title", "content"],
    "size": 20,
    "from": 0
  }'
```

## Security Considerations

1. **Always include CSRF tokens** in your AJAX requests
2. **Validate and sanitize** search input on the client side
3. **Implement rate limiting** feedback for users
4. **Use HTTPS** in production environments
5. **Handle errors gracefully** without exposing system details
6. **Implement request timeouts** to prevent hanging requests
7. **Cache search results** when appropriate to reduce server load