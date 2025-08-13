# Frontend Examples

Complete working examples showing how to implement AJAX search, autocomplete, real-time search, and responsive interfaces.

## AJAX Search Implementation

Build a modern search experience without page reloads:

:::code-group

```html [search-form.html]
<form id="ajax-search-form" class="search-form">
    <div class="search-input-wrapper">
        <input 
            type="search" 
            id="search-input"
            name="q" 
            placeholder="Search articles, guides, and resources..."
            autocomplete="off"
            aria-describedby="search-status"
        >
        <button type="submit" aria-label="Search">
            <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.518 6.518 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
        </button>
    </div>
    
    <div id="search-status" class="search-status" aria-live="polite"></div>
    
    <div class="search-filters" style="display: none;">
        <select name="contentType" id="content-type">
            <option value="">All Types</option>
            <option value="entry">Articles</option>
            <option value="asset">Files</option>
            <option value="category">Categories</option>
        </select>
        
        <label class="fuzzy-toggle">
            <input type="checkbox" name="fuzzy" checked>
            Smart Search
        </label>
    </div>
</form>

<div id="search-results" class="search-results" role="region" aria-label="Search results">
    <!-- Results will be loaded here -->
</div>

<div id="search-loading" class="search-loading" style="display: none;">
    <div class="loading-spinner"></div>
    <p>Searching...</p>
</div>
```

