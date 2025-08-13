# Testing Guide for Refactored Components

This guide covers testing strategies and examples for the components including traits, factory patterns, generic methods, and event system enhancements.

## Testing Overview

The refactored architecture introduces several testable components:

1. **Traits**: Independent, reusable functionality
2. **Factory Pattern**: Object creation logic
3. **Generic Methods**: Universal element handling
4. **Event System**: Organized event handling
5. **Error Handling**: Consistent error management

## Testing Environment Setup

### PHPUnit Configuration

Ensure your `phpunit.xml` is configured for the components:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit bootstrap="tests/bootstrap.php"
         colors="true"
         convertErrorsToExceptions="true"
         convertNoticesToExceptions="true"
         convertWarningsToExceptions="true"
         processIsolation="false"
         stopOnFailure="false">
    <testsuites>
        <testsuite name="Unit Tests">
            <directory>tests/Unit</directory>
        </testsuite>
        <testsuite name="Integration Tests">
            <directory>tests/Integration</directory>
        </testsuite>
    </testsuites>
    <filter>
        <whitelist processUncoveredFilesFromWhitelist="true">
            <directory suffix=".php">src</directory>
        </whitelist>
    </filter>
</phpunit>
```

### Test Bootstrap

```php
<?php
// tests/bootstrap.php

// Include Craft's bootstrap
$craftPath = dirname(__DIR__, 3) . '/craft';
define('CRAFT_BASE_PATH', $craftPath);
define('CRAFT_VENDOR_PATH', $craftPath . '/vendor');

require_once CRAFT_VENDOR_PATH . '/autoload.php';
require_once CRAFT_BASE_PATH . '/bootstrap.php';

// Define test environment
defined('CRAFT_ENVIRONMENT') or define('CRAFT_ENVIRONMENT', 'test');
```

## Testing Traits

### FrontendFetchingTrait Tests

```php
<?php
namespace pennebaker\searchwithelastic\tests\Unit\Traits;

use PHPUnit\Framework\TestCase;
use pennebaker\searchwithelastic\traits\FrontendFetchingTrait;
use pennebaker\searchwithelastic\models\SettingsModel;

class FrontendFetchingTraitTest extends TestCase
{
    use FrontendFetchingTrait;
    
    private $mockSettings;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->mockSettings = $this->createMock(SettingsModel::class);
    }
    
    public function testFrontendFetchDefault(): void
    {
        $this->assertFalse($this->frontendFetch);
    }
    
    public function testFrontendFetchEnable(): void
    {
        $result = $this->frontendFetch(true);
        
        $this->assertTrue($this->frontendFetch);
        $this->assertSame($this, $result); // Test method chaining
    }
    
    public function testFrontendFetchDisable(): void
    {
        $this->frontendFetch(true);
        $result = $this->frontendFetch(false);
        
        $this->assertFalse($this->frontendFetch);
        $this->assertSame($this, $result);
    }
    
    public function testMultiSiteFrontendFetch(): void
    {
        $result = $this->multiSiteFrontendFetch(true);
        
        $this->assertTrue($this->multiSiteFrontendFetch);
        $this->assertSame($this, $result);
    }
    
    public function testIsFrontendFetchEnabledWithSettings(): void
    {
        $this->mockSettings->enableFrontendFetching = true;
        $this->frontendFetch(true);
        
        $this->assertTrue($this->isFrontendFetchEnabled());
    }
    
    public function testIsFrontendFetchEnabledWithoutSettings(): void
    {
        $this->mockSettings->enableFrontendFetching = false;
        $this->frontendFetch(true);
        
        $this->assertFalse($this->isFrontendFetchEnabled());
    }
    
    public function testShouldExcludeFromFrontendFetch(): void
    {
        $this->mockSettings->excludedFrontendFetchingEntryTypes = ['restricted', 'private'];
        
        $this->assertTrue($this->shouldExcludeFromFrontendFetch(['news', 'restricted']));
        $this->assertFalse($this->shouldExcludeFromFrontendFetch(['news', 'blog']));
    }
    
    public function testGetExcludedFrontendFetchingTypes(): void
    {
        $excludedTypes = ['restricted', 'private'];
        $this->mockSettings->excludedFrontendFetchingEntryTypes = $excludedTypes;
        
        $result = $this->getExcludedFrontendFetchingTypes();
        
        $this->assertEquals($excludedTypes, $result);
    }
    
    // Override for testing
    protected function getPluginSettings(): ?SettingsModel
    {
        return $this->mockSettings;
    }
}
```

### StatusFilteringTrait Tests

```php
<?php
namespace pennebaker\searchwithelastic\tests\Unit\Traits;

