import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth'
import { rateLimitCheck } from '@/lib/api-rate-limit'

export async function POST(request: NextRequest) {
  // Public lead-capture form: rate limit to prevent spam / DB pollution.
  const rateLimitResponse = await rateLimitCheck(request, 'auth')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()
    const {
      companyName,
      contactName,
      contactEmail,
      contactPhone,
      companySize,
      industry,
      projectTitle,
      projectDescription,
      timeline,
      budget,
      customModules,
      integrations,
      specialRequirements,
      hasExistingSystem,
      needDataMigration,
      needTraining,
      needOnSiteSupport
    } = body

    // Validate required fields
    if (!companyName || !contactName || !contactEmail || !projectTitle || !projectDescription) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Associate with an existing tenant only if one already matches. Never create
    // a Tenant from anonymous input — real tenants are provisioned at signup.
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { name: companyName },
          { email: contactEmail }
        ]
      },
      select: { id: true }
    })

    // Prepare requested features data
    const requestedFeatures = {
      customModules: customModules || [],
      integrations: integrations || [],
      additionalServices: {
        hasExistingSystem,
        needDataMigration,
        needTraining,
        needOnSiteSupport
      },
      timeline: timeline || null,
      budget: budget || null,
      specialRequirements: specialRequirements || null
    }

    // Create the quote request
    const quote = await prisma.quote.create({
      data: {
        tenantId: tenant?.id ?? null,
        title: projectTitle,
        description: projectDescription,
        requestedFeatures,
        contactName,
        contactEmail,
        contactPhone: contactPhone || null,
        notes: specialRequirements || null,
        status: 'pending'
      }
    })

    // TODO: Send notification email to admin team
    // await sendQuoteRequestNotification(quote)

    // TODO: Send confirmation email to customer
    // await sendQuoteConfirmation(contactEmail, contactName, quote.id)

    // Log the quote request
    console.log(`New quote request: ${projectTitle} from ${companyName} (${contactEmail})`)

    return NextResponse.json({
      message: 'Quote request submitted successfully',
      quote: {
        id: quote.id,
        title: quote.title,
        status: quote.status,
        contactEmail: quote.contactEmail,
        createdAt: quote.createdAt
      }
    }, { status: 201 })

  } catch (error) {
    logger.error('Quote request error:', error)
    
    return NextResponse.json(
      { message: 'Failed to submit quote request. Please try again.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET(request: NextRequest) {
  try {
    // Sales-lead pipeline is platform-internal: SUPER_ADMIN only.
    const ctx = await getAuthContext()
    if (!ctx?.isSuperAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    
    const whereClause: any = {}
    if (status) {
      whereClause.status = status
    }

    const quotes = await prisma.quote.findMany({
      where: whereClause,
      include: {
        tenant: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(quotes)

  } catch (error) {
    logger.error('Error fetching quotes:', error)
    return NextResponse.json(
      { message: 'Failed to fetch quotes' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}