# Emergency Gas Assistance Platform - Backend

A production-ready Node.js + Express backend for the Emergency Gas Assistance Platform with MongoDB, JWT authentication, role-based access control, real-time chat using Socket.io, and comprehensive API endpoints.

## Features

✅ **Authentication & Authorization**
- JWT-based authentication
- Refresh token mechanism
- Role-based access control (Seeker, Helper, Provider, Admin)

✅ **Core Functionality**
- Emergency request management
- Real-time chat with Socket.io
- Provider directory with geolocation
- Rating and review system
- User profiles with location tracking

✅ **Database**
- MongoDB with Mongoose ODM
- GeoJSON indexes for location-based queries
- Optimized indexes for performance

✅ **API Features**
- RESTful API design
- Request validation with express-validator
- Comprehensive error handling
- Pagination support
- Async/await handlers

✅ **Real-time Features**
- Socket.io for live chat
- Real-time location updates
- Typing indicators
- Online/offline status
- Real-time notifications

✅ **Security**
- Helmet for HTTP headers
- CORS enabled
- Password hashing with bcryptjs
- Environment variables for sensitive data
- Input validation and sanitization

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Express middleware
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── socket/          # Socket.io handlers
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   └── server.ts        # Main server file
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Tech Stack

- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB
- **Real-time**: Socket.io
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Security**: Helmet, CORS
- **Logger**: Morgan
- **Dev Tools**: Nodemon, ESLint

## Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0
- MongoDB >= 4.0
- Git

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and update with your values:
```bash
cp .env.example .env
```

**Important variables to configure:**
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/emergency-gas
JWT_SECRET=your_super_secret_jwt_key
CORS_ORIGIN=http://localhost:5173
```

### 4. Start MongoDB
```bash
# Linux/Mac
mongod

# Windows
"C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe"
```

### 5. Run the server
```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user

### Profile
- `GET /api/v1/profile` - Get current user profile
- `PUT /api/v1/profile` - Update profile
- `PUT /api/v1/profile/location` - Update location
- `PUT /api/v1/profile/availability` - Set availability
- `GET /api/v1/profile/nearby-helpers` - Find nearby helpers
- `GET /api/v1/profile/search` - Search profiles

### Emergency Requests
- `POST /api/v1/requests` - Create emergency request
- `GET /api/v1/requests/user` - Get user's requests
- `GET /api/v1/requests/pending` - Get pending requests nearby
- `GET /api/v1/requests/:id` - Get request details
- `PUT /api/v1/requests/:id/accept` - Accept request
- `PUT /api/v1/requests/:id/complete` - Complete request
- `PUT /api/v1/requests/:id/cancel` - Cancel request
- `GET /api/v1/requests/stats` - Get request statistics

### Providers
- `POST /api/v1/providers` - Create provider account (Provider only)
- `GET /api/v1/providers/:id` - Get provider details
- `GET /api/v1/providers/me` - Get own provider info (Provider only)
- `PUT /api/v1/providers/me` - Update provider info
- `GET /api/v1/providers/nearby` - Get nearby providers
- `GET /api/v1/providers/search` - Search providers
- `GET /api/v1/providers/top` - Get top rated providers

### Messages
- `POST /api/v1/messages` - Send message
- `GET /api/v1/messages/request/:requestId` - Get request messages
- `GET /api/v1/messages/conversation` - Get user's conversations
- `PUT /api/v1/messages/:id/mark-read` - Mark as read
- `GET /api/v1/messages/unread-count` - Get unread count
- `DELETE /api/v1/messages/:id` - Delete message

### Ratings
- `POST /api/v1/ratings` - Create rating
- `GET /api/v1/ratings/user/:userId` - Get user ratings
- `GET /api/v1/ratings/user/:userId/average` - Get average rating
- `GET /api/v1/ratings/provider/:providerId` - Get provider ratings
- `GET /api/v1/ratings/provider/:providerId/average` - Get provider average