```javascript [ajax-search.js]
class ElasticsearchAjax {
    constructor(options = {}) {
        this.form = document.getElementById('ajax-search-form');
        this.input = document.getElementById('search-input');
        this.resultsContainer = document.getElementById('search-results');
        this.loadingIndicator = document.getElementById('search-loading');
        this.statusElement = document.getElementById('search-status');
        
        // Configuration
        this.searchEndpoint = options.endpoint || '/search/ajax';
        this.debounceDelay = options.debounceDelay || 300;
        this.minQueryLength = options.minQueryLength || 2;
        
        // State
        this.currentQuery = '';
        this.searchTimeout = null;
        this.abortController = null;
        
        this.init();
    }
    
    init() {
        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.performSearch();
        });
        
        // Real-time search with debouncing
        this.input.addEventListener('input', (e) => {
            this.debounceSearch(e.target.value);
        });
        
        // Filter changes
        const filters = this.form.querySelectorAll('select, input[type="checkbox"]');
        filters.forEach(filter => {
            filter.addEventListener('change', () => {
                if (this.currentQuery.length >= this.minQueryLength) {
                    this.performSearch();
                }
            });
        });
        
        // Keyboard navigation
        this.input.addEventListener('keydown', (e) => {
            this.handleKeyNavigation(e);
        });
    }
    
    debounceSearch(query) {
        clearTimeout(this.searchTimeout);
        
        if (query.length < this.minQueryLength) {
            this.clearResults();
            return;
        }
        
        this.searchTimeout = setTimeout(() => {
            this.currentQuery = query;
            this.performSearch();
        }, this.debounceDelay);
    }
    
    async performSearch() {
        const query = this.input.value.trim();
        
        if (query.length < this.minQueryLength) {
            this.clearResults();
            return;
        }
        
        // Cancel previous request
        if (this.abortController) {
            this.abortController.abort();
        }
        
        this.abortController = new AbortController();
        
        try {
            this.showLoading();
            
            const formData = new FormData(this.form);
            const params = new URLSearchParams(formData);
            
            const response = await fetch(`${this.searchEndpoint}?${params}`, {
                signal: this.abortController.signal,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.displayResults(data);
            
        } catch (error) {
            if (error.name !== 'AbortError') {
                this.displayError(error.message);
            }
        } finally {
            this.hideLoading();
        }
    }
    
    displayResults(data) {
        const { results, query, totalHits } = data;
        
        if (!results || results.length === 0) {
            this.displayNoResults(query);
            return;
        }
        
        let html = `
            <header class="results-header">
                <h2>Found ${totalHits || results.length} results for "${query}"</h2>
            </header>
            <ul class="results-list">
        `;
        
        results.forEach((hit, index) => {
            html += this.renderResult(hit, index);
        });
        
        html += '</ul>';
        
        this.resultsContainer.innerHTML = html;
        this.updateStatus(`${results.length} results found`);
        
        // Focus management
        this.announceResults(results.length, query);
    }
    
    renderResult(hit, index) {
        const source = hit._source;
        const highlight = hit.highlight || {};
        
        const title = highlight.title ? highlight.title[0] : source.title;
        const content = highlight.content ? 
            highlight.content.slice(0, 2).join(' ... ') : 
            this.truncateText(source.content, 200);
        
        return `
            <li class="result-item" data-result-index="${index}">
                <article class="search-result">
                    <header class="result-header">
                        <h3 class="result-title">
                            ${source.url ? 
                                `<a href="${source.url}" tabindex="0">${title}</a>` : 
                                title
                            }
                        </h3>
                        <div class="result-meta">
                            <span class="result-type">${source.elementType}</span>
                            ${source.dateCreated ? 
                                `<time datetime="${source.dateCreated}">${this.formatDate(source.dateCreated)}</time>` : 
                                ''
                            }
                        </div>
                    </header>
                    <div class="result-content">
                        <p class="result-excerpt">${content}</p>
                    </div>
                    ${source.url ? 
                        `<footer class="result-footer">
                            <span class="result-url">${source.url}</span>
                        </footer>` : 
                        ''
                    }
                </article>
            </li>
        `;
    }
    
    displayNoResults(query) {
        this.resultsContainer.innerHTML = `
            <div class="no-results">
                <h2>No results found for "${query}"</h2>
                <div class="no-results-suggestions">
                    <h3>Try:</h3>
                    <ul>
                        <li>Checking your spelling</li>
                        <li>Using different keywords</li>
                        <li>Using more general terms</li>
                        <li>Removing filters</li>
                    </ul>
                </div>
            </div>
        `;
        this.updateStatus('No results found');
    }
    
    displayError(message) {
        this.resultsContainer.innerHTML = `
            <div class="search-error">
                <h2>Search Error</h2>
                <p>Sorry, there was a problem with your search: ${message}</p>
                <button onclick="location.reload()" class="retry-button">
                    Try Again
                </button>
            </div>
        `;
        this.updateStatus('Search error occurred');
    }
    
    showLoading() {
        this.loadingIndicator.style.display = 'flex';
        this.input.setAttribute('aria-busy', 'true');
        this.updateStatus('Searching...');
    }
    
    hideLoading() {
        this.loadingIndicator.style.display = 'none';
        this.input.setAttribute('aria-busy', 'false');
    }
    
    clearResults() {
        this.resultsContainer.innerHTML = '';
        this.updateStatus('');
    }
    
    updateStatus(message) {
        this.statusElement.textContent = message;
    }
    
    announceResults(count, query) {
        const announcement = count > 0 ? 
            `${count} results found for ${query}` : 
            `No results found for ${query}`;
        
        // Create temporary announcement for screen readers
        const announcement_el = document.createElement('div');
        announcement_el.setAttribute('aria-live', 'assertive');
        announcement_el.setAttribute('aria-atomic', 'true');
        announcement_el.classList.add('sr-only');
        announcement_el.textContent = announcement;
        
        document.body.appendChild(announcement_el);
        setTimeout(() => document.body.removeChild(announcement_el), 1000);
    }
    
    handleKeyNavigation(e) {
        // Implement keyboard navigation for results
        const results = this.resultsContainer.querySelectorAll('.result-item a');
        
        if (e.key === 'ArrowDown' && results.length > 0) {
            e.preventDefault();
            results[0].focus();
        }
    }
    
    truncateText(text, length) {
        if (!text) return '';
        const stripped = text.replace(/<[^>]*>/g, '');
        return stripped.length > length ? 
            stripped.substring(0, length) + '...' : 
            stripped;
    }
    
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ElasticsearchAjax({
        endpoint: '/search/ajax',
        debounceDelay: 300,
        minQueryLength: 2
    });
});
```

