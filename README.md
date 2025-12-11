# TickTrack Pro - Multi-Tenant Helpdesk System

A comprehensive SaaS helpdesk and ticket tracking system built with Next.js 14, designed for multi-tenant organizations with role-based access control.

## 🚀 Features

### Core Functionality
- **Multi-Tenant Architecture**: Host multiple organizations with complete data isolation
- **Role-Based Access Control**: Super Admin, Tenant Admin, Department Admins, Contractors, and End Users
- **Complete Ticket Workflow**: From creation to completion with approval processes
- **Real-Time Communication**: Chat system between users, admins, and contractors
- **Invoice Management**: Contractor invoice submission and admin processing
- **Rating System**: User feedback and service quality tracking

### Advanced Features
- **SLA Tracking**: Monitor response times and service level agreements
- **Status History**: Complete audit trail of ticket changes
- **Notification System**: Real-time notifications for all stakeholders
- **File Attachments**: Support for job cards, invoices, and documentation
- **Priority Management**: Critical, High, Medium, Low priority levels

### Optional Modules (Extensible)
- **Inventory Management**: Track parts and equipment
- **Project Management**: Convert tickets to projects
- **Ordering System**: Purchase orders and supplier management

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components**: Shadcn/ui, Radix UI
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js
- **Real-time**: Server-Sent Events (upgradeable to WebSockets)
- **File Upload**: UploadThing
- **Email**: Resend
- **Payments**: Stripe (for subscriptions)

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm/yarn/pnpm

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd "TICKTRACK PRO"
npm install
```

### 2. Environment Setup

Copy the environment example file:

```bash
cp .env.example .env.local
```

Update `.env.local` with your configuration:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/ticktrack_pro"

# NextAuth
NEXTAUTH_SECRET="your-secure-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (for development)
npm run db:push

# Or run migrations (for production)
npm run db:migrate
```

### 4. Create Super Admin User

```bash
npx prisma studio
```

In Prisma Studio, create a user with:
- `email`: your email
- `role`: `SUPER_ADMIN`
- `isActive`: `true`

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## 📚 User Roles & Permissions

### Super Admin
- Manage all tenants and subscriptions
- Toggle features on/off per tenant
- View system-wide analytics
- Access: `/super-admin`

### Tenant Admin
- Manage all tickets within tenant
- Assign tickets to department admins
- Manage contractors
- Access: `/admin`

### Department Admins (IT, Sales, Retail, Maintenance, Projects)
- Manage tickets for specific department
- Assign contractors to tickets
- Process invoices
- Access: `/admin` (filtered view)

### Contractors
- View assigned tickets
- Update ticket status
- Upload invoices and job cards
- Communicate via chat
- Access: `/contractor`

### End Users
- Create and track tickets
- Communicate via chat
- Approve completed work
- Rate services
- Access: `/dashboard`

## 🔄 Ticket Workflow

1. **User Creates Ticket** → Status: `OPEN`
2. **Admin Assignment** → Status: `ASSIGNED`
3. **Contractor Accepts** → Status: `IN_PROGRESS`
4. **On-Site Work** → Status: `ON_SITE`
5. **Work Completion** → Status: `AWAITING_APPROVAL`
6. **User Approval** → Status: `COMPLETED`
7. **Final Closure** → Status: `CLOSED`

## 🏗 Project Structure

```
app/
├── (super-admin)/          # Super admin routes
├── (tenant)/               # Tenant-specific routes
│   ├── admin/             # Admin dashboard
│   ├── contractor/        # Contractor dashboard
│   └── dashboard/         # User dashboard
├── api/                   # API routes
├── auth/                  # Authentication pages
└── globals.css            # Global styles

components/
├── ui/                    # Reusable UI components
├── admin/                 # Admin-specific components
├── user/                  # User-specific components
├── tickets/               # Ticket-related components
├── chat/                  # Chat system components
└── layout/                # Layout components

lib/
├── prisma.ts             # Database client
├── utils.ts              # Utility functions
└── ticket-workflow.ts    # Workflow logic

prisma/
└── schema.prisma         # Database schema
```

## 🔧 Configuration

### Multi-Tenancy Setup

The system supports both subdomain and path-based tenancy:

1. **Subdomain**: `company.ticktrack.com`
2. **Path-based**: `ticktrack.com/tenant/company`

Configure in `middleware.ts`.

### Feature Flags

Control features per tenant:

```typescript
const features = {
  chat: true,
  invoicing: true,
  inventory: false,
  projects: false
}
```

### Email Configuration

Set up Resend for notifications:

```env
RESEND_API_KEY="your-resend-api-key"
```

### File Upload Configuration

Configure UploadThing for attachments:

```env
UPLOADTHING_SECRET="your-uploadthing-secret"
UPLOADTHING_APP_ID="your-uploadthing-app-id"
```

## 📊 Database Schema

### Key Models
- **User**: Authentication and profile information
- **Tenant**: Organization/company data
- **Ticket**: Support tickets with full workflow
- **Contractor**: Contractor profiles and ratings
- **Message**: Chat system messages
- **Invoice**: Payment tracking
- **Rating**: Service quality feedback

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables
4. Deploy

### Docker

```bash
# Build image
docker build -t ticktrack-pro .

# Run container
docker run -p 3000:3000 ticktrack-pro
```

### Environment Variables for Production

```env
DATABASE_URL="postgresql://prod-connection-string"
NEXTAUTH_SECRET="production-secret"
NEXTAUTH_URL="https://your-domain.com"
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 📈 Monitoring & Analytics

- Built-in dashboard analytics
- Ticket resolution tracking
- User satisfaction metrics
- Contractor performance ratings

## 🔒 Security Features

- Role-based access control
- Data isolation between tenants
- Encrypted passwords
- Session management
- CSRF protection

## 🛟 Support & Documentation

### API Documentation
- All API routes are documented with TypeScript interfaces
- Check `/app/api` directory for endpoint implementations

### Database Migrations
```bash
# Create migration
npx prisma migrate dev --name migration_name

# Deploy migrations
npx prisma migrate deploy
```

## 📝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Support

For support and questions:
- Email: support@ticktrackpro.com
- Documentation: [docs.ticktrackpro.com]
- GitHub Issues: [Create an issue]

---

**TickTrack Pro** - Streamlining helpdesk operations for modern organizations.