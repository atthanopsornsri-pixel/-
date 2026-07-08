import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import LineProvider from "next-auth/providers/line";
import type { Adapter, AdapterUser } from "next-auth/adapters";

/**
 * Custom adapter ที่ override createUser เพื่อรองรับ LINE OAuth
 * ซึ่งไม่ส่ง email มาด้วยเสมอไป แต่ DB ต้องการ email (unique, required)
 * → สร้าง placeholder email อัตโนมัติเมื่อ LINE ไม่ส่งมา
 */
function createCustomAdapter(): Adapter {
  const base = PrismaAdapter(prisma);
  return {
    ...base,
    async createUser(user: Omit<AdapterUser, "id">) {
      // LINE ไม่ส่ง email บางครั้ง — generate placeholder ที่ unique
      const email =
        user.email ??
        `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@line.placeholder.jadhor.app`;
      return base.createUser!({ ...user, email });
    },
  };
}

const isProd = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  sameSite: (isProd ? "none" : "lax") as "none" | "lax",
  secure: isProd,
  path: "/",
};

export const authOptions: NextAuthOptions = {
  adapter: createCustomAdapter() as any,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  cookies: {
    sessionToken: {
      name: isProd ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
      options: cookieOptions,
    },
    callbackUrl: {
      name: isProd ? `__Secure-next-auth.callback-url` : `next-auth.callback-url`,
      options: {
        sameSite: (isProd ? "none" : "lax") as "none" | "lax",
        secure: isProd,
        path: "/",
      },
    },
    csrfToken: {
      name: isProd ? `__Host-next-auth.csrf-token` : `next-auth.csrf-token`,
      options: cookieOptions,
    },
    pkceCodeVerifier: {
      name: isProd ? `__Secure-next-auth.pkce.code_verifier` : `next-auth.pkce.code_verifier`,
      options: cookieOptions,
    },
    state: {
      name: isProd ? `__Secure-next-auth.state` : `next-auth.state`,
      options: cookieOptions,
    },
  },
  providers: [
    LineProvider({
      clientId: process.env.LINE_CLIENT_ID || "",
      clientSecret: process.env.LINE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email/Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const rawInput = credentials.email.trim();
        const emailInput = rawInput.toLowerCase();
        // เบอร์โทร: ตัดขีด/เว้นวรรคออก เพื่อให้ตรงกับ username ที่เก็บเป็นตัวเลขล้วน
        const phoneInput = rawInput.replace(/[-\s]/g, "");

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: emailInput },
              { username: emailInput },
              { username: phoneInput },
            ]
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      // 1. Initial Login
      if (user) {
        token.id = user.id;
        token.role = user.role || "TENANT"; // LINE users default to TENANT role context
        token.roleCheckedAt = Date.now();
      }

      // Capture LINE ID from the account provider
      if (account && account.provider === "line") {
        token.lineUserId = account.providerAccountId;
      }

      // 2. Force-refresh when trigger is "update"
      if (trigger === "update") {
        token.isBound = false;
        token.lineCheckedAt = 0; // force LINE binding re-sync on next jwt call

        if (token.id) {
          const fresh = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          });
          if (fresh) {
            token.role = fresh.role;
            token.roleCheckedAt = Date.now();
          }
        }
      }

      // 3. Periodic refresh every 5 minutes (role + plan info)
      const FIVE_MIN = 5 * 60 * 1000;
      const lastChecked = (token.roleCheckedAt as number) ?? 0;
      if (Date.now() - lastChecked > FIVE_MIN && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, planTier: true, planExpiresAt: true },
        });
        if (fresh) {
          token.role = fresh.role;
          token.planTier = fresh.planTier;
          token.planExpiresAt = fresh.planExpiresAt?.toISOString() ?? null;
          token.roleCheckedAt = Date.now();
        }
      }

      // 4. Database Sync: Check LINE binding (rate-limited เหมือน role — ทุก 5 นาที)
      const LINE_TTL = 5 * 60 * 1000;
      const lineLastChecked = (token.lineCheckedAt as number) ?? 0;

      if (token.lineUserId && Date.now() - lineLastChecked > LINE_TTL) {
        try {
          const tenant = await prisma.tenant.findUnique({
            where: { lineUserId: token.lineUserId as string },
            select: { id: true, roomId: true }, // select เฉพาะที่ใช้
          });

          token.tenantId = tenant?.id ?? undefined;
          token.roomId = tenant?.roomId ?? undefined;
          token.isBound = !!tenant;
          token.lineCheckedAt = Date.now();
        } catch (error) {
          console.error("JWT LINE sync error:", error);
        }
      }

      return token;
    },
    
    async session({ token, session }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.planTier = token.planTier as string | undefined;
        session.user.planExpiresAt = token.planExpiresAt as string | null | undefined;
        session.user.lineUserId = token.lineUserId as string | undefined;
        session.user.tenantId = token.tenantId as string | undefined;
        session.user.roomId = token.roomId as string | undefined;
        session.user.isBound = token.isBound as boolean | undefined;
      }
      return session;
    },
  },
};
