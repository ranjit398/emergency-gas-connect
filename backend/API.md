# Emergency Gas Backend - API Documentation

## Table of Contents
1. [Authentication](#authentication)
2. [Profiles](#profiles)
3. [Emergency Requests](#emergency-requests)
4. [Providers](#providers)
5. [Messages](#messages)
6. [Ratings](#ratings)
7. [Error Responses](#error-responses)

---

## Authentication

### Register

Create a new user account.

**Request:**
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "fullName": "John Doe",
  "phone": "9876543210",
  "role": "seeker",
  "latitude": 28.7041,
  "longitude": 77.1025,
  "address": "123 Main St, Delhi"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "role": "seeker"
    },
    "profile": {
      "fullName": "John Doe",
      "phone": "9876543210",
      "address": "123 Main St, Delhi"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Registration successful"
}
```

### Login

Authenticate a user and get JWT tokens.

**Request:**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "role": "seeker"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

### Refresh Token

Get a new access token using refresh token.

**Request:**
```http
POST /api/v1/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Token refreshed"
}
```

### Logout

**Request:**
```http
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Profiles

### Get Profile

Get current user's profile.

**Request:**
```http
GET /api/v1/profile
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439010",
    "fullName": "John Doe",
    "phone": "9876543210",
    "role": "seeker",
    "avatarUrl": "https://...",
    "location": {
      "type": "Point",
      "coordinates": [77.1025, 28.7041]
    },
    "address": "123 Main St, Delhi",
    "bio": "Hey I'm a gas seeker",
    "isAvailable": true,
    "verificationStatus": "verified",
    "ratings": 4.5,
    "totalRatings": 20,
    "completedRequests": 15
  }
}
```

### Update Profile

**Request:**
```http
PUT /api/v1/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "fullName": "John Doe Updated",
  "bio": "Updated bio",
  "avatarUrl": "https://..."
}
```

### Update Location

**Request:**
```http
PUT /api/v1/profile/location
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "latitude": 28.7041,
  "longitude": 77.1025,
  "address": "New Address, Delhi"
}
```

### Set Availability

**Request:**
```http
PUT /api/v1/profile/availability
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "isAvailable": true
}
```

### Get Nearby Helpers

**Request:**
```http
GET /api/v1/profile/nearby-helpers?latitude=28.7041&longitude=77.1025&maxDistance=10
Authorization: Bearer <access_token>
```

### Search Profiles

**Request:**
```http
GET /api/v1/profile/search?query=john&role=helper
Authorization: Bearer <access_token>
```

---

## Emergency Requests

### Create Request

Create a new emergency gas request.

**Request:**
```http
POST /api/v1/requests
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "cylinderType": "LPG",
  "quantity": 1,
  "message": "Need emergency gas supply",
  "latitude": 28.7041,
  "longitude": 77.1025,
  "address": "123 Main St, Delhi"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "seekerId": "507f1f77bcf86cd799439011",
    "cylinderType": "LPG",
    "quantity": 1,
    "status": "pending",
    "message": "Need emergency gas supply",
    "location": {
      "type": "Point",
      "coordinates": [77.1025, 28.7041]
    },
    "address": "123 Main St, Delhi",
    "createdAt": "2024-03-25T10:30:00Z",
    "updatedAt": "2024-03-25T10:30:00Z"
  },
  "message": "Request created"
}
```

### Get User Requests

**Request:**
```http
GET /api/v1/requests/user?page=1&limit=20
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

### Get Pending Requests

Get nearby pending requests.

**Request:**
```http
GET /api/v1/requests/pending?latitude=28.7041&longitude=77.1025&maxDistance=15&limit=20
Authorization: Bearer <access_token>
```

### Get Request Details

**Request:**
```http
GET /api/v1/requests/:id
Authorization: Bearer <access_token>
```

### Accept Request

Helper accepts an emergency request.

**Request:**
```http
PUT /api/v1/requests/:id/accept
Authorization: Bearer <access_token>
```

### Complete Request

**Request:**
```http
PUT /api/v1/requests/:id/complete
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "rating": 5,
  "review": "Great service!"
}
```

### Cancel Request

**Request:**
```http
PUT /api/v1/requests/:id/cancel
Authorization: Bearer <access_token>
```

### Get Request Stats

**Request:**
```http
GET /api/v1/requests/stats
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pending": 2,
    "accepted": 5,
    "completed": 50,
    "cancelled": 3,
    "averageRating": 4.8
  }
}
```

---

## Providers

### Create Provider (Provider Only)

**Request:**
```http
POST /api/v1/providers
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "businessName": "Gas Hub",
  "businessType": "Both",
  "contactNumber": "9876543210",
  "registrationNumber": "REG123456",
  "licenseNumber": "LIC123456",
  "licenseExpiry": "2025-12-31",
  "latitude": 28.7041,
  "longitude": 77.1025,
  "address": "Gas Station, Delhi"
}
```

### Get Provider

**Request:**
```http
GET /api/v1/providers/:id
```

### Get My Provider (Provider Only)

**Request:**
```http
GET /api/v1/providers/me
Authorization: Bearer <access_token>
```

### Update Provider (Provider Only)

**Request:**
```http
PUT /api/v1/providers/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "businessName": "Updated Name",
  "address": "New Address"
}
```

### Get Nearby Providers

**Request:**
```http
GET /api/v1/providers/nearby?latitude=28.7041&longitude=77.1025&maxDistance=10&businessType=LPG
```

### Search Providers

**Request:**
```http
GET /api/v1/providers/search?query=gas&businessType=LPG
```

### Get Top Providers

**Request:**
```http
GET /api/v1/providers/top?limit=10
```

---

## Messages

### Send Message

**Request:**
```http
POST /api/v1/messages
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "requestId": "507f1f77bcf86cd799439012",
  "receiverId": "507f1f77bcf86cd799439013",
  "content": "I'm on my way",
  "attachments": []
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "requestId": "507f1f77bcf86cd799439012",
    "senderId": "507f1f77bcf86cd799439011",
    "receiverId": "507f1f77bcf86cd799439013",
    "content": "I'm on my way",
    "isRead": false,
    "createdAt": "2024-03-25T10:35:00Z"
  },
  "message": "Message sent"
}
```

### Get Messages for Request

**Request:**
```http
GET /api/v1/messages/request/:requestId?page=1&limit=50
Authorization: Bearer <access_token>
```

### Get Conversations

**Request:**
```http
GET /api/v1/messages/conversation?page=1&limit=20
Authorization: Bearer <access_token>
```

### Mark Message as Read

**Request:**
```http
PUT /api/v1/messages/:id/mark-read
Authorization: Bearer <access_token>
```

### Get Unread Count

**Request:**
```http
GET /api/v1/messages/unread-count
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

