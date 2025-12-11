declare module 'paynow' {
  export class Paynow {
    constructor(integrationId: string, integrationKey: string)
    resultUrl: string
    returnUrl: string
    createPayment(reference: string, email: string): Payment
    sendMobile(payment: Payment, phone: string, method: string): Promise<PaynowResponse>
    send(payment: Payment): Promise<PaynowResponse>
    pollTransaction(pollUrl: string): Promise<PaynowResponse>
    verifyHash(data: Record<string, unknown>, hash: string): boolean
  }

  export interface Payment {
    add(item: string, amount: number): void
  }

  export interface PaynowResponse {
    success: boolean
    error?: string
    instructions?: string
    pollUrl?: string
    redirectUrl?: string
    status?: string
    paid?: boolean
    reference?: string
    paynowReference?: string
    hash?: string
    amount?: number
  }
}
