# Firebase Phone Authentication

Phone authentication system built with Firebase Authentication. This implementation provides secure phone number verification using SMS OTP codes with reCAPTCHA validation.

## Features

- **Phone Number Authentication**: Sign in users via SMS verification codes
- **reCAPTCHA Integration**: Prevents automated abuse and bot attacks
- **Firebase ID Token Management**: Secure token generation and display
- **Backend Verification**: Server-side token validation support
- **Responsive Design**: Mobile-friendly UI with modern gradient styling
- **Error Handling**: Comprehensive error messages and user feedback
- **Token Management**: Copy tokens and verify with backend API

## Prerequisites

Before running this application, ensure you have:

- Node.js (v20 or higher)
- pnpm, npm or yarn package manager
- Firebase project with Phone Authentication enabled
- Firebase Admin SDK configured on your backend (for token verification)

## Project Structure

```
phone-auth/
├── index.html      # Main HTML structure
├── styles.css      # Application styling
├── app.js          # Firebase authentication logic
└── README.md       # Project documentation
```

## Configuration

### 1. Firebase Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Navigate to **Authentication** → **Sign-in method**
4. Enable **Phone** authentication provider
5. Add your domain to **Authorized domains** (localhost is enabled by default)

### 2. Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to the **Your apps** section
3. Click on the web app icon `</>`
4. Copy the Firebase configuration object
5. Paste it into `app.js`, replacing the empty `firebaseConfig` object:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

### 3. Backend Configuration

If you have a backend API for token verification, update the `BACKEND_URL` in `app.js`:

```javascript
const BACKEND_URL = "http://localhost:3030/api/";
```

Your backend should have an endpoint `/verify-token` that accepts POST requests with the following body:

```json
{
  "idToken": "firebase-id-token-string"
}
```

## Installation & Running

### Option 1: Using npx serve (Recommended)

No installation required. Simply run:

```bash
npx serve
```

This will:
- Start a local web server on port 3000 (or the next available port)
- Automatically open your browser to the application
- Provide hot-reload capabilities

Access the application at:

```
http://127.0.0.1:3000
```