### Delete Message

**Request:**
```http
DELETE /api/v1/messages/:id
Authorization: Bearer <access_token>
```

---

## Ratings

### Create Rating

**Request:**
```http
POST /api/v1/ratings
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "requestId": "507f1f77bcf86cd799439012",
  "toUserId": "507f1f77bcf86cd799439013",
  "providerId": "507f1f77bcf86cd799439015",
  "rating": 5,
  "review": "Excellent service!"
}
```

### Get User Ratings

**Request:**
```http
GET /api/v1/ratings/user/:userId?page=1&limit=20
```

### Get User Average Rating

**Request:**
```http
GET /api/v1/ratings/user/:userId/average
```

**Response:**
```json
{
  "success": true,
  "data": {
    "average": 4.8
  }
}
```

### Get Provider Ratings

**Request:**
```http
GET /api/v1/ratings/provider/:providerId?page=1&limit=20
```

### Get Provider Average Rating

**Request:**
```http
GET /api/v1/ratings/provider/:providerId/average
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "status": 400,
    "message": "Validation failed: email - Valid email is required"
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "status": 401,
    "message": "Unauthorized"
  }
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "status": 403,
    "message": "Insufficient permissions"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "status": 404,
    "message": "Resource not found"
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "status": 500,
    "message": "Internal Server Error"
  }
}
```

---

## Rate Limiting

API implements rate limiting:
- **Window**: 15 minutes
- **Max Requests**: 100 per window
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Authentication Header

All protected routes require:
```
Authorization: Bearer <your_jwt_token>
```

## Response Format

All successful responses follow:
```json
{
  "success": true,
  "data": {...},
  "message": "Optional message"
}
```

For pagination:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```
