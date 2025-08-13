---
title: System Requirements
description: System requirements and compatibility information for Search with Elastic
---

# System Requirements

## Core Requirements

### Craft CMS
- **Version:** Craft CMS 4.x

### PHP
- **Version:** PHP 8.x

### Elasticsearch
- **Version:** Elasticsearch 7.x or 8.x must be available and accessible

## Optional Dependencies

### Craft Commerce (Optional)
If you want to index Commerce products:
- **Minimum version:** Craft Commerce 4.0
- **Compatibility:** All Commerce 4.x versions supported

### Digital Products (Optional) 
If you want to index digital products:
- **Minimum version:** Digital Products 3.0
- **Compatibility:** All Digital Products 3.x versions supported

## Testing Your Connection

Once you have Elasticsearch available, you can verify connectivity through the plugin:

### Via Control Panel
1. Go to **Settings → Plugins → Search with Elastic → Settings**
2. Enter your Elasticsearch endpoint
3. Click **Test Connection**

### Via CLI
```bash
php craft search-with-elastic/elasticsearch/test-connection
```

## Authentication Support
- HTTP Basic Authentication
- API Key authentication
- Custom headers (via component configuration)
- SSL/TLS encryption supported

## Next Steps

Once you've verified your environment meets these requirements:

1. **[Install the plugin](/getting-started/installation)** - Complete installation guide
2. **[Quick start setup](/getting-started/quick-start)** - Configuration guide
3. **Test your connection** - Verify Elasticsearch connectivity
