# Extending Plugin Functionality

This guide covers the various ways to extend and customize the Craft Search with Elastic plugin to meet your specific requirements.

## Plugin Architecture Overview

The plugin is built with extensibility in mind, providing multiple extension points:

- **Events**: Hook into operations at specific points
- **Service Composition**: Replace or extend service functionality  
- **Query Customization**: Modify element queries for indexing
- **Document Transformation**: Customize how elements are prepared for indexing
- **Custom Indexers**: Create specialized indexing logic
- **Configuration Callbacks**: Provide dynamic configuration

## Extension Methods

### 1. Event-Based Extensions

Events are the primary extension mechanism. They allow you to:

- Modify data before operations
- Perform additional actions after operations
- Skip default operations entirely
- Add custom processing logic

**Example: Custom Search Analytics**

```php
use yii\base\Event;
use pennebaker\searchwithelastic\services\ElasticsearchService;
use pennebaker\searchwithelastic\events\SearchEvent;

// In your module's init() method or bootstrap file
Event::on(
    ElasticsearchService::class,
    ElasticsearchService::EVENT_AFTER_SEARCH,
    function(SearchEvent $event) {
        // Custom analytics tracking
        $this->trackSearchAnalytics([
            'query' => $event->query,
            'siteId' => $event->siteId,
            'resultCount' => count($event->params['results'] ?? []),
            'timestamp' => time()
        ]);
    }
);
```

### 2. Service Extension via Composition

You can replace plugin services with your own implementations:

**Example: Custom Elasticsearch Service**

```php
namespace mymodule\services;

use pennebaker\searchwithelastic\services\ElasticsearchService as BaseService;

class CustomElasticsearchService extends BaseService
{
    public function advancedSearch(string $query, array $options = []): array
    {
        // Add custom pre-processing
        $query = $this->preprocessQuery($query);
        $options = $this->preprocessOptions($options);
        
        // Call parent with modified parameters
        $results = parent::advancedSearch($query, $options);
        
        // Add custom post-processing
        return $this->postprocessResults($results);
    }
    
    private function preprocessQuery(string $query): string
    {
        // Custom query preprocessing logic
        $query = trim($query);
        
        // Expand abbreviations
        $expansions = [
            'cms' => 'content management system',
            'seo' => 'search engine optimization',
        ];
        
        foreach ($expansions as $abbr => $full) {
            $query = preg_replace('/\b' . $abbr . '\b/i', $full, $query);
        }
        
        return $query;
    }
    
    private function postprocessResults(array $results): array
    {
        // Add custom scoring or filtering
        foreach ($results as &$result) {
            // Boost recent content
            $dateCreated = $result['_source']['dateCreated'] ?? null;
            if ($dateCreated) {
                $age = time() - strtotime($dateCreated);
                $recencyBoost = max(0, 1 - ($age / (365 * 24 * 60 * 60))); // Boost newer content
                $result['_score'] = ($result['_score'] ?? 0) * (1 + $recencyBoost);
            }
        }
        
        // Sort by modified score
        usort($results, fn($a, $b) => ($b['_score'] ?? 0) <=> ($a['_score'] ?? 0));
        
        return $results;
    }
}
```

**Register Your Custom Service:**

```php
use pennebaker\searchwithelastic\SearchWithElastic;
use mymodule\services\CustomElasticsearchService;

// In your module's init() method
Event::on(
    SearchWithElastic::class,
    SearchWithElastic::EVENT_INIT,
    function() {
        $plugin = SearchWithElastic::getInstance();
        $plugin->set('service', CustomElasticsearchService::class);
    }
);
```

### 3. Custom Element Queries

Extend the indexable query classes to add specialized filtering:

**Example: Custom Entry Query with SEO Filtering**

