# Utilities and Tools

The Search with Elastic plugin provides a comprehensive set of utilities and tools accessible through the Craft CMS control panel. These tools help administrators manage, monitor, and troubleshoot their Elasticsearch integration with ease.

## Refresh Elasticsearch Index Utility

The primary utility for managing your Elasticsearch indexes, accessible through **Utilities → Refresh Elasticsearch index**.

### Utility Features

#### Connection Status Monitoring
The utility immediately shows the current state of your Elasticsearch connection:
- **Connected Status**: Green indicator when Elasticsearch is accessible
- **Connection Errors**: Red warning with specific error details
- **Configuration Links**: Direct links to plugin settings for quick fixes
- **Real-Time Testing**: Click "Test Connection" to verify connectivity

#### Index Synchronization Status
Displays whether your indexes are synchronized with Craft content:
- **In Sync**: Green indicator when indexes match current content
- **Out of Sync**: Red warning when indexes need updating
- **Sync Details**: Information about what needs to be synchronized
- **Auto-Detection**: Automatically detects sync issues when loading the utility

### Reindexing Interface

#### Site and Element Type Selection

**Interactive Site Table**
- **Hierarchical Display**: Sites with their available element types
- **Live Element Counts**: Real-time count of indexable elements
- **Index Name Display**: Shows actual Elasticsearch index names
- **Checkbox Selection**: Individual or bulk selection controls

**Smart Selection Controls**
- **Site Checkboxes**: Select all element types for a site
- **Element Type Checkboxes**: Granular control over what gets indexed
- **Indeterminate States**: Visual feedback for partial selections
- **Bulk Actions**: "Select All" and "Deselect All" buttons

#### Reindex Mode Selection

**Five Reindexing Strategies**
1. **Reset & Index**: Complete index recreation (default)
2. **All**: Reindex all selected elements without clearing
3. **Missing & Updated**: Smart incremental reindexing
4. **Missing**: Add elements not in indexes
5. **Updated**: Reindex changed elements

**Mode Descriptions**
- **Interactive Selection**: Click buttons to change modes
- **Dynamic Descriptions**: Explanatory text updates based on selection
- **Visual Feedback**: Active mode highlighted with distinct styling
- **Smart Defaults**: Appropriate mode pre-selected based on context

#### Progress Tracking and Reporting

**Real-Time Progress Display**
- **Progress Bar**: Visual completion indicator
- **Element Counter**: Current/total elements processed
- **Processing Speed**: Elements per second calculation
- **Time Estimation**: ETA based on current processing speed

**Detailed Status Information**
- **Current Operation**: Shows which element is being processed
- **Success Metrics**: Count of successfully indexed elements
- **Skip Reporting**: Elements skipped with reasons
- **Error Tracking**: Failed operations with detailed error messages

**Error and Warning Management**
- **Categorized Errors**: Groups similar errors for easier diagnosis
- **Element-Specific Details**: Shows exactly which elements failed
- **Recovery Suggestions**: Actionable advice for resolving issues
- **Error Log Integration**: Links to detailed logs for troubleshooting

### Connection Testing Tools

#### Manual Connection Testing
- **Test Button**: Immediate connection verification
- **Result Display**: Clear success/failure messaging
- **Error Details**: Specific connection error information
- **Configuration Validation**: Checks for common configuration issues

#### Automatic Health Monitoring
- **Background Checks**: Periodic connection verification
- **Badge Indicators**: Red badge on utility navigation when issues detected
- **Status Persistence**: Remembers connection state across sessions
- **Multi-User Awareness**: Updates when other users modify settings

## Element Sidebar Tools

### Quick Action Interface

When editing individual elements, the plugin provides immediate access to indexing tools:

#### Status Information Panel
- **Visual Status Indicators**: Color-coded status display
- **Metadata Display**: Last modification time and revision information
- **Index Attributes**: Technical details about indexed content
- **Real-Time Updates**: Status refreshes automatically

#### Action Buttons
- **Re-index Button**: Immediate element reindexing
- **Delete Button**: Remove element from all indexes
- **Confirmation Dialogs**: Prevent accidental operations
- **Progress Feedback**: Button states update during operations

### Live Status Updates

#### Automatic Refresh System
- **Status Polling**: Periodic checks for status changes
- **Event-Driven Updates**: Immediate refresh when user actions complete
- **Multi-User Sync**: Shows changes made by other administrators
- **Error Recovery**: Handles temporary connection issues gracefully

#### Status Indicators
- **Indexed** (Green dot): Element is current and fully indexed
- **Partial Index** (Yellow dot): Element indexed with warnings
- **Outdated** (Red dot): Element needs reindexing
- **Not Indexed** (Gray dot): Element not in any index
- **Disabled Type** (Gray dot): Element type excluded from indexing

## Configuration Management Tools

### Settings Interface Integration

#### Live Preview System
- **Index Name Preview**: Real-time updates as you type
- **Configuration Validation**: Immediate feedback on settings
- **Override Warnings**: Visual indicators for config file overrides
- **Change Impact**: Shows how changes affect existing indexes

#### Element Type Configuration
- **Bulk Configuration**: Configure multiple element types at once
- **Visual Grouping**: Organized by element type with clear headers
- **Status Filtering**: Configure which element statuses to index
- **Frontend Fetching Control**: Per-type content fetching settings

### Multi-Site Management

#### Site-Specific Tools
- **Site Selection**: Tools work across single or multiple sites
- **Site-Aware Status**: All tools understand multi-site contexts
- **Unified Operations**: Bulk operations can span multiple sites
- **Site-Specific Reporting**: Progress and errors reported per site

