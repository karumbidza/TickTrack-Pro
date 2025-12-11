'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Send,
  Mail,
  Building2,
  FileText,
  Users,
  Banknote,
  Shield,
  HardHat,
  Wrench,
  Briefcase,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  AlertCircle,
  Loader2,
  Link2,
  Copy,
  ExternalLink,
  Search,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

interface KYCApplication {
  id: string
  status: string
  companyName: string
  tradingName?: string
  companyEmail: string
  companyPhone: string
  physicalAddress: string
  specializations: string[]
  industrySectors: string[]
  numberOfEmployees?: number
  reviewedAt?: string
  reviewNotes?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

interface KYCDetail {
  id: string
  status: string
  companyName: string
  tradingName?: string
  companyEmail: string
  companyPhone: string
  physicalAddress: string
  companyProfileUrl?: string
  
  // Documents
  certificateOfIncorporationUrl?: string
  cr5RegisteredOfficeUrl?: string
  cr6DirectorsListUrl?: string
  memorandumArticlesUrl?: string
  prazCertificateUrl?: string
  
  // Directors
  directors: Array<{
    fullName: string
    nationalId?: string
    mobile?: string
    email?: string
    residentialAddress?: string
    shareholdingPercent?: string
  }>
  
  // Banking
  bankName?: string
  bankBranch?: string
  accountName?: string
  accountNumber?: string
  accountCurrency?: string
  bankProofUrl?: string
  
  // Compliance
  zimraTaxClearanceUrl?: string
  vatCertificateUrl?: string
  nssaNumber?: string
  necComplianceUrl?: string
  insuranceCoverUrl?: string
  
  // Safety
  sheqPolicyUrl?: string
  ppeComplianceDeclaration: boolean
  publicLiabilityInsuranceUrl?: string
  safetyOfficerName?: string
  safetyOfficerQualifications?: string
  safetyCertificatesUrl?: string
  
  // Technical
  numberOfEmployees?: number
  keyTechnicalStaff: Array<{ name: string; qualification: string; role: string }>
  availableEquipment: string[]
  specialLicenses: string[]
  methodStatementsUrl?: string
  specializations: string[]
  
  // Experience
  previousClients: Array<{ clientName: string; contactPerson?: string; phone?: string; email?: string }>
  referenceLettersUrl?: string
  previousWorkExamplesUrl?: string
  currentProjects: Array<{ projectName: string; client?: string; status?: string }>
  pastProjects: Array<{ projectName: string; client?: string; status?: string }>
  industrySectors: string[]
  
  // Declarations
  conflictOfInterestDeclared: boolean
  antiCorruptionDeclared: boolean
  dataPrivacyAcknowledged: boolean
  infoAccuracyDeclared: boolean
  authorizedSignatoryName?: string
  authorizedSignatoryPosition?: string
  signatureDate?: string
  companyStampUrl?: string
  
  // Review
  reviewedBy?: string
  reviewedAt?: string
  reviewNotes?: string
  rejectionReason?: string
  
