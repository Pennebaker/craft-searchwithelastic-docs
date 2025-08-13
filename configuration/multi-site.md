# Multi-site configuration

Configure Search with Elastic for multi-site Craft installations. This guide covers site-specific indexing strategies, cross-site search, and managing content in multiple languages and locales.

## Multi-site indexing strategies

The plugin automatically creates separate indexes for each site using the pattern `{prefix}{indexName}_{siteId}`.

### Separate indexes per site (default)

Each site gets its own set of indexes:

```php
return [
    'indexPrefix' => 'craft-',
    'fallbackIndexName' => 'elements',
    
    // This creates:
    // Site 1: craft-elements_1  
    // Site 2: craft-elements_2
    // Site 3: craft-elements_3
];
```

### Site-specific index naming

Customize index names for different sites:

:::code-group

```php [Environment-specific naming]
return [
    'indexPrefix' => match(Craft::$app->sites->getCurrentSite()->handle) {
        'english' => 'en-',
        'french' => 'fr-', 
        'spanish' => 'es-',
        default => 'craft-'
    },
    'fallbackIndexName' => 'content',
];
// Results in: en-content_1, fr-content_2, es-content_3
```

```php [Brand-specific naming]
return [
    'indexPrefix' => match(Craft::$app->sites->getCurrentSite()->handle) {
        'brandA' => 'branda-',
        'brandB' => 'brandb-',
        'corporate' => 'corp-',
        default => 'site-'
    },
    'fallbackIndexName' => 'elements',
];
// Results in: branda-elements_1, brandb-elements_2, corp-elements_3
```

```php [Regional naming]
return [
    'indexPrefix' => match(Craft::$app->sites->getCurrentSite()->handle) {
        'us' => 'us-',
        'uk' => 'uk-',
        'au' => 'au-',
        default => 'global-'
    },
    'fallbackIndexName' => 'content',
];
// Results in: us-content_1, uk-content_2, au-content_3
```

:::

## Site-specific configuration

Configure different settings for each site based on their needs.

### Language-specific settings

:::code-group

```php [Multi-language setup]
return [
    // Base configuration for all sites
    'indexPrefix' => 'craft-',
    'fallbackIndexName' => 'content',
    'enableFrontendFetching' => true,
    
    // Language-specific customizations
    '*' => [
        'highlight' => function() {
            $site = Craft::$app->sites->getCurrentSite();
            
            return match($site->language) {
                'en-US', 'en-GB' => [
                    'pre_tags' => '<mark>',
                    'post_tags' => '</mark>',
                ],
                'fr-FR' => [
                    'pre_tags' => '<em class="highlight">',
                    'post_tags' => '</em>',
                ],
                'es-ES' => [
                    'pre_tags' => '<span class="resaltado">',
                    'post_tags' => '</span>',
                ],
                default => [
                    'pre_tags' => '',
                    'post_tags' => '',
                ]
            };
        },
        
        'assetKinds' => function() {
            $site = Craft::$app->sites->getCurrentSite();
            
            return match($site->language) {
                'en-US' => ['pdf', 'text', 'html', 'word', 'excel'],
                'fr-FR' => ['pdf', 'text', 'html'], // Lighter indexing for French site
                'es-ES' => ['pdf', 'text'],          // Minimal for Spanish site
                default => ['pdf']
            };
        },
    ],
];
```

```php [Site handle-based configuration]
return [
    'indexPrefix' => 'craft-',
    'fallbackIndexName' => 'content',
    
    // Main English site - full indexing
    'english' => [
        'indexableEntryStatuses' => ['pending', 'live'],
        'assetKinds' => ['pdf', 'text', 'html', 'json', 'xml', 'word', 'excel'],
        'enableFrontendFetching' => true,
        'excludedEntryTypes' => [],
    ],
    
    // French site - selective indexing  
    'french' => [
        'indexableEntryStatuses' => ['live'], // Only live content
        'assetKinds' => ['pdf', 'text', 'html'],
        'enableFrontendFetching' => true,
        'excludedEntryTypes' => ['newsArticles'], // Exclude news from French site
    ],
    
    // Mobile site - minimal indexing
    'mobile' => [
        'indexableEntryStatuses' => ['live'],
        'assetKinds' => ['pdf'], // Only PDFs
        'enableFrontendFetching' => false, // Metadata only
        'excludedEntryTypes' => ['longFormContent', 'detailedPages'],
    ],
];
```

:::

### Regional content filtering

Filter content based on regional requirements:

