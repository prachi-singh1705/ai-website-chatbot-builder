import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Python backend (py_backend/) is spawned at runtime by the route
  // handlers, so it must always be shipped next to the built application.
  outputFileTracingIncludes: {
    "/api/**/*": ["./py_backend/**/*"],
    "/widget/**/*": ["./py_backend/**/*"],
  },
};

export default nextConfig;
