'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Star, Clock, Shield, Heart, Wrench, ClipboardCheck, CheckCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface RatingModalProps {
  ticketId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRatingSubmitted: () => void
}

interface TicketData {
  scheduledArrival?: string
  onSiteTime?: string
  contractorName?: string
  contractorEmail?: string
}

interface RatingData {
  punctualityRating: number
  wasOnTime: boolean
  notifiedOfDelays: boolean
  preparedToStart: boolean
  scheduledTime: string
  actualArrival: string
  
  ppeCompliant: boolean
  ppeChecklist: {
    hardHat: boolean
    safetyBoots: boolean
    reflectiveVest: boolean
    gloves: boolean
    safetyGoggles: boolean
    overalls: boolean
  }
  ppeComment: string
  
  customerServiceRating: number
  communicatedClearly: boolean      // 2 stars
  professionalAttitude: boolean     // 1 star
  respectfulToStaff: boolean        // 1 star
  patientAndSolutionOriented: boolean // 1 star
  
  workmanshipRating: number
  workCompletedAsRequested: boolean // 2 stars
  noShortcuts: boolean              // 1 star
  cleanWorkArea: boolean            // 1 star
  noReworkNeeded: boolean           // 1 star
  
  followedSiteProcedures: boolean
  permitToWorkFilledOut: boolean    // 2 stars (renamed from signedInAtGate)
  loggedIntoJobCard: boolean        // 1 star
  followedIsolationProcedures: boolean // 1 star
  followedWasteDisposal: boolean    // 1 star
  
  overallRating: number
  overallPercentage: number
  additionalComments: string
  beforeImages: File[]
  afterImages: File[]
}

const REQUIRED_PPE = ['hardHat', 'safetyBoots', 'reflectiveVest']

// Weighting constants
const WEIGHTS = {
  punctuality: 0.25,      // 25%
  ppeCompliance: 0.25,    // 25%
  customerService: 0.20,  // 20%
  workmanship: 0.20,      // 20%
  siteProcedures: 0.10    // 10%
}

