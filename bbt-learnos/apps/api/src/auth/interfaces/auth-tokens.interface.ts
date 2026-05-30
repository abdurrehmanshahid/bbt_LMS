export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl: string | null;
    emailVerified: boolean;
  };
}