```php
namespace mymodule\queries;

use pennebaker\searchwithelastic\queries\IndexableEntryQuery as BaseQuery;

class SeoIndexableEntryQuery extends BaseQuery
{
    private bool $seoOptimized = false;
    private ?int $minWordCount = null;
    
    public function seoOptimized(bool $optimized = true): self
    {
        $this->seoOptimized = $optimized;
        return $this;
    }
    
    public function minWordCount(int $count): self
    {
        $this->minWordCount = $count;
        return $this;
    }
    
    protected function applyDefaultFilters(): self
    {
        parent::applyDefaultFilters();
        
        if ($this->seoOptimized) {
            // Only include entries with SEO fields populated
            $this->elementQuery->andWhere(['not', ['seoTitle' => '']]);
            $this->elementQuery->andWhere(['not', ['seoDescription' => '']]);
        }
        
        if ($this->minWordCount !== null) {
            // Custom SQL to filter by content word count
            $this->elementQuery->andWhere([
                '>=', 
                'CHAR_LENGTH(content) - CHAR_LENGTH(REPLACE(content, " ", "")) + 1',
                $this->minWordCount
            ]);
        }
        
        return $this;
    }
    
    public function highQualityContent(): self
    {
        return $this->seoOptimized(true)->minWordCount(300);
    }
}
```

### 4. Custom Document Processors

Create specialized processors for different content types:

**Example: Product Indexing Processor**

```php
namespace mymodule\processors;

use craft\base\Element;
use craft\commerce\elements\Product;

class ProductDocumentProcessor
{
    public function processProduct(Product $product, array &$document): void
    {
        // Add product-specific fields
        $document['productType'] = $product->type->handle;
        $document['availableForSale'] = $product->availableForPurchase;
        
        // Process variants
        $variants = [];
        $minPrice = null;
        $maxPrice = null;
        
        foreach ($product->getVariants() as $variant) {
            $variants[] = [
                'sku' => $variant->sku,
                'price' => $variant->price,
                'stock' => $variant->stock,
                'unlimited' => $variant->hasUnlimitedStock,
            ];
            
            if ($minPrice === null || $variant->price < $minPrice) {
                $minPrice = $variant->price;
            }
            
            if ($maxPrice === null || $variant->price > $maxPrice) {
                $maxPrice = $variant->price;
            }
        }
        
        $document['variants'] = $variants;
        $document['priceRange'] = [
            'min' => $minPrice,
            'max' => $maxPrice,
        ];
        
        // Add category hierarchy
        $categories = $product->getFieldValue('productCategories');
        if ($categories) {
            $document['categoryHierarchy'] = $this->buildCategoryHierarchy($categories->all());
        }
        
        // Add computed fields
        $document['averageRating'] = $this->calculateAverageRating($product);
        $document['reviewCount'] = $this->getReviewCount($product);
        $document['salesRank'] = $this->getSalesRank($product);
    }
    
    private function buildCategoryHierarchy(array $categories): array
    {
        $hierarchy = [];
        
        foreach ($categories as $category) {
            $path = [];
            $current = $category;
            
            while ($current) {
                array_unshift($path, $current->title);
                $current = $current->parent;
            }
            
            $hierarchy[] = $path;
        }
        
        return $hierarchy;
    }
    
    private function calculateAverageRating(Product $product): ?float
    {
        // Implementation depends on your review system
        $reviews = $product->getFieldValue('reviews');
        if (!$reviews || !count($reviews)) {
            return null;
        }
        
        $total = 0;
        $count = 0;
        
        foreach ($reviews as $review) {
            if ($review->rating) {
                $total += $review->rating;
                $count++;
            }
        }
        
        return $count > 0 ? $total / $count : null;
    }
}
```

**Register the Processor:**

```php
use pennebaker\searchwithelastic\services\ElementIndexerService;
use pennebaker\searchwithelastic\events\IndexElementEvent;
use mymodule\processors\ProductDocumentProcessor;

Event::on(
    ElementIndexerService::class,
    ElementIndexerService::EVENT_BEFORE_INDEX_ELEMENT,
    function(IndexElementEvent $event) {
        if ($event->element instanceof \craft\commerce\elements\Product) {
            $processor = new ProductDocumentProcessor();
            $processor->processProduct($event->element, $event->documentData);
        }
    }
);
```

### 5. Multi-Language Content Processing

Handle multi-language content with custom processors:

**Example: Multi-Language Content Processor**

