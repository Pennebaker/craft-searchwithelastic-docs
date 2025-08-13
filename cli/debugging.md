# Debugging and Diagnostic Commands

The Search with Elastic plugin provides essential debugging tools to help diagnose connection issues, validate configurations, and troubleshoot search functionality problems.

## Overview

Debugging Elasticsearch integration involves testing connections, validating configurations, and analyzing indexing results. The CLI commands provide detailed diagnostic information to help identify and resolve issues.

## Connection Testing

### Test Elasticsearch Connection

The primary diagnostic command tests connectivity to your Elasticsearch instance using the plugin's current configuration.

```bash
php craft elasticsearch/test-connection
```

**Successful Connection Output:**
```
Testing Elasticsearch connection...
✓ Successfully connected to http://localhost:9200
```

**Failed Connection Output:**
```
Testing Elasticsearch connection...
✗ Failed to connect to http://localhost:9200
```

**Exit Codes:**
- `0`: Connection successful
- `1`: Connection failed

### Connection Troubleshooting

#### Common Connection Issues

**Issue 1: Connection Refused**
```bash
php craft elasticsearch/test-connection
```
```
Testing Elasticsearch connection...
✗ Failed to connect to http://localhost:9200
```

**Diagnosis Steps:**
```bash
# Check if Elasticsearch is running
curl -X GET "localhost:9200"

# Check service status (Linux/macOS)
systemctl status elasticsearch

# Check service status (Windows)
sc query elasticsearch
```

**Issue 2: Authentication Errors**
```bash
php craft elasticsearch/test-connection
```
```
Testing Elasticsearch connection...
✗ Failed to connect to https://elastic:password@my-cluster.elasticsearch.com:9200
```

**Diagnosis Steps:**
```bash
# Test authentication directly
curl -u elastic:password -X GET "https://my-cluster.elasticsearch.com:9200"

# Verify credentials in plugin settings
php craft project-config/get plugins.searchwithelastic.settings
```

**Issue 3: SSL/TLS Issues**
```bash
php craft elasticsearch/test-connection
```
```
Testing Elasticsearch connection...
✗ Failed to connect to https://secure-cluster.com:9200
```

**Diagnosis Steps:**
```bash
# Test SSL connection
curl -k -X GET "https://secure-cluster.com:9200"

# Check certificate validity
openssl s_client -connect secure-cluster.com:9200 -servername secure-cluster.com
```

## Diagnostic Workflows

### Complete System Diagnostic

Create a comprehensive diagnostic script to check all aspects of your Elasticsearch integration:

```bash
#!/bin/bash
# elasticsearch-diagnostics.sh
# Complete diagnostic workflow

echo "=== Elasticsearch Diagnostics ==="
echo "Date: $(date)"
echo

# 1. Test plugin connection
echo "1. Testing plugin connection..."
php craft elasticsearch/test-connection
echo

# 2. Check Elasticsearch directly
echo "2. Testing direct Elasticsearch connection..."
curl -X GET "localhost:9200" 2>/dev/null | jq . || echo "Direct connection failed or jq not available"
echo

# 3. Check cluster health
echo "3. Checking cluster health..."
curl -X GET "localhost:9200/_cluster/health?pretty" 2>/dev/null || echo "Cluster health check failed"
echo

# 4. List current indexes
echo "4. Listing current indexes..."
curl -X GET "localhost:9200/_cat/indices?v" 2>/dev/null || echo "Index listing failed"
echo

# 5. Check plugin configuration
echo "5. Checking plugin configuration..."
php craft project-config/get plugins.searchwithelastic.settings | head -20
echo

echo "=== Diagnostics Complete ==="
```

### Environment-Specific Diagnostics

#### Development Environment
```bash
# Development diagnostic checklist
echo "Development Environment Diagnostics"

# Test connection
php craft elasticsearch/test-connection

# Check if indexes exist
curl -X GET "localhost:9200/_cat/indices?v&s=index"

# Verify sample data
curl -X GET "localhost:9200/craft_*/_search?size=1&pretty"
```

#### Production Environment
```bash
#!/bin/bash
# production-diagnostics.sh
# Production-safe diagnostics

LOG_FILE="/var/log/elasticsearch/diagnostics-$(date +%Y%m%d_%H%M%S).log"

{
    echo "=== Production Elasticsearch Diagnostics ==="
    echo "Date: $(date)"
    echo "Server: $(hostname)"
    echo
    
    # Test connection (safe)
    echo "Testing connection..."
    php craft elasticsearch/test-connection
    
    # Check cluster health (safe)
    echo "Cluster health:"
    curl -s -X GET "localhost:9200/_cluster/health?pretty"
    
    # Check index statistics (safe)
    echo "Index statistics:"
    curl -s -X GET "localhost:9200/_cat/indices?v&h=index,docs.count,store.size"
    
} >> $LOG_FILE 2>&1

echo "Production diagnostics completed. Log: $LOG_FILE"
```

