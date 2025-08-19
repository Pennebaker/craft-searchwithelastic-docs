# Index Management Commands

The Search with Elastic plugin provides comprehensive CLI commands for managing Elasticsearch indexes. These commands allow you to reindex content, recreate indexes, and maintain your search infrastructure.

## Command Overview

| Command | Description | Use Case |
|---------|-------------|----------|
| `reindex-all` | Reindex all element types | Complete reindexing for configuration changes |
| `reindex-entries` | Reindex entries only | Update entry search data |
| `reindex-assets` | Reindex assets only | Update asset search data |
| `reindex-categories` | Reindex categories only | Update category search data |
| `reindex-products` | Reindex Commerce products | Update product search data |
| `reindex-digital-products` | Reindex digital products | Update digital product search data |
| `recreate-empty-indexes` | Recreate empty indexes | Reset index structure |

## Reindexing Modes

All reindexing commands support the `--mode` option to control which elements are indexed:

| Mode | Description | Use Case |
|------|-------------|----------|
| `reset` | Recreate indexes and reindex all elements (default) | Fresh start, mapping changes |
| `all` | Reindex all elements without recreating indexes | Full reindex preserving structure |
| `missing` | Index only elements not currently in the index | Add new content |
| `updated` | Index only elements that have been modified | Sync recent changes |
| `missing-updated` | Index missing and updated elements | Incremental update |

**Usage:**
```bash
# Default mode (reset)
php craft elasticsearch/reindex-all

# Specify mode explicitly
php craft elasticsearch/reindex-all --mode=updated

# Short syntax
php craft elasticsearch/reindex-entries -m missing
```

## Global Reindexing

### Reindex All Content

Reindexes all supported element types (entries, assets, categories, products, and digital products) across all sites.

```bash
php craft elasticsearch/reindex-all [--mode=<mode>]
```

**Example Output:**
```
Reindexing 1,247 everything (Mode: Reset & Index) ...
    - [1/1247] Reindexing Homepage (1) ... done
    - [2/1247] Reindexing About Us (2) ... done
    - [3/1247] Reindexing Product A (15) ... done
    ...
    - [1247/1247] Reindexing Category Z (892) ... done
Done reindexing everything.
```

**When to Use:**
- For initial plugin installation (use `reset`)
- For major configuration changes (use `reset`)
- For field mapping changes (use `reset`)
- For incremental updates (use `updated` or `missing-updated`)
- During site migrations (use `reset`)

::: tip Performance Considerations
Large sites may take considerable time to reindex. Use incremental modes (`updated`, `missing`, `missing-updated`) during maintenance windows to reduce processing time.
:::

## Element-Specific Reindexing

### Reindex Entries

Reindexes all entry elements across all sections and sites.

```bash
php craft elasticsearch/reindex-entries [--mode=<mode>]
```

**Example Output:**
```
Reindexing 453 entries ...
    - [1/453] Reindexing Homepage (1) ... done
    - [2/453] Reindexing About Us (2) ... done
    - [3/453] Reindexing News Article (25) ... warning: Missing meta description
    ...
    - [453/453] Reindexing Blog Post (892) ... done
Done reindexing entries (1 warning).
```

**When to Use:**
- For entry field configuration changes
- When entry templates change
- For bulk entry modifications
- When troubleshooting entry search issues

### Reindex Assets

Reindexes all asset elements across all volumes and sites.

```bash
php craft elasticsearch/reindex-assets [--mode=<mode>]
```

**Example Output:**
```
Reindexing 1,124 assets ...
    - [1/1124] Reindexing logo.png (45) ... done
    - [2/1124] Reindexing hero-image.jpg (46) ... done
    - [3/1124] Reindexing document.pdf (47) ... skipped: File not accessible
    ...
    - [1124/1124] Reindexing video.mp4 (1200) ... done
Done reindexing assets (1 skipped).
```

**When to Use:**
- For asset field configuration changes
- When asset transforms change
- For bulk asset uploads
- When troubleshooting asset search issues

### Reindex Categories

Reindexes all category elements across all category groups and sites.

```bash
php craft elasticsearch/reindex-categories [--mode=<mode>]
```

**Example Output:**
```
Reindexing 89 categories ...
    - [1/89] Reindexing Technology (12) ... done
    - [2/89] Reindexing Web Development (13) ... done
    - [3/89] Reindexing Design (14) ... done
    ...
    - [89/89] Reindexing Marketing (156) ... done
Done reindexing categories.
```

