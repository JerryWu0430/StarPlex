# Deployment Guide

## 🚀 Quick Deploy: Backend (Render) + Frontend (Vercel)

### **Backend Deployment on Render (FREE)**

1. **Push your code to GitHub** (if not already)
   ```bash
   git add .
   git commit -m "Add deployment configs"
   git push origin main
   ```

2. **Create Render account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

3. **Deploy Backend**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `startup-sonar-api` (or any name)
     - **Region**: Choose closest to your users
     - **Branch**: `main`
     - **Root Directory**: `backend`
     - **Runtime**: `Python 3`
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
     - **Instance Type**: `Free`

4. **Add Environment Variables** (in Render dashboard)
   - `PERPLEXITY_API_KEY` = your_api_key_here
   - `FRONTEND_URL` = (leave empty for now, we'll add after frontend deploy)

5. **Deploy!** 
   - Click "Create Web Service"
   - Wait ~5 minutes for build
   - Copy your backend URL (e.g., `https://startup-sonar-api.onrender.com`)

---

### **Frontend Deployment on Vercel (FREE)**

1. **Create Vercel account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Deploy Frontend**
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Configure:
     - **Framework Preset**: Next.js (auto-detected)
     - **Root Directory**: `frontend`
     - **Build Command**: `npm run build` (auto-set)
     - **Output Directory**: `.next` (auto-set)

3. **Add Environment Variable**
   - In project settings → Environment Variables
   - Add: `NEXT_PUBLIC_API_URL` = `https://your-backend-url.onrender.com`
   - (Use the URL from step 5 of backend deployment)

4. **Deploy!**
   - Click "Deploy"
   - Wait ~2 minutes
   - Your site is live! (e.g., `https://your-app.vercel.app`)

---

### **Final Configuration**

1. **Update Backend CORS**
   - Go back to Render dashboard
   - Add environment variable:
     - `FRONTEND_URL` = `https://your-app.vercel.app`
   - Backend will auto-redeploy

2. **Test Your App**
   - Visit your Vercel URL
   - Try creating a startup analysis
   - Everything should work! 🎉

---

## 💰 Cost Breakdown

- **Render Free Tier**: $0/month
  - 750 hours/month
  - Sleeps after 15min inactivity
  - Wakes up in ~30 seconds on first request
  
- **Vercel Free Tier**: $0/month
  - 100GB bandwidth
  - Unlimited deployments
  - Always-on, no sleep

**Total: FREE** ✨

---

## 🔄 Continuous Deployment

Both platforms auto-deploy when you push to GitHub:
- Push to `main` branch
- Backend and frontend auto-rebuild
- Changes live in ~3-5 minutes

---

## 🐛 Troubleshooting

### Backend won't start
- Check Render logs for Python errors
- Verify `PERPLEXITY_API_KEY` is set
- Make sure `requirements.txt` has all dependencies

### Frontend can't connect to backend
- Check `NEXT_PUBLIC_API_URL` in Vercel settings
- Verify backend URL is accessible (open in browser)
- Check backend logs for CORS errors

### Backend sleeps (Render free tier)
- First request after 15min takes ~30 seconds
- Upgrade to Render paid ($7/month) for always-on
- Or use Railway instead ($5/month with better free tier)

---

## 🚀 Alternative: Railway (Better Free Tier)

If Render free tier is too slow:

1. Go to [railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub"
3. Select your repo
4. Set root directory: `backend`
5. Add environment variables
6. Deploy!

Railway includes $5/month free credit (more reliable than Render's sleep).

---

## 📝 Local Development

To run locally:

**Backend:**
```bash
cd backend
source venv/bin/activate  # or `. venv/bin/activate`
python main.py
```

**Frontend:**
```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000`

