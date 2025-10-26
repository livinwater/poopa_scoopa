import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        setStatus('Authentication failed. Redirecting...');
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      if (!code || !state) {
        console.error('Missing OAuth parameters');
        setStatus('Invalid authentication parameters. Redirecting...');
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      try {
        setStatus('Authenticating with Google...');
        
        // Verify state
        const storedState = sessionStorage.getItem('google_oauth_state');
        if (state !== storedState) {
          console.error('OAuth state mismatch');
          setStatus('Security verification failed. Redirecting...');
          setTimeout(() => navigate('/'), 2000);
          return;
        }

        // Clean up state
        sessionStorage.removeItem('google_oauth_state');

        // Exchange code for tokens
        setStatus('Fetching user information...');
        const redirectUri = `${window.location.origin}/auth/callback`;

        const response = await fetch('/api/google-oauth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            redirect_uri: redirectUri,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to exchange code for tokens');
        }

        const data = await response.json();

        const userData = {
          email: data.user.email,
          name: data.user.name,
          picture: data.user.picture,
          idToken: data.id_token,
          accessToken: data.access_token,
        };

        // Store user in localStorage
        localStorage.setItem('google_user', JSON.stringify(userData));
        console.log('✅ Google login successful:', userData.email);

        setStatus('Authentication successful! Redirecting...');
        
        // Redirect to home
        setTimeout(() => navigate('/', { replace: true }), 1000);
      } catch (error) {
        console.error('Error during OAuth callback:', error);
        setStatus('Authentication failed. Redirecting...');
        setTimeout(() => navigate('/'), 2000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '18px',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <div>{status}</div>
    </div>
  );
}