```php [SearchController.php]
<?php
// In your Craft controller or template
public function actionAjax()
{
    $this->requireAcceptsJson();
    
    $query = $this->request->getParam('q', '');
    $contentType = $this->request->getParam('contentType', '');
    $fuzzy = $this->request->getParam('fuzzy', true);
    
    if (strlen($query) < 2) {
        return $this->asJson([
            'results' => [],
            'query' => $query,
            'totalHits' => 0
        ]);
    }
    
    try {
        $searchOptions = [
            'fuzzy' => (bool)$fuzzy,
            'size' => 20,
            'fields' => ['title', 'content']
        ];
        
        $results = SearchWithElastic::getInstance()->service->searchExtra($query, $searchOptions);
        
        // Filter by content type if specified
        if ($contentType) {
            $results = array_filter($results, function($hit) use ($contentType) {
                return $hit['_source']['elementType'] === $contentType;
            });
            $results = array_values($results); // Reindex array
        }
        
        return $this->asJson([
            'results' => $results,
            'query' => $query,
            'totalHits' => count($results),
            'contentType' => $contentType
        ]);
        
    } catch (\Exception $e) {
        return $this->asErrorJson('Search failed: ' . $e->getMessage());
    }
}
```

:::

## Autocomplete Implementation

Create a smart autocomplete search interface:

:::code-group

```html [autocomplete.html]
<div class="autocomplete-container">
    <form id="autocomplete-form" class="search-form">
        <div class="autocomplete-wrapper" role="combobox" aria-expanded="false" aria-haspopup="listbox">
            <input 
                type="search"
                id="autocomplete-input"
                name="q"
                placeholder="Start typing to search..."
                autocomplete="off"
                aria-autocomplete="list"
                aria-describedby="autocomplete-instructions"
                role="searchbox"
            >
            <div id="autocomplete-instructions" class="sr-only">
                Use arrow keys to navigate suggestions, enter to select
            </div>
        </div>
        
        <div id="autocomplete-suggestions" 
             class="autocomplete-suggestions" 
             role="listbox" 
             aria-label="Search suggestions"
             style="display: none;">
            <!-- Dynamic suggestions -->
        </div>
    </form>
</div>
```

