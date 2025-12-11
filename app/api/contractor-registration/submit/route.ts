import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { logger } from '@/lib/logger'

// POST - Submit KYC form
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const token = formData.get('token') as string
    
    if (!token) {
      return NextResponse.json({ message: 'Token is required' }, { status: 400 })
    }

    // Validate invitation
    const invitation = await prisma.contractorInvitation.findUnique({
      where: { token },
      include: { tenant: true }
    })

    if (!invitation) {
      return NextResponse.json({ message: 'Invalid invitation' }, { status: 404 })
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json({ message: 'Invitation expired' }, { status: 400 })
    }

    if (invitation.status === 'used') {
      return NextResponse.json({ message: 'Invitation already used' }, { status: 400 })
    }

    // Helper function to save uploaded file
    async function saveFile(file: File | null, folder: string): Promise<string | null> {
      if (!file || file.size === 0) return null
      
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'kyc', folder)
      await mkdir(uploadsDir, { recursive: true })
      
      const timestamp = Date.now()
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filename = `${timestamp}_${safeName}`
      const filepath = path.join(uploadsDir, filename)
      
      const bytes = await file.arrayBuffer()
      await writeFile(filepath, Buffer.from(bytes))
      
      return `/uploads/kyc/${folder}/${filename}`
    }

    // Extract form data
    const companyName = formData.get('companyName') as string
    const tradingName = formData.get('tradingName') as string
    const physicalAddress = formData.get('physicalAddress') as string
    const companyEmail = formData.get('companyEmail') as string || invitation.email
    const companyPhone = formData.get('companyPhone') as string

    if (!companyName || !physicalAddress || !companyEmail || !companyPhone) {
      return NextResponse.json({ 
        message: 'Company name, address, email and phone are required' 
      }, { status: 400 })
    }

    // Upload files
    const companyProfileUrl = await saveFile(formData.get('companyProfile') as File, 'profiles')
    const certificateOfIncorporationUrl = await saveFile(formData.get('certificateOfIncorporation') as File, 'documents')
    const cr5RegisteredOfficeUrl = await saveFile(formData.get('cr5RegisteredOffice') as File, 'documents')
    const cr6DirectorsListUrl = await saveFile(formData.get('cr6DirectorsList') as File, 'documents')
    const memorandumArticlesUrl = await saveFile(formData.get('memorandumArticles') as File, 'documents')
    const prazCertificateUrl = await saveFile(formData.get('prazCertificate') as File, 'documents')
    const bankProofUrl = await saveFile(formData.get('bankProof') as File, 'banking')
    const zimraTaxClearanceUrl = await saveFile(formData.get('zimraTaxClearance') as File, 'compliance')
    const vatCertificateUrl = await saveFile(formData.get('vatCertificate') as File, 'compliance')
    const necComplianceUrl = await saveFile(formData.get('necCompliance') as File, 'compliance')
    const insuranceCoverUrl = await saveFile(formData.get('insuranceCover') as File, 'compliance')
    const sheqPolicyUrl = await saveFile(formData.get('sheqPolicy') as File, 'safety')
    const publicLiabilityInsuranceUrl = await saveFile(formData.get('publicLiabilityInsurance') as File, 'safety')
    const safetyCertificatesUrl = await saveFile(formData.get('safetyCertificates') as File, 'safety')
    const methodStatementsUrl = await saveFile(formData.get('methodStatements') as File, 'technical')
    const referenceLettersUrl = await saveFile(formData.get('referenceLetters') as File, 'experience')
    const previousWorkExamplesUrl = await saveFile(formData.get('previousWorkExamples') as File, 'experience')
    const companyStampUrl = await saveFile(formData.get('companyStamp') as File, 'declarations')

    // Parse JSON fields
    const parseJSON = (value: string | null, defaultValue: unknown = []) => {
      if (!value) return defaultValue
      try {
        return JSON.parse(value)
      } catch {
        return defaultValue
      }
    }

    const directors = parseJSON(formData.get('directors') as string, [])
    const keyTechnicalStaff = parseJSON(formData.get('keyTechnicalStaff') as string, [])
    const availableEquipment = parseJSON(formData.get('availableEquipment') as string, [])
    const specialLicenses = parseJSON(formData.get('specialLicenses') as string, [])
    const previousClients = parseJSON(formData.get('previousClients') as string, [])
    const currentProjects = parseJSON(formData.get('currentProjects') as string, [])
    const pastProjects = parseJSON(formData.get('pastProjects') as string, [])

    // Parse array fields
    const parseArray = (value: string | null): string[] => {
      if (!value) return []
      try {
        return JSON.parse(value)
      } catch {
        return value.split(',').map(s => s.trim()).filter(Boolean)
      }
    }

    const specializations = parseArray(formData.get('specializations') as string)
    const industrySectors = parseArray(formData.get('industrySectors') as string)

    // Create KYC record
    const kyc = await prisma.contractorKYC.create({
      data: {
        tenantId: invitation.tenantId,
        invitationId: invitation.id,
        status: 'SUBMITTED',
        
        // Company Information
        companyName,
        tradingName,
        physicalAddress,
        companyEmail: companyEmail.toLowerCase(),
        companyPhone,
        companyProfileUrl,
        
        // Company Registration Documents
        certificateOfIncorporationUrl,
        cr5RegisteredOfficeUrl,
        cr6DirectorsListUrl,
        memorandumArticlesUrl,
        prazCertificateUrl,
        
        // Directors
        directors,
        
        // Banking
        bankName: formData.get('bankName') as string,
        bankBranch: formData.get('bankBranch') as string,
        accountName: formData.get('accountName') as string,
        accountNumber: formData.get('accountNumber') as string,
        accountCurrency: formData.get('accountCurrency') as string || 'USD',
        bankProofUrl,
        
        // Tax & Compliance
        zimraTaxClearanceUrl,
        vatCertificateUrl,
        nssaNumber: formData.get('nssaNumber') as string,
        necComplianceUrl,
        insuranceCoverUrl,
        
        // Health & Safety
        sheqPolicyUrl,
        ppeComplianceDeclaration: formData.get('ppeComplianceDeclaration') === 'true',
        publicLiabilityInsuranceUrl,
        safetyOfficerName: formData.get('safetyOfficerName') as string,
        safetyOfficerQualifications: formData.get('safetyOfficerQualifications') as string,
        safetyCertificatesUrl,
        
        // Technical Capability
        numberOfEmployees: parseInt(formData.get('numberOfEmployees') as string) || null,
        keyTechnicalStaff,
        availableEquipment,
        specialLicenses,
        methodStatementsUrl,
        specializations,
        
        // Previous Experience
        previousClients,
        referenceLettersUrl,
        previousWorkExamplesUrl,
        currentProjects,
        pastProjects,
        industrySectors,
        
        // Compliance Declarations
        conflictOfInterestDeclared: formData.get('conflictOfInterestDeclared') === 'true',
        antiCorruptionDeclared: formData.get('antiCorruptionDeclared') === 'true',
        dataPrivacyAcknowledged: formData.get('dataPrivacyAcknowledged') === 'true',
        infoAccuracyDeclared: formData.get('infoAccuracyDeclared') === 'true',
        authorizedSignatoryName: formData.get('authorizedSignatoryName') as string,
        authorizedSignatoryPosition: formData.get('authorizedSignatoryPosition') as string,
        signatureDate: new Date(),
        companyStampUrl
      }
    })

    // Mark invitation as used
    await prisma.contractorInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'used',
        usedAt: new Date()
      }
    })

    // TODO: Send notification to admin about new KYC submission
    logger.info('KYC submitted successfully:', {
      company: companyName,
      email: companyEmail,
      kycId: kyc.id
    })

    return NextResponse.json({
      message: 'KYC submitted successfully. You will receive an email once your application is reviewed.',
      kycId: kyc.id
    })

  } catch (error) {
    logger.error('Error submitting KYC:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
