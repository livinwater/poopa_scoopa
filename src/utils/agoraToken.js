// Agora token utility functions

// Token server URL - use local dev server in development, Vercel API in production
const TOKEN_SERVER_URL = import.meta.env.DEV 
  ? 'http://localhost:3000/api/agora/token'
  : '/api/agora/token';

export async function fetchAgoraToken(channelName, uid, role = 'audience') {
  try {
    console.log(`Requesting token from server for channel: ${channelName}, uid: ${uid}, role: ${role}`)
    
    const response = await fetch(
      `${TOKEN_SERVER_URL}?channelName=${encodeURIComponent(channelName)}&uid=${uid}&role=${role}`
    )
    
    if (!response.ok) {
      throw new Error(`Token server error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    if (!data.token) {
      throw new Error('Token not found in response')
    }
    
    console.log('Successfully obtained token from server')
    return data.token
    
  } catch (error) {
    console.error(`Error fetching token: ${error instanceof Error ? error.message : error}`)
    return null
  }
}

export function generateLocalToken(channelName, uid) {
  // This is a placeholder for local token generation if needed
  // In production, you should always use server-generated tokens
  console.warn('Using null token - implement proper token generation')
  return null
}
