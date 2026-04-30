# Phase 1 Quick Start Guide

## 🚀 Running the Application

### Prerequisites
- Node.js 18+ installed
- MongoDB running locally or connection string
- Environment variables configured

### Backend Setup

```bash
# Navigate to API directory
cd apps/api

# Install dependencies
npm install

# Configure environment variables
# Create .env file with:
MONGODB_URI=mongodb://localhost:27017/purplemerit
JWT_SECRET=your-secret-key
REFRESH_TOKEN_SECRET=your-refresh-secret
PORT=3000

# Start development server
npm run dev

# Verify backend is running
curl http://localhost:3000/health
```

### Seed the member account on Windows PowerShell

```powershell
Set-Location .\apps\api
$env:SEED_MEMBER_EMAIL = "vishwajeetkumarpatelmgs@gmail.com"
$env:SEED_MEMBER_PASSWORD = "Vish@1011"
npm run seed:member
```

### Frontend Setup

```bash
# Navigate to Web directory
cd apps/web

# Install dependencies
npm install

# Create environment variables
# Create .env.local file with:
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Start development server
npm run dev

# Open browser to http://localhost:3000
```

---

## 📋 Testing Phase 1 Features

### Test 1: Anonymous Homepage Form
**Location:** http://localhost:3000

**Steps:**
1. Scroll to "Create a short link" form
2. Enter a URL: `https://www.example.com`
3. (Optional) Enter referral code: `REF_ABC123`
4. Click "Create Short Link"
5. ✅ Should see short URL created
6. ✅ Can copy with "Copy link" button

### Test 2: Referral Registration Flow
**Location:** http://localhost:3000/?ref=REF_ABC123

**Steps:**
1. Visit homepage with referral parameter
2. Create a short link via the form
3. Log in / create account
4. Visit /dashboard/partner/referral-link
5. ✅ Should see referral code displayed
6. ✅ Should see stats increasing

### Test 3: 5-Step Funnel (Full Flow)
**Location:** http://localhost:3000/funnel/[sessionId]

**Prerequisites:**
1. Create a short URL via anonymous form
2. Copy the short code
3. Visit the short URL with referral parameter

**Full Funnel Test:**

**Step 1 - Blog/Article**
- [ ] See blog content
- [ ] Click "Continue to Next Step"
- [ ] Auto-redirects to step-2

**Step 2 - Scroll Unlock**
- [ ] See scroll progress indicator
- [ ] Scroll down to 80%+
- [ ] Button changes from "Continue Reading" to "Unlock & Continue"
- [ ] Click button to advance

**Step 3 - Sponsored Offer**
- [ ] See exclusive offer card
- [ ] Click "Claim Your Offer" button
- [ ] Auto-advances to step-4

**Step 4 - Quiz Verification**
- [ ] See first question
- [ ] Select an option
- [ ] Click "Next Question"
- [ ] Answer remaining 2 questions
- [ ] Click "Verify & Continue"
- [ ] ✅ Shows checkmark if correct

**Step 5 - Final Unlock**
- [ ] See completion screen (100% progress)
- [ ] See "Unlock & Access Content" button
- [ ] Click button
- [ ] ✅ Redirects to target URL

### Test 4: Partner Dashboard
**Location:** http://localhost:3000/dashboard/partner/referral-link (after login)

**Steps:**
1. Create account via /register
2. Navigate to partner dashboard
3. ✅ See unique referral code
4. ✅ Copy button works
5. ✅ Share buttons visible
6. ✅ Stats displayed (0 initially)

**Navigate Sub-Pages:**
- [ ] Anonymous Links - See created links (will be empty initially)
- [ ] Earnings - See breakdown by country (0 initially)
- [ ] Withdrawal - Request payout (disabled with 0 balance)

---

## 🧪 Quick API Tests

### Test Endpoint: Funnel Progress
```bash
# Get funnel progress (replace with real sessionId)
curl -X GET http://localhost:3000/api/redirect/funnel/progress/test_session_123

# Expected Response:
{
  "success": true,
  "data": {
    "currentStep": 2,
    "completedSteps": [1],
    "progress": 40,
    "shortCode": "abc123"
  }
}
```

### Test Endpoint: Validate Step
```bash
# Validate step 2 (scroll unlock)
curl -X POST http://localhost:3000/api/redirect/funnel/validate-step/test_session_123 \
  -H "Content-Type: application/json" \
  -d '{
    "currentStep": 2,
    "scrollPosition": 85,
    "hasScrolledEnough": true
  }'

# Expected Response:
{
  "success": true,
  "data": {
    "isValid": true,
    "nextStep": 3,
    "message": "Step validated. Please proceed to next step."
  }
}
```

### Test Endpoint: Create Anonymous URL
```bash
# Create short URL with referral code
curl -X POST http://localhost:3000/api/urls/public \
  -H "Content-Type: application/json" \
  -d '{
    "originalUrl": "https://example.com",
    "referralCode": "REF_ABC123",
    "title": "My Test Link"
  }'

# Expected Response:
{
  "success": true,
  "data": {
    "shortUrl": "http://localhost:3000/r/abc123",
    "shortCode": "abc123",
    "originalUrl": "https://example.com"
  }
}
```

