import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const nextConfig = (phase: string): NextConfig => ({
  /**
   * Legacy portfolio admin routes (`*.local.tsx` / `*.local.ts`) remain local-dev only;
   * `/admin` and `/admin/social` deploy to production protected by Resend email OTP.
   */
  pageExtensions:
    phase === PHASE_DEVELOPMENT_SERVER
      ? ["tsx", "ts", "jsx", "js", "local.tsx", "local.ts"]
      : ["tsx", "ts", "jsx", "js"],
  experimental: { globalNotFound: true, proxyClientMaxBodySize: "300mb" },
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    const policy = [
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: policy },
        ],
      },
    ];
  },
  images: {
    contentDispositionType: "inline",
    contentSecurityPolicy: "default-src 'none'; script-src 'none'; sandbox;",
    dangerouslyAllowSVG: false,
    dangerouslyAllowLocalIP: false,
    maximumRedirects: 0,
    minimumCacheTTL: process.env.NODE_ENV === "development" ? 0 : 60,
  },
});

export default nextConfig;
