/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // 匹配所有 API 路由
        source: '/api/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
