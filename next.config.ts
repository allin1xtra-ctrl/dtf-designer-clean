import path from "node:path";

const nextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "https://www.ta-apparel.com",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://ta-apparel.com https://www.ta-apparel.com https://yourdtfplug.com https://www.yourdtfplug.com https://*.myshopify.com https://admin.shopify.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