```php
namespace mymodule\processors;

use craft\base\Element;
use Craft;

class MultiLanguageProcessor
{
    public function processMultiLanguageContent(Element $element, array &$document): void
    {
        $currentSite = Craft::$app->getSites()->getSiteById($element->siteId);
        $allSites = Craft::$app->getSites()->getAllSites();
        
        // Add current language content
        $document['language'] = $currentSite->language;
        $document['languageDirection'] = $this->getLanguageDirection($currentSite->language);
        
        // Process related language versions
        $translations = [];
        
        foreach ($allSites as $site) {
            if ($site->id === $element->siteId) {
                continue;
            }
            
            try {
                $translation = Craft::$app->elements->getElementById(
                    $element->id, 
                    get_class($element), 
                    $site->id
                );
                
                if ($translation && $translation->enabled) {
                    $translations[$site->language] = [
                        'title' => $translation->title,
                        'slug' => $translation->slug,
                        'url' => $translation->getUrl(),
                        'siteId' => $site->id,
                        'siteName' => $site->name,
                    ];
                }
            } catch (\Exception $e) {
                // Translation doesn't exist or isn't accessible
                continue;
            }
        }
        
        $document['translations'] = $translations;
        $document['availableLanguages'] = array_keys($translations);
        $document['translationCount'] = count($translations);
        
        // Add language-specific analyzers for search
        $document['searchableContent'] = [
            $currentSite->language => $document['content'] ?? '',
        ];
        
        // Cross-language keywords (if configured)
        $keywords = $element->getFieldValue('crossLanguageKeywords');
        if ($keywords) {
            $document['globalKeywords'] = array_map('trim', explode(',', $keywords));
        }
    }
    
    private function getLanguageDirection(string $language): string
    {
        $rtlLanguages = ['ar', 'he', 'fa', 'ur', 'yi'];
        $langCode = substr($language, 0, 2);
        
        return in_array($langCode, $rtlLanguages) ? 'rtl' : 'ltr';
    }
}
```

### 6. Performance Optimization Extensions

Create performance-focused extensions:

**Example: Caching Layer**

```php
namespace mymodule\extensions;

use pennebaker\searchwithelastic\services\ElasticsearchService;
use pennebaker\searchwithelastic\events\SearchEvent;
use Craft;

class SearchCacheExtension
{
    private const CACHE_DURATION = 300; // 5 minutes
    
    public function init(): void
    {
        Event::on(
            ElasticsearchService::class,
            ElasticsearchService::EVENT_BEFORE_SEARCH,
            [$this, 'checkCache']
        );
        
        Event::on(
            ElasticsearchService::class,
            ElasticsearchService::EVENT_AFTER_SEARCH,
            [$this, 'storeCache']
        );
    }
    
    public function checkCache(SearchEvent $event): void
    {
        $cacheKey = $this->generateCacheKey($event->query, $event->params);
        $cached = Craft::$app->cache->get($cacheKey);
        
        if ($cached !== false) {
            // Return cached results
            $event->params['results'] = $cached;
            $event->skipDefaultSearch = true;
            
            Craft::info("Search cache hit for query: {$event->query}", 'search-cache');
        }
    }
    
    public function storeCache(SearchEvent $event): void
    {
        if (!$event->skipDefaultSearch && !empty($event->params['results'])) {
            $cacheKey = $this->generateCacheKey($event->query, $event->params);
            
            Craft::$app->cache->set(
                $cacheKey, 
                $event->params['results'], 
                self::CACHE_DURATION,
                new \craft\cache\dependencies\TagDependency([
                    'tags' => ["search_site_{$event->siteId}"]
                ])
            );
            
            Craft::info("Cached search results for query: {$event->query}", 'search-cache');
        }
    }
    
    private function generateCacheKey(string $query, array $params): string
    {
        $relevantParams = array_intersect_key($params, array_flip([
            'siteId', 'fuzzy', 'fields', 'size'
        ]));
        
        return 'search_' . md5($query . serialize($relevantParams));
    }
}
```

### 7. Custom Search Result Formatters

Customize how search results are formatted:

**Example: Rich Result Formatter**