use PHPUnit\Framework\TestCase;
use pennebaker\searchwithelastic\traits\StatusFilteringTrait;

class StatusFilteringTraitTest extends TestCase
{
    use StatusFilteringTrait;
    
    public function testStatusDefault(): void
    {
        $this->assertNull($this->status);
    }
    
    public function testStatusSingle(): void
    {
        $result = $this->status('live');
        
        $this->assertEquals(['live'], $this->status);
        $this->assertSame($this, $result);
    }
    
    public function testStatusMultiple(): void
    {
        $this->status(['live', 'pending']);
        
        $this->assertEquals(['live', 'pending'], $this->status);
    }
    
    public function testStatusInvalid(): void
    {
        $this->status(['live', 'invalid', 'pending']);
        
        // Invalid status should be filtered out
        $this->assertEquals(['live', 'pending'], $this->status);
    }
    
    public function testLiveOnly(): void
    {
        $result = $this->liveOnly();
        
        $this->assertEquals(['live'], $this->status);
        $this->assertSame($this, $result);
    }
    
    public function testPendingOnly(): void
    {
        $this->pendingOnly();
        $this->assertEquals(['pending'], $this->status);
    }
    
    public function testExpiredOnly(): void
    {
        $this->expiredOnly();
        $this->assertEquals(['expired'], $this->status);
    }
    
    public function testDisabledOnly(): void
    {
        $this->disabledOnly();
        $this->assertEquals(['disabled'], $this->status);
    }
    
    public function testEnabledOnly(): void
    {
        $this->enabledOnly();
        $this->assertEquals(['enabled'], $this->status);
    }
    
    public function testHasStatus(): void
    {
        $this->status(['live', 'pending']);
        
        $this->assertTrue($this->hasStatus('live'));
        $this->assertTrue($this->hasStatus('pending'));
        $this->assertFalse($this->hasStatus('expired'));
    }
    
    public function testHasStatusWithNull(): void
    {
        $this->assertFalse($this->hasStatus('live'));
    }
    
    public function testGetValidStatuses(): void
    {
        $expected = ['live', 'pending', 'expired', 'disabled', 'enabled'];
        $this->assertEquals($expected, $this->getValidStatuses());
    }
    
    public function testIsValidStatus(): void
    {
        $this->assertTrue($this->isValidStatus('live'));
        $this->assertTrue($this->isValidStatus('pending'));
        $this->assertFalse($this->isValidStatus('invalid'));
    }
    
    public function testNormalizeStatusString(): void
    {
        $result = $this->normalizeStatus('live');
        $this->assertEquals(['live'], $result);
    }
    
    public function testNormalizeStatusArray(): void
    {
        $result = $this->normalizeStatus(['live', 'pending', 'invalid']);
        $this->assertEquals(['live', 'pending'], $result);
    }
}
```

### PriceFilteringTrait Tests

```php
<?php
namespace pennebaker\searchwithelastic\tests\Unit\Traits;

use PHPUnit\Framework\TestCase;
use pennebaker\searchwithelastic\traits\PriceFilteringTrait;

class PriceFilteringTraitTest extends TestCase
{
    use PriceFilteringTrait;
    
    public function testPriceDefaults(): void
    {
        $this->assertNull($this->minPrice);
        $this->assertNull($this->maxPrice);
    }
    
    public function testPriceRange(): void
    {
        $result = $this->priceRange(10.0, 100.0);
        
        $this->assertEquals(10.0, $this->minPrice);
        $this->assertEquals(100.0, $this->maxPrice);
        $this->assertSame($this, $result);
    }
    
    public function testPriceRangeInvalid(): void
    {
        $this->priceRange(100.0, 10.0); // Max less than min
        
        // Should not set invalid range
        $this->assertNull($this->minPrice);
        $this->assertNull($this->maxPrice);
    }
    
