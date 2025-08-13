# Creating Custom Content Indexers

This guide covers how to create custom content indexers for specialized content types, data sources, and indexing requirements in the Craft Search with Elastic plugin.

## Overview

Custom indexers allow you to:

- Index content from external data sources
- Create specialized indexing logic for complex content types
- Transform content before indexing
- Handle custom field types and data structures
- Integrate with third-party services during indexing

## Indexer Architecture

The plugin's indexing system is built around several key concepts:

1. **Element Queries**: Define what content to index
2. **Document Processors**: Transform elements into searchable documents
3. **Content Extractors**: Extract text content from various sources
4. **Index Mappers**: Define how fields are mapped in Elasticsearch

## Creating Custom Element Queries

Custom element queries allow you to define specialized filtering and selection logic for your content.

### Basic Custom Query

```php
<?php

namespace mymodule\queries;

use pennebaker\searchwithelastic\queries\IndexableElementQuery;
use craft\elements\Entry;

/**
 * Query builder for blog entries with custom filtering
 */
class BlogIndexableQuery extends IndexableElementQuery
{
    private bool $publishedOnly = true;
    private ?string $categoryFilter = null;
    private ?int $minWordCount = null;
    
    public static function elementType(): string
    {
        return Entry::class;
    }
    
    protected function applyDefaultFilters(): self
    {
        $settings = $this->getPlugin()->getSettings();
        
        // Apply section filtering
        $this->elementQuery->section('blog');
        
        // Apply status filtering
        if ($this->publishedOnly) {
            $this->elementQuery->status('live');
        }
        
        // Apply default exclusions
        $this->excluded($settings->excludedEntryTypes);
        
        return $this;
    }
    
    /**
     * Filter by category
     */
    public function category(string $categoryHandle): self
    {
        $this->categoryFilter = $categoryHandle;
        $this->elementQuery->relatedTo([
            'targetElement' => craft\elements\Category::find()->slug($categoryHandle)->one()
        ]);
        
        return $this;
    }
    
    /**
     * Filter by minimum word count
     */
    public function minWordCount(int $count): self
    {
        $this->minWordCount = $count;
        
        // Add custom WHERE condition for word count
        $this->elementQuery->andWhere([
            '>=',
            'CHAR_LENGTH(content) - CHAR_LENGTH(REPLACE(content, " ", "")) + 1',
            $count
        ]);
        
        return $this;
    }
    
    /**
     * Get only featured blog posts
     */
    public function featured(): self
    {
        $this->elementQuery->featured(true);
        return $this;
    }
    
    /**
     * Get posts from specific date range
     */
    public function dateRange(\DateTime $start, \DateTime $end): self
    {
        $this->elementQuery->postDate([
            'and',
            '>= ' . $start->format('Y-m-d'),
            '< ' . $end->format('Y-m-d')
        ]);
        
        return $this;
    }
    
    /**
     * Get recent posts (last 30 days)
     */
    public function recent(): self
    {
        $thirtyDaysAgo = new \DateTime('-30 days');
        return $this->dateRange($thirtyDaysAgo, new \DateTime());
    }
}
```

### Advanced Query with Joins

```php
<?php

namespace mymodule\queries;

use pennebaker\searchwithelastic\queries\IndexableElementQuery;
use craft\elements\Entry;

/**
 * Advanced query with custom joins and aggregations
 */
class AdvancedBlogQuery extends IndexableElementQuery
{
    public static function elementType(): string
    {
        return Entry::class;
    }
    
    protected function applyDefaultFilters(): self
    {
        // Join with custom statistics table
        $this->elementQuery->leftJoin(
            '{{%blog_statistics}} stats',
            '[[stats.entryId]] = [[elements.id]]'
        );
        
        // Add custom select fields
        $this->elementQuery->addSelect([
            'stats.viewCount',
            'stats.commentCount',
            'stats.shareCount'
        ]);
        
        return $this;
    }
    
    /**
     * Filter by minimum view count
     */
    public function minViews(int $views): self
    {
        $this->elementQuery->andWhere(['>=', 'stats.viewCount', $views]);
        return $this;
    }
    
    /**
     * Order by popularity (views + comments + shares)
     */
    public function orderByPopularity(): self
    {
        $this->elementQuery->orderBy([
            '(COALESCE(stats.viewCount, 0) + COALESCE(stats.commentCount, 0) * 10 + COALESCE(stats.shareCount, 0) * 5)' => SORT_DESC
        ]);
        
        return $this;
    }
    
    /**
     * Get trending posts (high engagement in last week)
     */
    public function trending(): self
    {
        $this->elementQuery
            ->leftJoin('{{%blog_weekly_stats}} weekly', '[[weekly.entryId]] = [[elements.id]]')
            ->andWhere(['>=', 'weekly.weeklyViews', 100])
            ->orderBy(['weekly.weeklyViews' => SORT_DESC]);
        
        return $this;
    }
}
```

