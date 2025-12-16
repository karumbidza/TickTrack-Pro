import { getSLATimes, formatSLATime } from './ticket-workflow'

export type SLAStatus = 'green' | 'yellow' | 'red' | 'grey'

export interface SLAInfo {
  responseStatus: SLAStatus
  resolutionStatus: SLAStatus
  responseTimeRemaining: number | null  // minutes remaining, negative if overdue
  resolutionTimeRemaining: number | null
  responseTimeUsedPercent: number | null
  resolutionTimeUsedPercent: number | null
  responseDeadline: Date | null
  resolutionDeadline: Date | null
  responseBreached: boolean
  resolutionBreached: boolean
  isCompleted: boolean
  isClosed: boolean
  formattedResponseRemaining: string
  formattedResolutionRemaining: string
}

// Statuses that indicate ticket is no longer active
const CLOSED_STATUSES = ['COMPLETED', 'CLOSED', 'CANCELLED']

// Statuses where response SLA applies (before contractor accepts)
const RESPONSE_SLA_STATUSES = ['OPEN', 'PROCESSING', 'ASSIGNED']

/**
 * Calculate the SLA status color based on percentage used
 * Green: < 75% of time used
 * Yellow: 75-100% of time used
 * Red: > 100% (overdue)
 * Grey: Completed/Closed
 */
function getStatusFromPercent(percentUsed: number | null, isComplete: boolean): SLAStatus {
  if (isComplete) return 'grey'
  if (percentUsed === null) return 'grey'
  if (percentUsed >= 100) return 'red'
  if (percentUsed >= 75) return 'yellow'
  return 'green'
}

/**
 * Calculate minutes between two dates
 */
function minutesBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60))
}

/**
 * Format remaining time as human readable string
 */
function formatRemaining(minutes: number | null): string {
  if (minutes === null) return 'N/A'
  if (minutes < 0) {
    const overdue = Math.abs(minutes)
    return `Overdue by ${formatSLATime(overdue)}`
  }
  if (minutes === 0) return 'Due now'
  return `${formatSLATime(minutes)} remaining`
}

/**
 * Calculate SLA deadlines based on priority
 */
export function calculateSLADeadlines(
  createdAt: Date,
  priority: string
): { responseDeadline: Date; resolutionDeadline: Date } {
  const { responseTime, resolutionTime } = getSLATimes(priority)
  
  const responseDeadline = new Date(createdAt.getTime() + responseTime * 60 * 1000)
  const resolutionDeadline = new Date(createdAt.getTime() + resolutionTime * 60 * 1000)
  
  return { responseDeadline, resolutionDeadline }
}

/**
 * Main function to calculate complete SLA info for a ticket
 */
