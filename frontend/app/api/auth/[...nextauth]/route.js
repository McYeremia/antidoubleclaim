import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Hanya izinkan email @students.ukdw.ac.id
      return user.email?.endsWith("@students.ukdw.ac.id") ?? false;
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    error: "/auth-error",
  },
});

export { handler as GET, handler as POST };