```php
namespace mymodule\formatters;

use craft\elements\Entry;
use craft\elements\Asset;
use Craft;

class RichResultFormatter
{
    public function formatSearchResult(array $hit): array
    {
        $source = $hit['_source'];
        $elementType = $source['elementType'] ?? '';
        
        // Add common enrichments
        $hit['_formatted'] = [
            'type' => $this->getHumanReadableType($elementType),
            'url' => $source['url'] ?? null,
            'excerpt' => $this->generateExcerpt($source['content'] ?? '', $hit['highlight'] ?? []),
            'lastModified' => $this->formatDate($source['dateUpdated'] ?? null),
        ];
        
        // Type-specific formatting
        switch ($elementType) {
            case Entry::class:
                $this->formatEntryResult($hit, $source);
                break;
                
            case Asset::class:
                $this->formatAssetResult($hit, $source);
                break;
        }
        
        return $hit;
    }
    
    private function formatEntryResult(array &$hit, array $source): void
    {
        $hit['_formatted']['entryType'] = $source['entryType'] ?? 'Entry';
        $hit['_formatted']['author'] = $source['authorName'] ?? 'Anonymous';
        $hit['_formatted']['publishDate'] = $this->formatDate($source['postDate'] ?? null);
        
        // Add breadcrumbs if available
        if (!empty($source['section'])) {
            $hit['_formatted']['breadcrumbs'] = [
                ['title' => 'Home', 'url' => '/'],
                ['title' => ucfirst($source['section']), 'url' => "/{$source['section']}"],
                ['title' => $source['title'], 'url' => $source['url']],
            ];
        }
        
        // Add reading time estimate
        $content = $source['content'] ?? '';
        $wordCount = str_word_count(strip_tags($content));
        $hit['_formatted']['readingTime'] = max(1, round($wordCount / 200)); // 200 WPM average
    }
    
    private function formatAssetResult(array &$hit, array $source): void
    {
        $hit['_formatted']['fileType'] = strtoupper($source['kind'] ?? 'File');
        $hit['_formatted']['fileSize'] = $this->formatFileSize($source['size'] ?? 0);
        $hit['_formatted']['dimensions'] = null;
        
        if (!empty($source['width']) && !empty($source['height'])) {
            $hit['_formatted']['dimensions'] = "{$source['width']} × {$source['height']}";
        }
        
        // Add thumbnail for images
        if ($source['kind'] === 'image') {
            try {
                $asset = Craft::$app->assets->getAssetById($source['elementId']);
                if ($asset) {
                    $hit['_formatted']['thumbnail'] = $asset->getUrl(['width' => 150, 'height' => 150]);
                }
            } catch (\Exception $e) {
                // Asset might not exist anymore
            }
        }
    }
    
    private function generateExcerpt(string $content, array $highlights): string
    {
        // Use highlights if available
        if (!empty($highlights['content'])) {
            return implode(' ... ', $highlights['content']);
        }
        
        // Generate excerpt from content
        $plainText = strip_tags($content);
        $words = explode(' ', $plainText);
        
        if (count($words) <= 30) {
            return $plainText;
        }
        
        return implode(' ', array_slice($words, 0, 30)) . '...';
    }
    
    private function formatDate(?string $date): ?string
    {
        if (!$date) {
            return null;
        }
        
        try {
            $dateObj = new \DateTime($date);
            return $dateObj->format('M j, Y');
        } catch (\Exception $e) {
            return null;
        }
    }
    
    private function formatFileSize(int $bytes): string
    {
        if ($bytes === 0) {
            return '0 B';
        }
        
        $units = ['B', 'KB', 'MB', 'GB'];
        $pow = floor(log($bytes, 1024));
        
        return round($bytes / (1024 ** $pow), 1) . ' ' . $units[$pow];
    }
    
    private function getHumanReadableType(string $elementType): string
    {
        $types = [
            Entry::class => 'Entry',
            Asset::class => 'Asset',
            'craft\\elements\\Category' => 'Category',
            'craft\\commerce\\elements\\Product' => 'Product',
        ];
        
        return $types[$elementType] ?? 'Content';
    }
}
```

**Register the Formatter:**

```php
use pennebaker\searchwithelastic\SearchWithElastic;
use mymodule\formatters\RichResultFormatter;

// In plugin settings or module init
$settings = SearchWithElastic::getInstance()->getSettings();
$formatter = new RichResultFormatter();
$settings->resultFormatterCallback = [$formatter, 'formatSearchResult'];
```

### 8. Search Analytics and Monitoring

Add comprehensive search analytics:

**Example: Search Analytics Extension**