## Creating Document Processors

Document processors transform Craft elements into searchable Elasticsearch documents.

### Basic Document Processor

```php
<?php

namespace mymodule\processors;

use craft\base\Element;
use craft\elements\Entry;
use pennebaker\searchwithelastic\events\IndexElementEvent;

/**
 * Processes blog entries for indexing
 */
class BlogDocumentProcessor
{
    /**
     * Process a blog entry for indexing
     */
    public function process(Entry $entry, array &$document): void
    {
        // Add blog-specific fields
        $document['blogCategory'] = $this->getBlogCategory($entry);
        $document['author'] = $this->getAuthorInfo($entry);
        $document['readingTime'] = $this->calculateReadingTime($document['content'] ?? '');
        $document['tags'] = $this->extractTags($entry);
        $document['featured'] = $entry->getFieldValue('featured') ?? false;
        
        // Add computed metrics
        $document['contentScore'] = $this->calculateContentScore($entry, $document);
        $document['socialMetrics'] = $this->getSocialMetrics($entry);
        
        // Add SEO data
        $document['seo'] = $this->extractSeoData($entry);
        
        // Add custom field data
        $this->processCustomFields($entry, $document);
    }
    
    private function getBlogCategory(Entry $entry): ?array
    {
        $category = $entry->getFieldValue('blogCategory');
        if (!$category) {
            return null;
        }
        
        return [
            'id' => $category->id,
            'title' => $category->title,
            'slug' => $category->slug,
            'level' => $category->level,
            'parentId' => $category->parent?->id,
        ];
    }
    
    private function getAuthorInfo(Entry $entry): array
    {
        $author = $entry->getAuthor();
        
        return [
            'id' => $author?->id,
            'name' => $author?->fullName ?? 'Anonymous',
            'email' => $author?->email,
            'bio' => $author?->getFieldValue('bio') ?? '',
            'avatar' => $author?->getFieldValue('avatar')?->one()?->getUrl() ?? null,
        ];
    }
    
    private function calculateReadingTime(string $content): int
    {
        $wordCount = str_word_count(strip_tags($content));
        return max(1, round($wordCount / 200)); // 200 WPM average
    }
    
    private function extractTags(Entry $entry): array
    {
        $tags = $entry->getFieldValue('tags');
        if (!$tags) {
            return [];
        }
        
        $tagArray = [];
        foreach ($tags->all() as $tag) {
            $tagArray[] = [
                'id' => $tag->id,
                'title' => $tag->title,
                'slug' => $tag->slug,
            ];
        }
        
        return $tagArray;
    }
    
    private function calculateContentScore(Entry $entry, array $document): float
    {
        $score = 0.0;
        
        // Length score (optimal around 1000-2000 words)
        $wordCount = str_word_count(strip_tags($document['content'] ?? ''));
        if ($wordCount >= 1000 && $wordCount <= 2000) {
            $score += 1.0;
        } elseif ($wordCount >= 500) {
            $score += 0.5;
        }
        
        // Image score
        $imageCount = substr_count($document['content'] ?? '', '<img');
        $score += min($imageCount * 0.1, 0.5); // Max 0.5 for images
        
        // Headings score
        $headingCount = preg_match_all('/<h[1-6]/', $document['content'] ?? '');
        $score += min($headingCount * 0.1, 0.3); // Max 0.3 for headings
        
        // Featured image score
        if ($entry->getFieldValue('featuredImage')) {
            $score += 0.2;
        }
        
        return round($score, 2);
    }
    
    private function getSocialMetrics(Entry $entry): array
    {
        // This would typically integrate with your analytics system
        return [
            'shares' => $this->getShareCount($entry),
            'likes' => $this->getLikeCount($entry),
            'comments' => $this->getCommentCount($entry),
            'views' => $this->getViewCount($entry),
        ];
    }
    
    private function extractSeoData(Entry $entry): array
    {
        return [
            'metaTitle' => $entry->getFieldValue('seoTitle') ?? $entry->title,
            'metaDescription' => $entry->getFieldValue('seoDescription') ?? '',
            'focusKeyword' => $entry->getFieldValue('focusKeyword') ?? '',
            'canonicalUrl' => $entry->getFieldValue('canonicalUrl') ?? $entry->getUrl(),
        ];
    }
    
    private function processCustomFields(Entry $entry, array &$document): void
    {
        // Process rich text fields
        $bodyContent = $entry->getFieldValue('body');
        if ($bodyContent) {
            $document['bodyText'] = strip_tags($bodyContent);
            $document['bodyHtml'] = $bodyContent;
        }
        
        // Process relationship fields
        $relatedPosts = $entry->getFieldValue('relatedPosts');
        if ($relatedPosts) {
            $document['relatedPostIds'] = [];
            foreach ($relatedPosts->all() as $related) {
                $document['relatedPostIds'][] = $related->id;
            }
        }
        
        // Process date fields
        $eventDate = $entry->getFieldValue('eventDate');
        if ($eventDate) {
            $document['eventDate'] = $eventDate->format('c');
            $document['isUpcoming'] = $eventDate > new \DateTime();
        }
    }
    
    // Placeholder methods for social metrics (implement based on your system)
    private function getShareCount(Entry $entry): int { return 0; }
    private function getLikeCount(Entry $entry): int { return 0; }
    private function getCommentCount(Entry $entry): int { return 0; }
    private function getViewCount(Entry $entry): int { return 0; }
}
```

