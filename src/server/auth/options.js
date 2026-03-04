import GoogleProvider from "next-auth/providers/google";
import { isAdminUser, upsertProfileOnLogin } from "@/src/server/services/authService";

export const authOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account?.provider || !account?.providerAccountId || !user?.email) {
        return false;
      }

      const userId = `${account.provider}:${account.providerAccountId}`;
      await upsertProfileOnLogin({
        userId,
        email: user.email,
        name: user.name || "",
      });

      return true;
    },
    async jwt({ token, account, user }) {
      if (account?.provider && account?.providerAccountId) {
        token.userId = `${account.provider}:${account.providerAccountId}`;
      }

      if (user?.email) {
        token.email = user.email;
      }

      if (token?.userId) {
        token.isAdmin = await isAdminUser(token.userId);
      }

      return token;
    },
    async session({ session, token }) {
      if (!session.user) {
        session.user = {};
      }

      session.user.id = token.userId || null;
      session.user.isAdmin = token.isAdmin === true;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.AUTH_SECRET,
};
