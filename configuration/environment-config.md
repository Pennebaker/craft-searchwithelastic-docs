# Environment configuration

Configure the plugin differently for development, staging, and production environments. This guide covers environment-specific settings, security considerations, and deployment best practices.

## Multi-environment setup

Use Craft's multi-environment configuration to apply different settings based on your environment.

### Environment-based configuration

:::code-group

```php [config/search-with-elastic.php]
<?php

return [
    // Default settings for all environments
    'indexPrefix' => 'craft-',
    'fallbackIndexName' => 'elements',
    'enableFrontendFetching' => true,
    'indexElementsWithoutUrls' => true,
    
    // Environment-specific overrides
    'dev' => [
        'elasticsearchEndpoint' => 'localhost:9200',
        'isAuthEnabled' => false,
        'indexableEntryStatuses' => ['pending', 'live', 'disabled'], // Include all for testing
        'assetKinds' => ['pdf', 'text', 'html'], // Limited for faster indexing
    ],
    
    'staging' => [
        'elasticsearchEndpoint' => '$ELASTICSEARCH_ENDPOINT',
        'isAuthEnabled' => true,
        'username' => '$ELASTICSEARCH_USERNAME',
        'password' => '$ELASTICSEARCH_PASSWORD',
        'indexPrefix' => 'staging-',
        'indexableEntryStatuses' => ['pending', 'live'],
    ],
    
    'production' => [
        'elasticsearchEndpoint' => '$ELASTICSEARCH_ENDPOINT',
        'isAuthEnabled' => true,
        'username' => '$ELASTICSEARCH_USERNAME',
        'password' => '$ELASTICSEARCH_PASSWORD',
        'indexPrefix' => 'prod-',
        'indexableEntryStatuses' => ['live'], // Only live content in production
        'assetKinds' => ['pdf', 'text', 'html', 'json', 'xml', 'word', 'excel'],
    ],
];
```

```bash [.env.dev]
# Development environment
CRAFT_ENVIRONMENT=dev
ELASTICSEARCH_ENDPOINT=localhost:9200
ELASTICSEARCH_AUTH_ENABLED=false
```

```bash [.env.staging]
# Staging environment  
CRAFT_ENVIRONMENT=staging
ELASTICSEARCH_ENDPOINT=https://staging-elasticsearch.example.com:9200
ELASTICSEARCH_AUTH_ENABLED=true
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=staging_password_here
```

```bash [.env.production]
# Production environment
CRAFT_ENVIRONMENT=production
ELASTICSEARCH_ENDPOINT=https://elasticsearch.example.com:9200
ELASTICSEARCH_AUTH_ENABLED=true
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=secure_production_password_here
```

:::

## Environment variables

Use environment variables for sensitive and environment-specific settings.

### Connection variables

```bash
# Elasticsearch connection
ELASTICSEARCH_ENDPOINT=elasticsearch:9200
ELASTICSEARCH_AUTH_ENABLED=true
ELASTICSEARCH_USERNAME=elastic  
ELASTICSEARCH_PASSWORD=your_secure_password

# Index naming
ELASTICSEARCH_INDEX_PREFIX=mysite-
ELASTICSEARCH_FALLBACK_INDEX=elements

# Feature toggles
ELASTICSEARCH_FRONTEND_FETCHING=true
ELASTICSEARCH_INDEX_WITHOUT_URLS=true
```

### Using variables in configuration

```php
return [
    'elasticsearchEndpoint' => getenv('ELASTICSEARCH_ENDPOINT') ?: 'localhost:9200',
    'isAuthEnabled' => filter_var(getenv('ELASTICSEARCH_AUTH_ENABLED'), FILTER_VALIDATE_BOOLEAN),
    'username' => getenv('ELASTICSEARCH_USERNAME') ?: '',
    'password' => getenv('ELASTICSEARCH_PASSWORD') ?: '',
    'indexPrefix' => getenv('ELASTICSEARCH_INDEX_PREFIX') ?: 'craft-',
    'fallbackIndexName' => getenv('ELASTICSEARCH_FALLBACK_INDEX') ?: 'elements',
    'enableFrontendFetching' => filter_var(getenv('ELASTICSEARCH_FRONTEND_FETCHING') ?: 'true', FILTER_VALIDATE_BOOLEAN),
    'indexElementsWithoutUrls' => filter_var(getenv('ELASTICSEARCH_INDEX_WITHOUT_URLS') ?: 'true', FILTER_VALIDATE_BOOLEAN),
];
```