    public function testMinPrice(): void
    {
        $result = $this->minPrice(25.0);
        
        $this->assertEquals(25.0, $this->minPrice);
        $this->assertSame($this, $result);
    }
    
    public function testMinPriceNegative(): void
    {
        $this->minPrice(-10.0);
        
        // Should not set negative price
        $this->assertNull($this->minPrice);
    }
    
    public function testMaxPrice(): void
    {
        $this->maxPrice(50.0);
        $this->assertEquals(50.0, $this->maxPrice);
    }
    
    public function testExactPrice(): void
    {
        $this->exactPrice(19.99);
        
        $this->assertEquals(19.99, $this->minPrice);
        $this->assertEquals(19.99, $this->maxPrice);
    }
    
    public function testFreeOnly(): void
    {
        $this->freeOnly();
        
        $this->assertEquals(0.0, $this->minPrice);
        $this->assertEquals(0.0, $this->maxPrice);
    }
    
    public function testPaidOnly(): void
    {
        $this->paidOnly();
        
        $this->assertEquals(0.01, $this->minPrice);
        $this->assertNull($this->maxPrice);
    }
    
    public function testHasPriceFilter(): void
    {
        $this->assertFalse($this->hasPriceFilter());
        
        $this->minPrice(10.0);
        $this->assertTrue($this->hasPriceFilter());
        
        $this->clearPriceFilter();
        $this->assertFalse($this->hasPriceFilter());
        
        $this->maxPrice(100.0);
        $this->assertTrue($this->hasPriceFilter());
    }
    
    public function testClearPriceFilter(): void
    {
        $this->priceRange(10.0, 100.0);
        $result = $this->clearPriceFilter();
        
        $this->assertNull($this->minPrice);
        $this->assertNull($this->maxPrice);
        $this->assertSame($this, $result);
    }
    
    public function testValidatePriceRange(): void
    {
        $this->assertTrue($this->validatePriceRange(null, null));
        $this->assertTrue($this->validatePriceRange(10.0, 100.0));
        $this->assertTrue($this->validatePriceRange(10.0, null));
        $this->assertTrue($this->validatePriceRange(null, 100.0));
        
        $this->assertFalse($this->validatePriceRange(-10.0, 100.0));
        $this->assertFalse($this->validatePriceRange(10.0, -100.0));
        $this->assertFalse($this->validatePriceRange(100.0, 10.0));
    }
    
    public function testFormatPrice(): void
    {
        $this->assertEquals('19.99', $this->formatPrice(19.99));
        $this->assertEquals('0.00', $this->formatPrice(0));
        $this->assertNull($this->formatPrice(null));
    }
}
```

### ErrorHandlingTrait Tests

```php
<?php
namespace pennebaker\searchwithelastic\tests\Unit\Traits;

use PHPUnit\Framework\TestCase;
use pennebaker\searchwithelastic\traits\ErrorHandlingTrait;
use pennebaker\searchwithelastic\exceptions\SearchWithElasticException;

class ErrorHandlingTraitTest extends TestCase
{
    use ErrorHandlingTrait;
    
    public function testGetLogLevel(): void
    {
        $elasticsearchException = new \yii\elasticsearch\Exception('ES error');
        $this->assertEquals('error', $this->getLogLevel($elasticsearchException));
        
        $configException = new \yii\base\InvalidConfigException('Config error');
        $this->assertEquals('error', $this->getLogLevel($configException));
        
        $pluginException = new SearchWithElasticException('Plugin error');
        $pluginException->shouldLog = true;
        $this->assertEquals('warning', $this->getLogLevel($pluginException));
        
        $pluginException->shouldLog = false;
        $this->assertEquals('info', $this->getLogLevel($pluginException));
        
        $genericException = new \Exception('Generic error');
        $this->assertEquals('warning', $this->getLogLevel($genericException));
    }
    
    public function testGetUserMessage(): void
    {
        $pluginException = new SearchWithElasticException('Plugin error');
        $pluginException->setUserMessage('User friendly message');
        
        $this->assertEquals('User friendly message', $this->getUserMessage($pluginException));
        
        $genericException = new \Exception('Technical error');
        $message = $this->getUserMessage($genericException, 'Custom default');
        $this->assertEquals('Custom default', $message);
        
        $defaultMessage = $this->getUserMessage($genericException);
        $this->assertStringContains('An error occurred', $defaultMessage);
    }
    
