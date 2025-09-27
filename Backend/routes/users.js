const express = require('express');
const { db, collections, roles } = require('../config/firebase');
const { authenticateToken, requireOwnershipOrAdmin } = require('../middleware/auth');
const { 
  validateProfileUpdate, 
  handleValidationErrors 
} = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/users/profile/:userId
// @desc    Get user profile
// @access  Private (Own profile or Admin)
router.get('/profile/:userId', authenticateToken, requireOwnershipOrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const userDoc = await db.collection(collections.USERS).doc(userId).get();

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
          id: userId,
          ...userResponse,
        },
      },
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   PUT /api/users/profile/:userId
// @desc    Update user profile
// @access  Private (Own profile or Admin)
router.put('/profile/:userId', [
  authenticateToken,
  requireOwnershipOrAdmin,
  validateProfileUpdate,
  handleValidationErrors,
], async (req, res) => {
  try {
    const { userId } = req.params;
    const allowedUpdates = [
      'firstName',
      'lastName',
      'phone',
      'dateOfBirth',
      'address',
      'emergencyContact',
      'profilePicture',
    ];

    // Filter only allowed updates
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key) && req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    });

    // Add trim for string fields
    if (updates.firstName) updates.firstName = updates.firstName.trim();
    if (updates.lastName) updates.lastName = updates.lastName.trim();
    if (updates.address) updates.address = updates.address.trim();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid updates provided',
      });
    }

    // Add timestamp
    updates.updatedAt = new Date().toISOString();

    // Check if this makes profile complete
    const userDoc = await db.collection(collections.USERS).doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const currentData = userDoc.data();
    const updatedData = { ...currentData, ...updates };

    // Check if profile is now complete
    const isProfileComplete = !!(
      updatedData.firstName &&
      updatedData.lastName &&
      updatedData.email &&
      updatedData.phone &&
      updatedData.dateOfBirth
    );

    if (isProfileComplete !== currentData.profileComplete) {
      updates.profileComplete = isProfileComplete;
    }

    // Update user document
    await userDoc.ref.update(updates);

    // Get updated user data
    const updatedUserDoc = await db.collection(collections.USERS).doc(userId).get();
    const updatedUserData = updatedUserDoc.data();
    const { password, ...userResponse } = updatedUserData;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: userId,
          ...userResponse,
        },
      },
    });

    // Log audit event
    await db.collection(collections.AUDIT_LOGS).add({
      action: 'PROFILE_UPDATED',
      userId: req.user.userId,
      targetUserId: userId,
      userEmail: req.user.email,
      updatedFields: Object.keys(updates),
      timestamp: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during profile update',
    });
  }
});

// @route   GET /api/users/dashboard/:userId
// @desc    Get user dashboard data
// @access  Private (Own dashboard or Admin)
router.get('/dashboard/:userId', authenticateToken, requireOwnershipOrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user data
    const userDoc = await db.collection(collections.USERS).doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const userData = userDoc.data();

    // Get recent activity from audit logs
    const recentActivityQuery = await db
      .collection(collections.AUDIT_LOGS)
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    const recentActivity = recentActivityQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calculate profile completion percentage
    const profileFields = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'dateOfBirth',
      'address',
      'profilePicture',
    ];

    const completedFields = profileFields.filter(field => userData[field]);
    const profileCompletion = Math.round((completedFields.length / profileFields.length) * 100);

    // Dashboard statistics
    const dashboardData = {
      profileCompletion,
      totalLogins: recentActivity.filter(activity => activity.action === 'USER_LOGIN').length,
      lastLogin: userData.lastLogin,
      accountCreated: userData.createdAt,
      accountStatus: userData.status,
      recentActivity: recentActivity.slice(0, 5), // Last 5 activities
    };

    const { password, ...userResponse } = userData;

    res.json({
      success: true,
      data: {
        user: {
          id: userId,
          ...userResponse,
        },
        dashboard: dashboardData,
      },
    });

  } catch (error) {
    console.error('Get user dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   POST /api/users/upload-avatar/:userId
// @desc    Upload user avatar (placeholder - would integrate with file upload service)
// @access  Private (Own profile or Admin)
router.post('/upload-avatar/:userId', authenticateToken, requireOwnershipOrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { avatarUrl } = req.body;

    if (!avatarUrl) {
      return res.status(400).json({
        success: false,
        message: 'Avatar URL is required',
      });
    }

    // Update user profile picture
    await db.collection(collections.USERS).doc(userId).update({
      profilePicture: avatarUrl,
      updatedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      data: {
        profilePicture: avatarUrl,
      },
    });

    // Log audit event
    await db.collection(collections.AUDIT_LOGS).add({
      action: 'AVATAR_UPDATED',
      userId: req.user.userId,
      targetUserId: userId,
      userEmail: req.user.email,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during avatar upload',
    });
  }
});

// @route   GET /api/users/activity/:userId
// @desc    Get user activity log
// @access  Private (Own activity or Admin)
router.get('/activity/:userId', authenticateToken, requireOwnershipOrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    // Get user activity
    let query = db
      .collection(collections.AUDIT_LOGS)
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limit));

    if (offset > 0) {
      const offsetDoc = await db
        .collection(collections.AUDIT_LOGS)
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(parseInt(offset))
        .get();

      if (!offsetDoc.empty) {
        const lastDoc = offsetDoc.docs[offsetDoc.docs.length - 1];
        query = query.startAfter(lastDoc);
      }
    }

    const activityQuery = await query.get();

    const activities = activityQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get total count for pagination
    const totalQuery = await db
      .collection(collections.AUDIT_LOGS)
      .where('userId', '==', userId)
      .get();

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          total: totalQuery.size,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: activityQuery.size === parseInt(limit),
        },
      },
    });

  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

module.exports = router;