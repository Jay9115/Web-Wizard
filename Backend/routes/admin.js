const express = require('express');
const bcrypt = require('bcryptjs');
const { db, collections, roles } = require('../config/firebase');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { 
  validateAdminUserCreation, 
  validateProfileUpdate,
  handleValidationErrors 
} = require('../middleware/validation');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// @route   GET /api/admin/users
// @desc    Get all users with pagination and search
// @access  Admin only
router.get('/users', async (req, res) => {
  try {
    const { 
      limit = 20, 
      offset = 0, 
      search = '', 
      role = '', 
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'desc' 
    } = req.query;

    let query = db.collection(collections.USERS);

    // Apply filters
    if (role && Object.values(roles).includes(role)) {
      query = query.where('role', '==', role);
    }

    if (status) {
      query = query.where('status', '==', status);
    }

    // Apply sorting
    query = query.orderBy(sortBy, sortOrder);

    // Get paginated results
    if (offset > 0) {
      const offsetQuery = await db
        .collection(collections.USERS)
        .orderBy(sortBy, sortOrder)
        .limit(parseInt(offset))
        .get();

      if (!offsetQuery.empty) {
        const lastDoc = offsetQuery.docs[offsetQuery.docs.length - 1];
        query = query.startAfter(lastDoc);
      }
    }

    query = query.limit(parseInt(limit));
    const usersQuery = await query.get();

    let users = usersQuery.docs.map(doc => {
      const userData = doc.data();
      const { password, ...userWithoutPassword } = userData;
      return {
        id: doc.id,
        ...userWithoutPassword,
      };
    });

    // Apply search filter (client-side filtering for simplicity)
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(user => 
        user.firstName?.toLowerCase().includes(searchLower) ||
        user.lastName?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.studentId?.toLowerCase().includes(searchLower)
      );
    }

    // Get total count
    let totalQuery = db.collection(collections.USERS);
    if (role && Object.values(roles).includes(role)) {
      totalQuery = totalQuery.where('role', '==', role);
    }
    if (status) {
      totalQuery = totalQuery.where('status', '==', status);
    }

    const totalSnapshot = await totalQuery.get();
    let totalUsers = totalSnapshot.size;

    // Adjust total count for search
    if (search) {
      const allUsersForSearch = totalSnapshot.docs.map(doc => {
        const userData = doc.data();
        return {
          id: doc.id,
          ...userData,
        };
      });

      const filteredUsers = allUsersForSearch.filter(user => 
        user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase()) ||
        user.studentId?.toLowerCase().includes(search.toLowerCase())
      );
      totalUsers = filteredUsers.length;
    }

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total: totalUsers,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: users.length === parseInt(limit),
        },
        filters: {
          search,
          role,
          status,
          sortBy,
          sortOrder,
        },
      },
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   GET /api/admin/users/:userId
// @desc    Get specific user details
// @access  Admin only
router.get('/users/:userId', async (req, res) => {
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

    // Get user's recent activity
    const activityQuery = await db
      .collection(collections.AUDIT_LOGS)
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    const recentActivity = activityQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      data: {
        user: {
          id: userId,
          ...userResponse,
        },
        recentActivity,
      },
    });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   POST /api/admin/users
// @desc    Create a new user (Admin only)
// @access  Admin only
router.post('/users', validateAdminUserCreation, handleValidationErrors, async (req, res) => {
  try {
    const { email, firstName, lastName, role, studentId, phone, generatePassword = true } = req.body;

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

    // Generate temporary password if not provided
    let password = req.body.password;
    if (generatePassword || !password) {
      password = Math.random().toString(36).slice(-12) + 'A1!'; // Ensure complexity
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
      role: role || roles.STUDENT,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user.userId,
      lastLogin: null,
      profileComplete: false,
      mustChangePassword: generatePassword || !req.body.password,
      ...(studentId && { studentId: studentId.toUpperCase() }),
      ...(phone && { phone }),
    };

    // Save user to Firestore
    const userRef = await db.collection(collections.USERS).add(userData);
    const userId = userRef.id;

    // Remove password from response
    const { password: _, ...userResponse } = userData;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: userId,
          ...userResponse,
        },
        ...(generatePassword && { temporaryPassword: password }),
      },
    });

    // Log audit event
    await db.collection(collections.AUDIT_LOGS).add({
      action: 'USER_CREATED_BY_ADMIN',
      userId: req.user.userId,
      targetUserId: userId,
      userEmail: req.user.email,
      targetUserEmail: userData.email,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during user creation',
    });
  }
});

// @route   PUT /api/admin/users/:userId
// @desc    Update user details
// @access  Admin only
router.put('/users/:userId', validateProfileUpdate, handleValidationErrors, async (req, res) => {
  try {
    const { userId } = req.params;

    const allowedUpdates = [
      'firstName',
      'lastName',
      'phone',
      'dateOfBirth',
      'address',
      'status',
      'role',
      'studentId',
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
    if (updates.studentId) updates.studentId = updates.studentId.toUpperCase();

    // Validate role
    if (updates.role && !Object.values(roles).includes(updates.role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified',
      });
    }

    // Validate status
    if (updates.status && !['active', 'inactive'].includes(updates.status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status specified',
      });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid updates provided',
      });
    }

    // Check if studentId already exists (if being updated)
    if (updates.studentId) {
      const existingStudentQuery = await db
        .collection(collections.USERS)
        .where('studentId', '==', updates.studentId)
        .limit(1)
        .get();

      if (!existingStudentQuery.empty && existingStudentQuery.docs[0].id !== userId) {
        return res.status(400).json({
          success: false,
          message: 'Student ID already exists',
        });
      }
    }

    // Add timestamp and admin info
    updates.updatedAt = new Date().toISOString();
    updates.updatedBy = req.user.userId;

    // Update user document
    await db.collection(collections.USERS).doc(userId).update(updates);

    // Get updated user data
    const updatedUserDoc = await db.collection(collections.USERS).doc(userId).get();
    
    if (!updatedUserDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const updatedUserData = updatedUserDoc.data();
    const { password, ...userResponse } = updatedUserData;

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: {
          id: userId,
          ...userResponse,
        },
      },
    });

    // Log audit event
    await db.collection(collections.AUDIT_LOGS).add({
      action: 'USER_UPDATED_BY_ADMIN',
      userId: req.user.userId,
      targetUserId: userId,
      userEmail: req.user.email,
      updatedFields: Object.keys(updates),
      timestamp: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during user update',
    });
  }
});

