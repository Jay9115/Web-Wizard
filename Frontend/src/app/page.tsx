'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { User, LogOut, Settings, Home, Users, BarChart3, Shield } from 'lucide-react'
import { authAPI, userAPI, apiUtils, type User as UserType } from '@/services/api'

export default function HomePage() {
  const [user, setUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      if (!apiUtils.isAuthenticated()) {
        router.push('/login')
        return
      }

      const response = await authAPI.getCurrentUser()
      if (response.success && response.data) {
        setUser(response.data.user)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await authAPI.logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      // Force logout even if API call fails
      apiUtils.clearAuth()
      router.push('/login')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card">
          <div className="spinner"></div>
          <p className="text-white ml-4">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="nav-glass">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-4"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-white font-bold text-xl">Student Portal</h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-4"
          >
            <div className="flex items-center space-x-2 text-white">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">
                {user ? apiUtils.formatUserName(user) : 'User'}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                user?.role === 'admin' ? 'role-admin' : 'role-student'
              }`}>
                {user?.role || 'Student'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="glass-button text-sm flex items-center space-x-2 hover:bg-red-500/20"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </motion.div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-white mb-4 text-shadow">
              Welcome back, {user?.firstName || 'Student'}!
            </h2>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              {user?.role === 'admin' 
                ? 'Manage student records and oversee the portal administration.'
                : 'Access your profile, view your information, and manage your account settings.'
              }
            </p>
          </motion.div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {user?.role === 'admin' ? (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Link href="/admin/dashboard" className="block">
                    <div className="glass-card hover:scale-105 transition-transform cursor-pointer">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                          <BarChart3 className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-lg">Admin Dashboard</h3>
                          <p className="text-white/70 text-sm">View statistics and analytics</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Link href="/admin/users" className="block">
                    <div className="glass-card hover:scale-105 transition-transform cursor-pointer">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                          <Users className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-lg">Manage Users</h3>
                          <p className="text-white/70 text-sm">Add, edit, and manage students</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Link href="/profile" className="block">
                    <div className="glass-card hover:scale-105 transition-transform cursor-pointer">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                          <Settings className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-lg">My Profile</h3>
                          <p className="text-white/70 text-sm">Update your personal information</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Link href="/student/dashboard" className="block">
                    <div className="glass-card hover:scale-105 transition-transform cursor-pointer">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                          <Home className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-lg">My Dashboard</h3>
                          <p className="text-white/70 text-sm">View your personal dashboard</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Link href="/profile" className="block">
                    <div className="glass-card hover:scale-105 transition-transform cursor-pointer">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                          <User className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-lg">My Profile</h3>
                          <p className="text-white/70 text-sm">View and update your profile</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Link href="/settings" className="block">
                    <div className="glass-card hover:scale-105 transition-transform cursor-pointer">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                          <Settings className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-lg">Settings</h3>
                          <p className="text-white/70 text-sm">Manage your account settings</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              </>
            )}
          </div>

          {/* Profile Completion */}
          {user && !user.profileComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-card mb-8 border-l-4 border-yellow-400"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold">Complete Your Profile</h4>
                  <p className="text-white/70 text-sm">
                    Add more information to your profile to get the best experience.
                  </p>
                </div>
                <Link href="/profile" className="btn-primary text-sm">
                  Complete Now
                </Link>
              </div>
            </motion.div>
          )}

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold text-xl">Account Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-white/70">Email:</span>
                  <span className="text-white font-medium">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Role:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user?.role === 'admin' ? 'role-admin' : 'role-student'
                  }`}>
                    {user?.role === 'admin' ? 'Administrator' : 'Student'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user?.status === 'active' ? 'status-active' : 'status-inactive'
                  }`}>
                    {user?.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-white/70">Last Login:</span>
                  <span className="text-white font-medium">
                    {user?.lastLogin 
                      ? new Date(user.lastLogin).toLocaleDateString()
                      : 'Never'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Member Since:</span>
                  <span className="text-white font-medium">
                    {user?.createdAt 
                      ? new Date(user.createdAt).toLocaleDateString()
                      : 'Unknown'
                    }
                  </span>
                </div>
                {user?.studentId && (
                  <div className="flex justify-between">
                    <span className="text-white/70">Student ID:</span>
                    <span className="text-white font-medium">{user.studentId}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}