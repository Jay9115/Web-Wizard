/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  env: {
    CUSTOM_KEY: 'student-portal',
  },
}

module.exports = nextConfig