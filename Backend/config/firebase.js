// Firebase Admin SDK Configuration
const admin = require('firebase-admin');

// Simple in-memory database for demo purposes
// In production, replace this with actual Firebase configuration
const mockDB = {
  users: new Map(),
  sessions: new Map(),
  audit_logs: new Map(),
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
      get: async () => ({
        empty: mockDB[collectionName].size === 0,
        docs: Array.from(mockDB[collectionName].values())
          .filter(doc => {
            if (operator === '==') return doc[field] === value;
            if (operator === '>=') return doc[field] >= value;
            if (operator === '<=') return doc[field] <= value;
            return false;
          })
          .slice(0, num)
          .map(doc => ({
            id: doc.id,
            data: () => doc,
          })),
      }),
    }),
    get: async () => ({
      empty: mockDB[collectionName].size === 0,
      docs: Array.from(mockDB[collectionName].values())
        .filter(doc => {
          if (operator === '==') return doc[field] === value;
          if (operator === '>=') return doc[field] >= value;
          if (operator === '<=') return doc[field] <= value;
          return false;
        })
        .map(doc => ({
          id: doc.id,
          data: () => doc,
        })),
    }),
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

// Firestore Collections
const collections = {
  USERS: 'users',
  SESSIONS: 'sessions',
  AUDIT_LOGS: 'audit_logs',
};

// User roles
const roles = {
  STUDENT: 'student',
  ADMIN: 'admin',
};

module.exports = {
  admin,
  db,
  auth,
  collections,
  roles,
};