export function calculateSLAInfo(ticket: {
  createdAt: Date | string
  priority: string
  status: string
  assignedAt?: Date | string | null
  contractorAcceptedAt?: Date | string | null
  onSiteAt?: Date | string | null
  completedAt?: Date | string | null
  responseDeadline?: Date | string | null
  resolutionDeadline?: Date | string | null
}): SLAInfo {
  const now = new Date()
  const createdAt = new Date(ticket.createdAt)
  const { responseTime, resolutionTime } = getSLATimes(ticket.priority)
  
  // Use stored deadlines or calculate them
  const responseDeadline = ticket.responseDeadline 
    ? new Date(ticket.responseDeadline)
    : new Date(createdAt.getTime() + responseTime * 60 * 1000)
  
  const resolutionDeadline = ticket.resolutionDeadline
    ? new Date(ticket.resolutionDeadline)
    : new Date(createdAt.getTime() + resolutionTime * 60 * 1000)
  
  const isCompleted = ticket.status === 'COMPLETED'
  const isClosed = CLOSED_STATUSES.includes(ticket.status)
  
  // Response SLA: measures time until contractor accepts
  // If contractor has accepted, use that time; otherwise use current time
  const contractorAcceptedAt = ticket.contractorAcceptedAt 
    ? new Date(ticket.contractorAcceptedAt) 
    : null
  
  const assignedAt = ticket.assignedAt ? new Date(ticket.assignedAt) : null
  
  // For response SLA, we measure until the ticket is responded to (assigned or accepted)
  // Using contractorAcceptedAt as the response completion point
  let responseEndTime: Date
  let responseComplete = false
  
  if (contractorAcceptedAt) {
    responseEndTime = contractorAcceptedAt
    responseComplete = true
  } else if (assignedAt && !RESPONSE_SLA_STATUSES.includes(ticket.status)) {
    // If assigned and moved past initial statuses, response is complete
    responseEndTime = assignedAt
    responseComplete = true
  } else if (isClosed) {
    responseEndTime = now
    responseComplete = true
  } else {
    responseEndTime = now
    responseComplete = false
  }
  
  const responseTimeElapsed = minutesBetween(createdAt, responseEndTime)
  const responseTimeRemaining = responseComplete 
    ? (responseTimeElapsed <= responseTime ? responseTime - responseTimeElapsed : -(responseTimeElapsed - responseTime))
    : minutesBetween(now, responseDeadline)
  const responseTimeUsedPercent = (responseTimeElapsed / responseTime) * 100
  const responseBreached = responseTimeElapsed > responseTime
  
  // Resolution SLA: measures time until completion
  const completedAt = ticket.completedAt ? new Date(ticket.completedAt) : null
  
  let resolutionEndTime: Date
  let resolutionComplete = false
  
  if (completedAt) {
    resolutionEndTime = completedAt
    resolutionComplete = true
  } else if (isClosed) {
    resolutionEndTime = now
    resolutionComplete = true
  } else {
    resolutionEndTime = now
    resolutionComplete = false
  }
  
  const resolutionTimeElapsed = minutesBetween(createdAt, resolutionEndTime)
  const resolutionTimeRemaining = resolutionComplete
    ? (resolutionTimeElapsed <= resolutionTime ? resolutionTime - resolutionTimeElapsed : -(resolutionTimeElapsed - resolutionTime))
    : minutesBetween(now, resolutionDeadline)
  const resolutionTimeUsedPercent = (resolutionTimeElapsed / resolutionTime) * 100
  const resolutionBreached = resolutionTimeElapsed > resolutionTime
  
  return {
    responseStatus: getStatusFromPercent(responseTimeUsedPercent, responseComplete && !responseBreached),
    resolutionStatus: getStatusFromPercent(resolutionTimeUsedPercent, isCompleted || isClosed),
    responseTimeRemaining: responseComplete ? null : responseTimeRemaining,
    resolutionTimeRemaining: isClosed ? null : resolutionTimeRemaining,
    responseTimeUsedPercent: Math.round(responseTimeUsedPercent),
    resolutionTimeUsedPercent: Math.round(resolutionTimeUsedPercent),
    responseDeadline,
    resolutionDeadline,
    responseBreached,
    resolutionBreached,
    isCompleted,
    isClosed,
    formattedResponseRemaining: responseComplete 
      ? (responseBreached ? `Breached by ${formatSLATime(responseTimeElapsed - responseTime)}` : 'Met')
      : formatRemaining(responseTimeRemaining),
    formattedResolutionRemaining: isClosed
      ? (resolutionBreached ? `Breached by ${formatSLATime(resolutionTimeElapsed - resolutionTime)}` : 'Met')
      : formatRemaining(resolutionTimeRemaining)
  }
}

/**
 * Get the CSS classes for SLA status badge
 */
export function getSLAStatusClasses(status: SLAStatus): string {
  switch (status) {
    case 'green':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'yellow':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'red':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'grey':
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200'
  }
}

/**
 * Get the MUI chip color for SLA status
 */
export function getSLAChipColor(status: SLAStatus): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'green':
      return 'success'
    case 'yellow':
      return 'warning'
    case 'red':
      return 'error'
    case 'grey':
    default:
      return 'default'
  }
}

/**
 * Get summary of SLA tracking times for a ticket
 */
export function getTicketTimeline(ticket: {
  createdAt: Date | string
  assignedAt?: Date | string | null
  contractorAcceptedAt?: Date | string | null
  onSiteAt?: Date | string | null
  completedAt?: Date | string | null
}): {
  timeToAssign: number | null
  timeToAccept: number | null
  timeToOnSite: number | null
  timeToComplete: number | null
  totalResolutionTime: number | null
} {
  const createdAt = new Date(ticket.createdAt)
  const assignedAt = ticket.assignedAt ? new Date(ticket.assignedAt) : null
  const acceptedAt = ticket.contractorAcceptedAt ? new Date(ticket.contractorAcceptedAt) : null
  const onSiteAt = ticket.onSiteAt ? new Date(ticket.onSiteAt) : null
  const completedAt = ticket.completedAt ? new Date(ticket.completedAt) : null
  
  return {
    timeToAssign: assignedAt ? minutesBetween(createdAt, assignedAt) : null,
    timeToAccept: acceptedAt ? minutesBetween(assignedAt || createdAt, acceptedAt) : null,
    timeToOnSite: onSiteAt ? minutesBetween(acceptedAt || createdAt, onSiteAt) : null,
    timeToComplete: completedAt ? minutesBetween(onSiteAt || acceptedAt || createdAt, completedAt) : null,
    totalResolutionTime: completedAt ? minutesBetween(createdAt, completedAt) : null
  }
}