    public function testSafeExecute(): void
    {
        // Test successful execution
        $result = $this->safeExecute(
            fn() => 'success',
            'test operation',
            'default'
        );
        $this->assertEquals('success', $result);
        
        // Test exception handling
        $result = $this->safeExecute(
            fn() => throw new \Exception('test error'),
            'test operation',
            'default'
        );
        $this->assertEquals('default', $result);
    }
}
```

## Testing Factory Pattern

### IndexableElementModelFactory Tests

```php
<?php
namespace pennebaker\searchwithelastic\tests\Unit\Factories;

use PHPUnit\Framework\TestCase;
use craft\elements\Entry;
use craft\elements\Asset;
use pennebaker\searchwithelastic\factories\IndexableElementModelFactory;
use pennebaker\searchwithelastic\models\IndexableElementModel;

class IndexableElementModelFactoryTest extends TestCase
{
    private IndexableElementModelFactory $factory;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->factory = new IndexableElementModelFactory();
    }
    
    public function testCreateFromElementData(): void
    {
        $elementData = [
            'elementId' => 123,
            'siteId' => 1,
            'title' => 'Test Entry',
            'slug' => 'test-entry',
            'status' => 'live',
            'sectionId' => 2
        ];
        
        $model = $this->factory->createFromElementData(Entry::class, $elementData);
        
        $this->assertInstanceOf(IndexableElementModel::class, $model);
        $this->assertEquals(123, $model->elementId);
        $this->assertEquals(1, $model->siteId);
        $this->assertEquals(Entry::class, $model->type);
        $this->assertEquals('Test Entry', $model->title);
        $this->assertEquals('test-entry', $model->slug);
        $this->assertEquals('live', $model->status);
    }
    
    public function testCreateFromElementDataInvalidType(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Unsupported element type');
        
        $this->factory->createFromElementData('InvalidElement', [
            'elementId' => 123,
            'siteId' => 1
        ]);
    }
    
    public function testCreateFromElementDataInvalidData(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid element data');
        
        $this->factory->createFromElementData(Entry::class, [
            'elementId' => -1, // Invalid ID
            'siteId' => 1
        ]);
    }
    
    public function testCreateFromElement(): void
    {
        $element = $this->createMock(Entry::class);
        $element->id = 123;
        $element->siteId = 1;
        $element->title = 'Mock Entry';
        $element->slug = 'mock-entry';
        $element->status = 'live';
        
        $model = $this->factory->createFromElement($element);
        
        $this->assertEquals(123, $model->elementId);
        $this->assertEquals(1, $model->siteId);
        $this->assertEquals(Entry::class, $model->type);
        $this->assertEquals('Mock Entry', $model->title);
    }
    
    public function testCreateFromElementNull(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Element cannot be null');
        
        $this->factory->createFromElement(null);
    }
    
    public function testCreateBatch(): void
    {
        $elementsData = [
            [
                'elementId' => 123,
                'siteId' => 1,
                'title' => 'Entry 1'
            ],
            [
                'elementId' => 124,
                'siteId' => 1,
                'title' => 'Entry 2'
            ],
            [
                'elementId' => -1, // Invalid - should be skipped
                'siteId' => 1
            ]
        ];
        
        $models = $this->factory->createBatch(Entry::class, $elementsData);
        
        $this->assertCount(2, $models); // Invalid record skipped
        $this->assertEquals(123, $models[0]->elementId);
        $this->assertEquals(124, $models[1]->elementId);
    }
    
    public function testGetSupportedElementTypes(): void
    {
        $types = $this->factory->getSupportedElementTypes();
        
        $this->assertContains(Entry::class, $types);
        $this->assertContains(Asset::class, $types);
        $this->assertContains(\craft\elements\Category::class, $types);
    }
    
    public function testIsElementTypeSupported(): void
    {
        $this->assertTrue($this->factory->isElementTypeSupported(Entry::class));
        $this->assertTrue($this->factory->isElementTypeSupported(Asset::class));
        $this->assertFalse($this->factory->isElementTypeSupported('InvalidElement'));
    }
    
    public function testValidateElementData(): void
    {
        $validData = [
            'elementId' => 123,
            'siteId' => 1
        ];
        $this->assertTrue($this->factory->validateElementData($validData));
        
        $invalidData = [
            'elementId' => -1,
            'siteId' => 1
        ];
        $this->assertFalse($this->factory->validateElementData($invalidData));
        
        $missingData = [
            'elementId' => 123
            // siteId missing
        ];
        $this->assertFalse($this->factory->validateElementData($missingData));
    }
}
```

## Testing Generic Methods

### QueryService Tests

```php
<?php
namespace pennebaker\searchwithelastic\tests\Unit\Services;

