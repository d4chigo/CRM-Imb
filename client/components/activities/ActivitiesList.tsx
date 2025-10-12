"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { WeekCalendar, getWeekRange } from "@/components/activities/WeekCalendar"

export function ActivitiesList() {
  const { toast } = useToast()
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [anchor, setAnchor] = React.useState<Date>(new Date())

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
  const buildAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
    const headers: Record<string,string> = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
  }

  async function loadWeek(ref: Date) {
    setLoading(true)
    try {
      const { start, end } = getWeekRange(ref)
      const timeMin = start.toISOString()
      const timeMax = end.toISOString()
      const res = await fetch(`${apiBase}/api/google/calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=200`, {
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

  React.useEffect(() => { loadWeek(anchor) }, [anchor])

  function addDays(d: Date, days: number) { const x = new Date(d); x.setDate(x.getDate()+days); return x }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={()=> setAnchor(addDays(anchor, -7))}>{'<'}</Button>
        <div className="text-sm text-gray-600">
          Semana del {getWeekRange(anchor).start.toLocaleDateString()} al {getWeekRange(anchor).end.toLocaleDateString()}
          {loading ? ' (cargando...)' : ''}
        </div>
        <Button variant="outline" onClick={()=> setAnchor(new Date())}>Hoy</Button>
        <Button variant="outline" onClick={()=> setAnchor(addDays(anchor, 7))}>{'>'}</Button>
      </div>

      <WeekCalendar events={items} reference={anchor} />
    </div>
  )
}
