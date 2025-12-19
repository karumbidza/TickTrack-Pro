import { jsPDF } from 'jspdf'

interface InvoiceSummaryData {
  // Invoice details
  invoiceNumber: string
  invoiceAmount: number
  invoiceDate: string
  
  // Ticket details
  ticketNumber: string
  ticketTitle: string
  ticketDescription: string
  ticketType: string
  ticketPriority: string
  dateRaised: string
  timeRaised: string
  dateClosed: string | null
  timeClosed: string | null
  raisedBy: {
    name: string
    email: string
    phone?: string
  }
  
  // Branch info
  branch?: {
    name: string
  }
  
  // Asset details
  asset?: {
    name: string
    assetNumber: string
    location: string
    brand?: string
    model?: string
    serialNumber?: string
  }
  
  // Contractor details
  contractor: {
    name: string
    email: string
    phone?: string
    company?: string
    categories?: string[]
  }
  
  // Work description (approved)
  workDescription: string
  workDescriptionApprovedAt: string | null
  
  // Company/Tenant details
  tenantName: string
}

// Helper function to sanitize work description by replacing emojis with text labels
function sanitizeWorkDescription(text: string): string {
  if (!text) return text
  
  // Replace emoji + title patterns with clean headers (emoji followed by title text)
  const emojiPatterns: { pattern: RegExp; replacement: string }[] = [
    { pattern: /📋\s*WORK SUMMARY:?/gi, replacement: 'WORK SUMMARY:' },
    { pattern: /📍\s*WORK LOCATION:?/gi, replacement: 'WORK LOCATION:' },
    { pattern: /⚠️\s*FAULT IDENTIFIED:?/gi, replacement: 'FAULT IDENTIFIED:' },
    { pattern: /🔧\s*WORK PERFORMED:?/gi, replacement: 'WORK PERFORMED:' },
    { pattern: /📦\s*MATERIALS\/PARTS USED:?/gi, replacement: 'MATERIALS/PARTS USED:' },
    { pattern: /✅\s*TESTING & VERIFICATION:?/gi, replacement: 'TESTING & VERIFICATION:' },
    { pattern: /📌\s*OUTSTANDING ISSUES:?/gi, replacement: 'OUTSTANDING ISSUES:' },
  ]
  
  let sanitized = text
  for (const { pattern, replacement } of emojiPatterns) {
    sanitized = sanitized.replace(pattern, replacement)
  }
  
  // Replace any remaining standalone emojis
  sanitized = sanitized.replace(/📋/g, '')
  sanitized = sanitized.replace(/📍/g, '')
  sanitized = sanitized.replace(/⚠️/g, '')
  sanitized = sanitized.replace(/🔧/g, '')
  sanitized = sanitized.replace(/📦/g, '')
  sanitized = sanitized.replace(/✅/g, '')
  sanitized = sanitized.replace(/📌/g, '')
  sanitized = sanitized.replace(/•/g, '-')
  
  return sanitized
}

