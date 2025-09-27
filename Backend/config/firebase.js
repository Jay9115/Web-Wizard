// Firebase Admin SDK Configuration
const admin = require('firebase-admin');

// Simple in-memory database for demo purposes
// In production, replace this with actual Firebase configuration
const mockDB = {
  users: new Map(),
  sessions: new Map(),
  audit_logs: new Map(),
};

// Initialize demo users with hashed passwords
const initializeDemoUsers = async () => {
  try {
    const bcrypt = require('bcryptjs');
    const saltRounds = 12;
    
    // Demo Student User
    const studentPassword = await bcrypt.hash('student123', saltRounds);
    const studentId = 'demo-student-' + Date.now();
    mockDB.users.set(studentId, {
      id: studentId,
      email: 'student@demo.com',
      password: studentPassword,
      firstName: 'John',
      lastName: 'Student',
      role: 'student',
      status: 'active',
      studentId: 'STU001',
      phone: '+1234567890',
      dateOfBirth: '1999-01-15',
      address: '123 Student St, Education City',
      profileComplete: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null,
      loginAttempts: 0,
      lockUntil: null,
    });

    // Demo Admin User
    const adminPassword = await bcrypt.hash('admin123', saltRounds);
    const adminId = 'demo-admin-' + Date.now();
    mockDB.users.set(adminId, {
      id: adminId,
      email: 'admin@demo.com',
      password: adminPassword,
      firstName: 'Jane',
      lastName: 'Administrator',
      role: 'admin',
      status: 'active',
      phone: '+1987654321',
      dateOfBirth: '1985-05-20',
      address: '456 Admin Ave, Management District',
      profileComplete: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null,
      loginAttempts: 0,
      lockUntil: null,
    });

    console.log('✅ Demo users initialized successfully:');
    console.log('🎓 Student: student@demo.com / student123');
    console.log('👨‍💼 Admin: admin@demo.com / admin123');
  } catch (error) {
    console.error('❌ Error initializing demo users:', error);
  }
};

// Mock Firestore-like interface
const createMockCollection = (collectionName) => ({
  add: async (data) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    mockDB[collectionName].set(id, { ...data, id });
    return { id };
  },
  doc: (id) => ({
    get: async () => ({
      exists: mockDB[collectionName].has(id),
      data: () => mockDB[collectionName].get(id),
      id,
    }),
    update: async (data) => {
      if (mockDB[collectionName].has(id)) {
        const existing = mockDB[collectionName].get(id);
        mockDB[collectionName].set(id, { ...existing, ...data });
      }
    },
    delete: async () => {
      mockDB[collectionName].delete(id);
    },
    ref: {
      update: async (data) => {
        if (mockDB[collectionName].has(id)) {
          const existing = mockDB[collectionName].get(id);
          mockDB[collectionName].set(id, { ...existing, ...data });
        }
      },
      delete: async () => {
        mockDB[collectionName].delete(id);
      },
    },
  }),
  where: (field, operator, value) => ({
    limit: (num) => ({
      get: async () => {
        const matches = Array.from(mockDB[collectionName].values())
          .filter(doc => {
            if (operator === '==') return doc[field] === value;
            if (operator === '>=') return doc[field] >= value;
            if (operator === '<=') return doc[field] <= value;
            return false;
          });
        
        return {
          empty: matches.length === 0,
          docs: matches.slice(0, num).map(doc => ({
            id: doc.id,
            data: () => doc,
            ref: {
              update: async (updateData) => {
                if (mockDB[collectionName].has(doc.id)) {
                  const existing = mockDB[collectionName].get(doc.id);
                  mockDB[collectionName].set(doc.id, { ...existing, ...updateData });
                }
              },
            },
          })),
        };
      },
    }),
    get: async () => {
      const matches = Array.from(mockDB[collectionName].values())
        .filter(doc => {
          if (operator === '==') return doc[field] === value;
          if (operator === '>=') return doc[field] >= value;
          if (operator === '<=') return doc[field] <= value;
          return false;
        });
      
      return {
        empty: matches.length === 0,
        docs: matches.map(doc => ({
          id: doc.id,
          data: () => doc,
          ref: {
            update: async (updateData) => {
              if (mockDB[collectionName].has(doc.id)) {
                const existing = mockDB[collectionName].get(doc.id);
                mockDB[collectionName].set(doc.id, { ...existing, ...updateData });
              }
            },
          },
        })),
      };
    },
  }),
  get: async () => ({
    empty: mockDB[collectionName].size === 0,
    size: mockDB[collectionName].size,
    docs: Array.from(mockDB[collectionName].values()).map(doc => ({
      id: doc.id,
      data: () => doc,
    })),
  }),
  orderBy: (field, direction = 'asc') => ({
    limit: (num) => ({
      get: async () => {
        const sorted = Array.from(mockDB[collectionName].values()).sort((a, b) => {
          if (direction === 'desc') return b[field] > a[field] ? 1 : -1;
          return a[field] > b[field] ? 1 : -1;
        });
        return {
          empty: sorted.length === 0,
          docs: sorted.slice(0, num).map(doc => ({
            id: doc.id,
            data: () => doc,
          })),
        };
      },
    }),
    get: async () => {
      const sorted = Array.from(mockDB[collectionName].values()).sort((a, b) => {
        if (direction === 'desc') return b[field] > a[field] ? 1 : -1;
        return a[field] > b[field] ? 1 : -1;
      });
      return {
        empty: sorted.length === 0,
        docs: sorted.map(doc => ({
          id: doc.id,
          data: () => doc,
        })),
      };
    },
  }),
  limit: (num) => ({
    get: async () => ({
      empty: mockDB[collectionName].size === 0,
      docs: Array.from(mockDB[collectionName].values())
        .slice(0, num)
        .map(doc => ({
          id: doc.id,
          data: () => doc,
        })),
    }),
  }),
});

