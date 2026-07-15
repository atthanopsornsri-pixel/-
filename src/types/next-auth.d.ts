import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
      planTier?: string;
      planExpiresAt?: string | null;
      lineUserId?: string;
      tenantId?: string;
      roomId?: string;
      isBound?: boolean;
      assignedPropertyIds?: string[]; // STAFF: ตึกที่ได้รับมอบหมาย (scope ของ prisma-secure)
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    planTier?: string;
    planExpiresAt?: string | null;
    roleCheckedAt?: number;
    lineUserId?: string;
    tenantId?: string;
    roomId?: string;
    isBound?: boolean;
    lineCheckedAt?: number;
    assignedPropertyIds?: string[]; // STAFF: ตึกที่ได้รับมอบหมาย
    staffCheckedAt?: number; // timestamp สำหรับ periodic STAFF assignment refresh
  }
}