```php
return [
    // Base configuration
    'indexPrefix' => 'regional-',
    'fallbackIndexName' => 'content',
    
    // US site - include all content
    'us' => [
        'excludedEntryTypes' => [],
        'excludedCategoryGroups' => [],
    ],
    
    // EU site - exclude US-specific content  
    'eu' => [
        'excludedEntryTypes' => ['usOnlyProducts', 'usLegalPages'],
        'excludedCategoryGroups' => ['usRegulations'],
        'excludedProductTypes' => ['usOnlyItems'],
    ],
    
    // Asia Pacific site - different content focus
    'apac' => [
        'excludedEntryTypes' => ['usOnlyProducts', 'euOnlyContent'],
        'excludedCategoryGroups' => ['westernRegulations'],
        'assetKinds' => ['pdf', 'text'], // Lighter asset indexing
    ],
];
```

## Cross-site search configuration

Enable searching across multiple sites with unified results.

### Global search setup

```php
// Create a global search service
class GlobalSearchService
{
    public function searchAllSites(string $query): array
    {
        $results = [];
        $sites = Craft::$app->sites->getAllSites();
        
        foreach ($sites as $site) {
            $searchService = \pennebaker\searchwithelastic\SearchWithElastic::getInstance()->service;
            
            // Switch to site context
            Craft::$app->sites->setCurrentSite($site);
            
            // Perform search for this site
            $siteResults = $searchService->search($query);
            
            // Add site information to results
            foreach ($siteResults as &$result) {
                $result['siteId'] = $site->id;
                $result['siteHandle'] = $site->handle;
                $result['siteName'] = $site->name;
                $result['siteLanguage'] = $site->language;
            }
            
            $results = array_merge($results, $siteResults);
        }
        
        // Sort combined results by relevance score
        usort($results, function($a, $b) {
            return $b['score'] <=> $a['score'];
        });
        
        return $results;
    }
}
```

### Cross-site result filtering

Filter and merge results from multiple sites:

```php
'resultFormatterCallback' => function (array $formattedResult, $elasticsearchResult) {
    $site = Craft::$app->sites->getSiteById($formattedResult['siteId']);
    
    // Add site-specific metadata
    $formattedResult['siteInfo'] = [
        'id' => $site->id,
        'handle' => $site->handle,
        'name' => $site->name,
        'language' => $site->language,
        'baseUrl' => $site->baseUrl,
    ];
    
    // Add language-specific formatting
    if ($site->language === 'fr-FR') {
        $formattedResult['dateFormat'] = 'd/m/Y';
    } elseif ($site->language === 'en-US') {
        $formattedResult['dateFormat'] = 'm/d/Y';
    }
    
    // Add cross-site relevance scoring
    $formattedResult['crossSiteScore'] = $elasticsearchResult['_score'] * 
        ($site->primary ? 1.2 : 1.0); // Boost primary site results
    
    return $formattedResult;
},
```

## Language and localization

Configure the plugin for different languages and locales.

### Language-specific content processing

:::code-group

```php [Content extraction by language]
'contentExtractorCallback' => function (string $htmlContent) {
    $site = Craft::$app->sites->getCurrentSite();
    
    // Language-specific content processing
    switch ($site->language) {
        case 'en-US':
        case 'en-GB':
            // English: Remove stop words and normalize
            $content = strip_tags($htmlContent);
            $stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
            $words = explode(' ', strtolower($content));
            $words = array_diff($words, $stopWords);
            return implode(' ', $words);
            
        case 'fr-FR':
            // French: Remove French stop words
            $content = strip_tags($htmlContent);
            $stopWords = ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour'];
            $words = explode(' ', strtolower($content));
            $words = array_diff($words, $stopWords);
            return implode(' ', $words);
            
        case 'es-ES':
            // Spanish: Remove Spanish stop words  
            $content = strip_tags($htmlContent);
            $stopWords = ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'te', 'lo'];
            $words = explode(' ', strtolower($content));
            $words = array_diff($words, $stopWords);
            return implode(' ', $words);
            
        default:
            // Default: Simple tag stripping
            return strip_tags($htmlContent);
    }
},
```

```php [Date formatting by locale]
'extraFields' => [
    'formattedDate' => [
        'mapping' => ['type' => 'keyword'],
        'value' => function (\craft\base\ElementInterface $element) {
            $site = Craft::$app->sites->getCurrentSite();
            $date = $element->postDate ?? $element->dateCreated;
            
            return match($site->language) {
                'en-US' => $date->format('m/d/Y'),
                'en-GB' => $date->format('d/m/Y'),
                'fr-FR' => $date->format('d/m/Y'),
                'de-DE' => $date->format('d.m.Y'),
                default => $date->format('Y-m-d')
            };
        }
    ],
],
```

