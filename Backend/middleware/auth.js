const jwt = require('jsonwebtoken');
const { db, collections, roles } = require('../config/firebase');

// Verify JWT Token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    // Also check for token in cookies (for remember me functionality)
    const cookieToken = req.cookies?.authToken;
    
    const tokenToVerify = token || cookieToken;
    
    if (!tokenToVerify) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }
    
    const decoded = jwt.verify(tokenToVerify, process.env.JWT_SECRET);
    
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
    
    req.user = {
      userId: decoded.userId,
      email: userData.email,
      role: userData.role,
      ...userData,
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired',
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
    });
  }
};

// Check if user has admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== roles.ADMIN) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }
  next();
};

// Check if user has student role
const requireStudent = (req, res, next) => {
  if (req.user.role !== roles.STUDENT) {
    return res.status(403).json({
      success: false,
      message: 'Student access required',
    });
  }
  next();
};

// Check if user can access their own data or is admin
const requireOwnershipOrAdmin = (req, res, next) => {
  const targetUserId = req.params.userId || req.params.id;
  
  if (req.user.role === roles.ADMIN || req.user.userId === targetUserId) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied: You can only access your own data',
    });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireStudent,
  requireOwnershipOrAdmin,
};