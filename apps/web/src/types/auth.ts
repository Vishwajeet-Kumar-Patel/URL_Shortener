export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER" | "ADVERTISER";
  isEmailVerified: boolean;
};

export type AuthResponse = {
  user: {
    userId: string;
    name: string;
    email: string;
    role: "ADMIN" | "MEMBER" | "ADVERTISER";
    isEmailVerified: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
};

export type RegisterResponse = {
  user: {
    userId: string;
    name: string;
    email: string;
    role: "ADMIN" | "MEMBER" | "ADVERTISER";
    isEmailVerified: boolean;
  };
  verificationRequired: boolean;
};