```javascript [autocomplete.js]
class ElasticsearchAutocomplete {
    constructor(options = {}) {
        this.input = document.getElementById('autocomplete-input');
        this.suggestionsContainer = document.getElementById('autocomplete-suggestions');
        this.wrapper = this.input.closest('.autocomplete-wrapper');
        
        // Configuration
        this.searchEndpoint = options.endpoint || '/search/suggestions';
        this.debounceDelay = options.debounceDelay || 200;
        this.minQueryLength = options.minQueryLength || 2;
        this.maxSuggestions = options.maxSuggestions || 8;
        
        // State
        this.currentQuery = '';
        this.suggestions = [];
        this.selectedIndex = -1;
        this.searchTimeout = null;
        this.abortController = null;
        
        this.init();
    }
    
    init() {
        // Input events
        this.input.addEventListener('input', (e) => {
            this.handleInput(e.target.value);
        });
        
        this.input.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });
        
        this.input.addEventListener('focus', () => {
            if (this.suggestions.length > 0) {
                this.showSuggestions();
            }
        });
        
        this.input.addEventListener('blur', (e) => {
            // Delay hiding suggestions to allow click events
            setTimeout(() => {
                if (!this.suggestionsContainer.contains(document.activeElement)) {
                    this.hideSuggestions();
                }
            }, 200);
        });
        
        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target)) {
                this.hideSuggestions();
            }
        });
    }
    
    handleInput(value) {
        const query = value.trim();
        
        if (query.length < this.minQueryLength) {
            this.hideSuggestions();
            return;
        }
        
        if (query === this.currentQuery) {
            return;
        }
        
        this.currentQuery = query;
        
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.fetchSuggestions(query);
        }, this.debounceDelay);
    }
    
    async fetchSuggestions(query) {
        // Cancel previous request
        if (this.abortController) {
            this.abortController.abort();
        }
        
        this.abortController = new AbortController();
        
        try {
            const response = await fetch(`${this.searchEndpoint}?q=${encodeURIComponent(query)}&limit=${this.maxSuggestions}`, {
                signal: this.abortController.signal,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            this.displaySuggestions(data.suggestions || []);
            
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.warn('Autocomplete fetch failed:', error);
                this.hideSuggestions();
            }
        }
    }
    
    displaySuggestions(suggestions) {
        this.suggestions = suggestions;
        this.selectedIndex = -1;
        
        if (suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }
        
        let html = '';
        
        suggestions.forEach((suggestion, index) => {
            const isSelected = index === this.selectedIndex;
            html += `
                <div class="autocomplete-suggestion ${isSelected ? 'selected' : ''}" 
                     role="option" 
                     aria-selected="${isSelected}"
                     data-index="${index}"
                     data-value="${suggestion.title}">
                    
                    <div class="suggestion-content">
                        <div class="suggestion-title">${this.highlightMatch(suggestion.title, this.currentQuery)}</div>
                        
                        ${suggestion.type ? 
                            `<div class="suggestion-type">${suggestion.type}</div>` : 
                            ''
                        }
                        
                        ${suggestion.excerpt ? 
                            `<div class="suggestion-excerpt">${this.highlightMatch(suggestion.excerpt, this.currentQuery)}</div>` : 
                            ''
                        }
                    </div>
                    
                    ${suggestion.url ? 
                        `<div class="suggestion-action">
                            <svg width="16" height="16" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                            </svg>
                        </div>` : 
                        ''
                    }
                </div>
            `;
        });
        
        this.suggestionsContainer.innerHTML = html;
        this.showSuggestions();
        this.attachSuggestionEvents();
    }
    
    attachSuggestionEvents() {
        const suggestionElements = this.suggestionsContainer.querySelectorAll('.autocomplete-suggestion');
        
        suggestionElements.forEach((element, index) => {
            element.addEventListener('click', () => {
                this.selectSuggestion(index);
            });
            
            element.addEventListener('mouseenter', () => {
                this.selectedIndex = index;
                this.updateSelection();
            });
        });
    }
    
    handleKeydown(e) {
        if (!this.isOpen()) {
            return;
        }
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
                this.updateSelection();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.updateSelection();
                break;
                
            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0) {
                    this.selectSuggestion(this.selectedIndex);
                } else {
                    this.submitSearch();
                }
                break;
                
            case 'Escape':
                this.hideSuggestions();
                break;
        }
    }
    
    selectSuggestion(index) {
        const suggestion = this.suggestions[index];
        if (!suggestion) return;
        
        this.input.value = suggestion.title;
        this.hideSuggestions();
        
        // Navigate to URL if available, otherwise submit search
        if (suggestion.url) {
            window.location.href = suggestion.url;
        } else {
            this.submitSearch();
        }
        
        // Track selection
        this.trackSuggestionSelection(suggestion, index);
    }
    
    updateSelection() {
        const suggestions = this.suggestionsContainer.querySelectorAll('.autocomplete-suggestion');
        
        suggestions.forEach((element, index) => {
            const isSelected = index === this.selectedIndex;
            element.classList.toggle('selected', isSelected);
            element.setAttribute('aria-selected', isSelected);
        });
        
        // Update input value for keyboard navigation
        if (this.selectedIndex >= 0) {
            const suggestion = this.suggestions[this.selectedIndex];
            this.input.value = suggestion.title;
        }
    }
    
    showSuggestions() {
        this.suggestionsContainer.style.display = 'block';
        this.wrapper.setAttribute('aria-expanded', 'true');
        this.input.setAttribute('aria-activedescendant', '');
    }
    
    hideSuggestions() {
        this.suggestionsContainer.style.display = 'none';
        this.wrapper.setAttribute('aria-expanded', 'false');
        this.input.removeAttribute('aria-activedescendant');
        this.selectedIndex = -1;
    }
    
    isOpen() {
        return this.suggestionsContainer.style.display === 'block';
    }
    
    submitSearch() {
        const query = this.input.value.trim();
        if (query) {
            window.location.href = `/search?q=${encodeURIComponent(query)}`;
        }
    }
    
    highlightMatch(text, query) {
        if (!query || !text) return text;
        
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    trackSuggestionSelection(suggestion, index) {
        // Analytics tracking
        if (typeof gtag !== 'undefined') {
            gtag('event', 'select_suggestion', {
                suggestion_title: suggestion.title,
                suggestion_index: index,
                search_query: this.currentQuery
            });
        }
    }
}

// Initialize autocomplete
document.addEventListener('DOMContentLoaded', () => {
    new ElasticsearchAutocomplete({
        endpoint: '/search/suggestions',
        debounceDelay: 200,
        minQueryLength: 2,
        maxSuggestions: 8
    });
});
```

