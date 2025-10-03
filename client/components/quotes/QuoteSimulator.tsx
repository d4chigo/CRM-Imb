"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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

type PaymentMode = 'fija' | 'flexible'

function generateAmortization({ principal, periods, teaPct, mode = 'fija', targetPayment = 500 }: { principal: number; periods: number; teaPct: number; mode?: PaymentMode; targetPayment?: number; }) {
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
  const schedule: Row[] = []
  for (let i=1;i<=periods;i++) {
    const interest = TEM === 0 ? 0 : remaining * TEM
    let cuotaBase = cuotaBaseAnualidad
    if (mode === 'flexible') {
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
    const monthlyPayment = cuotaBase
    const debtEnd = Math.max(0, remaining - amortization)
    schedule.push({ period: i, debtStart: remaining, interest, amortization, desgravamen: 0, otrosCargos: 0, itf: 0, monthlyPayment, debtEnd })
    remaining = debtEnd
    totalInterest += interest
  }
  const totals = {
    monthlyPayment: schedule[0]?.monthlyPayment || 0,
    totalInterest,
    totalDesgravamen: 0,
    totalITF: 0,
    totalToPay: principal + totalInterest
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
  const [paymentMode, setPaymentMode] = React.useState<PaymentMode>('fija')
  const [initial, setInitial] = React.useState<string>('0')
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
    const gross = Number(amount||0)
    const ini = Number(initial||0)
    if (ini < 0 || ini > gross) { toast({ title:'Inicial inválido', description:'Debe ser >= 0 y <= Monto', variant:'destructive' }); return }
    const p = Math.max(0, gross - ini)
    const n = Number(months||0)
    const t = Number(tea||0)
    const tp = Number(targetPayment||500)
    if (!clientName.trim()) { toast({ title:'Falta cliente', variant:'destructive' }); return }
    if (!(p>0) || !(n>0)) { toast({ title:'Monto/plazo inválidos', variant:'destructive' }); return }
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
    const header = ['Cuota','#','Saldo Inicial','Interés','Amortización','Cuota Total','Saldo Final']
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

  function buildTableHtml() {
    if (!results) return ''
    const headers = ['#','Saldo Inicial','Interés','Amortización','Cuota Total','Saldo Final']
    const rows = results.schedule.map(r => `
      <tr>
        <td>${r.period}</td>
        <td>${r.debtStart.toFixed(2)}</td>
        <td>${r.interest.toFixed(2)}</td>
        <td>${r.amortization.toFixed(2)}</td>
        <td>${r.monthlyPayment.toFixed(2)}</td>
        <td>${r.debtEnd.toFixed(2)}</td>
      </tr>`).join('')
    return `
      <table border="1" cellspacing="0" cellpadding="4">
        <thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>`
  }

  function downloadExcel() {
    if (!results) return
    const summary = `
      <table>
        <tr><td>Cliente</td><td>${clientName}</td></tr>
        <tr><td>Telefono</td><td>${phone||''}</td></tr>
        <tr><td>Moneda</td><td>${currency}</td><td>Monto</td><td>${amount}</td></tr>
        <tr><td>Plazo (meses)</td><td>${months}</td><td>TEA (%)</td><td>${tea}</td></tr>
        <tr><td>Cuota aprox</td><td>${results.totals.monthlyPayment.toFixed(2)}</td><td>Total a Pagar</td><td>${results.totals.totalToPay.toFixed(2)}</td></tr>
      </table>
      <br/>
    `
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${summary}${buildTableHtml()}</body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const name = (clientName || 'cotizacion').replace(/[^a-zA-Z0-9_-]+/g,'_')
    a.href = url
    a.download = `${name}_plantilla.xls`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function printPDF() {
    if (!results) return
    const summary = `
      <div style="font-family:Arial, sans-serif;">
        <h2 style="margin:0 0 8px 0;">Plantilla de Amortización</h2>
        <div><strong>Cliente:</strong> ${clientName}</div>
        <div><strong>Teléfono:</strong> ${phone||''}</div>
        <div><strong>Monto:</strong> ${amount} ${currency} · <strong>Plazo:</strong> ${months} · <strong>TEA:</strong> ${tea}%</div>
        <div><strong>Cuota aprox:</strong> ${results.totals.monthlyPayment.toFixed(2)} · <strong>Total a Pagar:</strong> ${results.totals.totalToPay.toFixed(2)}</div>
        <hr/>
      </div>
    `
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Plantilla</title>
      <style>body{font-family:Arial, sans-serif; padding:16px} table{width:100%; border-collapse:collapse} th,td{border:1px solid #ccc; padding:4px; font-size:12px} th{background:#f2f2f2;}</style>
    </head><body>${summary}${buildTableHtml()}<script>window.onload=()=>{window.print(); setTimeout(()=>window.close(),300);}</script></body></html>`
    const w = window.open('', '_blank')
    if (!w) return
    w.document.open()
    w.document.write(html)
    w.document.close()
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
  // Cuota fija (constante) calculada automáticamente con TEA (anualidad) sobre Saldo Inicial
  const fixedPaymentComputed = React.useMemo(() => {
    const gross = Number(amount||0)
    const ini = Number((initial||'0'))
    const principal = Math.max(0, gross - ini)
    const n = Number(months||0)
    if (!(principal>0) || !(n>0)) return 0
    const t = Number(tea||0)
    const tem = calcTEM(t)
    if (tem === 0) return principal / n
    const factor = tem / (1 - Math.pow(1 + tem, -n))
    return principal * factor
  }, [amount, initial, months, tea])

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
              {/* Teléfono se muestra en resumen si se selecciona, pero no hay campo separado de búsqueda */}
              <div>
                <label className="text-xs text-gray-600">Nombre del Cliente</label>
                <Input value={clientName} onChange={(e)=> setClientName(e.target.value)} placeholder="Ej. Inversiones Palma Real S.A.C." />
              </div>
              <div>
                <label className="text-xs text-gray-600">Monto (PEN)</label>
                <Input type="number" min="100" step="100" value={amount} onChange={(e)=> setAmount(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Inicial (PEN)</label>
                <Input type="number" min="0" step="1" value={initial} onChange={(e)=> setInitial(e.target.value)} />
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
                    <SelectValue placeholder="Cuota fija" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 text-gray-900 shadow-lg">
                    <SelectItem value="fija">Cuota fija (constante)</SelectItem>
                    <SelectItem value="flexible">Cuota flexible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {paymentMode === 'flexible' && (
                <div>
                  <label className="text-xs text-gray-600">Cuota objetivo (PEN)</label>
                  <Input type="number" min="1" step="1" value={targetPayment} onChange={(e)=> setTargetPayment(e.target.value)} />
                  <div className="text-[11px] text-gray-500">Por defecto 500. En el último mes se liquida el saldo.</div>
                </div>
              )}
              {paymentMode === 'fija' && (
                <div>
                  <label className="text-xs text-gray-600">Cuota fija (constante)</label>
                  <Input value={fixedPaymentComputed ? fixedPaymentComputed.toFixed(2) : ''} readOnly />
                  <div className="text-[11px] text-gray-500">Se calcula con TEA y Saldo Inicial = Monto - Inicial.</div>
                </div>
              )}
              <div className="pt-2 flex flex-wrap gap-2 items-center">
                <Button type="submit" variant="brand">Generar plantilla</Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" disabled={!results}>Exportar</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-white border border-gray-200">
                    <DropdownMenuItem onClick={downloadCSV}>CSV</DropdownMenuItem>
                    <DropdownMenuItem onClick={downloadExcel}>Excel (.xls)</DropdownMenuItem>
                    <DropdownMenuItem onClick={printPDF}>PDF (imprimir)</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button type="button" variant="outline" disabled={loading || !results} onClick={onSave}>Guardar</Button>
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