export function generateInvoiceSummaryPDF(data: InvoiceSummaryData): Buffer {
  const doc = new jsPDF()
  
  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  const contentWidth = pageWidth - (margin * 2)
  const labelWidth = 40  // Fixed width for all labels
  const colMid = margin + contentWidth / 2 + 5  // Midpoint for two-column layout
  let yPos = margin

  // Helper function to add a section header
  const addSectionHeader = (text: string) => {
    yPos += 3
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(59, 130, 246) // Blue color
    doc.text(text, margin, yPos)
    yPos += 2
    doc.setDrawColor(59, 130, 246)
    doc.setLineWidth(0.5)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 6
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.setLineWidth(0.2)
  }

  // Helper function to add a single field with consistent alignment
  const addField = (label: string, value: string) => {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(label + ':', margin, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(value || 'N/A', margin + labelWidth, yPos)
    yPos += 5
  }

  // Helper function to add two fields side by side with consistent alignment
  const addFieldRow = (label1: string, value1: string, label2: string, value2: string) => {
    doc.setFontSize(9)
    
    // Left column
    doc.setFont('helvetica', 'bold')
    doc.text(label1 + ':', margin, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(value1 || 'N/A', margin + labelWidth, yPos)
    
    // Right column
    doc.setFont('helvetica', 'bold')
    doc.text(label2 + ':', colMid, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(value2 || 'N/A', colMid + labelWidth, yPos)
    
    yPos += 5
  }

  // Helper function to add a multi-line field
  const addMultiLineField = (label: string, value: string) => {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(label + ':', margin, yPos)
    yPos += 4
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(value || 'N/A', contentWidth)
    doc.text(lines, margin, yPos)
    yPos += (lines.length * 4) + 2
  }

  // Check if we need a new page
  const checkPageBreak = (neededHeight: number) => {
    if (yPos + neededHeight > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      yPos = margin
    }
  }

  // ============ HEADER ============
  doc.setFillColor(59, 130, 246)
  doc.rect(0, 0, pageWidth, 25, 'F')
  
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('TICKET SUMMARY', pageWidth / 2, 12, { align: 'center' })
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Job Completion & Work Summary Document', pageWidth / 2, 19, { align: 'center' })
  
  doc.setTextColor(0, 0, 0)
  yPos = 35
  
  // Company name
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(data.tenantName, pageWidth / 2, yPos, { align: 'center' })
  yPos += 8

  // ============ INVOICE DETAILS ============
  addSectionHeader('Invoice Information')
  addFieldRow('Invoice No.', data.invoiceNumber, 'Amount', `$${data.invoiceAmount.toFixed(2)}`)
  addField('Invoice Date', data.invoiceDate)
  yPos += 2

  // ============ TICKET DETAILS ============
  checkPageBreak(50)
  addSectionHeader('Ticket Details')
  addFieldRow('Ticket No.', data.ticketNumber, 'Type', data.ticketType)
  addFieldRow('Priority', data.ticketPriority, 'Status', 'COMPLETED')
  addField('Title', data.ticketTitle)
  addMultiLineField('Description', data.ticketDescription || 'No description provided')
  yPos += 2

  // ============ TIMELINE ============
  checkPageBreak(30)
  addSectionHeader('Timeline')
  addFieldRow('Date Raised', data.dateRaised, 'Time Raised', data.timeRaised)
  addFieldRow('Date Closed', data.dateClosed || 'Pending', 'Time Closed', data.timeClosed || 'Pending')
  yPos += 2

  // ============ REQUESTER DETAILS ============
  checkPageBreak(30)
  addSectionHeader('Requester Information')
  addFieldRow('Name', data.raisedBy.name, 'Phone', data.raisedBy.phone || 'N/A')
  if (data.branch) {
    addField('Branch/Site', data.branch.name)
  }
  yPos += 2

  // ============ ASSET DETAILS (if available) ============
  if (data.asset) {
    checkPageBreak(40)
    addSectionHeader('Asset Information')
    addFieldRow('Asset No.', data.asset.assetNumber, 'Name', data.asset.name)
    addFieldRow('Location', data.asset.location, 'Serial No.', data.asset.serialNumber || 'N/A')
    if (data.asset.brand || data.asset.model) {
      addFieldRow('Brand', data.asset.brand || 'N/A', 'Model', data.asset.model || 'N/A')
    }
    yPos += 2
  }

  // ============ CONTRACTOR DETAILS ============
  checkPageBreak(40)
  addSectionHeader('Contractor Information')
  addFieldRow('Name', data.contractor.name, 'Phone', data.contractor.phone || 'N/A')
  addField('Email', data.contractor.email)
  if (data.contractor.categories && data.contractor.categories.length > 0) {
    addField('Categories', data.contractor.categories.join(', '))
  }
  yPos += 2

  // ============ APPROVED WORK DESCRIPTION ============
  checkPageBreak(80)
  addSectionHeader('Approved Work Description')
  
  if (data.workDescriptionApprovedAt) {
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(`Approved on: ${data.workDescriptionApprovedAt}`, margin, yPos)
    doc.setTextColor(0, 0, 0)
    yPos += 6
  }
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  
  // Sanitize work description to replace emojis with text labels
  const sanitizedWorkDesc = sanitizeWorkDescription(data.workDescription || 'No work description provided')
  
  // Draw a box for the work description
  const workDescLines = doc.splitTextToSize(sanitizedWorkDesc, contentWidth - 8)
  const boxHeight = Math.max(25, (workDescLines.length * 4) + 8)
  
  checkPageBreak(boxHeight + 10)
  
  doc.setDrawColor(200, 200, 200)
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(margin, yPos, contentWidth, boxHeight, 2, 2, 'FD')
  
  yPos += 5
  doc.text(workDescLines, margin + 4, yPos)
  yPos += boxHeight + 3

  // ============ FOOTER ============
  const footerY = doc.internal.pageSize.getHeight() - 12
  doc.setFontSize(7)
  doc.setTextColor(128, 128, 128)
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, footerY)
  doc.text('TickTrack Pro', pageWidth - margin, footerY, { align: 'right' })

  // Return as Buffer
  const pdfOutput = doc.output('arraybuffer')
  return Buffer.from(pdfOutput)
}