:::

## Mobile-Responsive Search Interface

Create a search interface that works perfectly on mobile devices:

:::code-group

```html [mobile-search.html]
<div class="mobile-search-container">
    <!-- Mobile search trigger -->
    <button class="mobile-search-trigger" aria-label="Open search">
        <svg width="24" height="24" viewBox="0 0 24 24">
            <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.518 6.518 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
    </button>
    
    <!-- Full-screen mobile search overlay -->
    <div class="mobile-search-overlay" style="display: none;">
        <div class="mobile-search-header">
            <form class="mobile-search-form">
                <input 
                    type="search"
                    id="mobile-search-input"
                    placeholder="Search..."
                    autocomplete="off"
                >
                <button type="button" class="mobile-search-close" aria-label="Close search">
                    <svg width="24" height="24" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </form>
        </div>
        
        <div class="mobile-search-content">
            <div class="mobile-search-suggestions">
                <!-- Popular searches -->
                <div class="popular-searches">
                    <h3>Popular Searches</h3>
                    <div class="search-tags">
                        <button class="search-tag" data-query="coffee recipes">Coffee Recipes</button>
                        <button class="search-tag" data-query="brewing guide">Brewing Guide</button>
                        <button class="search-tag" data-query="equipment">Equipment</button>
                        <button class="search-tag" data-query="tutorials">Tutorials</button>
                    </div>
                </div>
                
                <!-- Recent searches -->
                <div class="recent-searches" style="display: none;">
                    <h3>Recent Searches</h3>
                    <ul class="recent-list" id="recent-searches-list">
                        <!-- Populated by JavaScript -->
                    </ul>
                </div>
            </div>
            
            <div class="mobile-search-results" id="mobile-results">
                <!-- Results loaded here -->
            </div>
        </div>
    </div>
</div>
```

```css [mobile-search.css]
/* Mobile search styles */
.mobile-search-trigger {
    display: none;
    background: none;
    border: none;
    padding: 0.5rem;
    cursor: pointer;
    color: inherit;
}

.mobile-search-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--bg-color, #fff);
    z-index: 1000;
    display: flex;
    flex-direction: column;
}

.mobile-search-header {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
    background: var(--header-bg, #f8f9fa);
}

.mobile-search-form {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.mobile-search-form input {
    flex: 1;
    border: none;
    background: none;
    font-size: 1.125rem;
    padding: 0;
    outline: none;
}

.mobile-search-close {
    background: none;
    border: none;
    padding: 0.5rem;
    cursor: pointer;
    color: inherit;
}

.mobile-search-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
}

.popular-searches,
.recent-searches {
    margin-bottom: 2rem;
}

.popular-searches h3,
.recent-searches h3 {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-muted, #6c757d);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 1rem;
}

.search-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.search-tag {
    background: var(--tag-bg, #e9ecef);
    border: none;
    border-radius: 1rem;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.2s;
}

.search-tag:hover {
    background: var(--tag-hover, #dee2e6);
}

.recent-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.recent-item {
    display: flex;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border-light, #f0f0f0);
    cursor: pointer;
}

.recent-item:hover {
    background: var(--hover-bg, #f8f9fa);
}

.recent-query {
    flex: 1;
    font-size: 1rem;
}

.recent-remove {
    background: none;
    border: none;
    color: var(--text-muted, #6c757d);
    cursor: pointer;
    padding: 0.25rem;
}

.mobile-search-results .result-item {
    padding: 1rem 0;
    border-bottom: 1px solid var(--border-light, #f0f0f0);
}

.mobile-search-results .result-title {
    font-size: 1.125rem;
    margin-bottom: 0.5rem;
}

.mobile-search-results .result-excerpt {
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--text-muted, #6c757d);
}

/* Responsive behavior */
@media (max-width: 768px) {
    .mobile-search-trigger {
        display: block;
    }
    
    .desktop-search-form {
        display: none;
    }
}

@media (min-width: 769px) {
    .mobile-search-container {
        display: none;
    }
}
```