use PHPUnit\Framework\TestCase;
use craft\elements\Entry;
use craft\elements\Asset;
use pennebaker\searchwithelastic\services\QueryService;
use pennebaker\searchwithelastic\queries\IndexableEntryQuery;
use pennebaker\searchwithelastic\queries\IndexableAssetQuery;

class QueryServiceTest extends TestCase
{
    private QueryService $queryService;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->queryService = new QueryService();
    }
    
    public function testGetIndexableElementQuery(): void
    {
        $query = $this->queryService->getIndexableElementQuery(Entry::class, 1);
        
        $this->assertInstanceOf(IndexableEntryQuery::class, $query);
        $this->assertEquals(1, $query->siteId);
    }
    
    public function testGetIndexableElementQueryUnsupportedType(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Unsupported element type');
        
        $this->queryService->getIndexableElementQuery('InvalidElement', 1);
    }
    
    public function testGetElementQuery(): void
    {
        $query = $this->queryService->getElementQuery(Entry::class, 1);
        
        $this->assertInstanceOf(IndexableEntryQuery::class, $query);
        $this->assertEquals(1, $query->siteId);
    }
    
    public function testGetSupportedElementTypes(): void
    {
        $types = $this->queryService->getSupportedElementTypes();
        
        $this->assertIsArray($types);
        $this->assertContains(Entry::class, $types);
        $this->assertContains(Asset::class, $types);
    }
    
    public function testIsElementTypeSupported(): void
    {
        $this->assertTrue($this->queryService->isElementTypeSupported(Entry::class));
        $this->assertFalse($this->queryService->isElementTypeSupported('InvalidElement'));
    }
    
    public function testCreateQueryForElements(): void
    {
        $elementTypes = [Entry::class, Asset::class];
        $queries = $this->queryService->createQueryForElements($elementTypes, 1);
        
        $this->assertCount(2, $queries);
        $this->assertInstanceOf(IndexableEntryQuery::class, $queries[Entry::class]);
        $this->assertInstanceOf(IndexableAssetQuery::class, $queries[Asset::class]);
    }
    
    public function testCreateQueryFromConfig(): void
    {
        $config = [
            'elementType' => Entry::class,
            'siteId' => 1,
            'limit' => 10,
            'status' => 'live'
        ];
        
        $query = $this->queryService->createQueryFromConfig($config);
        
        $this->assertInstanceOf(IndexableEntryQuery::class, $query);
        $this->assertEquals(1, $query->siteId);
        $this->assertEquals(10, $query->limit);
    }
    
    public function testCreateQueryFromConfigInvalid(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        
        $config = [
            'siteId' => 1
            // elementType missing
        ];
        
        $this->queryService->createQueryFromConfig($config);
    }
    
    public function testValidateQueryConfig(): void
    {
        $validConfig = [
            'elementType' => Entry::class,
            'siteId' => 1
        ];
        $this->assertTrue($this->queryService->validateQueryConfig($validConfig));
        
        $invalidConfig = [
            'elementType' => 'InvalidElement',
            'siteId' => 1
        ];
        $this->assertFalse($this->queryService->validateQueryConfig($invalidConfig));
        
        $missingConfig = [
            'siteId' => 1
        ];
        $this->assertFalse($this->queryService->validateQueryConfig($missingConfig));
    }
}
```

## Integration Testing

### Comprehensive Integration Test

```php
<?php
namespace pennebaker\searchwithelastic\tests\Integration;