### Multi-Type Document Processor

```php
<?php

namespace mymodule\processors;

use craft\base\Element;
use craft\elements\Entry;
use craft\elements\Asset;
use craft\commerce\elements\Product;

/**
 * Universal document processor that handles multiple element types
 */
class UniversalDocumentProcessor
{
    private array $processors = [];
    
    public function __construct()
    {
        $this->processors = [
            Entry::class => new BlogDocumentProcessor(),
            Asset::class => new AssetDocumentProcessor(),
            Product::class => new ProductDocumentProcessor(),
        ];
    }
    
    public function process(Element $element, array &$document): void
    {
        $elementType = get_class($element);
        
        // Apply universal processing
        $this->addUniversalFields($element, $document);
        
        // Apply type-specific processing
        if (isset($this->processors[$elementType])) {
            $this->processors[$elementType]->process($element, $document);
        }
        
        // Apply post-processing
        $this->postProcess($element, $document);
    }
    
    private function addUniversalFields(Element $element, array &$document): void
    {
        // Add common fields for all element types
        $document['searchableText'] = $this->buildSearchableText($element, $document);
        $document['boost'] = $this->calculateBoost($element);
        $document['accessibility'] = $this->checkAccessibility($element);
        $document['locale'] = $element->getSite()->language;
        
        // Add custom field data common to all types
        $customFields = $element->getFieldLayout()?->getCustomFields() ?? [];
        foreach ($customFields as $field) {
            $value = $element->getFieldValue($field->handle);
            if ($value !== null) {
                $document["field_{$field->handle}"] = $this->serializeFieldValue($value);
            }
        }
    }
    
    private function buildSearchableText(Element $element, array $document): string
    {
        $parts = [];
        
        // Add title
        if (!empty($document['title'])) {
            $parts[] = $document['title'];
        }
        
        // Add content
        if (!empty($document['content'])) {
            $parts[] = strip_tags($document['content']);
        }
        
        // Add custom field text
        $searchableFields = ['summary', 'description', 'excerpt'];
        foreach ($searchableFields as $field) {
            $value = $element->getFieldValue($field);
            if ($value) {
                $parts[] = strip_tags((string)$value);
            }
        }
        
        return implode(' ', $parts);
    }
    
    private function calculateBoost(Element $element): float
    {
        $boost = 1.0;
        
        // Boost based on element type
        if ($element instanceof Entry) {
            $boost += 0.2;
        }
        
        // Boost recent content
        $age = time() - ($element->dateCreated?->getTimestamp() ?? time());
        $daysSinceCreated = $age / (24 * 60 * 60);
        
        if ($daysSinceCreated < 7) {
            $boost += 0.3; // Recent content boost
        } elseif ($daysSinceCreated < 30) {
            $boost += 0.1; // Moderate boost
        }
        
        // Boost featured content
        if ($element->getFieldValue('featured')) {
            $boost += 0.5;
        }
        
        return round($boost, 2);
    }
    
    private function checkAccessibility(Element $element): array
    {
        $accessibility = [
            'hasAltText' => false,
            'hasHeadings' => false,
            'colorContrast' => 'unknown',
        ];
        
        // Check for images with alt text
        $content = $element->getFieldValue('body') ?? '';
        if (preg_match_all('/<img[^>]*alt=["\']([^"\']*)["\'][^>]*>/i', $content, $matches)) {
            $accessibility['hasAltText'] = !empty(array_filter($matches[1]));
        }
        
        // Check for proper heading structure
        if (preg_match('/<h[1-6][^>]*>/i', $content)) {
            $accessibility['hasHeadings'] = true;
        }
        
        return $accessibility;
    }
    
    private function serializeFieldValue($value): mixed
    {
        if (is_object($value)) {
            if (method_exists($value, 'all')) {
                // Element query result
                $elements = $value->all();
                return array_map(fn($el) => [
                    'id' => $el->id,
                    'title' => $el->title ?? '',
                    'url' => $el->getUrl() ?? null,
                ], $elements);
            } elseif (method_exists($value, 'getUrl')) {
                // Single element
                return [
                    'id' => $value->id,
                    'title' => $value->title ?? '',
                    'url' => $value->getUrl() ?? null,
                ];
            } elseif ($value instanceof \DateTime) {
                return $value->format('c');
            }
        }
        
        return $value;
    }
    
    private function postProcess(Element $element, array &$document): void
    {
        // Clean up HTML
        if (isset($document['content'])) {
            $document['content'] = $this->cleanHtml($document['content']);
        }
        
        // Add computed search fields
        $document['allText'] = $this->extractAllText($document);
        $document['wordCount'] = str_word_count($document['allText'] ?? '');
        
        // Add indexing metadata
        $document['indexedAt'] = (new \DateTime())->format('c');
        $document['indexerVersion'] = '1.0.0';
    }
    
    private function cleanHtml(string $html): string
    {
        // Remove script and style tags
        $html = preg_replace('/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/mi', '', $html);
        $html = preg_replace('/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/mi', '', $html);
        
        // Clean up whitespace
        $html = preg_replace('/\s+/', ' ', $html);
        
        return trim($html);
    }
    
    private function extractAllText(array $document): string
    {
        $textFields = ['title', 'content', 'summary', 'description'];
        $allText = [];
        
        foreach ($textFields as $field) {
            if (!empty($document[$field])) {
                $allText[] = strip_tags($document[$field]);
            }
        }
        
        return implode(' ', $allText);
    }
}
```

