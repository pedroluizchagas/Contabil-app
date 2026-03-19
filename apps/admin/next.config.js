/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@contabhub/ui', '@contabhub/supabase', '@contabhub/shared'],
}

module.exports = nextConfig
