'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Loader2, 
  Building2, 
  FileText, 
  Users, 
  Banknote, 
  Shield, 
  HardHat,
  Wrench,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Upload,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Checkbox as MuiCheckbox,
  Box,
  Typography,
  Chip
} from '@mui/material'

interface Director {
  fullName: string
  nationalId: string
  mobile: string
  email: string
  residentialAddress: string
  shareholdingPercent: string
  idDocument: File | null
}

interface BankAccount {
  bankName: string
  bankBranch: string
  accountName: string
  accountNumber: string
  accountCurrency: string
  isPrimary: boolean
  proofDocument: File | null
}

interface TechnicalStaff {
  name: string
  qualification: string
  role: string
}

interface PreviousClient {
  clientName: string
  contactPerson: string
  phone: string
  email: string
}

interface Project {
  projectName: string
  client: string
  status: string
}

interface Category {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
}

const STEPS = [
  { id: 1, title: 'Company Info', icon: Building2 },
  { id: 2, title: 'Documents', icon: FileText },
  { id: 3, title: 'Directors', icon: Users },
  { id: 4, title: 'Banking', icon: Banknote },
  { id: 5, title: 'Compliance', icon: Shield },
  { id: 6, title: 'Safety', icon: HardHat },
  { id: 7, title: 'Technical', icon: Wrench },
  { id: 8, title: 'Experience', icon: Briefcase },
  { id: 9, title: 'Declarations', icon: CheckCircle }
]

const SPECIALIZATIONS = [
  'Plumbing', 'Electrical', 'HVAC', 'Refrigeration', 'Generators', 
  'Civil Works', 'Painting', 'Carpentry', 'Roofing', 'Welding',
  'Security Systems', 'Fire Safety', 'IT/Networking', 'Landscaping',
  'Cleaning Services', 'Pest Control', 'Fuel Systems', 'Solar Installation'
]

const INDUSTRY_SECTORS = [
  'Fuel Stations', 'Construction', 'ICT', 'HVAC', 'Manufacturing',
  'Mining', 'Agriculture', 'Retail', 'Healthcare', 'Education',
  'Hospitality', 'Transport', 'Telecommunications', 'Energy'
]