## Index Diagnostics

### Verify Index Structure

Check if indexes are created correctly with proper mappings:

```bash
# List all Craft-related indexes
curl -X GET "localhost:9200/_cat/indices?v" | grep craft

# Check specific index mapping
curl -X GET "localhost:9200/craft_site_1_searchwithelastic/_mapping?pretty"

# Check index settings
curl -X GET "localhost:9200/craft_site_1_searchwithelastic/_settings?pretty"
```

### Sample Index Content

Verify that content is being indexed correctly:

```bash
# Get sample documents from index
curl -X GET "localhost:9200/craft_site_1_searchwithelastic/_search?size=5&pretty"

# Search for specific content
curl -X GET "localhost:9200/craft_site_1_searchwithelastic/_search?q=homepage&pretty"

# Check document count
curl -X GET "localhost:9200/craft_site_1_searchwithelastic/_count?pretty"
```

## Reindexing Diagnostics

### Analyze Reindexing Results

The reindexing commands provide detailed output that can help diagnose issues:

```bash
# Run reindexing with detailed output
php craft elasticsearch/reindex-entries 2>&1 | tee reindex-debug.log

# Analyze the log for patterns
grep -E "(error|warning|skipped)" reindex-debug.log
```

**Sample Diagnostic Output Analysis:**
```
Reindexing 100 entries ...
    - [1/100] Reindexing Homepage (1) ... done
    - [2/100] Reindexing About (2) ... warning: Missing meta description
    - [3/100] Reindexing Draft (3) ... skipped: Draft not enabled
    - [4/100] Reindexing Broken (4) ... error: Field mapping conflict
Done reindexing entries (1 error, 1 warning, 1 skipped).
```

### Common Reindexing Issues

#### Field Mapping Conflicts
```bash
# Error: Field mapping conflict
php craft elasticsearch/reindex-entries
```
```
error: Field mapping conflict - title field cannot be both text and keyword
```

**Resolution:**
```bash
# Recreate indexes to fix mapping conflicts
php craft elasticsearch/recreate-empty-indexes
php craft elasticsearch/reindex-entries
```

#### Memory Issues
```bash
# Error: Memory exhaustion
php craft elasticsearch/reindex-all
```
```
Fatal error: Allowed memory size exhausted
```

**Resolution:**
```bash
# Increase memory limit
php -d memory_limit=2G craft elasticsearch/reindex-all

# Or reindex in smaller batches
php craft elasticsearch/reindex-entries
php craft elasticsearch/reindex-assets
```

#### Connection Timeouts
```bash
# Error: Connection timeout during reindexing
php craft elasticsearch/reindex-all
```
```
error: cURL timeout after 30 seconds
```

**Resolution:**
```bash
# Check Elasticsearch performance
curl -X GET "localhost:9200/_cluster/stats?pretty"

# Monitor during reindexing
watch -n 5 'curl -s "localhost:9200/_cluster/health?pretty"'
```

## Performance Diagnostics

### Monitor Reindexing Performance

Track reindexing performance and identify bottlenecks:

```bash
#!/bin/bash
# performance-diagnostics.sh
# Monitor reindexing performance

LOG_FILE="reindex-performance-$(date +%Y%m%d_%H%M%S).log"

{
    echo "=== Reindexing Performance Diagnostics ==="
    echo "Start time: $(date)"
    echo
    
    # Record system resources before
    echo "System resources before reindexing:"
    free -h
    df -h
    echo
    
    # Start timing
    START_TIME=$(date +%s)
    
    # Run reindexing
    php craft elasticsearch/reindex-entries
    
    # Calculate duration
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    echo
    echo "Reindexing completed in $DURATION seconds"
    echo "End time: $(date)"
    
    # Record system resources after
    echo "System resources after reindexing:"
    free -h
    df -h
    
} >> $LOG_FILE 2>&1

echo "Performance diagnostics completed. Log: $LOG_FILE"
```

### Elasticsearch Performance Metrics

Monitor Elasticsearch performance during operations:

