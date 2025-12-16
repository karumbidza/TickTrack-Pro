export const TICKET_WORKFLOW = {
  OPEN: {
    actions: ['ASSIGN_ADMIN', 'CANCEL'],
    nextStatuses: ['ASSIGNED', 'CANCELLED'],
    allowedRoles: ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
  },
  ASSIGNED: {
    actions: ['ASSIGN_CONTRACTOR', 'REOPEN', 'CANCEL'],
    nextStatuses: ['IN_PROGRESS', 'OPEN', 'CANCELLED'],
    allowedRoles: ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
  },
  IN_PROGRESS: {
    actions: ['GO_ON_SITE', 'REQUEST_CLARIFICATION', 'COMPLETE'],
    nextStatuses: ['ON_SITE', 'ASSIGNED', 'AWAITING_APPROVAL'],
    allowedRoles: ['CONTRACTOR']
  },
  ON_SITE: {
    actions: ['START_WORK', 'COMPLETE_WORK'],
    nextStatuses: ['IN_PROGRESS', 'AWAITING_APPROVAL'],
    allowedRoles: ['CONTRACTOR']
  },
  AWAITING_APPROVAL: {
    actions: ['APPROVE_COMPLETION', 'REQUEST_REWORK'],
    nextStatuses: ['COMPLETED', 'IN_PROGRESS'],
    allowedRoles: ['END_USER']
  },
  COMPLETED: {
    actions: ['CLOSE_TICKET', 'REOPEN'],
    nextStatuses: ['CLOSED', 'OPEN'],
    allowedRoles: ['END_USER', 'TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
  },
  CLOSED: {
    actions: ['REOPEN'],
    nextStatuses: ['OPEN'],
    allowedRoles: ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
  },
  CANCELLED: {
    actions: ['REOPEN'],
    nextStatuses: ['OPEN'],
    allowedRoles: ['TENANT_ADMIN', 'IT_ADMIN', 'SALES_ADMIN', 'RETAIL_ADMIN', 'MAINTENANCE_ADMIN', 'PROJECTS_ADMIN']
  }
}

export const TICKET_TYPES = {
  IT: {
    label: 'IT Support',
    description: 'Hardware, software, network issues',
    adminRoles: ['IT_ADMIN'],
    color: 'blue'
  },
  SALES: {
    label: 'Sales Support',
    description: 'Sales inquiries and support',
    adminRoles: ['SALES_ADMIN'],
    color: 'green'
  },
  RETAIL: {
    label: 'Retail Support',
    description: 'Store operations and retail support',
    adminRoles: ['RETAIL_ADMIN'],
    color: 'purple'
  },
  MAINTENANCE: {
    label: 'Maintenance',
    description: 'Building and equipment maintenance',
    adminRoles: ['MAINTENANCE_ADMIN'],
    color: 'orange'
  },
  PROJECTS: {
    label: 'Projects',
    description: 'Project-related tasks and support',
    adminRoles: ['PROJECTS_ADMIN'],
    color: 'red'
  },
  GENERAL: {
    label: 'General',
    description: 'General inquiries and support',
    adminRoles: ['TENANT_ADMIN'],
    color: 'gray'
  }
}

export const TICKET_PRIORITIES = {
  LOW: {
    label: 'Low',
    color: 'green',
    responseTimeMinutes: 48 * 60,  // 48 hours - time for admin to assign + contractor to accept
    resolutionTimeMinutes: 72 * 60 // 72 hours - time to complete the job
  },
  MEDIUM: {
    label: 'Medium',
    color: 'yellow',
    responseTimeMinutes: 12 * 60,  // 12 hours
    resolutionTimeMinutes: 24 * 60 // 24 hours
  },
  HIGH: {
    label: 'High',
    color: 'orange',
    responseTimeMinutes: 60,       // 1 hour
    resolutionTimeMinutes: 8 * 60  // 8 hours
  },
  CRITICAL: {
    label: 'Critical',
    color: 'red',
    responseTimeMinutes: 30,       // 30 minutes
    resolutionTimeMinutes: 2 * 60  // 2 hours
  }
}

// Helper to get SLA times in minutes
export function getSLATimes(priority: string): { responseTime: number; resolutionTime: number } {
  const priorityConfig = TICKET_PRIORITIES[priority as keyof typeof TICKET_PRIORITIES]
  if (!priorityConfig) {
    return { responseTime: 24 * 60, resolutionTime: 48 * 60 } // Default to MEDIUM
  }
  return {
    responseTime: priorityConfig.responseTimeMinutes,
    resolutionTime: priorityConfig.resolutionTimeMinutes
  }
}

// Format minutes to human readable
export function formatSLATime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min${minutes !== 1 ? 's' : ''}`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`
  }
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  if (remainingHours === 0) {
    return `${days} day${days !== 1 ? 's' : ''}`
  }
  return `${days} day${days !== 1 ? 's' : ''} ${remainingHours}h`
}

export function canUserTransitionTicket(
  userRole: string,
  currentStatus: string,
  targetStatus: string
): boolean {
  const workflow = TICKET_WORKFLOW[currentStatus as keyof typeof TICKET_WORKFLOW]
  
  if (!workflow) return false
  
  return workflow.allowedRoles.includes(userRole) && 
         workflow.nextStatuses.includes(targetStatus)
}

export function getAvailableActions(userRole: string, currentStatus: string) {
  const workflow = TICKET_WORKFLOW[currentStatus as keyof typeof TICKET_WORKFLOW]
  
  if (!workflow || !workflow.allowedRoles.includes(userRole)) {
    return []
  }
  
  return workflow.actions
}

export function getTicketStatusColor(status: string): string {
  const colors: Record<string, string> = {
    OPEN: 'blue',
    ASSIGNED: 'yellow',
    IN_PROGRESS: 'orange',
    ON_SITE: 'purple',
    AWAITING_APPROVAL: 'indigo',
    COMPLETED: 'green',
    CLOSED: 'gray',
    CANCELLED: 'red'
  }
  
  return colors[status] || 'gray'
}