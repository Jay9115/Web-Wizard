# 🚀 Setup and Deployment Guide

## Prerequisites

### System Requirements
- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher (or Yarn 1.22+)
- **Git**: Latest version
- **Firebase Account**: For database and authentication
- **Code Editor**: VS Code recommended with extensions

### Recommended VS Code Extensions
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- TypeScript Importer
- Prettier - Code formatter
- ESLint
- Firebase

## 📋 Step-by-Step Setup

### 1. Firebase Project Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Create a project" or "Add project"
   - Enter project name: `student-portal` (or your preferred name)
   - Enable Google Analytics (optional)

2. **Configure Firestore Database**
   - Navigate to "Firestore Database" in Firebase Console
   - Click "Create database"
   - Choose "Start in test mode" (we'll configure security later)
   - Select your preferred location

3. **Create Collections**
   ```javascript
   // Firestore will auto-create these collections when first used
   Collections needed:
   - users
   - sessions  
   - audit_logs
   ```

4. **Get Firebase Configuration**
   - Go to Project Settings (gear icon)
   - Scroll to "Your apps" section
   - Click "Web app" icon to add a web app
   - Register app name: "Student Portal Web"
   - Copy the configuration object

5. **Generate Service Account Key**
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Download the JSON file
   - Keep it secure (never commit to git)

### 2. Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-username/student-portal.git
cd student-portal

# Install backend dependencies
cd Backend
npm install

# Install frontend dependencies  
cd ../Frontend
npm install
```

### 3. Environment Configuration

#### Backend Environment (.env)

Create `Backend/.env` from `Backend/.env.example`:

```env
# Environment
NODE_ENV=development
PORT=5000

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=your-refresh-token-secret-change-this

# Cookie Configuration
COOKIE_SECRET=your-cookie-secret-change-this

# Firebase Admin Configuration (from service account JSON)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

# Firebase Web Config (from Firebase console)
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Frontend Environment (.env.local)

Create `Frontend/.env.local` from `Frontend/.env.local.example`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Firebase Configuration (Public - safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com  
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# App Configuration
NEXT_PUBLIC_APP_NAME="Student Portal"
NEXT_PUBLIC_APP_VERSION="1.0.0"
```

### 4. Firebase Security Rules

Set up Firestore security rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == userId || 
         resource.data.role == 'admin');
    }
    
    // Sessions collection  
    match /sessions/{sessionId} {
      allow read, write: if request.auth != null &&
        request.auth.uid == resource.data.userId;
    }
    
    // Audit logs collection
    match /audit_logs/{logId} {
      allow read: if request.auth != null && 
        resource.data.role == 'admin';
      allow write: if request.auth != null;
    }
  }
}
```

### 5. Start Development Servers

Open two terminal windows:

**Terminal 1 - Backend Server:**
```bash
cd Backend
npm run dev
# Server will start on http://localhost:5000
```

**Terminal 2 - Frontend Server:**
```bash  
cd Frontend
npm run dev
# Frontend will start on http://localhost:3000
```

### 6. Create Initial Admin User

You can create an admin user by:

1. **Option A: Register normally then update in Firebase Console**
   - Register at http://localhost:3000/register
   - Go to Firestore in Firebase Console
   - Find your user document
   - Change `role` field from `student` to `admin`

2. **Option B: Use Firebase Admin SDK script**
   Create `Backend/scripts/create-admin.js`:
   ```javascript
   const admin = require('firebase-admin');
   const bcrypt = require('bcryptjs');
   
   // Initialize Firebase Admin (use your config)
   admin.initializeApp({
     credential: admin.credential.cert({
       // Your service account details
     }),
   });
   
   const db = admin.firestore();
   
   async function createAdmin() {
     const hashedPassword = await bcrypt.hash('AdminPassword123!', 12);
     
     await db.collection('users').add({
       email: 'admin@studentportal.com',
       password: hashedPassword,
       firstName: 'Admin',
       lastName: 'User', 
       role: 'admin',
       status: 'active',
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString(),
       profileComplete: true,
     });
     
     console.log('Admin user created!');
   }
   
   createAdmin();
   ```

## 🌐 Production Deployment

### Backend Deployment (Heroku Example)

1. **Install Heroku CLI**
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku
   
   # Windows - Download from heroku.com
   ```

2. **Deploy Backend**
   ```bash
   cd Backend
   
   # Create Heroku app
   heroku create your-app-name-backend
   
   # Set environment variables
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your-production-jwt-secret
   heroku config:set FIREBASE_PROJECT_ID=your-project-id
   # ... set all other environment variables
   
   # Deploy
   git add .
   git commit -m "Deploy backend"
   git push heroku main
   ```

### Frontend Deployment (Vercel Example)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy Frontend**
   ```bash
   cd Frontend
   
   # Login to Vercel
   vercel login
   
   # Deploy
   vercel --prod
   
   # Add environment variables in Vercel dashboard
   # Go to your project settings and add all NEXT_PUBLIC_* variables
   ```

### Alternative Deployment Options

**Backend:**
- Railway
- Render
- AWS EC2/Elastic Beanstalk
- Google Cloud Run
- DigitalOcean App Platform

**Frontend:**
- Netlify
- AWS S3 + CloudFront
- Google Firebase Hosting

## 🔧 Common Issues & Solutions

### Issue: Firebase Connection Errors

**Solution:**
- Verify Firebase project ID in environment variables
- Check service account key format (ensure newlines are preserved)
- Confirm Firestore is enabled in Firebase Console

### Issue: CORS Errors

**Solution:**
- Verify `FRONTEND_URL` in backend environment variables
- Check that frontend is running on specified port
- For production, update CORS origins in server.js

### Issue: JWT Token Errors

**Solution:**
- Ensure `JWT_SECRET` is at least 32 characters long
- Verify token is being sent in Authorization header
- Check cookie settings for cross-origin requests

### Issue: Build Errors

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# For Next.js build issues
rm -rf .next
npm run build
```

## 🧪 Testing Setup

### Backend Testing
```bash
cd Backend
npm install --save-dev jest supertest
npm test
```

### Frontend Testing  
```bash
cd Frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom jest
npm test
```

## 📊 Monitoring and Logs

### Development
- Backend logs appear in terminal
- Frontend logs in browser console
- Firebase logs in Firebase Console

### Production
- Set up application monitoring (e.g., Sentry)
- Configure log aggregation (e.g., LogRocket, DataDog)
- Monitor Firebase usage and costs

## 🔒 Security Checklist

- [ ] Environment variables are properly set
- [ ] Firebase security rules are configured
- [ ] HTTPS is enabled in production
- [ ] CORS origins are restricted
- [ ] Rate limiting is enabled
- [ ] Input validation is working
- [ ] Authentication tokens expire appropriately
- [ ] Sensitive data is not logged

## 📈 Performance Optimization

### Backend
- Enable compression middleware
- Implement database connection pooling
- Use caching for frequently accessed data
- Optimize database queries

### Frontend
- Enable Next.js image optimization
- Implement code splitting
- Use React.memo for expensive components
- Optimize bundle size with webpack-bundle-analyzer

---

**Need Help?** Create an issue on GitHub or contact the development team.