// Stub auth hook — server auth not active in this deployment.
// Replace with a real auth provider (Clerk, Auth0, etc.) in Phase 2.

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
};

export function useAuth(_options?: UseAuthOptions) {
  return {
    user: null as AuthUser | null,
    loading: false,
    error: null as Error | null,
    isAuthenticated: false,
    refresh: () => {},
    logout: async () => {},
  };
}
