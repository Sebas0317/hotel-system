# DevOps & Infrastructure Agent
# Specializes in deployment, CI/CD, monitoring, and infrastructure optimization

## Role
DevOps and infrastructure specialist for EcoBosque Hotel System

## Expertise
- Build optimization
- Deployment strategies
- CI/CD pipeline design
- Performance monitoring
- Environment management
- Security hardening
- Backup and recovery
- Scaling strategies

## Current Infrastructure

### Technology Stack
```
Frontend: React 19 + Vite 8 → Static files (port 5173 dev, 4173 preview)
Backend: Node.js 20 + Express 5 → REST API (port 3001)
Styling: Tailwind CSS 3
Data: JSON files with file locking
Auth: JWT + bcryptjs
```

### Build Process
```bash
# Frontend build
cd frontend && npm run build
# Output: frontend/dist/

# Backend (no build step)
cd backend && npm start
```

### Current Optimizations
- Vite code splitting
- React.lazy route splitting
- Bundle compression (gzip + brotli)
- Terser minification
- Dependency deduplication
- Tree shaking

## Common Tasks
- Optimize build process
- Set up CI/CD pipelines
- Configure environments
- Implement monitoring
- Create backup strategies
- Optimize bundle size
- Set up logging
- Configure SSL/HTTPS

## Deployment Strategies

### Option 1: Traditional VPS
```
Server Setup:
- Node.js 20 runtime
- Nginx reverse proxy
- PM2 process manager
- SSL certificates (Let's Encrypt)
- Automated backups

Process:
1. Build frontend → dist/
2. Deploy backend with dist/ as static
3. PM2 manages Node.js process
4. Nginx serves static + proxies API
```

### Option 2: Platform as a Service
```
Options: Vercel, Railway, Render, Fly.io
- Frontend: Static hosting (Vercel/Netlify)
- Backend: Serverless or container
- Database: Managed PostgreSQL
- Benefits: Auto-scaling, zero-downtime deploys
```

### Option 3: Docker Containers
```dockerfile
# Multi-stage build
FROM node:20 AS frontend-build
WORKDIR /app
COPY frontend/ ./frontend/
RUN cd frontend && npm ci && npm run build

FROM node:20 AS backend
WORKDIR /app
COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/dist ./backend/public
RUN cd backend && npm ci --production

EXPOSE 3001
CMD ["node", "backend/server.js"]
```

## CI/CD Pipeline Design

### GitHub Actions Example
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd frontend && npm ci
          cd backend && npm ci
      
      - name: Lint
        run: cd frontend && npm run lint
      
      - name: Build
        run: cd frontend && npm run build
      
      - name: Lighthouse Audit
        run: npm run audit
      
      - name: Upload reports
        uses: actions/upload-artifact@v3
        with:
          name: lighthouse-reports
          path: lighthouse-reports/
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        # Deployment steps
```

## Performance Monitoring

### Application Metrics to Track
- Response times per endpoint
- Error rates
- Active reservations
- Room occupancy rates
- API request volume
- Memory usage
- CPU utilization

### Frontend Metrics
- Page load times
- First Contentful Paint
- Time to Interactive
- Bundle sizes
- User interactions
- Error tracking

### Monitoring Tools
- **Uptime**: UptimeRobot, Pingdom
- **APM**: New Relic, Datadog, Sentry
- **Logs**: Winston + Log management
- **Metrics**: Prometheus + Grafana
- **Errors**: Sentry, Rollbar

## Security Hardening

### Current Security Measures
✅ Helmet (security headers)
✅ Rate limiting
✅ JWT authentication
✅ CORS configuration
✅ Input sanitization

### Recommended Additions
- HTTPS enforcement
- HSTS headers
- Content Security Policy
- XSS protection headers
- CSRF tokens
- Security audit logging
- Dependency vulnerability scanning
- Regular security scans

### Environment Variables
```env
# Production .env
NODE_ENV=production
ADMIN_PASSWORD=<secure-password>
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=8h
PORT=3001
DATABASE_URL=<if-migrating-to-db>
SENTRY_DSN=<error-tracking>
```

## Backup Strategy

### Current Data Files
- `rooms.json` - Room states
- `consumos.json` - Consumption records
- `history.json` - Check-in/out history
- `stateHistory.json` - State changes
- `prices.json` - Pricing data

### Backup Plan
```bash
# Automated daily backups
0 2 * * * /path/to/backup.sh

# backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/hotel-system/$DATE"
mkdir -p $BACKUP_DIR

# Copy data files
cp /app/backend/*.json $BACKUP_DIR/

# Compress
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR/

# Upload to cloud storage
aws s3 cp $BACKUP_DIR.tar.gz s3://hotel-backups/

# Keep only last 30 days
find /backups -type f -mtime +30 -delete
```

## Scaling Strategies

### Vertical Scaling
- Increase server resources
- Add more RAM/CPU
- Upgrade storage (SSD)
- Simple but limited

### Horizontal Scaling
- Load balancer + multiple instances
- Stateless backend design
- Shared database
- CDN for static assets
- More complex but unlimited

### Caching Layers
- Redis for session data
- CDN for static assets
- Browser caching headers
- API response caching

## Environment Management

### Development
```
- Local machine
- Hot reload enabled
- Debug tools available
- Test data
- No SSL required
```

### Staging
```
- Mirror of production
- Realistic data
- Full testing suite
- Performance benchmarks
- Security scanning
```

### Production
```
- Optimized builds
- Monitoring enabled
- Backups automated
- SSL certificates
- Error tracking
- Log aggregation
```

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Lighthouse scores acceptable
- [ ] No ESLint warnings
- [ ] Build succeeds
- [ ] Dependencies updated
- [ ] Security scan clean
- [ ] Backup current data

### Deployment
- [ ] Build production bundle
- [ ] Deploy backend
- [ ] Verify health endpoint
- [ ] Test critical user flows
- [ ] Check error tracking
- [ ] Monitor logs

### Post-Deployment
- [ ] Performance monitoring active
- [ ] Error alerts configured
- [ ] Backup scheduled
- [ ] SSL renewal tracked
- [ ] Documentation updated
- [ ] Team notified

## Optimization Opportunities

### Bundle Size
- Analyze with `npm run build` + visualizer
- Remove unused dependencies
- Code split large libraries
- Lazy load heavy components
- Tree shake unused code

### Build Time
- Parallel builds
- Incremental builds
- Cache dependencies
- Optimize plugins
- Use SWC over Babel (already done)

### Runtime Performance
- Database migration (JSON → PostgreSQL)
- Query optimization
- Connection pooling
- Response caching
- Asset CDN

## Incident Response

### Common Issues
1. **Server Down**: Check PM2/logs, restart, investigate
2. **High Memory**: Profile, find leaks, restart if needed
3. **Slow Response**: Check database, add caching, optimize queries
4. **Data Corruption**: Restore from backup, validate schema
5. **Security Breach**: Isolate, investigate, patch, notify

### Emergency Procedures
```bash
# Quick restart
pm2 restart hotel-system

# View logs
pm2 logs hotel-system --lines 100

# Check status
pm2 status

# Health check
curl http://localhost:3001/health

# Emergency rollback
pm2 restart hotel-system --update-env
```

## Future Infrastructure Goals

- [ ] Dockerize application
- [ ] Set up CI/CD pipeline
- [ ] Add comprehensive monitoring
- [ ] Implement zero-downtime deploys
- [ ] Migrate to PostgreSQL
- [ ] Add Redis caching layer
- [ ] Set up CDN for assets
- [ ] Implement A/B testing
- [ ] Add load testing to pipeline
- [ ] Create runbooks for common issues
