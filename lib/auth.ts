import NextAuth, { AuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: AuthOptions = {
  // adapter: PrismaAdapter(prisma), // Commented out temporarily due to type compatibility
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { 
            tenant: true,
            branches: {
              include: { branch: true },
              take: 1 // Get the user's primary/first branch
            }
          }
        })

        if (!user || !user.password) {
          return null
        }

        // Check user status - only ACTIVE users can log in
        // SUPER_ADMIN is exempt from status checks
        if (user.role !== 'SUPER_ADMIN') {
          switch (user.status) {
            case 'PENDING_APPROVAL':
              throw new Error('PENDING_APPROVAL: Your account is pending administrator approval.')
            case 'APPROVED_EMAIL_PENDING':
              throw new Error('EMAIL_PENDING: Please check your email and activate your account.')
            case 'SUSPENDED':
              throw new Error('SUSPENDED: Your account has been suspended. Contact your administrator.')
            case 'DEACTIVATED':
              throw new Error('DEACTIVATED: Your account has been deactivated.')
            case 'ACTIVE':
              // Continue with login
              break
            default:
              // For backwards compatibility with existing users without status
              break
          }
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        // Get user's primary branch
        const primaryBranch = user.branches?.[0]?.branch

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenantName: user.tenant?.name || null,
          image: user.image,
          emailVerified: user.emailVerified,
          branchId: primaryBranch?.id || null,
          branchName: primaryBranch?.name || null
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role
        token.tenantId = user.tenantId
        token.tenantName = user.tenantName || null
        token.branchId = user.branchId || null
        token.branchName = user.branchName || null
      }

      // If user updates their profile, refresh the token
      if (trigger === "update" && session) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email! },
          include: { 
            tenant: true,
            branches: {
              include: { branch: true },
              take: 1
            }
          }
        })
        if (dbUser) {
          token.role = dbUser.role
          token.tenantId = dbUser.tenantId
          token.tenantName = dbUser.tenant?.name || null
          token.name = dbUser.name
          const primaryBranch = dbUser.branches?.[0]?.branch
          token.branchId = primaryBranch?.id || null
          token.branchName = primaryBranch?.name || null
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as any
        session.user.tenantId = token.tenantId as string | null
        session.user.tenantName = token.tenantName as string | null
        session.user.branchId = token.branchId as string | null
        session.user.branchName = token.branchName as string | null
      }
      return session
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! }
        })

        if (!existingUser) {
          // Create new user with default role
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name,
              image: user.image,
              role: "END_USER"
            }
          })
        }
      }
      return true
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  debug: process.env.NODE_ENV === 'development'
}