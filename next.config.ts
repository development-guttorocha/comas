import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const nextConfig = (phase: string): NextConfig => ({
  /**
   * The admin and translation routes answer only on this machine (lib/translations/access.ts), so
   * they are named `page.local.tsx` / `route.local.ts` and exist only under `next dev`: production
   * deploys none of them (the Hobby plan allows 12 functions per deployment).
   */
  pageExtensions: phase === PHASE_DEVELOPMENT_SERVER ? ["tsx", "ts", "jsx", "js", "local.tsx", "local.ts"] : ["tsx", "ts", "jsx", "js"],
  // Two root layouts (app/(pt), app/en): addresses no route matches use app/global-not-found.tsx.
  // proxyClientMaxBodySize: every admin route passes through proxy.ts, which buffers the body only up
  // to this size; past it uploads arrive cut short (lib/admin/form.ts keeps the same number).
  experimental: { globalNotFound: true, proxyClientMaxBodySize: "300mb" },
  turbopack: {
    root: process.cwd(),
  },
  // The cases, the Home settings and the pages are read from disk at request time, so every server route ships them.
  // The raw material of each case (admin tab "Material") is for the AI generator on this machine: the site never reads it.
  outputFileTracingExcludes: { "/**": ["./content/cases/*/material.json"] },
  outputFileTracingIncludes: {
    "/**": ["./content/cases/**/*", "./content/articles/**/*", "./content/home.json", "./content/pages/**/*"],
    // The share cards (lib/og.tsx) read the site's font, mark and portrait from disk.
    "/og/**": ["./node_modules/@fontsource/dm-sans/files/dm-sans-latin-{400,700}-normal.woff", "./public/og/*", "./public/brand/symbol-on-dark-bg.svg"],
    "/**/opengraph-image*": ["./node_modules/@fontsource/dm-sans/files/dm-sans-latin-{400,700}-normal.woff", "./public/og/*", "./public/brand/symbol-on-dark-bg.svg"],
  },
  async redirects() {
    return [
      {
        source: "/cases/loft-portfolio",
        destination: "/cases/loft-design",
        permanent: true,
      },
      { source: "/cases/loft-lideranca-gestao-e-cultura-de-design", destination: "/cases/loft-design", permanent: true },
      // Rotas antigas da página Sobre.
      { source: "/sobre2", destination: "/sobre", permanent: true },
      { source: "/sobre-2", destination: "/sobre", permanent: true },
      { source: "/en/sobre2", destination: "/en/sobre", permanent: true },
      { source: "/en/sobre-2", destination: "/en/sobre", permanent: true },
      // A mentoria virou consultoria de carreira (projeto fechado com plano escrito).
      { source: "/recursos/mentoria", destination: "/recursos/consultoria-de-carreira", permanent: true },
      { source: "/recursos/mentoria/:path*", destination: "/recursos/consultoria-de-carreira", permanent: true },
    ];
  },
  async rewrites() {
    // Each page as Markdown, for AI assistants: the same address ending in `.md` (served by app/md).
    return [
      { source: "/index.md", destination: "/md" },
      { source: "/en.md", destination: "/md/en" },
      { source: "/en/index.md", destination: "/md/en" },
      { source: "/:page(sobre|curriculo|contato|cases).md", destination: "/md/:page" },
      { source: "/en/:page(sobre|curriculo|contato|cases).md", destination: "/md/en/:page" },
      { source: "/cases/:slug.md", destination: "/md/cases/:slug" },
      { source: "/en/cases/:slug.md", destination: "/md/en/cases/:slug" },
    ];
  },
  async headers() {
    // Static response policy: no per-request nonces or extra client scripts.
    const policy = [
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
    ].join("; ");
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Content-Security-Policy", value: policy },
      ],
    }];
  },
  /**
   * Em dev, TTL 0 evita ficar preso à imagem antiga no pipeline `/_next/image` ao trocar ficheiros em `/public`.
   * Em produção mantém cache curto; para invalidar após substituir um PNG com o mesmo nome, usa `?v=` na URL ou renomeia o ficheiro.
   */
  images: {
    // Portfolio images render inline; active SVG and private-network fetches stay disabled.
    contentDispositionType: "inline",
    contentSecurityPolicy: "default-src 'none'; script-src 'none'; sandbox;",
    dangerouslyAllowSVG: false,
    dangerouslyAllowLocalIP: false,
    maximumRedirects: 0,
    minimumCacheTTL:
      process.env.NODE_ENV === "development" ? 0 : 60,
    /** BrandLovers (Webflow CDN) e outros assets remotos em `CaseMediaFullWidth` / `next/image`. */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.prod.website-files.com",
        pathname: "/**",
      },
      /**
       * Uploads na database Notion (ficheiros servidos via S3; URL expira — a API devolve URL nova a cada query).
       * Picomatch no hostname: cobre `*.s3.*.amazonaws.com`, `*.amazonaws.com`, etc.
       */
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
});

export default nextConfig;
