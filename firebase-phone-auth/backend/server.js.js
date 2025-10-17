/**
 * Firebase Authentication Backend API
 * Provides token verification and user management endpoints using Firebase Admin SDK
 */

const admin = require('firebase-admin');
const express = require('express');

/**
 * Firebase Admin SDK Configuration
 * Initialize with service account credentials
 */
const serviceAccount = require('./firebaseServiceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://YOUR-PROJECT-ID.firebaseio.com'
});

const app = express();
app.use(express.json());

/**
 * Token Verification Endpoint
 * POST /api/verify-token
 * 
 * Verifies Firebase ID token and returns decoded user information
 * 
 * @body {string} idToken - Firebase ID token from client
 * @returns {Object} User information including UID and phone number
 */
app.post('/api/verify-token', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ 
      success: false,
      error: 'No token provided' 
    });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    console.log('Token verified successfully');
    console.log('User ID:', decodedToken.uid);
    console.log('Phone:', decodedToken.phone_number);

    res.json({
      success: true,
      user: {
        uid: decodedToken.uid,
        phoneNumber: decodedToken.phone_number,
        claims: decodedToken
      }
    });
  } catch (error) {
    console.error('Token verification failed:', error.message);
    
    res.status(401).json({
      success: false,
      error: 'Invalid token',
      details: error.message
    });
  }
});

/**
 * Custom Token Generation Endpoint
 * POST /api/create-custom-token
 * 
 * Creates a custom authentication token for server-side authentication
 * 
 * @body {string} phoneNumber - User's phone number with country code
 * @returns {Object} Custom token and user UID
 */
app.post('/api/create-custom-token', async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({
      success: false,
      error: 'Phone number required'
    });
  }

  try {
    let user;
    
    try {
      user = await admin.auth().getUserByPhoneNumber(phoneNumber);
    } catch (error) {
      user = await admin.auth().createUser({ phoneNumber });
      console.log('New user created:', user.uid);
    }

    const customToken = await admin.auth().createCustomToken(user.uid);

    res.json({
      success: true,
      customToken,
      uid: user.uid
    });
  } catch (error) {
    console.error('Custom token creation failed:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get User by Phone Number Endpoint
 * POST /api/get-user-by-phone
 * 
 * Retrieves user information by phone number
 * 
 * @body {string} phoneNumber - User's phone number with country code
 * @returns {Object} User account information
 */
app.post('/api/get-user-by-phone', async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({
      success: false,
      error: 'Phone number required'
    });
  }

  try {
    const user = await admin.auth().getUserByPhoneNumber(phoneNumber);
    
    res.json({
      success: true,
      user: {
        uid: user.uid,
        phoneNumber: user.phoneNumber,
        disabled: user.disabled,
        metadata: {
          creationTime: user.metadata.creationTime,
          lastSignInTime: user.metadata.lastSignInTime
        }
      }
    });
  } catch (error) {
    console.error('User retrieval failed:', error.message);
    
    res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }
});

/**
 * Revoke User Tokens Endpoint
 * POST /api/revoke-tokens
 * 
 * Revokes all refresh tokens for a user
 * 
 * @body {string} uid - User ID
 * @returns {Object} Success status
 */
app.post('/api/revoke-tokens', async (req, res) => {
  const { uid } = req.body;

  if (!uid) {
    return res.status(400).json({
      success: false,
      error: 'User ID required'
    });
  }

  try {
    await admin.auth().revokeRefreshTokens(uid);
    
    const user = await admin.auth().getUser(uid);
    const timestamp = new Date(user.tokensValidAfterTime).getTime() / 1000;

    console.log('Tokens revoked for user:', uid);
    console.log('Tokens valid after:', new Date(timestamp * 1000));

    res.json({
      success: true,
      message: 'Tokens revoked successfully',
      tokensValidAfterTime: timestamp
    });
  } catch (error) {
    console.error('Token revocation failed:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Health Check Endpoint
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Firebase Auth API'
  });
});

/**
 * Error Handling Middleware
 */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

/**
 * Start Server
 */
const PORT = process.env.PORT || 3030;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
