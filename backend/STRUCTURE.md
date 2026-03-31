# Backend Project Structure

## Complete File Tree

```
backend/
│
├── src/
│   ├── config/
│   │   ├── index.ts                 # Main config from env variables
│   │   └── database.ts              # MongoDB connection setup
│   │
│   ├── controllers/
│   │   ├── AuthController.ts        # Registration, login, auth handlers
│   │   ├── ProfileController.ts     # User profile management
│   │   ├── EmergencyRequestController.ts  # Gas request handlers
│   │   ├── ProviderController.ts    # Provider management
│   │   ├── MessageController.ts     # Real-time messaging
│   │   └── RatingController.ts      # Rating and review system
│   │
│   ├── middleware/
│   │   ├── auth.ts                  # JWT authentication & role-based access
│   │   ├── errorHandler.ts          # Global error handling
│   │   ├── validation.ts            # Input validation middleware
│   │   ├── idValidation.ts          # MongoDB ObjectId validation
│   │   └── index.ts                 # Logger & async handler wrapper
│   │
│   ├── models/
│   │   ├── User.ts                  # User schema & auth
│   │   ├── Profile.ts               # User profile with location
│   │   ├── Provider.ts              # Gas provider details
│   │   ├── EmergencyRequest.ts      # Emergency request tracking
│   │   ├── Message.ts               # Chat messages
│   │   ├── Rating.ts                # User & provider ratings
│   │   └── Notification.ts          # System notifications
│   │
│   ├── routes/
│   │   ├── auth.ts                  # Auth endpoints
│   │   ├── profile.ts               # Profile endpoints
│   │   ├── requests.ts              # Emergency request endpoints
│   │   ├── providers.ts             # Provider endpoints
│   │   ├── messages.ts              # Message endpoints
│   │   └── ratings.ts               # Rating endpoints
│   │
│   ├── services/
│   │   ├── AuthService.ts           # Authentication logic
│   │   ├── ProfileService.ts        # Profile business logic
│   │   ├── ProviderService.ts       # Provider logic
│   │   ├── EmergencyRequestService.ts   # Request handling logic
│   │   ├── MessageService.ts        # Message logic
│   │   ├── RatingService.ts         # Rating logic
│   │   └── NotificationService.ts   # Notification logic
│   │
│   ├── socket/
│   │   └── handlers.ts              # Socket.io event handlers
│   │
│   ├── types/
│   │   └── index.ts                 # TypeScript interfaces & types
│   │
│   ├── utils/
│   │   ├── jwt.ts                   # JWT token generation & verification
│   │   ├── response.ts              # Response formatting utilities
│   │   ├── distance.ts              # Haversine distance calculation
│   │   └── validation.ts            # Input validation utilities
│   │
│   └── server.ts                    # Main Express server setup
│
├── Configuration Files
│   ├── package.json                 # Dependencies & scripts
│   ├── tsconfig.json                # TypeScript configuration
│   ├── .eslintrc.json               # ESLint rules
│   ├── nodemon.json                 # Development watch config
│   └── .env.example                 # Environment variables template
│
├── Docker & Deployment
│   ├── Dockerfile                   # Container configuration
│   ├── docker-compose.yml           # Docker Compose setup
│   ├── setup.sh                     # Initial setup script
│   └── Makefile                     # Common commands
│
├── Documentation
│   ├── README.md                    # Full documentation
│   ├── QUICKSTART.md                # 5-minute setup guide
│   ├── API.md                       # Complete API documentation
│   ├── DEPLOYMENT.md                # Production deployment guide
│   └── STRUCTURE.md                 # This file
│
└── .gitignore                       # Git ignore rules
```

## File Descriptions

### Core Server Files

**src/server.ts**
- Express app initialization
- Socket.io setup
- Middleware configuration
- Route mounting
- Error handling setup
- Database connection
- Graceful shutdown

### Configuration

**src/config/index.ts**
- Loads all env variables
- Type-safe config object
- Centralized configuration

**src/config/database.ts**
- MongoDB connection
- Connection pooling
- Error handling

### Authentication & Security

**src/middleware/auth.ts**
- JWT verification
- Role-based access control
- Optional authentication
- Token extraction from headers

**src/middleware/errorHandler.ts**
- Global error catching
- Standardized error responses
- Custom error classes

**src/utils/jwt.ts**
- Token generation
- Token verification
- Refresh token handling

### Models (Database Schemas)

**User Model** (src/models/User.ts)
- Email, password, role
- Email verification
- Last login tracking
- Password hashing with bcryptjs

