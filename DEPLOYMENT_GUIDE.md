# ETL System Deployment Guide

## 🚀 Quick Start Guide

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 15+ (for production)
- Redis 7+ (for caching)

### 1. Development Setup

```bash
# Clone and setup
git clone <repository-url>
cd etl-system

# Copy environment variables
cp .env.example .env
# Edit .env with your actual values

# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma db push
npx prisma db seed

# Start development server
npm run dev
```

### 2. Production Deployment with Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale application instances
docker-compose up -d --scale app1=3
```

### 3. Kubernetes Deployment

```bash
# Make auto-scaling script executable
chmod +x kubernetes/auto-scaling.sh

# Deploy to Kubernetes
./kubernetes/auto-scaling.sh

# Check deployment status
kubectl get pods -n etl-system
kubectl get hpa -n etl-system
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL=postgresql://etl_user:password@localhost:5432/etl_database
DB_PASSWORD=secure_password_123

# Redis
REDIS_URL=redis://localhost:6379

# Security
NEXTAUTH_SECRET=your-secret-key
JWT_SECRET=your-jwt-secret

# Admin
ADMIN_EMAIL=admin@company.com
ADMIN_PASSWORD=admin123
```

### Database Migration

```bash
# Production migration
npx prisma migrate deploy

# Development migration
npx prisma migrate dev

# Reset database (development only)
npx prisma migrate reset
```

## 🔄 CI/CD Pipeline

The system includes a comprehensive CI/CD pipeline:

- **Testing**: Unit tests, integration tests, security scanning
- **Building**: Docker image creation with caching
- **Deployment**: Automated deployment to staging/production
- **Monitoring**: Health checks and notifications

### GitHub Actions Setup

1. Add repository secrets:
   - `SNYK_TOKEN`: For security scanning
   - `SLACK_WEBHOOK`: For deployment notifications

2. Configure environments:
   - Staging environment
   - Production environment (with approvals)

## 📊 Monitoring & Observability

### Prometheus Metrics

Access metrics at: `http://localhost:9090`

Key metrics:
- HTTP request latency
- Database query performance
- Job execution times
- System resource usage

### Grafana Dashboards

Access dashboards at: `http://localhost:3001`

Pre-configured dashboards:
- Application Performance
- Database Performance
- System Resources
- Business Metrics

### Health Checks

- Application: `GET /api/health`
- Database connectivity
- Redis connectivity
- External service status

## 🔒 Security

### Authentication & Authorization

- JWT-based authentication
- Role-based access control (RBAC)
- Permission-based authorization
- Rate limiting
- CORS protection

### Security Headers

- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

### Data Protection

- Encrypted database connections
- Secure password hashing
- Input validation and sanitization
- SQL injection prevention

## 🚦 Load Balancing

### Nginx Configuration

- Round-robin load balancing
- Health check integration
- Rate limiting
- SSL termination
- Static file caching

### Auto-scaling

Horizontal Pod Autoscaler (HPA):
- CPU utilization: 70%
- Memory utilization: 80%
- Min replicas: 2
- Max replicas: 10

## 📈 Performance Optimization

### Caching Strategy

1. **Redis Cache**: Session data, API responses
2. **Database Query Cache**: Frequently accessed data
3. **Static Assets**: CDN or Nginx caching
4. **Application Cache**: In-memory caching

### Database Optimization

- Connection pooling
- Query optimization
- Index optimization
- Partitioning for large tables

### Application Optimization

- Code splitting
- Lazy loading
- Bundle optimization
- Compression

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Check database status
   docker-compose logs postgres
   
   # Test connection
   npm run db:test
   ```

2. **Redis Connection Issues**
   ```bash
   # Check Redis status
   docker-compose logs redis
   
   # Test connection
   redis-cli ping
   ```

3. **Application Performance**
   ```bash
   # Check application logs
   docker-compose logs app1
   
   # View metrics
   curl http://localhost:3000/api/metrics
   ```

### Log Locations

- Application logs: `docker-compose logs app1`
- Database logs: `docker-compose logs postgres`
- Nginx logs: `docker-compose logs nginx`
- System logs: `/var/log/`

### Performance Tuning

1. **Database Performance**
   - Increase `shared_buffers`
   - Tune `work_mem`
   - Enable query logging

2. **Redis Performance**
   - Increase `maxmemory`
   - Configure `maxmemory-policy`
   - Enable persistence

3. **Application Performance**
   - Increase worker processes
   - Tune connection pools
   - Enable compression

## 🔄 Backup & Recovery

### Database Backup

```bash
# Manual backup
docker-compose exec postgres pg_dump -U etl_user etl_database > backup.sql

# Automated backup (configured in docker-compose.yml)
# Daily at 2 AM
```

### Recovery

```bash
# Restore from backup
docker-compose exec -T postgres psql -U etl_user etl_database < backup.sql
```

### Disaster Recovery

1. **Backup Strategy**
   - Daily full backups
   - Hourly incremental backups
   - Off-site storage

2. **Recovery Procedure**
   - Restore database
   - Update DNS
   - Scale services
   - Verify functionality

## 📞 Support & Maintenance

### Regular Maintenance

- **Weekly**: Review performance metrics
- **Monthly**: Security updates
- **Quarterly**: Capacity planning
- **Annually**: Disaster recovery testing

### Monitoring Alerts

Configure alerts for:
- High CPU/memory usage
- Database connection failures
- Job execution failures
- Security incidents

### Performance Baseline

Key performance indicators:
- Response time: < 500ms
- Database query time: < 100ms
- Job success rate: > 95%
- System availability: > 99.9%

## 🎯 Scaling Guidelines

### Horizontal Scaling

1. **Application Instances**
   - Add more app containers
   - Update load balancer configuration
   - Scale database connections

2. **Database Scaling**
   - Read replicas
   - Connection pooling
   - Query optimization

3. **Cache Scaling**
   - Redis clustering
   - Cache distribution
   - Invalidation strategy

### Vertical Scaling

1. **Resource Allocation**
   - Increase CPU/memory limits
   - Tune JVM settings
   - Optimize database parameters

2. **Performance Tuning**
   - Database optimization
   - Code optimization
   - Network optimization