## Development environment

Optimize settings for local development and testing.

### Development-friendly settings

```php
'dev' => [
    // Fast local connection
    'elasticsearchEndpoint' => 'localhost:9200',
    'isAuthEnabled' => false,
    
    // Include all content for testing
    'indexableEntryStatuses' => ['pending', 'live', 'expired', 'disabled'],
    'indexableCategoryStatuses' => ['enabled', 'disabled'],
    
    // Limited asset types for faster indexing
    'assetKinds' => ['pdf', 'text'],
    
    // Helpful for debugging
    'indexElementsWithoutUrls' => true,
    'enableFrontendFetching' => true,
    
    // Simple highlighting for testing
    'highlight' => [
        'pre_tags' => '<mark>',
        'post_tags' => '</mark>',
    ],
],
```

### Development Docker setup

```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_dev_data:/usr/share/elasticsearch/data

  kibana:
    image: kibana:8.11.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_dev_data:
```

## Staging environment

Configure staging to mirror production while allowing testing.

### Staging configuration

```php
'staging' => [
    // Secure connection
    'elasticsearchEndpoint' => '$ELASTICSEARCH_ENDPOINT',
    'isAuthEnabled' => true,
    'username' => '$ELASTICSEARCH_USERNAME',
    'password' => '$ELASTICSEARCH_PASSWORD',
    
    // Staging-specific index prefix
    'indexPrefix' => 'staging-',
    
    // Include pending content for preview testing
    'indexableEntryStatuses' => ['pending', 'live'],
    'indexableProductStatuses' => ['pending', 'live'],
    
    // Full asset indexing like production
    'assetKinds' => ['pdf', 'text', 'html', 'json', 'xml', 'word', 'excel'],
    
    // Enable all features for testing
    'enableFrontendFetching' => true,
    'indexElementsWithoutUrls' => true,
    
    // Production-like exclusions
    'excludedEntryTypes' => ['internalPages', 'adminNotes'],
    'excludedAssetVolumes' => ['privateFiles'],
],
```

### Staging security

```bash
# Use strong passwords even for staging
ELASTICSEARCH_PASSWORD=complex_staging_password_123!

# Consider IP restrictions for staging Elasticsearch
# In your Elasticsearch config or firewall rules
```

## Production environment

Production configuration focuses on security, performance, and reliability.

### Production security settings

```php
'production' => [
    // Secure HTTPS connection
    'elasticsearchEndpoint' => '$ELASTICSEARCH_ENDPOINT',
    'isAuthEnabled' => true,
    'username' => '$ELASTICSEARCH_USERNAME', 
    'password' => '$ELASTICSEARCH_PASSWORD',
    
    // Production index prefix
    'indexPrefix' => 'prod-',
    
    // Only live content in production
    'indexableEntryStatuses' => ['live'],
    'indexableProductStatuses' => ['live'], 
    'indexableDigitalProductStatuses' => ['live'],
    'indexableCategoryStatuses' => ['enabled'],
    
    // Comprehensive asset indexing
    'assetKinds' => ['pdf', 'text', 'html', 'json', 'xml', 'word', 'excel', 'powerpoint'],
    
    // Enable frontend fetching for rich content
    'enableFrontendFetching' => true,
    'indexElementsWithoutUrls' => false, // Skip elements without URLs
    
    // Exclude sensitive content
    'excludedEntryTypes' => ['internalPages', 'adminNotes', 'drafts'],
    'excludedAssetVolumes' => ['privateFiles', 'adminAssets', 'internalDocs'],
    'excludedCategoryGroups' => ['internalCategories', 'adminOnly'],
    
    // Exclude from frontend fetching for security
    'excludedFrontendFetchingEntryTypes' => ['memberContent', 'restricted'],
    'excludedFrontendFetchingAssetVolumes' => ['privateFiles'],
],
```

### Production Elasticsearch cluster

For high availability and performance, use a clustered setup:

