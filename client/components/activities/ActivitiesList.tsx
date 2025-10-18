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
  const [accountEmail, setAccountEmail] = React.useState<string>("")
  const tokenRef = React.useRef<string>("")
  const tokenClientRef = React.useRef<any>(null)
  const [calendars, setCalendars] = React.useState<any[]>([])
  const [selectedCals, setSelectedCals] = React.useState<string[]>([])

  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""
  const REDIRECT_URI = (typeof window !== 'undefined') ? `${window.location.origin}/google/callback` : ''

  async function ensureGoogle() {
    if (typeof window === 'undefined') return false
    const needGsi = !(window as any).google?.accounts?.oauth2
    if (needGsi) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script')
        s.src = 'https://accounts.google.com/gsi/client'
        s.async = true
        s.onload = () => resolve()
        s.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'))
        document.head.appendChild(s)
      })
    }
    if (!CLIENT_ID) {
      toast({ title: 'Falta configurar Google', description: 'Define NEXT_PUBLIC_GOOGLE_CLIENT_ID', variant: 'destructive' })
      return false
    }
    if (!tokenClientRef.current) {
      tokenClientRef.current = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar.readonly openid email profile',
        callback: (resp: any) => {
          if (resp?.access_token) {
            tokenRef.current = resp.access_token
            fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${tokenRef.current}` }})
              .then(r=>r.json()).then(info=> {
                const email = info?.email || ''
                setAccountEmail(email)
                try {
                  if (email) {
                    localStorage.setItem('gcal_account_email', email)
                    // Calendarios seleccionados son por cuenta: al cambiar, limpia selección previa
                    localStorage.removeItem('gcal_selected_cals')
                  }
                } catch {}
                // Cargar inmediatamente la semana actual
                loadWeek(anchor)
              })
              .catch(()=> {
                setAccountEmail('')
                loadWeek(anchor)
              })
          }
        }
      })
    }
    return true
  }

  async function connect(prompt: 'consent' | 'none' = 'consent') {
    const ok = await ensureGoogle()
    if (!ok) return
    const hint = (typeof window !== 'undefined') ? localStorage.getItem('gcal_account_email') || undefined : undefined
    try {
      tokenClientRef.current.requestAccessToken({ prompt, login_hint: hint })
      // Si GIS no devuelve token (bloqueado o error), activamos fallback implícito tras un breve timeout
      setTimeout(() => { if (!tokenRef.current) implicitFallback() }, 1200)
    } catch {
      implicitFallback()
    }
  }

  function implicitFallback() {
    if (!CLIENT_ID || typeof window === 'undefined') return
    try {
      const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar.readonly openid email profile')
      const state = Math.random().toString(36).slice(2)
      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(CLIENT_ID)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=${scope}&include_granted_scopes=true&state=${state}`
      const w = 520, h = 640
      const y = window.top?.outerHeight ? Math.max(0, (window.top.outerHeight - h) / 2) : 80
      const x = window.top?.outerWidth ? Math.max(0, (window.top.outerWidth - w) / 2) : 80
      window.open(url, 'gcal_oauth', `width=${w},height=${h},left=${x},top=${y},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,status=no`)
    } catch(e) {
      console.error('Implicit OAuth popup failed', e)
    }
  }

  async function loadCalendars(headers: Record<string,string>) {
    const calsRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250', { headers })
    if (!calsRes.ok) throw new Error('No se pudo leer lista de calendarios')
    const cals = await calsRes.json()
    const all = Array.isArray(cals?.items) ? cals.items : []
    setCalendars(all)
    // Selección persistida o, si no hay, todas marcadas por defecto
    const saved = (typeof window !== 'undefined') ? JSON.parse(localStorage.getItem('gcal_selected_cals') || '[]') : []
    if (Array.isArray(saved) && saved.length) setSelectedCals(saved)
    else setSelectedCals(all.map((c:any)=> c.id))
    return all
  }

  async function loadWeek(ref: Date) {
    setLoading(true)
    try {
      if (!tokenRef.current) {
        setItems([])
        return
      }
      const { start, end } = getWeekRange(ref)
      const timeMin = start.toISOString()
      const timeMax = end.toISOString()
      const headers = { Authorization: `Bearer ${tokenRef.current}` }
      const all = calendars.length ? calendars : await loadCalendars(headers)
      const events: any[] = []
      const include = new Set(selectedCals.length ? selectedCals : all.map((c:any)=> c.id))
      for (const cal of all) {
        if (!include.has(cal.id)) continue
        try {
          const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=200`
          const r = await fetch(url, { headers })
          if (!r.ok) continue
          const js = await r.json()
          const its = Array.isArray(js?.items) ? js.items : []
          for (const ev of its) { events.push({ ...ev, _calendarId: cal.id, _calendarBg: cal.backgroundColor, _calendarSummary: cal.summary }) }
        } catch { }
      }
      const seen = new Set<string>()
      const merged: any[] = []
      for (const ev of events) {
        const key = `${ev.id || ''}-${ev.start?.dateTime || ev.start?.date || ''}`
        if (seen.has(key)) continue
        seen.add(key)
        merged.push(ev)
      }
      merged.sort((a,b)=> new Date(a.start?.dateTime || a.start?.date || 0).getTime() - new Date(b.start?.dateTime || b.start?.date || 0).getTime())
      setItems(merged)
    } catch (e:any) {
      toast({ title: 'Error', description: e.message || 'No se pudo cargar eventos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { loadWeek(anchor) }, [anchor])
  // Auto-conectar silenciosamente si hay cuenta previa
  React.useEffect(() => {
    const email = (typeof window !== 'undefined') ? localStorage.getItem('gcal_account_email') : ''
    if (email) { setAccountEmail(email); connect('none') }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listener para recibir token desde la ruta /google/callback (fallback implícito)
  React.useEffect(() => {
    function onMsg(ev: MessageEvent) {
      if (!ev?.data) return
      if (ev.data.type === 'gcal-token' && ev.data.access_token) {
        tokenRef.current = ev.data.access_token
        if (ev.data.email) {
          try { localStorage.setItem('gcal_account_email', ev.data.email); setAccountEmail(ev.data.email) } catch {}
        }
        loadWeek(anchor)
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [anchor])

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
        <div className="ml-auto flex items-center gap-2">
          {accountEmail ? <span className="text-xs text-gray-600">{accountEmail}</span> : null}
          <Button onClick={()=> connect('consent')}>{accountEmail ? 'Cambiar cuenta' : 'Conectar calendario'}</Button>
        </div>
      </div>

      {!tokenRef.current ? (
        <div className="text-sm text-gray-500">Conecta tu Google Calendar para ver tus eventos de esta semana.</div>
      ) : (
        <>
          {/* Selector de calendarios */}
          {calendars.length ? (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {calendars.map((c:any) => (
                <label key={c.id} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedCals.includes(c.id)}
                    onChange={(e)=>{
                      const next = e.target.checked ? Array.from(new Set([...selectedCals, c.id])) : selectedCals.filter(x=> x!==c.id)
                      setSelectedCals(next)
                      if (typeof window !== 'undefined') localStorage.setItem('gcal_selected_cals', JSON.stringify(next))
                      // recargar eventos de la semana actual con nueva selección
                      loadWeek(anchor)
                    }}
                  />
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ background: c.backgroundColor || '#999' }} />
                    {c.summary}
                  </span>
                </label>
              ))}
            </div>
          ) : null}

          <WeekCalendar events={items} reference={anchor} />
        </>
      )}
    </div>
  )
}
