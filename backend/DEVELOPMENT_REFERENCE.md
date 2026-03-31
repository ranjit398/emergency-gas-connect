# Backend Development Quick Reference

## Project Structure
```
backend/
├── src/
│   ├── server.ts                 # Express + Socket.IO setup
│   ├── config/                   # Configuration (database, JWT, etc.)
│   ├── controllers/              # Request handlers (HTTP layer)
│   ├── services/                 # Business logic (application layer)
│   ├── models/                   # Data schemas (data layer)
│   ├── routes/                   # API route definitions
│   ├── middleware/               # Authentication, validation, error handling
│   ├── types/                    # TypeScript interfaces
│   └── utils/                    # Helper functions, validators, response formatting
├── logs/                         # Application logs
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
└── PRODUCTION_GUIDE.md           # Complete production documentation
```

## Quick Commands

```bash
# Development
npm run dev              # Start with hot reload

# Building
npm run build            # Compile TypeScript
npm run lint             # Check code quality
npm run lint:fix         # Auto-fix lint issues

# Production
npm run start            # Start production server

# Testing (when available)
npm run test             # Run tests
npm test:watch           # Watch mode
```

## API Response Pattern

Every API response follows this contract:

```typescript
// Success
{
  success: true,
  data: {...},           // Optional
  message: "..."         // Optional
}

// Error
{
  success: false,
  error: {
    statusCode: 400,
    message: "...",
    code: "ERROR_CODE"
  }
}

// Paginated
{
  success: true,
  data: [...],
  pagination: {
    page: 1,
    limit: 20,
    total: 150,
    pages: 8,
    hasNextPage: true,
    hasPrevPage: false
  }
}
```

## Common Patterns

### Creating a New Endpoint

#### 1. Add Validation (`src/utils/validators.ts`)
```typescript
export const validateMyEndpoint = () => [
  body('field1').isLength({ min: 1 }).withMessage('Field required'),
  body('field2').isInt({ min: 1 }).withMessage('Must be positive number'),
];
```

#### 2. Add Route (`src/routes/myroute.ts`)
```typescript
router.post(
  '/',
  authMiddleware,
  validate(validateMyEndpoint()),
  controller.myEndpoint
);
```

#### 3. Add Controller Method (`src/controllers/MyController.ts`)
```typescript
/**
 * Endpoint description
 * POST /api/endpoint
 */
myEndpoint = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.doSomething(req.body);
  res.status(201).json(success(result, 'Success message'));
});
```

#### 4. Add Service Method (`src/services/MyService.ts`)
```typescript
/**
 * Do something with data
 * @param data - Input data
 * @returns Result
 * @throws ValidationError if invalid
 */
async doSomething(data: any): Promise<any> {
  // Validate
  if (!data) throw new ValidationError('Data required');
  
  // Process
  const result = await Model.create(data);
  
  return result;
}
```

### Error Handling

```typescript
import {
  ValidationError,        // 400 - Invalid input
  NotFoundError,         // 404 - Resource not found
  UnauthorizedError,     // 401 - Auth failed
  ForbiddenError,        // 403 - Permission denied
  ConflictError,         // 409 - Resource conflict
  ServerError            // 500 - Internal error
} from '@middleware/errorHandler';

// Usage
if (invalid) throw new ValidationError('Invalid data');
if (!found) throw new NotFoundError('Not found');
if (!auth) throw new UnauthorizedError('Not authenticated');
if (!allowed) throw new ForbiddenError('Not allowed');
```

### Database Queries

```typescript
// Single document
const doc = await Model.findById(id);

// Multiple with pagination
const [docs, total] = await Promise.all([
  Model.find(filter).skip(skip).limit(limit).lean(),
  Model.countDocuments(filter)
]);

// Aggregation for complex queries
const stats = await Model.aggregate([
  { $match: {...} },
  { $group: {...} }
]);

// Geospatial queries (emergency requests)
const nearby = await Model.find({
  location: {
    $near: {
      $geometry: { type: 'Point', coordinates: [lng, lat] },
      $maxDistance: 15000  // 15km in meters
    }
  }
});
```

### Real-Time Events (Socket.IO)

```typescript
// Emit event
const io = req.app.get('io');
io.emit('event_name', data);

// Emit to specific user
io.to(userId).emit('personal_event', data);

// Listen in controllers
io.on('connection', (socket) => {
  socket.on('client_event', (data) => {
    // Handle client event
    io.emit('response_event', result);
  });
});
```

## Field Validation Rules

### Emergency Request Creation
- `cylinderType`: Must be "LPG" or "CNG"
- `quantity`: Integer, 1-100
- `latitude`: Float, -90 to 90
- `longitude`: Float, -180 to 180
- `address`: String, 5-500 characters
- `message`: String (optional), max 1000 characters

### Request Completion
- `rating`: Integer (optional), 1-5
- `review`: String (optional), 10-500 characters

