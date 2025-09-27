'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Edit3, 
  Save, 
  X, 
  Camera,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  UserCheck
} from 'lucide-react'
import { userAPI, authAPI, apiUtils, type User as UserType, type ProfileUpdateData } from '@/services/api'

export default function ProfilePage() {
  const [user, setUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm<ProfileUpdateData>()

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    try {
      setLoading(true)
      const currentUserResponse = await authAPI.getCurrentUser()
      
      if (currentUserResponse.success && currentUserResponse.data?.user) {
        const userData = currentUserResponse.data.user
        setUser(userData)
        
        // Set form values
        setValue('firstName', userData.firstName || '')
        setValue('lastName', userData.lastName || '')
        setValue('phone', userData.phone || '')
        setValue('dateOfBirth', userData.dateOfBirth ? userData.dateOfBirth.split('T')[0] : '')
        setValue('address', userData.address || '')
      }
    } catch (err: any) {
      setError(apiUtils.handleError(err))
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: ProfileUpdateData) => {
    if (!user) return

    try {
      setUpdating(true)
      setError('')
      setSuccess('')

      const response = await userAPI.updateProfile(user.id, data)

      if (response.success) {
        setUser(response.data?.user || user)
        setEditing(false)
        setSuccess('Profile updated successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(response.message || 'Failed to update profile')
      }
    } catch (err: any) {
      setError(apiUtils.handleError(err))
    } finally {
      setUpdating(false)
    }
  }

  const handleEdit = () => {
    setEditing(true)
    setError('')
    setSuccess('')
  }

  const handleCancel = () => {
    setEditing(false)
    setError('')
    setSuccess('')
    if (user) {
      reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
        address: user.address || '',
      })
    }
  }

  const getProfileCompletion = () => {
    if (!user) return 0
    const fields = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'address']
    const completed = fields.filter(field => user[field as keyof UserType]).length
    return Math.round((completed / fields.length) * 100)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Error Loading Profile</h2>
          <p className="text-white/70">Please try refreshing the page</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-white text-shadow mb-2">
            My Profile
          </h1>
          <p className="text-white/80">
            Manage your personal information and preferences
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Summary */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="glass-card p-6 text-center">
              {/* Avatar */}
              <div className="relative inline-block mb-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                  {user.profilePicture ? (
                    <img 
                      src={user.profilePicture} 
                      alt="Profile" 
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-white" />
                  )}
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors">
                  <Camera className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* User Info */}
              <h2 className="text-xl font-semibold text-white mb-1">
                {apiUtils.formatUserName(user)}
              </h2>
              <p className="text-blue-400 text-sm mb-2 flex items-center justify-center">
                {user.role === 'admin' ? (
                  <>
                    <Shield className="w-4 h-4 mr-1" />
                    Administrator
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 mr-1" />
                    Student
                  </>
                )}
              </p>
              
              {user.studentId && (
                <p className="text-white/70 text-sm mb-4">ID: {user.studentId}</p>
              )}

              {/* Profile Completion */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/80 text-sm">Profile Complete</span>
                  <span className="text-blue-400 text-sm font-medium">{getProfileCompletion()}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${getProfileCompletion()}%` }}
                  ></div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className={user.status === 'active' ? 'text-green-400' : 'text-red-400'}>
                  {user.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Last Login */}
              {user.lastLogin && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-center text-white/60 text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    Last login: {formatDate(user.lastLogin)}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Profile Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="glass-card p-6">
              {/* Header with Edit Button */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Personal Information</h3>
                {!editing ? (
                  <button
                    onClick={handleEdit}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-white rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Alerts */}
              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6 bg-green-500/20 border border-green-500/30 rounded-xl p-4 flex items-center space-x-3"
                >
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <p className="text-green-300 text-sm">{success}</p>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6 bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center space-x-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-300 text-sm">{error}</p>
                </motion.div>
              )}

              {/* Profile Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">
                      <User className="w-4 h-4 inline mr-2" />
                      First Name
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        className={`form-input ${errors.firstName ? 'border-red-500/50' : ''}`}
                        {...register('firstName', {
                          required: 'First name is required',
                          minLength: { value: 2, message: 'First name must be at least 2 characters' },
                          maxLength: { value: 50, message: 'First name must not exceed 50 characters' },
                          pattern: { value: /^[a-zA-Z\s]+$/, message: 'First name can only contain letters' },
                        })}
                      />
                    ) : (
                      <div className="form-display">
                        {user.firstName || 'Not set'}
                      </div>
                    )}
                    {errors.firstName && (
                      <span className="form-error">{errors.firstName.message}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <User className="w-4 h-4 inline mr-2" />
                      Last Name
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        className={`form-input ${errors.lastName ? 'border-red-500/50' : ''}`}
                        {...register('lastName', {
                          required: 'Last name is required',
                          minLength: { value: 2, message: 'Last name must be at least 2 characters' },
                          maxLength: { value: 50, message: 'Last name must not exceed 50 characters' },
                          pattern: { value: /^[a-zA-Z\s]+$/, message: 'Last name can only contain letters' },
                        })}
                      />
                    ) : (
                      <div className="form-display">
                        {user.lastName || 'Not set'}
                      </div>
                    )}
                    {errors.lastName && (
                      <span className="form-error">{errors.lastName.message}</span>
                    )}
                  </div>
                </div>

                {/* Email (Read-only) */}
                <div className="form-group">
                  <label className="form-label">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email Address
                  </label>
                  <div className="form-display bg-white/5">
                    {user.email}
                    <span className="text-xs text-white/50 ml-2">(Cannot be changed)</span>
                  </div>
                </div>

                {/* Phone */}
                <div className="form-group">
                  <label className="form-label">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Phone Number
                  </label>
                  {editing ? (
                    <input
                      type="tel"
                      className={`form-input ${errors.phone ? 'border-red-500/50' : ''}`}
                      {...register('phone')}
                    />
                  ) : (
                    <div className="form-display">
                      {user.phone || 'Not set'}
                    </div>
                  )}
                  {errors.phone && (
                    <span className="form-error">{errors.phone.message}</span>
                  )}
                </div>

                {/* Date of Birth */}
                <div className="form-group">
                  <label className="form-label">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Date of Birth
                  </label>
                  {editing ? (
                    <input
                      type="date"
                      className={`form-input ${errors.dateOfBirth ? 'border-red-500/50' : ''}`}
                      {...register('dateOfBirth')}
                    />
                  ) : (
                    <div className="form-display">
                      {formatDate(user.dateOfBirth)}
                    </div>
                  )}
                  {errors.dateOfBirth && (
                    <span className="form-error">{errors.dateOfBirth.message}</span>
                  )}
                </div>

                {/* Address */}
                <div className="form-group">
                  <label className="form-label">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Address
                  </label>
                  {editing ? (
                    <textarea
                      className={`form-input min-h-[100px] resize-none ${errors.address ? 'border-red-500/50' : ''}`}
                      rows={3}
                      {...register('address', {
                        maxLength: { value: 200, message: 'Address must not exceed 200 characters' },
                      })}
                    />
                  ) : (
                    <div className="form-display">
                      {user.address || 'Not set'}
                    </div>
                  )}
                  {errors.address && (
                    <span className="form-error">{errors.address.message}</span>
                  )}
                </div>

                {/* Submit Button */}
                {editing && (
                  <div className="flex justify-end pt-4 border-t border-white/10">
                    <button
                      type="submit"
                      disabled={updating}
                      className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updating ? (
                        <>
                          <div className="spinner"></div>
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}