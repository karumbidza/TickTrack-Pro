'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  UserCheck,
  UserX,
  Send,
  Copy,
  MoreHorizontal,
  AlertCircle,
  Loader2,
  Building2
} from 'lucide-react'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'

interface Invitation {
  id: string
  email: string
  name: string | null
  status: string
  expiresAt: string
  createdAt: string
  acceptedAt: string | null
  invitedBy: {
    id: string
    name: string
    email: string
  }
  user: {
    id: string
    name: string
    email: string
    status: string
  } | null
}

interface PendingUser {
  id: string
  name: string
  email: string
  phone: string
  status: string
  role: string
  createdAt: string
  invitedBy: {
    id: string
    name: string
    email: string
  } | null
  branches: Array<{
    branch: { id: string; name: string }
  }>
}

interface Branch {
  id: string
  name: string
  type: string
  isHeadOffice: boolean
}

const ROLE_OPTIONS = [
  { value: 'END_USER', label: 'End User' },
  { value: 'TENANT_ADMIN', label: 'Tenant Admin' },
  { value: 'IT_ADMIN', label: 'IT Admin' },
  { value: 'SALES_ADMIN', label: 'Sales Admin' },
  { value: 'RETAIL_ADMIN', label: 'Retail Admin' },
  { value: 'MAINTENANCE_ADMIN', label: 'Maintenance Admin' },
  { value: 'PROJECTS_ADMIN', label: 'Projects Admin' },
]