export default function ContractorRegistrationPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [valid, setValid] = useState(false)
  const [error, setError] = useState('')
  const [tenant, setTenant] = useState<{ id: string; name: string; logo?: string } | null>(null)
  const [invitationEmail, setInvitationEmail] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  
  // Form state
  const [formData, setFormData] = useState({
    // Company Information
    companyName: '',
    tradingName: '',
    physicalAddress: '',
    companyEmail: '',
    companyPhone: '',
    
    // Banking
    bankName: '',
    bankBranch: '',
    accountName: '',
    accountNumber: '',
    accountCurrency: 'USD',
    
    // Compliance
    nssaNumber: '',
    
    // Safety
    ppeComplianceDeclaration: false,
    safetyOfficerName: '',
    safetyOfficerQualifications: '',
    
    // Technical
    numberOfEmployees: '',
    specializations: [] as string[],
    
    // Experience
    industrySectors: [] as string[],
    
    // Declarations
    conflictOfInterestDeclared: false,
    antiCorruptionDeclared: false,
    dataPrivacyAcknowledged: false,
    infoAccuracyDeclared: false,
    authorizedSignatoryName: '',
    authorizedSignatoryPosition: ''
  })
  
  // File uploads
  const [files, setFiles] = useState<Record<string, File | null>>({
    companyProfile: null,
    certificateOfIncorporation: null,
    cr5RegisteredOffice: null,
    cr6DirectorsList: null,
    memorandumArticles: null,
    prazCertificate: null,
    bankProof: null,
    zimraTaxClearance: null,
    vatCertificate: null,
    necCompliance: null,
    insuranceCover: null,
    sheqPolicy: null,
    publicLiabilityInsurance: null,
    safetyCertificates: null,
    methodStatements: null,
    referenceLetters: null,
    previousWorkExamples: null,
    companyStamp: null
  })
  
  // Dynamic arrays
  const [directors, setDirectors] = useState<Director[]>([{
    fullName: '',
    nationalId: '',
    mobile: '',
    email: '',
    residentialAddress: '',
    shareholdingPercent: '',
    idDocument: null
  }])
  
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([{
    bankName: '',
    bankBranch: '',
    accountName: '',
    accountNumber: '',
    accountCurrency: 'USD',
    isPrimary: true,
    proofDocument: null
  }])
  
  const [technicalStaff, setTechnicalStaff] = useState<TechnicalStaff[]>([])
  const [equipment, setEquipment] = useState<string[]>([])
  const [licenses, setLicenses] = useState<string[]>([])
  const [previousClients, setPreviousClients] = useState<PreviousClient[]>([])
  const [currentProjects, setCurrentProjects] = useState<Project[]>([])
  const [pastProjects, setPastProjects] = useState<Project[]>([])

  useEffect(() => {
    validateToken()
  }, [token])

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/contractor-registration/${token}`)
      const data = await response.json()
      
      if (data.valid) {
        setValid(true)
        setTenant(data.tenant)
        setInvitationEmail(data.invitation.email)
        setFormData(prev => ({ ...prev, companyEmail: data.invitation.email }))
        
        // Fetch categories for this tenant
        const categoriesResponse = await fetch(`/api/asset-categories?tenantId=${data.tenant.id}`)
        const categoriesData = await categoriesResponse.json()
        if (categoriesData.categories) {
          setCategories(categoriesData.categories)
        }
      } else {
        setError(data.message || 'Invalid invitation link')
      }
    } catch (err) {
      setError('Failed to validate invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (field: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [field]: file }))
  }

  const addDirector = () => {
    setDirectors([...directors, {
      fullName: '',
      nationalId: '',
      mobile: '',
      email: '',
      residentialAddress: '',
      shareholdingPercent: '',
      idDocument: null
    }])
  }

  const removeDirector = (index: number) => {
    if (directors.length > 1) {
      setDirectors(directors.filter((_, i) => i !== index))
    }
  }

  const updateDirector = (index: number, field: keyof Director, value: string | File | null) => {
    const updated = [...directors]
    updated[index] = { ...updated[index], [field]: value }
    setDirectors(updated)
  }

  const addBankAccount = () => {
    setBankAccounts([...bankAccounts, {
      bankName: '',
      bankBranch: '',
      accountName: '',
      accountNumber: '',
      accountCurrency: 'USD',
      isPrimary: false,
      proofDocument: null
    }])
  }

  const removeBankAccount = (index: number) => {
    if (bankAccounts.length > 1) {
      const updated = bankAccounts.filter((_, i) => i !== index)
      // Ensure at least one is primary
      if (!updated.some(b => b.isPrimary)) {
        updated[0].isPrimary = true
      }
      setBankAccounts(updated)
    }
  }

  const updateBankAccount = (index: number, field: keyof BankAccount, value: string | boolean | File | null) => {
    const updated = [...bankAccounts]
    if (field === 'isPrimary' && value === true) {
      // Only one can be primary
      updated.forEach((b, i) => {
        b.isPrimary = i === index
      })
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }
    setBankAccounts(updated)
  }

  const toggleSpecialization = (spec: string) => {
    const current = formData.specializations
    if (current.includes(spec)) {
      handleInputChange('specializations', current.filter(s => s !== spec))
    } else {
      handleInputChange('specializations', [...current, spec])
    }
  }

  const toggleIndustrySector = (sector: string) => {
    const current = formData.industrySectors
    if (current.includes(sector)) {
      handleInputChange('industrySectors', current.filter(s => s !== sector))
    } else {
      handleInputChange('industrySectors', [...current, sector])
    }
  }

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(c => c !== categoryId))
    } else {
      setSelectedCategories([...selectedCategories, categoryId])
    }
  }

  const nextStep = () => {
    if (currentStep < 9) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.companyName || !formData.physicalAddress || !formData.companyPhone) {
      toast.error('Please fill in all required company information')
      setCurrentStep(1)
      return
    }

    if (selectedCategories.length === 0) {
      toast.error('Please select at least one service category')
      setCurrentStep(7)
      return
    }

    if (!formData.conflictOfInterestDeclared || !formData.antiCorruptionDeclared || 
        !formData.dataPrivacyAcknowledged || !formData.infoAccuracyDeclared) {
      toast.error('Please accept all compliance declarations')
      setCurrentStep(9)
      return
    }

    if (!formData.authorizedSignatoryName || !formData.authorizedSignatoryPosition) {
      toast.error('Please provide authorized signatory details')
      setCurrentStep(9)
      return
    }

    setSubmitting(true)
    
    try {
      const submitData = new FormData()
      
      // Add token
      submitData.append('token', token)
      
      // Add selected categories
      submitData.append('categories', JSON.stringify(selectedCategories))
      
      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          submitData.append(key, JSON.stringify(value))
        } else if (typeof value === 'boolean') {
          submitData.append(key, value.toString())
        } else {
          submitData.append(key, value)
        }
      })
      
      // Add files
      Object.entries(files).forEach(([key, file]) => {
        if (file) {
          submitData.append(key, file)
        }
      })
      
      // Add director ID documents
      directors.forEach((director, index) => {
        if (director.idDocument) {
          submitData.append(`directorIdDocument_${index}`, director.idDocument)
        }
      })
      
      // Add bank proof documents
      bankAccounts.forEach((bank, index) => {
        if (bank.proofDocument) {
          submitData.append(`bankProofDocument_${index}`, bank.proofDocument)
        }
      })
      
      // Add dynamic arrays (without file fields for JSON)
      const directorsData = directors.filter(d => d.fullName).map(d => ({
        fullName: d.fullName,
        nationalId: d.nationalId,
        mobile: d.mobile,
        email: d.email,
        residentialAddress: d.residentialAddress,
        shareholdingPercent: d.shareholdingPercent,
        hasIdDocument: !!d.idDocument
      }))
      submitData.append('directors', JSON.stringify(directorsData))
      
      // Add bank accounts (without file fields for JSON)
      const bankAccountsData = bankAccounts.filter(b => b.bankName && b.accountNumber).map(b => ({
        bankName: b.bankName,
        bankBranch: b.bankBranch,
        accountName: b.accountName,
        accountNumber: b.accountNumber,
        accountCurrency: b.accountCurrency,
        isPrimary: b.isPrimary,
        hasProofDocument: !!b.proofDocument
      }))
      submitData.append('bankAccounts', JSON.stringify(bankAccountsData))
      
      submitData.append('keyTechnicalStaff', JSON.stringify(technicalStaff))
      submitData.append('availableEquipment', JSON.stringify(equipment.filter(Boolean)))
      submitData.append('specialLicenses', JSON.stringify(licenses.filter(Boolean)))
      submitData.append('previousClients', JSON.stringify(previousClients.filter(c => c.clientName)))
      submitData.append('currentProjects', JSON.stringify(currentProjects.filter(p => p.projectName)))
      submitData.append('pastProjects', JSON.stringify(pastProjects.filter(p => p.projectName)))
      
      const response = await fetch('/api/contractor-registration/submit', {
        method: 'POST',
        body: submitData
      })
      
      const result = await response.json()
      
      if (response.ok) {
        toast.success('KYC submitted successfully!')
        router.push('/contractor-registration/success')
      } else {
        toast.error(result.message || 'Failed to submit KYC')
      }
    } catch (err) {
      console.error('Submit error:', err)
      toast.error('Failed to submit KYC')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const FileUpload = ({ 
    id, 
    label, 
    required = false,
    accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png"
  }: { 
    id: string
    label: string
    required?: boolean
    accept?: string
  }) => (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="file"
          accept={accept}
          onChange={(e) => handleFileChange(id, e.target.files?.[0] || null)}
          className="flex-1"
        />
        {files[id] && (
          <Badge variant="secondary" className="truncate max-w-[150px]">
            {files[id]?.name}
          </Badge>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          {tenant?.logo && (
            <img src={tenant.logo} alt={tenant.name} className="h-16 mx-auto mb-4" />
          )}
          <h1 className="text-3xl font-bold text-gray-900">Contractor Registration</h1>
          <p className="text-gray-600 mt-2">
            Complete your KYC verification for {tenant?.name}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex justify-between min-w-[600px]">
            {STEPS.map((step) => {
              const Icon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = step.id < currentStep
              
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-blue-100 text-blue-700' 
                      : isCompleted 
                        ? 'text-green-600' 
                        : 'text-gray-400'
                  }`}
                >
                  <div className={`p-2 rounded-full mb-1 ${
                    isActive 
                      ? 'bg-blue-600 text-white' 
                      : isCompleted 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200'
                  }`}>
                    {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className="text-xs font-medium">{step.title}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Form Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const StepIcon = STEPS[currentStep - 1].icon
                return <StepIcon className="h-5 w-5" />
              })()}
              {STEPS[currentStep - 1].title}
            </CardTitle>
            <CardDescription>
              Step {currentStep} of {STEPS.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Step 1: Company Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Registered Company Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      placeholder="ABC Contractors (Pvt) Ltd"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tradingName">Trading Name (if different)</Label>
                    <Input
                      id="tradingName"
                      value={formData.tradingName}
                      onChange={(e) => handleInputChange('tradingName', e.target.value)}
                      placeholder="ABC Contractors"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="physicalAddress">Physical Address <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="physicalAddress"
                    value={formData.physicalAddress}
                    onChange={(e) => handleInputChange('physicalAddress', e.target.value)}
                    placeholder="123 Industrial Road, Harare, Zimbabwe"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Company Email <span className="text-red-500">*</span></Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      value={formData.companyEmail}
                      onChange={(e) => handleInputChange('companyEmail', e.target.value)}
                      placeholder="info@company.co.zw"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyPhone">Company Phone <span className="text-red-500">*</span></Label>
                    <Input
                      id="companyPhone"
                      value={formData.companyPhone}
                      onChange={(e) => handleInputChange('companyPhone', e.target.value)}
                      placeholder="+263 77 123 4567"
                    />
                  </div>
                </div>
                
                <FileUpload id="companyProfile" label="Company Profile (PDF)" />
              </div>
            )}

            {/* Step 2: Company Documents */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Please upload certified copies of your company registration documents.
                </p>
                
                <FileUpload 
                  id="certificateOfIncorporation" 
                  label="Certificate of Incorporation (CR14)" 
                  required 
                />
                <FileUpload 
                  id="cr5RegisteredOffice" 
                  label="CR5 - Registered Office Address" 
                />
                <FileUpload 
                  id="cr6DirectorsList" 
                  label="CR6 - Directors List" 
                />
                <FileUpload 
                  id="memorandumArticles" 
                  label="Memorandum & Articles of Association" 
                />
                <FileUpload 
                  id="prazCertificate" 
                  label="PRAZ Registration Certificate (Optional)" 
                />
              </div>
            )}

            {/* Step 3: Directors Information */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <p className="text-sm text-gray-600">
                  Add all directors and shareholders of the company.
                </p>
                
                {directors.map((director, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">Director {index + 1}</h4>
                      {directors.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDirector(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name <span className="text-red-500">*</span></Label>
                        <Input
                          value={director.fullName}
                          onChange={(e) => updateDirector(index, 'fullName', e.target.value)}
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>National ID / Passport</Label>
                        <Input
                          value={director.nationalId}
                          onChange={(e) => updateDirector(index, 'nationalId', e.target.value)}
                          placeholder="63-123456-A-42"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mobile Number</Label>
                        <Input
                          value={director.mobile}
                          onChange={(e) => updateDirector(index, 'mobile', e.target.value)}
                          placeholder="+263 77 123 4567"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input
                          type="email"
                          value={director.email}
                          onChange={(e) => updateDirector(index, 'email', e.target.value)}
                          placeholder="director@email.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Residential Address</Label>
                        <Input
                          value={director.residentialAddress}
                          onChange={(e) => updateDirector(index, 'residentialAddress', e.target.value)}
                          placeholder="123 Suburb, Harare"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>% Shareholding</Label>
                        <Input
                          type="number"
                          value={director.shareholdingPercent}
                          onChange={(e) => updateDirector(index, 'shareholdingPercent', e.target.value)}
                          placeholder="50"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                    
                    {/* ID Document Upload */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="space-y-2">
                        <Label>ID / Passport Copy</Label>
                        <div className="flex items-center gap-4">
                          <Input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null
                              updateDirector(index, 'idDocument', file)
                            }}
                            className="flex-1"
                          />
                          {director.idDocument && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {director.idDocument.name.substring(0, 20)}...
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">Upload a clear copy of National ID or Passport (PDF, JPG, PNG)</p>
                      </div>
                    </div>
                  </Card>
                ))}
                
                <Button variant="outline" onClick={addDirector} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Director
                </Button>
              </div>
            )}

            {/* Step 4: Banking Information */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <p className="text-sm text-gray-600">
                  Add your company's bank account details. You can add multiple accounts for different currencies.
                </p>
                
                {bankAccounts.map((bank, index) => (
                  <Card key={index} className={`p-4 ${bank.isPrimary ? 'border-blue-500 border-2' : ''}`}>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">Bank Account {index + 1}</h4>
                        {bank.isPrimary && (
                          <Badge className="bg-blue-500">Primary</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!bank.isPrimary && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateBankAccount(index, 'isPrimary', true)}
                          >
                            Set as Primary
                          </Button>
                        )}
                        {bankAccounts.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBankAccount(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Bank Name <span className="text-red-500">*</span></Label>
                        <Input
                          value={bank.bankName}
                          onChange={(e) => updateBankAccount(index, 'bankName', e.target.value)}
                          placeholder="CBZ Bank"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Branch</Label>
                        <Input
                          value={bank.bankBranch}
                          onChange={(e) => updateBankAccount(index, 'bankBranch', e.target.value)}
                          placeholder="Harare Main"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Name <span className="text-red-500">*</span></Label>
                        <Input
                          value={bank.accountName}
                          onChange={(e) => updateBankAccount(index, 'accountName', e.target.value)}
                          placeholder="ABC Contractors (Pvt) Ltd"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Number <span className="text-red-500">*</span></Label>
                        <Input
                          value={bank.accountNumber}
                          onChange={(e) => updateBankAccount(index, 'accountNumber', e.target.value)}
                          placeholder="1234567890"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <Select
                          value={bank.accountCurrency}
                          onValueChange={(value) => updateBankAccount(index, 'accountCurrency', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="ZWL">ZWL</SelectItem>
                            <SelectItem value="ZAR">ZAR</SelectItem>
                            <SelectItem value="BWP">BWP</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Proof of Account</Label>
                        <Input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            updateBankAccount(index, 'proofDocument', file)
                          }}
                        />
                        {bank.proofDocument && (
                          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                            <CheckCircle className="h-3 w-3" />
                            {bank.proofDocument.name.substring(0, 20)}...
                          </Badge>
                        )}
                        <p className="text-xs text-gray-500">Bank letter or statement header</p>
                      </div>
                    </div>
                  </Card>
                ))}
                
                <Button variant="outline" onClick={addBankAccount} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Bank Account
                </Button>
              </div>
            )}

            {/* Step 5: Tax & Compliance */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <FileUpload 
                  id="zimraTaxClearance" 
                  label="ZIMRA Tax Clearance (ITF263)" 
                  required 
                />
                <FileUpload 
                  id="vatCertificate" 
                  label="VAT Registration Certificate (if VAT registered)" 
                />
                <div className="space-y-2">
                  <Label htmlFor="nssaNumber">NSSA Registration Number</Label>
                  <Input
                    id="nssaNumber"
                    value={formData.nssaNumber}
                    onChange={(e) => handleInputChange('nssaNumber', e.target.value)}
                    placeholder="NSSA123456"
                  />
                </div>
                <FileUpload 
                  id="necCompliance" 
                  label="NEC Compliance Certificate" 
                />
                <FileUpload 
                  id="insuranceCover" 
                  label="Insurance Cover (Public Liability, Workmen's Compensation)" 
                />
              </div>
            )}

            {/* Step 6: Health & Safety */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <FileUpload 
                  id="sheqPolicy" 
                  label="SHEQ Policy Document" 
                />
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ppeComplianceDeclaration"
                    checked={formData.ppeComplianceDeclaration}
                    onCheckedChange={(checked) => 
                      handleInputChange('ppeComplianceDeclaration', checked === true)
                    }
                  />
                  <Label htmlFor="ppeComplianceDeclaration" className="text-sm">
                    We declare that all our staff are provided with and use appropriate PPE
                  </Label>
                </div>
                
                <FileUpload 
                  id="publicLiabilityInsurance" 
                  label="Public Liability Insurance" 
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="safetyOfficerName">Safety Officer Name</Label>
                    <Input
                      id="safetyOfficerName"
                      value={formData.safetyOfficerName}
                      onChange={(e) => handleInputChange('safetyOfficerName', e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="safetyOfficerQualifications">Safety Officer Qualifications</Label>
                    <Input
                      id="safetyOfficerQualifications"
                      value={formData.safetyOfficerQualifications}
                      onChange={(e) => handleInputChange('safetyOfficerQualifications', e.target.value)}
                      placeholder="NEBOSH, IOSH, etc."
                    />
                  </div>
                </div>
                
                <FileUpload 
                  id="safetyCertificates" 
                  label="Safety Certificates (if any)" 
                />
              </div>
            )}

            {/* Step 7: Technical Capability */}
            {currentStep === 7 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="numberOfEmployees">Number of Employees</Label>
                  <Input
                    id="numberOfEmployees"
                    type="number"
                    value={formData.numberOfEmployees}
                    onChange={(e) => handleInputChange('numberOfEmployees', e.target.value)}
                    placeholder="10"
                    min="1"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label>Service Categories <span className="text-red-500">*</span></Label>
                  <p className="text-sm text-gray-500">Select all categories you can service</p>
                  
                  {categories.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography color="text.secondary">
                        No service categories have been set up by the tenant yet.
                      </Typography>
                    </Box>
                  ) : (
                    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell padding="checkbox">
                              <MuiCheckbox
                                indeterminate={selectedCategories.length > 0 && selectedCategories.length < categories.length}
                                checked={categories.length > 0 && selectedCategories.length === categories.length}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCategories(categories.map(c => c.id))
                                  } else {
                                    setSelectedCategories([])
                                  }
                                }}
                                size="small"
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {categories.map((category) => (
                            <TableRow 
                              key={category.id}
                              hover
                              onClick={() => toggleCategory(category.id)}
                              sx={{ cursor: 'pointer' }}
                              selected={selectedCategories.includes(category.id)}
                            >
                              <TableCell padding="checkbox">
                                <MuiCheckbox
                                  checked={selectedCategories.includes(category.id)}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {category.color && (
                                    <Box 
                                      sx={{ 
                                        width: 12, 
                                        height: 12, 
                                        borderRadius: '50%', 
                                        bgcolor: category.color 
                                      }} 
                                    />
                                  )}
                                  <Typography variant="body2" fontWeight={500}>
                                    {category.name}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {category.description || '-'}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Paper>
                  )}
                  
                  {selectedCategories.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                        Selected ({selectedCategories.length}):
                      </Typography>
                      {categories
                        .filter(c => selectedCategories.includes(c.id))
                        .map(c => (
                          <Chip
                            key={c.id}
                            label={c.name}
                            size="small"
                            sx={{ 
                              bgcolor: c.color || 'primary.main',
                              color: 'white',
                              fontSize: '0.75rem'
                            }}
                          />
                        ))
                      }
                    </Box>
                  )}
                  
                  {selectedCategories.length === 0 && (
                    <p className="text-sm text-red-500">Please select at least one category</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>Areas of Specialization</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {SPECIALIZATIONS.map((spec) => (
                      <Badge
                        key={spec}
                        variant={formData.specializations.includes(spec) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleSpecialization(spec)}
                      >
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <FileUpload 
                  id="methodStatements" 
                  label="Method Statements (Optional)" 
                />
              </div>
            )}

            {/* Step 8: Previous Experience */}
            {currentStep === 8 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Industry Sectors</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {INDUSTRY_SECTORS.map((sector) => (
                      <Badge
                        key={sector}
                        variant={formData.industrySectors.includes(sector) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleIndustrySector(sector)}
                      >
                        {sector}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <FileUpload 
                  id="referenceLetters" 
                  label="Reference Letters" 
                />
                
                <FileUpload 
                  id="previousWorkExamples" 
                  label="Examples of Previous Work (Photos/Documents)" 
                />
              </div>
            )}

            {/* Step 9: Declarations */}
            {currentStep === 9 && (
              <div className="space-y-6">
                <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium">Compliance Declarations</h4>
                  
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="conflictOfInterestDeclared"
                      checked={formData.conflictOfInterestDeclared}
                      onCheckedChange={(checked) => 
                        handleInputChange('conflictOfInterestDeclared', checked === true)
                      }
                    />
                    <Label htmlFor="conflictOfInterestDeclared" className="text-sm leading-tight">
                      I declare that there is no conflict of interest between our company and {tenant?.name}
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="antiCorruptionDeclared"
                      checked={formData.antiCorruptionDeclared}
                      onCheckedChange={(checked) => 
                        handleInputChange('antiCorruptionDeclared', checked === true)
                      }
                    />
                    <Label htmlFor="antiCorruptionDeclared" className="text-sm leading-tight">
                      We adhere to anti-corruption and ethics policies and will not engage in any corrupt practices
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="dataPrivacyAcknowledged"
                      checked={formData.dataPrivacyAcknowledged}
                      onCheckedChange={(checked) => 
                        handleInputChange('dataPrivacyAcknowledged', checked === true)
                      }
                    />
                    <Label htmlFor="dataPrivacyAcknowledged" className="text-sm leading-tight">
                      We acknowledge the data privacy and confidentiality requirements and agree to protect all sensitive information
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="infoAccuracyDeclared"
                      checked={formData.infoAccuracyDeclared}
                      onCheckedChange={(checked) => 
                        handleInputChange('infoAccuracyDeclared', checked === true)
                      }
                    />
                    <Label htmlFor="infoAccuracyDeclared" className="text-sm leading-tight">
                      I declare that all information submitted is true, accurate, and complete
                    </Label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="authorizedSignatoryName">
                      Authorized Signatory Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="authorizedSignatoryName"
                      value={formData.authorizedSignatoryName}
                      onChange={(e) => handleInputChange('authorizedSignatoryName', e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="authorizedSignatoryPosition">
                      Position <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="authorizedSignatoryPosition"
                      value={formData.authorizedSignatoryPosition}
                      onChange={(e) => handleInputChange('authorizedSignatoryPosition', e.target.value)}
                      placeholder="Managing Director"
                    />
                  </div>
                </div>
                
                <FileUpload 
                  id="companyStamp" 
                  label="Company Stamp (Image)" 
                  accept=".jpg,.jpeg,.png"
                />
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              {currentStep < 9 ? (
                <Button onClick={nextStep}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Submit KYC Application
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
