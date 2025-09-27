'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, User, Lock, Mail, AlertCircle, CheckCircle } from 'lucide-react'
import { authAPI, apiUtils, type LoginCredentials } from '@/services/api'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDemoCredentials, setShowDemoCredentials] = useState(true)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginCredentials & { rememberMe: boolean }>()

  // Demo credentials
  const demoCredentials = {
    student: {
      email: 'student@demo.com',
      password: 'student123',
      role: 'Student'
    },
    admin: {
      email: 'admin@demo.com',
      password: 'admin123',
      role: 'Admin'
    }
  }

  const fillDemoCredentials = (type: 'student' | 'admin') => {
    const credentials = demoCredentials[type]
    setValue('email', credentials.email)
    setValue('password', credentials.password)
  }

  const onSubmit = async (data: LoginCredentials & { rememberMe: boolean }) => {
    try {
      setLoading(true)
      setError('')

      const response = await authAPI.login({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      })

      if (response.success) {
        router.push('/')
      } else {
        setError(response.message || 'Login failed')
      }
    } catch (err: any) {
      setError(apiUtils.handleError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white text-shadow">
            Welcome Back
          </h1>
          <p className="text-white/80 mt-2">
            Sign in to your Student Portal account
          </p>
        </motion.div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card"
        >
          {/* Demo Credentials Section */}
          {showDemoCredentials && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                  Demo Credentials
                </h3>
                <button
                  type="button"
                  onClick={() => setShowDemoCredentials(false)}
                  className="text-white/60 hover:text-white transition-colors text-xs"
                >
                  Hide
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('student')}
                  className="p-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium">Student Account</span>
                    <User className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
                  </div>
                  <div className="text-xs text-white/70 text-left">
                    <div>📧 {demoCredentials.student.email}</div>
                    <div>🔒 {demoCredentials.student.password}</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('admin')}
                  className="p-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium">Admin Account</span>
                    <Lock className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
                  </div>
                  <div className="text-xs text-white/70 text-left">
                    <div>📧 {demoCredentials.admin.email}</div>
                    <div>🔒 {demoCredentials.admin.password}</div>
                  </div>
                </button>
              </div>
              <p className="text-xs text-white/60 mt-3 text-center">
                Click on any account above to auto-fill the login form
              </p>
            </motion.div>
          )}

          {!showDemoCredentials && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              type="button"
              onClick={() => setShowDemoCredentials(true)}
              className="mb-4 text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Show Demo Credentials
            </motion.button>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Error Alert */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center space-x-3"
              >
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </motion.div>
            )}

            {/* Email Field */}
            <div className="form-group">
              <label className="form-label">
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address
              </label>
              <input
                type="email"
                className={`form-input ${errors.email ? 'border-red-500/50' : ''}`}
                placeholder="Enter your email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
              />
              {errors.email && (
                <span className="form-error">{errors.email.message}</span>
              )}
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label className="form-label">
                <Lock className="w-4 h-4 inline mr-2" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input pr-12 ${errors.password ? 'border-red-500/50' : ''}`}
                  placeholder="Enter your password"
                  {...register('password', {
                    required: 'Password is required',
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <span className="form-error">{errors.password.message}</span>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500 focus:ring-2"
                  {...register('rememberMe')}
                />
                <span className="text-white/80 text-sm">Remember me</span>
              </label>
              <Link 
                href="/forgot-password" 
                className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                </>
              )}
            </button>

            {/* Register Link */}
            <div className="text-center pt-4 border-t border-white/10">
              <p className="text-white/70 text-sm">
                Don't have an account?{' '}
                <Link 
                  href="/register" 
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Create Account
                </Link>
              </p>
            </div>
          </form>
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-8"
        >
          <p className="text-white/60 text-sm">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-blue-400 hover:text-blue-300 transition-colors">
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-blue-400 hover:text-blue-300 transition-colors">
              Privacy Policy
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}