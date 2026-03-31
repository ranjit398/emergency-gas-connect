# Backend Testing & Integration Guide

## Getting Started with API Testing

### Using cURL

#### 1. Register a User

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seeker1@example.com",
    "password": "password123",
    "fullName": "John Seeker",
    "phone": "9876543210",
    "role": "seeker",
    "latitude": 28.7041,
    "longitude": 77.1025,
    "address": "123 Main St, New Delhi"
  }'
```

Save the `accessToken` from response - you'll need it for protected routes.

#### 2. Login

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seeker1@example.com",
    "password": "password123"
  }'
```

#### 3. Get Profile

```bash
curl -X GET http://localhost:5000/api/v1/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 4. Create Emergency Request

```bash
curl -X POST http://localhost:5000/api/v1/requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "cylinderType": "LPG",
    "quantity": 1,
    "message": "Emergency gas needed",
    "latitude": 28.7041,
    "longitude": 77.1025,
    "address": "123 Main St, New Delhi"
  }'
```

Save the request ID from response.

#### 5. Get Pending Requests (as Helper/Provider)

First, register as helper:

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "helper1@example.com",
    "password": "password123",
    "fullName": "John Helper",
    "phone": "9876543211",
    "role": "helper",
    "latitude": 28.7050,
    "longitude": 77.1030,
    "address": "124 Helper St, New Delhi"
  }'
```

Then get pending requests:

```bash
curl -X GET "http://localhost:5000/api/v1/requests/pending?latitude=28.7050&longitude=77.1030&maxDistance=15" \
  -H "Authorization: Bearer HELPER_ACCESS_TOKEN"
```

#### 6. Accept Request

```bash
curl -X PUT http://localhost:5000/api/v1/requests/REQUEST_ID/accept \
  -H "Authorization: Bearer HELPER_ACCESS_TOKEN"
```

Replace `REQUEST_ID` with actual ID.

#### 7. Send Message

```bash
curl -X POST http://localhost:5000/api/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer HELPER_ACCESS_TOKEN" \
  -d '{
    "requestId": "REQUEST_ID",
    "receiverId": "SEEKER_USER_ID",
    "content": "Im on my way with your gas cylinder"
  }'
```

#### 8. Complete Request & Rate

```bash
curl -X PUT http://localhost:5000/api/v1/requests/REQUEST_ID/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEEKER_ACCESS_TOKEN" \
  -d '{
    "rating": 5,
    "review": "Great service! Very helpful."
  }'
```

#### 9. Create Rating

```bash
curl -X POST http://localhost:5000/api/v1/ratings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEEKER_ACCESS_TOKEN" \
  -d '{
    "requestId": "REQUEST_ID",
    "toUserId": "HELPER_USER_ID",
    "rating": 5,
    "review": "Excellent service!"
  }'
```

### Using Postman

1. **Create Environment**
   - Variable: `baseUrl` = `http://localhost:5000/api/v1`
   - Variable: `accessToken` = (set after login)

2. **Create Requests** with {{baseUrl}} and {{accessToken}} placeholders

3. **Import Collections** (save these as JSON):
   - Auth collection
   - Profile collection
   - Request collection
   - Message collection
   - Rating collection

### Using Thunder Client (VS Code Extension)

1. Install Thunder Client
2. Create requests in Collections
3. Use `Bearer {{accessToken}}` in Authorization
4. Test endpoints from sidebar

## Socket.io Testing

### Using Socket.io Client Test Page

Create a test HTML file:

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
</head>
<body>
    <h1>Emergency Gas Socket.io Test</h1>
    <input type="text" id="token" placeholder="JWT Token" />
    <button onclick="connect()">Connect</button>
    <br><br>
    
    <input type="text" id="requestId" placeholder="Request ID" />
    <button onclick="joinRequest()">Join Request</button>
    <br><br>
    
    <input type="text" id="message" placeholder="Message" />
    <button onclick="sendMessage()">Send Message</button>
    <br><br>
    
    <div id="messages" style="border: 1px solid black; height: 300px; overflow: auto;"></div>

    <script>
        let socket;
        
        function connect() {
            const token = document.getElementById('token').value;
            socket = io('http://localhost:5000', {
                auth: { token }
            });
            
            socket.on('connect', () => {
                log('Connected to server');
            });
            
            socket.on('message:new', (msg) => {
                log('New message: ' + JSON.stringify(msg));
            });
            
            socket.on('error', (error) => {
                log('Error: ' + error);
            });
            
            socket.on('disconnect', () => {
                log('Disconnected from server');
            });
        }
        
        function joinRequest() {
            const requestId = document.getElementById('requestId').value;
            socket.emit('join:request', requestId);
            log('Joined request: ' + requestId);
        }
        
        function sendMessage() {
            const message = document.getElementById('message').value;
            const requestId = document.getElementById('requestId').value;
            
            socket.emit('message:send', {
                requestId: requestId,
                receiverId: 'RECEIVER_ID',
                content: message,
                attachments: []
            });
            
            document.getElementById('message').value = '';
            log('Message sent: ' + message);
        }
        
        function log(msg) {
            const div = document.getElementById('messages');
            div.innerHTML += '<p>' + new Date().toLocaleTimeString() + ' - ' + msg + '</p>';
            div.scrollTop = div.scrollHeight;
        }
    </script>
