# Notification System Setup Guide

This guide will help you set up the complete notification system with Discord-style indicators and browser push notifications.

## Backend Setup

### 1. Install web-push package

```bash
cd backend
npm install web-push
```

### 2. Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for browser push notifications.

```bash
cd backend
npx web-push generate-vapid-keys
```

This will output something like:

```
=======================================

Public Key:
BCxyz...abc123

Private Key:
def456...ghi789

=======================================
```

### 3. Add VAPID Keys to Environment Variables

Create or update your `.env` file in the `backend` directory:

```env
VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY_HERE
VAPID_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
VAPID_SUBJECT=mailto:your-email@example.com
```

Replace:

- `YOUR_PUBLIC_KEY_HERE` with the Public Key from step 2
- `YOUR_PRIVATE_KEY_HERE` with the Private Key from step 2
- `your-email@example.com` with your actual email

### 4. Update Frontend VAPID Key

Open `frontend/src/pages/Home.tsx` and find the `togglePushNotifications` function (around line 900).

Replace this line:

```typescript
const VAPID_PUBLIC_KEY = "YOUR_VAPID_PUBLIC_KEY_HERE";
```

With:

```typescript
const VAPID_PUBLIC_KEY = "YOUR_PUBLIC_KEY_FROM_STEP_2";
```

### 5. Update Backend to Use VAPID Keys

Open `backend/server/index.js` and add these lines at the top (after other imports):

```javascript
const webPush = require("web-push");

// Setup web-push with VAPID keys
webPush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);
```

### 6. Restart Backend Server

After installing web-push and setting up the VAPID keys, restart your backend server:

```bash
# Stop the current server (Ctrl+C)
# Then restart it
cd backend
node server/index.js
```

## Frontend Setup

### 1. Service Worker Registration

The service worker is already set up to auto-register when you visit the app.
It's located at `frontend/public/sw.js`.

### 2. Enable Notifications

1. Open your app in the browser
2. Click the bell icon in the server header
3. Toggle "Enable Notifications" to ON
4. Toggle "Browser Push Notifications" to ON
5. Allow notifications when the browser asks for permission

## Features

### Discord-Style Visual Indicators

- **Red dots on servers**: Shows when any channel in the server has unread mentions
- **Red dots on channels**: Shows when that specific channel has unread mentions
- **Pulse animation**: Red dots pulse to draw attention

### Browser Push Notifications

- **Real-time mentions**: Get notified immediately when someone mentions you
- **Works when app is closed**: Receive notifications even when the browser tab is closed
- **Click to navigate**: Clicking a notification opens the app to that server/channel

### Notification Settings

- **Per-server toggle**: Enable/disable notifications for each server individually
- **Channel muting**: Mute specific channels to stop receiving notifications
- **Browser push toggle**: Control whether you want browser push notifications

## Testing

### Test Visual Indicators

1. Have someone mention you with `@yourusername` in a channel
2. Navigate away from that channel
3. You should see a red dot on both the server icon and channel name

### Test Browser Push

1. Enable browser push notifications in settings
2. Close the browser tab (or navigate away)
3. Have someone mention you
4. You should receive a browser notification
5. Click the notification to open the app

## Troubleshooting

### "Push notifications are not supported"

- Make sure you're using HTTPS (or localhost for development)
- Use a modern browser (Chrome, Firefox, Edge, Safari 16+)

### Not receiving push notifications

1. Check browser notification permissions (should be "Allowed")
2. Verify VAPID keys are set correctly in both frontend and backend
3. Check browser console for errors
4. Make sure service worker is registered (check DevTools > Application > Service Workers)

### Red dots not showing

1. Check that notifications are enabled for the server
2. Verify the channel is not muted
3. Check browser console for any errors
4. Make sure the mention format is correct: `@username`

### Service worker not registering

1. Make sure `sw.js` exists in `frontend/public/`
2. Check browser DevTools > Console for errors
3. Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
4. Clear browser cache and reload

## Browser Support

| Feature            | Chrome | Firefox | Safari | Edge |
| ------------------ | ------ | ------- | ------ | ---- |
| Push Notifications | ✅     | ✅      | ✅ 16+ | ✅   |
| Service Workers    | ✅     | ✅      | ✅     | ✅   |
| Visual Indicators  | ✅     | ✅      | ✅     | ✅   |

## Security Notes

- VAPID keys should be kept secret
- Never commit `.env` files to git
- Add `.env` to your `.gitignore`
- Browser notifications require user permission
- Push notifications only work over HTTPS (localhost is exempt)

## Additional Resources

- [Web Push API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [web-push Library](https://github.com/web-push-libs/web-push)
