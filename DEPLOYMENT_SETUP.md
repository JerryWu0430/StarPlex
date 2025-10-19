# Deployment Setup Guide

## 🚀 Backend (Render)

### Environment Variables to Set:

1. Go to your Render dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Add these variables:

```
FRONTEND_URL=https://your-frontend-app.vercel.app
PERPLEXITY_API_KEY=your_perplexity_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
# Add any other API keys you're using
```

### CORS Configuration:
✅ Already updated in `backend/main.py` to allow Vercel domains

---

## 🎨 Frontend (Vercel)

### Environment Variables to Set:

1. Go to your Vercel project dashboard
2. Click on "Settings" → "Environment Variables"
3. Add these variables:

#### Production:
```
NEXT_PUBLIC_API_URL=https://your-backend-app.onrender.com
```

#### Preview & Development (optional):
```
NEXT_PUBLIC_API_URL=https://your-backend-app.onrender.com
```

### How to Find Your Backend URL:
1. Go to your Render dashboard
2. Find your backend service
3. Copy the URL (looks like: `https://your-app-name.onrender.com`)

---

## 🔍 Testing the Setup

### 1. Test Backend CORS:
```bash
curl -H "Origin: https://your-frontend.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://your-backend.onrender.com/find-competitors \
     --verbose
```

Look for these headers in the response:
- `access-control-allow-origin: https://your-frontend.vercel.app`
- `access-control-allow-methods: POST, GET, ...`

### 2. Test Frontend API Call:
1. Open your deployed frontend
2. Open browser DevTools (F12)
3. Go to Network tab
4. Try making an API call from your app
5. Check if you see CORS errors

---

## 🐛 Troubleshooting

### CORS Error Still Happening?

1. **Check Backend Logs on Render:**
   - Go to Render dashboard → Your service → Logs
   - Look for CORS-related errors

2. **Verify Environment Variables:**
   - Render: Check `FRONTEND_URL` is set correctly
   - Vercel: Check `NEXT_PUBLIC_API_URL` is set correctly

3. **Redeploy Both Services:**
   - After setting environment variables, redeploy both services
   - Render: Click "Manual Deploy" → "Deploy latest commit"
   - Vercel: Automatically redeploys on git push

4. **Check for Trailing Slashes:**
   - URLs should NOT have trailing slashes
   - ✅ Correct: `https://app.vercel.app`
   - ❌ Wrong: `https://app.vercel.app/`

### Network Errors?

1. Check if backend is running: Visit `https://your-backend.onrender.com/docs`
2. Check if frontend can reach backend: Open browser console and check Network tab

---

## 📝 Quick Checklist

- [ ] Backend deployed on Render
- [ ] Backend environment variables set (FRONTEND_URL, API keys)
- [ ] Backend CORS updated (already done in code)
- [ ] Frontend deployed on Vercel
- [ ] Frontend environment variable set (NEXT_PUBLIC_API_URL)
- [ ] Both services redeployed after env var changes
- [ ] Tested API calls from frontend to backend
- [ ] No CORS errors in browser console

---

## 🔗 Useful Links

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **CORS Explained**: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

