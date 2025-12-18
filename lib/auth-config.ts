import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import { MongoClient } from "mongodb"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"

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
          
          // Check if user already exists
          const existingUser = await User.findOne({ email: user.email })
          
          if (!existingUser) {
            // Get selected plan from localStorage (if any) - only for new signups
            const selectedPlan = typeof window !== 'undefined' ? localStorage.getItem("selectedPlan") : null
            const plan = selectedPlan && ["professional", "enterprise", "premium"].includes(selectedPlan) ? selectedPlan : "free"
            
            // Create new user with Google data
            await User.create({
              name: user.name,
              email: user.email,
              phone: "", // Will need to be filled later
              organization: "",
              plan: plan,
              isActive: true,
              // No password needed for OAuth users
              password: "oauth_user"
            })
            
            // Clear the selected plan from localStorage
            if (typeof window !== 'undefined') {
              localStorage.removeItem("selectedPlan")
            }
          } else {
            // User exists, just allow login
            console.log("Existing user logging in:", existingUser.email)
          }
          
          return true
        } catch (error) {
          console.error("Error during Google sign-in:", error)
          return false
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
  pages: {
    signIn: '/signup',
    error: '/signup'
  },
  session: {
    strategy: "jwt"
  },
  secret: process.env.NEXTAUTH_SECRET
}