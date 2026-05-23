import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: {
    maxAge: 10800, // 3 jam
  },
  callbacks: {
    async signIn({ user }) {
      return user.email?.endsWith("@students.ukdw.ac.id") ?? false;
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    error: "/",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
