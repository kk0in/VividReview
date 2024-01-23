/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
        SERVER_ENDPOINT: process.env.SERVER_ENDPOINT,
    }
}

module.exports = nextConfig
