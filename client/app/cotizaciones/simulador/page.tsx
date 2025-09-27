"use client"

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { QuoteSimulator } from '@/components/quotes/QuoteSimulator'

export default function QuoteSimulatorPage() {
  const params = useSearchParams()
  const contactoId = Number(params.get('contactoId') || '')
  const clienteNombre = params.get('nombre') || undefined
  const validId = Number.isFinite(contactoId) && contactoId > 0 ? contactoId : undefined
  return (
    <div className="p-4 sm:p-6">
      <QuoteSimulator contactoId={validId} clienteNombre={clienteNombre} />
    </div>
  )
}