**When to Use:**
- For category field configuration changes
- When category structures change
- For bulk category modifications
- When troubleshooting category search issues

### Reindex Commerce Products

Reindexes all Craft Commerce product elements across all product types and sites.

```bash
php craft elasticsearch/reindex-products [--mode=<mode>]
```

**Example Output:**
```
Reindexing 245 products ...
    - [1/245] Reindexing Laptop Pro (78) ... done
    - [2/245] Reindexing Wireless Mouse (79) ... done
    - [3/245] Reindexing Monitor Stand (80) ... warning: Missing price data
    ...
    - [245/245] Reindexing USB Cable (322) ... done
Done reindexing products (1 warning).
```

**When to Use:**
- For product field configuration changes
- When product pricing changes
- For inventory modifications
- When troubleshooting product search issues

::: warning Commerce Plugin Required
This command requires Craft Commerce to be installed and enabled.
:::

### Reindex Digital Products

Reindexes all digital product elements across all sites.

```bash
php craft elasticsearch/reindex-digital-products [--mode=<mode>]
```

**Example Output:**
```
Reindexing 67 digitalProducts ...
    - [1/67] Reindexing eBook Guide (156) ... done
    - [2/67] Reindexing Video Course (157) ... done
    - [3/67] Reindexing Software License (158) ... done
    ...
    - [67/67] Reindexing Template Pack (223) ... done
Done reindexing digitalProducts.
```

**When to Use:**
- For digital product configuration changes
- When digital product content changes
- For licensing modifications
- When troubleshooting digital product search issues

::: warning Digital Products Plugin Required
This command requires a digital products plugin to be installed and enabled.
:::

## Index Structure Management

### Recreate Empty Indexes

Removes existing indexes and creates fresh empty ones for all configured sites. This completely resets the index structure without any content.

```bash
php craft elasticsearch/recreate-empty-indexes
```

**Example Output:**
```
Recreating indexes for all sites...
✓ Deleted existing index: craft_site_1_searchwithelastic
✓ Created index: craft_site_1_searchwithelastic
✓ Deleted existing index: craft_site_2_searchwithelastic
✓ Created index: craft_site_2_searchwithelastic
Done recreating empty indexes.
```

**When to Use:**
- For major mapping changes
- When index corruption occurs
- During development environment setup
- When changing index configuration
- To fix mapping conflicts

::: danger Data Loss Warning
This command permanently deletes all indexed content. You'll need to run reindexing commands afterward to restore search functionality.
:::

## Common Workflows

### Complete Site Reindex
```bash
# Option 1: Use reset mode (default)
php craft elasticsearch/reindex-all

# Option 2: Manual recreation then index
php craft elasticsearch/recreate-empty-indexes
php craft elasticsearch/reindex-all --mode=all
```

### Selective Content Update
```bash
# Update only modified entries
php craft elasticsearch/reindex-entries --mode=updated

# Index missing products
php craft elasticsearch/reindex-products --mode=missing

# Update both missing and modified assets
php craft elasticsearch/reindex-assets --mode=missing-updated
```

### Development Environment Setup
```bash
# Test connection first
php craft elasticsearch/test-connection

# Set up fresh indexes
php craft elasticsearch/recreate-empty-indexes

# Index existing content
php craft elasticsearch/reindex-all
```

## Error Handling

All reindexing commands provide detailed progress output and error reporting:

- **Success**: Element indexed successfully
- **Warning**: Element indexed with issues (missing data, etc.)
- **Skipped**: Element not indexed (disabled, no URL, etc.)
- **Error**: Element failed to index

**Example with Mixed Results:**
```
Reindexing 100 entries ...
    - [1/100] Reindexing Homepage (1) ... done
    - [2/100] Reindexing Draft Article (2) ... skipped: Draft not enabled for search
    - [3/100] Reindexing Broken Entry (3) ... error: Invalid field configuration
    - [4/100] Reindexing News Item (4) ... warning: Missing meta description
    ...
Done reindexing entries (1 error, 2 warnings, 1 skipped).
```

::: tip Monitoring Progress
For large reindexing operations, monitor the output for patterns in errors or warnings that might indicate configuration issues.
:::