**Profile Model** (src/models/Profile.ts)
- User details, phone, location
- GeoJSON for mapping
- Verification status
- Rating aggregation

**Provider Model** (src/models/Provider.ts)
- Business details
- License management
- Geolocation
- Rating system

**EmergencyRequest Model** (src/models/EmergencyRequest.ts)
- Request tracking
- Status management
- Location data
- Rating & review

**Message Model** (src/models/Message.ts)
- Chat messages
- Message read status
- Message attachments
- Timestamps

**Rating Model** (src/models/Rating.ts)
- 1-5 star ratings
- User to user
- User to provider
- Review text

**Notification Model** (src/models/Notification.ts)
- System alerts
- Request updates
- Message notifications
- Read status

### Business Logic (Services)

Each service handles:
- Database operations
- Business rule enforcement
- Error handling
- Data transformation

Services:
- `AuthService` - User registration, login, token refresh
- `ProfileService` - Profile CRUD, location, availability
- `ProviderService` - Provider CRUD, geolocation search, verification
- `EmergencyRequestService` - Request lifecycle, stats
- `MessageService` - Message CRUD, read status
- `RatingService` - Rating CRUD, averages
- `NotificationService` - Notification system

### HTTP Handlers (Controllers)

Controllers receive requests and:
- Validate input (via middleware)
- Call services
- Format responses
- Handle errors

Each controller has corresponding validation rules.

### API Routes

Routes define:
- HTTP methods and paths
- Route-level authentication
- Request validation
- Controller method mapping

Routes are organized by feature (auth, profile, requests, etc.).

### Real-time Communication

**src/socket/handlers.ts**
- Socket.io event handlers
- Chat room management
- Real-time notifications
- Location updates
- Typing indicators
- Online/offline status

### Utilities

**jwt.ts** - Token operations
**response.ts** - Response formatting (success, error, paginated)
**distance.ts** - Distance calculation, nearby search
**validation.ts** - Input validation helpers

## Data Flow

### Authentication Flow
1. User submits credentials
2. AuthController receives request
3. Service validates & creates user
4. JWT tokens generated
5. Response sent with tokens

### Emergency Request Flow
1. User creates request
2. EmergencyRequestController handles it
3. Service creates database record
4. Socket notifies nearby helpers
5. Helpers can accept request
6. Real-time chat via Socket.io
7. Rating system after completion

### Message Flow
1. Socket.io connects user
2. User joins request room
3. message:send event sent
4. MessageService saves to DB
5. Socket broadcasts to room
6. Notification sent to receiver
7. Read status tracked

## Key Design Patterns

### MVC Pattern
- **Models**: Mongoose schemas in `models/`
- **Views**: JSON responses (no templates)
- **Controllers**: `controllers/` handle requests

### Service Layer Pattern
- Controllers → Services → Database
- Business logic separated from HTTP
- Reusable across controllers

### Middleware Chain
- Authentication → Validation → Route Handler → Error Handler

### Event-Driven
- Socket.io for real-time events
- Notification service for alerts

## Database Indexes

GeoJSON indexes for location queries:
- `Profile.location` (2dsphere)
- `Provider.location` (2dsphere)
- `EmergencyRequest.location` (2dsphere)

Compound indexes for common queries:
- User email (unique)
- Request status + date
- Message receiver + read status

## Error Handling Strategy

1. **Validation Errors** (400) - Input validation failures
2. **Authentication Errors** (401) - Missing/invalid token
3. **Authorization Errors** (403) - Insufficient permissions
4. **Not Found Errors** (404) - Resource doesn't exist
5. **Server Errors** (500) - Unexpected errors

All errors follow standardized format with status codes and messages.

## Security Features

- JWT authentication
- Password hashing (bcryptjs)
- Role-based access control
- Input validation
- CORS configuration
- Helmet for HTTP headers
- MongoDB injection prevention
- Rate limiting support

## Performance Optimizations

- IndexedDB indexes
- Pagination support
- Response compression
- Connection pooling
- GeoJSON queries optimized
- Async/await for non-blocking operations

## Testing Architecture

- Services can be unit tested independently
- Controllers can be tested with mocked services
- Integration tests can use test database
- Socket events can be tested separately

## Production Considerations

- Environment variables for all secrets
- Graceful shutdown handling
- Error logging capability
- Health check endpoint
- Database backup strategy
- Horizontal scaling support
- Monitoring hooks

## Future Extensions

- Email notifications
- SMS alerts
- Push notifications
- Payment integration
- Admin dashboard
- Analytics
- Machine learning for matching
- Subscription plans
- Mobile app support
