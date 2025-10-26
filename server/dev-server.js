import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import pkg from 'agora-token';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory
config({ path: path.join(__dirname, '..', '.env') });

const { RtcTokenBuilder, RtcRole } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Get Agora credentials from environment
const getAgoraCredentials = () => {
  const appId = process.env.AGORA_APP_ID || process.env.VITE_AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;
  
  if (!appId) {
    throw new Error('Agora App ID not found. Please set AGORA_APP_ID or VITE_AGORA_APP_ID in .env file');
  }
  
  if (!appCertificate) {
    throw new Error('Agora App Certificate not found. Please set AGORA_APP_CERTIFICATE in .env file');
  }
  
  return { appId, appCertificate };
};

// Agora token endpoint
app.get('/api/agora/token', async (req, res) => {
  try {
    const { channelName, uid, role } = req.query;
    
    if (!channelName) {
      return res.status(400).json({ error: 'Channel name is required' });
    }

    const { appId, appCertificate } = getAgoraCredentials();

    // Generate token
    const expirationTimeInSeconds = 3600; // 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const serverRole = role === 'host' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      parseInt(uid || '0'),
      serverRole,
      privilegeExpiredTs
    );

    console.log('Token generated successfully for channel:', channelName, 'uid:', uid, 'role:', role);

    // Return token with expiration time
    res.status(200).json({ 
      token,
      expiresIn: expirationTimeInSeconds
    });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: error.message || 'Failed to generate token' });
  }
});

// Google OAuth endpoint
app.post('/api/google-oauth', async (req, res) => {
  try {
    const { code, redirect_uri } = req.body;

    if (!code || !redirect_uri) {
      return res.status(400).json({ error: 'Missing code or redirect_uri' });
    }

    // Get Google OAuth credentials
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Google OAuth credentials missing');
      return res.status(500).json({ error: 'Google OAuth credentials not configured' });
    }

    // Exchange code for tokens
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const responseData = await response.text();

    if (!response.ok) {
      console.error('Google token exchange error:', responseData);
      return res.status(400).json({ error: 'Failed to exchange code for tokens' });
    }

    const tokens = JSON.parse(responseData);
    
    // Fetch user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const userInfo = await userInfoResponse.json();
    
    // Return tokens and user info
    res.status(200).json({
      ...tokens,
      user: {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        id: userInfo.id
      }
    });
    
  } catch (error) {
    console.error('Error in Google OAuth exchange:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Dev server running on port ${PORT}`);
  console.log(`📡 Token endpoint: http://localhost:${PORT}/api/agora/token`);
  console.log(`🔐 Google OAuth: http://localhost:${PORT}/api/google-oauth`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});
