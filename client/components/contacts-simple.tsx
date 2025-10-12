"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Pencil, Trash2, CheckCircle2, PlusCircle, Tag as TagIcon, MoreVertical, Filter as FilterIcon, MessageSquare, History as HistoryIcon } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { fetchContacts, updateContact, deleteContact, ContactDTO, bulkTagContacts, createContact } from "@/lib/contacts"
import { listOpportunities, type OpportunityDTO, createOpportunityFromContact } from "@/lib/opportunities"
import { QuotesHistory } from '@/components/quotes/QuotesHistory'
import { fetchStages, type PipelineStageDTO } from "@/lib/pipelineStages"
import { useToast } from "@/hooks/use-toast"
import { QuoteSimulator } from "@/components/quotes/QuoteSimulator"
import { EditContactDialog, type EditContactFormValues } from "@/components/forms/EditContactDialog"
import { NewContactDialog } from "@/components/forms/NewContactDialog"

export function ContactsSimple({ onlyClients = false, excludeClients = false }: { onlyClients?: boolean; excludeClients?: boolean }) {
  const [search, setSearch] = useState("")
  const [contacts, setContacts] = useState<ContactDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(30)
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [editOpen, setEditOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<ContactDTO | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const { toast } = useToast()
  const [simulateOpen, setSimulateOpen] = useState(false)
  const [simulateContact, setSimulateContact] = useState<ContactDTO | null>(null)
  const [tagOpen, setTagOpen] = useState(false)
  const [tagValue, setTagValue] = useState("")
  const [tagIds, setTagIds] = useState<number[]>([])
  // Filtros (solo para clientes)
  const [stageFilter, setStageFilter] = useState<string>("")
  const [tagFilter, setTagFilter] = useState<string>("")
  const [stages, setStages] = useState<PipelineStageDTO[]>([])
  const [allOpps, setAllOpps] = useState<OpportunityDTO[]|null>(null)
  const [tagOptions, setTagOptions] = useState<string[]>([])
  const [openNew, setOpenNew] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const predefinedTags = [
    'Techo Propio',
    'Credito Mivivienda',
    'Tasaciones',
    'Construccion',
    'Levantamiento Topografico',
  ]
  
  // Helpers de API
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
  const buildAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
    const headers: Record<string,string> = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
  }

  // Abrir Google Calendar con evento prellenado en popup pequeño
  function openCalendarForContact(c: ContactDTO) {
    const title = encodeURIComponent(`Reunión con ${c.nombre}`)
    // Rango: ahora + 1h, duración 60min
    const start = new Date()
    start.setMinutes(start.getMinutes() + 60)
    const end = new Date(start.getTime() + 60*60000)
    const pad = (n:number)=> String(n).padStart(2,'0')
    const toG = (d:Date)=> `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
    const datesParam = `${toG(start)}/${toG(end)}`
    const details = encodeURIComponent('')
    const location = encodeURIComponent('Google Meet')
    const attendees = [c.email].filter(Boolean).map(a=> `&add=${encodeURIComponent(a!)}`).join('')
    const url = `https://calendar.google.com/calendar/u/0/r/eventedit?text=${title}&dates=${datesParam}&details=${details}&location=${location}${attendees}`
    const w = 600, h = 700
    const y = window.top?.outerHeight ? Math.max(0, (window.top.outerHeight - h) / 2) : 80
    const x = window.top?.outerWidth ? Math.max(0, (window.top.outerWidth - w) / 2) : 80
    window.open(url, 'gcal_event', `width=${w},height=${h},left=${x},top=${y},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,status=no`)
  }

  // Evitar enviar strings vacíos o fecha vacía que rompa en BD
  function sanitizePatch(patch: Partial<ContactDTO>): Partial<ContactDTO> {
    const out: Partial<ContactDTO> = {}
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue
      if (k === 'fecha_nacimiento') {
        if (!v) continue
        if (v instanceof Date) { (out as any)[k] = v.toISOString().slice(0,10) }
        else if (typeof v === 'string' && v.trim() !== '') { (out as any)[k] = v.trim() }
        continue
      }
      if (typeof v === 'string') {
        const t = v.trim(); if (t === '') continue; (out as any)[k] = t
      } else { (out as any)[k] = v as any }
    }
    return out
  }

  async function handleEditSubmit(id: number, data: EditContactFormValues): Promise<void> {
    try {
      const payload = sanitizePatch(data as any)
      const updated = await updateContact(id, payload)
      setContacts(prev => prev.map(c => c.id===id ? { ...c, ...updated } : c))
    } catch(e:any) {
      toast({ title:'No se pudo guardar', description:e.message || '', variant:'destructive' })
      throw e
    }
  }
  // Importar contactos desde Google: siempre abrir popup OAuth (con fallback a redirección si el popup es bloqueado)
  async function importFromGoogle() {
    const base = apiBase
    // Validar existencia de token antes de cualquier llamada para evitar flujo silencioso
    const rawToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
    if (!rawToken) {
      toast({ title:'Sesión requerida', description:'Inicia sesión nuevamente antes de importar desde Google.', variant:'destructive' })
      return
    }
    try {
      setImporting(true)
      const headers = buildAuthHeaders()
      // 1) Solicitar URL de autorización a backend
      const u = await fetch(`${base}/api/google/contacts/auth-url`, { credentials: 'include', headers })
      if (!u.ok) {
        const txt = await u.text().catch(()=> '')
        throw new Error(`Error solicitando URL (${u.status}) ${txt || ''}`.trim())
      }
      const data = await u.json().catch(()=>({}))
      const url = data?.data?.url || data?.url
      if (!url) throw new Error('No se obtuvo URL de autorización (respuesta vacía)')

      const w = 600, h = 700
      const y = window.top?.outerHeight ? Math.max(0, (window.top.outerHeight - h) / 2) : 80
      const x = window.top?.outerWidth ? Math.max(0, (window.top.outerWidth - w) / 2) : 80
      const popup = window.open(url, '_blank', `width=${w},height=${h},left=${x},top=${y},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,status=no`)
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Fallback: redirigir pestaña actual si el popup fue bloqueado
        toast({ title:'Abriendo Google…', description:'Tu navegador bloqueó el popup. Redirigiendo en esta pestaña.' })
        window.location.href = url
        return
      }

      toast({ title:'Conecta con Google', description:'Completa la autorización en la ventana emergente' })

      // Listener de mensajes desde el callback
      const onMessage = async (ev: MessageEvent) => {
        if (!ev?.data || typeof ev.data !== 'object') return
        if (ev.data.type === 'google-import-result') {
          try { window.removeEventListener('message', onMessage) } catch(_) {}
          toast({ title:'Google conectado', description:`Importados: ${ev.data.imported || 0}, omitidos: ${ev.data.skipped || 0}` })
          await load()
          setImporting(false)
        } else if (ev.data.type === 'google-import-error') {
          try { window.removeEventListener('message', onMessage) } catch(_) {}
          toast({ title:'Importación cancelada', description: ev.data.description || 'Se canceló el flujo de autorización', variant:'destructive' })
          setImporting(false)
        }
      }
      window.addEventListener('message', onMessage)

      // Fallback: si el popup se cierra sin mensaje, recargar estado
      const poll = setInterval(async () => {
        if (popup.closed) {
          clearInterval(poll)
          try { window.removeEventListener('message', onMessage) } catch(_) {}
          try {
            const st2 = await fetch(`${base}/api/google/contacts/sync/status`, { credentials: 'include', headers })
            if (st2.ok) {
              const js2 = await st2.json().catch(()=>({}))
              if (js2?.data?.connected) {
                toast({ title:'Google conectado', description:'Sincronizando contactos…' })
                const res2 = await fetch(`${base}/api/google/contacts/sync`, { method:'POST', credentials:'include', headers })
                if (res2.ok) await load()
              } else {
                // Mostrar mensaje si se cerró sin conectar
                toast({ title:'Importación no completada', description:'La ventana se cerró antes de autorizar Google.', variant:'destructive' })
              }
            }
          } finally { setImporting(false) }
        }
      }, 800)
    } catch(e:any) {
      toast({ title:'No se pudo importar', description: e.message || 'Error al comunicar con Google', variant:'destructive' })
    } finally { setImporting(false) }
  }

  async function load(p: number = page) {
    setLoading(true)
    try {
      const resp = await fetchContacts({ search, page: p, pageSize })
      let list: ContactDTO[] = (resp.data || []).map((c:any)=>{
        // Normalizar etiquetas: si backend devuelve 'etiquetas_json', convertir a 'etiquetas' (array)
        if (!Array.isArray(c.etiquetas)) {
          try {
            if (Array.isArray(c.etiquetas_json)) c.etiquetas = c.etiquetas_json
            else if (typeof c.etiquetas_json === 'string' && c.etiquetas_json.trim() !== '') c.etiquetas = JSON.parse(c.etiquetas_json)
            else if (!c.etiquetas) c.etiquetas = []
          } catch { c.etiquetas = [] }
        }
        return c as ContactDTO
      })
      // Si hay filtros activos en Clientes, traer todas las páginas para filtrar correctamente todo el conjunto
      let metaTotal = resp?.meta?.total || list.length
      const needsFull = onlyClients && (!!tagFilter || !!stageFilter)
      if (needsFull && metaTotal > pageSize) {
        const totalPages = Math.ceil(metaTotal / pageSize)
        const promises: Promise<import("@/lib/contacts").ContactsPage>[] = []
        for (let i = 2; i <= totalPages; i++) {
          promises.push(fetchContacts({ search, page: i, pageSize }))
        }
        const rest = await Promise.all(promises)
        for (const r of rest) { list = list.concat(r.data || []) }
      }
      const isClient = (c: ContactDTO) => {
        const tipo = (c.tipo || '').toLowerCase()
        const etiquetas = (Array.isArray(c.etiquetas) ? c.etiquetas : ((c as any).etiqueta ? [(c as any).etiqueta] : []))
        const hasClientTag = etiquetas.some(e => (e || '').toLowerCase() === 'cliente')
        return tipo === 'cliente' || hasClientTag
      }
      if (onlyClients) list = list.filter(isClient)
      if (excludeClients) list = list.filter(c => !isClient(c))

      // Cargar datasets para filtros en Clientes (usar variables locales para evitar race con setState)
      let filtered = list
      if (onlyClients) {
        // Construir opciones de etiquetas (todas) desde la lista base
        try {
          const pool = list.flatMap(c => {
            const tags = Array.isArray(c.etiquetas) ? c.etiquetas : []
            const legacy = (c as any).etiqueta ? [String((c as any).etiqueta)] : []
            const extra = (c as any).etiqueta_otro ? [String((c as any).etiqueta_otro)] : []
            return [...tags, ...legacy, ...extra]
          }).filter(Boolean) as string[]
          setTagOptions(Array.from(new Set(pool.map(t=> String(t)))).sort())
        } catch {}
        let stagesLocal = stages
        let oppsLocal = allOpps
        try { if (!stagesLocal.length) { stagesLocal = await fetchStages(); setStages(stagesLocal) } } catch {}
        try { if (!oppsLocal) { oppsLocal = await listOpportunities(); setAllOpps(oppsLocal) } } catch { oppsLocal = []; setAllOpps([]) }
        // Filtro por etiqueta
        if (tagFilter) {
          const tagSel = tagFilter.toLowerCase()
          filtered = filtered.filter(c => {
            const tags = Array.isArray(c.etiquetas) ? c.etiquetas : []
            const legacy = (c as any).etiqueta ? [String((c as any).etiqueta)] : []
            const extra = (c as any).etiqueta_otro ? [String((c as any).etiqueta_otro)] : []
            return [...tags, ...legacy, ...extra].some(t => (t||'').toLowerCase() === tagSel)
          })
        }
        // Filtro por etapa de pipeline
        if (stageFilter && oppsLocal && oppsLocal.length) {
          const ids = new Set(oppsLocal.filter(o => (o.contactoId ?? null) !== null && o.etapaId === stageFilter).map(o => o.contactoId as number))
          filtered = filtered.filter(c => ids.has(c.id!))
        }
      }

      setContacts(onlyClients ? filtered : list)
      setTotal(resp?.meta?.total || list.length)
    } catch(e:any) {
      toast({ title:'Error', description: e.message || 'No se pudieron cargar contactos', variant:'destructive' })
    } finally { setLoading(false) }
  }

  function openTagDialog(targetIds: number[], current?: string) {
    setTagIds(targetIds)
    setTagValue(current || "")
    setTagOpen(true)
  }

  async function applyTag(ids: number[], value: string) {
    if (!ids.length) return
    try {
      const isCustom = !!(value && !predefinedTags.includes(value))
      await bulkTagContacts(ids, value || '', isCustom ? value : undefined)
      // Refrescar desde servidor para asegurar persistencia real
      await load()
      toast({ title: 'Etiqueta aplicada', description: value || 'Sin etiqueta' })
    } catch(e:any) {
      toast({ title:'No se pudo etiquetar', description:e.message || '', variant:'destructive' })
    } finally {
      setTagOpen(false)
      setTagIds([])
    }
  }
  const removeTagSingle = async (id: number) => { await applyTag([id], '') }
  useEffect(()=>{ const t=setTimeout(()=> load(1), 250); return ()=> clearTimeout(t) }, [search])

  function toggle(id:number) {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  async function convertToClient(id:number) {
    try {
      await updateContact(id, { tipo:'cliente' } as any)
      setContacts(prev => prev.map(c => c.id===id ? { ...c, tipo:'cliente' } : c))
      toast({ title:'Convertido a cliente' })
    } catch(e:any) {
      toast({ title:'No se pudo convertir', description: e.message || '', variant:'destructive' })
    }
  }

  async function remove(id:number) {
    if (!confirm('¿Eliminar este contacto?')) return
    setDeletingId(id)
    try {
      await deleteContact(id)
      setContacts(prev => prev.filter(c => c.id !== id))
      setSelected(prev => { const n=new Set(prev); n.delete(id); return n })
      toast({ title:'Eliminado' })
    } catch(e:any) {
      toast({ title:'Error', description:e.message || 'No se pudo eliminar', variant:'destructive' })
    } finally { setDeletingId(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1">
          <label className="text-xs text-gray-600">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input value={search} onChange={(e)=> setSearch(e.target.value)} placeholder="Nombre, teléfono o email" className="pl-9" />
          </div>

          {onlyClients && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="text-xs text-gray-600 flex items-center gap-1"><FilterIcon className="h-4 w-4"/>Filtros</div>
              <select value={tagFilter} onChange={(e)=> { setTagFilter(e.target.value); setPage(1); load(1) }} className="border rounded-md h-8 px-2 text-sm bg-white">
                <option value="">Etiqueta: Todas</option>
                {tagOptions.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
              <select value={stageFilter} onChange={(e)=> { setStageFilter(e.target.value); setPage(1); load(1) }} className="border rounded-md h-8 px-2 text-sm bg-white">
                <option value="">Etapa: Todas</option>
                {stages.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
          )}
        <div className="flex gap-2">
          {excludeClients && (
            <Button variant="outline" onClick={importFromGoogle} disabled={importing || loading}>
              {importing ? 'Importando…' : 'Importar Google'}
            </Button>
          )}
          <Button variant="brand" onClick={()=> setOpenNew(true)}>Nuevo contacto</Button>
          {onlyClients && (
            <Button variant="outline" onClick={()=> setHistoryOpen(true)} title="Historial de cotizaciones">
              <HistoryIcon className="h-4 w-4 mr-2" />
              Historial
            </Button>
          )}
          {!onlyClients && (
            <Button variant="outline" onClick={()=> load()} disabled={loading}>{loading ? 'Cargando…' : 'Actualizar'}</Button>
          )}
        </div>
      </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.map(c => {
          const isSel = selected.has(c.id!)
          return (
            <Card key={c.id} className={`border ${isSel ? 'ring-2 ring-indigo-500' : ''} cursor-pointer`} onClick={()=> toggle(c.id!)}>
              <CardHeader className="py-3">
                <CardTitle className="text-base font-semibold flex items-center justify-between gap-2">
                  <span className="truncate">{c.nombre}</span>
                  <div className="flex items-center gap-2">
                    <Badge className={`shrink-0 ${((c.tipo||'').toLowerCase()==='cliente')?'bg-emerald-600':'bg-slate-500'} text-white`}>{(c.tipo||'lead')==='cliente' ? 'Cliente' : (c.tipo||'lead')}</Badge>
                    {c.telefono && (
                      <Button asChild variant="ghost" size="icon" className="h-7 w-7" title="WhatsApp" onClick={(e)=> e.stopPropagation()}>
                        <a href={`https://wa.me/${(c.telefono||'').replace(/\D/g,'')}${encodeURIComponent('')}`} target="_blank" rel="noreferrer">
                          <MessageSquare className="h-4 w-4 text-green-600"/>
                        </a>
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e)=> e.stopPropagation()} title="Acciones">
                          <MoreVertical className="h-4 w-4"/>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[220px] bg-white dark:bg-white text-slate-900 border border-slate-200 shadow-xl" onClick={(e)=> e.stopPropagation()}>
                        <DropdownMenuItem onClick={()=> { setEditingContact(c); setEditOpen(true) }}>
                          <Pencil className="h-4 w-4 mr-2"/> Editar
                        </DropdownMenuItem>
                        {!onlyClients && (
                          <DropdownMenuItem onClick={()=> convertToClient(c.id!)}>
                            <CheckCircle2 className="h-4 w-4 mr-2"/> Convertir a cliente
                          </DropdownMenuItem>
                        )}
                        {onlyClients && (
                          <>
                            <DropdownMenuItem onClick={()=> openTagDialog([c.id!], (Array.isArray(c.etiquetas)&&c.etiquetas[0]) || (c as any).etiqueta || '')}>
                              <TagIcon className="h-4 w-4 mr-2"/> Etiquetar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={()=> { setSimulateContact(c); setSimulateOpen(true) }}>
                              <PlusCircle className="h-4 w-4 mr-2"/> Simular cotización
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={()=> { openCalendarForContact(c) }}>
                              <PlusCircle className="h-4 w-4 mr-2"/> Agendar reunión
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={async ()=>{
                              try {
                                await createOpportunityFromContact({ id: c.id, nombre: c.nombre, telefono: c.telefono, email: c.email })
                                toast({ title:'Enviado al pipeline', description: c.nombre })
                              } catch(e:any) {
                                toast({ title:'No se pudo enviar al pipeline', description: e.message || '', variant:'destructive' })
                              }
                            }}>
                              <CheckCircle2 className="h-4 w-4 mr-2"/> Enviar a pipeline
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={async ()=>{
                              setDeletingId(c.id!)
                              try {
                                await updateContact(c.id!, { tipo: 'lead' } as any)
                                setContacts(prev => prev.filter(x => x.id !== c.id))
                                toast({ title:'Removido de clientes', description: c.nombre })
                              } catch(e:any) {
                                toast({ title:'No se pudo remover', description:e.message || '', variant:'destructive' })
                              } finally { setDeletingId(null) }
                            }}>
                              <Trash2 className="h-4 w-4 mr-2"/> Quitar de clientes
                            </DropdownMenuItem>
                          </>
                        )}
                        {!onlyClients && (
                          <DropdownMenuItem className="text-red-600 focus:text-red-700" onClick={()=> remove(c.id!)}>
                            <Trash2 className="h-4 w-4 mr-2"/> {deletingId===c.id ? 'Eliminando…' : 'Eliminar'}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 truncate">{c.email || 'Sin email'} · {c.telefono || 'Sin teléfono'}</CardDescription>
                {(() => {
                  const arr = Array.isArray(c.etiquetas) ? c.etiquetas.slice(0) : ((c as any).etiqueta ? [(c as any).etiqueta] : [])
                  if ((c as any).etiqueta_otro) arr.push((c as any).etiqueta_otro)
                  const uniq = Array.from(new Set(arr.filter(Boolean)))
                  return uniq.length ? (
                    <div className="mt-1 flex items-center gap-1 flex-wrap">
                      {uniq.map((t, idx) => (
                        <Badge key={idx} variant="outline" className="text-[11px] px-2 py-0 h-5 inline-flex items-center gap-1">
                          <span className="truncate max-w-[160px]">{t}</span>
                          <button
                            type="button"
                            aria-label="Quitar etiqueta"
                            className="text-gray-500 hover:text-gray-700 ml-1"
                            onClick={(e)=> { e.stopPropagation(); applyTag([c.id!], '') }}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : null
                })()}
              </CardHeader>
              {/* Se eliminan botones grandes para compactar altura */}
              <CardContent className="pt-0" />
            </Card>
          )
        })}
      </div>

      {/* Modal simulador con todas las funciones: Generar, Exportar, Guardar, Enviar pipeline */}
      <Dialog open={simulateOpen} onOpenChange={(o)=> { setSimulateOpen(o); if(!o) setSimulateContact(null) }}>
        <DialogContent className="max-w-6xl w-[98vw] max-h-[92vh] p-0 overflow-auto">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Simulador de Cotización</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            {simulateContact && (
              <QuoteSimulator contactoId={simulateContact.id!} clienteNombre={simulateContact.nombre} preloadSavedQuotes={false} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      

      {/* Historial de cotizaciones (global) visible solo desde Clientes) */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-5xl w-[95vw] p-4 overflow-hidden">
          <DialogHeader>
            <DialogTitle>Historial de Cotizaciones</DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <QuotesHistory />
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Etiquetar */}
      <Dialog open={tagOpen} onOpenChange={setTagOpen}>
        <DialogContent className="max-w-md w-[92vw]">
          <DialogHeader>
            <DialogTitle>Asignar etiqueta</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs text-gray-600">Selecciona una etiqueta</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[12px]">
                {predefinedTags.map(tag => (
                  <label key={tag} className="flex items-center gap-2">
                    <input type="radio" name="tag_radio" checked={tagValue===tag} onChange={()=> setTagValue(tag)} />
                    {tag}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-600">Otro (personalizado)</label>
              <Input value={tagValue && !predefinedTags.includes(tagValue) ? tagValue : ''} onChange={(e)=> setTagValue(e.target.value)} placeholder="Ej. Programa especial" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=> setTagOpen(false)}>Cancelar</Button>
              <Button onClick={()=> applyTag(tagIds, tagValue)}>Aplicar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de edición completo */}
      <EditContactDialog
        open={editOpen}
        contact={editingContact}
        onOpenChange={(v)=> { setEditOpen(v); if(!v) setEditingContact(null) }}
        onSubmit={handleEditSubmit}
      />
      {/* Dialog nuevo contacto */}
      <NewContactDialog
        open={openNew}
        onOpenChange={setOpenNew}
        onSubmit={async (data)=>{
          try {
            const created = await createContact(data as any)
            setOpenNew(false)
            toast({ title:'Contacto creado', description: created?.nombre || '' })
            await load()
          } catch(e:any) {
            toast({ title:'No se pudo crear', description: e.message || '', variant:'destructive' })
          }
        }}
      />
      {/* Barra de acciones masivas */}
      {selected.size > 0 && (
        <div
          className={
            `fixed bottom-4 left-1/2 -translate-x-1/2 z-40 shadow-2xl rounded-full px-3 py-2 flex items-center gap-2 backdrop-blur ` +
            (onlyClients
              ? 'bg-emerald-50/95 border-4 border-emerald-600 ring-2 ring-emerald-300'
              : 'bg-indigo-50/95 border-4 border-indigo-600 ring-2 ring-indigo-300')
          }
        >
          <span className="text-sm">{selected.size} seleccionado(s)</span>
          <Button size="sm" variant="outline" onClick={()=> setSelected(new Set())}>Limpiar</Button>
          <Button size="sm" variant="outline" onClick={()=> setSelected(new Set(contacts.map(c=> c.id!)))}>Seleccionar todos</Button>
          {onlyClients ? (
            <>
              <Button size="sm" variant="outline" onClick={()=> openTagDialog(Array.from(selected))}><TagIcon className="h-4 w-4 mr-1"/>Etiquetar</Button>
              <Button size="sm" variant="outline" onClick={async ()=>{
                // En Clientes: acción masiva "Quitar de clientes" (tipo -> lead)
                const ids = Array.from(selected)
                for (const id of ids) { try { await updateContact(id, { tipo:'lead' } as any) } catch{} }
                setContacts(prev => prev.filter(c => !ids.includes(c.id!)))
                setSelected(new Set())
                toast({ title:'Removidos de clientes' })
              }}><Trash2 className="h-4 w-4 mr-1"/>Quitar de clientes</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={async ()=>{
                const ids = Array.from(selected)
                for (const id of ids) { try { await updateContact(id, { tipo:'cliente' } as any) } catch{} }
                setContacts(prev => prev.filter(c => !ids.includes(c.id!)))
                setSelected(new Set())
                toast({ title:'Convertidos a cliente' })
              }}><CheckCircle2 className="h-4 w-4 mr-1"/>Convertir a clientes</Button>
              <Button size="sm" variant="destructive" onClick={async ()=>{
                if (!confirm('Eliminar seleccionados?')) return;
                const ids = Array.from(selected)
                for (const id of ids) { try { await deleteContact(id) } catch{} }
                setContacts(prev => prev.filter(c => !selected.has(c.id!)))
                setSelected(new Set())
                toast({ title:'Eliminados' })
              }}><Trash2 className="h-4 w-4 mr-1"/>Eliminar</Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