// @route   DELETE /api/admin/users/:userId
// @desc    Delete user (soft delete by marking as inactive)
// @access  Admin only
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { hardDelete = false } = req.query;

    // Prevent admin from deleting themselves
    if (userId === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    const userDoc = await db.collection(collections.USERS).doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const userData = userDoc.data();

    if (hardDelete === 'true') {
      // Hard delete - actually remove the document
      await userDoc.ref.delete();

      res.json({
        success: true,
        message: 'User permanently deleted',
      });

      // Log audit event
      await db.collection(collections.AUDIT_LOGS).add({
        action: 'USER_HARD_DELETED_BY_ADMIN',
        userId: req.user.userId,
        targetUserId: userId,
        userEmail: req.user.email,
        targetUserEmail: userData.email,
        timestamp: new Date().toISOString(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
    } else {
      // Soft delete - mark as inactive
      await userDoc.ref.update({
        status: 'inactive',
        deletedAt: new Date().toISOString(),
        deletedBy: req.user.userId,
        updatedAt: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: 'User deactivated successfully',
      });

      // Log audit event
      await db.collection(collections.AUDIT_LOGS).add({
        action: 'USER_DEACTIVATED_BY_ADMIN',
        userId: req.user.userId,
        targetUserId: userId,
        userEmail: req.user.email,
        targetUserEmail: userData.email,
        timestamp: new Date().toISOString(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
    }

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during user deletion',
    });
  }
});

// @route   GET /api/admin/stats
// @desc    Get dashboard statistics
// @access  Admin only
router.get('/stats', async (req, res) => {
  try {
    // Get total users count
    const totalUsersSnapshot = await db.collection(collections.USERS).get();
    const totalUsers = totalUsersSnapshot.size;

    // Get active users count
    const activeUsersSnapshot = await db
      .collection(collections.USERS)
      .where('status', '==', 'active')
      .get();
    const activeUsers = activeUsersSnapshot.size;

    // Get students count
    const studentsSnapshot = await db
      .collection(collections.USERS)
      .where('role', '==', roles.STUDENT)
      .get();
    const totalStudents = studentsSnapshot.size;

    // Get admins count
    const adminsSnapshot = await db
      .collection(collections.USERS)
      .where('role', '==', roles.ADMIN)
      .get();
    const totalAdmins = adminsSnapshot.size;

    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const recentRegistrationsSnapshot = await db
      .collection(collections.USERS)
      .where('createdAt', '>=', thirtyDaysAgo)
      .get();
    const recentRegistrations = recentRegistrationsSnapshot.size;

    // Get recent activity
    const recentActivitySnapshot = await db
      .collection(collections.AUDIT_LOGS)
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();

    const recentActivity = recentActivitySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          activeUsers,
          inactiveUsers: totalUsers - activeUsers,
          totalStudents,
          totalAdmins,
          recentRegistrations,
        },
        recentActivity,
      },
    });

  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   GET /api/admin/audit-logs
// @desc    Get audit logs with filtering
// @access  Admin only
router.get('/audit-logs', async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      action = '', 
      userId = '',
      startDate = '',
      endDate = ''
    } = req.query;

    let query = db.collection(collections.AUDIT_LOGS);

    // Apply filters
    if (action) {
      query = query.where('action', '==', action);
    }

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    if (startDate) {
      query = query.where('timestamp', '>=', startDate);
    }

    if (endDate) {
      query = query.where('timestamp', '<=', endDate);
    }

    // Apply sorting
    query = query.orderBy('timestamp', 'desc');

    // Apply pagination
    if (offset > 0) {
      const offsetQuery = await db
        .collection(collections.AUDIT_LOGS)
        .orderBy('timestamp', 'desc')
        .limit(parseInt(offset))
        .get();

      if (!offsetQuery.empty) {
        const lastDoc = offsetQuery.docs[offsetQuery.docs.length - 1];
        query = query.startAfter(lastDoc);
      }
    }

    query = query.limit(parseInt(limit));
    const logsQuery = await query.get();

    const logs = logsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get total count for the query
    let totalQuery = db.collection(collections.AUDIT_LOGS);
    if (action) totalQuery = totalQuery.where('action', '==', action);
    if (userId) totalQuery = totalQuery.where('userId', '==', userId);
    if (startDate) totalQuery = totalQuery.where('timestamp', '>=', startDate);
    if (endDate) totalQuery = totalQuery.where('timestamp', '<=', endDate);

    const totalSnapshot = await totalQuery.get();

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total: totalSnapshot.size,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: logs.length === parseInt(limit),
        },
      },
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

module.exports = router;