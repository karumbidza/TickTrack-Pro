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
import { Badge as DSBadge, MonoLabel, type BadgeVariant } from '@/components/admin/kit'
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

// ── Redesign: status/priority → kit Badge variant (matches dashboard) ──
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  OPEN: 'amber', ASSIGNED: 'blue', ACCEPTED: 'blue', IN_PROGRESS: 'blue', PROCESSING: 'blue',
  ON_SITE: 'violet', AWAITING_QUOTE: 'amber', QUOTE_SUBMITTED: 'amber',
  AWAITING_DESCRIPTION: 'amber', AWAITING_WORK_APPROVAL: 'amber', AWAITING_APPROVAL: 'amber',
  COMPLETED: 'green', CLOSED: 'neutral', CANCELLED: 'red',
}
const PRIORITY_VARIANT: Record<string, BadgeVariant> = { LOW: 'green', MEDIUM: 'amber', HIGH: 'orange', CRITICAL: 'red', URGENT: 'red' }
const statusLabel = (s: string) => s.replace(/_/g, ' ')

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
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <MonoLabel size={12} spacing="0.04em" color="var(--text-muted)" style={{ textTransform: 'none' }}>{ticket.id.slice(0, 8)}</MonoLabel>
              <DSBadge variant={PRIORITY_VARIANT[ticket.priority] || 'neutral'}>{ticket.priority}</DSBadge>
              <DSBadge variant={STATUS_VARIANT[currentTicket.status] || 'neutral'}>{statusLabel(currentTicket.status)}</DSBadge>
            </div>
            <DialogTitle style={{ fontSize: 24, fontWeight: 300, letterSpacing: '-0.02em' }}>{ticket.title}</DialogTitle>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Details */}
            <div className="ds-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 14.5, fontWeight: 500 }}>Details</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <MonoLabel size={10} spacing="0.08em">Type</MonoLabel>
                  <span style={{ fontSize: 13 }}>{ticket.type}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <MonoLabel size={10} spacing="0.08em">Priority</MonoLabel>
                  <DSBadge variant={PRIORITY_VARIANT[ticket.priority] || 'neutral'}>{ticket.priority}</DSBadge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <MonoLabel size={10} spacing="0.08em">Created</MonoLabel>
                  <span style={{ fontSize: 13 }}>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                </div>
                {ticket.assignedTo && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <MonoLabel size={10} spacing="0.08em">Assigned to</MonoLabel>
                    <span style={{ fontSize: 13 }}>{ticket.assignedTo.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="ds-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: 14.5, fontWeight: 500, marginBottom: 10 }}>Description</div>
              <p style={{ whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-tertiary)', margin: 0 }}>{currentTicket.description}</p>
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
                  <h3 className="text-lg font-medium flex items-center space-x-2" style={{ fontSize: 14.5, fontWeight: 500 }}>
                    <MessageSquare className="h-5 w-5" />
                    <span>Conversation</span>
                    {ticket._count.messages > 0 && (
                      <DSBadge variant="neutral">{ticket._count.messages}</DSBadge>
                    )}
                  </h3>
                  <button
                    className="filter-chip"
                    onClick={() => setShowChat(!showChat)}
                  >
                    {showChat ? 'Hide chat' : 'Show chat'}
                  </button>
                </div>

                {showChat && (
                  <div style={{ border: '1px solid var(--border)', borderRadius: 11, overflow: 'hidden' }}>
                    <ChatWindow ticketId={ticket.id} />
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between" style={{ borderTop: '1px solid var(--row-sep)', paddingTop: 16 }}>
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
              <div className="flex" style={{ gap: 8 }}>
                {canApproveCompletion && (
                  <>
                    <button
                      className="filter-chip"
                      onClick={() => handleApproval(false)}
                    >
                      Request changes
                    </button>
                    <button
                      className="btn-accent"
                      onClick={() => handleApproval(true)}
                    >
                      Approve completion
                    </button>
                  </>
                )}

                {canRate && (
                  <button
                    className="btn-accent"
                    onClick={() => setShowRatingModal(true)}
                  >
                    <Star className="h-4 w-4" />
                    Rate service
                  </button>
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