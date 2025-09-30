"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { upsertQuoteByContact, getQuoteByContact, QuotePayload } from "@/lib/quotes"
import { fetchContacts, ContactDTO } from "@/lib/contacts"
import { createOpportunity } from "@/lib/opportunities"

export interface QuoteSimulatorProps {
  contactoId?: number
  clienteNombre?: string
}

type Row = {
  period: number
  debtStart: number
  interest: number
  amortization: number
  desgravamen: number
  otrosCargos: number
  itf: number
  monthlyPayment: number
  debtEnd: number
}

function calcTEM(teaPct: number) { return Math.pow(1 + teaPct/100, 1/12) - 1 }

function formatCurrencyPEN(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)
}

type PaymentMode = 'anualidad' | 'fija' | 'flexible'

function generateAmortization({ principal, periods, teaPct, sDesgravamenPct = 0, itfRate = 0.00005, mode = 'anualidad', targetPayment = 500 }: { principal: number; periods: number; teaPct: number; sDesgravamenPct?: number; itfRate?: number; mode?: PaymentMode; targetPayment?: number; }) {
  const TEM = calcTEM(teaPct)
  let cuotaBaseAnualidad = 0
  if (TEM === 0) {
    // Sin interés: amortización uniforme
    cuotaBaseAnualidad = principal / periods
  } else {
    const factor = TEM / (1 - Math.pow(1 + TEM, -periods))
    cuotaBaseAnualidad = principal * factor
  }
  let remaining = principal
  let totalInterest = 0
  let totalDesgravamen = 0
  const schedule: Row[] = []
  for (let i=1;i<=periods;i++) {
    const interest = TEM === 0 ? 0 : remaining * TEM
    const desgravamen = remaining * (sDesgravamenPct/100)
    let cuotaBase = cuotaBaseAnualidad
    if (mode === 'fija') {
      // Cuota fija objetivo para los primeros (periods-1), el último liquida todo
      if (i < periods) {
        // Asegurar al menos cubrir intereses
        const minPayment = Math.max(targetPayment, interest + 1)
        cuotaBase = Math.min(minPayment, remaining + interest) // no sobrepagar más que liquidar
      } else {
        cuotaBase = remaining + interest // liquidación final
      }
    } else if (mode === 'flexible') {
      if (i < periods) {
        const mult = 0.7 + Math.random() * 0.6 // 0.7x a 1.3x
        const proposed = targetPayment * mult
        const minPayment = Math.max(proposed, interest + 1)
        cuotaBase = Math.min(minPayment, remaining + interest)
      } else {
        cuotaBase = remaining + interest
      }
    }
    const amortization = Math.max(0, cuotaBase - interest)
    const totalBeforeITF = cuotaBase + desgravamen + 0 /*otrosCargos*/
    const itf = totalBeforeITF * itfRate
    const monthlyPayment = totalBeforeITF + itf
    const debtEnd = Math.max(0, remaining - amortization)
    schedule.push({ period: i, debtStart: remaining, interest, amortization, desgravamen, otrosCargos: 0, itf, monthlyPayment, debtEnd })
    remaining = debtEnd
    totalInterest += interest
    totalDesgravamen += desgravamen
  }
  const totals = {
    monthlyPayment: schedule[0]?.monthlyPayment || 0,
    totalInterest,
    totalDesgravamen,
    totalITF: schedule.reduce((s,r)=> s + r.itf, 0),
    totalToPay: principal + schedule.reduce((s,r)=> s + r.interest + r.desgravamen + r.itf, 0)
  }
  return { schedule, totals }
}

