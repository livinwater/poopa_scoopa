# Environment Variables Setup

This project requires the following environment variables to be set in your `.env` file:

## Required Variables

### Agora Configuration
```env
VITE_AGORA_APP_ID=your_agora_app_id_here
VITE_AGORA_APP_CERTIFICATE=your_agora_app_certificate_here
```

### API Configuration
```env
VITE_API_URL=http://localhost:3000
```

## How to Get Your Agora Credentials

1. Sign up for an Agora account at [https://www.agora.io/](https://www.agora.io/)
2. Create a new project in the Agora Console
3. Copy your App ID and App Certificate
4. Add them to your `.env` file

## Setting Up Your .env File

1. Create a `.env` file in the root of your project
2. Copy the variables above
3. Replace the placeholder values with your actual credentials

**Note:** The `.env` file should not be committed to version control. Make sure it's in your `.gitignore` file.

## Usage in Code

These environment variables are accessed in the code using `import.meta.env`:

```javascript
const APP_ID = import.meta.env.VITE_AGORA_APP_ID
const APP_CERTIFICATE = import.meta.env.VITE_AGORA_APP_CERTIFICATE
const API_URL = import.meta.env.VITE_API_URL
```

**Important:** In Vite, environment variables must be prefixed with `VITE_` to be exposed to the client-side code.