### Pagination
- `page`: Integer, min 1 (default: 1)
- `limit`: Integer, 1-100 (default: 20)

## Database Indexes

These should exist for performance:

```javascript
// Create in MongoDB
db.emergencyrequests.createIndex({ location: "2dsphere" });
db.emergencyrequests.createIndex({ status: 1, createdAt: -1 });
db.emergencyrequests.createIndex({ seekerId: 1 });
db.emergencyrequests.createIndex({ helperId: 1 });
db.emergencyrequests.createIndex({ providerId: 1 });

// Verify
db.emergencyrequests.getIndexes();
```

## HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Successful GET/PUT/DELETE |
| 201 | Successful POST (resource created) |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (auth failed) |
| 403 | Forbidden (permission denied) |
| 404 | Not found |
| 409 | Conflict (duplicate resource) |
| 500 | Server error |

## Debugging

### Logs
```bash
# View application logs
tail -f logs/app.log

# Filter for errors
grep "ERROR" logs/app.log

# Filter for specific endpoint
grep "POST /api/requests" logs/app.log
```

### Database
```bash
# Connect to MongoDB
mongo mongodb://localhost:27017/gasconnect

# List collections
show collections

# Count documents
db.emergencyrequests.count()

# Find pending requests
db.emergencyrequests.find({ status: "pending" })

# Analytics
db.emergencyrequests.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])
```

### Testing Endpoints
```bash
# Create request
curl -X POST http://localhost:5000/api/requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"cylinderType":"LPG","quantity":5,"latitude":40.7128,"longitude":-74.0060,"address":"NYC"}'

# Get request
curl http://localhost:5000/api/requests/ID \
  -H "Authorization: Bearer TOKEN"

# List pending
curl "http://localhost:5000/api/requests/pending?latitude=40.7128&longitude=-74.0060" \
  -H "Authorization: Bearer TOKEN"

# Accept request
curl -X PUT http://localhost:5000/api/requests/ID/accept \
  -H "Authorization: Bearer TOKEN"

# Complete request
curl -X PUT http://localhost:5000/api/requests/ID/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"rating":5,"review":"Great service"}'
```

## Environment Variables

```bash
# App
NODE_ENV=development|production
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/gasconnect

# Authentication
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRE=7d

# CORS
FRONTEND_URL=http://localhost:5173

# Logging
LOG_LEVEL=debug|info|warn|error
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: description"

# Push and create PR
git push origin feature/my-feature

# After review, merge to main
git checkout main
git pull origin main
git merge feature/my-feature
```

## Performance Tips

1. **Use `.lean()`** on read-only queries to reduce document size
2. **Parallel queries** with `Promise.all()` for dependent operations
3. **Index frequently queried fields** (status, createdAt, userId)
4. **Aggregate for complex queries** instead of multiple finds
5. **Limit/offset pagination** instead of retrieve-all approach
6. **Cache frequently accessed data** (configuration, common queries)

## Security Checklist

- [ ] Validate all inputs (validators in place)
- [ ] Authenticate users (JWT middleware)
- [ ] Authorize by role (requireRole middleware)
- [ ] Sanitize database inputs (express-mongo-sanitize)
- [ ] Use CORS appropriately (limited to frontend URL)
- [ ] Set security headers (Helmet.js)
- [ ] Implement rate limiting (configured in server)
- [ ] Use HTTPS in production
- [ ] Hash passwords (bcryptjs in AuthService)
- [ ] Validate file uploads (if applicable)

## Common Issues & Solutions

**Socket.IO events not received**
- [ ] Check Socket.IO is initialized in server.ts
- [ ] Verify io instance is attached to request: `req.app.get('io')`
- [ ] Check event names match exactly
- [ ] Verify client is connected before emitting

**Geospatial queries returning empty**
- [ ] Verify 2dsphere index exists on location field
- [ ] Check coordinates format: [longitude, latitude]
- [ ] Verify documents have valid GeoJSON location
- [ ] Use proper maxDistance calculation (in meters)

**Rate limiting blocking requests**
- [ ] Check rateLimit config in server.ts
- [ ] Verify request is coming from allowed IP
- [ ] Check response headers for rate limit info
- [ ] Increase windowMs or max if needed

**Slow database queries**
- [ ] Check query plan: `db.collection.find(...).explain("executionStats")`
- [ ] Add indexes on frequently queried fields
- [ ] Use .lean() for read-only queries
- [ ] Optimize aggregation pipelines with $match early

## Resources

- **Express**: https://expressjs.com/
- **Mongoose**: https://mongoosejs.com/
- **Socket.IO**: https://socket.io/
- **TypeScript**: https://www.typescriptlang.org/
- **JWT**: https://jwt.io/
- **Express-Validator**: https://express-validator.github.io/

---

**Last Updated**: January 2024
**Version**: 1.0.0
