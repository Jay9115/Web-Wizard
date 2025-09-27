# Student Portal - WebWizard

A modern, scalable, and accessible student portal with role-based management system built with Next.js, Node/Express, and Firebase.

## 🌟 Features

### Core Features
- **Role-Based Authentication**: Student and Admin roles with secure JWT authentication
- **Session Management**: Remember me functionality with secure cookie handling
- **Profile Management**: Complete student profile management system
- **Admin Dashboard**: Comprehensive admin panel for user management
- **Security First**: Password hashing, input validation, and SQL injection protection
- **Apple-Inspired UI**: Glassmorphism design with minimal aesthetics

### Technical Features
- **Scalable Architecture**: Separated frontend and backend with clear API boundaries
- **Centralized API Service**: Single service file handles all frontend-backend communication
- **Firebase Integration**: Firestore database with Firebase Authentication support
- **Responsive Design**: Mobile-first approach with modern CSS Grid and Flexbox
- **TypeScript Support**: Full TypeScript implementation for better code quality
- **Real-time Updates**: Optimistic updates and real-time data synchronization

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project with Firestore enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/student-portal.git
   cd student-portal
   ```

2. **Install Backend Dependencies**
   ```bash
   cd Backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../Frontend
   npm install
   ```

4. **Configure Environment Variables**

   **Backend** - Copy `.env.example` to `.env` and configure:
   ```env
   NODE_ENV=development
   PORT=5000
   FRONTEND_URL=http://localhost:3000
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=7d
   
   # Firebase Configuration
   FIREBASE_PROJECT_ID=your-firebase-project-id
   FIREBASE_PRIVATE_KEY=your-private-key
   FIREBASE_CLIENT_EMAIL=your-client-email
   ```

   **Frontend** - Copy `.env.local.example` to `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   ```

5. **Start Development Servers**
   
   **Backend** (Terminal 1):
   ```bash
   cd Backend
   npm run dev
   ```
   
   **Frontend** (Terminal 2):
   ```bash
   cd Frontend
   npm run dev
   ```

6. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api
   - Health Check: http://localhost:5000/api/health

## 📁 Project Structure

```
Web-Wizard/
├── Backend/                 # Express.js API Server
│   ├── config/             # Database and app configuration
│   │   └── firebase.js     # Firebase admin configuration
│   ├── middleware/         # Custom middleware
│   │   ├── auth.js         # Authentication middleware
│   │   ├── errorHandler.js # Global error handling
│   │   └── validation.js   # Input validation rules
│   ├── routes/             # API route definitions
│   │   ├── auth.js         # Authentication routes
│   │   ├── users.js        # User management routes
│   │   └── admin.js        # Admin-only routes
│   ├── .env.example        # Environment variables template
│   ├── .gitignore          # Git ignore rules
│   ├── package.json        # Dependencies and scripts
│   └── server.js           # Main server file
│
└── Frontend/               # Next.js React Application
    ├── src/                # Source code
    │   ├── app/            # Next.js 13+ app directory
    │   │   ├── layout.tsx  # Root layout component
    │   │   └── page.tsx    # Homepage component
    │   ├── services/       # API service layer
    │   │   └── api.ts      # Centralized API client
    │   ├── config/         # Frontend configuration
    │   │   └── firebase.ts # Firebase client config
    │   └── styles/         # Styling files
    │       └── globals.css # Global styles with Apple-inspired design
    ├── .env.local.example  # Environment variables template
    ├── .gitignore          # Git ignore rules
    ├── package.json        # Dependencies and scripts
    ├── tailwind.config.js  # Tailwind CSS configuration
    └── next.config.js      # Next.js configuration
```

## 🎨 Design Philosophy

### Apple-Inspired UI
- **Glassmorphism**: Semi-transparent elements with backdrop blur effects
- **Minimal Aesthetics**: Clean, uncluttered interface with focus on content
- **Smooth Animations**: Framer Motion for fluid transitions and interactions
- **Typography**: Apple system fonts for consistent, readable text
- **Color Palette**: Carefully selected colors with proper contrast ratios

### Accessibility Features
- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Full keyboard accessibility
- **Color Contrast**: WCAG compliant contrast ratios
- **Focus Management**: Clear focus indicators
- **Responsive Design**: Works across all device sizes

## 🔐 Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure JSON Web Token implementation
- **Password Hashing**: bcrypt with configurable salt rounds
- **Session Management**: Secure cookie handling with HttpOnly flags
- **Role-Based Access**: Granular permissions for different user roles
- **Token Refresh**: Automatic token refresh for seamless user experience

### Input Validation & Protection
- **Server-Side Validation**: Express-validator for robust input validation
- **Client-Side Validation**: React Hook Form with validation rules
- **SQL Injection Protection**: Parameterized queries and input sanitization
- **XSS Protection**: Content Security Policy and input encoding
- **Rate Limiting**: API rate limiting to prevent abuse

## 📡 API Documentation

### Authentication Endpoints
```
POST /api/auth/register     # Register new user
POST /api/auth/login        # User login
POST /api/auth/logout       # User logout
GET  /api/auth/me          # Get current user
POST /api/auth/refresh-token # Refresh JWT token
POST /api/auth/change-password # Change user password
```

### User Management Endpoints
```
GET  /api/users/profile/:userId      # Get user profile
PUT  /api/users/profile/:userId      # Update user profile
GET  /api/users/dashboard/:userId    # Get dashboard data
POST /api/users/upload-avatar/:userId # Upload user avatar
GET  /api/users/activity/:userId     # Get user activity log
```

### Admin Endpoints
```
GET    /api/admin/stats           # Dashboard statistics
GET    /api/admin/users           # List all users (with filters)
GET    /api/admin/users/:userId   # Get specific user details
POST   /api/admin/users           # Create new user
PUT    /api/admin/users/:userId   # Update user details
DELETE /api/admin/users/:userId   # Delete/deactivate user
GET    /api/admin/audit-logs      # Get audit logs
```

## 🧪 Testing

### Backend Testing
```bash
cd Backend
npm test
```

### Frontend Testing
```bash
cd Frontend
npm test
```

### End-to-End Testing
```bash
# Run both frontend and backend
npm run test:e2e
```

## 🚀 Deployment

### Development
1. Ensure both frontend and backend are running
2. Configure environment variables
3. Set up Firebase project with proper security rules

### Production
1. **Backend**: Deploy to platforms like Heroku, Vercel, or AWS
2. **Frontend**: Deploy to Vercel, Netlify, or similar platforms
3. **Database**: Ensure Firebase Firestore is properly configured
4. **Environment**: Update all environment variables for production

### Environment-Specific Configurations

**Development**:
- CORS enabled for localhost
- Detailed error messages
- Debug logging enabled

**Production**:
- Restricted CORS origins
- Error messages sanitized
- Compression enabled
- Security headers configured

## 📋 TODO

- [ ] Email verification for new users
- [ ] Password reset functionality
- [ ] File upload for profile pictures
- [ ] Advanced search and filtering
- [ ] Export user data functionality
- [ ] Comprehensive audit logging
- [ ] Mobile app support
- [ ] Multi-language support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

**WebWizard Team**
- Full-stack development
- UI/UX design
- Security implementation
- Performance optimization

## 📞 Support

For support, email support@webwizard.com or create an issue on GitHub.

---

**Built with ❤️ by WebWizard Team**