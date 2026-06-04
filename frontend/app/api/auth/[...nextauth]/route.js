// Konfigurasi NextAuth untuk autentikasi Google OAuth mahasiswa UKDW.
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: {
    maxAge: 10800, // sesi berlaku 3 jam (10800 detik); setelah itu harus login ulang
  },
  callbacks: {
    // signIn: dipanggil setiap kali ada percobaan login.
    // Kembalikan true = izinkan, false = tolak.
    // Hanya email domain @students.ukdw.ac.id yang boleh masuk — akun Google lain ditolak.
    async signIn({ user }) {
      return user.email?.endsWith("@students.ukdw.ac.id") ?? false;
    },
    // session: dipanggil setiap kali sesi dibaca di server component.
    // Di sini session dikembalikan apa adanya tanpa modifikasi.
    async session({ session }) {
      return session;
    },
  },
  pages: {
    error: "/", // redirect ke landing page jika login gagal (mis. email bukan UKDW)
  },
};

const handler = NextAuth(authOptions);
// NextAuth membutuhkan handler yang sama untuk GET (redirect OAuth) dan POST (callback token)
export { handler as GET, handler as POST };