#### Cross-Site Coordination
- **Global Settings**: Apply consistent settings across sites
- **Site-Specific Overrides**: Allow per-site customization
- **Unified Monitoring**: Single dashboard for all sites
- **Coordinated Operations**: Schedule operations across sites

## Diagnostic and Troubleshooting Tools

### Connection Diagnostics

#### Multi-Level Connection Testing
- **Basic Connectivity**: Can the server be reached?
- **Authentication Verification**: Are credentials valid?
- **Index Access**: Can indexes be read and written?
- **Permission Checking**: Does the user have sufficient Elasticsearch permissions?

#### Error Analysis Tools
- **Error Categorization**: Groups similar errors for pattern analysis
- **Root Cause Analysis**: Helps identify underlying issues
- **Resolution Guidance**: Provides specific steps to fix problems
- **Documentation Links**: Direct links to relevant documentation

### Performance Monitoring

#### Operation Performance
- **Processing Speed Tracking**: Monitor indexing performance over time
- **Bottleneck Identification**: Identify slow operations or problematic content
- **Resource Usage**: Basic monitoring of system resource usage
- **Optimization Suggestions**: Recommendations for improving performance

#### Index Health Monitoring
- **Sync Status Checking**: Regular verification that indexes match content
- **Document Count Tracking**: Monitor index size and growth
- **Health Warnings**: Proactive alerts for potential issues
- **Maintenance Reminders**: Suggestions for routine maintenance

### Error Recovery Tools

#### Automated Recovery
- **Retry Logic**: Automatic retry for transient failures
- **Partial Success Handling**: Continue operations despite individual failures
- **Graceful Degradation**: Maintain functionality during partial outages
- **Error Accumulation**: Collect errors for batch resolution

#### Manual Recovery Options
- **Element-Specific Retry**: Retry failed elements individually
- **Batch Re-processing**: Process failed elements in smaller batches
- **Skip and Continue**: Option to skip problematic elements
- **Complete Reset**: Nuclear option to start fresh

## User Permissions and Access Control

### Permission Integration

#### Craft Permission System
- `utility:refresh-elasticsearch-index`: Required for bulk operations
- `search-with-elastic:index-element`: Required for individual element actions
- Permission checks apply to all control panel features
- Graceful degradation when permissions are insufficient

#### User Experience Adaptation
- **Permission-Aware Interface**: Hide unavailable features
- **Helpful Messages**: Explain why features are unavailable
- **Progressive Enhancement**: Show additional features as permissions allow
- **Security Boundaries**: Prevent unauthorized access attempts

### Multi-User Considerations

#### Concurrent Operations
- **Operation Locking**: Prevent conflicting bulk operations
- **Progress Sharing**: Show when other users are performing operations
- **Status Synchronization**: Keep all users informed of current state
- **Graceful Queuing**: Handle multiple simultaneous requests

#### User Activity Tracking
- **Operation Logging**: Track who performed what operations
- **Change Attribution**: Associate index changes with specific users
- **Audit Trail**: Maintain history of administrative actions
- **Performance Impact**: Monitor impact of multi-user usage

## Integration with Craft CMS Features

### Native Craft Integration

#### Element Integration
- **Element Edit Screens**: Integrated sidebar
- **Element Listing**: Bulk actions from element indexes
- **Element Status**: Index status in element listings
- **Element Search**: Search capabilities

#### Utility System Integration
- **Native Utility Framework**: Uses Craft's utility system
- **Consistent UI/UX**: Matches Craft's design patterns
- **Permission System**: Integrates with Craft permissions
- **Navigation Integration**: Appears in standard utility navigation

### Plugin Ecosystem Compatibility

#### Commerce Integration
- **Product Indexing**: Special handling for Commerce products
- **Variant Support**: Index product variants appropriately
- **Commerce-Specific Status**: Handle Commerce element statuses
- **Order Integration**: Potential future integration with order data

#### Third-Party Plugin Support
- **Element Type Detection**: Automatically discover element types
- **Flexible Configuration**: Adapt to custom element types
- **Extension Points**: Allow other plugins to extend functionality
- **API Compatibility**: Maintain API compatibility for integrations

## Best Practices for Utility Usage

### Regular Maintenance Routines

#### Daily Tasks
- Check connection status badges
- Review error notifications
- Monitor bulk operation results
- Address immediate issues

#### Weekly Tasks
- Run incremental reindexing ("Missing & Updated" mode)
- Review error logs for patterns
- Check index synchronization status
- Verify performance metrics

#### Monthly Tasks
- Perform full reindex ("Reset & Index" mode)
- Review and update element type configurations
- Clean up old error logs
- Performance optimization review

### Operation Planning

#### Bulk Operations
- Schedule during low-traffic periods
- Start with smaller test batches
- Monitor progress and performance
- Have rollback plans ready

#### Configuration Changes
- Test changes in development first
- Document changes for future reference
- Communicate changes to team members
- Monitor impact following deployment

### Troubleshooting Workflow

#### Initial Assessment
1. Check connection status first
2. Verify configuration changes
3. Review error logs for patterns
4. Test with small subset of content

#### Problem Resolution
1. Use diagnostic tools to identify root cause
2. Apply targeted fixes rather than broad solutions
3. Test fixes with limited scope first
4. Document solutions for future reference

#### Prevention Strategies
1. Implement regular health monitoring
2. Establish baseline performance metrics
3. Create maintenance schedules
4. Train team members on common issues