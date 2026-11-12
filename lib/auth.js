import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import apiConfig from "@/configs/apiConfig";
const siteUrl = apiConfig.DOMAIN_URL.startsWith("http") ? apiConfig.DOMAIN_URL.replace(/\/$/, "") : `https://${apiConfig.DOMAIN_URL.replace(/\/$/, "")}`;
export const authOptions = {
  providers: [CredentialsProvider({
    id: "guest",
    name: "Guest",
    credentials: {},
    async authorize() {
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return {
        id: guestId,
        name: "Guest User",
        email: `${guestId}@guest.local`,
        isGuest: true,
        isNewSignIn: true
      };
    }
  }), CredentialsProvider({
    id: "credentials",
    name: "Credentials",
    credentials: {
      email: {
        label: "Email",
        type: "text"
      },
      password: {
        label: "Password",
        type: "password"
      }
    },
    async authorize(credentials) {
      try {
        const res = await fetch(`${siteUrl}/api/auth`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password
          })
        });
        const result = await res.json();
        if (res.ok && result.user && result.token) {
          const user = result.user;
          return {
            id: String(user._id),
            name: user.name || user.email?.split("@")[0] || "User",
            email: user.email,
            token: result.token,
            isGuest: false,
            isNewSignIn: true
          };
        } else {
          throw new Error(result.message || result.error || "Otorisasi gagal");
        }
      } catch (error) {
        throw new Error(error.message || "Terjadi kesalahan saat otorisasi");
      }
    }
  }), GoogleProvider({
    clientId: apiConfig.GOOGLE_CLIENT_ID,
    clientSecret: apiConfig.GOOGLE_CLIENT_SECRET
  }), GithubProvider({
    clientId: apiConfig.GITHUB_ID,
    clientSecret: apiConfig.GITHUB_SECRET
  })],
  callbacks: {
    async redirect({
      url,
      baseUrl
    }) {
      const base = siteUrl;
      if (url.startsWith("/")) return `${base}${url}`;
      else if (new URL(url).origin === new URL(base).origin) return url;
      return base;
    },
    async jwt({
      token,
      user,
      account,
      isNewUser
    }) {
      token.isNewSignIn = token.isNewSignIn ?? false;
      if (user) {
        token.id = user.id || user._id;
        token.email = user.email;
        token.name = user.name;
        token.isGuest = user.isGuest || false;
        token.isNewSignIn = user.isNewSignIn || isNewUser ? true : token.isNewSignIn;
        if (user.token) {
          token.apiToken = user.token;
        }
      }
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
        if (isNewUser && !token.isNewSignIn) {
          token.isNewSignIn = true;
        }
      }
      return token;
    },
    async session({
      session,
      token
    }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.isGuest = token.isGuest || false;
        session.user.isNewSignIn = token.isNewSignIn;
        session.user.apiToken = token.apiToken;
        session.user.accessToken = token.accessToken;
        session.user.provider = token.provider || (token.isGuest ? "guest" : "credentials");
        token.isNewSignIn = false;
      }
      return session;
    }
  },
  pages: {
    signIn: "/auth",
    signOut: "/auth",
    error: "/404"
  },
  secret: apiConfig.JWT_SECRET,
  useSecureCookies: process.env.NODE_ENV === "production" || siteUrl.startsWith("https"),
  debug: false
};