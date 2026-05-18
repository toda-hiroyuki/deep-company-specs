import { Platform } from "react-native";

// Google Maps API key. Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in apps/mobile/.env
// (or via EAS Secrets for production builds). Inline fallback is the dev key
// scoped to localhost referers.
export const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
  "AIzaSyBhj2sWJRFNlI8CFTXOxE2Vxmu_UAElLCw";

// Google Maps JS API script URL
export const GOOGLE_MAPS_SCRIPT_URL =
  Platform.OS === "web"
    ? `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`
    : "";