```php
namespace mymodule\extensions;

use pennebaker\searchwithelastic\events\SearchEvent;
use craft\db\Query;
use Craft;

class SearchAnalyticsExtension
{
    public function init(): void
    {
        Event::on(
            ElasticsearchService::class,
            ElasticsearchService::EVENT_AFTER_SEARCH,
            [$this, 'trackSearch']
        );
    }
    
    public function trackSearch(SearchEvent $event): void
    {
        $results = $event->params['results'] ?? [];
        $resultCount = count($results);
        
        // Store search analytics
        Craft::$app->db->createCommand()
            ->insert('{{%search_analytics}}', [
                'query' => $event->query,
                'siteId' => $event->siteId,
                'resultCount' => $resultCount,
                'searchType' => $event->params['fuzzy'] ? 'fuzzy' : 'exact',
                'fields' => json_encode($event->params['fields'] ?? []),
                'userAgent' => Craft::$app->request->userAgent ?? '',
                'ip' => Craft::$app->request->userIP ?? '',
                'sessionId' => Craft::$app->session->id,
                'dateCreated' => Craft::$app->db->getDateTimeValue(new \DateTime()),
            ])
            ->execute();
        
        // Track zero-result searches
        if ($resultCount === 0) {
            $this->trackZeroResultSearch($event->query, $event->siteId);
        }
        
        // Update search trends
        $this->updateSearchTrends($event->query, $resultCount);
    }
    
    private function trackZeroResultSearch(string $query, int $siteId): void
    {
        // Increment counter for zero-result queries
        $existing = (new Query())
            ->select(['count'])
            ->from('{{%zero_result_searches}}')
            ->where(['query' => $query, 'siteId' => $siteId])
            ->scalar();
        
        if ($existing) {
            Craft::$app->db->createCommand()
                ->update('{{%zero_result_searches}}', 
                    ['count' => $existing + 1, 'lastOccurrence' => new \DateTime()],
                    ['query' => $query, 'siteId' => $siteId]
                )
                ->execute();
        } else {
            Craft::$app->db->createCommand()
                ->insert('{{%zero_result_searches}}', [
                    'query' => $query,
                    'siteId' => $siteId,
                    'count' => 1,
                    'firstOccurrence' => new \DateTime(),
                    'lastOccurrence' => new \DateTime(),
                ])
                ->execute();
        }
    }
    
    public function getPopularSearches(int $siteId, int $limit = 10): array
    {
        return (new Query())
            ->select(['query', 'COUNT(*) as searchCount', 'AVG(resultCount) as avgResults'])
            ->from('{{%search_analytics}}')
            ->where(['siteId' => $siteId])
            ->andWhere(['>', 'dateCreated', new \DateTime('-30 days')])
            ->groupBy(['query'])
            ->orderBy(['searchCount' => SORT_DESC])
            ->limit($limit)
            ->all();
    }
    
    public function getZeroResultQueries(int $siteId, int $limit = 10): array
    {
        return (new Query())
            ->select(['query', 'count', 'lastOccurrence'])
            ->from('{{%zero_result_searches}}')
            ->where(['siteId' => $siteId])
            ->orderBy(['count' => SORT_DESC, 'lastOccurrence' => SORT_DESC])
            ->limit($limit)
            ->all();
    }
}
```

## Integration Patterns

### Plugin Integration

Integrate with other Craft plugins:

```php
// Integrate with Craft Commerce
Event::on(
    ElementIndexerService::class,
    ElementIndexerService::EVENT_BEFORE_INDEX_ELEMENT,
    function(IndexElementEvent $event) {
        if ($event->element instanceof \craft\commerce\elements\Product) {
            // Add commerce-specific data
            $event->documentData['inStock'] = $event->element->hasStock();
            $event->documentData['onSale'] = $event->element->getIsOnSale();
        }
    }
);

// Integrate with SEOmatic
Event::on(
    ElementIndexerService::class,
    ElementIndexerService::EVENT_BEFORE_INDEX_ELEMENT,
    function(IndexElementEvent $event) {
        if (Craft::$app->plugins->isPluginInstalled('seomatic')) {
            $seomatic = \nystudio107\seomatic\Seomatic::$plugin;
            $metaBundle = $seomatic->metaBundles->getMetaBundleBySourceId(
                'entry',
                $event->element->id,
                $event->element->siteId
            );
            
            if ($metaBundle) {
                $event->documentData['seoTitle'] = $metaBundle->metaTitleContainer->title ?? '';
                $event->documentData['seoDescription'] = $metaBundle->metaDescriptionContainer->description ?? '';
            }
        }
    }
);
```

### External API Integration

Connect with external services:

