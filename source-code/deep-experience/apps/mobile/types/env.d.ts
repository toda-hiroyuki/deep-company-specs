// Expo inlines EXPO_PUBLIC_* vars at build time. Declare the shape so
// TypeScript stops asking for @types/node — we only access env vars, never
// other Node globals.
declare const process: {
  env: {
    EXPO_PUBLIC_API_BASE_URL?: string;
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?: string;
  };
};
