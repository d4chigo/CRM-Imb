"use client"

import * as React from "react"

type GCalEvent = {
  id?: string
  summary?: string
  description?: string
  location?: string
  htmlLink?: string
  hangoutLink?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
}

function startOfWeek(d: Date) {
  const date = new Date(d)
  const day = (date.getDay() + 6) % 7 // Monday = 0
  date.setDate(date.getDate() - day)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfWeek(d: Date) {
  const s = startOfWeek(d)
  const e = new Date(s)
  e.setDate(e.getDate() + 7)
  e.setMilliseconds(-1)
  return e
}

function toLocal(dt?: string) {
  return dt ? new Date(dt) : null
}

export function WeekCalendar({ events, reference }: { events: GCalEvent[]; reference?: Date }) {
  const ref = reference || new Date()
  const start = startOfWeek(ref)
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })

  const eventsByDay: Record<string, GCalEvent[]> = {}
  for (const d of days) {
    eventsByDay[d.toDateString()] = []
  }
  for (const ev of events) {
    const st = toLocal(ev.start?.dateTime || ev.start?.date)
    if (!st) continue
    const key = new Date(st.getFullYear(), st.getMonth(), st.getDate()).toDateString()
    if (!eventsByDay[key]) eventsByDay[key] = []
    eventsByDay[key].push(ev)
  }

  for (const key of Object.keys(eventsByDay)) {
    eventsByDay[key].sort((a, b) => {
      const sa = toLocal(a.start?.dateTime || a.start?.date)?.getTime() || 0
      const sb = toLocal(b.start?.dateTime || b.start?.date)?.getTime() || 0
      return sa - sb
    })
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="grid grid-cols-7 bg-muted text-xs font-medium border-b">
        {days.map((d, i) => (
          <div key={i} className="px-3 py-2 border-r last:border-r-0">
            {d.toLocaleDateString(undefined, { weekday: 'short' })} {d.getDate()}/{d.getMonth()+1}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 divide-x">
        {days.map((d, i) => (
          <div key={i} className="min-h-[280px] p-2 space-y-2">
            {eventsByDay[d.toDateString()]?.length ? (
              eventsByDay[d.toDateString()].map((ev, idx) => {
                const st = toLocal(ev.start?.dateTime || ev.start?.date)
                const en = toLocal(ev.end?.dateTime || ev.end?.date)
                return (
                  <a
                    key={ev.id || idx}
                    href={ev.htmlLink || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-md border bg-white hover:bg-gray-50 p-2 text-[12px] shadow-sm"
                    title={ev.summary || ''}
                  >
                    <div className="font-medium text-[12px] truncate">{ev.summary || 'Sin título'}</div>
                    <div className="text-[11px] text-gray-600">
                      {st ? st.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      {en ? ` - ${en.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </div>
                    {ev.location ? <div className="text-[11px] text-gray-500 truncate">{ev.location}</div> : null}
                    {ev.hangoutLink ? (
                      <div className="text-[11px] text-blue-600 truncate">Meet</div>
                    ) : null}
                  </a>
                )
              })
            ) : (
              <div className="text-[11px] text-gray-400">—</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function getWeekRange(date = new Date()) {
  const s = startOfWeek(date)
  const e = endOfWeek(date)
  return { start: s, end: e }
}
