# Advanced features

Advanced configurations for large-scale, high-availability Elasticsearch deployments.

## Cluster configuration

### Multi-node setup

Configure a production cluster with dedicated node roles:

```yaml
# elasticsearch.yml - Master node
cluster.name: craft-production
node.name: master-1
node.roles: [master]
discovery.seed_hosts: ["10.0.0.1", "10.0.0.2", "10.0.0.3"]
cluster.initial_master_nodes: ["master-1", "master-2", "master-3"]

# Data node configuration
node.roles: [data, ingest]
path.data: /var/lib/elasticsearch/data
path.logs: /var/log/elasticsearch

# Coordinating node (client)
node.roles: []
http.port: 9200
```

### Load balancing

Configure multiple Elasticsearch endpoints:

```php
// config/search-with-elastic.php
return [
    'hosts' => [
        [
            'host' => '10.0.0.10',
            'port' => 9200,
            'scheme' => 'https'
        ],
        [
            'host' => '10.0.0.11', 
            'port' => 9200,
            'scheme' => 'https'
        ],
        [
            'host' => '10.0.0.12',
            'port' => 9200,
            'scheme' => 'https'
        ]
    ],
    'connectionPool' => 'RoundRobinSelector',
    'retries' => 3
];
```

### High availability settings

```yaml
# Cluster-level settings
cluster.routing.allocation.awareness.attributes: rack_id
cluster.routing.allocation.awareness.force.rack_id.values: rack1,rack2

# Index-level settings
index.number_of_replicas: 2
index.auto_expand_replicas: 0-2
index.unassigned.node_left.delayed_timeout: 5m
```

## Security configuration

### Authentication and authorization

Enable X-Pack security:

```yaml
# elasticsearch.yml
xpack.security.enabled: true
xpack.security.transport.ssl.enabled: true
xpack.security.http.ssl.enabled: true
```

Create dedicated users:

```bash
# Create application user
bin/elasticsearch-users useradd craft_app \
  -p strong_password \
  -r superuser

# Create read-only user for monitoring
bin/elasticsearch-users useradd craft_readonly \
  -p readonly_password \
  -r kibana_user
```

Configure plugin authentication:

```php
// config/search-with-elastic.php
return [
    'auth' => [
        'username' => getenv('ELASTICSEARCH_USER'),
        'password' => getenv('ELASTICSEARCH_PASSWORD')
    ],
    'ssl' => [
        'cert' => '/path/to/client.crt',
        'key' => '/path/to/client.key',
        'ca' => '/path/to/ca.crt',
        'verify' => true
    ]
];
```

### SSL/TLS encryption

Generate certificates:

```bash
# Create CA
bin/elasticsearch-certutil ca --out elastic-stack-ca.p12

# Create node certificates
bin/elasticsearch-certutil cert \
  --ca elastic-stack-ca.p12 \
  --dns localhost \
  --dns your-domain.com \
  --ip 127.0.0.1 \
  --ip 10.0.0.10
```

Configure SSL in Elasticsearch:

```yaml
xpack.security.transport.ssl.keystore.path: certs/elastic-certificates.p12
xpack.security.transport.ssl.truststore.path: certs/elastic-certificates.p12
xpack.security.http.ssl.keystore.path: certs/elastic-certificates.p12
```

## Index lifecycle management

### ILM policies

Create automated index management:

```json
PUT _ilm/policy/craft-entries-policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "10GB",
            "max_age": "30d"
          }
        }
      },
      "warm": {
        "min_age": "30d",
        "actions": {
          "allocate": {
            "number_of_replicas": 1
          },
          "forcemerge": {
            "max_num_segments": 1
          }
        }
      },
      "cold": {
        "min_age": "90d",
        "actions": {
          "allocate": {
            "number_of_replicas": 0
          }
        }
      },
      "delete": {
        "min_age": "365d"
      }
    }
  }
}
```

Apply policy to index template:

```json
PUT _index_template/craft-entries-template
{
  "index_patterns": ["craft-entries-*"],
  "template": {
    "settings": {
      "index.lifecycle.name": "craft-entries-policy",
      "index.lifecycle.rollover_alias": "craft-entries"
    }
  }
}
```

### Snapshot and restore