## Content Extractors

Content extractors handle specialized content extraction from different sources.

### Web Content Extractor

```php
<?php

namespace mymodule\extractors;

use craft\base\Element;
use GuzzleHttp\Client;

/**
 * Extracts content from web pages with advanced parsing
 */
class WebContentExtractor
{
    private Client $httpClient;
    private array $config;
    
    public function __construct(array $config = [])
    {
        $this->config = array_merge([
            'timeout' => 10,
            'user_agent' => 'Craft CMS Search Indexer',
            'max_content_length' => 1000000, // 1MB
            'follow_redirects' => true,
        ], $config);
        
        $this->httpClient = new Client([
            'timeout' => $this->config['timeout'],
            'headers' => [
                'User-Agent' => $this->config['user_agent'],
            ],
            'allow_redirects' => $this->config['follow_redirects'],
        ]);
    }
    
    public function extractFromUrl(string $url, Element $element = null): array
    {
        try {
            $response = $this->httpClient->get($url);
            $content = $response->getBody()->getContents();
            
            // Limit content size
            if (strlen($content) > $this->config['max_content_length']) {
                $content = substr($content, 0, $this->config['max_content_length']);
            }
            
            return $this->parseHtmlContent($content, $url, $element);
        } catch (\Exception $e) {
            \Craft::warning("Failed to extract content from {$url}: " . $e->getMessage());
            return ['content' => '', 'metadata' => []];
        }
    }
    
    private function parseHtmlContent(string $html, string $url, ?Element $element): array
    {
        $dom = new \DOMDocument();
        @$dom->loadHTML($html);
        $xpath = new \DOMXPath($dom);
        
        // Extract main content
        $content = $this->extractMainContent($dom, $xpath);
        
        // Extract metadata
        $metadata = [
            'title' => $this->extractTitle($dom, $xpath),
            'description' => $this->extractDescription($dom, $xpath),
            'keywords' => $this->extractKeywords($dom, $xpath),
            'author' => $this->extractAuthor($dom, $xpath),
            'publishDate' => $this->extractPublishDate($dom, $xpath),
            'images' => $this->extractImages($dom, $xpath, $url),
            'links' => $this->extractLinks($dom, $xpath, $url),
            'headings' => $this->extractHeadings($dom, $xpath),
            'language' => $this->detectLanguage($dom, $content),
        ];
        
        return [
            'content' => $content,
            'metadata' => $metadata,
        ];
    }
    
    private function extractMainContent(\DOMDocument $dom, \DOMXPath $xpath): string
    {
        // Try different content selectors in order of preference
        $contentSelectors = [
            'article',
            '[role="main"]',
            'main',
            '.content',
            '.post-content',
            '.entry-content',
            '#content',
            '.main-content',
        ];
        
        foreach ($contentSelectors as $selector) {
            $nodes = $xpath->query("//*[@class='" . str_replace('.', '', $selector) . "' or @id='" . str_replace('#', '', $selector) . "' or name()='" . str_replace(['[', ']', '@', '=', '"'], '', $selector) . "']");
            
            if ($nodes && $nodes->length > 0) {
                $content = $this->nodeToText($nodes->item(0));
                if (strlen(trim($content)) > 100) { // Minimum content threshold
                    return $this->cleanContent($content);
                }
            }
        }
        
        // Fallback: extract from body, excluding header, footer, nav
        $body = $xpath->query('//body')->item(0);
        if ($body) {
            // Remove unwanted elements
            $unwanted = $xpath->query('.//header | .//footer | .//nav | .//script | .//style | .//*[@class="sidebar"] | .//*[@class="navigation"]', $body);
            foreach ($unwanted as $node) {
                $node->parentNode->removeChild($node);
            }
            
            return $this->cleanContent($this->nodeToText($body));
        }
        
        return '';
    }
    
    private function extractTitle(\DOMDocument $dom, \DOMXPath $xpath): string
    {
        // Try different title sources
        $titleSources = [
            '//meta[@property="og:title"]/@content',
            '//meta[@name="twitter:title"]/@content',
            '//title',
            '//h1',
        ];
        
        foreach ($titleSources as $source) {
            $nodes = $xpath->query($source);
            if ($nodes && $nodes->length > 0) {
                $title = trim($nodes->item(0)->nodeValue);
                if (!empty($title)) {
                    return $title;
                }
            }
        }
        
        return '';
    }
    
    private function extractDescription(\DOMDocument $dom, \DOMXPath $xpath): string
    {
        $descSources = [
            '//meta[@property="og:description"]/@content',
            '//meta[@name="description"]/@content',
            '//meta[@name="twitter:description"]/@content',
        ];
        
        foreach ($descSources as $source) {
            $nodes = $xpath->query($source);
            if ($nodes && $nodes->length > 0) {
                $desc = trim($nodes->item(0)->nodeValue);
                if (!empty($desc)) {
                    return $desc;
                }
            }
        }
        
        return '';
    }
    
    private function extractKeywords(\DOMDocument $dom, \DOMXPath $xpath): array
    {
        $keywords = [];
        
        // Extract from meta keywords
        $metaKeywords = $xpath->query('//meta[@name="keywords"]/@content');
        if ($metaKeywords && $metaKeywords->length > 0) {
            $keywordString = $metaKeywords->item(0)->nodeValue;
            $keywords = array_merge($keywords, array_map('trim', explode(',', $keywordString)));
        }
        
        // Extract from article tags
        $tags = $xpath->query('//meta[@property="article:tag"]/@content');
        foreach ($tags as $tag) {
            $keywords[] = trim($tag->nodeValue);
        }
        
        return array_filter($keywords);
    }
    
    private function extractAuthor(\DOMDocument $dom, \DOMXPath $xpath): string
    {
        $authorSources = [
            '//meta[@name="author"]/@content',
            '//meta[@property="article:author"]/@content',
            '//*[@class="author"]',
            '//*[@class="byline"]',
        ];
        
        foreach ($authorSources as $source) {
            $nodes = $xpath->query($source);
            if ($nodes && $nodes->length > 0) {
                $author = trim($nodes->item(0)->nodeValue);
                if (!empty($author)) {
                    return $author;
                }
            }
        }
        
        return '';
    }
    
    private function extractPublishDate(\DOMDocument $dom, \DOMXPath $xpath): ?string
    {
        $dateSources = [
            '//meta[@property="article:published_time"]/@content',
            '//meta[@name="publish_date"]/@content',
            '//time[@datetime]/@datetime',
            '//time[@pubdate]/@datetime',
        ];
        
        foreach ($dateSources as $source) {
            $nodes = $xpath->query($source);
            if ($nodes && $nodes->length > 0) {
                $dateString = trim($nodes->item(0)->nodeValue);
                try {
                    $date = new \DateTime($dateString);
                    return $date->format('c');
                } catch (\Exception $e) {
                    continue;
                }
            }
        }
        
        return null;
    }
    
    private function extractImages(\DOMDocument $dom, \DOMXPath $xpath, string $baseUrl): array
    {
        $images = [];
        $imgNodes = $xpath->query('//img[@src]');
        
        foreach ($imgNodes as $img) {
            $src = $img->getAttribute('src');
            $alt = $img->getAttribute('alt');
            
            // Convert relative URLs to absolute
            if (!preg_match('/^https?:\/\//', $src)) {
                $src = $this->resolveUrl($src, $baseUrl);
            }
            
            $images[] = [
                'src' => $src,
                'alt' => $alt,
                'width' => $img->getAttribute('width') ?: null,
                'height' => $img->getAttribute('height') ?: null,
            ];
        }
        
        return $images;
    }
    
    private function extractLinks(\DOMDocument $dom, \DOMXPath $xpath, string $baseUrl): array
    {
        $links = [];
        $linkNodes = $xpath->query('//a[@href]');
        
        foreach ($linkNodes as $link) {
            $href = $link->getAttribute('href');
            $text = trim($link->nodeValue);
            
            // Skip empty links and anchors
            if (empty($href) || $href[0] === '#') {
                continue;
            }
            
            // Convert relative URLs to absolute
            if (!preg_match('/^https?:\/\//', $href)) {
                $href = $this->resolveUrl($href, $baseUrl);
            }
            
            $links[] = [
                'href' => $href,
                'text' => $text,
                'title' => $link->getAttribute('title') ?: null,
            ];
        }
        
        return $links;
    }
    
    private function extractHeadings(\DOMDocument $dom, \DOMXPath $xpath): array
    {
        $headings = [];
        $headingNodes = $xpath->query('//h1 | //h2 | //h3 | //h4 | //h5 | //h6');
        
        foreach ($headingNodes as $heading) {
            $headings[] = [
                'level' => (int)substr($heading->nodeName, 1),
                'text' => trim($heading->nodeValue),
            ];
        }
        
        return $headings;
    }
    
    private function detectLanguage(\DOMDocument $dom, string $content): string
    {
        $html = $dom->documentElement;
        $lang = $html->getAttribute('lang');
        
        if ($lang) {
            return $lang;
        }
        
        // Fallback language detection could go here
        return 'en';
    }
    
    private function nodeToText(\DOMNode $node): string
    {
        $text = '';
        
        if ($node->nodeType === XML_TEXT_NODE) {
            return $node->nodeValue;
        }
        
        foreach ($node->childNodes as $child) {
            $text .= $this->nodeToText($child);
        }
        
        return $text;
    }
    
    private function cleanContent(string $content): string
    {
        // Remove excessive whitespace
        $content = preg_replace('/\s+/', ' ', $content);
        
        // Remove common unwanted text patterns
        $unwantedPatterns = [
            '/Share this article.*/i',
            '/Follow us on.*/i',
            '/Subscribe to.*/i',
            '/Copyright \d{4}.*/i',
        ];
        
        foreach ($unwantedPatterns as $pattern) {
            $content = preg_replace($pattern, '', $content);
        }
        
        return trim($content);
    }
    
    private function resolveUrl(string $relativeUrl, string $baseUrl): string
    {
        $base = parse_url($baseUrl);
        
        if ($relativeUrl[0] === '/') {
            // Absolute path
            return $base['scheme'] . '://' . $base['host'] . $relativeUrl;
        } else {
            // Relative path
            $basePath = dirname($base['path'] ?? '/');
            return $base['scheme'] . '://' . $base['host'] . $basePath . '/' . $relativeUrl;
        }
    }
}
```

