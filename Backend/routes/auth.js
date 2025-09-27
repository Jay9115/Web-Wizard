const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { db, collections, roles } = require('../config/firebase');
const { 
  validateRegistration, 
  validateLogin, 
  handleValidationErrors 
} = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

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

// @route   POST /api/auth/register
// @desc    Register a new user
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

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user document
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
      profileComplete: false,
      ...(studentId && { studentId: studentId.toUpperCase() }),
      ...(phone && { phone }),
    };

    // Save user to Firestore
    const userRef = await db.collection(collections.USERS).add(userData);
    const userId = userRef.id;

    // Generate JWT token
    const token = generateToken(userId, userData.email, userData.role);

    // Set cookie
    res.cookie('authToken', token, getCookieOptions());

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
// @desc    Login user
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

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, userData.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Update last login
    await userDoc.ref.update({
      lastLogin: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Generate JWT token
    const token = generateToken(userId, userData.email, userData.role);

    // Set cookie with remember me option
    res.cookie('authToken', token, getCookieOptions(rememberMe));

    // Remove password from response
    const { password: _, ...userResponse } = userData;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: userId,
          ...userResponse,
          lastLogin: new Date().toISOString(),
        },
        token,
      },
    });

    // Log audit event
    await db.collection(collections.AUDIT_LOGS).add({
      action: 'USER_LOGIN',
      userId,
      userEmail: userData.email,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      rememberMe,
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
// @desc    Logout user
// @access  Private
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Clear the auth cookie
    res.clearCookie('authToken', {
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
// @access  Private
router.post('/refresh-token', authenticateToken, async (req, res) => {
  try {
    const { userId, email, role } = req.user;

    // Generate new token
    const newToken = generateToken(userId, email, role);

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
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
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

module.exports = router;