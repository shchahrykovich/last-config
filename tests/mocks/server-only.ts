// Mock for server-only package in tests
// The real package throws an error when imported in client-side code
// In tests, we just need it to be a no-op
export {};