### API Content Extractor

```php
<?php

namespace mymodule\extractors;

use GuzzleHttp\Client;

/**
 * Extracts content from REST APIs
 */
class ApiContentExtractor
{
    private Client $httpClient;
    private array $config;
    
    public function __construct(array $config = [])
    {
        $this->config = array_merge([
            'timeout' => 30,
            'headers' => [],
            'auth' => null,
            'rate_limit' => 60, // requests per minute
        ], $config);
        
        $this->httpClient = new Client([
            'timeout' => $this->config['timeout'],
            'headers' => $this->config['headers'],
        ]);
    }
    
    public function extractFromApi(string $endpoint, array $params = []): array
    {
        try {
            $response = $this->httpClient->get($endpoint, [
                'query' => $params,
                'auth' => $this->config['auth'],
            ]);
            
            $data = json_decode($response->getBody()->getContents(), true);
            
            return $this->processApiResponse($data, $endpoint);
        } catch (\Exception $e) {
            \Craft::error("API extraction failed for {$endpoint}: " . $e->getMessage());
            return [];
        }
    }
    
    private function processApiResponse(array $data, string $endpoint): array
    {
        $processed = [];
        
        // Handle different API response formats
        if (isset($data['items'])) {
            // Paginated response
            foreach ($data['items'] as $item) {
                $processed[] = $this->processApiItem($item);
            }
        } elseif (isset($data['data'])) {
            // Data wrapper format
            if (is_array($data['data']) && isset($data['data'][0])) {
                // Array of items
                foreach ($data['data'] as $item) {
                    $processed[] = $this->processApiItem($item);
                }
            } else {
                // Single item
                $processed[] = $this->processApiItem($data['data']);
            }
        } else {
            // Direct data format
            $processed[] = $this->processApiItem($data);
        }
        
        return $processed;
    }
    
    private function processApiItem(array $item): array
    {
        return [
            'id' => $item['id'] ?? null,
            'title' => $item['title'] ?? $item['name'] ?? '',
            'content' => $item['content'] ?? $item['description'] ?? $item['body'] ?? '',
            'url' => $item['url'] ?? $item['link'] ?? null,
            'dateCreated' => $this->parseDate($item['created_at'] ?? $item['date'] ?? null),
            'dateUpdated' => $this->parseDate($item['updated_at'] ?? $item['modified'] ?? null),
            'author' => $this->extractAuthor($item),
            'tags' => $this->extractTags($item),
            'metadata' => $this->extractMetadata($item),
        ];
    }
    
    private function parseDate(?string $dateString): ?string
    {
        if (!$dateString) {
            return null;
        }
        
        try {
            $date = new \DateTime($dateString);
            return $date->format('c');
        } catch (\Exception $e) {
            return null;
        }
    }
    
    private function extractAuthor(array $item): array
    {
        $author = $item['author'] ?? $item['user'] ?? $item['creator'] ?? [];
        
        if (is_string($author)) {
            return ['name' => $author];
        }
        
        return [
            'id' => $author['id'] ?? null,
            'name' => $author['name'] ?? $author['username'] ?? '',
            'email' => $author['email'] ?? null,
        ];
    }
    
    private function extractTags(array $item): array
    {
        $tags = $item['tags'] ?? $item['categories'] ?? $item['labels'] ?? [];
        
        if (is_string($tags)) {
            return explode(',', $tags);
        }
        
        if (is_array($tags)) {
            return array_map(function($tag) {
                return is_string($tag) ? $tag : ($tag['name'] ?? '');
            }, $tags);
        }
        
        return [];
    }
    
    private function extractMetadata(array $item): array
    {
        // Extract additional metadata fields
        $metadata = [];
        
        $metadataFields = ['status', 'type', 'category', 'priority', 'visibility'];
        
        foreach ($metadataFields as $field) {
            if (isset($item[$field])) {
                $metadata[$field] = $item[$field];
            }
        }
        
        return $metadata;
    }
}
```

