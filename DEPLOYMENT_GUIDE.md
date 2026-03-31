# GitHub & Deployment Guide

## 1️⃣ GITHUB SETUP

### Step 1: Initialize Git (if not done)
```bash
cd c:\Users\RAJ MAURYA\Downloads\project-bolt-sb1-pjpzfvkl\2
git init
git config user.name "Your Name"
git config user.email "your@email.com"
```

### Step 2: Create .gitignore
```bash
# Copy the example below and save as .gitignore in repo root
node_modules/
dist/
build/
.env
.env.local
.env.*.local
*.log
.DS_Store
```

### Step 3: Stage and Commit
```bash
git add .
git commit -m "Initial commit: Emergency Gas Connect - Unified Dashboard with Live Data"
```

### Step 4: Add GitHub Remote
```bash
git remote add origin https://github.com/YOUR-USERNAME/emergency-gas-connect.git
git branch -M main
git push -u origin main
```

---

## 2️⃣ PRODUCTION ENVIRONMENT SETUP

### Backend (.env)
```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/emergency-gas?retryWrites=true&w=majority

# Server
PORT=5002
NODE_ENV=production

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Socket.IO
SOCKET_CORS=http://yourdomain.com,https://yourdomain.com
```

### Frontend (.env)
```bash
VITE_API_URL=https://api.yourdomain.com/api/v1
VITE_SOCKET_URL=https://api.yourdomain.com
VITE_APP_NAME=Emergency Gas Connect
```

---

## 3️⃣ DOCKER DEPLOYMENT

### Build Images
```bash
# Backend
cd backend
docker build -t emergency-gas-backend:latest .

# Frontend
cd ../frontend
docker build -t emergency-gas-frontend:latest .
```

### Run with Docker Compose
```bash
cd ..
docker-compose up -d
```

### Verify Services
```bash
docker-compose ps
curl http://localhost:5002/api/v1/health
curl http://localhost:5173
```

---

## 4️⃣ DEPLOYMENT PLATFORMS

### Option A: Railway.app (Easiest)
1. Connect GitHub repo
2. Add MongoDB connection
3. Set environment variables
4. Auto-deploy on push

### Option B: Heroku
```bash
# Install Heroku CLI
# Login
heroku login

# Create apps
heroku create emergency-gas-backend
heroku create emergency-gas-frontend

# Set config vars
heroku config:set MONGODB_URI=... --app emergency-gas-backend
heroku config:set JWT_SECRET=... --app emergency-gas-backend

# Deploy
git push heroku main
```

### Option C: AWS EC2 + Docker
1. Launch EC2 instance
2. Install Docker & Docker Compose
3. Clone repo: `git clone https://github.com/YOUR-USERNAME/emergency-gas-connect.git`
4. Create .env files
5. Run: `docker-compose up -d`
6. Setup Nginx reverse proxy on port 80/443

### Option D: Azure App Service
1. Create resource group
2. Create App Service Plan
3. Deploy from GitHub (auto CI/CD)
4. Configure environment variables

---

## 5️⃣ DATABASE DEPLOYMENT

### MongoDB Atlas (Free Tier)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create cluster (M0 free tier)
4. Create database user
5. Whitelist IP address (0.0.0.0/0 for development)
6. Copy connection string
7. Format: `mongodb+srv://user:password@cluster.mongodb.net/emergency-gas`

---

## 6️⃣ PRE-DEPLOYMENT CHECKLIST

### Backend
- [ ] All environment variables set in `.env`
- [ ] Database connection tested
- [ ] JWT secret configured (32+ chars)
- [ ] CORS settings match frontend domain
- [ ] Rate limiter configured
- [ ] Socket.IO CORS configured
- [ ] Twilio credentials (if SMS enabled)

### Frontend
- [ ] API URL points to production backend
- [ ] Socket.IO URL configured
- [ ] Auth tokens clear on logout
- [ ] Error tracking setup (optional)
- [ ] Build succeeds: `npm run build`

### General
- [ ] Database backups enabled
- [ ] SSL certificate installed (https)
- [ ] Domain DNS configured
- [ ] Monitoring/alerts setup
- [ ] Logs aggregation setup

---

## 7️⃣ DEPLOYMENT COMMANDS

### Quick Deployment Script
```bash
#!/bin/bash

echo "🚀 Starting deployment..."

# Pull latest code
git pull origin main

# Build backend
cd backend
npm install
npm run build
docker build -t emergency-gas-backend:latest .

# Build frontend
cd ../frontend
npm install
npm run build
docker build -t emergency-gas-frontend:latest .

# Deploy
cd ..
docker-compose down
docker-compose up -d

echo "✅ Deployment complete!"
docker-compose ps
```

Save as `deploy.sh` and run: `bash deploy.sh`

---

## 8️⃣ MONITORING & LOGS

```bash
# View running containers
docker ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Check MongoDB connection
mongosh "mongodb+srv://user:password@cluster.mongodb.net/emergency-gas"

# Backend health check
curl http://localhost:5002/api/v1/health

# Monitor Docker usage
docker stats
```

---

## 9️⃣ PRODUCTION FEATURES ENABLED

✅ Live Data Service - Real-time Dashboard for all roles
✅ Socket.IO - Real-time notifications & updates
✅ Rate Limiting - 30 req/min for `/live` endpoints
✅ Authentication - JWT token-based
✅ Geospatial Queries - Nearby requests (with fallback)
✅ Error Handling - Comprehensive error responses
✅ Auto-refresh - 60sec polling + socket updates
✅ Debounced Updates - Prevents rate limit hits

---

## 🔟 POST-DEPLOYMENT TASKS

1. **Verify Endpoints**
   - POST /api/v1/auth/register
   - GET /api/v1/live/me
   - PUT /api/v1/requests/{id}/accept
   - PUT /api/v1/requests/{id}/complete

2. **Test Dashboard**
   - Login as Provider → View dashboard
   - Login as Helper → View dashboard
   - Login as Seeker → View dashboard

3. **Monitor Logs**
   - Backend errors
   - Database connection issues
   - Socket.IO connections

4. **Security Audit**
   - Check CORS whitelist
   - Verify JWT secret
   - Rate limiter working
   - No sensitive data in logs

---

## Quick Links

- **GitHub**: https://github.com/YOUR-USERNAME/emergency-gas-connect
- **Backend**: https://api.yourdomain.com/api/v1
- **Frontend**: https://yourdomain.com
- **MongoDB Atlas**: https://cloud.mongodb.com
- **Docker Docs**: https://docs.docker.com

