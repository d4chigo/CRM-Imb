const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

function authHeaders(): Record<string,string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

export interface QuotePayload {
  cliente_nombre: string
  moneda?: string // 'PEN' por defecto en backend
  tea?: number    // %
  tem?: number    // % (si no se envía, backend la calcula)
  s_desgravamen_pct?: number
  itf_pct?: number
  monto: number
  plazo_meses: number
  cuota_mensual: number
  total_interes: number
  total_pagar: number
  amortizacion?: any[]
  amortizacion_json?: any
}

export async function getQuoteByContact(contactoId: number) {
  const res = await fetch(`${API_BASE_URL}/api/quotes/by-contact/${contactoId}`, { headers: authHeaders(), credentials:'include' })
  if (!res.ok) throw new Error('Error consultando cotización del contacto')
  return (await res.json()).data
}

export async function upsertQuoteByContact(contactoId: number, payload: QuotePayload) {
  const res = await fetch(`${API_BASE_URL}/api/quotes/by-contact/${contactoId}`, { method:'PUT', headers: authHeaders(), body: JSON.stringify(payload), credentials:'include' })
  if (!res.ok) {
    let detail = ''
    try { const j = await res.json(); detail = j?.message || '' } catch {}
    throw new Error(detail || 'Error guardando cotización')
  }
  return (await res.json()).data
}

export async function deleteQuoteByContact(contactoId: number) {
  const res = await fetch(`${API_BASE_URL}/api/quotes/by-contact/${contactoId}`, { method:'DELETE', headers: authHeaders(), credentials:'include' })
  if (!res.ok) throw new Error('Error eliminando cotización')
}