export function QuoteSimulator({ contactoId, clienteNombre }: QuoteSimulatorProps) {
  const { toast } = useToast()
  const [clientName, setClientName] = React.useState<string>(clienteNombre || "")
  const [phone, setPhone] = React.useState<string>("")
  const [contactSearch, setContactSearch] = React.useState<string>("")
  const [suggestions, setSuggestions] = React.useState<ContactDTO[]>([])
  const [searching, setSearching] = React.useState<boolean>(false)
  const [selectedContactId, setSelectedContactId] = React.useState<number|undefined>(contactoId)
  const [amount, setAmount] = React.useState<string>("17000")
  const [months, setMonths] = React.useState<string>("24")
  const [tea, setTea] = React.useState<string>("18")
  const [currency, setCurrency] = React.useState<'PEN'|'USD'>("PEN")
  const [paymentMode, setPaymentMode] = React.useState<PaymentMode>('anualidad')
  const [targetPayment, setTargetPayment] = React.useState<string>('500')
  const [loading, setLoading] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const [results, setResults] = React.useState<{ schedule: Row[]; totals: { monthlyPayment: number; totalInterest: number; totalDesgravamen: number; totalITF: number; totalToPay: number } } | null>(null)

  React.useEffect(() => {
    // Precargar si tenemos contactoId
    (async()=>{
      if (!contactoId) return
      try {
        const row = await getQuoteByContact(contactoId)
        if (row) {
          setClientName(row.cliente_nombre || clientName)
          setAmount(String(row.monto))
          setMonths(String(row.plazo_meses))
          setTea(String(row.tea))
          setCurrency((row.moneda || 'PEN'))
          try {
            const schedule = Array.isArray(row.amortizacion_json) ? row.amortizacion_json : JSON.parse(row.amortizacion_json || '[]')
            setResults({
              schedule,
              totals: {
                monthlyPayment: Number(row.cuota_mensual || 0),
                totalInterest: Number(row.total_interes || 0),
                totalDesgravamen: schedule.reduce((s:any,r:any)=> s + (r.desgravamen||0), 0),
                totalITF: schedule.reduce((s:any,r:any)=> s + (r.itf||0), 0),
                totalToPay: Number(row.total_pagar || 0),
              }
            })
          } catch {}
        }
      } catch {}
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactoId])

  // Unified lookup by name/apellido or phone (>=3 chars or >=6 digits)
  React.useEffect(() => {
    const q = contactSearch.trim()
    const digits = q.replace(/\D/g, '')
    if ((q.length < 3) && (digits.length < 6)) { setSuggestions([]); return }
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const page = await fetchContacts({ search: q })
        if (cancelled) return
        setSuggestions(page.data.slice(0, 8))
      } catch {
        if (!cancelled) setSuggestions([])
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [contactSearch])

  function onPickContact(c: ContactDTO) {
    setClientName([c.nombre, c.apellido].filter(Boolean).join(' '))
    setPhone(c.telefono || '')
    if (c.id) setSelectedContactId(c.id)
    setContactSearch('')
    setSuggestions([])
  }

  function onGenerate(e?: React.FormEvent) {
    e?.preventDefault()
    const p = Number(amount||0)
    const n = Number(months||0)
    const t = Number(tea||0)
    const tp = Number(targetPayment||500)
    if (!clientName.trim()) { toast({ title:'Falta cliente', variant:'destructive' }); return }
    if (!(p>0) || !(n>0)) { toast({ title:'Monto/plazo inválidos', variant:'destructive' }); return }
    if (paymentMode !== 'anualidad') {
      const firstInterest = p * calcTEM(t)
      if (tp <= firstInterest) {
        toast({ title:'Cuota objetivo muy baja', description:'La cuota debe cubrir al menos los intereses del primer periodo.', variant:'destructive' })
      }
    }
    const data = generateAmortization({ principal: p, periods: n, teaPct: t, mode: paymentMode, targetPayment: tp })
    setResults(data)
  }

  async function onSave() {
    const targetId = selectedContactId || contactoId
    if (!targetId) { toast({ title:'Falta contacto', description:'Vincula un contacto para guardar', variant:'destructive' }); return }
    if (!results) { toast({ title:'Primero genera la plantilla', variant:'destructive' }); return }
    setLoading(true)
    try {
      const payload: QuotePayload = {
        cliente_nombre: clientName.trim(),
        moneda: currency,
        tea: Number(tea||18),
        monto: Number(amount||0),
        plazo_meses: Number(months||0),
        cuota_mensual: results.totals.monthlyPayment,
        total_interes: results.totals.totalInterest,
        total_pagar: results.totals.totalToPay,
        amortizacion: results.schedule,
      }
      await upsertQuoteByContact(targetId, payload)
      toast({ title:'Cotización guardada', description: clientName })
    } catch(e:any) {
      toast({ title:'Error', description: e.message || 'No se pudo guardar', variant:'destructive' })
    } finally { setLoading(false) }
  }

  function downloadCSV() {
    if (!results) return
    const sep = ','
    const safe = (v: any) => {
      const s = String(v ?? '')
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"'
      return s
    }
    const header = ['Cuota','#','Saldo Inicial','Interés','Amortización','S. Desgravamen','Otros Cargos','ITF','Cuota Total','Saldo Final']
    const lines: string[] = []
    lines.push(`Cliente,${safe(clientName)}`)
    lines.push(`Telefono,${safe(phone || '')}`)
    lines.push(`Moneda,${safe(currency)},Monto,${safe(amount)},Plazo (meses),${safe(months)},TEA (%),${safe(tea)}`)
    lines.push(`Cuota aprox,${safe(results.totals.monthlyPayment)},Total Intereses,${safe(results.totals.totalInterest)},Total a Pagar,${safe(results.totals.totalToPay)}`)
    lines.push('')
    lines.push(header.join(sep))
    for (const r of results.schedule) {
      lines.push([
        safe(r.period),
        safe(r.period),
        safe(r.debtStart.toFixed(2)),
        safe(r.interest.toFixed(2)),
        safe(r.amortization.toFixed(2)),
        safe((r.desgravamen||0).toFixed(2)),
        safe((r.otrosCargos||0).toFixed(2)),
        safe((r.itf||0).toFixed(2)),
        safe(r.monthlyPayment.toFixed(2)),
        safe(r.debtEnd.toFixed(2))
      ].join(sep))
    }
    const csv = lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const name = (clientName || 'cotizacion').replace(/[^a-zA-Z0-9_-]+/g,'_')
    a.href = url
    a.download = `${name}_plantilla.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function onSendToPipeline() {
    const targetId = selectedContactId || contactoId
    if (!targetId) { toast({ title:'Vincula un contacto', variant:'destructive' }); return }
    if (!results) { toast({ title:'Primero genera la plantilla', variant:'destructive' }); return }
    setSending(true)
    try {
      await createOpportunity({
        contactoId: targetId,
        servicioId: 1,
        etapaId: 'contacto_inicial',
        nombreCliente: (clientName || 'Cliente').trim(),
        valorUsd: Number(amount || 0),
        probabilidad: 10,
        fechaCierre: undefined,
        telefono: undefined,
        email: undefined,
      })
      toast({ title:'Oportunidad creada en pipeline', description: clientName })
    } catch(e:any) {
      toast({ title:'Error enviando al pipeline', description: e.message || 'No se pudo crear la oportunidad', variant:'destructive' })
    } finally { setSending(false) }
  }

  const TEM = calcTEM(Number(tea||18))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Apartado de Cotización</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onGenerate} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-3">
              <div className="relative">
                <label className="text-xs text-gray-600">Buscar contacto (Nombre, Apellido o Teléfono)</label>
                <Input value={contactSearch} onChange={(e)=> setContactSearch(e.target.value)} placeholder="Ej. Juan Pérez o 987654321" />
                {suggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded shadow-sm max-h-56 overflow-auto">
                    {suggestions.map(c => (
                      <button key={c.id || c.telefono || c.nombre}
                        type="button"
                        onClick={()=> onPickContact(c)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50">
                        <div className="font-medium text-sm">{[c.nombre, c.apellido].filter(Boolean).join(' ')}</div>
                        <div className="text-[11px] text-gray-500">{c.telefono || '—'} {c.email ? `· ${c.email}` : ''}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-600">Teléfono</label>
                <Input value={phone} readOnly placeholder="Ej. 987654321" />
              </div>
              <div>
                <label className="text-xs text-gray-600">Nombre del Cliente</label>
                <Input value={clientName} onChange={(e)=> setClientName(e.target.value)} placeholder="Ej. Inversiones Palma Real S.A.C." />
              </div>
              <div>
                <label className="text-xs text-gray-600">Monto (PEN)</label>
                <Input type="number" min="100" step="100" value={amount} onChange={(e)=> setAmount(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Plazo (Meses)</label>
                <Input type="number" min="1" max="360" step="1" value={months} onChange={(e)=> setMonths(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Moneda</label>
                <Select value={currency} onValueChange={(v)=> setCurrency(v as any)}>
                  <SelectTrigger className="w-full bg-white border border-gray-300 text-gray-800">
                    <SelectValue placeholder="PEN" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 text-gray-900 shadow-lg">
                    <SelectItem value="PEN">PEN (S/)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-600">TEA (%)</label>
                <Input type="number" min="0" max="100" step="0.01" value={tea} onChange={(e)=> setTea(e.target.value)} />
                <div className="text-[11px] text-gray-500">TEM aprox: {(TEM*100).toFixed(4)}%</div>
              </div>
              <div>
                <label className="text-xs text-gray-600">Tipo de Cuota</label>
                <Select value={paymentMode} onValueChange={(v)=> setPaymentMode(v as PaymentMode)}>
                  <SelectTrigger className="w-full bg-white border border-gray-300 text-gray-800">
                    <SelectValue placeholder="Anualidad" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 text-gray-900 shadow-lg">
                    <SelectItem value="anualidad">Anualidad (Francesa)</SelectItem>
                    <SelectItem value="fija">Cuota fija objetivo</SelectItem>
                    <SelectItem value="flexible">Cuota flexible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(paymentMode === 'fija' || paymentMode === 'flexible') && (
                <div>
                  <label className="text-xs text-gray-600">Cuota objetivo (PEN)</label>
                  <Input type="number" min="1" step="1" value={targetPayment} onChange={(e)=> setTargetPayment(e.target.value)} />
                  <div className="text-[11px] text-gray-500">Por defecto 500. En el último mes se liquida el saldo.</div>
                </div>
              )}
              <div className="pt-2 flex gap-2">
                <Button type="submit" variant="brand">Generar plantilla</Button>
                <Button type="button" variant="outline" disabled={loading} onClick={onSave}>Guardar</Button>
                <Button type="button" variant="outline" disabled={!results} onClick={downloadCSV}>Descargar CSV</Button>
                {contactoId ? (
                  <Button type="button" variant="outline" disabled={sending || !results} onClick={onSendToPipeline}>
                    {sending ? 'Enviando…' : 'Enviar al pipeline'}
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="lg:col-span-2 space-y-4">
              {!results ? (
                <div className="text-sm text-gray-500">Ingresa los datos y genera la plantilla.</div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50 rounded border border-indigo-200">
                    <h3 className="text-base font-semibold text-indigo-800 mb-2">{clientName}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="p-3 bg-white rounded border">
                        <div className="text-[11px] text-gray-500">Monto Base</div>
                        <div className="font-bold text-indigo-700">{formatCurrencyPEN(Number(amount||0))}</div>
                      </div>
                      <div className="p-3 bg-white rounded border">
                        <div className="text-[11px] text-gray-500">Plazo (meses)</div>
                        <div className="font-bold text-indigo-700">{Number(months||0)}</div>
                      </div>
                      <div className="p-3 bg-white rounded border">
                        <div className="text-[11px] text-gray-500">Teléfono</div>
                        <div className="font-bold text-indigo-700">{phone || '—'}</div>
                      </div>
                      <div className="p-3 bg-white rounded border">
                        <div className="text-[11px] text-gray-500">Cuota Mensual (Aprox)</div>
                        <div className="font-bold text-green-700">{formatCurrencyPEN(results.totals.monthlyPayment)}</div>
                      </div>
                      <div className="p-3 bg-indigo-200 rounded border border-indigo-300">
                        <div className="text-[11px] text-indigo-900 font-medium">Total a Pagar</div>
                        <div className="font-extrabold text-indigo-900 text-lg">{formatCurrencyPEN(results.totals.totalToPay)}</div>
                      </div>
                    </div>
                    <div className="text-[12px] text-gray-600 mt-2">
                      <div>Total Intereses: {formatCurrencyPEN(results.totals.totalInterest)}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Plantilla de Amortización</h3>
                    <div className="border rounded bg-white max-h-[380px] overflow-y-auto">
                      <table className="min-w-full table-auto">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs text-gray-600">#</th>
                            <th className="px-3 py-2 text-left text-xs text-gray-600">Saldo Inicial</th>
                            <th className="px-3 py-2 text-left text-xs text-gray-600">Interés</th>
                            <th className="px-3 py-2 text-left text-xs text-gray-600">Amortización</th>
                            <th className="px-3 py-2 text-left text-xs text-gray-600">Cargos</th>
                            <th className="px-3 py-2 text-left text-xs text-gray-600">Cuota Total</th>
                            <th className="px-3 py-2 text-left text-xs text-gray-600">Saldo Final</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.schedule.map((r)=> (
                            <tr key={r.period} className="border-t text-[12px]">
                              <td className="px-3 py-1">{r.period}</td>
                              <td className="px-3 py-1">{formatCurrencyPEN(r.debtStart)}</td>
                              <td className="px-3 py-1 text-red-600">{formatCurrencyPEN(r.interest)}</td>
                              <td className="px-3 py-1 text-green-600">{formatCurrencyPEN(r.amortization)}</td>
                              <td className="px-3 py-1">{formatCurrencyPEN(r.desgravamen + r.otrosCargos + r.itf)}</td>
                              <td className="px-3 py-1 font-semibold bg-indigo-50">{formatCurrencyPEN(r.monthlyPayment)}</td>
                              <td className="px-3 py-1">{formatCurrencyPEN(r.debtEnd)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