## WebSocket Events

### Client → Server
- `join:request` - Join a request room
- `leave:request` - Leave a request room
- `message:send` - Send a message
- `message:read` - Mark message as read
- `request:accept` - Accept a request
- `request:complete` - Complete a request
- `typing:start` - User typing
- `typing:stop` - User stopped typing
- `location:update` - Update location
- `status:online` - Set online status
- `status:offline` - Set offline status

### Server → Client
- `message:new` - New message received
- `notification:message` - Message notification
- `request:accepted` - Request accepted
- `request:completed` - Request completed
- `request:status` - Request status changed
- `typing:active` - User typing
- `typing:inactive` - User stopped typing
- `location:updated` - Location updated
- `status:changed` - User status changed
- `user:disconnected` - User disconnected

## Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Error Handling

The API returns standardized error responses:

```json
{
  "success": false,
  "error": {
    "status": 400,
    "message": "Error message"
  }
}
```

## Database Models

### User
- email (unique)
- password (hashed)
- role (seeker, helper, provider, admin)
- isEmailVerified
- isActive
- lastLogin
- timestamps

### Profile
- userId (ref: User)
- fullName
- phone
- location (GeoJSON Point)
- address
- ratings
- completedRequests
- verificationStatus
- timestamps

### Provider
- userId (ref: User)
- businessName
- businessType (LPG, CNG, Both)
- location (GeoJSON Point)
- licenseNumber & expiry
- isVerified
- rating
- completedRequests
- timestamps

### EmergencyRequest
- seekerId (ref: User)
- helperId (ref: User, nullable)
- providerId (ref: Provider, nullable)
- cylinderType (LPG, CNG)
- location (GeoJSON Point)
- status (pending, accepted, completed, cancelled)
- rating & review
- timestamps

### Message
- requestId (ref: EmergencyRequest)
- senderId, receiverId (ref: User)
- content
- isRead
- timestamps

### Rating
- requestId, fromUserId, toUserId (refs)
- rating (1-5)
- review
- timestamps

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
npm run lint:fix
```

### Building
```bash
npm run build
```

## Performance Optimizations

- Database indexes on frequently queried fields
- GeoJSON indexes for location-based queries
- Pagination support for list endpoints
- Response compression with gzip
- Connection pooling with MongoDB

## Security Considerations

1. **Environment Variables**: Never commit `.env` file
2. **CORS**: Configure allowed origins in production
3. **HTTPS**: Use HTTPS in production
4. **Rate Limiting**: Implement rate limiting for API
5. **MongoDB**: Use authentication and restrict network access
6. **Secrets**: Rotate JWT secrets regularly
7. **Validation**: All inputs are validated

## Deployment

### Docker
A Dockerfile is included for containerization. Build and run:

```bash
docker build -t emergency-gas-backend .
docker run -p 5000:5000 --env-file .env emergency-gas-backend
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS
- [ ] Configure MongoDB authentication
- [ ] Set up proper CORS origins
- [ ] Enable request logging
- [ ] Set up monitoring/error tracking
- [ ] Configure backup strategy
- [ ] Use environment-specific config
- [ ] Enable rate limiting

## Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
Solution: Ensure MongoDB server is running

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
Solution: Change PORT in .env or kill process using port 5000

### JWT Authentication Error
```
Error: Authentication error
```
Solution: Ensure JWT_SECRET in .env matches the one used for signing

## Contributing

1. Create a feature branch
2. Commit changes
3. Push to the branch
4. Create a Pull Request

## License

MIT License - feel free to use this project

## Support

For issues and questions, please open an issue in the repository.

## Roadmap

- [ ] Email notifications
- [ ] SMS notifications
- [ ] Push notifications
- [ ] Payment integration
- [ ] Admin dashboard
- [ ] Analytics
- [ ] Mobile app sync
- [ ] AI-based matching
- [ ] Subscription plans
