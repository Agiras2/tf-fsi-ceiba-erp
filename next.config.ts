import type { NextConfig } from "next";

// Encabezados de seguridad (docs/09-SEG seccion 7).
const encabezadosSeguridad = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
];

const nextConfig: NextConfig = {
  // Cache Components desactivado: casi todas las paginas del ERP dependen de la
  // sesion del usuario y de datos transaccionales (docs/08-ARQ seccion 5).
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: encabezadosSeguridad }];
  },
};

export default nextConfig;
