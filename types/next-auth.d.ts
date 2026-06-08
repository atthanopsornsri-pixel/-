import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: string; // required — ลบ as any ได้เลย
  }

  interface Session {
    user: {
      id: string;
      role: string;
      lineUserId?: string;
      tenantId?: string;
      roomId?: string;
      isBound?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    lineUserId?: string;
    tenantId?: string;
    roomId?: string;
    isBound?: boolean;
    roleCheckedAt?: number; // timestamp สำหรับ periodic role refresh
    lineCheckedAt?: number; // timestamp สำหรับ periodic LINE binding sync
  }
}
