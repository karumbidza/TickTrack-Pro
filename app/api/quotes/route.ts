import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { logger } from '@/lib/logger'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
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

    // Check if tenant already exists with this company name
    let tenant = await prisma.tenant.findFirst({
      where: { 
        OR: [
          { name: companyName },
          { email: contactEmail }
        ]
      }
    })

    // If no tenant exists, create a placeholder one for the quote
    if (!tenant) {
      const slug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      tenant = await prisma.tenant.create({
        data: {
          name: companyName,
          slug: `${slug}-${Date.now()}`, // Add timestamp to ensure uniqueness
          email: contactEmail,
          phone: contactPhone || null,
          status: 'TRIAL', // Will be activated when they sign up
          settings: {
            industry: industry || null,
            companySize: companySize || null,
            isQuoteOnly: true // Flag to indicate this is a quote-only tenant
          }
        }
      })
    }

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
        tenantId: tenant.id,
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
    // This endpoint could be used by admins to fetch all quote requests
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