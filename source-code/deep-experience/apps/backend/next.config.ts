import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Old guest booking URLs → My Page (consolidated under /me).
      { source: "/bookings", destination: "/me/bookings", permanent: true },
      {
        source: "/bookings/:bookingId",
        destination: "/me/bookings/:bookingId",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
