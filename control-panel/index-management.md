# Index Management

The Search with Elastic plugin provides index management capabilities through the Craft CMS control panel. This guide covers managing your Elasticsearch indexes through the web interface.

## Overview of Index Management

Index management in the control panel allows you to:
- Monitor index health and synchronization status
- Perform bulk reindexing operations with granular control
- Manage individual element indexing from edit screens
- Configure index naming and organization
- Troubleshoot indexing issues with detailed feedback

## Bulk Index Operations

### Accessing the Reindex Utility

Navigate to **Utilities → Refresh Elasticsearch index** to access the main index management interface.

#### Prerequisites Check
The utility first validates:
- **Connection Status**: Verifies Elasticsearch server connectivity
- **Index Synchronization**: Checks if indexes are in sync with Craft content
- **Permission Verification**: Ensures user has `utility:refresh-elasticsearch-index` permission

### Site and Element Type Selection

The interface provides hierarchical selection of content to reindex:

#### Site Selection
- **Site Checkboxes**: Toggle entire sites on/off for reindexing
- **Indeterminate State**: Site checkboxes show partial selection when some element types are selected
- **Site Overview**: Shows total element count per site

#### Element Type Selection
Each site displays available element types with:
- **Element Counts**: Live count of indexable elements per type
- **Index Names**: Shows the actual Elasticsearch index name for each type
- **Hierarchical Control**: Selecting a site toggles all its element types

#### Bulk Actions
- **Select All**: Checks all element types across all sites
- **Deselect All**: Unchecks all selections
- **Smart Selection**: Site checkboxes automatically update based on element type selections

### Reindex Modes

Choose from five different reindexing approaches:

#### Reset & Index (Default)
- **Purpose**: Complete index recreation for selected content
- **Process**: Deletes existing indexes, then reindexes all selected elements
- **Use Case**: Major configuration changes, corruption recovery, fresh start
- **Impact**: Temporary search unavailability during recreation

#### All
- **Purpose**: Reindex all selected elements without clearing indexes first
- **Process**: Overwrites existing documents, adds additional ones
- **Use Case**: Regular maintenance, ensuring all content is current
- **Impact**: Maintains search availability throughout process

#### Missing & Updated
- **Purpose**: Index missing elements and reindex modified elements
- **Process**: Checks each element's status and indexes accordingly
- **Use Case**: Incremental updates after bulk content changes
- **Impact**: Efficient processing, minimal redundant work

#### Missing
- **Purpose**: Index only elements not currently in Elasticsearch
- **Process**: Compares Craft content with Elasticsearch records
- **Use Case**: Adding content without touching existing indexes
- **Impact**: Fastest option for new content addition

#### Updated  
- **Purpose**: Reindex only elements that have changed since last indexing
- **Process**: Compares element modification dates with index timestamps
- **Use Case**: Regular synchronization of modified content
- **Impact**: Efficient for ongoing maintenance

### Progress Tracking

During reindexing operations, the interface provides comprehensive progress information:

#### Real-Time Status
- **Progress Bar**: Visual indicator of completion percentage
- **Element Counter**: Shows current/total elements processed
- **Processing Speed**: Elements processed per second
- **ETA Calculation**: Estimated time to completion

#### Operation Details
- **Current Element**: Shows which element is being processed
- **Success Count**: Number of successfully indexed elements
- **Skip Count**: Elements skipped (disabled types, no URLs, etc.)
- **Error Count**: Failed indexing attempts with detailed logging

#### Error Reporting
- **Error Summary**: Categorized list of indexing failures
- **Element Details**: Specific elements that failed with reasons
- **Recovery Suggestions**: Actionable advice for resolving issues
- **Log References**: Links to detailed error logs for troubleshooting

## Individual Element Management

### Element Edit Sidebar

When editing any element, the plugin adds an Elasticsearch section to the sidebar providing:

#### Status Display
- **Current Status**: Color-coded indicator showing index state
  - **Indexed** (Green): Element is properly indexed and current
  - **Partial Index** (Yellow): Element indexed with warnings or missing content
  - **Outdated** (Red): Element needs reindexing due to changes
  - **Not Indexed** (Gray): Element is not in any index
  - **Disabled Type** (Gray): Element type is excluded from indexing

#### Metadata Information
- **Last Modified**: When Craft last modified the element
- **Revision Number**: Current element revision for change tracking
- **Index Attributes**: Technical details about the indexed document

#### Quick Actions
Authorized users can perform immediate actions:

##### Re-index Element
- **Single Click**: Immediately reindex the current element
- **Real-Time Feedback**: Status updates as operation progresses
- **Result Notification**: Success/failure notification with details
- **Automatic Refresh**: Sidebar updates to reflect current status

