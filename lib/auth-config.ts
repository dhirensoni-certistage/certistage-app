import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import { MongoClient } from "mongodb"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import { notifyNewSignup } from "@/lib/signup.server"
import { completeOAuthUser } from "@/lib/oauth-user.server"

const client = new MongoClient(process.env.MONGODB_URI!)

// Smart environment detection
const isProduction = process.env.NODE_ENV === 'production'

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(client),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          await connectDB()
          
          // New Google users are created by the adapter after this callback (see events.createUser);
          // creating them here would make the adapter refuse the sign-in because the email exists.
          // For returning users, fill in fields missing from records made before this fix.
          if (user.email) await completeOAuthUser({ email: user.email.toLowerCase() })
          
          return true
        } catch (error) {
          console.error("Error during Google sign-in:", error)
          // Still allow sign-in even if our DB operation fails
          // NextAuth adapter will handle the user
          return true
        }
      }
      return true
    },
    async session({ session }) {
      if (session.user?.email) {
        await connectDB()
        const dbUser = await User.findOne({ email: session.user.email })
        if (dbUser) {
          session.user.id = dbUser._id.toString()
          session.user.plan = dbUser.plan
          session.user.phone = dbUser.phone
          session.user.organization = dbUser.organization
        }
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async redirect({ url, baseUrl }) {
      // Handle callback URL properly
      if (url.includes("/auth/callback")) {
        return `${baseUrl}/auth/callback`
      }
      // Redirect to events page after successful login
      if (url.startsWith("/")) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/client/events`
    }
  },
  events: {
    // A brand-new Google account: add the app's fields, then welcome email + admin email/notification
    async createUser({ user }) {
      try {
        await connectDB()
        await completeOAuthUser({ _id: user.id })
        await notifyNewSignup({ _id: user.id, name: user.name || user.email?.split("@")[0] || "User", email: user.email || "" })
        console.log("New Google user created:", user.email)
      } catch (error) {
        console.error("Failed to set up new Google user:", error)
      }
    }
  },
  pages: {
    signIn: '/signup',
    error: '/signup'
  },
  session: {
    strategy: "jwt"
  },
  secret: process.env.NEXTAUTH_SECRET
}