```javascript [mobile-search.js]
class MobileSearch {
    constructor() {
        this.trigger = document.querySelector('.mobile-search-trigger');
        this.overlay = document.querySelector('.mobile-search-overlay');
        this.input = document.getElementById('mobile-search-input');
        this.closeBtn = document.querySelector('.mobile-search-close');
        this.resultsContainer = document.getElementById('mobile-results');
        this.suggestionsContainer = document.querySelector('.mobile-search-suggestions');
        
        // State
        this.isOpen = false;
        this.searchTimeout = null;
        this.recentSearches = this.loadRecentSearches();
        
        this.init();
    }
    
    init() {
        // Open search
        this.trigger.addEventListener('click', () => {
            this.openSearch();
        });
        
        // Close search
        this.closeBtn.addEventListener('click', () => {
            this.closeSearch();
        });
        
        // Input handling
        this.input.addEventListener('input', (e) => {
            this.handleInput(e.target.value);
        });
        
        // Search tag clicks
        document.querySelectorAll('.search-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                const query = e.target.dataset.query;
                this.performSearch(query);
            });
        });
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeSearch();
            }
        });
        
        this.renderRecentSearches();
    }
    
    openSearch() {
        this.overlay.style.display = 'flex';
        this.isOpen = true;
        
        // Focus input after animation
        setTimeout(() => {
            this.input.focus();
        }, 100);
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Show suggestions
        this.suggestionsContainer.style.display = 'block';
        this.resultsContainer.style.display = 'none';
    }
    
    closeSearch() {
        this.overlay.style.display = 'none';
        this.isOpen = false;
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Clear input
        this.input.value = '';
        this.resultsContainer.innerHTML = '';
    }
    
    handleInput(query) {
        clearTimeout(this.searchTimeout);
        
        if (query.length === 0) {
            this.showSuggestions();
            return;
        }
        
        if (query.length < 2) {
            return;
        }
        
        this.searchTimeout = setTimeout(() => {
            this.performSearch(query);
        }, 300);
    }
    
    async performSearch(query) {
        this.input.value = query;
        this.hideSuggestions();
        
        try {
            const response = await fetch(`/search/ajax?q=${encodeURIComponent(query)}&mobile=1`);
            const data = await response.json();
            
            this.displayResults(data.results, query);
            this.addToRecentSearches(query);
            
        } catch (error) {
            console.error('Mobile search failed:', error);
            this.displayError('Search failed. Please try again.');
        }
    }
    
    displayResults(results, query) {
        if (!results || results.length === 0) {
            this.resultsContainer.innerHTML = `
                <div class="no-results">
                    <h3>No results found for "${query}"</h3>
                    <p>Try adjusting your search terms.</p>
                </div>
            `;
        } else {
            let html = `<h3>Results for "${query}"</h3>`;
            
            results.forEach(hit => {
                const source = hit._source;
                html += `
                    <div class="result-item">
                        <h4 class="result-title">
                            <a href="${source.url || '#'}">${source.title}</a>
                        </h4>
                        <p class="result-excerpt">
                            ${this.truncate(source.content, 120)}
                        </p>
                        <div class="result-meta">
                            <span>${source.elementType}</span>
                        </div>
                    </div>
                `;
            });
            
            this.resultsContainer.innerHTML = html;
        }
        
        this.resultsContainer.style.display = 'block';
    }
    
    displayError(message) {
        this.resultsContainer.innerHTML = `
            <div class="search-error">
                <p>${message}</p>
            </div>
        `;
        this.resultsContainer.style.display = 'block';
    }
    
    showSuggestions() {
        this.suggestionsContainer.style.display = 'block';
        this.resultsContainer.style.display = 'none';
    }
    
    hideSuggestions() {
        this.suggestionsContainer.style.display = 'none';
    }
    
    loadRecentSearches() {
        try {
            return JSON.parse(localStorage.getItem('recentSearches')) || [];
        } catch {
            return [];
        }
    }
    
    saveRecentSearches() {
        try {
            localStorage.setItem('recentSearches', JSON.stringify(this.recentSearches));
        } catch {
            console.warn('Could not save recent searches');
        }
    }
    
    addToRecentSearches(query) {
        // Remove if already exists
        this.recentSearches = this.recentSearches.filter(item => item !== query);
        
        // Add to beginning
        this.recentSearches.unshift(query);
        
        // Limit to 10 items
        this.recentSearches = this.recentSearches.slice(0, 10);
        
        this.saveRecentSearches();
        this.renderRecentSearches();
    }
    
    renderRecentSearches() {
        const container = document.getElementById('recent-searches-list');
        const recentSection = document.querySelector('.recent-searches');
        
        if (this.recentSearches.length === 0) {
            recentSection.style.display = 'none';
            return;
        }
        
        recentSection.style.display = 'block';
        
        container.innerHTML = this.recentSearches.map(query => `
            <li class="recent-item" data-query="${query}">
                <span class="recent-query">${query}</span>
                <button class="recent-remove" data-query="${query}" aria-label="Remove">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </li>
        `).join('');
        
        // Add event listeners
        container.querySelectorAll('.recent-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('recent-remove')) {
                    this.performSearch(item.dataset.query);
                }
            });
        });
        
        container.querySelectorAll('.recent-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeRecentSearch(btn.dataset.query);
            });
        });
    }
    
    removeRecentSearch(query) {
        this.recentSearches = this.recentSearches.filter(item => item !== query);
        this.saveRecentSearches();
        this.renderRecentSearches();
    }
    
    truncate(text, length) {
        if (!text) return '';
        const stripped = text.replace(/<[^>]*>/g, '');
        return stripped.length > length ? stripped.substring(0, length) + '...' : stripped;
    }
}

// Initialize mobile search
document.addEventListener('DOMContentLoaded', () => {
    new MobileSearch();
});
```