##### Delete from Index
- **Confirmation Required**: Prevents accidental deletions
- **Complete Removal**: Removes element from all applicable indexes
- **Status Update**: Sidebar immediately reflects deletion
- **Bulk Impact**: Useful for removing elements that should no longer be searchable

### Live Status Updates

The sidebar automatically refreshes to show current status:
- **Automatic Polling**: Periodically checks for status changes
- **Post-Action Updates**: Refreshes following re-index or delete operations
- **Change Detection**: Updates when element is modified in Craft
- **Multi-User Sync**: Shows changes made by other users

## Index Configuration Management

### Naming Strategy

Control how indexes are named and organized:

#### Global Settings
- **Index Prefix**: Applied to all indexes (e.g., `craft-`)
- **Fallback Name**: Used when no element-specific override exists
- **Site Suffix**: Automatically appends site ID (e.g., `_1`)

#### Element Type Overrides
Configure specific index names for different element types:
- **Entry-Specific**: Custom index name for entry elements
- **Asset-Specific**: Separate index for asset elements
- **Category-Specific**: Dedicated category index
- **Commerce Integration**: Product-specific indexes when Commerce is installed
- **Custom Types**: Support for additional element types

#### Live Preview
All index name fields provide:
- **Real-Time Updates**: Names update as you type
- **Complete Examples**: Shows full index names including prefixes and suffixes
- **Validation Feedback**: Immediate indication of naming conflicts or issues

### Multi-Site Index Management

For multi-site Craft installations:

#### Site-Specific Indexes
- **Separate Indexes**: Each site maintains its own set of indexes
- **Unified Naming**: Consistent naming pattern across sites with unique suffixes
- **Independent Management**: Index operations can target specific sites

#### Cross-Site Operations
- **Bulk Site Selection**: Reindex multiple sites simultaneously
- **Site-Aware Status**: Element sidebar shows site-specific index information
- **Unified Progress**: Single progress indicator for multi-site operations

## Advanced Index Operations

### Connection Testing

Before performing index operations:
- **Connectivity Check**: Verifies Elasticsearch server is reachable
- **Authentication Test**: Validates credentials if authentication is enabled
- **Index Accessibility**: Confirms ability to read/write indexes
- **Error Diagnosis**: Detailed feedback for connection issues

### Index Health Monitoring

The control panel provides ongoing health monitoring:
- **Sync Status**: Compares Craft content with Elasticsearch indexes
- **Connection Badges**: Visual indicators in utility navigation
- **Health Warnings**: Proactive alerts for potential issues
- **Performance Metrics**: Basic performance information for operations

### Troubleshooting Tools

Built-in tools for resolving common issues:

#### Connection Problems
- **Configuration Validation**: Checks settings for common mistakes
- **Network Testing**: Verifies network connectivity to Elasticsearch
- **Authentication Debugging**: Helps resolve credential issues
- **SSL/TLS Support**: Handles secure connections appropriately

#### Indexing Issues
- **Element Validation**: Checks if elements meet indexing criteria
- **Permission Verification**: Ensures proper Craft permissions
- **Content Analysis**: Identifies problematic content that fails to index
- **Batch Size Optimization**: Suggests optimal batch sizes for performance

#### Performance Optimization
- **Index Size Analysis**: Reports on index size and document counts
- **Query Performance**: Basic performance metrics for search operations
- **Resource Usage**: Helps identify resource-intensive operations
- **Scaling Recommendations**: Suggests improvements for large datasets

## Best Practices

### Regular Maintenance
1. **Weekly Health Checks**: Review connection status and sync indicators
2. **Monthly Full Reindex**: Use "Reset & Index" mode for complete refresh
3. **Monitor Error Logs**: Address recurring indexing failures promptly
4. **Performance Review**: Check operation speeds and optimize as needed

### Content Strategy
1. **Element Type Configuration**: Disable indexing for unused element types
2. **Frontend Fetching**: Configure appropriately for your content strategy
3. **Status Filtering**: Include only relevant element statuses in indexes
4. **Volume Management**: Exclude asset volumes that don't need search

### Multi-Site Management
1. **Consistent Naming**: Use clear, descriptive index prefixes
2. **Site-Specific Strategy**: Consider different indexing strategies per site
3. **Unified Monitoring**: Establish regular monitoring routines across all sites
4. **Coordinated Updates**: Plan bulk operations during low-traffic periods

### Error Prevention
1. **Test Changes**: Always test configuration changes in development first
2. **Backup Strategy**: Maintain backups for major index operations
3. **Gradual Rollouts**: Implement changes incrementally when possible
4. **Monitor Impact**: Watch for performance impacts following changes