# Render Environment Configuration for Socket.IO CORS Fix

## For Your Render Dashboard - Backend Service Settings

Go to: **Dashboard → Your Backend Service → Environment**

### Critical Environment Variables to Set:

```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/emergency-gas?retryWrites=true&w=majority
JWT_SECRET=generate_a_random_string_here_using_openssl
JWT_EXPIRY=7d
JWT_REFRESH_SECRET=generate_another_random_string_here
JWT_REFRESH_EXPIRY=30d
CORS_ORIGIN=https://emergency-gas-frontend.onrender.com
RENDER=true
```

### How to Generate Secure Secrets (on your local machine):

```bash
# Open terminal/PowerShell and run:
openssl rand -base64 32
```

Then copy the output and paste it into JWT_SECRET and JWT_REFRESH_SECRET fields.

### Example of what it should look like:

```
NODE_ENV              | production
PORT                  | 5000
MONGODB_URI           | mongodb+srv://user:pass@db.mongodb.net/emergency-gas
JWT_SECRET            | Z7k9mP2vQ4wX8nL3bJ5hF6dG1sT0rY4uI2oE6cV7mB9pK
JWT_REFRESH_SECRET    | A5q8nL2rO7sT1vW4xY6zB3cD9eF0gH1iJ2kL3mN4oPq
CORS_ORIGIN           | https://emergency-gas-frontend.onrender.com
RENDER                | true
```

### After Setting Variables:

1. Click "Save" or "Deploy"
2. Render will automatically redeploy your service
3. Check the "Logs" tab to verify deployment succeeded
4. Look for this message: `[Server] CORS Origins configured`

### If Render shows deployment errors:

1. Check the error in the Logs tab
2. Make sure MONGODB_URI is correct (copy paste from MongoDB Atlas)
3. Ensure no special characters are unescaped in URI strings
4. Try redeplying manually: **Manual Deploy** button

---

## CORS_ORIGIN Value Rules:

| Scenario | CORS_ORIGIN Value |
|----------|------------------|
| Production Render | `https://emergency-gas-frontend.onrender.com` |
| Testing (both URLs) | `https://emergency-gas-frontend.onrender.com,http://localhost:3000` |
| Custom Domain | `https://yourdomain.com` |
| Multiple domains | `https://domain1.com,https://domain2.com` |
| Wildcard (NOT SAFE) | `*` |

---

## Verification Checklist:

After deployment, verify everything works:

- [ ] Backend service deployed successfully
- [ ] Can access `https://emergency-gas-backend.onrender.com/health`
- [ ] Frontend can connect to socket without CORS errors
- [ ] Real-time features work (messages, requests, etc.)
- [ ] No errors in browser Dev Console (F12)
- [ ] Backend logs show `[Socket.IO] Initialized`

---

## Current Code Changes Summary:

✅ `backend/src/config/index.ts` - Auto-detects production and sets CORS
✅ `backend/src/server.ts` - Explicit CORS middleware for socket.io
✅ `frontend/src/lib/socket.ts` - Better transport handling
✅ `backend/.env.production` - Template for environment variables