```php
namespace mymodule\integrations;

class ExternalContentEnrichment
{
    public function enrichContent(Element $element, array &$document): void
    {
        // Add sentiment analysis
        $content = $document['content'] ?? '';
        if ($content) {
            $sentiment = $this->analyzeSentiment($content);
            $document['sentiment'] = $sentiment;
        }
        
        // Add readability score
        $readability = $this->calculateReadabilityScore($content);
        $document['readabilityScore'] = $readability;
        
        // Add keyword extraction
        $keywords = $this->extractKeywords($content);
        $document['extractedKeywords'] = $keywords;
    }
    
    private function analyzeSentiment(string $content): array
    {
        // Integration with sentiment analysis API
        // Return normalized sentiment data
        return [
            'score' => 0.5, // -1 to 1
            'label' => 'neutral' // positive, negative, neutral
        ];
    }
    
    private function calculateReadabilityScore(string $content): float
    {
        // Simple Flesch Reading Ease calculation
        $sentences = preg_split('/[.!?]+/', $content);
        $words = str_word_count($content);
        $syllables = $this->countSyllables($content);
        
        if ($sentences <= 0 || $words <= 0) {
            return 0;
        }
        
        $avgWordsPerSentence = $words / count($sentences);
        $avgSyllablesPerWord = $syllables / $words;
        
        return 206.835 - (1.015 * $avgWordsPerSentence) - (84.6 * $avgSyllablesPerWord);
    }
    
    private function extractKeywords(string $content): array
    {
        // Simple keyword extraction (you might want to use a proper NLP library)
        $words = str_word_count($content, 1);
        $words = array_map('strtolower', $words);
        
        // Remove common stop words
        $stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        $words = array_diff($words, $stopWords);
        
        // Count frequency
        $wordCount = array_count_values($words);
        arsort($wordCount);
        
        // Return top keywords
        return array_slice(array_keys($wordCount), 0, 10);
    }
}
```

## Best Practices

### Performance Considerations

1. **Batch Operations**: Use bulk operations when possible
2. **Async Processing**: Use queue jobs for heavy operations
3. **Caching**: Implement caching layers for frequently accessed data
4. **Memory Management**: Clear object references in loops

### Error Handling

1. **Graceful Degradation**: Don't break the site if search fails
2. **Logging**: Log errors for debugging
3. **Fallbacks**: Provide fallback search mechanisms
4. **Monitoring**: Monitor search performance and errors

### Security

1. **Input Validation**: Always validate user input
2. **Query Sanitization**: Sanitize search queries
3. **Access Control**: Respect Craft's user permissions
4. **Rate Limiting**: Implement rate limiting for search endpoints

### Testing

Create tests for your extensions:

```php
namespace mymodule\tests;

use Codeception\Test\Unit;
use mymodule\processors\ProductDocumentProcessor;
use craft\commerce\elements\Product;

class ProductDocumentProcessorTest extends Unit
{
    public function testProcessProduct()
    {
        $product = $this->createMockProduct();
        $document = [];
        
        $processor = new ProductDocumentProcessor();
        $processor->processProduct($product, $document);
        
        $this->assertArrayHasKey('productType', $document);
        $this->assertArrayHasKey('priceRange', $document);
        $this->assertArrayHasKey('variants', $document);
    }
    
    private function createMockProduct(): Product
    {
        // Create mock product for testing
    }
}
```

## Debugging Extensions

Use Craft's logging system to debug your extensions:

```php
// Log to custom log file
Craft::getLogger()->log('Custom search extension debug info', \yii\log\Logger::LEVEL_INFO, 'search-extensions');

// Log with context
Craft::info([
    'message' => 'Processing element',
    'elementId' => $element->id,
    'elementType' => get_class($element),
    'siteId' => $element->siteId,
], 'search-extensions');

// Log errors
try {
    // Your extension code
} catch (\Exception $e) {
    Craft::error('Extension failed: ' . $e->getMessage(), 'search-extensions');
    Craft::error($e->getTraceAsString(), 'search-extensions');
}
```

## Migration and Versioning

When updating extensions, consider:

1. **Backward Compatibility**: Maintain compatibility with existing data
2. **Migration Scripts**: Provide migration scripts for data changes
3. **Feature Flags**: Use feature flags for gradual rollouts
4. **Documentation**: Document changes and upgrade paths

This extensibility system allows you to customize nearly every aspect of the search functionality while maintaining plugin stability and performance.