:::

### Multilingual field mapping

Index content in multiple languages:

```php
'extraFields' => [
    // Multi-language title fields
    'titleEn' => [
        'mapping' => ['type' => 'text', 'analyzer' => 'english'],
        'value' => function (\craft\base\ElementInterface $element) {
            return $element->title ?? '';
        }
    ],
    'titleFr' => [
        'mapping' => ['type' => 'text', 'analyzer' => 'french'],
        'value' => function (\craft\base\ElementInterface $element) {
            // Get French version of the element
            $frenchElement = Craft::$app->elements->getElementById($element->id, null, 2); // Site ID 2 = French
            return $frenchElement->title ?? '';
        }
    ],
    
    // Language indicator
    'language' => [
        'mapping' => ['type' => 'keyword'],
        'value' => function (\craft\base\ElementInterface $element) {
            return Craft::$app->sites->getSiteById($element->siteId)->language;
        }
    ],
    
    // Multilingual categories
    'categoriesAllLanguages' => [
        'mapping' => ['type' => 'text'],
        'value' => function (\craft\base\ElementInterface $element) {
            $categoryTitles = [];
            
            // Get categories for all sites
            foreach (Craft::$app->sites->getAllSites() as $site) {
                $siteElement = Craft::$app->elements->getElementById($element->id, null, $site->id);
                if ($siteElement && $siteElement->categories) {
                    foreach ($siteElement->categories->all() as $category) {
                        $categoryTitles[] = $category->title;
                    }
                }
            }
            
            return implode(' ', array_unique($categoryTitles));
        }
    ],
],
```

## Performance optimization for multi-site

Optimize indexing and search performance across multiple sites.

### Selective site indexing

```php
return [
    // Enable/disable indexing per site
    'enabledSites' => function() {
        $enabledSites = [];
        
        foreach (Craft::$app->sites->getAllSites() as $site) {
            // Skip staging/development sites in production
            if (App::env('CRAFT_ENVIRONMENT') === 'production' && 
                str_contains($site->handle, 'staging')) {
                continue;
            }
            
            $enabledSites[] = $site->id;
        }
        
        return $enabledSites;
    },
    
    // Different indexing schedules per site
    'indexingPriority' => [
        1 => 'high',    // Primary site
        2 => 'medium',  // French site  
        3 => 'low',     // Mobile site
    ],
];
```

### Batch processing optimization

```php
// Optimize reindexing for multiple sites
class MultiSiteIndexingService
{
    public function reindexAllSites(): void
    {
        $sites = Craft::$app->sites->getAllSites();
        
        foreach ($sites as $site) {
            // Process each site in a separate queue job
            Craft::$app->queue->push(new ReindexSiteJob([
                'siteId' => $site->id,
                'priority' => $this->getSitePriority($site->id),
                'batchSize' => $this->getSiteBatchSize($site->id),
            ]));
        }
    }
    
    private function getSitePriority(int $siteId): int
    {
        // Primary site gets highest priority
        return $siteId === 1 ? 1024 : 512;
    }
    
    private function getSiteBatchSize(int $siteId): int
    {
        // Smaller batches for secondary sites
        return $siteId === 1 ? 100 : 50;
    }
}
```

## Multi-site maintenance

### Monitoring multiple indexes

```php
// Health check for all site indexes
class MultiSiteHealthCheck
{
    public function checkAllSites(): array
    {
        $results = [];
        $elasticsearch = \pennebaker\searchwithelastic\SearchWithElastic::getInstance()->service;
        
        foreach (Craft::$app->sites->getAllSites() as $site) {
            try {
                Craft::$app->sites->setCurrentSite($site);
                
                $indexName = $this->getIndexName($site);
                $health = $elasticsearch->indices()->stats(['index' => $indexName]);
                
                $results[$site->handle] = [
                    'status' => 'healthy',
                    'documentCount' => $health['indices'][$indexName]['total']['docs']['count'] ?? 0,
                    'indexSize' => $health['indices'][$indexName]['total']['store']['size_in_bytes'] ?? 0,
                ];
            } catch (Exception $e) {
                $results[$site->handle] = [
                    'status' => 'error',
                    'error' => $e->getMessage(),
                ];
            }
        }
        
        return $results;
    }
    
    private function getIndexName($site): string
    {
        $settings = \pennebaker\searchwithelastic\SearchWithElastic::getInstance()->getSettings();
        return $settings->indexPrefix . $settings->fallbackIndexName . '_' . $site->id;
    }
}
```

