import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone', // Para Docker
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Permitir acceso a archivos externos en server components
  serverExternalPackages: ['fs', 'path', 'child_process'],
  // Configuración para permitir Server-Sent Events
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Connection',
            value: 'keep-alive',
          },
          {
            key: 'Content-Type',
            value: 'text/event-stream',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
