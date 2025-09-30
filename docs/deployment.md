# Deployment Guide

Deploy MidnightOS to production environments with confidence using this comprehensive guide covering Docker, cloud platforms, security, and monitoring.

## Overview

This guide covers deploying MidnightOS from development to production, including infrastructure setup, security configuration, monitoring, and maintenance procedures.

## Deployment Architecture

```mermaid
graph TB
    subgraph "Production Infrastructure"
        subgraph "Load Balancer Layer"
            LB["Load Balancer<br/>NGINX/HAProxy<br/>SSL Termination"]
        end
        
        subgraph "Application Layer"
            FE1["Frontend Instance 1<br/>Next.js<br/>Port 3003"]
            FE2["Frontend Instance 2<br/>Next.js<br/>Port 3004"]
            
            API1["API Instance 1<br/>Orchestrator<br/>Port 3002"]
            API2["API Instance 2<br/>Orchestrator<br/>Port 3003"]
            
            ELIZA["Shared Eliza Service<br/>ElizaOS<br/>Port 3004"]
            
            MCP1["MCP Instance 1<br/>Port 3001"]
            MCP2["MCP Instance 2<br/>Port 3002"]
        end
        
        subgraph "Data Layer"
            DB_PRIMARY[(PostgreSQL Primary<br/>Port 5432)]
            DB_REPLICA[(PostgreSQL Replica<br/>Port 5433)]
            REDIS[(Redis Cache<br/>Port 6379)]
        end
        
        subgraph "External Services"
            MIDNIGHT["Midnight Blockchain<br/>Mainnet/Testnet"]
            MONITORING["Monitoring Stack<br/>Prometheus/Grafana"]
        end
    end
    
    LB --> FE1
    LB --> FE2
    LB --> API1
    LB --> API2
    
    API1 --> ELIZA
    API2 --> ELIZA
    API1 --> DB_PRIMARY
    API2 --> DB_PRIMARY
    
    ELIZA --> MCP1
    ELIZA --> MCP2
    MCP1 --> MIDNIGHT
    MCP2 --> MIDNIGHT
    
    DB_PRIMARY --> DB_REPLICA
    API1 --> REDIS
    API2 --> REDIS
    
    style LB fill:#e1f5fe
    style API1 fill:#e8f5e9
    style ELIZA fill:#fff3e0
    style MCP1 fill:#f3e5f5
    style MIDNIGHT fill:#e0f2f1
```

## Prerequisites

Before deployment, ensure you have:

- **Production server** with minimum 4 CPU cores, 8GB RAM, 100GB SSD
- **Domain name** with DNS control
- **SSL certificate** (Let's Encrypt recommended)
- **Database server** (PostgreSQL 14+)
- **Container orchestration** (Docker Swarm, Kubernetes, or Docker Compose)
- **Monitoring setup** (Prometheus, Grafana)
- **Backup storage** (S3, GCS, or equivalent)

## Environment Preparation

### Production Environment Variables

Create production environment configuration:

```bash
# Create production environment directory
mkdir -p /opt/midnightos/config
cd /opt/midnightos/config
```

**Production .env for Orchestrator:**
```env
# Database Configuration
DATABASE_URL="postgresql://midnightos_prod:secure_password@db.internal:5432/midnightos_prod?ssl=true"
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=30000

# API Configuration
NODE_ENV=production
PORT=3002
HOST=0.0.0.0
CORS_ORIGIN=https://your-domain.com

# Security
JWT_SECRET="super-secure-jwt-secret-256-bit-minimum"
JWT_EXPIRY=24h
API_RATE_LIMIT=100
ENABLE_API_DOCS=false

# External Services
SHARED_ELIZA_URL=http://eliza.internal:3004
MIDNIGHT_MCP_URL=http://mcp.internal:3001
REDIS_URL=redis://redis.internal:6379

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
LOG_LEVEL=info
SENTRY_DSN=your-sentry-dsn

# Backup
BACKUP_ENABLED=true
BACKUP_S3_BUCKET=midnightos-backups
BACKUP_SCHEDULE="0 2 * * *"
```

**Production .env for Frontend:**
```env
# Next.js Configuration
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Security
NEXTAUTH_SECRET="secure-nextauth-secret"
NEXTAUTH_URL=https://your-domain.com

# Analytics (Optional)
NEXT_PUBLIC_GA_ID=GA-XXXXX-X
NEXT_PUBLIC_HOTJAR_ID=123456

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_DEBUG=false
```

**Production .env for MCP Service:**
```env
# Midnight Network
MIDNIGHT_RPC_URL=https://rpc.mainnet.midnight.network
MIDNIGHT_INDEXER_URL=https://indexer.mainnet.midnight.network/api/v1/graphql
NETWORK=mainnet

# MCP Configuration
MCP_SERVER_PORT=3001
MCP_MAX_CONNECTIONS=100
MCP_TIMEOUT=30000

# Wallet Security
WALLET_ENCRYPTION_KEY="secure-encryption-key-here"
ENABLE_HARDWARE_SECURITY=true
WALLET_BACKUP_ENABLED=true

# Monitoring
LOG_LEVEL=info
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
```

## Docker Production Deployment

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  # Frontend Service
  frontend:
    build:
      context: .
      dockerfile: docker/Dockerfile.frontend
      target: production
    image: midnightos/frontend:${VERSION:-latest}
    container_name: midnightos-frontend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    env_file:
      - ./config/frontend.env
    ports:
      - "3003:3000"
    depends_on:
      - orchestrator
    networks:
      - midnightos-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'

  # Orchestrator API
  orchestrator:
    build:
      context: .
      dockerfile: docker/Dockerfile.orchestrator
      target: production
    image: midnightos/orchestrator:${VERSION:-latest}
    container_name: midnightos-orchestrator
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    env_file:
      - ./config/orchestrator.env
    ports:
      - "3002:3002"
      - "9090:9090"  # Metrics port
    depends_on:
      - database
      - redis
      - shared-eliza
    networks:
      - midnightos-network
    volumes:
      - ./logs:/app/logs
      - ./backups:/app/backups
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'

  # Shared Eliza Service
  shared-eliza:
    build:
      context: .
      dockerfile: docker/Dockerfile.eliza-agent
      target: production
    image: midnightos/eliza:${VERSION:-latest}
    container_name: midnightos-eliza
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3004
    env_file:
      - ./config/eliza.env
    ports:
      - "3004:3004"
    depends_on:
      - midnight-mcp
    networks:
      - midnightos-network
    volumes:
      - ./eliza-data:/app/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3004/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2.0'
        reservations:
          memory: 1G
          cpus: '1.0'

  # Midnight MCP Service
  midnight-mcp:
    build:
      context: .
      dockerfile: docker/Dockerfile.midnight-mcp
      target: production
    image: midnightos/mcp:${VERSION:-latest}
    container_name: midnightos-mcp
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    env_file:
      - ./config/mcp.env
    ports:
      - "3001:3001"
    networks:
      - midnightos-network
    volumes:
      - ./mcp-data:/app/data
      - ./wallets:/app/wallets
    healthcheck:
      test: ["CMD", "nc", "-z", "localhost", "3001"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'

  # PostgreSQL Database
  database:
    image: postgres:15-alpine
    container_name: midnightos-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: midnightos_prod
      POSTGRES_USER: midnightos_prod
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--auth-host=scram-sha-256"
    ports:
      - "5432:5432"
    networks:
      - midnightos-network
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./backups/db:/backups
      - ./init-scripts:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U midnightos_prod -d midnightos_prod"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: midnightos-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    networks:
      - midnightos-network
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'

  # NGINX Load Balancer
  nginx:
    image: nginx:alpine
    container_name: midnightos-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    networks:
      - midnightos-network
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/sites:/etc/nginx/sites-available
      - ./ssl:/etc/nginx/ssl
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - frontend
      - orchestrator
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  midnightos-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  postgres-data:
    driver: local
  redis-data:
    driver: local
```

### NGINX Configuration

Create `nginx/nginx.conf`:

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;
    
    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Frontend
    upstream frontend {
        server frontend:3000 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }
    
    # API
    upstream api {
        server orchestrator:3002 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }
    
    # HTTPS Redirect
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }
    
    # Main HTTPS Server
    server {
        listen 443 ssl http2;
        server_name your-domain.com;
        
        ssl_certificate /etc/nginx/ssl/certificate.crt;
        ssl_certificate_key /etc/nginx/ssl/private.key;
        
        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        
        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }
        
        # Authentication routes (stricter rate limiting)
        location /api/auth/ {
            limit_req zone=auth burst=5 nodelay;
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Health check endpoint
        location /health {
            proxy_pass http://api/health;
            access_log off;
        }
        
        # Frontend routes
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
        
        # Static assets with caching
        location /_next/static/ {
            proxy_pass http://frontend;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

## Cloud Platform Deployment

### AWS Deployment with ECS

Create `aws/ecs-task-definition.json`:

```json
{
  "family": "midnightos-production",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::YOUR_ACCOUNT:role/midnightosTaskRole",
  "containerDefinitions": [
    {
      "name": "frontend",
      "image": "YOUR_ECR_REPO/midnightos-frontend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "NEXTAUTH_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:midnightos/nextauth-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/midnightos",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "frontend"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    },
    {
      "name": "orchestrator",
      "image": "YOUR_ECR_REPO/midnightos-orchestrator:latest",
      "portMappings": [
        {
          "containerPort": 3002,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:midnightos/database-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:midnightos/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/midnightos",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "orchestrator"
        }
      }
    }
  ]
}
```

### Kubernetes Deployment

Create `k8s/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: midnightos
  labels:
    name: midnightos
```

Create `k8s/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: midnightos-config
  namespace: midnightos
data:
  NODE_ENV: "production"
  SHARED_ELIZA_URL: "http://eliza-service:3004"
  MIDNIGHT_MCP_URL: "http://mcp-service:3001"
  REDIS_URL: "redis://redis-service:6379"
```

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orchestrator
  namespace: midnightos
spec:
  replicas: 3
  selector:
    matchLabels:
      app: orchestrator
  template:
    metadata:
      labels:
        app: orchestrator
    spec:
      containers:
      - name: orchestrator
        image: midnightos/orchestrator:latest
        ports:
        - containerPort: 3002
        envFrom:
        - configMapRef:
            name: midnightos-config
        - secretRef:
            name: midnightos-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3002
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: orchestrator-service
  namespace: midnightos
spec:
  selector:
    app: orchestrator
  ports:
  - port: 3002
    targetPort: 3002
  type: ClusterIP
```

## Security Configuration

### SSL/TLS Setup

```bash
# Generate SSL certificate with Let's Encrypt
sudo apt-get update
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com -d api.your-domain.com

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall Configuration

```bash
# UFW firewall setup
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# For Docker networks
sudo ufw allow from 172.20.0.0/16
```

### Security Hardening

```bash
# System hardening script
#!/bin/bash

# Update system
apt-get update && apt-get upgrade -y

# Configure fail2ban
apt-get install fail2ban -y
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Configure SSH
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh

# Install security updates automatically
apt-get install unattended-upgrades -y
dpkg-reconfigure -plow unattended-upgrades
```

## Monitoring and Observability

### Prometheus Configuration

Create `monitoring/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'midnightos-orchestrator'
    static_configs:
      - targets: ['orchestrator:9090']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'midnightos-eliza'
    static_configs:
      - targets: ['shared-eliza:9091']

  - job_name: 'midnightos-mcp'
    static_configs:
      - targets: ['midnight-mcp:9092']

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:9113']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Grafana Dashboard

Create `monitoring/grafana/dashboards/midnightos.json`:

```json
{
  "dashboard": {
    "id": null,
    "title": "MidnightOS Production Dashboard",
    "tags": ["midnightos"],
    "timezone": "browser",
    "panels": [
      {
        "title": "API Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])",
            "legendFormat": "Average Response Time"
          }
        ]
      },
      {
        "title": "Active Bots",
        "type": "stat",
        "targets": [
          {
            "expr": "midnightos_active_bots_total",
            "legendFormat": "Active Bots"
          }
        ]
      },
      {
        "title": "Transaction Success Rate",
        "type": "gauge",
        "targets": [
          {
            "expr": "rate(midnightos_transactions_success_total[5m]) / rate(midnightos_transactions_total[5m]) * 100",
            "legendFormat": "Success Rate %"
          }
        ]
      }
    ]
  }
}
```

### Application Monitoring

Add monitoring to your services:

```javascript
// In orchestrator/src/monitoring.js
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const activeBots = new prometheus.Gauge({
  name: 'midnightos_active_bots_total',
  help: 'Number of active bots'
});

const transactionCounter = new prometheus.Counter({
  name: 'midnightos_transactions_total',
  help: 'Total number of transactions',
  labelNames: ['status', 'type']
});

// Middleware for tracking HTTP requests
const trackHttpRequests = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
};

module.exports = {
  httpRequestDuration,
  activeBots,
  transactionCounter,
  trackHttpRequests,
  register: prometheus.register
};
```

## Backup and Recovery

### Database Backup

Create `scripts/backup-database.sh`:

```bash
#!/bin/bash

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-midnightos_prod}"
DB_USER="${DB_USER:-midnightos_prod}"
BACKUP_DIR="${BACKUP_DIR:-/opt/midnightos/backups}"
S3_BUCKET="${S3_BUCKET:-midnightos-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/midnightos_${TIMESTAMP}.sql"

# Create database backup
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Upload to S3
aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/database/"

# Clean up old local backups
find "$BACKUP_DIR" -name "midnightos_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Verify backup integrity
gunzip -t "$BACKUP_FILE"
if [ $? -eq 0 ]; then
    echo "Backup successful: $BACKUP_FILE"
else
    echo "Backup verification failed: $BACKUP_FILE"
    exit 1
fi
```

### Application Data Backup

Create `scripts/backup-application.sh`:

```bash
#!/bin/bash

# Backup configuration files
tar -czf "/backups/config_$(date +%Y%m%d).tar.gz" /opt/midnightos/config/

# Backup wallet data (encrypted)
tar -czf "/backups/wallets_$(date +%Y%m%d).tar.gz" /opt/midnightos/wallets/

# Backup logs
tar -czf "/backups/logs_$(date +%Y%m%d).tar.gz" /opt/midnightos/logs/

# Upload to S3
aws s3 sync /backups/ s3://midnightos-backups/application/
```

### Recovery Procedures

Create `scripts/restore-database.sh`:

```bash
#!/bin/bash

BACKUP_FILE="$1"
DB_NAME="${DB_NAME:-midnightos_prod}"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# Download from S3 if URL provided
if [[ "$BACKUP_FILE" == s3://* ]]; then
    LOCAL_FILE="/tmp/$(basename $BACKUP_FILE)"
    aws s3 cp "$BACKUP_FILE" "$LOCAL_FILE"
    BACKUP_FILE="$LOCAL_FILE"
fi

# Restore database
gunzip -c "$BACKUP_FILE" | psql -d "$DB_NAME"

echo "Database restored from $BACKUP_FILE"
```

## Deployment Process

### CI/CD Pipeline

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run tests
        run: pnpm test
      
      - name: Build application
        run: pnpm build

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and push Docker images
        run: |
          docker build -t midnightos/frontend:${{ github.sha }} -f docker/Dockerfile.frontend .
          docker build -t midnightos/orchestrator:${{ github.sha }} -f docker/Dockerfile.orchestrator .
          docker build -t midnightos/eliza:${{ github.sha }} -f docker/Dockerfile.eliza-agent .
          docker build -t midnightos/mcp:${{ github.sha }} -f docker/Dockerfile.midnight-mcp .
          
          # Push to registry
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push midnightos/frontend:${{ github.sha }}
          docker push midnightos/orchestrator:${{ github.sha }}
          docker push midnightos/eliza:${{ github.sha }}
          docker push midnightos/mcp:${{ github.sha }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          # SSH to production server and update services
          ssh -o StrictHostKeyChecking=no ${{ secrets.PROD_USER }}@${{ secrets.PROD_HOST }} << 'EOF'
            cd /opt/midnightos
            export VERSION=${{ github.sha }}
            docker-compose -f docker-compose.prod.yml pull
            docker-compose -f docker-compose.prod.yml up -d
            docker image prune -f
          EOF
```

### Blue-Green Deployment

Create `scripts/blue-green-deploy.sh`:

```bash
#!/bin/bash

# Configuration
CURRENT_ENV="${1:-blue}"
NEW_ENV="${2:-green}"
VERSION="${3:-latest}"

echo "Deploying version $VERSION to $NEW_ENV environment"

# Update new environment
docker-compose -f docker-compose.$NEW_ENV.yml pull
VERSION=$VERSION docker-compose -f docker-compose.$NEW_ENV.yml up -d

# Health check new environment
echo "Performing health checks on $NEW_ENV environment..."
sleep 30

HEALTH_CHECK_URL="http://localhost:8001/health" # Green environment port
if curl -f $HEALTH_CHECK_URL; then
    echo "Health check passed, switching traffic to $NEW_ENV"
    
    # Update load balancer to point to new environment
    # This step depends on your load balancer configuration
    
    # Stop old environment
    docker-compose -f docker-compose.$CURRENT_ENV.yml down
    
    echo "Deployment successful, $NEW_ENV is now active"
else
    echo "Health check failed, rolling back"
    docker-compose -f docker-compose.$NEW_ENV.yml down
    exit 1
fi
```

## Production Checklist

### Pre-deployment Checklist

- [ ] All environment variables configured
- [ ] SSL certificates installed and valid
- [ ] Database migrations tested
- [ ] Security hardening completed
- [ ] Monitoring and alerting configured
- [ ] Backup procedures tested
- [ ] Load testing completed
- [ ] DNS records updated
- [ ] CDN configured (if applicable)
- [ ] Rate limiting configured

### Post-deployment Checklist

- [ ] All services healthy and responding
- [ ] SSL certificate validation
- [ ] Database connectivity verified
- [ ] API endpoints responding correctly
- [ ] Frontend loading properly
- [ ] Monitoring dashboards showing data
- [ ] Log aggregation working
- [ ] Backup jobs scheduled
- [ ] Security scanners run
- [ ] Performance baseline established

## Troubleshooting

### Common Production Issues

**1. Service Discovery Problems**
```bash
# Check container network connectivity
docker network ls
docker network inspect midnightos-network

# Test inter-service communication
docker exec -it midnightos-frontend curl http://orchestrator:3002/health
```

**2. Database Connection Issues**
```bash
# Check database logs
docker logs midnightos-db

# Test database connectivity
docker exec -it midnightos-orchestrator psql $DATABASE_URL -c "SELECT 1;"
```

**3. Memory/CPU Issues**
```bash
# Monitor resource usage
docker stats

# Check system resources
htop
free -h
df -h
```

**4. SSL Certificate Issues**
```bash
# Check certificate validity
openssl x509 -in /etc/nginx/ssl/certificate.crt -text -noout

# Test SSL configuration
ssl-check your-domain.com
```

### Emergency Procedures

**1. Emergency Rollback**
```bash
# Quick rollback to previous version
cd /opt/midnightos
docker-compose -f docker-compose.prod.yml down
VERSION=previous_working_version docker-compose -f docker-compose.prod.yml up -d
```

**2. Emergency Maintenance Mode**
```bash
# Enable maintenance mode
cp nginx/maintenance.html /var/www/html/
nginx -s reload
```

**3. Database Emergency Access**
```bash
# Emergency database access
docker exec -it midnightos-db psql -U midnightos_prod -d midnightos_prod
```

This comprehensive deployment guide provides everything needed to confidently deploy MidnightOS to production environments with proper security, monitoring, and maintenance procedures.