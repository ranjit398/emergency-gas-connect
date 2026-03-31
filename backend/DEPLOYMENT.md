# Emergency Gas Backend - Deployment Guide

## Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server
CMD ["node", "dist/server.js"]
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: emergency-gas-db
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongodb_data:/data/db
    networks:
      - emergency-gas-network

  backend:
    build: .
    container_name: emergency-gas-backend
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      PORT: 5000
      MONGODB_URI: mongodb://admin:password@mongodb:27017/emergency-gas
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: ${CORS_ORIGIN}
    depends_on:
      - mongodb
    networks:
      - emergency-gas-network
    restart: unless-stopped

volumes:
  mongodb_data:

networks:
  emergency-gas-network:
    driver: bridge
```

### Build and Run

```bash
# Build Docker image
docker build -t emergency-gas-backend:latest .

# Run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## Cloud Deployment

### AWS EC2

1. Launch EC2 instance (Ubuntu 20.04)
2. Install Node.js and MongoDB
3. Clone repository
4. Install dependencies: `npm install`
5. Build: `npm run build`
6. Use PM2 for process management
7. Set up Nginx as reverse proxy
8. Configure SSL with Let's Encrypt

### Heroku

```bash
# Create Procfile
echo "web: npm start" > Procfile

# Deploy
heroku create emergency-gas-backend
git push heroku main
```

### Railway

1. Connect GitHub repository
2. Set environment variables
3. Railway automatically deploys
4. Configure custom domain

### DigitalOcean App Platform

1. Connect GitHub repo
2. Create app.yaml:

```yaml
name: emergency-gas
services:
- name: api
  github:
    repo: your-repo
    branch: main
  build_command: npm install && npm run build
  run_command: npm start
  envs:
  - key: NODE_ENV
    value: production
databases:
- name: db
  engine: MONGODB
```

## Environment Setup

### Production .env
```
NODE_ENV=production
PORT=5000
API_URL=https://api.emergencygas.com

MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/emergency-gas
JWT_SECRET=<generate-strong-secret>
JWT_EXPIRY=7d

CORS_ORIGIN=https://emergencygas.com,https://www.emergencygas.com

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@emergencygas.com
SMTP_PASSWORD=<app-password>

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_S3_BUCKET=emergency-gas-prod

LOG_LEVEL=info
DEFAULT_PAGE_SIZE=20
RATE_LIMIT_MAX_REQUESTS=100
```

## CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Build
        run: npm run build
      
      - name: Deploy to production
        run: npm deploy
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
```

## Monitoring & Logging

### PM2 Monitoring

```bash
npm install -g pm2
pm2 start dist/server.js --name "emergency-gas"
pm2 save
pm2 startup
pm2 monit
```

### AWS CloudWatch

```bash
npm install aws-sdk
```

### Error Tracking (Sentry)

```bash
npm install @sentry/node
```

## Database Maintenance

### MongoDB Atlas

1. Enable automated backups
2. Set up IP whitelist
3. Monitor connection count
4. Enable database auditing

### Backup Strategy

```bash
# Local backup
mongodump --uri "mongodb://localhost:27017/emergency-gas" --out ./backup

# Restore
mongorestore --uri "mongodb://localhost:27017" ./backup
```

## Performance Optimization

### Load Balancing

Use Nginx as reverse proxy:

```nginx
upstream backend {
    server localhost:5000;
    server localhost:5001;
    server localhost:5002;
}

server {
    listen 443 ssl http2;
    server_name api.emergencygas.com;
    
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Caching Strategy

- Redis for session storage
- API response caching
- Database query caching

## Security Hardening

1. Enable WAF (Web Application Firewall)
2. Use SSL/TLS with HSTS
3. Implement rate limiting
4. Enable CSRF protection
5. Regular security audits
6. Dependency scanning
7. Code security scanning

## Scaling Strategy

### Horizontal Scaling
- Load balancer (Nginx/AWS ALB)
- Multiple server instances
- Shared MongoDB database

### Vertical Scaling
- Increase server resources
- Database optimization
- Caching layers

### Database Optimization
- Index optimization
- Query optimization
- Sharding (if needed)

## Cost Optimization

1. Use managed services (AWS RDS, MongoDB Atlas)
2. Auto-scaling groups
3. Spot instances for non-critical workloads
4. Content delivery network (CloudFront)
5. Reserved instances for predictable load

## Rollback Strategy

```bash
# Keep last 3 deployments
# Automated rollback on deployment failure
# Database migration versioning
```