```bash
# Monitor cluster performance
curl -X GET "localhost:9200/_cluster/stats?pretty" | jq '.indices.indexing'

# Monitor index performance
curl -X GET "localhost:9200/_stats/indexing?pretty"

# Monitor memory usage
curl -X GET "localhost:9200/_cluster/stats?pretty" | jq '.nodes.jvm.mem'
```

## Troubleshooting Playbook

### Issue: No Search Results

**Step 1: Verify Connection**
```bash
php craft elasticsearch/test-connection
```

**Step 2: Check Index Content**
```bash
curl -X GET "localhost:9200/craft_*/_count?pretty"
```

**Step 3: Test Direct Search**
```bash
curl -X GET "localhost:9200/craft_*/_search?q=*&size=1&pretty"
```

**Step 4: Reindex if Empty**
```bash
php craft elasticsearch/reindex-all
```

### Issue: Slow Search Performance

**Step 1: Check Cluster Health**
```bash
curl -X GET "localhost:9200/_cluster/health?pretty"
```

**Step 2: Monitor Query Performance**
```bash
curl -X GET "localhost:9200/_cat/indices?v&s=store.size:desc"
```

**Step 3: Analyze Slow Queries**
```bash
curl -X GET "localhost:9200/_cluster/settings?pretty" | grep -A 5 slowlog
```

### Issue: Inconsistent Search Results

**Step 1: Check Index Synchronization**
```bash
# Compare database count vs index count
php craft elasticsearch/reindex-entries --dry-run  # If available
curl -X GET "localhost:9200/craft_*/_count?pretty"
```

**Step 2: Force Reindexing**
```bash
php craft elasticsearch/recreate-empty-indexes
php craft elasticsearch/reindex-all
```

## Logging and Monitoring

### Enable Debug Logging

Add debug logging to your Craft configuration:

```php
// config/app.php
return [
    'components' => [
        'log' => [
            'targets' => [
                [
                    'class' => craft\log\FileTarget::class,
                    'logFile' => '@storage/logs/elasticsearch.log',
                    'categories' => ['pennebaker\searchwithelastic\*'],
                    'logVars' => [],
                ]
            ]
        ]
    ]
];
```

### Monitor Log Files

```bash
# Monitor Elasticsearch plugin logs
tail -f storage/logs/elasticsearch.log

# Monitor Elasticsearch service logs
journalctl -u elasticsearch -f

# Search for specific errors
grep -i "exception\|error" storage/logs/elasticsearch.log
```

## Advanced Diagnostics

### Custom Diagnostic Script

Create a comprehensive diagnostic script for your specific environment:

```bash
#!/bin/bash
# custom-elasticsearch-diagnostics.sh
# Environment-specific diagnostics

CONFIG_FILE="craft-elasticsearch-diagnostics.conf"
LOG_FILE="elasticsearch-diagnostics-$(date +%Y%m%d_%H%M%S).log"

# Source configuration if available
[ -f "$CONFIG_FILE" ] && source "$CONFIG_FILE"

# Set defaults
CRAFT_PATH=${CRAFT_PATH:-"/var/www/html"}
ES_HOST=${ES_HOST:-"localhost:9200"}

{
    echo "=== Custom Elasticsearch Diagnostics ==="
    echo "Date: $(date)"
    echo "Craft Path: $CRAFT_PATH"
    echo "Elasticsearch Host: $ES_HOST"
    echo
    
    # Plugin connection test
    echo "1. Plugin Connection Test:"
    cd "$CRAFT_PATH" && php craft elasticsearch/test-connection
    echo
    
    # Direct connection test
    echo "2. Direct Connection Test:"
    curl -s -X GET "$ES_HOST" | head -10
    echo
    
    # Index health check
    echo "3. Index Health:"
    curl -s -X GET "$ES_HOST/_cat/indices?v" | grep craft
    echo
    
    # Sample content check
    echo "4. Sample Content:"
    curl -s -X GET "$ES_HOST/craft_*/_search?size=1" | jq -r '.hits.total.value // .hits.total'
    echo
    
} 2>&1 | tee "$LOG_FILE"

echo "Custom diagnostics completed. Log saved to: $LOG_FILE"
```

::: tip Diagnostic Best Practices
- Run diagnostics before and after major changes
- Keep diagnostic logs for troubleshooting history
- Create environment-specific diagnostic procedures
- Automate routine diagnostic checks
:::

::: warning Security Considerations
Avoid logging sensitive information like passwords or API keys in diagnostic outputs. Use secure methods for credential testing.
:::