use PHPUnit\Framework\TestCase;
use craft\elements\Entry;
use pennebaker\searchwithelastic\SearchWithElastic;
use pennebaker\searchwithelastic\factories\IndexableElementModelFactory;
use pennebaker\searchwithelastic\services\QueryService;

class RefactoredComponentsIntegrationTest extends TestCase
{
    private $plugin;
    private $factory;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->plugin = SearchWithElastic::getInstance();
        $this->factory = new IndexableElementModelFactory();
    }
    
    public function testQueryServiceIntegration(): void
    {
        $queryService = $this->plugin->queries;
        
        // Test generic method returns same type as specific method
        $genericQuery = $queryService->getIndexableElementQuery(Entry::class, 1);
        $specificQuery = $queryService->getIndexableEntryQuery(1);
        
        $this->assertEquals(get_class($genericQuery), get_class($specificQuery));
        $this->assertEquals($genericQuery->siteId, $specificQuery->siteId);
    }
    
    public function testFactoryIntegration(): void
    {
        // Mock entry for testing
        $entry = $this->createMock(Entry::class);
        $entry->id = 123;
        $entry->siteId = 1;
        $entry->title = 'Integration Test Entry';
        
        $model = $this->factory->createFromElement($entry);
        
        $this->assertEquals(123, $model->elementId);
        $this->assertEquals(1, $model->siteId);
        $this->assertEquals(Entry::class, $model->type);
    }
    
    public function testTraitIntegration(): void
    {
        $query = $this->plugin->queries->getIndexableElementQuery(Entry::class, 1);
        
        // Test that traits are available
        $this->assertTrue(method_exists($query, 'frontendFetch'));
        $this->assertTrue(method_exists($query, 'liveOnly'));
        
        // Test method chaining
        $result = $query->frontendFetch(true)->liveOnly();
        $this->assertSame($query, $result);
    }
    
    public function testEventSystemIntegration(): void
    {
        $eventFired = false;
        
        Event::on(
            QueryService::class,
            QueryService::EVENT_BEFORE_BUILD_QUERY,
            function() use (&$eventFired) {
                $eventFired = true;
            }
        );
        
        $this->plugin->queries->getIndexableElementQuery(Entry::class, 1);
        
        $this->assertTrue($eventFired);
    }
}
```

## Performance Testing

### Benchmark Tests

```php
<?php
namespace pennebaker\searchwithelastic\tests\Performance;

use PHPUnit\Framework\TestCase;
use craft\elements\Entry;
use pennebaker\searchwithelastic\SearchWithElastic;
use pennebaker\searchwithelastic\factories\IndexableElementModelFactory;

class PerformanceTest extends TestCase
{
    public function testGenericMethodPerformance(): void
    {
        $plugin = SearchWithElastic::getInstance();
        
        $startTime = microtime(true);
        
        // Test generic method performance
        for ($i = 0; $i < 1000; $i++) {
            $query = $plugin->queries->getIndexableElementQuery(Entry::class, 1);
        }
        
        $genericTime = microtime(true) - $startTime;
        
        $startTime = microtime(true);
        
        // Test specific method performance
        for ($i = 0; $i < 1000; $i++) {
            $query = $plugin->queries->getIndexableEntryQuery(1);
        }
        
        $specificTime = microtime(true) - $startTime;
        
        // Generic method should be comparable in performance
        $this->assertLessThan($specificTime * 2, $genericTime);
    }
    
    public function testFactoryBatchPerformance(): void
    {
        $factory = new IndexableElementModelFactory();
        
        $elementsData = [];
        for ($i = 0; $i < 1000; $i++) {
            $elementsData[] = [
                'elementId' => $i,
                'siteId' => 1,
                'title' => "Entry {$i}"
            ];
        }
        
        $startTime = microtime(true);
        $models = $factory->createBatch(Entry::class, $elementsData);
        $batchTime = microtime(true) - $startTime;
        
        $startTime = microtime(true);
        $individualModels = [];
        foreach ($elementsData as $data) {
            $individualModels[] = $factory->createFromElementData(Entry::class, $data);
        }
        $individualTime = microtime(true) - $startTime;
        
        // Batch should be faster than individual creation
        $this->assertLessThan($individualTime, $batchTime);
        $this->assertCount(1000, $models);
    }
}
```

## Test Coverage

### Coverage Configuration

Add to your `phpunit.xml`:

```xml
<logging>
    <log type="coverage-html" target="tests/coverage"/>
    <log type="coverage-clover" target="tests/coverage/clover.xml"/>
