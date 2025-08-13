# Traits Usage Guide

The Craft Search with Elastic plugin includes several traits that provide reusable functionality across query classes and services. These traits were introduced during the refactoring to reduce code duplication and provide consistent behavior.

## Overview

| Trait | Purpose | Lines Saved | Used By |
|-------|---------|-------------|---------|
| `FrontendFetchingTrait` | Frontend fetching configuration | ~150 | All query classes |
| `StatusFilteringTrait` | Status filtering functionality | ~60 | Entry, Product, DigitalProduct queries |
| `PriceFilteringTrait` | Price range filtering | ~80 | Product, DigitalProduct queries |
| `ErrorHandlingTrait` | Consistent error handling | ~40 | All service classes |

## FrontendFetchingTrait

### Purpose

Centralizes frontend fetching logic and configuration handling across all query classes, reducing approximately 150 lines of duplicated code.

### Namespace

```php
pennebaker\searchwithelastic\traits\FrontendFetchingTrait
```

### Properties

```php
protected bool $frontendFetch = false;
protected bool $multiSiteFrontendFetch = false;
```

### Methods

#### frontendFetch()

Enable or disable frontend fetching for this query.

```php
public function frontendFetch(bool $value = true): self
```

**Parameters:**
- `$value` (bool): Whether to enable frontend fetching (default: true)

**Returns:** `self` - For method chaining

**Example:**
```php
$query = IndexableEntryQuery::find()
    ->siteId(1)
    ->frontendFetch(true);
```

#### multiSiteFrontendFetch()

Enable or disable multi-site frontend fetching.

```php
public function multiSiteFrontendFetch(bool $value = true): self
```

**Parameters:**
- `$value` (bool): Whether to enable multi-site frontend fetching (default: true)

**Returns:** `self` - For method chaining

**Example:**
```php
$query = IndexableEntryQuery::find()
    ->siteId(1)
    ->multiSiteFrontendFetch(true);
```

#### isFrontendFetchEnabled()

Check if frontend fetching is enabled, considering both global plugin settings and instance-level configuration.

```php
public function isFrontendFetchEnabled(): bool
```

**Returns:** `bool` - True if frontend fetching should be enabled

**Example:**
```php
$query = IndexableEntryQuery::find()->frontendFetch(true);

if ($query->isFrontendFetchEnabled()) {
    // Perform frontend fetching logic
}
```

#### shouldExcludeFromFrontendFetch()

Check if the given types should be excluded from frontend fetching.

```php
public function shouldExcludeFromFrontendFetch(array $types): bool
```

**Parameters:**
- `$types` (array): Array of type handles to check

**Returns:** `bool` - True if any of the types should be excluded

**Example:**
```php
$entryTypes = ['news', 'blog', 'restricted'];
$query = IndexableEntryQuery::find();

if (!$query->shouldExcludeFromFrontendFetch($entryTypes)) {
    // Safe to proceed with frontend fetching
}
```

#### getExcludedFrontendFetchingTypes()

Get the list of types excluded from frontend fetching.

```php
public function getExcludedFrontendFetchingTypes(): array
```

**Returns:** `array` - Array of excluded type handles

### Usage Example

```php
use pennebaker\searchwithelastic\queries\IndexableEntryQuery;

// Basic usage
$entries = IndexableEntryQuery::find()
    ->siteId(1)
    ->frontendFetch(true)
    ->entryTypes(['news', 'blog'])
    ->all();

// Multi-site usage
$entries = IndexableEntryQuery::find()
    ->siteId([1, 2, 3])
    ->multiSiteFrontendFetch(true)
    ->all();

// Conditional logic
$query = IndexableEntryQuery::find()->siteId(1);

if ($query->isFrontendFetchEnabled()) {
    $query->frontendFetch(true);
}

$entries = $query->all();
```

### Implementation Details

Classes using this trait should ensure they have access to plugin settings. The trait provides a default implementation of `getPluginSettings()` that accesses the main plugin instance:

```php
protected function getPluginSettings(): ?SettingsModel
{
    return SearchWithElastic::getInstance()?->getSettings();
}
```

