'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ChatWindow } from '@/components/chat/chat-window'
import { RatingModal } from '@/components/tickets/rating-modal'
import { MediaViewer } from '@/components/ui/media-viewer'
import { toast } from 'sonner'
import { 
  Clock,
  User,
  Calendar,
  Star,
  MessageSquare,
  X,
  AlertTriangle,
  XCircle
} from 'lucide-react'

interface Attachment {
  id: string
  filename: string
  url: string
  mimeType: string
}

interface TicketSummary {
  id: string
  title: string
  description: string
  status: string
  type: string
  priority: string
  assignedTo?: {
    name: string
    email: string
  }
  attachments?: Attachment[]
  createdAt: string
  updatedAt: string
  _count: {
    messages: number
  }
}

interface TicketDetailModalProps {
  ticket: TicketSummary
  open: boolean
  onOpenChange: (open: boolean) => void
  onTicketUpdated: () => void
}

export function TicketDetailModal({ ticket, open, onOpenChange, onTicketUpdated }: TicketDetailModalProps) {
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [ticketDetails, setTicketDetails] = useState<TicketSummary | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Fetch full ticket details including attachments
  useEffect(() => {
    if (open && ticket.id) {
      fetchTicketDetails()
    }
  }, [open, ticket.id])

  const fetchTicketDetails = async () => {
    setLoadingDetails(true)
    try {
      const response = await fetch(`/api/tickets/${ticket.id}`)
      if (response.ok) {
        const data = await response.json()
        setTicketDetails(data.ticket || data)
      }
    } catch (error) {
      console.error('Failed to fetch ticket details:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  const currentTicket = ticketDetails || ticket
  const attachments = currentTicket.attachments || []

  const getStatusStyle = (status: string): React.CSSProperties => {
    const styles: Record<string, React.CSSProperties> = {
      OPEN: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' },
      ASSIGNED: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' },
      IN_PROGRESS: { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' },
      ON_SITE: { backgroundColor: 'var(--blue-bg)', color: 'var(--blue)' },
      AWAITING_APPROVAL: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' },
      COMPLETED: { backgroundColor: 'var(--green-bg)', color: 'var(--green)' },
      CLOSED: { backgroundColor: 'var(--tag-bg)', color: 'var(--tag-text)' },
      CANCELLED: { backgroundColor: 'var(--red-bg)', color: 'var(--red)' }
    }
    return styles[status] || { backgroundColor: 'var(--tag-bg)', color: 'var(--tag-text)' }
  }
  // Keep old name for backward compat
  const getStatusColor = (status: string) => ''

  const getPriorityStyle = (priority: string): React.CSSProperties => {
    const styles: Record<string, React.CSSProperties> = {
      LOW: { backgroundColor: 'var(--green-bg)', color: 'var(--green)' },
      MEDIUM: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' },
      HIGH: { backgroundColor: 'var(--amber-bg)', color: 'var(--amber)' },
      CRITICAL: { backgroundColor: 'var(--red-bg)', color: 'var(--red)' }
    }
    return styles[priority] || { backgroundColor: 'var(--tag-bg)', color: 'var(--tag-text)' }
  }
  // Keep old name for backward compat
  const getPriorityColor = (priority: string) => ''

  const canApproveCompletion = currentTicket.status === 'AWAITING_APPROVAL'
  const canRate = currentTicket.status === 'COMPLETED'
  const canChat = ['ASSIGNED', 'IN_PROGRESS', 'ON_SITE', 'AWAITING_APPROVAL', 'PROCESSING', 'ACCEPTED'].includes(currentTicket.status)
  // User can cancel if:
  // 1. Status is OPEN (not yet processed), OR
  // 2. Status is PROCESSING but no contractor has accepted yet (assignedTo exists but status not ACCEPTED/IN_PROGRESS)
  const canCancel = currentTicket.status === 'OPEN' || 
    (currentTicket.status === 'PROCESSING' && !currentTicket.assignedTo)

  const handleCancelTicket = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation')
      return
    }

    setCancelLoading(true)
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message || 'Ticket cancelled successfully')
        setShowCancelDialog(false)
        setCancelReason('')
        onOpenChange(false)
        onTicketUpdated()
      } else {
        toast.error(data.error || 'Failed to cancel ticket')
      }
    } catch (error) {
      console.error('Failed to cancel ticket:', error)
      toast.error('Failed to cancel ticket')
    } finally {
      setCancelLoading(false)
    }
  }

  const handleApproval = async (approved: boolean) => {
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved })
      })

      if (response.ok) {
        onTicketUpdated()
      }
    } catch (error) {
      console.error('Failed to update ticket approval:', error)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <span>{ticket.title}</span>
              <Badge style={getStatusStyle(ticket.status)}>
                {ticket.status.replace('_', ' ')}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Ticket Details */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--surface2)' }}>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Created</span>
                  <span className="text-sm font-medium">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Type</span>
                  <span className="text-sm font-medium">{ticket.type}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Priority</span>
                  <Badge style={getPriorityStyle(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                </div>
                
                {ticket.assignedTo && (
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Assigned to</span>
                    <span className="text-sm font-medium">{ticket.assignedTo.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-medium mb-2">Description</h3>
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--surface2)' }}>
                <p className="whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{currentTicket.description}</p>
              </div>
            </div>

            {/* Attachments Section */}
            {attachments.length > 0 && (
              <div>
                <MediaViewer 
                  files={attachments}
                  title="Attachments"
                  gridCols={3}
                  thumbnailSize="md"
                />
              </div>
            )}

            {/* Chat Section */}
            {canChat && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5" />
                    <span>Communication</span>
                    {ticket._count.messages > 0 && (
                      <Badge variant="outline">{ticket._count.messages}</Badge>
                    )}
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowChat(!showChat)}
                  >
                    {showChat ? 'Hide Chat' : 'Show Chat'}
                  </Button>
                </div>
                
                {showChat && (
                  <div className="border rounded-lg">
                    <ChatWindow ticketId={ticket.id} />
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between">
              <div>
                {canCancel && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowCancelDialog(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Ticket
                  </Button>
                )}
              </div>
              <div className="flex space-x-2">
                {canApproveCompletion && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleApproval(false)}
                    >
                      Request Changes
                    </Button>
                    <Button
                      onClick={() => handleApproval(true)}
                    >
                      Approve Completion
                    </Button>
                  </>
                )}
                
                {canRate && (
                  <Button
                    onClick={() => setShowRatingModal(true)}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Rate Service
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Ticket Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-ds-red">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Cancel Ticket
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p style={{ color: 'var(--text-secondary)' }}>
              Are you sure you want to cancel this ticket? This action cannot be undone.
            </p>
            <div>
              <Label htmlFor="cancelReason">Reason for cancellation *</Label>
              <Textarea
                id="cancelReason"
                placeholder="Please explain why you want to cancel this ticket..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)} disabled={cancelLoading}>
              Keep Ticket
            </Button>
            <Button variant="destructive" onClick={handleCancelTicket} disabled={cancelLoading || !cancelReason.trim()}>
              {cancelLoading ? 'Cancelling...' : 'Cancel Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Modal */}
      {showRatingModal && (
        <RatingModal
          ticketId={ticket.id}
          open={showRatingModal}
          onOpenChange={setShowRatingModal}
          onRatingSubmitted={onTicketUpdated}
        />
      )}
    </>
  )
}