:::

## Advanced Features Integration

Combine multiple features for a complete search experience:

```twig
{# Complete search template with all features #}
<div class="search-page">
    <!-- Desktop search form -->
    <div class="desktop-search">
        <form id="main-search-form" class="search-form">
            <div class="search-input-group">
                <input type="search" name="q" placeholder="Search everything..." 
                       value="{{ craft.app.request.getParam('q', '') | e('html_attr') }}">
                <button type="submit">Search</button>
            </div>
            
            <div class="search-filters">
                <select name="type">
                    <option value="">All Content</option>
                    <option value="entry">Articles</option>
                    <option value="asset">Files</option>
                </select>
                
                <label>
                    <input type="checkbox" name="fuzzy" checked>
                    Smart Search
                </label>
            </div>
        </form>
    </div>
    
    <!-- Mobile search trigger -->
    <div class="mobile-search-container">
        <button class="mobile-search-trigger">Search</button>
        <!-- Mobile overlay from previous example -->
    </div>
    
    <!-- Search results -->
    <div id="search-results-container">
        {% if craft.app.request.getParam('q') %}
            {{ include('_search-results.twig') }}
        {% endif %}
    </div>
    
    <!-- Debugging info (only in dev) -->
    {% if craft.app.config.env == 'dev' %}
        <details class="debug-info">
            <summary>Debug Information</summary>
            {% set stats = craft.searchWithElastic.getAllIndexStats() %}
            <pre>{{ stats | json_encode(constant('JSON_PRETTY_PRINT')) }}</pre>
        </details>
    {% endif %}
</div>

<script>
// Initialize all search functionality
document.addEventListener('DOMContentLoaded', () => {
    // AJAX search for desktop
    new ElasticsearchAjax({
        endpoint: '/search/ajax',
        debounceDelay: 300
    });
    
    // Autocomplete for main input
    new ElasticsearchAutocomplete({
        endpoint: '/search/suggestions'
    });
    
    // Mobile search interface
    new MobileSearch();
    
    // Search analytics
    if (typeof gtag !== 'undefined') {
        const query = new URLSearchParams(window.location.search).get('q');
        if (query) {
            gtag('event', 'search', {
                search_term: query
            });
        }
    }
});
</script>
```

This comprehensive set of frontend examples provides everything needed to implement modern, responsive search functionality with the Craft Search with Elastic plugin. Each example can be used independently or combined for a complete search experience.