## StatusFilteringTrait

### Purpose

Provides centralized status filtering logic for entries, products, and digital products, reducing approximately 60 lines of code duplication.

### Namespace

```php
pennebaker\searchwithelastic\traits\StatusFilteringTrait
```

### Properties

```php
protected ?array $status = null;
```

### Methods

#### status()

Set the status filter.

```php
public function status(string|array $value): self
```

**Parameters:**
- `$value` (string|array): Status value(s) to filter by

**Returns:** `self` - For method chaining

**Example:**
```php
// Single status
$query->status('live');

// Multiple statuses
$query->status(['live', 'pending']);
```

#### liveOnly()

Filter to only live elements.

```php
public function liveOnly(): self
```

**Returns:** `self` - For method chaining

#### pendingOnly()

Filter to only pending elements.

```php
public function pendingOnly(): self
```

**Returns:** `self` - For method chaining

#### expiredOnly()

Filter to only expired elements.

```php
public function expiredOnly(): self
```

**Returns:** `self` - For method chaining

#### disabledOnly()

Filter to only disabled elements.

```php
public function disabledOnly(): self
```

**Returns:** `self` - For method chaining

#### enabledOnly()

Filter to only enabled elements.

```php
public function enabledOnly(): self
```

**Returns:** `self` - For method chaining

#### hasStatus()

Check if the query has a specific status filter.

```php
public function hasStatus(string $status): bool
```

**Parameters:**
- `$status` (string): The status to check for

**Returns:** `bool` - True if the status is included in the filter

#### getValidStatuses()

Get valid status values.

```php
public function getValidStatuses(): array
```

**Returns:** `array` - Array of valid status values

**Valid Statuses:**
- `live` - Published and within date range
- `pending` - Scheduled for future publication
- `expired` - Past expiry date
- `disabled` - Manually disabled
- `enabled` - Manually enabled

#### isValidStatus()

Check if a status value is valid.

```php
public function isValidStatus(string $status): bool
```

**Parameters:**
- `$status` (string): The status to validate

**Returns:** `bool` - True if the status is valid

### Usage Example

```php
use pennebaker\searchwithelastic\queries\IndexableEntryQuery;

// Filter by specific status
$liveEntries = IndexableEntryQuery::find()
    ->siteId(1)
    ->liveOnly()
    ->all();

// Filter by multiple statuses
$entries = IndexableEntryQuery::find()
    ->siteId(1)
    ->status(['live', 'pending'])
    ->all();

// Conditional filtering
$query = IndexableEntryQuery::find()->siteId(1);

if ($includeExpired) {
    $query->status(['live', 'expired']);
} else {
    $query->liveOnly();
}

$entries = $query->all();

// Check for specific status
if ($query->hasStatus('live')) {
    // Query includes live entries
}
```

## PriceFilteringTrait

### Purpose

Provides centralized price filtering logic for commerce-enabled queries like `IndexableProductQuery` and `IndexableDigitalProductQuery`, reducing approximately 80 lines of code duplication.

### Namespace

```php
pennebaker\searchwithelastic\traits\PriceFilteringTrait
```

### Properties

```php
protected ?float $minPrice = null;
protected ?float $maxPrice = null;
```

### Methods

#### priceRange()

Set price range filter.

```php
public function priceRange(?float $min = null, ?float $max = null): self
```

**Parameters:**
- `$min` (?float): Minimum price (null for no minimum)
- `$max` (?float): Maximum price (null for no maximum)

**Returns:** `self` - For method chaining

**Example:**
```php
// Price range $10 - $100
$query->priceRange(10.00, 100.00);

// Only minimum price
$query->priceRange(10.00);

// Only maximum price  
$query->priceRange(null, 100.00);
```

#### minPrice()

Set minimum price filter.

```php
public function minPrice(?float $price): self
```

**Parameters:**
- `$price` (?float): Minimum price

**Returns:** `self` - For method chaining

#### maxPrice()

Set maximum price filter.

```php
public function maxPrice(?float $price): self
```

**Parameters:**
- `$price` (?float): Maximum price