  createdAt: string
  updatedAt: string
}

interface Invitation {
  id: string
  email: string
  token: string
  status: string
  expiresAt: string
  createdAt: string
  usedAt?: string
}

interface StatusCounts {
  total: number
  PENDING: number
  SUBMITTED: number
  UNDER_REVIEW: number
  APPROVED: number
  ACTIVE: number
  REJECTED: number
  SUSPENDED: number
}

export function ContractorKYCManagement() {
  const [applications, setApplications] = useState<KYCApplication[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [counts, setCounts] = useState<StatusCounts>({
    total: 0, PENDING: 0, SUBMITTED: 0, UNDER_REVIEW: 0, 
    APPROVED: 0, ACTIVE: 0, REJECTED: 0, SUSPENDED: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('applications')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Invite dialog
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [generatedLink, setGeneratedLink] = useState('')
  
  // View KYC dialog
  const [showKYCDialog, setShowKYCDialog] = useState(false)
  const [selectedKYC, setSelectedKYC] = useState<KYCDetail | null>(null)
  const [loadingKYC, setLoadingKYC] = useState(false)
  
  // Approve/Reject dialog
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [approvalLink, setApprovalLink] = useState('')

  useEffect(() => {
    fetchData()
  }, [statusFilter])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [appsRes, invitesRes] = await Promise.all([
        fetch(`/api/admin/contractors/kyc${statusFilter ? `?status=${statusFilter}` : ''}`),
        fetch('/api/admin/contractors/invite')
      ])
      
      if (appsRes.ok) {
        const data = await appsRes.json()
        setApplications(data.applications || [])
        setCounts(data.counts || counts)
      }
      
      if (invitesRes.ok) {
        const data = await invitesRes.json()
        setInvitations(data.invitations || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      toast.error('Please enter a valid email')
      return
    }
    
    setInviting(true)
    setGeneratedLink('')
    
    try {
      const response = await fetch('/api/admin/contractors/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success('Invitation sent!')
        setGeneratedLink(data.registrationLink)
        fetchData()
      } else {
        toast.error(data.message || 'Failed to send invitation')
      }
    } catch (error) {
      toast.error('Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const viewKYC = async (id: string) => {
    setLoadingKYC(true)
    setShowKYCDialog(true)
    
    try {
      const response = await fetch(`/api/admin/contractors/kyc/${id}`)
      const data = await response.json()
      
      if (response.ok) {
        setSelectedKYC(data.kyc)
      } else {
        toast.error('Failed to load KYC details')
        setShowKYCDialog(false)
      }
    } catch (error) {
      toast.error('Failed to load KYC details')
      setShowKYCDialog(false)
    } finally {
      setLoadingKYC(false)
    }
  }

  const handleAction = async () => {
    if (!selectedKYC || !actionType) return
    
    if (actionType === 'reject' && !rejectionReason) {
      toast.error('Please provide a rejection reason')
      return
    }
    
    setActionLoading(true)
    
    try {
      const response = await fetch(`/api/admin/contractors/kyc/${selectedKYC.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          reviewNotes,
          rejectionReason
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success(actionType === 'approve' ? 'KYC Approved!' : 'KYC Rejected')
        if (actionType === 'approve' && data.passwordSetupLink) {
          setApprovalLink(data.passwordSetupLink)
        } else {
          setShowActionDialog(false)
          setShowKYCDialog(false)
        }
        fetchData()
      } else {
        toast.error(data.message || 'Action failed')
      }
    } catch (error) {
      toast.error('Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Link copied to clipboard')
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: React.ReactNode }> = {
      PENDING: { className: 'bg-gray-100 text-gray-800', icon: <Clock className="h-3 w-3" /> },
      SUBMITTED: { className: 'bg-blue-100 text-blue-800', icon: <FileText className="h-3 w-3" /> },
      UNDER_REVIEW: { className: 'bg-yellow-100 text-yellow-800', icon: <Eye className="h-3 w-3" /> },
      APPROVED: { className: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      ACTIVE: { className: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      REJECTED: { className: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
      SUSPENDED: { className: 'bg-orange-100 text-orange-800', icon: <AlertCircle className="h-3 w-3" /> }
    }
    const variant = variants[status] || variants.PENDING
    return (
      <Badge className={`${variant.className} flex items-center gap-1`}>
        {variant.icon}
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const filteredApplications = applications.filter(app => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      app.companyName.toLowerCase().includes(query) ||
      app.companyEmail.toLowerCase().includes(query)
    )
  })

  const DocumentLink = ({ url, label }: { url?: string; label: string }) => {
    if (!url) return <span className="text-gray-400 text-sm">Not provided</span>
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline text-sm flex items-center gap-1"
      >
        <FileText className="h-3 w-3" />
        View {label}
      </a>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card 
          className={`cursor-pointer transition-colors ${statusFilter === '' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setStatusFilter('')}
        >
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{counts.total}</p>
            <p className="text-xs text-gray-600">Total</p>
          </CardContent>
        </Card>
        {(['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'REJECTED'] as const).map(status => (
          <Card 
            key={status}
            className={`cursor-pointer transition-colors ${statusFilter === status ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setStatusFilter(status)}
          >
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{counts[status]}</p>
              <p className="text-xs text-gray-600">{status.replace('_', ' ')}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="applications">
            KYC Applications ({applications.length})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations ({invitations.length})
          </TabsTrigger>
        </TabsList>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by company name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredApplications.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No KYC applications found
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Specializations</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{app.companyName}</p>
                          {app.tradingName && (
                            <p className="text-sm text-gray-500">t/a {app.tradingName}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{app.companyEmail}</p>
                          <p className="text-gray-500">{app.companyPhone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {app.specializations?.slice(0, 2).map((s) => (
                            <Badge key={s} variant="outline" className="text-xs">
                              {s}
                            </Badge>
                          ))}
                          {app.specializations?.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{app.specializations.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewKYC(app.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations" className="space-y-4">
          {invitations.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No invitations sent yet
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.email}</TableCell>
                      <TableCell>
                        <Badge variant={inv.status === 'used' ? 'default' : 'secondary'}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {inv.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const link = `${window.location.origin}/contractor-registration/${inv.token}`
                              copyToClipboard(link)
                            }}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copy Link
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Contractor</DialogTitle>
            <DialogDescription>
              Send a registration link to a new contractor
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Contractor Email</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="contractor@company.co.zw"
              />
            </div>
            
            {generatedLink && (
              <div className="space-y-2">
                <Label>Registration Link</Label>
                <div className="flex gap-2">
                  <Input value={generatedLink} readOnly className="text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(generatedLink)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Send this link to the contractor to complete their registration.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowInviteDialog(false)
              setInviteEmail('')
              setGeneratedLink('')
            }}>
              Close
            </Button>
            {!generatedLink && (
              <Button onClick={handleInvite} disabled={inviting}>
                {inviting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Generate Link
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View KYC Dialog */}
      <Dialog open={showKYCDialog} onOpenChange={setShowKYCDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedKYC?.companyName} - KYC Application
            </DialogTitle>
            <DialogDescription>
              {selectedKYC && getStatusBadge(selectedKYC.status)}
            </DialogDescription>
          </DialogHeader>
          
          {loadingKYC ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : selectedKYC && (
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Company Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Company Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Company Name</p>
                      <p className="font-medium">{selectedKYC.companyName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Trading Name</p>
                      <p className="font-medium">{selectedKYC.tradingName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Email</p>
                      <p className="font-medium">{selectedKYC.companyEmail}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Phone</p>
                      <p className="font-medium">{selectedKYC.companyPhone}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500">Physical Address</p>
                      <p className="font-medium">{selectedKYC.physicalAddress}</p>
                    </div>
                    <div>
                      <DocumentLink url={selectedKYC.companyProfileUrl} label="Company Profile" />
                    </div>
                  </CardContent>
                </Card>

                {/* Documents */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Company Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <DocumentLink url={selectedKYC.certificateOfIncorporationUrl} label="Certificate of Incorporation" />
                    <DocumentLink url={selectedKYC.cr5RegisteredOfficeUrl} label="CR5" />
                    <DocumentLink url={selectedKYC.cr6DirectorsListUrl} label="CR6" />
                    <DocumentLink url={selectedKYC.memorandumArticlesUrl} label="Memorandum & Articles" />
                    <DocumentLink url={selectedKYC.prazCertificateUrl} label="PRAZ Certificate" />
                  </CardContent>
                </Card>

                {/* Directors */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Directors ({selectedKYC.directors?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedKYC.directors?.length > 0 ? (
                      <div className="space-y-4">
                        {selectedKYC.directors.map((dir, i) => (
                          <div key={i} className="grid grid-cols-3 gap-2 text-sm p-3 bg-gray-50 rounded">
                            <div>
                              <p className="text-gray-500">Name</p>
                              <p className="font-medium">{dir.fullName}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">ID</p>
                              <p className="font-medium">{dir.nationalId || '-'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Shareholding</p>
                              <p className="font-medium">{dir.shareholdingPercent || '-'}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">No directors provided</p>
                    )}
                  </CardContent>
                </Card>

                {/* Banking */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Banknote className="h-5 w-5" />
                      Banking Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Bank</p>
                      <p className="font-medium">{selectedKYC.bankName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Branch</p>
                      <p className="font-medium">{selectedKYC.bankBranch || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Account Name</p>
                      <p className="font-medium">{selectedKYC.accountName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Account Number</p>
                      <p className="font-medium">{selectedKYC.accountNumber || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Currency</p>
                      <p className="font-medium">{selectedKYC.accountCurrency || 'USD'}</p>
                    </div>
                    <div>
                      <DocumentLink url={selectedKYC.bankProofUrl} label="Bank Proof" />
                    </div>
                  </CardContent>
                </Card>

                {/* Compliance */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Tax & Compliance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <DocumentLink url={selectedKYC.zimraTaxClearanceUrl} label="ZIMRA Tax Clearance" />
                    <DocumentLink url={selectedKYC.vatCertificateUrl} label="VAT Certificate" />
                    <div className="text-sm">
                      <p className="text-gray-500">NSSA Number</p>
                      <p className="font-medium">{selectedKYC.nssaNumber || '-'}</p>
                    </div>
                    <DocumentLink url={selectedKYC.necComplianceUrl} label="NEC Compliance" />
                    <DocumentLink url={selectedKYC.insuranceCoverUrl} label="Insurance Cover" />
                  </CardContent>
                </Card>

                {/* Safety */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <HardHat className="h-5 w-5" />
                      Health & Safety
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <DocumentLink url={selectedKYC.sheqPolicyUrl} label="SHEQ Policy" />
                    <div>
                      <p className="text-gray-500">PPE Compliance</p>
                      <p className="font-medium">
                        {selectedKYC.ppeComplianceDeclaration ? (
                          <Badge className="bg-green-100 text-green-800">Declared</Badge>
                        ) : (
                          <Badge variant="secondary">Not declared</Badge>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Safety Officer</p>
                      <p className="font-medium">{selectedKYC.safetyOfficerName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Qualifications</p>
                      <p className="font-medium">{selectedKYC.safetyOfficerQualifications || '-'}</p>
                    </div>
                    <DocumentLink url={selectedKYC.publicLiabilityInsuranceUrl} label="Public Liability Insurance" />
                    <DocumentLink url={selectedKYC.safetyCertificatesUrl} label="Safety Certificates" />
                  </CardContent>
                </Card>

                {/* Technical */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Wrench className="h-5 w-5" />
                      Technical Capability
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm">
                      <p className="text-gray-500">Number of Employees</p>
                      <p className="font-medium">{selectedKYC.numberOfEmployees || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm mb-2">Specializations</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedKYC.specializations?.map((s) => (
                          <Badge key={s} variant="secondary">{s}</Badge>
                        ))}
                      </div>
                    </div>
                    <DocumentLink url={selectedKYC.methodStatementsUrl} label="Method Statements" />
                  </CardContent>
                </Card>

                {/* Experience */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Experience
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-gray-500 text-sm mb-2">Industry Sectors</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedKYC.industrySectors?.map((s) => (
                          <Badge key={s} variant="outline">{s}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <DocumentLink url={selectedKYC.referenceLettersUrl} label="Reference Letters" />
                      <DocumentLink url={selectedKYC.previousWorkExamplesUrl} label="Previous Work Examples" />
                    </div>
                  </CardContent>
                </Card>

                {/* Declarations */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Declarations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      {selectedKYC.conflictOfInterestDeclared ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span>Conflict of Interest Declaration</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedKYC.antiCorruptionDeclared ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span>Anti-Corruption & Ethics Declaration</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedKYC.dataPrivacyAcknowledged ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span>Data Privacy Acknowledgment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedKYC.infoAccuracyDeclared ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span>Information Accuracy Declaration</span>
                    </div>
                    <div className="pt-2 border-t grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-500">Authorized Signatory</p>
                        <p className="font-medium">{selectedKYC.authorizedSignatoryName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Position</p>
                        <p className="font-medium">{selectedKYC.authorizedSignatoryPosition || '-'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowKYCDialog(false)}>
              Close
            </Button>
            {selectedKYC && ['SUBMITTED', 'UNDER_REVIEW'].includes(selectedKYC.status) && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setActionType('reject')
                    setShowActionDialog(true)
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setActionType('approve')
                    setShowActionDialog(true)
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog (Approve/Reject) */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve KYC Application' : 'Reject KYC Application'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {approvalLink ? (
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <p className="font-medium text-green-800">KYC Approved Successfully!</p>
                </div>
                <div className="space-y-2">
                  <Label>Password Setup Link</Label>
                  <div className="flex gap-2">
                    <Input value={approvalLink} readOnly className="text-sm" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(approvalLink)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Send this link to the contractor so they can set up their password and login.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Review Notes (Optional)</Label>
                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Internal notes about this application..."
                    rows={3}
                  />
                </div>
                
                {actionType === 'reject' && (
                  <div className="space-y-2">
                    <Label>Rejection Reason <span className="text-red-500">*</span></Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Please provide a reason for rejection..."
                      rows={3}
                    />
                  </div>
                )}
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowActionDialog(false)
                setApprovalLink('')
                setReviewNotes('')
                setRejectionReason('')
              }}
            >
              {approvalLink ? 'Done' : 'Cancel'}
            </Button>
            {!approvalLink && (
              <Button
                variant={actionType === 'approve' ? 'default' : 'destructive'}
                onClick={handleAction}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : actionType === 'approve' ? (
                  <CheckCircle className="h-4 w-4 mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                {actionType === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
