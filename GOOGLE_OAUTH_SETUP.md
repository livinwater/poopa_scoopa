# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for the Poopa Scoopa app.

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "New Project" or select an existing project
3. Enter a project name (e.g., "Poopa Scoopa")
4. Click "Create"

## Step 2: Enable Google+ API

1. In your project dashboard, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on "Google+ API" and click "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" (unless you have a Google Workspace account)
3. Click "Create"
4. Fill in the required information:
   - App name: Poopa Scoopa
   - User support email: your email
   - Developer contact email: your email
5. Click "Save and Continue"
6. On the Scopes page, click "Save and Continue" (no need to add scopes manually)
7. On the Test users page, click "Save and Continue" (if in testing mode)
8. Review and click "Back to Dashboard"

## Step 4: Create OAuth Client ID

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Web application" as the application type
4. Configure the application:
   - Name: Poopa Scoopa Web Client
   - Authorized JavaScript origins:
     - `http://localhost:5173` (for local development)
     - Add your production domain when deploying
   - Authorized redirect URIs:
     - `http://localhost:5173/auth/callback` (for local development)
     - Add your production callback URL when deploying (e.g., `https://yourdomain.com/auth/callback`)
5. Click "Create"
6. Copy the **Client ID** and **Client Secret**

## Step 5: Add Credentials to Environment Variables

Create a `.env` file in the root of your project (if it doesn't exist) and add:

```env
VITE_GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

**Important Notes:**
- `VITE_GOOGLE_CLIENT_ID` is prefixed with `VITE_` so it can be accessed in the browser
- `GOOGLE_CLIENT_SECRET` is NOT prefixed with `VITE_` as it should only be used server-side
- Never commit your `.env` file to version control!

## Step 6: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to `http://localhost:5173`

3. Click the "Sign in with Google" button

4. You should be redirected to Google's sign-in page

5. After signing in and granting permissions, you should be redirected back to the app

6. Your email and name should now be displayed in the header

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Make sure the redirect URI in your `.env` file matches exactly what you configured in Google Cloud Console
- The redirect URI is case-sensitive
- Check for any trailing slashes

### Error: "OAuth credentials not configured"
- Verify that your `.env` file exists and contains the correct credentials
- Make sure the environment variables are named correctly
- Restart your development server after adding environment variables

### Error: "This app isn't verified"
- This is normal for apps in development
- Click "Advanced" → "Go to [App Name] (unsafe)" to proceed
- To remove this warning, you'll need to submit your app for verification with Google

## Production Deployment

When deploying to production:

1. Update the OAuth consent screen to publish your app (if it's not in testing mode)
2. Add your production domain to the authorized JavaScript origins
3. Add your production callback URL to authorized redirect URIs
4. Set the environment variables in your hosting platform (e.g., Vercel, Netlify)

## Security Best Practices

1. **Never commit** your `.env` file to version control
2. Use different OAuth credentials for development and production
3. Regularly rotate your OAuth client secret
4. Implement rate limiting on your authentication endpoints
5. Use HTTPS in production

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 Scopes for Google APIs](https://developers.google.com/identity/protocols/oauth2/scopes)