// Mock database interface
const db = {
  collection: (name) => createMockCollection(name),
};

// Mock auth (not used in current implementation)
const auth = null;

// Demo credentials for the frontend
const getDemoCredentials = () => {
  return {
    student: {
      email: 'student@demo.com',
      password: 'student123',
      name: 'John Student'
    },
    admin: {
      email: 'admin@demo.com',
      password: 'admin123',
      name: 'Jane Administrator'
    }
  };
};

// Initialize demo users on module load
initializeDemoUsers().catch(console.error);

// User roles
const roles = {
  STUDENT: 'student',
  ADMIN: 'admin',
};

// Firestore Collections
const collections = {
  USERS: 'users',
  SESSIONS: 'sessions',
  AUDIT_LOGS: 'audit_logs',
};

module.exports = {
  admin,
  db,
  auth,
  collections,
  roles,
  mockDB,
  initializeDemoUsers,
  getDemoCredentials,
  
  // Database operations
  createUser: async (userData) => {
    const id = 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const user = {
      id,
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      loginAttempts: 0,
      lockUntil: null,
    };
    mockDB.users.set(id, user);
    return user;
  },
  
  getUserByEmail: async (email) => {
    for (const [id, user] of mockDB.users) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  },
  
  getUserById: async (id) => {
    return mockDB.users.get(id);
  },
  
  updateUser: async (id, updates) => {
    const user = mockDB.users.get(id);
    if (user) {
      const updatedUser = {
        ...user,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      mockDB.users.set(id, updatedUser);
      return updatedUser;
    }
    return null;
  },
  
  deleteUser: async (id) => {
    return mockDB.users.delete(id);
  },
  
  getAllUsers: async () => {
    return Array.from(mockDB.users.values());
  },
  
  searchUsers: async (query, role = null) => {
    const users = Array.from(mockDB.users.values());
    return users.filter(user => {
      const matchesRole = !role || user.role === role;
      const matchesQuery = !query || 
        user.firstName.toLowerCase().includes(query.toLowerCase()) ||
        user.lastName.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase()) ||
        (user.studentId && user.studentId.toLowerCase().includes(query.toLowerCase()));
      return matchesRole && matchesQuery;
    });
  },
  
  // Session operations
  createSession: async (sessionData) => {
    const id = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const session = {
      id,
      ...sessionData,
      createdAt: new Date().toISOString(),
    };
    mockDB.sessions.set(id, session);
    return session;
  },
  
  getSession: async (id) => {
    return mockDB.sessions.get(id);
  },
  
  deleteSession: async (id) => {
    return mockDB.sessions.delete(id);
  },
  
  // Audit log operations
  createAuditLog: async (logData) => {
    const id = 'audit-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const auditLog = {
      id,
      ...logData,
      timestamp: new Date().toISOString(),
    };
    mockDB.audit_logs.set(id, auditLog);
    return auditLog;
  },
  
  getAuditLogs: async (limit = 100) => {
    const logs = Array.from(mockDB.audit_logs.values());
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
  },
};