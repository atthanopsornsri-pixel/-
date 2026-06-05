import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      lineUserId?: string;
      tenantId?: string;
      roomId?: string;
      isBound?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: string;
    lineUserId?: string;
    tenantId?: string;
    roomId?: string;
    isBound?: boolean;
  }
}
