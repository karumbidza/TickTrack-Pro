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
    sla: 72 // hours
  },
  MEDIUM: {
    label: 'Medium',
    color: 'yellow',
    sla: 24
  },
  HIGH: {
    label: 'High',
    color: 'orange',
    sla: 8
  },
  CRITICAL: {
    label: 'Critical',
    color: 'red',
    sla: 2
  }
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