# Frontend Deployment Guide - StudyRooms

## ✅ Pre-Deployment Checklist

Your frontend has been prepared for deployment with:

- ✅ Environment variable support added (`VITE_API_URL`)
- ✅ Socket.IO connection configured to use env variable
- ✅ Auth API calls updated to use env variable
- ✅ Server API calls updated to use env variable

## 🚀 Deployment Options

### Option 1: Vercel (Recommended - FREE)

**Why Vercel?**

- ✅ FREE for hobby projects
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Git integration (auto-deploy on push)
- ✅ Easy environment variables
- ✅ Perfect for Vite/React apps

**Steps:**

1. **Create Vercel Account**

   - Go to https://vercel.com/signup
   - Sign up with GitHub

2. **Connect Your Repository**

   - Click "Add New Project"
   - Select your GitHub repository: `HTF25-Team-002`
   - Select root directory: `frontend`

3. **Configure Build Settings**

   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Add Environment Variables**
   Go to Project Settings → Environment Variables and add:

   ```
   VITE_API_URL=https://your-backend-url.com
   VITE_GOOGLE_CLIENT_ID=678250521143-9mc5a4jsk1ukof3umogo6dnb0rl6h4tu.apps.googleusercontent.com
   VITE_VAPID_PUBLIC_KEY=BFn5pDJ4Bh59oai9qrwQheL7onXPao6L_t4F5qWm2N7ljStdZvbBIisFbDcUkNkJ9W9HRjqeqiDZxsLnB6obOac
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your app will be live at `https://your-app.vercel.app`

### Option 2: Netlify (Also FREE)

**Steps:**

1. **Create Netlify Account**

   - Go to https://app.netlify.com/signup
   - Sign up with GitHub

2. **New Site from Git**

   - Click "Add new site" → "Import an existing project"
   - Choose GitHub and select your repo

3. **Build Settings**

   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`

4. **Environment Variables**
   Go to Site Settings → Environment Variables and add:

   ```
   VITE_API_URL=https://your-backend-url.com
   VITE_GOOGLE_CLIENT_ID=678250521143-9mc5a4jsk1ukof3umogo6dnb0rl6h4tu.apps.googleusercontent.com
   VITE_VAPID_PUBLIC_KEY=BFn5pDJ4Bh59oai9qrwQheL7onXPao6L_t4F5qWm2N7ljStdZvbBIisFbDcUkNkJ9W9HRjqeqiDZxsLnB6obOac
   ```

5. **Deploy**
   - Click "Deploy site"
   - Your app will be live at `https://your-app.netlify.app`

### Option 3: GitHub Pages (FREE)

**Steps:**

1. **Install gh-pages**

   ```powershell
   cd frontend
   npm install --save-dev gh-pages
   ```

2. **Update package.json**
   Add these lines to your frontend/package.json:

   ```json
   {
     "homepage": "https://Syed-Khizerr.github.io/HTF25-Team-002",
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     }
   }
   ```

3. **Update vite.config.ts**
   Add base path:

   ```typescript
   export default defineConfig({
     base: "/HTF25-Team-002/",
     plugins: [react(), tailwindcss()],
     // ...
   });
   ```

4. **Deploy**

   ```powershell
   npm run deploy
   ```

5. **Enable GitHub Pages**
   - Go to repo Settings → Pages
   - Source: "gh-pages" branch
   - Your site will be at: `https://Syed-Khizerr.github.io/HTF25-Team-002`

## 🔧 Backend Deployment (Required First!)

Before deploying frontend, deploy your backend:

### Option 1: Render.com (FREE)

1. Go to https://render.com
2. Create Web Service
3. Connect your GitHub repo
4. Root Directory: `backend/server`
5. Build Command: `npm install`
6. Start Command: `npm start`
7. Add environment variables from your .env file
8. Copy your service URL (e.g., `https://your-app.onrender.com`)

### Option 2: Railway.app (FREE $5 credit)

1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Select backend/server folder
4. Add environment variables
5. Get deployment URL

### Option 3: Heroku

1. Install Heroku CLI
2. Create app: `heroku create studyrooms-backend`
3. Set buildpack to root directory
4. Deploy

## 📝 After Backend Deployment

Once backend is deployed:

1. **Update Frontend Environment Variable**

   ```
   VITE_API_URL=https://your-backend-url.com
   ```

2. **Update Backend CORS**
   In your backend `index.js`, update CORS to allow your frontend domain:

   ```javascript
   app.use(
     cors({
       origin: ["https://your-frontend.vercel.app", "http://localhost:5173"],
     })
   );
   ```

3. **Update Google OAuth**
   - Go to Google Cloud Console
   - Add your deployed URLs to Authorized JavaScript origins
   - Add redirect URIs

## 🧪 Testing Deployment

1. **Local Build Test**

   ```powershell
   cd frontend
   npm run build
   npm run preview
   ```

   Visit http://localhost:4173

2. **Check Environment Variables**
   Open browser console and check:
   ```javascript
   console.log(import.meta.env.VITE_API_URL);
   ```

## 🐛 Common Issues

### Issue: "Failed to fetch" errors

**Solution:** Check CORS settings in backend and ensure VITE_API_URL is correct

### Issue: Socket.IO connection failed

**Solution:** Make sure backend Socket.IO is configured for your frontend domain

### Issue: Build fails

**Solution:**

```powershell
rm -rf node_modules
rm package-lock.json
npm install
npm run build
```

### Issue: Environment variables not working

**Solution:** Variables must start with `VITE_` prefix in Vite

## 📊 Recommended Setup

For HTFEST 2025 Demo:

- **Frontend**: Vercel (instant deployment, free, professional)
- **Backend**: Render.com (free tier, auto-deploy)
- **Database**: MongoDB Atlas (already configured)

## 🎯 Quick Commands

```powershell
# Build locally
cd frontend
npm run build

# Preview build
npm run preview

# Deploy to Vercel (if using Vercel CLI)
npm install -g vercel
vercel --prod

# Deploy to Netlify (if using Netlify CLI)
npm install -g netlify-cli
netlify deploy --prod
```

## 📞 Need Help?

If deployment fails:

1. Check build logs for errors
2. Verify all environment variables are set
3. Test local build first (`npm run build && npm run preview`)
4. Check backend is running and accessible
5. Verify CORS settings

## ✨ Post-Deployment

After successful deployment:

1. ✅ Test login/signup
2. ✅ Test server creation
3. ✅ Test channel messaging
4. ✅ Test file uploads
5. ✅ Test @mentions
6. ✅ Test real-time updates
7. ✅ Share the live link!

Good luck with HTFEST 2025! 🚀