**Returns:** `self` - For method chaining

#### exactPrice()

Set exact price filter (min and max to same value).

```php
public function exactPrice(float $price): self
```

**Parameters:**
- `$price` (float): Exact price to match

**Returns:** `self` - For method chaining

#### freeOnly()

Filter to only free items (price = 0).

```php
public function freeOnly(): self
```

**Returns:** `self` - For method chaining

#### paidOnly()

Filter to only paid items (price > 0).

```php
public function paidOnly(): self
```

**Returns:** `self` - For method chaining

#### hasPriceFilter()

Check if any price filter is set.

```php
public function hasPriceFilter(): bool
```

**Returns:** `bool` - True if min or max price is set

#### clearPriceFilter()

Clear all price filters.

```php
public function clearPriceFilter(): self
```

**Returns:** `self` - For method chaining

#### validatePriceRange()

Validate price range values.

```php
public function validatePriceRange(?float $min, ?float $max): bool
```

**Parameters:**
- `$min` (?float): Minimum price
- `$max` (?float): Maximum price

**Returns:** `bool` - True if the range is valid

**Validation Rules:**
- Null values are valid (no constraint)
- Negative values are invalid
- If both are set, min should not be greater than max

#### formatPrice()

Format price value for consistent display.

```php
public function formatPrice(?float $price): ?string
```

**Parameters:**
- `$price` (?float): Price to format

**Returns:** `?string` - Formatted price string or null

### Usage Example

```php
use pennebaker\searchwithelastic\queries\IndexableProductQuery;

// Products in price range
$products = IndexableProductQuery::find()
    ->siteId(1)
    ->priceRange(10.00, 100.00)
    ->all();

// Free products only
$freeProducts = IndexableProductQuery::find()
    ->siteId(1)
    ->freeOnly()
    ->all();

// Products over $50
$expensiveProducts = IndexableProductQuery::find()
    ->siteId(1)
    ->minPrice(50.00)
    ->all();

// Conditional pricing
$query = IndexableProductQuery::find()->siteId(1);

if ($showFreeOnly) {
    $query->freeOnly();
} else if ($priceRange) {
    $query->priceRange($priceRange['min'], $priceRange['max']);
}

$products = $query->all();

// Check if price filters are active
if ($query->hasPriceFilter()) {
    // Price filtering is active
}
```

## ErrorHandlingTrait

### Purpose

Provides consistent error handling across all service classes, reducing approximately 40 lines of code duplication and ensuring uniform error logging and user messaging.

### Namespace

```php
pennebaker\searchwithelastic\traits\ErrorHandlingTrait
```

### Methods

#### handleException()

Handle exceptions consistently with proper logging and user messaging.

```php
protected function handleException(\Throwable $e, string $context, array $data = [], ?string $userMessage = null): void
```

**Parameters:**
- `$e` (\Throwable): The exception to handle
- `$context` (string): Context description for logging
- `$data` (array): Additional context data for logging
- `$userMessage` (?string): Optional user-friendly message

**Example:**
```php
try {
    // Some operation that may fail
    $result = $this->performOperation();
} catch (\Throwable $e) {
    $this->handleException($e, 'Element indexing', [
        'elementId' => $element->id,
        'siteId' => $element->siteId
    ], 'Failed to index element. Please try again.');
}
```

#### getLogLevel()

Get appropriate log level for exception type.

```php
protected function getLogLevel(\Throwable $e): string
```

**Parameters:**
- `$e` (\Throwable): The exception to analyze

**Returns:** `string` - Log level ('error', 'warning', 'info')

**Log Level Rules:**
- `error`: Elasticsearch exceptions, invalid config exceptions
- `warning`: Plugin-specific exceptions (when shouldLog is true)
- `info`: Plugin-specific exceptions (when shouldLog is false)
- `warning`: Default for other exceptions

#### getUserMessage()

Get user-friendly error message.

```php
protected function getUserMessage(\Throwable $e, string $defaultMessage = ''): string
```

**Parameters:**
- `$e` (\Throwable): The exception
- `$defaultMessage` (string): Default message if none provided

