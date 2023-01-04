/** @type {import('next').NextConfig} */

const withPWA = require('next-pwa')({
  dest: 'public',
  skipWaiting: false,
  reloadOnOnline: false
})

const webpack = require('webpack')

const nextConfig = {
  reactStrictMode: true,
  webpack: (config, options) => {
    config.plugins.push(new webpack.DefinePlugin({
      'process.env': {
        CUSTOMS_SRV_URL: JSON.stringify(process.env.NEXT_PUBLIC_CUSTOMS_SRV_URL),
        TRACKING_SRV_URL: JSON.stringify(process.env.NEXT_PUBLIC_TRACKING_SRV_URL)
      }
    }))
    return config
  }
}

module.exports = withPWA(nextConfig)
