'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, User, Lock, Mail, AlertCircle, CheckCircle, Phone, UserCheck } from 'lucide-react'
import { authAPI, apiUtils, type RegisterData } from '@/services/api'

interface RegisterFormData extends RegisterData {
  confirmPassword: string
  agreeToTerms: boolean
}

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>()

  const password = watch('password')

  // Client-side validation helpers
  const validatePassword = (value: string) => {
    if (value.length < 8) return 'Password must be at least 8 characters long'
    if (!/(?=.*[a-z])/.test(value)) return 'Password must contain at least one lowercase letter'
    if (!/(?=.*[A-Z])/.test(value)) return 'Password must contain at least one uppercase letter'
    if (!/(?=.*\d)/.test(value)) return 'Password must contain at least one number'
    if (!/(?=.*[@$!%*?&])/.test(value)) return 'Password must contain at least one special character'
    return true
  }

  const validateEmail = (value: string) => {
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
    if (!emailRegex.test(value)) return 'Please enter a valid email address'
    return true
  }

  const validateName = (value: string) => {
    if (value.length < 2) return 'Name must be at least 2 characters long'
    if (value.length > 50) return 'Name must not exceed 50 characters'
    if (!/^[a-zA-Z\s]+$/.test(value)) return 'Name can only contain letters and spaces'
    return true
  }

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')

      if (data.password !== data.confirmPassword) {
        setError('Passwords do not match')
        return
      }

      const { confirmPassword, agreeToTerms, ...registerData } = data

      const response = await authAPI.register(registerData)

      if (response.success) {
        setSuccess('Account created successfully! Redirecting to dashboard...')
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } else {
        setError(response.message || 'Registration failed')
      }
    } catch (err: any) {
      setError(apiUtils.handleError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <UserCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white text-shadow">
            Create Account
          </h1>
          <p className="text-white/80 mt-2">
            Join the Student Portal today
          </p>
        </motion.div>

        {/* Registration Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Success Alert */}
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 flex items-center space-x-3"
              >
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <p className="text-green-300 text-sm">{success}</p>
              </motion.div>
            )}

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

            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">
                  <User className="w-4 h-4 inline mr-2" />
                  First Name
                </label>
                <input
                  type="text"
                  className={`form-input ${errors.firstName ? 'border-red-500/50' : ''}`}
                  placeholder="Enter your first name"
                  {...register('firstName', {
                    required: 'First name is required',
                    validate: validateName,
                  })}
                />
                {errors.firstName && (
                  <span className="form-error">{errors.firstName.message}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <User className="w-4 h-4 inline mr-2" />
                  Last Name
                </label>
                <input
                  type="text"
                  className={`form-input ${errors.lastName ? 'border-red-500/50' : ''}`}
                  placeholder="Enter your last name"
                  {...register('lastName', {
                    required: 'Last name is required',
                    validate: validateName,
                  })}
                />
                {errors.lastName && (
                  <span className="form-error">{errors.lastName.message}</span>
                )}
              </div>
            </div>

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
                  validate: validateEmail,
                })}
              />
              {errors.email && (
                <span className="form-error">{errors.email.message}</span>
              )}
            </div>

            {/* Student ID Field */}
            <div className="form-group">
              <label className="form-label">
                <UserCheck className="w-4 h-4 inline mr-2" />
                Student ID (Optional)
              </label>
              <input
                type="text"
                className={`form-input ${errors.studentId ? 'border-red-500/50' : ''}`}
                placeholder="Enter your student ID"
                {...register('studentId', {
                  validate: (value) => {
                    if (!value) return true
                    if (value.length < 3) return 'Student ID must be at least 3 characters'
                    if (value.length > 20) return 'Student ID must not exceed 20 characters'
                    if (!/^[a-zA-Z0-9]+$/.test(value)) return 'Student ID can only contain letters and numbers'
                    return true
                  },
                })}
              />
              {errors.studentId && (
                <span className="form-error">{errors.studentId.message}</span>
              )}
            </div>

            {/* Phone Field */}
            <div className="form-group">
              <label className="form-label">
                <Phone className="w-4 h-4 inline mr-2" />
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                className={`form-input ${errors.phone ? 'border-red-500/50' : ''}`}
                placeholder="Enter your phone number"
                {...register('phone')}
              />
              {errors.phone && (
                <span className="form-error">{errors.phone.message}</span>
              )}
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      validate: validatePassword,
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

              <div className="form-group">
                <label className="form-label">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`form-input pr-12 ${errors.confirmPassword ? 'border-red-500/50' : ''}`}
                    placeholder="Confirm your password"
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: (value) => value === password || 'Passwords do not match',
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span className="form-error">{errors.confirmPassword.message}</span>
                )}
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="form-group">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  className={`w-4 h-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500 focus:ring-2 mt-0.5 ${errors.agreeToTerms ? 'border-red-500/50' : ''}`}
                  {...register('agreeToTerms', {
                    required: 'You must agree to the terms and conditions',
                  })}
                />
                <span className="text-white/80 text-sm">
                  I agree to the{' '}
                  <Link href="/terms" className="text-blue-400 hover:text-blue-300 transition-colors">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-blue-400 hover:text-blue-300 transition-colors">
                    Privacy Policy
                  </Link>
                </span>
              </label>
              {errors.agreeToTerms && (
                <span className="form-error">{errors.agreeToTerms.message}</span>
              )}
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
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-5 h-5" />
                  <span>Create Account</span>
                </>
              )}
            </button>

            {/* Login Link */}
            <div className="text-center pt-4 border-t border-white/10">
              <p className="text-white/70 text-sm">
                Already have an account?{' '}
                <Link 
                  href="/login" 
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </form>
        </motion.div>

        {/* Password Requirements */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 glass-card p-4"
        >
          <h3 className="text-white font-semibold text-sm mb-3 flex items-center">
            <Lock className="w-4 h-4 mr-2 text-blue-400" />
            Password Requirements
          </h3>
          <ul className="text-white/70 text-xs space-y-1">
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
              <span>At least 8 characters long</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
              <span>One lowercase letter (a-z)</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
              <span>One uppercase letter (A-Z)</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
              <span>One number (0-9)</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
              <span>One special character (@$!%*?&)</span>
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  )
}