</logging>
```

### Running Tests with Coverage

```bash
# Run all tests with coverage
vendor/bin/phpunit --coverage-html tests/coverage

# Run specific test suites
vendor/bin/phpunit tests/Unit/Traits/
vendor/bin/phpunit tests/Unit/Factories/
vendor/bin/phpunit tests/Unit/Services/

# Run integration tests
vendor/bin/phpunit tests/Integration/
```

## Continuous Integration

### GitHub Actions Example

```yaml
# .github/workflows/tests.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        php-version: [8.1, 8.2]
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup PHP
      uses: shivammathur/setup-php@v2
      with:
        php-version: ${{ matrix.php-version }}
        extensions: mbstring, intl, zip
        
    - name: Install dependencies
      run: composer install
      
    - name: Run tests
      run: vendor/bin/phpunit
      
    - name: Run coverage
      run: vendor/bin/phpunit --coverage-clover coverage.xml
      
    - name: Upload coverage
      uses: codecov/codecov-action@v1
      with:
        file: ./coverage.xml
```

## Best Practices

### Test Organization

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions
3. **Performance Tests**: Benchmark critical operations
4. **Mock Dependencies**: Use mocks for external dependencies

### Test Data

```php
// Use data providers for multiple test scenarios
/**
 * @dataProvider statusProvider
 */
public function testStatusFiltering($status, $expected): void
{
    $this->status($status);
    $this->assertEquals($expected, $this->status);
}

public function statusProvider(): array
{
    return [
        ['live', ['live']],
        [['live', 'pending'], ['live', 'pending']],
        [['live', 'invalid'], ['live']], // Invalid filtered out
    ];
}
```

### Error Testing

```php
public function testExceptionHandling(): void
{
    $this->expectException(\InvalidArgumentException::class);
    $this->expectExceptionMessage('Expected error message');
    
    // Code that should throw exception
}
```

### Memory Testing

```php
public function testMemoryUsage(): void
{
    $initialMemory = memory_get_usage();
    
    // Perform operation
    $factory = new IndexableElementModelFactory();
    $models = $factory->createBatch(Entry::class, $this->getLargeDataSet());
    
    // Clear references
    unset($models, $factory);
    
    $finalMemory = memory_get_usage();
    $memoryIncrease = $finalMemory - $initialMemory;
    
    // Assert reasonable memory usage
    $this->assertLessThan(50 * 1024 * 1024, $memoryIncrease); // Less than 50MB
}
```

## Running the Tests

### Command Line

```bash
# Run all tests
vendor/bin/phpunit

# Run specific test categories
vendor/bin/phpunit tests/Unit/
vendor/bin/phpunit tests/Integration/

# Run specific test files
vendor/bin/phpunit tests/Unit/Traits/FrontendFetchingTraitTest.php

# Run with coverage
vendor/bin/phpunit --coverage-html coverage/

# Run specific test methods
vendor/bin/phpunit --filter testFrontendFetchEnable
```

### IDE Integration

Most IDEs support PHPUnit integration:

- **PhpStorm**: Built-in PHPUnit support
- **VS Code**: PHP Unit extension
- **Vim**: PHPUnit plugins available

## Troubleshooting Tests

### Common Issues

1. **Missing Dependencies**: Ensure all Craft dependencies are available
2. **Environment Setup**: Use proper test environment configuration  
3. **Mock Setup**: Properly mock Craft components that aren't available in tests
4. **Database**: Use in-memory databases for testing when needed

### Debug Output

```php
public function testWithDebug(): void
{
    $result = $this->performOperation();
    
    // Debug output (remove prior to committing)
    var_dump($result);
    error_log('Test result: ' . json_encode($result));
    
    $this->assertEquals($expected, $result);
}
```

This testing guide ensures comprehensive coverage of all refactored components, maintaining high code quality and reliability as the architecture evolves.