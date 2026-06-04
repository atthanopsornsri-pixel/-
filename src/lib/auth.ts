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

        console.log("[LOGIN_DEBUG] Attempting login for identifier:", credentials.email);
        try {
          // Find user by either email or username
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: credentials.email },
                { username: credentials.email }
              ]
            },
          });

          console.log("[LOGIN_DEBUG] User found in DB:", !!user);

          if (!user || !user.password) {
            console.log("[LOGIN_DEBUG] Rejecting: User not found or no password");
            return null;
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          console.log("[LOGIN_DEBUG] Password valid:", isPasswordValid);

          if (!isPasswordValid) {
            console.log("[LOGIN_DEBUG] Rejecting: Invalid password");
            return null;
          }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
        } catch (error) {
          console.error("[LOGIN_DEBUG] Caught error in authorize:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
  },
};