</body>
</html>
```

### Using socket.io-client Library

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your_jwt_token'
  }
});

// Join request room
socket.emit('join:request', 'request_id');

// Send message
socket.emit('message:send', {
  requestId: 'request_id',
  receiverId: 'receiver_id',
  content: 'Message content'
});

// Listen for new messages
socket.on('message:new', (message) => {
  console.log('New message:', message);
});

// Listen for request updates
socket.on('request:accepted', (data) => {
  console.log('Request accepted:', data);
});

// Listen for typing indicators
socket.on('typing:active', (data) => {
  console.log('User typing:', data);
});
```

## Test Scenarios

### Scenario 1: Emergency Request Workflow

**Setup:**
- Create 2 users: 1 seeker, 1 helper (nearby location)
- Helper is online

**Steps:**
1. Seeker creates emergency request
2. Both users get notifications
3. Helper sees pending request
4. Helper accepts request
5. Both can chat via Socket.io
6. Helper sends location updates
7. Seeker marks complete and rates

**Expected Results:**
- Request status changes: pending → accepted → completed
- Chat messages sync in real-time
- Ratings update user profiles

### Scenario 2: Provider Integration

**Setup:**
- Create provider account with business details
- Create seeker nearby

**Steps:**
1. Seeker creates request
2. Search nearby providers
3. Assign provider to request
4. Chat between seeker and provider
5. Complete and rate provider

**Expected Results:**
- Provider appears in search results
- Provider rating updated
- Completed request count incremented

### Scenario 3: Real-time Chat

**Setup:**
- Two users with active request
- Both connected via Socket.io

**Steps:**
1. User A sends message
2. User B receives in real-time
3. User B marks read
4. User A sees read status
5. User A typing indicator
6. User B stops and types

**Expected Results:**
- Messages appear instantly
- Read status updates
- Typing indicators work

## Performance Testing

### Load Testing with Apache Bench

```bash
# Test GET request
ab -n 1000 -c 10 http://localhost:5000/health

# Test POST request
ab -p data.json -T application/json -n 100 -c 10 http://localhost:5000/api/v1/auth/login
```

### Load Testing with Artillery

```bash
npm install -g artillery

# Create load-test.yml
cat > load-test.yml << 'EOF'
config:
  target: http://localhost:5000
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: API Test
    flow:
      - get:
          url: /health
      - post:
          url: /api/v1/auth/register
          json:
            email: "test@example.com"
            password: "test123"
            fullName: "Test"
            phone: "1234567890"
            role: "seeker"
            latitude: 28.7
            longitude: 77.1
            address: "Test"
EOF

artillery run load-test.yml
```

## Database Testing

### Check Collections

```bash
mongosh
use emergency-gas

# List all collections
show collections

# Count documents
db.users.countDocuments()
db.emergency_requests.countDocuments()
db.messages.countDocuments()

# Find specific user
db.users.findOne({email: "test@example.com"})

# Check indexes
db.users.getIndexes()
db.emergency_requests.getIndexes()
```

### Reset Database for Testing

```bash
mongosh
use emergency-gas

# Drop all collections
db.users.deleteMany({})
db.profiles.deleteMany({})
db.providers.deleteMany({})
db.emergency_requests.deleteMany({})
db.messages.deleteMany({})
db.ratings.deleteMany({})
db.notifications.deleteMany({})
```

## Integration Testing with Node

Create `test.js`:

```javascript
import axios from 'axios';

const API = 'http://localhost:5000/api/v1';

async function testAuth() {
  try {
    // Register
    const register = await axios.post(`${API}/auth/register`, {
      email: `user${Date.now()}@test.com`,
      password: 'test123',
      fullName: 'Test User',
      phone: '9876543210',
      role: 'seeker',
      latitude: 28.7041,
      longitude: 77.1025,
      address: 'Test Address'
    });
    
    console.log('✓ Registration successful');
    return register.data.data.accessToken;
  } catch (error) {
    console.error('✗ Registration failed:', error.response?.data);
  }
}

async function testProfile(token) {
  try {
    const profile = await axios.get(`${API}/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✓ Profile retrieved');
  } catch (error) {
    console.error('✗ Profile fetch failed:', error.response?.data);
  }
}

// Run tests
(async () => {
  const token = await testAuth();
  if (token) {
    await testProfile(token);
  }
})();
```

Run with: `node test.js`

## Monitoring & Debugging

### Enable Detailed Logging

Update `.env`:
```
LOG_LEVEL=debug
NODE_ENV=development
```

### Use Node Inspector

```bash
node --inspect dist/server.js
# Then open chrome://inspect in browser
```

### Monitor with PM2

```bash
pm2 start dist/server.js --name "backend"
pm2 logs backend
pm2 monit
```

## Common Issues & Solutions

### 404 on valid endpoints
- Ensure server is running
- Check URL spelling
- Verify API version in URL (`/api/v1/`)

### 401 Unauthorized
- Token missing or expired
- Use correct Authorization header format
- Check JWT_SECRET matches

### 400 Bad Request
- Check request body format (JSON)
- Verify all required fields present
- Check field types (numbers vs strings)

### CORS Errors
- Update CORS_ORIGIN in .env
- Ensure frontend URL matches CORS_ORIGIN

### Socket.io Connection Failed
- Verify token is valid JWT
- Check auth middleware in socket config
- Ensure Socket.io is running (same port as HTTP)

## Best Practices

1. **Always save tokens** from registration/login
2. **Test error cases** (missing fields, invalid tokens)
3. **Clean database** between test runs
4. **Use meaningful test data** (real-looking IDs and emails)
5. **Log all responses** for debugging
6. **Test Socket.io** with multiple connections
7. **Verify database state** after operations
8. **Test pagination** with limit and page params
9. **Test role-based access** with different user types
10. **Monitor performance** during load tests
