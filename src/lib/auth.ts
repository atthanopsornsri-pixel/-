import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import LineProvider from "next-auth/providers/line";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
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

        const emailInput = credentials.email.trim().toLowerCase();

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: emailInput },
              { username: emailInput }
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
    async jwt({ token, user, account, trigger, session }) {
      // 1. Initial Login
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "TENANT"; // LINE users default to TENANT role context
      }

      // Capture LINE ID from the account provider
      if (account && account.provider === "line") {
        token.lineUserId = account.providerAccountId;
      }

      // 2. Handle Session Update (Triggered after successful account binding)
      if (trigger === "update") {
        // Force re-evaluation of binding status
        token.isBound = false; 
      }

      // 3. Database Sync: Check if this LINE ID is bound to a Tenant
      if (token.lineUserId) {
        try {
          const tenant = await prisma.tenant.findUnique({
            where: { lineUserId: token.lineUserId as string }
          });

          if (tenant) {
            token.tenantId = tenant.id;
            token.roomId = tenant.roomId || undefined;
            token.isBound = true;
          } else {
            token.isBound = false;
          }
        } catch (error) {
          console.error("JWT Callback Prisma Error:", error);
        }
      }

      return token;
    },
    
    async session({ token, session }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.lineUserId = token.lineUserId as string | undefined;
        session.user.tenantId = token.tenantId as string | undefined;
        session.user.roomId = token.roomId as string | undefined;
        session.user.isBound = token.isBound as boolean | undefined;
      }
      return session;
    },
  },
};
