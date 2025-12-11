import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: "SUPER_ADMIN" | "TENANT_ADMIN" | "IT_ADMIN" | "SALES_ADMIN" | "RETAIL_ADMIN" | "MAINTENANCE_ADMIN" | "PROJECTS_ADMIN" | "CONTRACTOR" | "END_USER"
      tenantId: string | null
    }
  }

  interface User {
    id: string
    role: "SUPER_ADMIN" | "TENANT_ADMIN" | "IT_ADMIN" | "SALES_ADMIN" | "RETAIL_ADMIN" | "MAINTENANCE_ADMIN" | "PROJECTS_ADMIN" | "CONTRACTOR" | "END_USER"
    tenantId: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "SUPER_ADMIN" | "TENANT_ADMIN" | "IT_ADMIN" | "SALES_ADMIN" | "RETAIL_ADMIN" | "MAINTENANCE_ADMIN" | "PROJECTS_ADMIN" | "CONTRACTOR" | "END_USER"
    tenantId: string | null
  }
}