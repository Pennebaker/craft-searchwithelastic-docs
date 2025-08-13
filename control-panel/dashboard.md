# Control Panel Overview

The Search with Elastic plugin provides comprehensive control panel features for managing your Elasticsearch integration directly from the Craft CMS admin interface. This guide covers all available features and how to use them effectively.

## Plugin Settings Dashboard

Access plugin settings through **Settings → Plugins → Search with Elastic → Settings**.

### Connection Configuration

The main settings interface allows you to configure your Elasticsearch connection:

#### Elasticsearch Connection
- **Endpoint URL**: Enter your Elasticsearch server endpoint (e.g., `elasticsearch:9200`)
- **Authentication**: Toggle authentication and provide credentials if required
- **Environment Variables**: Use auto-suggest to reference environment variables for sensitive data

#### Visual Indicators
- **Override Alerts**: Configuration values overridden by config files display warning triangles
- **Live Preview**: Index names update in real-time as you type
- **Connection Status**: Visual feedback shows whether settings can be modified

### Index Configuration

Control how your indexes are named and organized:

#### Index Naming
- **Index Prefix**: Prepended to all index names (default: `craft-`)
- **Fallback Index Name**: Used when no element-specific override is set (default: `elements`)
- **Live Preview**: See generated index names like `craft-elements_1`

#### Element Type Overrides
Configure specific index names for different element types:
- **Entries**: Custom index name for entry elements
- **Assets**: Custom index name for asset elements  
- **Categories**: Custom index name for category elements
- **Commerce Products**: Custom index name for product elements (if Commerce is installed)
- **Digital Products**: Custom index name for digital product elements (if Digital Products is installed)

### Content Configuration

Fine-tune what content gets indexed and how:

#### Frontend Content Fetching
- **Enable Frontend Fetching**: Controls whether the plugin makes HTTP requests to element URLs
- **Index Elements Without URLs**: Determines if elements without URLs should be indexed with basic metadata

#### Element Type Filtering
Configure indexing behavior for each element type:

**Entry Types**
- View all entry types with their associated sections
- Toggle "Never Index" to exclude specific entry types
- Toggle "Skip Frontend Fetch" to index only basic metadata
- Filter by entry status (Pending, Live, Expired, Disabled)

**Asset Volumes**
- Configure indexing for each asset volume
- Control frontend fetching per volume
- Filter by asset kinds (Image, Video, Audio, Text, etc.)

**Category Groups**
- Set indexing preferences per category group
- Control frontend fetching behavior
- Filter by category status (Enabled, Disabled)

**Commerce Integration** (if installed)
- Configure product type indexing
- Set frontend fetching preferences
- Filter by product status

**Digital Products Integration** (if installed)
- Configure digital product type indexing
- Control content fetching behavior
- Filter by digital product status

## Element Sidebar Integration

When editing any element (entry, asset, category, etc.), the plugin adds an Elasticsearch status section to the sidebar.

### Status Information

The sidebar displays:
- **Index Status**: Current indexing state with color-coded indicators
  - Green (Enabled): Element is indexed and up-to-date
  - Yellow (Pending): Element has partial index or warnings
  - Red (Expired): Element is outdated and needs reindexing
  - Gray (Off): Element is not indexed
  - Gray (Disabled): Element type is disabled for indexing

- **Last Modified**: Timestamp of when Craft last modified the element
- **Revision Number**: Current element revision for tracking changes

### Quick Actions

Authorized users can perform actions directly from the sidebar:
- **Re-index**: Immediately reindex the current element
- **Delete**: Remove the element from all Elasticsearch indexes

#### Action Feedback
- Real-time status updates when actions complete
- Success/error notifications through Craft's notification system
- Automatic refresh of status information

## Navigation Features

### Utilities Access

The plugin adds a utility to Craft's Utilities section:
- **Location**: Utilities → Refresh Elasticsearch index
- **Badge Indicator**: Shows red badge when connection issues or sync problems exist
- **Quick Access**: Direct link from plugin settings to utilities

### Permissions Integration

The plugin respects Craft's permission system:
- `search-with-elastic:index-element`: Required for element indexing actions
- `utility:refresh-elasticsearch-index`: Required for bulk reindexing operations
- Permission checks apply to all control panel features

## Dashboard Status Indicators

### Connection Status
Visual indicators throughout the interface show:
- **Connected**: Green indicators when Elasticsearch is accessible
- **Disconnected**: Red warnings with troubleshooting links
- **Sync Status**: Warnings when indexes are out of sync with content

### Configuration Override Warnings
When settings are overridden by configuration files:
- Triangle warning icons appear next to affected fields
- Explanatory text describes which settings are overridden
- Fields become disabled to prevent conflicting changes

## Multi-Site Support

The control panel interface adapts to multi-site configurations:
- **Site Selection**: All operations can be filtered by specific sites
- **Site-Specific Indexes**: Each site maintains separate indexes with unique naming
- **Unified Management**: Bulk operations can span multiple sites simultaneously

## User Experience Features

### Real-Time Updates
- Form fields provide immediate feedback
- Index name previews update as you type
- Status indicators refresh automatically following actions

### Progressive Enhancement
- Interfaces work without JavaScript but enhance with better UX when available
- Graceful degradation for accessibility
- Keyboard navigation support throughout

### Error Handling
- Clear error messages with actionable guidance
- Non-blocking warnings that don't prevent usage
- Recovery suggestions for common configuration issues

## Best Practices

### Configuration Management
1. Use environment variables for sensitive connection details
2. Test connection changes in development prior to deploying
3. Monitor the utilities badge for ongoing connection issues
4. Review override warnings when configuration files change

### Content Management
1. Use bulk reindexing utilities for major content changes
2. Monitor element sidebar status when editing important content
3. Set up appropriate element type filtering to optimize performance
4. Regular check index synchronization status

### Performance Optimization
1. Disable indexing for unused element types
2. Configure appropriate frontend fetching settings
3. Use element type filtering to reduce index size
4. Monitor connection and indexing performance through the dashboard