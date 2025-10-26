import React, { useState, useEffect } from 'react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const GoogleLogin = ({ onUserLogin }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if there's a stored user session
  useEffect(() => {
    const loadStoredUser = () => {
      const storedUser = localStorage.getItem('google_user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          console.log('Loading stored user:', userData.email);
          setUser(userData);
          if (onUserLogin) {
            onUserLogin(userData);
          }
        } catch (error) {
          console.error('Error parsing stored user:', error);
          localStorage.removeItem('google_user');
        }
      }
    };

    // Load immediately
    loadStoredUser();

    // Also listen for storage changes (in case multiple tabs)
    window.addEventListener('storage', loadStoredUser);
    return () => window.removeEventListener('storage', loadStoredUser);
  }, [onUserLogin]);

  const handleGoogleSignIn = () => {
    if (!GOOGLE_CLIENT_ID) {
      alert('Google OAuth is not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.');
      return;
    }

    setIsLoading(true);

    // Generate state for security
    const state = Math.random().toString(36).substring(7);
    sessionStorage.setItem('google_oauth_state', state);

    // Build authorization URL
    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = 'openid email profile';
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    console.log('Redirecting to Google OAuth:', authUrl.toString());
    window.location.href = authUrl.toString();
  };

  const handleSignOut = () => {
    localStorage.removeItem('google_user');
    setUser(null);
    if (onUserLogin) {
      onUserLogin(null);
    }
  };



  if (user) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.75rem' 
      }}>
        {user.picture && (
          <img 
            src={user.picture} 
            alt={user.name} 
            style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '50%',
              border: '2px solid var(--earth-green)'
            }}
          />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--earth-brown-dark)' }}>
            {user.name}
          </div>
          <button
            onClick={handleSignOut}
            style={{
              fontSize: '0.75rem',
              color: 'var(--earth-green)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      className="btn-google"
      style={{ minWidth: 'auto', whiteSpace: 'nowrap' }}
    >
      {isLoading ? (
        <span>Loading...</span>
      ) : (
        <>
          <span style={{ fontSize: '1.2rem' }}>G</span>
          <span>Continue with Google</span>
        </>
      )}
    </button>
  );
};