## Registering Custom Indexers

### Event-Based Registration

Register your custom indexers using the plugin's event system:

```php
<?php
// In your module's init() method or bootstrap file

use yii\base\Event;
use pennebaker\searchwithelastic\services\ElementIndexerService;
use pennebaker\searchwithelastic\events\IndexElementEvent;
use mymodule\processors\BlogDocumentProcessor;
use mymodule\processors\UniversalDocumentProcessor;

class MyModule extends \yii\base\Module
{
    public function init()
    {
        parent::init();
        
        // Register blog processor
        Event::on(
            ElementIndexerService::class,
            ElementIndexerService::EVENT_BEFORE_INDEX_ELEMENT,
            function(IndexElementEvent $event) {
                if ($event->element instanceof \craft\elements\Entry 
                    && $event->element->section->handle === 'blog') {
                    
                    $processor = new BlogDocumentProcessor();
                    $processor->process($event->element, $event->documentData);
                }
            }
        );
        
        // Register universal processor for all elements
        Event::on(
            ElementIndexerService::class,
            ElementIndexerService::EVENT_BEFORE_INDEX_ELEMENT,
            function(IndexElementEvent $event) {
                $processor = new UniversalDocumentProcessor();
                $processor->process($event->element, $event->documentData);
            }
        );
        
        // Register custom query modification
        Event::on(
            \pennebaker\searchwithelastic\services\QueryService::class,
            \pennebaker\searchwithelastic\services\QueryService::EVENT_BEFORE_BUILD_QUERY,
            function(\pennebaker\searchwithelastic\events\QueryEvent $event) {
                if ($event->elementType === \craft\elements\Entry::class) {
                    // Use custom blog query for entries
                    $event->query = new \mymodule\queries\BlogIndexableQuery();
                }
            }
        );
    }
}
```

