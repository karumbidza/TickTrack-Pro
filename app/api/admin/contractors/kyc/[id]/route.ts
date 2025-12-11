import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { logger } from '@/lib/logger'

// GET - Get single KYC application details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    if (!session.user.tenantId) {
      return NextResponse.json({ message: 'Invalid tenant' }, { status: 400 })
    }

    const kyc = await prisma.contractorKYC.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId
      }
    })

    if (!kyc) {
      return NextResponse.json({ message: 'KYC application not found' }, { status: 404 })
    }

    return NextResponse.json({ kyc })

  } catch (error) {
    logger.error('Error fetching KYC application:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update KYC status (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const allowedRoles = ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    if (!session.user.tenantId) {
      return NextResponse.json({ message: 'Invalid tenant' }, { status: 400 })
    }

    const { action, reviewNotes, rejectionReason } = await request.json()

    const kyc = await prisma.contractorKYC.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId
      }
    })

    if (!kyc) {
      return NextResponse.json({ message: 'KYC application not found' }, { status: 404 })
    }

    if (action === 'approve') {
      // Generate password setup token
      const passwordSetupToken = randomBytes(32).toString('hex')
      const passwordSetupExpires = new Date()
      passwordSetupExpires.setDate(passwordSetupExpires.getDate() + 7) // 7 days

      const updatedKyc = await prisma.contractorKYC.update({
        where: { id: params.id },
        data: {
          status: 'APPROVED',
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          reviewNotes,
          passwordSetupToken,
          passwordSetupExpires
        }
      })

      // Generate password setup link
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const passwordSetupLink = `${appUrl}/contractor-setup/${passwordSetupToken}`

      // TODO: Send email with password setup link
      logger.info('KYC Approved:', {
        company: kyc.companyName,
        email: kyc.companyEmail,
        passwordSetupLink
      })

      return NextResponse.json({
        message: 'KYC approved successfully. Password setup email will be sent.',
        kyc: updatedKyc,
        passwordSetupLink
      })

    } else if (action === 'reject') {
      if (!rejectionReason) {
        return NextResponse.json({ 
          message: 'Rejection reason is required' 
        }, { status: 400 })
      }

      const updatedKyc = await prisma.contractorKYC.update({
        where: { id: params.id },
        data: {
          status: 'REJECTED',
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          reviewNotes,
          rejectionReason
        }
      })

      // TODO: Send rejection email
      logger.info('KYC Rejected:', {
        company: kyc.companyName,
        reason: rejectionReason
      })

      return NextResponse.json({
        message: 'KYC rejected',
        kyc: updatedKyc
      })

    } else if (action === 'under_review') {
      const updatedKyc = await prisma.contractorKYC.update({
        where: { id: params.id },
        data: {
          status: 'UNDER_REVIEW',
          reviewedBy: session.user.id
        }
      })

      return NextResponse.json({
        message: 'KYC marked as under review',
        kyc: updatedKyc
      })

    } else {
      return NextResponse.json({ message: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    logger.error('Error updating KYC:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
