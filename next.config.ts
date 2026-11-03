import type { NextConfig } from "next";

// Security headers para sa lahat ng page (security testing):
//   - X-Frame-Options / frame-ancestors: hindi mailalagay ang system sa iframe ng ibang site (clickjacking)
//   - X-Content-Type-Options: hindi huhulaan ng browser ang uri ng file
//   - Referrer-Policy: hindi ipinapasa ang buong URL (may student number) sa ibang site
//   - Permissions-Policy: walang camera, mic at location (hindi ginagamit ng system)
//   - Strict-Transport-Security: laging HTTPS (sa Vercel)
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Huwag ipakita na Next.js ang gamit (X-Powered-By)
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;