### Site-specific backup and recovery

```bash
#!/bin/bash
# Backup all site indexes

SITES=("1" "2" "3")
DATE=$(date +%Y%m%d_%H%M%S)

for SITE_ID in "${SITES[@]}"; do
    echo "Backing up site $SITE_ID..."
    
    curl -X PUT "localhost:9200/_snapshot/backup_repo/site_${SITE_ID}_${DATE}" \
         -H 'Content-Type: application/json' \
         -d"{
           \"indices\": \"craft-*_${SITE_ID}\",
           \"ignore_unavailable\": true,
           \"include_global_state\": false
         }"
done
```

### Cross-site consistency checks

```php
// Verify content consistency across sites
class CrossSiteConsistencyChecker
{
    public function checkElementConsistency(int $elementId): array
    {
        $results = [];
        $sites = Craft::$app->sites->getAllSites();
        
        foreach ($sites as $site) {
            $element = Craft::$app->elements->getElementById($elementId, null, $site->id);
            
            if ($element) {
                $results[$site->handle] = [
                    'exists' => true,
                    'status' => $element->status,
                    'lastUpdated' => $element->dateUpdated->format('Y-m-d H:i:s'),
                    'indexed' => $this->isElementIndexed($element),
                ];
            } else {
                $results[$site->handle] = [
                    'exists' => false,
                    'indexed' => false,
                ];
            }
        }
        
        return $results;
    }
    
    private function isElementIndexed($element): bool
    {
        $elasticsearch = \pennebaker\searchwithelastic\SearchWithElastic::getInstance()->service;
        
        try {
            $result = $elasticsearch->get([
                'index' => $this->getIndexName($element->siteId),
                'id' => $element->id,
            ]);
            
            return isset($result['found']) && $result['found'];
        } catch (Exception $e) {
            return false;
        }
    }
}
```

## Template usage for multi-site

Search across sites in your templates:

:::code-group

```twig [Single site search]
{# Search current site only #}
{% set results = craft.elasticsearch.search('search term') %}

{% for result in results %}
    <div class="result">
        <h3>{{ result.title }}</h3>
        <p>{{ result.summary }}</p>
        <small>Site: {{ siteName }}</small>
    </div>
{% endfor %}
```

```twig [Multi-site search]
{# Search across all sites #}
{% set allResults = [] %}

{% for site in craft.app.sites.allSites %}
    {% set oldSite = craft.app.sites.currentSite %}
    {% do craft.app.sites.setCurrentSite(site) %}
    
    {% set siteResults = craft.elasticsearch.search('search term') %}
    
    {% for result in siteResults %}
        {% set result = result | merge({
            siteId: site.id,
            siteName: site.name,
            siteHandle: site.handle
        }) %}
        {% set allResults = allResults | merge([result]) %}
    {% endfor %}
    
    {% do craft.app.sites.setCurrentSite(oldSite) %}
{% endfor %}

{# Sort by relevance score #}
{% set sortedResults = allResults | sort((a, b) => b.score <=> a.score) %}

{% for result in sortedResults %}
    <div class="result">
        <h3>{{ result.title }}</h3>
        <p>{{ result.summary }}</p>
        <small>
            Site: {{ result.siteName }} ({{ result.siteHandle }})
            | Score: {{ result.score | round(2) }}
        </small>
    </div>
{% endfor %}
```

```twig [Language-filtered search]
{# Search only sites with specific language #}
{% set targetLanguage = 'en-US' %}
{% set results = [] %}

{% for site in craft.app.sites.allSites %}
    {% if site.language == targetLanguage %}
        {% set oldSite = craft.app.sites.currentSite %}
        {% do craft.app.sites.setCurrentSite(site) %}
        
        {% set siteResults = craft.elasticsearch.search('search term') %}
        {% set results = results | merge(siteResults) %}
        
        {% do craft.app.sites.setCurrentSite(oldSite) %}
    {% endif %}
{% endfor %}

{% for result in results %}
    <div class="result">
        <h3>{{ result.title }}</h3>
        <p>{{ result.summary }}</p>
    </div>
{% endfor %}
```

:::

This completes the comprehensive multi-site configuration guide, covering all aspects of managing Elasticsearch indexes across multiple Craft CMS sites.