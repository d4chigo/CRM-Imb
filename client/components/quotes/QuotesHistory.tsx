"use client"

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { fetchContacts, ContactDTO } from '@/lib/contacts'
import { getQuoteByContact } from '@/lib/quotes'

interface RowItem {
  contact: ContactDTO
  quote: any | null
}

function monthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }

export function QuotesHistory() {
  const [search, setSearch] = React.useState('')
  const [month, setMonth] = React.useState<string>(monthKey(new Date()))
  const [loading, setLoading] = React.useState(false)
  const [rows, setRows] = React.useState<RowItem[]>([])
  const [errorMsg, setErrorMsg] = React.useState<string>('')
  const router = useRouter()

  async function load() {
    setLoading(true)
    setErrorMsg('')
    try {
      // traer contactos (paginado básico)
      const contactsPage = await fetchContacts({ search, page: 1, pageSize: 50 })
      const contacts = contactsPage.data || []
      const results: RowItem[] = []
      await Promise.all(contacts.map(async (c) => {
        try {
          if (!c.id) return
          const q = await getQuoteByContact(c.id)
          results.push({ contact: c, quote: q })
        } catch(_) {
          results.push({ contact: c, quote: null })
        }
      }))
      setRows(results.filter(r => !!r.quote))
    } catch (e:any) {
      const msg: string = (e?.message || '').toString()
      const m = msg.match(/\|STATUS:(\d{3})$/)
      const status = m ? m[1] : ''
      if (status === '401') {
        // Token expirado: limpiar y redirigir a login
        try { localStorage.removeItem('authToken') } catch {}
        setErrorMsg('Sesión expirada. Redirigiendo a inicio de sesión…')
        setTimeout(() => router.push('/login'), 300)
        return
      }
      setErrorMsg(msg.replace(/\|STATUS:\d{3}$/, '') || 'Error cargando historial')
    } finally { setLoading(false) }
  }

  React.useEffect(() => { const t = setTimeout(load, 300); return ()=> clearTimeout(t) }, [search, month])

  const filtered = React.useMemo(() => {
    if (!rows.length) return []
    const [y, m] = month.split('-').map(Number)
    return rows.filter(r => {
      const q = r.quote
      if (!q) return false
      const ts = q.actualizado_en || q.creado_en || q.updated_at || q.created_at
      if (!ts) return true
      const d = new Date(ts)
      return d.getFullYear() === y && (d.getMonth()+1) === m
    })
  }, [rows, month])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-gray-600">Buscar (nombre o teléfono)</label>
          <Input value={search} onChange={(e)=> setSearch(e.target.value)} placeholder="Ej. Pérez o 987" />
        </div>
        <div>
          <label className="text-xs text-gray-600">Mes</label>
          <Input type="month" value={month} onChange={(e)=> setMonth(e.target.value)} />
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>{loading ? 'Cargando…' : 'Actualizar'}</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Plantillas (Mes actual)</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMsg && (
            <div className="mb-2 text-sm text-red-600">{errorMsg}</div>
          )}
          {!filtered.length ? (
            <div className="text-sm text-gray-500">No hay plantillas guardadas para este mes con el filtro actual.</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-2 pr-3">Cliente</th>
                    <th className="py-2 pr-3">Teléfono</th>
                    <th className="py-2 pr-3">Monto</th>
                    <th className="py-2 pr-3">Plazo</th>
                    <th className="py-2 pr-3">TEA</th>
                    <th className="py-2 pr-3">Cuota</th>
                    <th className="py-2 pr-3">Total</th>
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(({ contact, quote }) => (
                    <tr key={contact.id} className="border-b">
                      <td className="py-2 pr-3 font-medium">{quote?.cliente_nombre || contact.nombre}</td>
                      <td className="py-2 pr-3">{contact.telefono || '—'}</td>
                      <td className="py-2 pr-3">S/ {Number(quote?.monto || 0).toLocaleString('es-PE')}</td>
                      <td className="py-2 pr-3">{quote?.plazo_meses || '—'}</td>
                      <td className="py-2 pr-3">{quote?.tea ?? '—'}%</td>
                      <td className="py-2 pr-3">S/ {Number(quote?.cuota_mensual || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                      <td className="py-2 pr-3">S/ {Number(quote?.total_pagar || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                      <td className="py-2 pr-3">{(quote?.actualizado_en || quote?.creado_en || quote?.updated_at || quote?.created_at || '').toString().replace('T',' ').replace('Z','')}</td>
                      <td className="py-2">
                        <Button variant="ghost" onClick={() => {
                          const url = `/cotizaciones/simulador?contactoId=${contact.id}&nombre=${encodeURIComponent(contact.nombre || '')}`
                          window.open(url, '_blank')
                        }}>Vista previa</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
