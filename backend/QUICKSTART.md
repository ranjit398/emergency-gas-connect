# Emergency Gas Backend - Quick Start Guide

## 5-Minute Setup

### Prerequisites
- Node.js 16+ installed
- MongoDB running locally or MongoDB Atlas account
- Git

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Configure Environment
```bash
cp .env.example .env
```

Edit `.env` and update:
- `MONGODB_URI` - your MongoDB connection string
- `JWT_SECRET` - change to unique strong secret

### Step 3: Run Development Server
```bash
npm run dev
```

You should see:
```
✓ MongoDB connected successfully
✓ Server running on http://localhost:5000
```

### Step 4: Test the API
```bash
# Health check
curl http://localhost:5000/health

# Register a user
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User",
    "phone": "9876543210",
    "role": "seeker",
    "latitude": 28.7041,
    "longitude": 77.1025,
    "address": "Delhi, India"
  }'
```

## Docker Setup (Recommended for dev)

### Option 1: Docker Compose (Easiest)
```bash
docker-compose up
```

This starts:
- MongoDB on port 27017
- Backend on port 5000
- MongoDB UI on port 8081 (http://localhost:8081)

### Option 2: Manual Docker
```bash
# Build image
docker build -t emergency-gas-backend:latest .

# Run container
docker run -p 5000:5000 --env-file .env emergency-gas-backend:latest
```

## Development Workflow

### Start development
```bash
npm run dev
```

### Build for production
```bash
npm run build
npm start
```

### Lint code
```bash
npm run lint
npm run lint:fix
```

## Project Structure Quick Reference

```
src/
├── config/           - Configuration & database connection
├── controllers/      - HTTP request handlers
├── middleware/       - Express middleware (auth, validation, errors)
├── models/          - MongoDB schemas (Mongoose)
├── routes/          - API route definitions
├── services/        - Business logic layer
├── socket/          - Socket.io real-time handlers
├── types/           - TypeScript type definitions
├── utils/           - Helper utilities (JWT, validation, distance)
└── server.ts        - Main Express server setup
```

## Key Files

- **server.ts** - Starts Express app, Socket.io, connects to MongoDB
- **config/database.ts** - MongoDB connection logic
- **config/index.ts** - All environment configuration
- **middleware/auth.ts** - JWT authentication middleware
- **models/*.ts** - Database schemas
- **services/*.ts** - Business logic for each feature
- **controllers/*.ts** - Request/response handlers
- **routes/*.ts** - API endpoint definitions

## Common Tasks

### Test an API Endpoint
```bash
# Get profile (requires token from login)
curl -X GET http://localhost:5000/api/v1/profile \
  -H "Authorization: Bearer <your_token>"
```

### Check Database
With Docker Compose, access MongoDB UI at `http://localhost:8081`

### View Server Logs
```bash
# If using npm dev
# Logs appear in terminal

# If using Docker Compose
docker-compose logs -f backend
```

### Reset Database
```bash
# With Docker Compose
docker-compose down -v  # -v removes volumes

# Local MongoDB
mongosh
use emergency-gas
db.dropDatabase()
```

## API Documentation

Full API docs available in [API.md](./API.md)

**Quick Examples:**

1. **Register**: `POST /api/v1/auth/register`
2. **Login**: `POST /api/v1/auth/login`
3. **Create Request**: `POST /api/v1/requests`
4. **Get Nearby Helpers**: `GET /api/v1/profile/nearby-helpers?latitude=28.7041&longitude=77.1025`
5. **Send Message**: `POST /api/v1/messages`

## Socket.io Usage

Real-time features are enabled through Socket.io:

```javascript
// Connect from frontend
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your_jwt_token'
  }
});

// Join request room for chat
socket.emit('join:request', requestId);

// Send message
socket.emit('message:send', {
  requestId,
  receiverId,
  content: 'Hello'
});

// Listen for messages
socket.on('message:new', (message) => {
  console.log('New message:', message);
});
```

## Environment Variables Explained

```
NODE_ENV           - development/production
PORT               - Server port (default 5000)
MONGODB_URI        - MongoDB connection string
JWT_SECRET         - Secret for JWT signing (CHANGE THIS!)
JWT_EXPIRY         - Token expiry time (default 7d)
CORS_ORIGIN        - Comma-separated allowed origins
LOG_LEVEL          - debug/info/warn/error
```

## Troubleshooting

### "Address already in use" Error
```bash
# Kill process on port 5000
lsof -i :5000
kill -9 <PID>

# Or change PORT in .env
```

### MongoDB Connection Failed
```bash
# Start MongoDB locally
mongod

# Or use Docker
docker run -d -p 27017:27017 mongo:6.0
```

### Typescript Errors
```bash
# Clean and rebuild
rm -rf dist
npm run build
```

## Next Steps

1. ✅ Server is running
2. ✅ Database is connected
3. Read [API.md](./API.md) for full API documentation
4. Check [Deployment docs](./DEPLOYMENT.md) for production setup
5. Integrate with frontend (point to `http://localhost:5000`)

## Frontend Integration

Update your frontend `.env`:
```
VITE_API_URL=http://localhost:5000/api/v1
VITE_WS_URL=http://localhost:5000
```

## Support

- Check logs for errors
- Review [README.md](./README.md) for full documentation
- Check API.md for endpoint details
- Visit /health endpoint to verify server is running

Happy coding! 🚀
