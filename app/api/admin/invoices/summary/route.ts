import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('invoiceId')
    const format = searchParams.get('format') || 'json' // json, html, or text

    // Fetch invoice with related ticket data
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId || '' },
      include: {
        contractor: true,
        ticket: {
          include: {
            user: true,
            asset: true,
            ratings: {
              take: 1,
              orderBy: { createdAt: 'desc' }
            },
            attachments: true
          }
        },
        tenant: true
      }
    })

    if (!invoice) {
      return NextResponse.json({ message: 'Invoice not found' }, { status: 404 })
    }

    const ticket = invoice.ticket
    const rating = ticket.ratings[0]
    
    // Return as JSON for frontend rendering
    if (format === 'json') {
      return NextResponse.json({
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          hoursWorked: invoice.hoursWorked,
          hourlyRate: invoice.hourlyRate,
          description: invoice.description,
          workDescription: invoice.workDescription,
          status: invoice.status,
          paidAmount: invoice.paidAmount,
          balance: invoice.balance,
          notes: invoice.notes,
          invoiceFileUrl: invoice.invoiceFileUrl,
          proofOfPaymentUrl: invoice.proofOfPaymentUrl,
          rejectionReason: invoice.rejectionReason,
          clarificationRequest: invoice.clarificationRequest,
          clarificationResponse: invoice.clarificationResponse,
          createdAt: invoice.createdAt,
          paidDate: invoice.paidDate,
        },
        contractor: invoice.contractor ? {
          name: invoice.contractor.name || 'N/A',
          email: invoice.contractor.email || 'N/A',
          phone: invoice.contractor.phone,
        } : null,
        ticket: {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          description: ticket.description,
          type: ticket.type,
          priority: ticket.priority,
          status: ticket.status,
          location: ticket.location,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          reporter: {
            name: ticket.user.name || 'N/A',
            email: ticket.user.email,
          },
          asset: ticket.asset ? {
            name: ticket.asset.name,
            assetNumber: ticket.asset.assetNumber,
            location: ticket.asset.location,
          } : null,
          attachments: ticket.attachments,
        },
        rating: rating ? {
          overall: rating.overallRating,
          punctuality: rating.punctualityRating,
          customerService: rating.customerServiceRating,
          workmanship: rating.workmanshipRating,
          ppeCompliant: rating.ppeCompliant,
          followedSiteProcedures: rating.followedSiteProcedures,
          comment: rating.comment,
        } : null,
        tenant: {
          name: invoice.tenant?.name || 'N/A',
          domain: invoice.tenant?.domain,
        },
        generatedAt: new Date().toISOString(),
      })
    }

    // Generate HTML for PDF printing
    if (format === 'html') {
      const starRating = (rating: number) => '★'.repeat(rating) + '☆'.repeat(5 - rating)
      
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice Summary - ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #333;
      background: #fff;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 { 
      color: #2563eb; 
      font-size: 28px;
      margin-bottom: 5px;
    }
    .header .subtitle {
      color: #666;
      font-size: 14px;
    }
    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    .section-title {
      background: #f1f5f9;
      padding: 10px 15px;
      font-weight: 600;
      color: #1e40af;
      border-left: 4px solid #2563eb;
      margin-bottom: 15px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    .field {
      margin-bottom: 10px;
    }
    .field-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .field-value {
      font-size: 14px;
      color: #1f2937;
      font-weight: 500;
    }
    .amount-box {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
    }
    .amount-box .label { font-size: 12px; opacity: 0.9; }
    .amount-box .value { font-size: 32px; font-weight: 700; }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-approved { background: #dbeafe; color: #1e40af; }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-rejected { background: #fee2e2; color: #991b1b; }
    .work-description {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      margin-top: 10px;
    }
    .rating-stars {
      color: #f59e0b;
      font-size: 16px;
      letter-spacing: 2px;
    }
    .rating-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .rating-item {
      display: flex;
      justify-content: space-between;
      padding: 8px;
      background: #f8fafc;
      border-radius: 4px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
    }
    .compliance-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
    }
    .compliance-yes { background: #d1fae5; color: #065f46; }
    .compliance-no { background: #fee2e2; color: #991b1b; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋 Invoice Summary Document</h1>
    <div class="subtitle">${invoice.tenant?.name || 'TickTrack Pro'}</div>
  </div>

  <div class="amount-box">
    <div class="label">INVOICE AMOUNT</div>
    <div class="value">$${invoice.amount.toFixed(2)}</div>
    <div style="margin-top: 5px;">
      <span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">📄 Invoice Details</div>
    <div class="grid">
      <div class="field">
        <div class="field-label">Invoice Number</div>
        <div class="field-value">${invoice.invoiceNumber}</div>
      </div>
      <div class="field">
        <div class="field-label">Date Submitted</div>
        <div class="field-value">${new Date(invoice.createdAt).toLocaleDateString()}</div>
      </div>
      ${invoice.hoursWorked ? `
      <div class="field">
        <div class="field-label">Hours Worked</div>
        <div class="field-value">${invoice.hoursWorked} hours</div>
      </div>
      ` : ''}
      ${invoice.hourlyRate ? `
      <div class="field">
        <div class="field-label">Hourly Rate</div>
        <div class="field-value">$${invoice.hourlyRate.toFixed(2)}/hr</div>
      </div>
      ` : ''}
      <div class="field">
        <div class="field-label">Amount Paid</div>
        <div class="field-value">$${invoice.paidAmount.toFixed(2)}</div>
      </div>
      <div class="field">
        <div class="field-label">Balance</div>
        <div class="field-value">$${invoice.balance.toFixed(2)}</div>
      </div>
    </div>
    ${invoice.workDescription ? `
    <div style="margin-top: 15px;">
      <div class="field-label">Work Description</div>
      <div class="work-description">${invoice.workDescription}</div>
    </div>
    ` : ''}
    ${invoice.notes ? `
    <div style="margin-top: 15px;">
      <div class="field-label">Notes</div>
      <div class="work-description">${invoice.notes}</div>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title">🎫 Ticket Information</div>
    <div class="grid">
      <div class="field">
        <div class="field-label">Ticket Number</div>
        <div class="field-value">${ticket.ticketNumber}</div>
      </div>
      <div class="field">
        <div class="field-label">Type</div>
        <div class="field-value">${ticket.type?.replace(/_/g, ' ') || 'N/A'}</div>
      </div>
      <div class="field">
        <div class="field-label">Priority</div>
        <div class="field-value">${ticket.priority}</div>
      </div>
      <div class="field">
        <div class="field-label">Status</div>
        <div class="field-value">${ticket.status}</div>
      </div>
    </div>
    <div style="margin-top: 15px;">
      <div class="field-label">Title</div>
      <div class="field-value">${ticket.title}</div>
    </div>
    <div style="margin-top: 10px;">
      <div class="field-label">Description</div>
      <div class="work-description">${ticket.description}</div>
    </div>
    ${ticket.location ? `
    <div style="margin-top: 10px;">
      <div class="field-label">Location</div>
      <div class="field-value">${ticket.location}</div>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title">👤 Parties Involved</div>
    <div class="grid">
      <div>
        <div class="field-label" style="margin-bottom: 10px;">Reporter</div>
        <div class="field">
          <div class="field-value">${ticket.user.name || 'N/A'}</div>
          <div style="font-size: 12px; color: #666;">${ticket.user.email}</div>
        </div>
      </div>
      <div>
        <div class="field-label" style="margin-bottom: 10px;">Contractor</div>
        <div class="field">
          <div class="field-value">${invoice.contractor?.name || 'N/A'}</div>
          <div style="font-size: 12px; color: #666;">${invoice.contractor?.email || 'N/A'}</div>
          ${invoice.contractor?.phone ? `<div style="font-size: 12px; color: #666;">${invoice.contractor.phone}</div>` : ''}
        </div>
      </div>
    </div>
  </div>

  ${ticket.asset ? `
  <div class="section">
    <div class="section-title">🔧 Asset Information</div>
    <div class="grid">
      <div class="field">
        <div class="field-label">Asset Name</div>
        <div class="field-value">${ticket.asset.name}</div>
      </div>
      <div class="field">
        <div class="field-label">Asset Number</div>
        <div class="field-value">${ticket.asset.assetNumber}</div>
      </div>
      <div class="field">
        <div class="field-label">Asset Location</div>
        <div class="field-value">${ticket.asset.location}</div>
      </div>
    </div>
  </div>
  ` : ''}

  ${rating ? `
  <div class="section">
    <div class="section-title">⭐ Contractor Rating</div>
    <div style="text-align: center; margin-bottom: 15px;">
      <div class="rating-stars">${starRating(rating.overallRating)}</div>
      <div style="font-size: 14px; color: #666;">Overall Rating: ${rating.overallRating}/5</div>
    </div>
    <div class="rating-grid">
      <div class="rating-item">
        <span>Punctuality</span>
        <span class="rating-stars" style="font-size: 12px;">${starRating(rating.punctualityRating)}</span>
      </div>
      <div class="rating-item">
        <span>Customer Service</span>
        <span class="rating-stars" style="font-size: 12px;">${starRating(rating.customerServiceRating)}</span>
      </div>
      <div class="rating-item">
        <span>Workmanship</span>
        <span class="rating-stars" style="font-size: 12px;">${starRating(rating.workmanshipRating)}</span>
      </div>
    </div>
    <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: center;">
      <span class="compliance-badge ${rating.ppeCompliant ? 'compliance-yes' : 'compliance-no'}">
        ${rating.ppeCompliant ? '✓' : '✗'} PPE Compliant
      </span>
      <span class="compliance-badge ${rating.followedSiteProcedures ? 'compliance-yes' : 'compliance-no'}">
        ${rating.followedSiteProcedures ? '✓' : '✗'} Site Procedures
      </span>
    </div>
    ${rating.comment ? `
    <div style="margin-top: 15px;">
      <div class="field-label">Comments</div>
      <div class="work-description">${rating.comment}</div>
    </div>
    ` : ''}
  </div>
  ` : `
  <div class="section">
    <div class="section-title">⭐ Contractor Rating</div>
    <div style="text-align: center; color: #666; padding: 20px;">
      No rating submitted yet.
    </div>
  </div>
  `}

  <div class="footer">
    <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
    <p>TickTrack Pro - Ticket Management System</p>
  </div>

  <script class="no-print">
    window.onload = function() {
      window.print();
    }
  </script>
</body>
</html>
`
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
        }
      })
    }

    // Plain text format
    const summary = `
================================================================================
                        TICKET SUMMARY DOCUMENT
================================================================================

INVOICE DETAILS
---------------
Invoice Number: ${invoice.invoiceNumber}
Invoice Amount: $${invoice.amount.toFixed(2)}
Invoice Status: ${invoice.status}
Invoice Date: ${new Date(invoice.createdAt).toLocaleDateString()}
${invoice.hoursWorked ? `Hours Worked: ${invoice.hoursWorked}` : ''}
${invoice.hourlyRate ? `Hourly Rate: $${invoice.hourlyRate}/hr` : ''}

${invoice.workDescription ? `
WORK DESCRIPTION
----------------
${invoice.workDescription}
` : ''}

================================================================================

TICKET INFORMATION
------------------
Ticket Number: ${ticket.ticketNumber}
Title: ${ticket.title}
Type: ${ticket.type}
Priority: ${ticket.priority}
Status: ${ticket.status}

DESCRIPTION
-----------
${ticket.description}

LOCATION
--------
${ticket.location || 'Not specified'}

DATES
-----
Created: ${new Date(ticket.createdAt).toLocaleDateString()} ${new Date(ticket.createdAt).toLocaleTimeString()}
Last Updated: ${new Date(ticket.updatedAt).toLocaleDateString()} ${new Date(ticket.updatedAt).toLocaleTimeString()}

================================================================================

REPORTER DETAILS
----------------
Name: ${ticket.user.name || 'N/A'}
Email: ${ticket.user.email}

CONTRACTOR DETAILS
------------------
Name: ${invoice.contractor?.name || 'N/A'}
Email: ${invoice.contractor?.email || 'N/A'}
${invoice.contractor?.phone ? `Phone: ${invoice.contractor.phone}` : ''}

${ticket.asset ? `
ASSET INFORMATION
-----------------
Asset Name: ${ticket.asset.name}
Asset Number: ${ticket.asset.assetNumber}
Asset Location: ${ticket.asset.location}
` : ''}

================================================================================

${rating ? `
CONTRACTOR RATING
-----------------
Overall Rating: ${rating.overallRating}/5 stars
Punctuality: ${rating.punctualityRating}/5 stars
Customer Service: ${rating.customerServiceRating}/5 stars
Workmanship: ${rating.workmanshipRating}/5 stars
PPE Compliant: ${rating.ppeCompliant ? 'Yes' : 'No'}
Followed Site Procedures: ${rating.followedSiteProcedures ? 'Yes' : 'No'}
${rating.comment ? `\nComments:\n${rating.comment}` : ''}
` : 'No rating submitted yet.'}

================================================================================

TENANT
------
${invoice.tenant?.name || 'N/A'}

================================================================================
                        END OF SUMMARY DOCUMENT
================================================================================
Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
`

    return new NextResponse(summary, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="invoice-summary-${invoice.invoiceNumber}.txt"`
      }
    })
  } catch (error) {
    console.error('Error generating summary:', error)
    return NextResponse.json(
      { message: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
