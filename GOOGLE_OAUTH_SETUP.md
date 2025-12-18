# Google OAuth Setup Guide

## Development Setup (localhost)

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it

### 2. Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add these URLs:

**Authorized JavaScript origins:**
```
http://localhost:3000
https://certistage.com
```

**Authorized redirect URIs:**
```
http://localhost:3000/api/auth/callback/google
https://certistage.com/api/auth/callback/google
```

### 3. Update Environment Variables

Copy the Client ID and Client Secret to your `.env.local`:

```env
GOOGLE_CLIENT_ID=your_actual_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_actual_client_secret
NEXTAUTH_SECRET=certistage-nextauth-secret-key-2025
NEXTAUTH_URL=http://localhost:3000
```

### 4. Test the Integration

1. Start your development server: `npm run dev`
2. Go to `/signup?plan=professional`
3. Click "Continue with Google"
4. Complete OAuth flow
5. You should be redirected to dashboard with the selected plan

## Production Setup

For production, update the URLs in Google Cloud Console:

**Authorized JavaScript origins:**
```
https://certistage.com
```

**Authorized redirect URIs:**
```
https://certistage.com/api/auth/callback/google
```

And update `.env.local`:
```env
NEXTAUTH_URL=https://certistage.com
NEXT_PUBLIC_APP_URL=https://certistage.com
NODE_ENV=production
```

## Features Implemented

✅ Google OAuth sign-in
✅ Plan selection preservation through OAuth flow
✅ Automatic user creation in MongoDB
✅ Session management with NextAuth
✅ Professional UI with proper feedback
✅ Error handling and user feedback

## How it Works

1. User selects a plan from pricing page
2. Plan is stored in localStorage temporarily
3. User clicks "Continue with Google"
4. OAuth flow completes and creates user account
5. Plan is retrieved from localStorage and applied to user
6. User is redirected to dashboard with selected plan