export function InvitationManagement({ user }: { user: any }) {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('invitations')
  
  // Dialogs
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  
  // Form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteExpiry, setInviteExpiry] = useState('72')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Approval form
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null)
  const [approvalRole, setApprovalRole] = useState('END_USER')
  const [approvalBranches, setApprovalBranches] = useState<string[]>([])
  const [approvalDepartment, setApprovalDepartment] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [invitationsRes, pendingUsersRes, branchesRes] = await Promise.all([
        fetch('/api/admin/invitations'),
        fetch('/api/admin/pending-users'),
        fetch('/api/branches')
      ])

      if (invitationsRes.ok) {
        const data = await invitationsRes.json()
        setInvitations(data.invitations || [])
      }

      if (pendingUsersRes.ok) {
        const data = await pendingUsersRes.json()
        setPendingUsers(data.users || [])
      }

      if (branchesRes.ok) {
        const data = await branchesRes.json()
        setBranches(data.branches || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSendInvite = async () => {
    if (!inviteEmail) {
      toast.error('Email is required')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName || undefined,
          expiresInHours: parseInt(inviteExpiry)
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Invitation sent successfully')
        setShowInviteDialog(false)
        setInviteEmail('')
        setInviteName('')
        fetchData()
      } else {
        toast.error(data.error || 'Failed to send invitation')
      }
    } catch (error) {
      toast.error('Failed to send invitation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendInvite = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/invitations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend' })
      })

      if (response.ok) {
        toast.success('Invitation resent')
        fetchData()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to resend invitation')
      }
    } catch (error) {
      toast.error('Failed to resend invitation')
    }
  }

  const handleCancelInvite = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/invitations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' })
      })

      if (response.ok) {
        toast.success('Invitation cancelled')
        fetchData()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to cancel invitation')
      }
    } catch (error) {
      toast.error('Failed to cancel invitation')
    }
  }

  const handleApproveUser = async () => {
    if (!selectedUser) return
    
    if (approvalBranches.length === 0) {
      toast.error('Please select at least one branch')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/pending-users/${selectedUser.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: approvalRole,
          branchIds: approvalBranches,
          department: approvalDepartment || undefined
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('User approved successfully')
        setShowApproveDialog(false)
        setSelectedUser(null)
        fetchData()
      } else {
        toast.error(data.error || 'Failed to approve user')
      }
    } catch (error) {
      toast.error('Failed to approve user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRejectUser = async () => {
    if (!selectedUser) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/pending-users/${selectedUser.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('User request rejected')
        setShowRejectDialog(false)
        setSelectedUser(null)
        fetchData()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to reject user')
      }
    } catch (error) {
      toast.error('Failed to reject user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openApprovalDialog = (pendingUser: PendingUser) => {
    setSelectedUser(pendingUser)
    setApprovalRole('END_USER')
    setApprovalBranches([])
    setApprovalDepartment('')
    setShowApproveDialog(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>
      case 'accepted':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Accepted</Badge>
      case 'expired':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Expired</Badge>
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const pendingCount = pendingUsers.length
  const pendingInvitesCount = invitations.filter(i => i.status === 'pending').length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Invitations</h2>
          <p className="text-muted-foreground">Invite users and manage pending approvals</p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingInvitesCount}</p>
                <p className="text-sm text-muted-foreground">Pending Invitations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <UserCheck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Awaiting Approval</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{invitations.filter(i => i.status === 'accepted').length}</p>
                <p className="text-sm text-muted-foreground">Accepted Invitations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="invitations" className="gap-2">
            <Mail className="h-4 w-4" />
            Invitations
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <UserCheck className="h-4 w-4" />
            Pending Approval
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 justify-center">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invitations" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {invitations.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No invitations yet</h3>
                  <p className="text-muted-foreground mb-4">Start by inviting users to your organization</p>
                  <Button onClick={() => setShowInviteDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Send First Invitation
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-gray-100 rounded-full">
                          <Mail className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{invitation.email}</p>
                            {getStatusBadge(invitation.status)}
                          </div>
                          {invitation.name && (
                            <p className="text-sm text-muted-foreground">{invitation.name}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Invited by {invitation.invitedBy.name} • {formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true })}
                          </p>
                          {invitation.status === 'pending' && (
                            <p className="text-xs text-amber-600">
                              Expires {formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {invitation.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResendInvite(invitation.id)}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Resend
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600"
                              onClick={() => handleCancelInvite(invitation.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </>
                        )}
                        {invitation.status === 'expired' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendInvite(invitation.id)}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Resend
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {pendingUsers.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No pending approvals</h3>
                  <p className="text-muted-foreground">All user requests have been processed</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingUsers.map((pendingUser) => (
                    <div key={pendingUser.id} className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50/50">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-yellow-100 rounded-full">
                          <UserCheck className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-medium">{pendingUser.name}</p>
                          <p className="text-sm text-muted-foreground">{pendingUser.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {pendingUser.phone} • Requested {formatDistanceToNow(new Date(pendingUser.createdAt), { addSuffix: true })}
                          </p>
                          {pendingUser.invitedBy && (
                            <p className="text-xs text-muted-foreground">
                              Invited by {pendingUser.invitedBy.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => openApprovalDialog(pendingUser)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                          onClick={() => {
                            setSelectedUser(pendingUser)
                            setShowRejectDialog(true)
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation email to a new user. They will be able to create their account after accepting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="invite-email">Email Address *</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label htmlFor="invite-name">Name (Optional)</Label>
              <Input
                id="invite-name"
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="invite-expiry">Invitation Expiry</Label>
              <Select value={inviteExpiry} onValueChange={setInviteExpiry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                  <SelectItem value="72">72 hours (default)</SelectItem>
                  <SelectItem value="168">7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendInvite} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve User Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve User</DialogTitle>
            <DialogDescription>
              Assign a role and branch to {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium">{selectedUser?.name}</p>
              <p className="text-sm text-muted-foreground">{selectedUser?.email}</p>
              <p className="text-sm text-muted-foreground">{selectedUser?.phone}</p>
            </div>

            <div>
              <Label htmlFor="approval-role">Role *</Label>
              <Select value={approvalRole} onValueChange={setApprovalRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Branch / Site Assignment *</Label>
              <div className="border rounded-lg p-3 mt-1 space-y-2 max-h-40 overflow-y-auto">
                {branches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No branches available</p>
                ) : (
                  branches.map((branch) => (
                    <div key={branch.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`branch-${branch.id}`}
                        checked={approvalBranches.includes(branch.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setApprovalBranches([...approvalBranches, branch.id])
                          } else {
                            setApprovalBranches(approvalBranches.filter(id => id !== branch.id))
                          }
                        }}
                      />
                      <label htmlFor={`branch-${branch.id}`} className="text-sm cursor-pointer flex items-center gap-2">
                        {branch.name}
                        {branch.isHeadOffice && (
                          <Badge variant="outline" className="text-xs">HQ</Badge>
                        )}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="approval-department">Department (Optional)</Label>
              <Input
                id="approval-department"
                type="text"
                value={approvalDepartment}
                onChange={(e) => setApprovalDepartment(e.target.value)}
                placeholder="e.g., IT, Sales, Operations"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApproveUser} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve & Send Activation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject User Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject User Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject {selectedUser?.name}'s request? This will delete their pending account and notify them via email.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">This action cannot be undone</p>
                <p className="text-sm text-red-600">The user will need a new invitation to try again.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectUser} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <UserX className="h-4 w-4 mr-2" />
                  Reject Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