### Service Replacement

Replace entire services with custom implementations:

```php
<?php

use yii\base\Event;
use pennebaker\searchwithelastic\SearchWithElastic;
use mymodule\services\CustomElementIndexerService;

Event::on(
    SearchWithElastic::class,
    SearchWithElastic::EVENT_INIT,
    function() {
        $plugin = SearchWithElastic::getInstance();
        $plugin->set('elementIndexerService', [
            'class' => CustomElementIndexerService::class,
        ]);
    }
);
```

## Testing Custom Indexers

Create comprehensive tests for your custom indexers:

```php
<?php

namespace mymodule\tests;

use Codeception\Test\Unit;
use mymodule\processors\BlogDocumentProcessor;
use craft\elements\Entry;

class BlogDocumentProcessorTest extends Unit
{
    private BlogDocumentProcessor $processor;
    
    protected function _before()
    {
        $this->processor = new BlogDocumentProcessor();
    }
    
    public function testProcessBlogEntry()
    {
        $entry = $this->createBlogEntry();
        $document = ['content' => 'Test blog content about technology.'];
        
        $this->processor->process($entry, $document);
        
        $this->assertArrayHasKey('readingTime', $document);
        $this->assertArrayHasKey('blogCategory', $document);
        $this->assertArrayHasKey('author', $document);
        $this->assertArrayHasKey('contentScore', $document);
        
        $this->assertIsInt($document['readingTime']);
        $this->assertGreaterThan(0, $document['readingTime']);
        
        $this->assertIsArray($document['author']);
        $this->assertArrayHasKey('name', $document['author']);
    }
    
    public function testReadingTimeCalculation()
    {
        $entry = $this->createBlogEntry();
        $document = ['content' => str_repeat('word ', 200)]; // 200 words
        
        $this->processor->process($entry, $document);
        
        $this->assertEquals(1, $document['readingTime']); // 200 words = 1 minute at 200 WPM
    }
    
    public function testContentScoreCalculation()
    {
        $entry = $this->createBlogEntry([
            'featured' => true,
            'featuredImage' => $this->createAsset(),
        ]);
        
        $document = [
            'content' => str_repeat('word ', 1500) . '<h2>Heading</h2><img src="test.jpg" alt="test">'
        ];
        
        $this->processor->process($entry, $document);
        
        $this->assertGreaterThan(1.0, $document['contentScore']);
    }
    
    private function createBlogEntry(array $attributes = []): Entry
    {
        $entry = new Entry();
        $entry->sectionId = 1;
        $entry->typeId = 1;
        $entry->title = 'Test Blog Entry';
        $entry->authorId = 1;
        
        // Set field values
        foreach ($attributes as $handle => $value) {
            $entry->setFieldValue($handle, $value);
        }
        
        return $entry;
    }
    
    private function createAsset(): \craft\elements\Asset
    {
        $asset = new \craft\elements\Asset();
        $asset->filename = 'test.jpg';
        $asset->kind = 'image';
        
        return $asset;
    }
}
```

