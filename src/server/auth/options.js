import GoogleProvider from "next-auth/providers/google";
import { isAdminUser, upsertProfileOnLogin } from "@/src/server/services/authService";

export const authOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || "",
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

      return true;
    },
    async jwt({ token, account, user }) {
      if (user?.email) {
        token.email = user.email;
      }

      if (account?.provider && account?.providerAccountId && token?.email) {
        const authProviderUserId = `${account.provider}:${account.providerAccountId}`;
        try {
          token.userId = await upsertProfileOnLogin({
            userId: authProviderUserId,
            email: token.email,
            name: user?.name || "",
          });
        } catch (err) {
          console.error("[auth] upsertProfileOnLogin failed:", err);
          return false;
        }
      }

      if (token?.userId) {
        try {
          token.isAdmin = await isAdminUser(token.userId);
        } catch (err) {
          console.error("[auth] isAdminUser failed:", err);
          token.isAdmin = false;
        }
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
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
};