Configure automated backups:

```json
PUT _snapshot/daily_backups
{
  "type": "fs",
  "settings": {
    "location": "/mount/backups/elasticsearch",
    "compress": true,
    "chunk_size": "1GB"
  }
}
```

Create snapshot policy:

```json
PUT _slm/policy/daily-snapshots
{
  "schedule": "0 30 1 * * ?",
  "name": "<daily-snapshot-{now/d}>",
  "repository": "daily_backups",
  "config": {
    "indices": ["craft-*"],
    "ignore_unavailable": false,
    "include_global_state": false
  },
  "retention": {
    "expire_after": "30d",
    "min_count": 5,
    "max_count": 50
  }
}
```

## Monitoring and alerting

### Cluster monitoring

Set up comprehensive monitoring:

```php
// services/MonitoringService.php
class MonitoringService extends Component
{
    public function getClusterHealth()
    {
        $client = SearchWithElastic::getInstance()->client;
        
        return [
            'cluster' => $client->cluster()->health(),
            'nodes' => $client->nodes()->stats(),
            'indices' => $client->indices()->stats(),
            'performance' => $this->getPerformanceMetrics()
        ];
    }
    
    public function checkAlerts()
    {
        $health = $this->getClusterHealth();
        $alerts = [];
        
        if ($health['cluster']['status'] !== 'green') {
            $alerts[] = [
                'level' => 'critical',
                'message' => 'Cluster health is ' . $health['cluster']['status']
            ];
        }
        
        if ($health['cluster']['unassigned_shards'] > 0) {
            $alerts[] = [
                'level' => 'warning',
                'message' => $health['cluster']['unassigned_shards'] . ' unassigned shards'
            ];
        }
        
        return $alerts;
    }
}
```

### Performance metrics

Track key performance indicators:

```php
public function getPerformanceMetrics()
{
    $client = SearchWithElastic::getInstance()->client;
    $stats = $client->indices()->stats(['index' => 'craft-*']);
    
    $metrics = [];
    foreach ($stats['indices'] as $index => $data) {
        $metrics[$index] = [
            'search_queries_per_second' => $data['total']['search']['query_total'] / 3600,
            'indexing_rate' => $data['total']['indexing']['index_total'] / 3600,
            'average_query_time' => $data['total']['search']['query_time_in_millis'] / max(1, $data['total']['search']['query_total']),
            'cache_hit_ratio' => $data['total']['query_cache']['hit_count'] / max(1, $data['total']['query_cache']['hit_count'] + $data['total']['query_cache']['miss_count']),
            'storage_size' => $data['total']['store']['size_in_bytes']
        ];
    }
    
    return $metrics;
}
```

### Alerting integration

Connect with external monitoring systems:

```php
// config/search-with-elastic.php
return [
    'monitoring' => [
        'enabled' => true,
        'webhooks' => [
            'slack' => getenv('SLACK_WEBHOOK_URL'),
            'pagerduty' => getenv('PAGERDUTY_INTEGRATION_KEY')
        ],
        'thresholds' => [
            'query_time_warning' => 1000, // milliseconds
            'query_time_critical' => 5000,
            'disk_usage_warning' => 80, // percentage
            'disk_usage_critical' => 95
        ]
    ]
];
```

## Multi-datacenter deployment

### Cross-cluster replication

Set up replication between datacenters:

```json
PUT _cluster/settings
{
  "persistent": {
    "cluster.remote.dc2": {
      "seeds": ["dc2-node1:9300", "dc2-node2:9300"]
    }
  }
}
```

Configure follower indices:

```json
PUT craft-entries-follower/_ccr/follow
{
  "remote_cluster": "dc2",
  "leader_index": "craft-entries",
  "max_read_request_operation_count": 5120,
  "max_outstanding_read_requests": 12,
  "max_read_request_size": "32mb",
  "max_write_request_operation_count": 5120,
  "max_write_request_size": "9mb",
  "max_outstanding_write_requests": 9,
  "max_write_buffer_count": 2147483647,
  "max_write_buffer_size": "512mb",
  "max_retry_delay": "500ms",
  "read_poll_timeout": "1m"
}
```

### Disaster recovery

Implement automated failover:

```php
class DisasterRecoveryService
{
    public function checkPrimaryCluster()
    {
        try {
            $health = $this->primaryClient->cluster()->health(['timeout' => '5s']);
            return $health['status'] !== 'red';
        } catch (Exception $e) {
            return false;
        }
    }
    
    public function failoverToSecondary()
    {
        // Update application configuration
        $config = Craft::$app->config->get('search-with-elastic');
        $config['hosts'] = $this->secondaryHosts;
        
        // Update DNS or load balancer
        $this->updateLoadBalancer($this->secondaryHosts);
        
        // Notify operations team
        $this->sendAlert('Failover activated - using secondary datacenter');
    }
}
```

## Capacity planning

### Resource requirements

Calculate sizing based on workload:

```php
class CapacityPlanner
{
    public function calculateRequirements($entryCount, $avgEntrySize, $searchesPerSecond)
    {
        // Storage calculation
        $rawStorage = $entryCount * $avgEntrySize;
        $indexOverhead = $rawStorage * 0.3; // 30% overhead for indices
        $totalStorage = ($rawStorage + $indexOverhead) * 1.2; // 20% growth buffer
        
        // Memory calculation
        $heapSize = min($totalStorage * 0.5, 32 * 1024 * 1024 * 1024); // 50% of storage or 32GB max
        $systemMemory = $heapSize * 2; // Double heap for system
        
        // CPU calculation
        $coresNeeded = max(4, ceil($searchesPerSecond / 100)); // 100 searches per core per second
        
        return [
            'storage_gb' => round($totalStorage / (1024**3), 2),
            'memory_gb' => round($systemMemory / (1024**3), 2),
            'cpu_cores' => $coresNeeded,
            'nodes_recommended' => max(3, ceil($coresNeeded / 8))
        ];
    }
}
```

### Scaling strategies

Implement horizontal scaling:

```php
// Auto-scaling based on metrics
public function checkScalingNeeds()
{
    $metrics = $this->getClusterMetrics();
    
    if ($metrics['cpu_usage'] > 80 || $metrics['memory_usage'] > 85) {
        $this->scaleOut();
    } elseif ($metrics['cpu_usage'] < 30 && $metrics['memory_usage'] < 40) {
        $this->scaleIn();
    }
}

public function scaleOut()
{
    // Add new data nodes
    $this->provisionNode([
        'roles' => ['data', 'ingest'],
        'instance_type' => 'r5.2xlarge',
        'storage' => '500GB'
    ]);
    
    // Rebalance shards
    $this->rebalanceCluster();
}
```

## Compliance and governance

### Data retention policies

Implement automated data lifecycle:

```php
class DataGovernanceService
{
    public function enforceRetentionPolicies()
    {
        $policies = [
            'personal_data' => '2 years',
            'audit_logs' => '7 years', 
            'analytics_data' => '3 years'
        ];
        
        foreach ($policies as $dataType => $retention) {
            $this->deleteExpiredData($dataType, $retention);
        }
    }
    
    public function anonymizePersonalData()
    {
        // Remove PII from search indices
        $query = [
            'query' => [
                'range' => [
                    'dateCreated' => [
                        'lte' => 'now-2y'
                    ]
                ]
            ]
        ];
        
        $this->updateByQuery($query, [
            'script' => [
                'source' => "
                    ctx._source.email = 'anonymized@example.com';
                    ctx._source.personalInfo = null;
                "
            ]
        ]);
    }
}
```

### Audit logging

Track all search operations:

```php
public function logSearchAudit($query, $user, $results)
{
    $auditData = [
        'timestamp' => date('c'),
        'user_id' => $user->id,
        'user_email' => $user->email,
        'query' => $this->sanitizeQuery($query),
        'results_count' => count($results),
        'ip_address' => Craft::$app->request->userIP,
        'user_agent' => Craft::$app->request->userAgent
    ];
    
    // Store in separate audit index
    $this->client->index([
        'index' => 'search-audit-' . date('Y-m'),
        'body' => $auditData
    ]);
}
```

Production deployments require careful planning around security, scalability, and compliance. These configurations provide a foundation for production-ready Elasticsearch clusters that can handle large-scale workloads while maintaining high availability and security standards.