export function RatingModal({ ticketId, open, onOpenChange, onRatingSubmitted }: RatingModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ticketData, setTicketData] = useState<TicketData | null>(null)
  const [loadingTicket, setLoadingTicket] = useState(false)
  
  const [ratingData, setRatingData] = useState<RatingData>({
    punctualityRating: 0,
    wasOnTime: false,
    notifiedOfDelays: false,
    preparedToStart: false,
    scheduledTime: '',
    actualArrival: '',
    
    ppeCompliant: false,
    ppeChecklist: {
      hardHat: false,
      safetyBoots: false,
      reflectiveVest: false,
      gloves: false,
      safetyGoggles: false,
      overalls: false
    },
    ppeComment: '',
    
    customerServiceRating: 0,
    communicatedClearly: false,
    professionalAttitude: false,
    respectfulToStaff: false,
    patientAndSolutionOriented: false,
    
    workmanshipRating: 0,
    workCompletedAsRequested: false,
    noShortcuts: false,
    cleanWorkArea: false,
    noReworkNeeded: false,
    
    followedSiteProcedures: false,
    permitToWorkFilledOut: false,
    loggedIntoJobCard: false,
    followedIsolationProcedures: false,
    followedWasteDisposal: false,
    
    overallRating: 0,
    overallPercentage: 0,
    additionalComments: '',
    beforeImages: [],
    afterImages: []
  })

  const totalSteps = 7 // Reduced steps - removed manual overall rating

  useEffect(() => {
    if (open && ticketId) {
      fetchTicketData()
    }
  }, [open, ticketId])

  const fetchTicketData = async () => {
    setLoadingTicket(true)
    try {
      const response = await fetch(`/api/tickets/${ticketId}/rating-data`)
      if (response.ok) {
        const data = await response.json()
        setTicketData(data)
        
        if (data.scheduledArrival || data.onSiteTime) {
          const scheduled = data.scheduledArrival ? new Date(data.scheduledArrival) : null
          const actual = data.onSiteTime ? new Date(data.onSiteTime) : null
          
          setRatingData(prev => ({
            ...prev,
            scheduledTime: scheduled ? formatDateTimeLocal(scheduled) : '',
            actualArrival: actual ? formatDateTimeLocal(actual) : ''
          }))
          
          if (scheduled && actual) {
            const diffMinutes = (actual.getTime() - scheduled.getTime()) / (1000 * 60)
            if (diffMinutes <= 0) {
              setRatingData(prev => ({ ...prev, punctualityRating: 5, wasOnTime: true }))
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch ticket data:', error)
    } finally {
      setLoadingTicket(false)
    }
  }

  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Calculate customer service rating (2 + 1 + 1 + 1 = 5 max)
  const calculateCustomerServiceRating = () => {
    let rating = 0
    if (ratingData.communicatedClearly) rating += 2
    if (ratingData.professionalAttitude) rating += 1
    if (ratingData.respectfulToStaff) rating += 1
    if (ratingData.patientAndSolutionOriented) rating += 1
    return rating
  }

  // Calculate workmanship rating (2 + 1 + 1 + 1 = 5 max)
  const calculateWorkmanshipRating = () => {
    let rating = 0
    if (ratingData.workCompletedAsRequested) rating += 2
    if (ratingData.noShortcuts) rating += 1
    if (ratingData.cleanWorkArea) rating += 1
    if (ratingData.noReworkNeeded) rating += 1
    return rating
  }

  // Calculate site procedures rating (5 if overall compliant, or 2 + 1 + 1 + 1 = 5 max)
  const calculateSiteProceduresRating = () => {
    if (ratingData.followedSiteProcedures) return 5
    let rating = 0
    if (ratingData.permitToWorkFilledOut) rating += 2
    if (ratingData.loggedIntoJobCard) rating += 1
    if (ratingData.followedIsolationProcedures) rating += 1
    if (ratingData.followedWasteDisposal) rating += 1
    return rating
  }

  // Calculate PPE rating
  const calculatePPERating = () => {
    if (ratingData.ppeCompliant) return 5
    // Check if all required items are present
    const hasAllRequired = REQUIRED_PPE.every(
      item => ratingData.ppeChecklist[item as keyof typeof ratingData.ppeChecklist]
    )
    if (hasAllRequired) return 3
    return 0
  }

  // Calculate overall weighted percentage and star rating
  const calculateOverallRating = () => {
    const punctualityScore = (ratingData.punctualityRating / 5) * WEIGHTS.punctuality
    const ppeScore = (calculatePPERating() / 5) * WEIGHTS.ppeCompliance
    const customerServiceScore = (calculateCustomerServiceRating() / 5) * WEIGHTS.customerService
    const workmanshipScore = (calculateWorkmanshipRating() / 5) * WEIGHTS.workmanship
    const siteProceduresScore = (calculateSiteProceduresRating() / 5) * WEIGHTS.siteProcedures
    
    const totalPercentage = (punctualityScore + ppeScore + customerServiceScore + workmanshipScore + siteProceduresScore) * 100
    const starRating = Math.round((totalPercentage / 100) * 5)
    
    return { percentage: Math.round(totalPercentage), stars: Math.min(5, Math.max(0, starRating)) }
  }

  // Update ratings when checkboxes change
  useEffect(() => {
    const customerServiceRating = calculateCustomerServiceRating()
    const workmanshipRating = calculateWorkmanshipRating()
    const { percentage, stars } = calculateOverallRating()
    
    setRatingData(prev => ({
      ...prev,
      customerServiceRating,
      workmanshipRating,
      overallRating: stars,
      overallPercentage: percentage
    }))
  }, [
    ratingData.communicatedClearly, ratingData.professionalAttitude, 
    ratingData.respectfulToStaff, ratingData.patientAndSolutionOriented,
    ratingData.workCompletedAsRequested, ratingData.noShortcuts,
    ratingData.cleanWorkArea, ratingData.noReworkNeeded,
    ratingData.followedSiteProcedures, ratingData.permitToWorkFilledOut,
    ratingData.loggedIntoJobCard, ratingData.followedIsolationProcedures,
    ratingData.followedWasteDisposal, ratingData.ppeCompliant,
    ratingData.ppeChecklist, ratingData.punctualityRating
  ])

  // Punctuality auto-calculation
  useEffect(() => {
    if (ratingData.scheduledTime && ratingData.actualArrival) {
      const scheduled = new Date(ratingData.scheduledTime)
      const actual = new Date(ratingData.actualArrival)
      const diffMinutes = (actual.getTime() - scheduled.getTime()) / (1000 * 60)
      
      if (diffMinutes <= 0) {
        if (ratingData.punctualityRating !== 5) {
          setRatingData(prev => ({ ...prev, punctualityRating: 5, wasOnTime: true }))
        }
      } else if (ratingData.notifiedOfDelays) {
        if (ratingData.punctualityRating !== 3) {
          setRatingData(prev => ({ ...prev, punctualityRating: 3, wasOnTime: false }))
        }
      } else {
        if (ratingData.punctualityRating !== 0) {
          setRatingData(prev => ({ ...prev, punctualityRating: 0, wasOnTime: false }))
        }
      }
    }
  }, [ratingData.scheduledTime, ratingData.actualArrival, ratingData.notifiedOfDelays])

  const isPunctualityOnTime = () => {
    if (!ratingData.scheduledTime || !ratingData.actualArrival) return null
    const scheduled = new Date(ratingData.scheduledTime)
    const actual = new Date(ratingData.actualArrival)
    return actual.getTime() <= scheduled.getTime()
  }

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
    return (
      <div className="flex space-x-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating 
                ? 'text-yellow-400 fill-yellow-400' 
                : 'text-gray-200'
            }`}
          />
        ))}
      </div>
    )
  }

  const handleSubmit = async () => {
    if (!ratingData.ppeCompliant) {
      const missingRequired = REQUIRED_PPE.some(
        item => !ratingData.ppeChecklist[item as keyof typeof ratingData.ppeChecklist]
      )
      if (missingRequired && !ratingData.ppeComment) {
        toast.error('Please describe PPE non-compliance issues')
        setCurrentStep(2)
        return
      }
    }

    setIsSubmitting(true)
    try {
      const { percentage, stars } = calculateOverallRating()
      
      const submitData = {
        ...ratingData,
        punctualityRating: ratingData.punctualityRating || 0,
        customerServiceRating: calculateCustomerServiceRating(),
        workmanshipRating: calculateWorkmanshipRating(),
        overallRating: stars || 1,
        overallPercentage: percentage,
        signedInAtGate: ratingData.permitToWorkFilledOut, // Map to old field name
        beforeImages: [],
        afterImages: [],
        sendEmailToContractor: true
      }

      const response = await fetch(`/api/tickets/${ticketId}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })

      if (response.ok) {
        toast.success('Rating submitted and sent to contractor!')
        onRatingSubmitted()
        onOpenChange(false)
        resetForm()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to submit rating')
      }
    } catch (error) {
      console.error('Failed to submit rating:', error)
      toast.error('Failed to submit rating')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setCurrentStep(1)
    setTicketData(null)
    setRatingData({
      punctualityRating: 0,
      wasOnTime: false,
      notifiedOfDelays: false,
      preparedToStart: false,
      scheduledTime: '',
      actualArrival: '',
      ppeCompliant: false,
      ppeChecklist: {
        hardHat: false,
        safetyBoots: false,
        reflectiveVest: false,
        gloves: false,
        safetyGoggles: false,
        overalls: false
      },
      ppeComment: '',
      customerServiceRating: 0,
      communicatedClearly: false,
      professionalAttitude: false,
      respectfulToStaff: false,
      patientAndSolutionOriented: false,
      workmanshipRating: 0,
      workCompletedAsRequested: false,
      noShortcuts: false,
      cleanWorkArea: false,
      noReworkNeeded: false,
      followedSiteProcedures: false,
      permitToWorkFilledOut: false,
      loggedIntoJobCard: false,
      followedIsolationProcedures: false,
      followedWasteDisposal: false,
      overallRating: 0,
      overallPercentage: 0,
      additionalComments: '',
      beforeImages: [],
      afterImages: []
    })
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1: // Punctuality - 25%
        const isOnTime = isPunctualityOnTime()
        const isLate = isOnTime === false
        
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 text-blue-600">
                <Clock className="h-6 w-6" />
                <h3 className="text-lg font-semibold">Was the Contractor On Time?</h3>
              </div>
              <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">25% Weight</span>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col items-center space-y-2 py-4 bg-gray-50 rounded-lg">
                {renderStars(ratingData.punctualityRating, 'lg')}
                <span className="text-sm font-medium text-gray-600">
                  {ratingData.punctualityRating === 5 ? 'On Time - 5 Stars!' : 
                   ratingData.punctualityRating === 3 ? 'Late but Notified - 3 Stars' :
                   ratingData.punctualityRating === 0 && isLate ? 'Late without Notice - 0 Stars' :
                   'Awaiting time confirmation'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-3 rounded-lg ${ticketData?.scheduledArrival ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                  <Label className="text-xs text-gray-500">Scheduled Arrival</Label>
                  <p className="text-sm font-medium">
                    {ratingData.scheduledTime 
                      ? new Date(ratingData.scheduledTime).toLocaleString() 
                      : 'Not set'}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${ticketData?.onSiteTime ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                  <Label className="text-xs text-gray-500">Actual Arrival</Label>
                  <p className="text-sm font-medium">
                    {ratingData.actualArrival 
                      ? new Date(ratingData.actualArrival).toLocaleString() 
                      : 'Not set'}
                  </p>
                </div>
              </div>
              
              {isOnTime === true && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Contractor arrived on time!</p>
                    <p className="text-sm text-green-600">Full 5 stars awarded (25% of total)</p>
                  </div>
                </div>
              )}
              
              {isLate && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-2 text-yellow-700">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">Contractor arrived late</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="notifiedOfDelays"
                      checked={ratingData.notifiedOfDelays}
                      onCheckedChange={(checked) => setRatingData({...ratingData, notifiedOfDelays: !!checked})}
                    />
                    <Label htmlFor="notifiedOfDelays" className="cursor-pointer">
                      Did the contractor notify you of the delay in advance?
                    </Label>
                  </div>
                  <p className="text-xs text-yellow-600">
                    {ratingData.notifiedOfDelays 
                      ? '3 stars awarded for notifying' 
                      : '0 stars if delay was not communicated'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )
        
      case 2: // PPE Compliance - 25%
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 text-orange-600">
                <Shield className="h-6 w-6" />
                <h3 className="text-lg font-semibold">PPE Compliance</h3>
              </div>
              <span className="text-sm font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded">25% Weight</span>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <Checkbox 
                  id="ppeCompliant"
                  checked={ratingData.ppeCompliant}
                  onCheckedChange={(checked) => {
                    const isCompliant = !!checked
                    setRatingData({
                      ...ratingData, 
                      ppeCompliant: isCompliant,
                      ppeChecklist: isCompliant ? {
                        hardHat: true, safetyBoots: true, reflectiveVest: true,
                        gloves: true, safetyGoggles: true, overalls: true
                      } : ratingData.ppeChecklist
                    })
                  }}
                />
                <Label htmlFor="ppeCompliant" className="text-base font-medium cursor-pointer">
                  Overall PPE Compliant
                </Label>
              </div>
              
              {ratingData.ppeCompliant && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <span className="font-medium text-green-800">Full PPE Compliance - 5 Stars</span>
                  </div>
                  {renderStars(5, 'sm')}
                </div>
              )}
              
              {!ratingData.ppeCompliant && (
                <>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <Label className="text-sm font-medium mb-3 block text-red-800">
                      Check missing PPE items:
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'hardHat', label: 'Hard Hat', required: true },
                        { key: 'safetyBoots', label: 'Safety Boots', required: true },
                        { key: 'reflectiveVest', label: 'Reflective Vest', required: true },
                        { key: 'gloves', label: 'Gloves', required: false },
                        { key: 'safetyGoggles', label: 'Safety Goggles', required: false },
                        { key: 'overalls', label: 'Overalls', required: false }
                      ].map(item => (
                        <div key={item.key} className="flex items-center space-x-2">
                          <Checkbox 
                            id={item.key}
                            checked={!ratingData.ppeChecklist[item.key as keyof typeof ratingData.ppeChecklist]}
                            onCheckedChange={(checked) => setRatingData({
                              ...ratingData, 
                              ppeChecklist: {...ratingData.ppeChecklist, [item.key]: !checked}
                            })}
                          />
                          <Label htmlFor={item.key} className="text-sm cursor-pointer">
                            {item.label} {item.required && <span className="text-red-500">*</span>}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {REQUIRED_PPE.some(item => !ratingData.ppeChecklist[item as keyof typeof ratingData.ppeChecklist]) && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 text-red-700 mb-2">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-medium">Required PPE missing - 0 stars</span>
                      </div>
                      <Label className="text-sm">Description of non-compliance (required):</Label>
                      <Textarea 
                        placeholder="Describe PPE issues..."
                        value={ratingData.ppeComment}
                        onChange={(e) => setRatingData({...ratingData, ppeComment: e.target.value})}
                        rows={2}
                        className="mt-2"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )
        
      case 3: // Customer Service - 20%
        const csRating = calculateCustomerServiceRating()
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 text-pink-600">
                <Heart className="h-6 w-6" />
                <h3 className="text-lg font-semibold">Customer Service & Conduct</h3>
              </div>
              <span className="text-sm font-medium text-pink-600 bg-pink-50 px-2 py-1 rounded">20% Weight</span>
            </div>
            
            <div className="flex items-center justify-center space-x-4 py-4 bg-gray-50 rounded-lg">
              {renderStars(csRating, 'lg')}
              <span className="text-lg font-medium">{csRating}/5</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="communicatedClearly"
                    checked={ratingData.communicatedClearly}
                    onCheckedChange={(checked) => setRatingData({...ratingData, communicatedClearly: !!checked})}
                  />
                  <Label htmlFor="communicatedClearly" className="cursor-pointer">Communicated clearly</Label>
                </div>
                <span className="text-sm font-medium text-yellow-600">+2 ★</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="professionalAttitude"
                    checked={ratingData.professionalAttitude}
                    onCheckedChange={(checked) => setRatingData({...ratingData, professionalAttitude: !!checked})}
                  />
                  <Label htmlFor="professionalAttitude" className="cursor-pointer">Professional attitude</Label>
                </div>
                <span className="text-sm font-medium text-yellow-600">+1 ★</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="respectfulToStaff"
                    checked={ratingData.respectfulToStaff}
                    onCheckedChange={(checked) => setRatingData({...ratingData, respectfulToStaff: !!checked})}
                  />
                  <Label htmlFor="respectfulToStaff" className="cursor-pointer">Respectful to staff</Label>
                </div>
                <span className="text-sm font-medium text-yellow-600">+1 ★</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="patientAndSolutionOriented"
                    checked={ratingData.patientAndSolutionOriented}
                    onCheckedChange={(checked) => setRatingData({...ratingData, patientAndSolutionOriented: !!checked})}
                  />
                  <Label htmlFor="patientAndSolutionOriented" className="cursor-pointer">Patient and solution-oriented</Label>
                </div>
                <span className="text-sm font-medium text-yellow-600">+1 ★</span>
              </div>
            </div>
          </div>
        )
        
      case 4: // Workmanship - 20%
        const wmRating = calculateWorkmanshipRating()
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 text-green-600">
                <Wrench className="h-6 w-6" />
                <h3 className="text-lg font-semibold">Quality of Workmanship</h3>
              </div>
              <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded">20% Weight</span>
            </div>
            
            <div className="flex items-center justify-center space-x-4 py-4 bg-gray-50 rounded-lg">
              {renderStars(wmRating, 'lg')}
              <span className="text-lg font-medium">{wmRating}/5</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="workCompletedAsRequested"
                    checked={ratingData.workCompletedAsRequested}
                    onCheckedChange={(checked) => setRatingData({...ratingData, workCompletedAsRequested: !!checked})}
                  />
                  <Label htmlFor="workCompletedAsRequested" className="cursor-pointer">Work completed as requested</Label>
                </div>
                <span className="text-sm font-medium text-yellow-600">+2 ★</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="noShortcuts"
                    checked={ratingData.noShortcuts}
                    onCheckedChange={(checked) => setRatingData({...ratingData, noShortcuts: !!checked})}
                  />
                  <Label htmlFor="noShortcuts" className="cursor-pointer">No shortcuts or safety compromises</Label>
                </div>
                <span className="text-sm font-medium text-yellow-600">+1 ★</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="cleanWorkArea"
                    checked={ratingData.cleanWorkArea}
                    onCheckedChange={(checked) => setRatingData({...ratingData, cleanWorkArea: !!checked})}
                  />
                  <Label htmlFor="cleanWorkArea" className="cursor-pointer">Clean work area after completion</Label>
                </div>
                <span className="text-sm font-medium text-yellow-600">+1 ★</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="noReworkNeeded"
                    checked={ratingData.noReworkNeeded}
                    onCheckedChange={(checked) => setRatingData({...ratingData, noReworkNeeded: !!checked})}
                  />
                  <Label htmlFor="noReworkNeeded" className="cursor-pointer">No rework needed</Label>
                </div>
                <span className="text-sm font-medium text-yellow-600">+1 ★</span>
              </div>
            </div>
          </div>
        )
        
      case 5: // Site Procedures - 10%
        const spRating = calculateSiteProceduresRating()
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 text-purple-600">
                <ClipboardCheck className="h-6 w-6" />
                <h3 className="text-lg font-semibold">Site Procedures Compliance</h3>
              </div>
              <span className="text-sm font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">10% Weight</span>
            </div>
            
            <div className="flex items-center justify-center space-x-4 py-4 bg-gray-50 rounded-lg">
              {renderStars(spRating, 'lg')}
              <span className="text-lg font-medium">{spRating}/5</span>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <Checkbox 
                  id="followedSiteProcedures"
                  checked={ratingData.followedSiteProcedures}
                  onCheckedChange={(checked) => setRatingData({...ratingData, followedSiteProcedures: !!checked})}
                />
                <Label htmlFor="followedSiteProcedures" className="text-base font-medium cursor-pointer">
                  Overall Procedure Compliance (5 Stars)
                </Label>
              </div>
              
              {ratingData.followedSiteProcedures && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
                  <span className="font-medium text-green-800">Full compliance - 5 Stars</span>
                  {renderStars(5, 'sm')}
                </div>
              )}
              
              {!ratingData.followedSiteProcedures && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Or check individual items:</p>
                  
                  <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="permitToWorkFilledOut"
                        checked={ratingData.permitToWorkFilledOut}
                        onCheckedChange={(checked) => setRatingData({...ratingData, permitToWorkFilledOut: !!checked})}
                      />
                      <Label htmlFor="permitToWorkFilledOut" className="cursor-pointer">Permit to work filled out</Label>
                    </div>
                    <span className="text-sm font-medium text-yellow-600">+2 ★</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="loggedIntoJobCard"
                        checked={ratingData.loggedIntoJobCard}
                        onCheckedChange={(checked) => setRatingData({...ratingData, loggedIntoJobCard: !!checked})}
                      />
                      <Label htmlFor="loggedIntoJobCard" className="cursor-pointer">Logged into job card/app</Label>
                    </div>
                    <span className="text-sm font-medium text-yellow-600">+1 ★</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="followedIsolationProcedures"
                        checked={ratingData.followedIsolationProcedures}
                        onCheckedChange={(checked) => setRatingData({...ratingData, followedIsolationProcedures: !!checked})}
                      />
                      <Label htmlFor="followedIsolationProcedures" className="cursor-pointer">Followed isolation/lockout procedures</Label>
                    </div>
                    <span className="text-sm font-medium text-yellow-600">+1 ★</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="followedWasteDisposal"
                        checked={ratingData.followedWasteDisposal}
                        onCheckedChange={(checked) => setRatingData({...ratingData, followedWasteDisposal: !!checked})}
                      />
                      <Label htmlFor="followedWasteDisposal" className="cursor-pointer">Followed waste disposal rules</Label>
                    </div>
                    <span className="text-sm font-medium text-yellow-600">+1 ★</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
        
      case 6: // Comments
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Additional Comments</h3>
            <p className="text-sm text-gray-600">Share any additional feedback (optional)</p>
            
            <Textarea 
              placeholder="Enter your comments here..."
              value={ratingData.additionalComments}
              onChange={(e) => setRatingData({...ratingData, additionalComments: e.target.value})}
              rows={6}
              className="resize-none"
            />
          </div>
        )
        
      case 7: // Review & Submit
        const { percentage, stars } = calculateOverallRating()
        const ppeRating = calculatePPERating()
        const customerService = calculateCustomerServiceRating()
        const workmanship = calculateWorkmanshipRating()
        const siteProcedures = calculateSiteProceduresRating()
        
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 text-indigo-600">
              <CheckCircle className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Review & Submit</h3>
            </div>
            
            {/* Overall Score */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl p-6 text-center">
              <p className="text-sm opacity-90 mb-2">OVERALL SCORE</p>
              <div className="flex items-center justify-center space-x-4">
                <span className="text-5xl font-bold">{percentage}%</span>
                <div className="flex flex-col items-start">
                  {renderStars(stars, 'md')}
                  <span className="text-sm mt-1">{stars}/5 Stars</span>
                </div>
              </div>
            </div>
            
            {/* Breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span>Punctuality (25%)</span>
                </div>
                <div className="flex items-center space-x-2">
                  {renderStars(ratingData.punctualityRating, 'sm')}
                  <span className="text-sm font-medium w-8">{ratingData.punctualityRating}/5</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-orange-600" />
                  <span>PPE Compliance (25%)</span>
                </div>
                <div className="flex items-center space-x-2">
                  {renderStars(ppeRating, 'sm')}
                  <span className="text-sm font-medium w-8">{ppeRating}/5</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-pink-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Heart className="h-4 w-4 text-pink-600" />
                  <span>Customer Service (20%)</span>
                </div>
                <div className="flex items-center space-x-2">
                  {renderStars(customerService, 'sm')}
                  <span className="text-sm font-medium w-8">{customerService}/5</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Wrench className="h-4 w-4 text-green-600" />
                  <span>Workmanship (20%)</span>
                </div>
                <div className="flex items-center space-x-2">
                  {renderStars(workmanship, 'sm')}
                  <span className="text-sm font-medium w-8">{workmanship}/5</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <ClipboardCheck className="h-4 w-4 text-purple-600" />
                  <span>Site Procedures (10%)</span>
                </div>
                <div className="flex items-center space-x-2">
                  {renderStars(siteProcedures, 'sm')}
                  <span className="text-sm font-medium w-8">{siteProcedures}/5</span>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <h4 className="font-medium text-green-800">Ready to Submit</h4>
                  <p className="text-sm text-green-700">Rating will be sent to contractor via email.</p>
                </div>
              </div>
            </div>
          </div>
        )
        
      default:
        return null
    }
  }

  if (loadingTicket) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Rate Contractor Service</span>
            <span className="text-sm font-normal text-gray-500">
              Step {currentStep} of {totalSteps}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        <ScrollArea className="max-h-[50vh] pr-4">
          {renderStep()}
        </ScrollArea>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : onOpenChange(false)}
          >
            {currentStep === 1 ? 'Cancel' : 'Previous'}
          </Button>
          
          {currentStep < totalSteps ? (
            <Button onClick={() => setCurrentStep(currentStep + 1)}>
              Next
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'Submitting...' : 'Save & Send Rating'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
