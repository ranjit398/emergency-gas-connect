# Render Deployment Configuration

## CORS Fix: Environment Variables Required

After applying the Socket.IO CORS fixes, configure these environment variables on your **Render backend service**:

### Backend Service → Environment

Add these environment variables:

```
NODE_ENV = production
CORS_ORIGIN = https://emergency-gas-frontend.onrender.com
FRONTEND_URL = https://emergency-gas-frontend.onrender.com
```

### Why These Matter

- **NODE_ENV**: Tells the server it's in production mode
- **CORS_ORIGIN**: Explicitly allows Socket.IO polling requests from your frontend domain
- **FRONTEND_URL**: Used by Socket.IO initialization as fallback origin

### Complete Backend Environment Template

```
# Node
NODE_ENV = production
PORT = 5002

# Database
MONGODB_URI = <your-mongodb-connection-string>

# CORS & Frontend
CORS_ORIGIN = https://emergency-gas-frontend.onrender.com
FRONTEND_URL = https://emergency-gas-frontend.onrender.com

# JWT
JWT_SECRET = <your-jwt-secret>
JWT_REFRESH_SECRET = <your-jwt-refresh-secret>

# Email (if needed)
SMTP_HOST = <smtp-host>
SMTP_PORT = 587
SMTP_USER = <smtp-user>
SMTP_PASSWORD = <smtp-password>
EMAIL_FROM = noreply@emergencygas.com

# AWS (if using S3)
AWS_REGION = <region>
AWS_ACCESS_KEY_ID = <access-key>
AWS_SECRET_ACCESS_KEY = <secret-key>
AWS_S3_BUCKET = <bucket-name>
```

## Deployment Steps

1. **Update Render Environment Variables**
   - Go to your backend service on Render
   - Click "Environment"
   - Add/update the variables above
   - Save changes (this will trigger a redeploy)

2. **Verify Socket.IO is Working**
   - Open your frontend at `https://emergency-gas-frontend.onrender.com`
   - Open browser DevTools → Console
   - Look for `[Socket] Connected: <socket-id>`
   - If you see connection errors, check the browser Network tab for the `/socket.io/` request

3. **Check Backend Logs**
   - Go to your backend service on Render
   - Click "Logs"
   - Look for `[Socket.IO] Initialized` message
   - Verify the `corsOrigins` includes your frontend domain

## Common Issues & Fixes

### Issue: "CORS blocked: [frontend-url]"
**Solution**: Ensure `CORS_ORIGIN` environment variable is set correctly on Render

### Issue: Socket connects via polling but won't upgrade to WebSocket
**Solution**: This is normal on Render. The polling transport works fine for most use cases. WebSocket upgrade happens in the background.

### Issue: "429 Too Many Requests"
**Solution**: Check rate limiter settings:
```
RATE_LIMIT_WINDOW_MS = 900000
RATE_LIMIT_MAX_REQUESTS = 100
```

### Issue: Socket shows "Connection error: xhr poll error"
**Solution**: 
1. Check CORS headers are being sent (Network tab)
2. Verify backend is running (`/health` endpoint should return 200)
3. Check for typos in CORS_ORIGIN env var

## Files Changed

- `backend/src/server.ts` - Simplified Socket.IO CORS configuration
- `backend/src/config/index.ts` - Updated CORS origin defaults
- `frontend/src/lib/socket.ts` - Added `withCredentials: true` for proper CORS handling

## What the Fix Does

### Old Behavior
- Socket.IO tried to use a function to generate CORS origins
- The function logic was complex and sometimes missed the frontend domain
- Multiple CORS middleware layers conflicted with each other

### New Behavior
- Direct array of allowed origins defined at top of server
- Single, clean Express CORS middleware
- Socket.IO uses the same exact array
- Much simpler, more predictable behavior
- Fallback to environment variables for flexibility

## Testing the Connection

Run this in your browser console to test Socket.IO:

```javascript
// Import getSocket from the app's socket module
const socket = window.__debugSocket || null;
if (socket && socket.connected) {
  console.log('✅ Socket connected:', socket.id);
} else {
  console.log('❌ Socket not connected');
}
```

If connected, you can send test events:

```javascript
socket.emit('test-event', { message: 'Hello Backend' });
socket.on('response', (data) => console.log('Got response:', data));
```

## Next Steps

After deployment:
1. Monitor Socket.IO connection messages in browser console
2. Test real-time features (emergency requests, messages, ratings)
3. Check backend logs for any Socket.IO errors
4. If issues persist, create a support ticket with the error messages
