# 🚀 Quick Deployment Guide

## Step 1: Deploy Backend First

### Using Render.com (Recommended - FREE)

1. Go to https://render.com → Sign up
2. Click "New +" → "Web Service"
3. Connect GitHub → Select `HTF25-Team-002` repo
4. **Settings:**
   - Name: `studyrooms-backend`
   - Root Directory: `backend/server`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. **Environment Variables** (Add all from backend/server/.env):
   ```
   MONGODB=mongodb+srv://uchihaitachitsukuyomimks_db_user:QD5PXsrozgN4SC7X@studyroom.ahhjzui.mongodb.net/myDatabase?retryWrites=true&w=majority
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-123456789
   VAPID_PUBLIC_KEY=BFn5pDJ4Bh59oai9qrwQheL7onXPao6L_t4F5qWm2N7ljStdZvbBIisFbDcUkNkJ9W9HRjqeqiDZxsLnB6obOac
   VAPID_PRIVATE_KEY=TwWiI7wQ9Ngpl7MJe-q23CpbQY2X_oZ3Fsl9qhiwrmA
   VAPID_SUBJECT=mailto:furqanquadri.fq@gmail.com
   PORT=5000
   ```
6. Click "Create Web Service"
7. **Copy your backend URL** (e.g., `https://studyrooms-backend.onrender.com`)

## Step 2: Deploy Frontend

### Using Vercel (Recommended - FREE)

1. Go to https://vercel.com → Sign up with GitHub
2. Click "Add New" → "Project"
3. Import `HTF25-Team-002` repository
4. **Configure:**
   - Framework: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. **Environment Variables:**
   ```
   VITE_API_URL=https://studyrooms-backend.onrender.com
   VITE_GOOGLE_CLIENT_ID=678250521143-9mc5a4jsk1ukof3umogo6dnb0rl6h4tu.apps.googleusercontent.com
   VITE_VAPID_PUBLIC_KEY=BFn5pDJ4Bh59oai9qrwQheL7onXPao6L_t4F5qWm2N7ljStdZvbBIisFbDcUkNkJ9W9HRjqeqiDZxsLnB6obOac
   ```
6. Click "Deploy"
7. **Your app is live!** (e.g., `https://your-app.vercel.app`)

## Step 3: Update Backend CORS

After frontend deployment, update backend to allow your frontend domain:

In `backend/server/index.js`, change:

```javascript
const io = new Server(server, {
  cors: {
    origin: ["https://your-app.vercel.app", "http://localhost:5173"],
    credentials: true,
  },
});

app.use(
  cors({
    origin: ["https://your-app.vercel.app", "http://localhost:5173"],
    credentials: true,
  })
);
```

Commit and push to GitHub. Render will auto-redeploy.

## Step 4: Update Google OAuth (If using Google login)

1. Go to https://console.cloud.google.com/
2. Select your project
3. APIs & Services → Credentials
4. Edit OAuth 2.0 Client
5. Add Authorized JavaScript origins:
   - `https://your-app.vercel.app`
6. Add Authorized redirect URIs:
   - `https://your-app.vercel.app`

## ✅ Deployment Checklist

- [ ] Backend deployed on Render
- [ ] Backend URL copied
- [ ] Frontend deployed on Vercel
- [ ] Environment variables set in Vercel
- [ ] CORS updated in backend
- [ ] Backend redeployed after CORS update
- [ ] Google OAuth updated (if applicable)
- [ ] Test login/signup
- [ ] Test server creation
- [ ] Test messaging
- [ ] Share the link! 🎉

## 🐛 Troubleshooting

### Frontend can't connect to backend

- Check VITE_API_URL is correct (no trailing slash)
- Check backend CORS includes frontend domain
- Check backend is actually running on Render

### Socket.IO not connecting

- Update Socket.IO CORS in backend
- Ensure backend supports WebSocket connections

### Build fails

```powershell
cd frontend
rm -rf node_modules dist
npm install
npm run build
```

## 📱 Share Your Live App

After deployment:

- Frontend: `https://your-app.vercel.app`
- Backend: `https://studyrooms-backend.onrender.com`

Test everything works, then share with your team! 🚀