**Returns:** `string` - User-friendly error message

#### safeExecute()

Safe execution with error handling.

```php
protected function safeExecute(callable $callback, string $context, $defaultReturn = null, array $data = [])
```

**Parameters:**
- `$callback` (callable): The operation to execute safely
- `$context` (string): Context for error logging
- `$defaultReturn` (mixed): Value to return on error
- `$data` (array): Additional context data

**Returns:** `mixed` - Callback result or defaultReturn on error

**Example:**
```php
$result = $this->safeExecute(
    fn() => $this->elasticsearch->search($query),
    'Elasticsearch search',
    [],
    ['query' => $query, 'siteId' => $siteId]
);
```

### Usage Example

```php
use pennebaker\searchwithelastic\traits\ErrorHandlingTrait;

class MyService
{
    use ErrorHandlingTrait;
    
    public function indexElement(Element $element): bool
    {
        return $this->safeExecute(
            function() use ($element) {
                // Complex indexing logic
                $this->performIndexing($element);
                return true;
            },
            'Element indexing',
            false,
            [
                'elementId' => $element->id,
                'elementType' => get_class($element),
                'siteId' => $element->siteId
            ]
        );
    }
    
    private function performIndexing(Element $element): void
    {
        try {
            // Indexing operations
        } catch (\Throwable $e) {
            $this->handleException(
                $e,
                'Elasticsearch indexing operation', 
                ['elementId' => $element->id],
                'Failed to index element'
            );
            throw $e; // Re-throw if needed
        }
    }
}
```

## Implementation Guidelines

### Adding Traits to Classes

When adding traits to your classes:

```php
<?php

namespace pennebaker\searchwithelastic\queries;

use pennebaker\searchwithelastic\traits\FrontendFetchingTrait;
use pennebaker\searchwithelastic\traits\StatusFilteringTrait;

class IndexableEntryQuery extends IndexableElementQuery
{
    use FrontendFetchingTrait;
    use StatusFilteringTrait;
    
    // Class implementation
}
```

### Method Chaining

All trait methods that modify query state return `self` to support method chaining:

```php
$entries = IndexableEntryQuery::find()
    ->siteId(1)
    ->frontendFetch(true)
    ->liveOnly()
    ->limit(10)
    ->all();
```

### Error Handling Integration

Services should use the `ErrorHandlingTrait`:

```php
<?php

namespace pennebaker\searchwithelastic\services;

use pennebaker\searchwithelastic\traits\ErrorHandlingTrait;

class MyService extends Component
{
    use ErrorHandlingTrait;
    
    // Service implementation
}
```

## Performance Benefits

The traits provide several performance benefits:

1. **Reduced Memory Usage**: Less duplicated code means smaller memory footprint
2. **Consistent Behavior**: Uniform implementation across all classes
3. **Maintainability**: Changes need to be made in one place only
4. **Testing**: Single implementation to test and validate

## Best Practices

1. **Method Chaining**: Always return `self` from modifier methods
2. **Validation**: Validate input parameters before setting properties
3. **Documentation**: Document trait usage in implementing classes
4. **Backward Compatibility**: Maintain existing method signatures when adding traits
5. **Error Context**: Provide meaningful context when using `ErrorHandlingTrait`

## Migration Guide

### From Duplicated Code to Traits

If you have custom query classes or services with similar functionality:

1. **Identify Patterns**: Look for repeated code patterns
2. **Extract to Traits**: Move common functionality to traits
3. **Add Trait Usage**: Import and use traits in classes
4. **Remove Duplicated Code**: Delete the old duplicated methods
5. **Test Thoroughly**: Ensure behavior remains consistent

### Example Migration

Before (duplicated code):
```php
class CustomQuery extends IndexableElementQuery
{
    protected bool $frontendFetch = false;
    
    public function frontendFetch(bool $value = true): self
    {
        $this->frontendFetch = $value;
        return $this;
    }
    
    // ... more duplicated methods
}
```

After (using trait):
```php
class CustomQuery extends IndexableElementQuery
{
    use FrontendFetchingTrait;
    
    // Trait provides all the functionality
}
```