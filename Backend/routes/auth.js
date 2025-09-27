const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { 
  db, 
  collections, 
  roles,
  getUserByEmail,
  createUser,
  updateUser,
  createAuditLog,
  getDemoCredentials
} = require('../config/firebase');
const { 
  validateRegistration, 
  validateLogin, 
  validateProfileUpdate,
  validatePasswordChange,
  handleValidationErrors 
} = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Session management helper
const createSession = async (userId, userEmail, rememberMe = false) => {
  const sessionId = jwt.sign({ userId, email: userEmail }, process.env.JWT_SECRET);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 1));
  
  const sessionData = {
    sessionId,
    userId,
    userEmail,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    isActive: true,
    rememberMe,
  };

  await db.collection(collections.SESSIONS).add(sessionData);
  return sessionId;
};

// Generate JWT token
const generateToken = (userId, email, role) => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Set cookie options
const getCookieOptions = (rememberMe = false) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 30 days or 1 day
});

// @route   GET /api/auth/demo-credentials
// @desc    Get demo login credentials for testing
// @access  Public
router.get('/demo-credentials', (req, res) => {
  try {
    const credentials = getDemoCredentials();
    res.json({
      success: true,
      credentials
    });
  } catch (error) {
    console.error('Error getting demo credentials:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get demo credentials' 
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new user with enhanced security
// @access  Public
router.post('/register', validateRegistration, handleValidationErrors, async (req, res) => {
  try {
    const { email, password, firstName, lastName, studentId, phone, role = roles.STUDENT } = req.body;

    // Check if user already exists
    const existingUserQuery = await db
      .collection(collections.USERS)
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (!existingUserQuery.empty) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email address',
      });
    }

    // Check if studentId is provided and already exists
    if (studentId) {
      const existingStudentQuery = await db
        .collection(collections.USERS)
        .where('studentId', '==', studentId.toUpperCase())
        .limit(1)
        .get();

      if (!existingStudentQuery.empty) {
        return res.status(400).json({
          success: false,
          message: 'Student ID already exists',
        });
      }
    }

    // Hash password with enhanced security
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user document with enhanced fields
    const userData = {
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: role === roles.ADMIN ? roles.ADMIN : roles.STUDENT,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null,
      profileComplete: !!(studentId && phone),
      loginAttempts: 0,
      lockUntil: null,
      emailVerified: false,
      profilePicture: null,
      ...(studentId && { studentId: studentId.toUpperCase() }),
      ...(phone && { phone }),
    };

    // Save user to database
    const userRef = await db.collection(collections.USERS).add(userData);
    const userId = userRef.id;

    // Generate JWT token and create session
    const token = generateToken(userId, userData.email, userData.role);
    const sessionId = await createSession(userId, userData.email, false);

    // Set secure cookie
    const cookieOptions = getCookieOptions(false);
    res.cookie('authToken', token, cookieOptions);
    res.cookie('sessionId', sessionId, cookieOptions);

    // Remove password from response
    const { password: _, ...userResponse } = userData;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: userId,
          ...userResponse,
        },
        token,
        sessionCreated: true,
      },
    });

    // Log audit event
    await db.collection(collections.AUDIT_LOGS).add({
      action: 'USER_REGISTERED',
      userId,
      userEmail: userData.email,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        role: userData.role,
        profileComplete: userData.profileComplete,
      },
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user with enhanced session management
// @access  Public
router.post('/login', validateLogin, handleValidationErrors, async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;

    // Find user by email
    const userQuery = await db
      .collection(collections.USERS)
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (userQuery.empty) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    // Check if user is active
    if (userData.status === 'inactive') {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact administrator.',
      });
    }

    // Check for account lockout
    if (userData.lockUntil && new Date() < new Date(userData.lockUntil)) {
      return res.status(423).json({
        success: false,
        message: 'Account temporarily locked due to multiple failed login attempts. Please try again later.',
      });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, userData.password);

    if (!isPasswordValid) {
      // Increment login attempts
      const loginAttempts = (userData.loginAttempts || 0) + 1;
      const lockUntil = loginAttempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null; // 30 minutes lock

      await userDoc.ref.update({
        loginAttempts,
        ...(lockUntil && { lockUntil }),
        updatedAt: new Date().toISOString(),
      });

      return res.status(401).json({
        success: false,
        message: `Invalid email or password. ${5 - loginAttempts} attempts remaining.`,
      });
    }

    // Reset login attempts on successful login
    const loginTime = new Date().toISOString();
    await userDoc.ref.update({
      lastLogin: loginTime,
      loginAttempts: 0,
      lockUntil: null,
      updatedAt: loginTime,
    });

    // Generate JWT token and create session
    const token = generateToken(userId, userData.email, userData.role);
    const sessionId = await createSession(userId, userData.email, rememberMe);

    // Set secure cookies
    const cookieOptions = getCookieOptions(rememberMe);
    res.cookie('authToken', token, cookieOptions);
    res.cookie('sessionId', sessionId, cookieOptions);

    // Remove sensitive data from response
    const { password: _, loginAttempts: __, lockUntil: ___, ...userResponse } = userData;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: userId,
          ...userResponse,
          lastLogin: loginTime,
        },
        token,
        sessionId,
        rememberMe,
      },
    });

    // Log audit event
    await db.collection(collections.AUDIT_LOGS).add({
      action: 'USER_LOGIN',
      userId,
      userEmail: userData.email,
      timestamp: loginTime,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        rememberMe,
        sessionId,
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login',
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user and invalidate session
// @access  Private
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const sessionId = req.cookies?.sessionId;

    // Invalidate session in database if exists
    if (sessionId) {
      const sessionQuery = await db
        .collection(collections.SESSIONS)
        .where('sessionId', '==', sessionId)
        .limit(1)
        .get();

      if (!sessionQuery.empty) {
        const sessionDoc = sessionQuery.docs[0];
        await sessionDoc.ref.update({
          isActive: false,
          loggedOutAt: new Date().toISOString(),
        });
      }
    }

    // Clear all auth-related cookies
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    
    res.clearCookie('sessionId', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.json({
      success: true,
      message: 'Logout successful',
    });

    // Log audit event
    await db.collection(collections.AUDIT_LOGS).add({
      action: 'USER_LOGOUT',
      userId: req.user.userId,
      userEmail: req.user.email,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        sessionId,
      },
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during logout',
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userDoc = await db.collection(collections.USERS).doc(req.user.userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const userData = userDoc.data();
    const { password, ...userResponse } = userData;

    res.json({
      success: true,
      data: {
        user: {
          id: req.user.userId,
          ...userResponse,
        },
      },
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   POST /api/auth/refresh-token
// @desc    Refresh JWT token
// @access  Private (but handle missing/invalid tokens gracefully)
router.post('/refresh-token', async (req, res) => {
  try {
    // Get token from Authorization header or cookies
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    const cookieToken = req.cookies?.authToken;
    
    const tokenToVerify = token || cookieToken;
    
    if (!tokenToVerify) {
      return res.status(401).json({
        success: false,
        message: 'No token provided for refresh',
      });
    }

    // Verify the existing token (even if expired, we still want to check if it's valid)
    let decoded;
    try {
      decoded = jwt.verify(tokenToVerify, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        // Token is expired, but we can still decode it to get user info
        decoded = jwt.decode(tokenToVerify);
      } else {
        // Token is invalid
        return res.status(401).json({
          success: false,
          message: 'Invalid token for refresh',
        });
      }
    }

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload',
      });
    }

    // Verify user still exists in database
    const userDoc = await db.collection(collections.USERS).doc(decoded.userId).get();
    
    if (!userDoc.exists) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists',
      });
    }
    
    const userData = userDoc.data();
    
    // Check if user is active
    if (userData.status === 'inactive') {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive',
      });
    }

    // Generate new token
    const newToken = generateToken(decoded.userId, userData.email, userData.role);

    // Set new cookie
    res.cookie('authToken', newToken, getCookieOptions());

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
      },
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during token refresh',
    });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', [
  authenticateToken,
  validatePasswordChange,
  handleValidationErrors,
], async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    // Get current user data
    const userDoc = await db.collection(collections.USERS).doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const userData = userDoc.data();

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userData.password);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await userDoc.ref.update({
      password: hashedNewPassword,
      updatedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });

    // Log audit event
    await db.collection(collections.AUDIT_LOGS).add({
      action: 'PASSWORD_CHANGED',
      userId,
      userEmail: userData.email,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during password change',
    });
  }
});

// @route   POST /api/auth/validate-session
// @desc    Validate current session
// @access  Private
router.post('/validate-session', authenticateToken, async (req, res) => {
  try {
    const sessionId = req.cookies?.sessionId;
    const userId = req.user.userId;

    if (!sessionId) {
      return res.status(401).json({
        success: false,
        message: 'No session found',
      });
    }

    // Check session in database
    const sessionQuery = await db
      .collection(collections.SESSIONS)
      .where('sessionId', '==', sessionId)
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (sessionQuery.empty) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session',
      });
    }

    const sessionDoc = sessionQuery.docs[0];
    const sessionData = sessionDoc.data();

    // Check if session is expired
    if (new Date() > new Date(sessionData.expiresAt)) {
      await sessionDoc.ref.update({
        isActive: false,
        expiredAt: new Date().toISOString(),
      });

      return res.status(401).json({
        success: false,
        message: 'Session expired',
      });
    }

    res.json({
      success: true,
      message: 'Session is valid',
      data: {
        sessionId,
        expiresAt: sessionData.expiresAt,
        rememberMe: sessionData.rememberMe,
      },
    });

  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during session validation',
    });
  }
});

module.exports = router;