### Test Public Short Link Format
The user-facing link should be `http://localhost:3000/r/abc123`.
The API route remains `http://localhost:3000/api/v1/r/abc123` for internal handling.

---

## 🛠️ Troubleshooting

### Backend Not Starting

**Problem:** MongoDB connection error

**Solution:**
```bash
# Check MongoDB is running
mongosh

# If not running, start MongoDB
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
# Windows: net start MongoDB
```

**Problem:** Port 3000 already in use

**Solution:**
```bash
# Use different port
PORT=3001 npm run dev

# Or kill existing process
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows
```

### Frontend Not Showing API Data

**Problem:** CORS error in console

**Solution:**
```bash
# Check CORS middleware is enabled in backend
# Verify NEXT_PUBLIC_API_URL in .env.local matches backend URL
# Make sure backend is running on http://localhost:3000
```

**Problem:** API endpoints returning 404

**Solution:**
```bash
# Verify routes are registered:
# Backend should have /api/redirect/funnel/* endpoints
# Check redirect.routes.ts has the endpoints
# Make sure they're registered in api.routes.ts
```

### Funnel Pages Not Loading

**Problem:** sessionId not found errors

**Solution:**
```bash
# Create a real session by:
# 1. Using the homepage anonymous form
# 2. Or manually creating via POST /api/urls/public
# 3. Get the short code
# 4. Visit /r/{shortCode}?ref=REF_CODE
# 5. Should redirect to /funnel/[sessionId]
```

---

## 📊 Database Verification

### Check Collections Created

```bash
# Connect to MongoDB
mongosh

# Switch to database
use purplemerit

# List collections
show collections

# Should see:
# - anonymous-sessions
# - redirect-sessions
# - member-metrics
# - short-urls (existing)
# - users (existing)
```

### Verify Indexes

```bash
# Check indexes on anonymous-sessions
db['anonymous-sessions'].getIndexes()

# Should have TTL index on expiresAt
# Should have unique index on sessionToken

# Check indexes on redirect-sessions
db['redirect-sessions'].getIndexes()

# Should have TTL index on expiresAt
```

---

## 🔍 Debugging Tips

### Enable Verbose Logging

**Backend:**
```bash
# Add to .env
DEBUG=purplemerit:*
```

**Frontend:**
```javascript
// In browser console
localStorage.setItem('debug', 'purplemerit:*')
```

### Check Network Tab (Frontend)

**Browser DevTools:**
1. Open DevTools (F12)
2. Go to Network tab
3. Refresh page
4. Check API calls:
   - POST /api/urls/public (should return short code)
   - GET /api/redirect/funnel/progress/* (should return progress)
   - POST /api/redirect/funnel/validate-step/* (should validate)

### Monitor Database Queries

**MongoDB:**
```bash
# Enable profiling
db.setProfilingLevel(1, {slowms: 100})

# View slow queries
db.system.profile.find({millis: {$gt: 100}}).pretty()
```

---

## 📝 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Anonymous form not working | Check API_URL env var matches backend port |
| Scroll tracking not working | Check if running in iframe (scroll event issue) |
| Quiz answers always wrong | Questions are 0-indexed, verify answer mapping |
| Referral code not found | Ensure referral code exists in database |
| Dashboard shows 0 stats | Create links and complete funnels to generate data |
| Copy button not working | Check if secure context (HTTPS in production) |

---

## ✨ Feature Checklist for Testing

**Homepage:**
- [ ] Anonymous form appears
- [ ] Can create short URL
- [ ] Referral code input works
- [ ] Copy button copies URL
- [ ] Monetization section visible

**Funnel:**
- [ ] All 5 steps load
- [ ] Navigation between steps works
- [ ] Scroll detection on Step 2
- [ ] CTA click on Step 3
- [ ] Quiz on Step 4
- [ ] Final redirect on Step 5

**Dashboard:**
- [ ] Can access /dashboard/partner/referral-link
- [ ] Shows referral code
- [ ] Can navigate to sub-pages
- [ ] Stats display (even if 0)

**API:**
- [ ] Funnel progress returns correct data
- [ ] Step validation returns validation result
- [ ] URL creation creates short code

---

## 🚀 Next Steps

After verifying all tests pass:

1. **Backend API Implementation** (6 endpoints for partner dashboard)
2. **Load Testing** (simulate 100+ concurrent users)
3. **Security Audit** (penetration testing)
4. **Database Optimization** (add caching layer)
5. **Production Deployment** (Docker, CI/CD setup)

---

## 📞 Support

For issues not covered here:

1. Check PHASE_1_IMPLEMENTATION.md for detailed API docs
2. Review PHASE_1_CHECKLIST.md for testing scenarios
3. Check code comments in services folder
4. Review TypeScript types for expected formats

---

**Happy Testing! 🎉**
