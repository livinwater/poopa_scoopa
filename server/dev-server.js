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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Dev server running on port ${PORT}`);
  console.log(`📡 Token endpoint: http://localhost:${PORT}/api/agora/token`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});