```php
// Advanced cluster configuration
'elasticsearchComponentConfig' => [
    'autodetectCluster' => false,
    'defaultProtocol' => 'https',
    
    'nodes' => [
        [
            'protocol' => 'https',
            'http_address' => 'es-node-1.example.com:9200',
        ],
        [
            'protocol' => 'https', 
            'http_address' => 'es-node-2.example.com:9200',
        ],
        [
            'protocol' => 'https',
            'http_address' => 'es-node-3.example.com:9200', 
        ],
    ],
    
    'auth' => [
        'username' => getenv('ELASTICSEARCH_USERNAME'),
        'password' => getenv('ELASTICSEARCH_PASSWORD'),
    ],
    
    'connectionTimeout' => 10,
    'dataTimeout' => 30,
    
    // SSL verification
    'sslVerification' => true,
],
```

## Security best practices

### Environment variable security

::: danger Password security
Never commit passwords or API keys to version control. Use secure environment variable management.
:::

```bash
# Use strong, unique passwords
ELASTICSEARCH_PASSWORD=$(openssl rand -base64 32)

# Consider using secrets management
# AWS Secrets Manager, HashiCorp Vault, etc.
```

### Network security

```yaml
# Production docker-compose with network restrictions
version: '3.8'
services:
  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - cluster.name=production-cluster
      - node.name=es-node-1
      - bootstrap.memory_lock=true
      - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
      - xpack.security.enabled=true
      - ELASTIC_PASSWORD=${ELASTICSEARCH_PASSWORD}
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - elasticsearch_network
    # Don't expose ports to host in production
    # ports:
    #   - "9200:9200"

networks:
  elasticsearch_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Content security

```php
// Exclude sensitive content from indexing
'excludedEntryTypes' => [
    'privatePages',
    'memberOnlyContent', 
    'adminNotes',
    'internalDocuments',
    'customerData',
],

'excludedAssetVolumes' => [
    'privateFiles',
    'customerUploads',
    'adminDocuments', 
    'sensitiveData',
],

// Disable frontend fetching for secure content
'excludedFrontendFetchingEntryTypes' => [
    'memberContent',
    'restrictedPages',
    'passwordProtected',
],
```

## Performance optimization

### Production performance settings

```php
'production' => [
    // Optimize for performance
    'enableFrontendFetching' => true,
    'indexElementsWithoutUrls' => false, // Skip unnecessary indexing
    
    // Selective asset indexing for performance
    'assetKinds' => ['pdf', 'text', 'html', 'json'], // Exclude large formats if not needed
    
    // Optimize frontend fetching
    'frontendFetchingAssetKinds' => ['text', 'html', 'json'], // Only text-based assets
],
```

### Memory and timeout settings

For large sites, consider Elasticsearch component timeouts:

```php
'elasticsearchComponentConfig' => [
    'connectionTimeout' => 30,  // Increased for large operations
    'dataTimeout' => 60,        // Increased for bulk indexing
    
    // Connection pooling
    'maxConnections' => 10,
    'keepAlive' => true,
],
```

## Monitoring and logging

### Production monitoring

```php
// Enable detailed logging in production
'production' => [
    // ... other settings
    
    // Log search queries for analytics
    'logQueries' => true,
    'logIndexing' => true,
    
    // Monitor performance
    'enableMetrics' => true,
],
```

### Health checks

Monitor Elasticsearch health in production:

```bash
#!/bin/bash
# health-check.sh
curl -s "http://elasticsearch:9200/_cluster/health?pretty" | jq '.status'

# Should return "green" for healthy cluster
```

## Deployment considerations

### Zero-downtime deployments

1. **Use separate indexes per environment**: Different prefixes prevent conflicts
2. **Index aliasing**: Use Elasticsearch aliases for seamless index updates  
3. **Gradual rollouts**: Test configuration changes in staging first

### Backup and recovery

```bash
# Backup Elasticsearch indexes
curl -X POST "localhost:9200/_snapshot/backup_repository/snapshot_1?wait_for_completion=true"

# Restore from backup
curl -X POST "localhost:9200/_snapshot/backup_repository/snapshot_1/_restore"
```

### Configuration validation

Test configuration before deployment:

```php
// Add to your deployment script
$settings = new \pennebaker\searchwithelastic\models\SettingsModel($config);
if (!$settings->validate()) {
    throw new Exception('Invalid Elasticsearch configuration: ' . json_encode($settings->getErrors()));
}
```