## Performance Optimization

### Batch Processing

Implement batch processing for large datasets:

```php
<?php

namespace mymodule\services;

use pennebaker\searchwithelastic\SearchWithElastic;

class BatchIndexingService
{
    private int $batchSize = 100;
    private SearchWithElastic $plugin;
    
    public function __construct()
    {
        $this->plugin = SearchWithElastic::getInstance();
    }
    
    public function indexInBatches(array $elementIds, string $elementType): void
    {
        $batches = array_chunk($elementIds, $this->batchSize);
        
        foreach ($batches as $batch) {
            $this->processBatch($batch, $elementType);
            
            // Prevent memory issues
            \Craft::$app->gc->collect();
            
            // Rate limiting
            usleep(100000); // 100ms delay between batches
        }
    }
    
    private function processBatch(array $elementIds, string $elementType): void
    {
        $elements = $elementType::find()
            ->id($elementIds)
            ->all();
        
        foreach ($elements as $element) {
            try {
                $this->plugin->elementIndexerService->indexElement($element);
            } catch (\Exception $e) {
                \Craft::error("Failed to index element {$element->id}: " . $e->getMessage());
            }
        }
    }
}
```

### Caching

Implement intelligent caching:

```php
<?php

namespace mymodule\services;

use Craft;

class IndexingCacheService
{
    private int $cacheDuration = 3600; // 1 hour
    
    public function getCachedDocumentData(int $elementId, int $siteId): ?array
    {
        $cacheKey = "element_doc_{$elementId}_{$siteId}";
        return Craft::$app->cache->get($cacheKey);
    }
    
    public function setCachedDocumentData(int $elementId, int $siteId, array $data): void
    {
        $cacheKey = "element_doc_{$elementId}_{$siteId}";
        
        Craft::$app->cache->set(
            $cacheKey,
            $data,
            $this->cacheDuration,
            new \craft\cache\dependencies\TagDependency([
                'tags' => ["element_{$elementId}", "site_{$siteId}"]
            ])
        );
    }
    
    public function invalidateElementCache(int $elementId): void
    {
        \craft\helpers\cache\TagDependency::invalidate(
            Craft::$app->cache,
            "element_{$elementId}"
        );
    }
}
```

This comprehensive guide provides the foundation for creating sophisticated custom indexers that can handle complex content types, external data sources, and specialized search requirements while maintaining good performance and reliability.