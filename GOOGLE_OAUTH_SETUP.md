# Google OAuth Setup Guide

To enable Google Sign-In, you need to set up a Google OAuth 2.0 Client ID.

## Steps:

### 1. Go to Google Cloud Console

Visit: https://console.cloud.google.com/

### 2. Create a New Project (if you don't have one)

- Click on the project dropdown at the top
- Click "New Project"
- Enter project name: "StudyRoom" (or any name you prefer)
- Click "Create"

### 3. Enable Google+ API

- In the left sidebar, go to "APIs & Services" > "Library"
- Search for "Google+ API"
- Click on it and click "Enable"

### 4. Create OAuth 2.0 Credentials

- Go to "APIs & Services" > "Credentials"
- Click "Create Credentials" > "OAuth client ID"
- If prompted, configure the OAuth consent screen first:
  - Choose "External" (unless you have a Google Workspace)
  - Fill in:
    - App name: StudyRoom
    - User support email: your email
    - Developer contact: your email
  - Click "Save and Continue"
  - Skip Scopes (click "Save and Continue")
  - Add test users if needed
  - Click "Save and Continue"

### 5. Create OAuth Client ID

- Application type: "Web application"
- Name: "StudyRoom Web Client"
- Authorized JavaScript origins:
  ```
  http://localhost:5173
  http://localhost:5174
  ```
- Authorized redirect URIs:
  ```
  http://localhost:5173
  http://localhost:5174
  ```
- Click "Create"

### 6. Copy Your Client ID

- You'll see a popup with your Client ID and Client Secret
- Copy the **Client ID** (it looks like: `xxxxx.apps.googleusercontent.com`)
- You don't need the Client Secret for frontend OAuth

### 7. Add to Frontend Environment

- Open `frontend/.env`
- Replace the placeholder with your actual Client ID:
  ```
  VITE_GOOGLE_CLIENT_ID=your-actual-client-id-here.apps.googleusercontent.com
  ```

### 8. Restart the Frontend Development Server

```bash
cd frontend
npm run dev
```

## Testing

1. Navigate to http://localhost:5174/auth
2. Click "Sign in with Google"
3. Select your Google account
4. You should be redirected to the home page

## Troubleshooting

### "Error: Invalid client"

- Make sure your Client ID is correct
- Verify the authorized origins match your dev server URL

### "Access blocked: This app's request is invalid"

- Make sure you've added http://localhost:5174 to authorized JavaScript origins
- Clear browser cache and try again

### "Popup closed"

- Check if popup blockers are preventing the sign-in window
- Allow popups for localhost

## Production Setup

For production, you'll need to:

1. Add your production domain to authorized origins
2. Update the OAuth consent screen status from "Testing" to "In Production"
3. Add the production Client ID to your environment variables
