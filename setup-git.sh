#!/bin/bash
# Quick GitHub & Deployment Setup Script
# Run this from the project root directory

echo "🚀 Emergency Gas Connect - Deployment Setup"
echo "============================================="
echo ""

# Step 1: Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing Git repository..."
    git init
    git config user.name "$(git config --global user.name || echo 'Developer')"
    git config user.email "$(git config --global user.email || echo 'dev@example.com')"
    echo "✅ Git initialized"
else
    echo "✅ Git already initialized"
fi

echo ""

# Step 2: Stage all files
echo "📝 Staging files..."
git add .
echo "✅ Files staged"

echo ""

# Step 3: Create initial commit if none exists
if [ -z "$(git rev-parse --all 2>/dev/null)" ]; then
    echo "💾 Creating initial commit..."
    git commit -m "feat: Emergency Gas Connect - Unified Dashboard with Live Data

- Implemented LiveDataService for real-time data across all roles
- Created unified Dashboard for Provider, Helper, and Seeker
- Added rate limiting and geospatial query support
- Integrated Socket.IO for real-time updates
- Debounced API requests to prevent rate limit hits
- 7-day fulfillment charts and activity feeds
- Complete request workflow: accept, complete, cancel
"
    echo "✅ Initial commit created"
else
    echo "ℹ️  Git history already exists"
fi

echo ""
echo "✅ Local setup complete!"
echo ""
echo "📌 Next Steps:"
echo "1. Create a new repository on GitHub"
echo "2. Run this command:"
echo "   git remote add origin https://github.com/YOUR-USERNAME/emergency-gas-connect.git"
echo "3. Then push:"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "📚 See DEPLOYMENT_GUIDE.md for detailed deployment instructions"
