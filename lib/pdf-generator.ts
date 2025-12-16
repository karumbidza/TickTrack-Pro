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
    specialties?: string[]
  }
  
  // Work description (approved)
  workDescription: string
  workDescriptionApprovedAt: string | null
  
  // Company/Tenant details
  tenantName: string
}

export function generateInvoiceSummaryPDF(data: InvoiceSummaryData): Buffer {
  const doc = new jsPDF()
  
  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - (margin * 2)
  let yPos = margin

  // Helper function to add a section header
  const addSectionHeader = (text: string) => {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(59, 130, 246) // Blue color
    doc.text(text, margin, yPos)
    yPos += 2
    doc.setDrawColor(59, 130, 246)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 8
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
  }

  // Helper function to add a field
  const addField = (label: string, value: string, inline = false) => {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(label + ':', margin, yPos)
    doc.setFont('helvetica', 'normal')
    
    if (inline) {
      doc.text(value || 'N/A', margin + 45, yPos)
    } else {
      yPos += 5
      const lines = doc.splitTextToSize(value || 'N/A', contentWidth)
      doc.text(lines, margin, yPos)
      yPos += (lines.length * 4)
    }
    yPos += 6
  }

  // Helper function to add two fields side by side
  const addFieldRow = (label1: string, value1: string, label2: string, value2: string) => {
    const halfWidth = contentWidth / 2
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(label1 + ':', margin, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(value1 || 'N/A', margin + 35, yPos)
    
    doc.setFont('helvetica', 'bold')
    doc.text(label2 + ':', margin + halfWidth, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(value2 || 'N/A', margin + halfWidth + 35, yPos)
    
    yPos += 7
  }

  // Check if we need a new page
  const checkPageBreak = (neededHeight: number) => {
    if (yPos + neededHeight > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      yPos = margin
    }
  }

  // ============ HEADER ============
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE SUMMARY', pageWidth / 2, yPos, { align: 'center' })
  yPos += 8
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('Job Completion & Work Summary Document', pageWidth / 2, yPos, { align: 'center' })
  yPos += 5
  doc.text(data.tenantName, pageWidth / 2, yPos, { align: 'center' })
  doc.setTextColor(0, 0, 0)
  yPos += 12

  // ============ INVOICE DETAILS ============
  addSectionHeader('Invoice Information')
  addFieldRow('Invoice No.', data.invoiceNumber, 'Amount', `$${data.invoiceAmount.toFixed(2)}`)
  addField('Invoice Date', data.invoiceDate, true)
  yPos += 5

  // ============ TICKET DETAILS ============
  checkPageBreak(60)
  addSectionHeader('Ticket Details')
  addFieldRow('Ticket No.', data.ticketNumber, 'Type', data.ticketType)
  addField('Title', data.ticketTitle, true)
  addFieldRow('Priority', data.ticketPriority, 'Status', 'COMPLETED')
  yPos += 3
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Description:', margin, yPos)
  yPos += 5
  doc.setFont('helvetica', 'normal')
  const descLines = doc.splitTextToSize(data.ticketDescription || 'No description provided', contentWidth)
  doc.text(descLines, margin, yPos)
  yPos += (descLines.length * 4) + 8

  // ============ TIMELINE ============
  checkPageBreak(40)
  addSectionHeader('Timeline')
  addFieldRow('Date Raised', data.dateRaised, 'Time Raised', data.timeRaised)
  addFieldRow('Date Closed', data.dateClosed || 'Pending', 'Time Closed', data.timeClosed || 'Pending')
  yPos += 5

  // ============ REQUESTER DETAILS ============
  checkPageBreak(40)
  addSectionHeader('Requester Information')
  addField('Name', data.raisedBy.name, true)
  addField('Email', data.raisedBy.email, true)
  if (data.raisedBy.phone) {
    addField('Phone', data.raisedBy.phone, true)
  }
  yPos += 5

  // ============ ASSET DETAILS (if available) ============
  if (data.asset) {
    checkPageBreak(50)
    addSectionHeader('Asset Information')
    addFieldRow('Asset No.', data.asset.assetNumber, 'Name', data.asset.name)
    addField('Location', data.asset.location, true)
    if (data.asset.brand || data.asset.model) {
      addFieldRow('Brand', data.asset.brand || 'N/A', 'Model', data.asset.model || 'N/A')
    }
    if (data.asset.serialNumber) {
      addField('Serial No.', data.asset.serialNumber, true)
    }
    yPos += 5
  }

  // ============ CONTRACTOR DETAILS ============
  checkPageBreak(50)
  addSectionHeader('Contractor Information')
  addField('Name', data.contractor.name, true)
  addField('Email', data.contractor.email, true)
  if (data.contractor.phone) {
    addField('Phone', data.contractor.phone, true)
  }
  if (data.contractor.company) {
    addField('Company', data.contractor.company, true)
  }
  if (data.contractor.specialties && data.contractor.specialties.length > 0) {
    addField('Specialties', data.contractor.specialties.join(', '), true)
  }
  yPos += 5

  // ============ APPROVED WORK DESCRIPTION ============
  checkPageBreak(80)
  addSectionHeader('Approved Work Description')
  
  if (data.workDescriptionApprovedAt) {
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(`Approved on: ${data.workDescriptionApprovedAt}`, margin, yPos)
    doc.setTextColor(0, 0, 0)
    yPos += 8
  }
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  // Draw a box for the work description
  const workDescLines = doc.splitTextToSize(data.workDescription || 'No work description provided', contentWidth - 10)
  const boxHeight = Math.max(30, (workDescLines.length * 5) + 10)
  
  checkPageBreak(boxHeight + 10)
  
  doc.setDrawColor(200, 200, 200)
  doc.setFillColor(249, 250, 251)
  doc.roundedRect(margin, yPos, contentWidth, boxHeight, 3, 3, 'FD')
  
  yPos += 7
  doc.text(workDescLines, margin + 5, yPos)
  yPos += boxHeight + 5

  // ============ FOOTER ============
  const footerY = doc.internal.pageSize.getHeight() - 15
  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.text(`Generated on ${new Date().toLocaleString()}`, margin, footerY)
  doc.text('TickTrack Pro - Job Completion Summary', pageWidth - margin, footerY, { align: 'right' })

  // Return as Buffer
  const pdfOutput = doc.output('arraybuffer')
  return Buffer.from(pdfOutput)
}
