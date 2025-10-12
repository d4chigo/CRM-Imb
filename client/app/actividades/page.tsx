"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

export default function ActividadesPage() {
  const { toast } = useToast()
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [from, setFrom] = React.useState<string>(() => new Date(Date.now() - 7*24*60*60*1000).toISOString().slice(0,10))
  const [to, setTo] = React.useState<string>(() => new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0,10))

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
  const buildAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
    const headers: Record<string,string> = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
  }

  async function load() {
    setLoading(true)
    try {
      const timeMin = new Date(`${from}T00:00:00`).toISOString()
      const timeMax = new Date(`${to}T23:59:59`).toISOString()
      const res = await fetch(`${apiBase}/api/google/calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=100`, {
        credentials: 'include',
        headers: buildAuthHeaders(),
      })
      const js = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(js?.message || 'No se pudieron listar eventos')
      setItems(Array.isArray(js?.data) ? js.data : [])
    } catch (e:any) {
      toast({ title: 'Error', description: e.message || 'No se pudo cargar eventos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <label className="text-xs text-gray-600">Desde</label>
          <Input type="date" value={from} onChange={(e)=> setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-600">Hasta</label>
          <Input type="date" value={to} onChange={(e)=> setTo(e.target.value)} />
        </div>
        <Button onClick={load} disabled={loading}>{loading ? 'Cargando…' : 'Actualizar'}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((ev, idx) => {
          const start = ev.start?.dateTime || ev.start?.date
          const end = ev.end?.dateTime || ev.end?.date
          const meetLink = ev.hangoutLink || null
          return (
            <Card key={ev.id || idx}>
              <CardHeader className="py-3">
                <CardTitle className="text-base">
                  {ev.summary || 'Sin título'}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-700 space-y-1">
                <div><strong>Inicio:</strong> {start ? new Date(start).toLocaleString() : '-'}</div>
                <div><strong>Fin:</strong> {end ? new Date(end).toLocaleString() : '-'}</div>
                {ev.location ? (<div><strong>Ubicación:</strong> {ev.location}</div>) : null}
                {meetLink ? (
                  <div>
                    <a href={meetLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Abrir Meet</a>
                  </div>
                ) : null}
                <div className="pt-2">
                  <a href={ev.htmlLink} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Abrir en Google Calendar</a>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {!loading && items.length === 0 && (
        <div className="text-sm text-gray-500">No hay eventos en el rango seleccionado.</div>
      )}
    </div>
  )
}
