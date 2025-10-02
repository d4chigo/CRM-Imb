"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Plus, Download, Pencil, Trash2, Loader2, Workflow, MessageSquare, Calendar as CalendarIcon, Merge, RefreshCw, CheckCircle2, AlertTriangle, Users } from "lucide-react"
import { QuoteSimulator } from '@/components/quotes/QuoteSimulator'
import { NewContactDialog, NewContactFormValues } from "@/components/forms/NewContactDialog"
// Nuevo dialog para edición
import { EditContactDialog, EditContactFormValues } from '@/components/forms/EditContactDialog'
// Reemplazamos uso de hook local por contexto global del pipeline
import { usePipeline } from '@/contexts/PipelineContext'
import { fetchContacts, createContact, updateContact, deleteContact, ContactDTO, listDuplicateContacts, mergeContacts, bulkTagContacts, bulkMoveContactsToPipeline } from "@/lib/contacts"
import { createOpportunityFromContact, createOpportunity } from '@/lib/opportunities'
import { useAuth } from '@/contexts/AuthContext'
import { getGoogleContactsAuthUrl, openGoogleImportPopup, createGoogleContact, getGoogleSyncStatus, manualGoogleSync } from "@/lib/googleContacts"
import { useToast } from '@/hooks/use-toast'
import { useDashboardTabs } from '@/contexts/DashboardTabsContext'

// Estado interno para contactos reales
// Se cargan desde la API al montar el componente

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export function ContactsList({ onlyClients = false, simpleActions = false }: { onlyClients?: boolean; simpleActions?: boolean }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState(onlyClients ? "cliente" : "all")
  const [openNew, setOpenNew] = useState(false)
  const [contacts, setContacts] = useState<ContactDTO[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [total, setTotal] = useState(0)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  // Estado para edición
  const [editOpen, setEditOpen] = useState(false)
  const [contactEditing, setContactEditing] = useState<ContactDTO | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [creatingOppForId, setCreatingOppForId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importFailed, setImportFailed] = useState<string | null>(null)
  const [lastImport, setLastImport] = useState<{ imported: number; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkEtiqueta, setBulkEtiqueta] = useState<string>('')
  const [bulkEtiquetaOtro, setBulkEtiquetaOtro] = useState<string>('')
  const [bubblePos, setBubblePos] = useState<{ top:number; left:number } | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewContact, setPreviewContact] = useState<ContactDTO | null>(null)
  const [simulateOpen, setSimulateOpen] = useState(false)
  const [simulateContact, setSimulateContact] = useState<ContactDTO | null>(null)
  const [selectAllMode, setSelectAllMode] = useState<boolean>(false)
  // Refs para manejo robusto del popup y watchers
  const popupRef = useRef<Window | null>(null)
  const watcherRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)
  // Estado Google conectado
  const [googleStatus, setGoogleStatus] = useState<{ connected: boolean; syncEnabled: boolean; lastSync: string | null }>({ connected:false, syncEnabled:false, lastSync:null })
  // Duplicados (preview y fusión en lote)
  const [dupsOpen, setDupsOpen] = useState(false)
  const [dupGroups, setDupGroups] = useState<Array<{ by:string; value:string; count:number; members: ContactDTO[] }>>([])
  // Separar por tipo (Clientes vs No clientes)
  const [splitByType, setSplitByType] = useState(false)

  // --- Cache local para etiquetas: asegura persistencia visual incluso si backend no devuelve el campo esperado ---
  function readTagCache(): Record<string, { etiquetas?: string[]; etiqueta_otro?: string | null }> {
    try {
      const raw = localStorage.getItem('contactsTagCache')
      return raw ? JSON.parse(raw) : {}
    } catch { return {} }
  }

  async function convertToClient(id: number) {
    try {
      await updateContact(id, { tipo: 'cliente' } as any)
      setContacts(prev => prev.map(c => c.id === id ? { ...c, tipo: 'cliente' } : c))
      toast({ title: 'Convertido a cliente' })
    } catch (e:any) {
      toast({ title:'No se pudo convertir', description: e.message || '' , variant:'destructive' })
    }
  }
  function writeTagCache(cache: Record<string, { etiquetas?: string[]; etiqueta_otro?: string | null }>) {
    try { localStorage.setItem('contactsTagCache', JSON.stringify(cache)) } catch {}
  }

  // Calcular estilo seguro para el bubble dentro del viewport
  const bubbleStyle: React.CSSProperties | undefined = bubblePos ? {
    top: Math.max(8, Math.min(bubblePos.top, window.scrollY + window.innerHeight - 260)),
    left: Math.max(8, Math.min(bubblePos.left, window.scrollX + window.innerWidth - 360))
  } : undefined

  // ---- Helpers globales dentro del componente ----
  function clearWatchers() {
    if (watcherRef.current) { clearInterval(watcherRef.current); watcherRef.current = null }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
  }

  // Fallback suave: si el popup se cierra sin mensaje, refresca la lista sin marcar error
  function gentleRefreshAfterClose(reason?: string) {
    setImporting(false)
    setImportFailed(null)
    clearWatchers()
    try { popupRef.current?.close() } catch(_) {}
    popupRef.current = null
    // Refrescar a la primera página para ver lo nuevo, por si importó en segundo plano
    loadContacts({ page: 1 })
    if (reason) {
      toast({ title: 'Importación', description: reason })
    }
  }

  function toggleSelected(id: number, ev?: React.ChangeEvent<HTMLInputElement>) {
    // Reposicionar burbuja cerca del checkbox clicado
    if (ev && ev.currentTarget) {
      const rect = ev.currentTarget.getBoundingClientRect()
      setBubblePos({ top: Math.round(rect.top + window.scrollY + 24), left: Math.round(rect.right + window.scrollX + 12) })
    }
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      // Si ahora hay 2 o más, ocultar bubble y salir de selectAllMode=false explícitamente
      if (n.size >= 2) { setBubblePos(null); setSelectAllMode(false) }
      return n
    })
  }

  function clearSelection() { setSelectedIds(new Set()); setBubblePos(null); setSelectAllMode(false) }

  async function bulkDelete() {
    if (!selectedIds.size) return
    const confirmed = window.confirm(`¿Eliminar ${selectedIds.size} contacto(s)?`)
    if (!confirmed) return
    for (const id of Array.from(selectedIds)) {
      try { await deleteContact(id) } catch(_) {}
    }
    setContacts(prev => prev.filter(c => !selectedIds.has(c.id!)))
    clearSelection()
    toast({ title: 'Eliminación masiva completada' })
  }

  async function bulkTag() {
    if (!selectedIds.size) return
    if (!bulkEtiqueta && !bulkEtiquetaOtro) { toast({ title:'Selecciona una etiqueta o especifica otra', variant:'destructive' }); return }
    try {
      // 1) Intento por endpoint masivo
      await bulkTagContacts(Array.from(selectedIds), bulkEtiqueta || undefined as any, bulkEtiquetaOtro || undefined)
      // 2) Refuerzo: actualizar en backend contacto por contacto para asegurar persistencia
      const labelsArray = bulkEtiqueta ? [bulkEtiqueta] : (bulkEtiquetaOtro ? [bulkEtiquetaOtro] : [])
      for (const id of Array.from(selectedIds)) {
        try {
          await updateContact(id, {
            etiquetas: labelsArray.length ? labelsArray : undefined,
            etiqueta_otro: bulkEtiqueta ? undefined : (bulkEtiquetaOtro || null)
          } as any)
        } catch (_) { /* fallback silencioso */ }
      }
      // 3) Reflejar en estado local inmediato para la UX
      setContacts(prev => prev.map(c => selectedIds.has(c.id!) ? {
        ...c,
        etiquetas: labelsArray.length ? labelsArray : [],
        etiqueta_otro: bulkEtiqueta ? null : (bulkEtiquetaOtro || null)
      } : c))
      // 3b) Actualizar cache local para persistencia inmediata
      const cache = readTagCache()
      Array.from(selectedIds).forEach(id => {
        cache[String(id)] = { etiquetas: labelsArray.length ? labelsArray : [], etiqueta_otro: bulkEtiqueta ? null : (bulkEtiquetaOtro || null) }
      })
      writeTagCache(cache)
      // 4) Recargar desde servidor para validar persistencia real
      await loadContacts({ page: 1, search: searchTerm, type: selectedType })
      // Feedback
      toast({ title: 'Etiquetas aplicadas', description: `${selectedIds.size} contacto(s)` })
      clearSelection()
    } catch(e:any) {
      toast({ title:'Error', description:e.message || 'No se pudo etiquetar', variant:'destructive' })
    }
  }

  async function bulkMove() {
    if (!selectedIds.size) return
    try {
      const ids = Array.from(selectedIds)
      // Crear oportunidades por cada contacto seleccionado (servicio Cotización)
      for (const id of ids) {
        const c = contacts.find(x => x.id === id)
        if (c) {
          try {
            // si el contacto tiene mes_interes, estimar fecha de cierre primer día de ese mes (año actual)
            let fechaCierre: string | undefined
            const m = (c as any).mes_interes ? Number((c as any).mes_interes) : 0
            if (m >= 1 && m <= 12) {
              const y = new Date().getFullYear()
              const d = new Date(Date.UTC(y, m - 1, 1))
              fechaCierre = d.toISOString().slice(0,10)
            }
            await createOpportunity({
              contactoId: c.id,
              servicioId: 1,
              etapaId: 'contacto_inicial',
              nombreCliente: c.nombre,
              valorUsd: 0,
              probabilidad: 0,
              fechaCierre,
              telefono: c.telefono || undefined,
              email: (c.email && c.email.trim() !== '') ? c.email : undefined,
            })
          } catch(_) {}
        }
      }
      // Marcar como cliente en backend (y local)
      await bulkMoveContactsToPipeline(ids)
      setContacts(prev => prev.map(c => selectedIds.has(c.id!) ? { ...c, tipo: 'cliente' } : c))
      toast({ title:'Movidos al pipeline', description:`${selectedIds.size} contacto(s)` })
      setActiveTab('pipeline')
      clearSelection()
    } catch(e:any) {
      toast({ title:'Error', description:e.message || 'No se pudo mover', variant:'destructive' })
    }
  }
  function finalizeImport(imported:number, skipped:number) {
    setImporting(false)
    setImportFailed(null)
    clearWatchers()
    try { popupRef.current?.close() } catch(_) {}
    popupRef.current = null
    setLastImport({ imported, skipped })
    // Toast más visible
    toast({ title: 'Importación de Google', description: `Importados: ${imported} · Duplicados: ${skipped}`, variant: 'default' })
    // Actualizar estado de conexión
    getGoogleSyncStatus().then(setGoogleStatus).catch(()=>{})
    // Refrescar a la primera página para ver lo nuevo
    loadContacts({ page: 1 })
  }
  function failImport(msg:string) {
    setImporting(false)
    setImportFailed(msg || 'Fallo en importación')
    clearWatchers()
    try { popupRef.current?.close() } catch(_) {}
    popupRef.current = null
    toast({ title: 'Importación fallida', description: msg, variant: 'destructive' })
  }
  function checkLocalStorageFallback() {
    try {
      const stored = localStorage.getItem('googleImportResult')
      if (stored) {
        const data = JSON.parse(stored)
        if (data && data.ts && Date.now() - data.ts < 20000) {
          localStorage.removeItem('googleImportResult')
          finalizeImport(data.imported || 0, data.skipped || 0)
          return true
        }
      }
    } catch(_) {}
    return false
  }
  const { addOpportunity } = usePipeline()
  const { setActiveTab } = useDashboardTabs()
  const { toast } = useToast();
  const { user, hasRole } = useAuth();

  async function loadContacts(next?: { page?: number; search?: string; type?: string }) {
    setLoading(true)
    setError(null)
    try {
      const { data, meta } = await fetchContacts({ page: next?.page ?? page, pageSize, search: next?.search ?? searchTerm, type: next?.type ?? selectedType })
      // Normalizar etiquetas para que persistan visualmente aunque el backend devuelva 'etiqueta' como string
      const cache = readTagCache()
      let normalized = (data || []).map((c:any) => {
        const etiquetaStr = (c && (c.etiqueta ?? c.etiqueta_unica ?? c.tag)) as string | undefined
        const etiquetasArr: string[] = (Array.isArray(c.etiquetas) && c.etiquetas.length)
          ? c.etiquetas
          : (etiquetaStr && etiquetaStr.trim() !== '' ? [etiquetaStr] : [])
        // Mezclar con cache local si existe
        const cached = cache[c.id]
        const merged: string[] = cached?.etiquetas && cached.etiquetas.length ? cached.etiquetas : etiquetasArr
        return { ...c, etiquetas: merged, etiqueta_otro: cached?.etiqueta_otro ?? c.etiqueta_otro }
      }) as ContactDTO[]
      if (onlyClients) {
        normalized = normalized.filter(c => (c.tipo || '').toLowerCase() === 'cliente' || (c.etiquetas || []).some(e=> e.toLowerCase() === 'cliente'))
      }
      setContacts(normalized)
      setTotal(meta?.total || data.length)
    } catch (e:any) {
      setError(e.message || 'Error cargando contactos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadContacts({ page: 1 }) }, [])
  useEffect(() => { const t = setTimeout(()=> loadContacts({ page: 1, search: searchTerm }), 250); return ()=> clearTimeout(t) }, [searchTerm])
  useEffect(() => { loadContacts({ page: 1, type: selectedType }) }, [selectedType])
  useEffect(() => { loadContacts({ page }) }, [page])
  useEffect(() => { getGoogleSyncStatus().then(setGoogleStatus).catch(()=>{}) }, [])

  // Listener para mensaje de popup de importación
  useEffect(() => {
    function handleMessage(ev: MessageEvent) {
      if (!ev.data) return;
      if (ev.data.type === 'google-import-result') {
        finalizeImport(ev.data.imported, ev.data.skipped)
      } else if (ev.data.type === 'google-import-error') {
        const err = (ev.data.error || '').toString();
        let description = ev.data.description || 'Error en autorización con Google';
        if (err === 'access_denied') {
          description = 'Acceso denegado. Asegúrate de que tu correo esté añadido como Test User en Google Cloud (OAuth consent screen) y vuelve a intentar.';
        }
        failImport(description)
      }
    }
    window.addEventListener('message', handleMessage)
    // Fallback al recuperar foco (user cerró popup)
    function onFocus() {
      if (popupRef.current && popupRef.current.closed && importing) {
        if (!checkLocalStorageFallback()) {
          gentleRefreshAfterClose('Ventana cerrada. Actualizando lista…')
        }
      }
    }
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('message', handleMessage)
      window.removeEventListener('focus', onFocus)
      clearWatchers()
    }
  }, [])

  const filteredContacts = contacts

  const getTypeColor = (type: string) => {
    switch (type) {
      case "lead":
        return "#94A3B8"
      case "prospecto":
        return "var(--primary)"
      case "cliente":
        return "#10B981"
      default:
        return "#6B7280"
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "lead":
        return "Lead"
      case "prospecto":
        return "Prospecto"
      case "cliente":
        return "Cliente"
      default:
        return type
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency", 
      currency: "PEN", // Cambiado de USD a PEN (Nuevo Sol Peruano)
      minimumFractionDigits: 0,
    }).format(amount)
  }

  async function handleCreateContact(data: NewContactFormValues) {
    const created = await createContact({
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      telefono: data.telefono,
      tipo: data.tipo,
      origen: data.origen,
      notas: data.notas,
      departamento: data.departamento,
      sexo: data.sexo,
      fecha_nacimiento: data.fecha_nacimiento,
      etiquetas: data.etiquetas,
      etiqueta_otro: data.etiqueta_otro
    })
    // Auto-sync mínimo a Google (si está autorizado): nombre/apellido/email/telefono
    try { await createGoogleContact({ nombre: data.nombre, apellido: data.apellido, email: data.email, telefono: data.telefono }) }
    catch(e:any) {
      const msg = (e?.message || '').toString()
      if (/401/.test(msg) || /No conectado a Google/i.test(msg)) {
        toast({ title: 'Conecta Google para sincronizar', description: 'Autoriza en Importar Google para guardar también en tu cuenta.', variant: 'default' })
      }
    }
    setContacts(prev => [created, ...prev])
  }

  // --- Manejo edición ---
  // Sanea un patch antes de enviarlo al backend (no mandar strings vacíos ni undefined)
  function sanitizePatch<T extends Record<string, any>>(patch: T): Partial<T> {
    const out: Partial<T> = {}
    for (const [k, v] of Object.entries(patch || {})) {
      if (v === undefined) continue
      if (typeof v === 'string' && v.trim() === '') continue
      if (k === 'tipo' && typeof v === 'string') {
        const t = v.toLowerCase().trim()
        if (t === 'lead' || t === 'prospecto' || t === 'cliente') (out as any)[k] = t as any
        else continue
      } else {
        (out as any)[k] = v as any
      }
    }
    return out
  }

  async function handleUpdateContact(id: number, data: EditContactFormValues) {
    try {
      const patch = sanitizePatch(data)
      const updated = await updateContact(id, patch)
      setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c))
      try { await createGoogleContact({ nombre: patch.nombre || updated.nombre, apellido: (updated as any).apellido, email: patch.email || updated.email, telefono: patch.telefono || updated.telefono }) } catch(_) {}
      toast({ title: 'Contacto actualizado', description: `Tipo: ${(updated as any).tipo || patch.tipo || ''}` })
    } catch(e:any) {
      let msg = e?.message || 'No se pudo actualizar'
      const statusMatch = msg.match(/\|STATUS:(\d{3})$/)
      let status = ''
      if (statusMatch) { status = statusMatch[1]; msg = msg.replace(/\|STATUS:\d{3}$/, '') }
      if (status === '400') msg = msg || 'Datos inválidos'
      if (status === '404') msg = msg || 'Contacto no encontrado'
      toast({ title: 'Error actualizando', description: msg, variant: 'destructive' })
    }
  }

  // --- Manejo eliminación ---
  async function handleDeleteContact(id: number) {
    // Mono-usuario: no validamos rol, backend ya no exige admin
    const confirmed = window.confirm('¿Eliminar este contacto? Esta acción no se puede deshacer.')
    if (!confirmed) return
    setDeletingId(id)
    try {
      const prevCount = contacts.length
      const currentPage = page
      const currentTotal = total
      await deleteContact(id)
      setContacts(prev => prev.filter(c => c.id !== id))
      setTotal(t => Math.max(0, t - 1))
      toast({ title: 'Contacto eliminado' })
      // Rellenar huecos: si hay más elementos después de esta página, recargar; si la página quedó vacía y no es la primera, retroceder una página
      const newTotal = Math.max(0, currentTotal - 1)
      const hasMoreAfterPage = currentPage * pageSize <= newTotal
      if (prevCount <= 1 && currentPage > 1) {
        // Esta página se quedó sin elementos, ir a la anterior
        const prevPage = currentPage - 1
        setPage(prevPage)
        loadContacts({ page: prevPage })
      } else if (hasMoreAfterPage) {
        // Hay más elementos que deberían completar la página actual
        loadContacts({ page: currentPage })
      }
    } catch(e:any) {
      // Parsear formato mensaje|STATUS:### si existe
      let raw = e.message || ''
      let status: string | null = null
      const statusMatch = raw.match(/\|STATUS:(\d{3})$/)
      if (statusMatch) {
        status = statusMatch[1]
        raw = raw.replace(/\|STATUS:\d{3}$/, '')
      }
      let finalMsg = raw
      if (status === '403') finalMsg = 'No autorizado para eliminar'
      else if (status === '409' || /oportunidades/i.test(raw)) finalMsg = 'No se puede eliminar: contacto ligado a oportunidades'
      if (!finalMsg) finalMsg = 'Error eliminando'
      toast({ title: 'Error', description: finalMsg, variant: 'destructive' })
    } finally {
      setDeletingId(null)
    }
  }

  // Seleccionar todos (página actual)
  function selectAllOnPage() {
    const ids = filteredContacts.map(c => c.id!).filter(Boolean)
    setSelectedIds(new Set(ids))
    setBubblePos(null)
    setSelectAllMode(true)
    toast({ title: 'Seleccionados', description: `${ids.length} contacto(s)` })
  }

  // Agrupación por tipo (Clientes vs No clientes)
  function renderContactsGrid(list: ContactDTO[]) {
    if (!splitByType) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map(c => renderCard(c))}
        </div>
      )
    }
    const clientes = list.filter(c => (c.tipo || '').toLowerCase() === 'cliente')
    const otros = list.filter(c => (c.tipo || '').toLowerCase() !== 'cliente')
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2"><Users className="h-4 w-4"/><h4 className="font-semibold">Clientes</h4><span className="text-xs text-gray-500">{clientes.length}</span></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientes.map(c => renderCard(c))}
        </div>
        <div className="flex items-center gap-2 pt-2"><Users className="h-4 w-4"/><h4 className="font-semibold">Contactos</h4><span className="text-xs text-gray-500">{otros.length}</span></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {otros.map(c => renderCard(c))}
        </div>
      </div>
    )
  }

  function renderCard(c: ContactDTO) {
    const selected = selectedIds.has(c.id!)
    return (
      <Card key={c.id} className={`border border-gray-200 group ${selected ? 'ring-2 ring-indigo-500' : ''} cursor-pointer`} onClick={()=> toggleSelected(c.id!)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold gap-2 flex flex-col sm:flex-row sm:items-center sm:justify-between sm:space-y-0 space-y-2">
            <span className="min-w-0 flex items-center gap-2 sm:flex-1">
              <input type="checkbox" checked={selected} onChange={(e)=> toggleSelected(c.id!, e)} onClick={(e)=> e.stopPropagation()} />
              <button
                type="button"
                title={c.nombre}
                className="text-left hover:underline truncate max-w-full text-sm"
                onClick={(e)=>{ e.stopPropagation(); setPreviewContact(c); setPreviewOpen(true) }}
              >
                {c.nombre}
              </button>
            </span>
            <div className="flex items-center gap-2 sm:ml-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end max-w-full">
              <Badge className="shrink-0" style={{ backgroundColor: getTypeColor(c.tipo || 'lead'), color: '#fff' }}>{getTypeLabel(c.tipo || 'lead')}</Badge>
              <div className="flex gap-1 flex-wrap max-w-full" onClick={(e)=> e.stopPropagation()}>
                {/* Acciones simplificadas */}
                {simpleActions ? (
                  <>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setContactEditing(c); setEditOpen(true) }} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => convertToClient(c.id!)} title="Convertir a cliente">
                      <Workflow className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" disabled={deletingId === c.id} onClick={() => handleDeleteContact(c.id!)} title="Eliminar">
                      {deletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setContactEditing(c); setEditOpen(true) }} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="WhatsApp" onClick={() => {
                      const phone = (c.telefono || '').replace(/\D/g,'')
                      if (!phone) { toast({ title:'Sin teléfono', description:'El contacto no tiene teléfono', variant:'destructive' }); return }
                      const msg = encodeURIComponent(`Hola ${c.nombre.split(' ')[0]}, soy del equipo IMB. ¿Podemos agendar una llamada para conocer tu interés?`)
                      const url = `https://wa.me/${phone}?text=${msg}`
                      window.open(url, '_blank')
                    }}>
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Calendario" onClick={() => {
                      const title = encodeURIComponent(`Llamada con ${c.nombre}`)
                      const details = encodeURIComponent(`Contacto: ${c.email || ''} ${c.telefono || ''}`)
                      const start = new Date(Date.now() + 60*60*1000)
                      const end = new Date(start.getTime() + 30*60*1000)
                      const fmt = (d:Date)=> d.toISOString().replace(/[-:]|\..*/g,'')
                      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}`
                      window.open(url, '_blank')
                    }}>
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Simular cotización"
                      onClick={() => { setSimulateContact(c); setSimulateOpen(true) }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Añadir al pipeline" disabled={creatingOppForId === c.id} onClick={async () => {
                      try {
                        if (creatingOppForId) return;
                        setCreatingOppForId(c.id!)
                        const opp = await createOpportunityFromContact({ id: c.id, nombre: c.nombre, telefono: c.telefono, email: c.email })
                        addOpportunity('contacto_inicial', {
                          id: String(opp.id),
                          clientName: opp.nombreCliente || c.nombre,
                          serviceName: 'Cotización',
                          agent: 'Sin asignar',
                          value: opp.valorUsd || 0,
                          probability: opp.probabilidad || 0,
                          closeDate: opp.fechaCierre || new Date().toISOString().slice(0,10),
                          phone: opp.telefono || c.telefono || '',
                          email: opp.email || c.email || ''
                        })
                        try {
                          await updateContact(c.id!, { tipo: 'cliente' })
                          setContacts(prev => prev.map(x => x.id === c.id ? { ...x, tipo: 'cliente' } : x))
                        } catch(_) {}
                        toast({ title: 'Oportunidad creada', description: c.nombre })
                        setActiveTab('pipeline')
                      } catch(e:any) {
                        let msg = e.message || 'No se pudo crear oportunidad'
                        const statusMatch = msg.match(/\|STATUS:(\d{3})$/)
                        let status = ''
                        if (statusMatch) { status = statusMatch[1]; msg = msg.replace(/\|STATUS:\d{3}$/, '') }
                        if (status === '401') msg = 'Sesión expirada o no autenticado'
                        if (status === '403') msg = 'Sin permisos para crear oportunidades'
                        toast({ title: 'Error creando oportunidad', description: msg, variant: 'destructive' })
                      } finally { setCreatingOppForId(null) }
                    }}>
                      <Workflow className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" disabled={deletingId === c.id} onClick={() => handleDeleteContact(c.id!)} title="Eliminar">
                      {deletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">{c.email || 'Sin email'} · {c.telefono || 'Sin teléfono'}</CardDescription>
        </CardHeader>
        {c.notas && <CardContent className="pt-0 text-xs text-gray-600 whitespace-pre-line">{c.notas}</CardContent>}
      </Card>
    )
  }

  const showBottomBar = selectedIds.size > 0
  const showMultiPanel = false
  const showBubble = false

  return (
    <div className="space-y-6" style={{ paddingBottom: showBottomBar ? 110 : undefined }}>
      {/* Simulador en modal */}
      <Dialog open={simulateOpen} onOpenChange={(o)=> { setSimulateOpen(o); if (!o) setSimulateContact(null) }}>
        <DialogContent className="max-w-5xl w-[95vw] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Simulador de Cotización</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            {simulateContact && (
              <QuoteSimulator contactoId={simulateContact.id!} clienteNombre={simulateContact.nombre} />
            )}
          </div>
        </DialogContent>
      </Dialog>
      {!simpleActions && (
      <div className="flex items-center justify-end">
        <div className="flex gap-2 items-center">
          {/* Indicador de conexión Google */}
          {googleStatus.connected ? (
            <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1"/>Google conectado</Badge>
          ) : (
            <Badge className="bg-gray-400"><AlertTriangle className="h-3 w-3 mr-1"/>Google no conectado</Badge>
          )}
          <Button variant="outline" disabled={importing} onClick={async () => {
            if (importing) return;
            const popup = openGoogleImportPopup('about:blank');
            popupRef.current = popup;
            try {
              setImporting(true)
              if (popup) popup.document.write('<p style="font-family:sans-serif;padding:10px;">Obteniendo URL de autorización...</p>');
              const url = await getGoogleContactsAuthUrl();
              if (popup) popup.location.replace(url);
              toast({ title: 'Redirigiendo a Google', description: 'Autoriza el acceso y se importarán tus contactos.' });
              // Interval para detectar cierre + fallback almacenamiento
              const started = Date.now();
              watcherRef.current = window.setInterval(() => {
                if (checkLocalStorageFallback()) return; // ya se limpió dentro
                if (popupRef.current && popupRef.current.closed) {
                  if (Date.now() - started > 800) {
                    gentleRefreshAfterClose('Se cerró el popup. Actualizando lista…');
                  } else {
                    // cierre inmediato: quizá el navegador bloqueó; intentamos fallback
                    if (!checkLocalStorageFallback()) gentleRefreshAfterClose('Popup bloqueado o cerrado. Actualizando lista…');
                  }
                }
              }, 400);
              // Timeout duro por si nada llega
              timeoutRef.current = window.setTimeout(() => {
                if (importing) {
                  if (!checkLocalStorageFallback()) gentleRefreshAfterClose('Tiempo de espera agotado. Actualizando lista…');
                }
              }, 20000);
            } catch(e:any) {
              const msg = e?.message?.includes('401') ? 'Sesión expirada. Vuelve a iniciar sesión.' : (e.message || 'Error desconocido');
              failImport(msg)
              if (popup) {
                popup.document.open();
                popup.document.write(`<div style="font-family:sans-serif;padding:16px;max-width:360px;">`+
                  `<h3>Fallo al iniciar importación</h3>`+
                  `<p style=\"color:#b91c1c;\">${msg}</p>`+
                  `<p style=\"font-size:12px;color:#555;\">Cierra esta ventana y reintenta.</p>`+
                  `</div>`);
                popup.document.close();
              }
            }
          }}>
            {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            {importing ? 'Importando…' : 'Importar Google'}
          </Button>
          {/* Botón Reintentar cuando falla, sin reabrir popup: dispara sync manual */}
          {importFailed && (
            <Button variant="outline" onClick={async ()=>{
              try {
                const res = await manualGoogleSync();
                toast({ title: 'Reintento de sincronización', description: `Importados: ${res.synced} · Duplicados: ${Math.max(0, res.total - res.synced)}` })
                setImportFailed(null)
                await loadContacts({ page: 1 })
              } catch(e:any) {
                toast({ title:'Sigue fallando', description: e.message || 'No se pudo sincronizar', variant: 'destructive' })
              }
            }}><RefreshCw className="h-4 w-4 mr-2"/>Reintentar</Button>
          )}
          {lastImport && (
            <span className="text-xs text-gray-600">
              Última importación: <b>+{lastImport.imported}</b> · duplicados {lastImport.skipped}
            </span>
          )}
          <Button variant="brand" onClick={() => setOpenNew(true)}>
            <Plus className="h-4 w-4 mr-2" />Nuevo Contacto
          </Button>
        </div>
      </div>

      {/* Filters */}
      {!simpleActions && (
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar contactos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Button
                variant={selectedType === "all" ? "brand" : "outline"}
                size="sm"
                onClick={() => setSelectedType("all")}
              >
                Todos
              </Button>
              <Button
                variant={selectedType === "lead" ? "brand" : "outline"}
                size="sm"
                onClick={() => setSelectedType("lead")}
              >
                Leads
              </Button>
              <Button
                variant={selectedType === "prospecto" ? "brand" : "outline"}
                size="sm"
                onClick={() => setSelectedType("prospecto")}
              >
                Prospectos
              </Button>
              <Button
                variant={selectedType === "cliente" ? "brand" : "outline"}
                size="sm"
                onClick={() => setSelectedType("cliente")}
              >
                Clientes
              </Button>
              {/* Seleccionar todos */}
              <Button variant="outline" size="sm" onClick={selectAllOnPage}>Seleccionar todos</Button>
              {/* Separar por tipo */}
              <Button variant={splitByType?"default":"outline"} size="sm" onClick={()=> setSplitByType(v=>!v)}>
                {splitByType? 'Juntar' : 'Separar por tipo'}
              </Button>
              {/* Abrir duplicados */}
              <Button variant="outline" size="sm" onClick={async ()=>{
                try {
                  const groups = await listDuplicateContacts()
                  setDupGroups(groups)
                  setDupsOpen(true)
                } catch(e:any) {
                  toast({ title:'Error', description: e.message || 'No se pudo obtener duplicados', variant:'destructive' })
                }
              }}>
                <Merge className="h-4 w-4 mr-2"/>Duplicados
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Grid */}
      {loading ? (
        <Card><CardContent className="p-8 text-center"><p className="text-gray-500">Cargando contactos...</p></CardContent></Card>
      ) : error ? (
        <Card><CardContent className="p-8 text-center"><p className="text-red-500">{error}</p></CardContent></Card>
      ) : filteredContacts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">
              No hay contactos para mostrar.
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Los contactos deben cargarse desde la base de datos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {renderContactsGrid(filteredContacts)}
          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-gray-600">Página {page} de {totalPages} · {total} contacto(s)</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page<=1} onClick={()=> setPage(p => Math.max(1, p-1))}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={page>=totalPages} onClick={()=> setPage(p => Math.min(totalPages, p+1))}>Siguiente</Button>
            </div>
          </div>
        </>
      )}
      <NewContactDialog
        open={openNew}
        onOpenChange={setOpenNew}
        onSubmit={handleCreateContact}
      />
      <EditContactDialog
        open={editOpen}
        contact={contactEditing}
        onOpenChange={(v) => { setEditOpen(v); if(!v) setContactEditing(null) }}
        onSubmit={async (id, data) => {
          await handleUpdateContact(id, data)
        }}
      />
      {/* Estado Importando overlay */}
      {importing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-md p-6 shadow-md text-center space-y-2">
            <p className="font-medium">Importando contactos de Google...</p>
            <p className="text-sm text-gray-500">Puedes continuar; esta ventana se cerrará al terminar.</p>
          </div>
        </div>
      )}
      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={(v)=>{ setPreviewOpen(v); if(!v) setPreviewContact(null) }}>
        {/* Modal sólido */}
        <DialogContent className="max-w-md sm:max-w-lg p-6 max-h-[82vh] overflow-y-auto rounded-lg bg-white border border-gray-200 shadow-2xl text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg">Contacto</DialogTitle>
          </DialogHeader>
          {previewContact && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 text-white flex items-center justify-center font-semibold shadow">{(previewContact.nombre||'?').charAt(0).toUpperCase()}</div>
                <div className="text-base font-semibold">{previewContact.nombre}</div>
              </div>
              <div><span className="text-gray-500">Email:</span> {previewContact.email || '—'}</div>
              <div><span className="text-gray-500">Teléfono:</span> {previewContact.telefono || '—'}</div>
              <div><span className="text-gray-500">Tipo:</span> {previewContact.tipo || 'lead'}</div>
              <div><span className="text-gray-500">Etiqueta:</span> {(previewContact.etiquetas && previewContact.etiquetas[0]) || previewContact.etiqueta_otro || '—'}</div>
              <div><span className="text-gray-500">Departamento:</span> {(previewContact as any).departamento || '—'}</div>
              <div><span className="text-gray-500">Sexo:</span> {(previewContact as any).sexo || '—'}</div>
              <div><span className="text-gray-500">F. Nacimiento:</span> {((previewContact as any).fecha_nacimiento || '').toString().slice(0,10) || '—'}</div>
              {previewContact.notas && (
                <div><span className="text-gray-500">Notas:</span>
                  <div className="mt-1 whitespace-pre-line">{previewContact.notas}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Duplicados dialog */}
      <Dialog open={dupsOpen} onOpenChange={setDupsOpen}>
        <DialogContent className="max-w-2xl p-4 max-h-[80vh] overflow-y-auto bg-white border border-gray-200 shadow-xl text-gray-900">
          <DialogHeader>
            <DialogTitle>Duplicados detectados</DialogTitle>
          </DialogHeader>
          {!dupGroups.length ? (
            <p className="text-sm text-gray-500">No se encontraron duplicados.</p>
          ) : (
            <div className="space-y-4">
              {dupGroups.map((g, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{g.by}: <span className="font-normal text-gray-600">{g.value || '—'}</span> · {g.count} elemento(s)</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-xs text-gray-600">IDs: {g.members.map(m=>m.id).join(', ')}</div>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={async ()=>{
                        if (g.members.length < 2) return
                        const [primary, ...dups] = g.members
                        for (const d of dups) { await mergeContacts(primary.id!, d.id!).catch(()=>{}) }
                        toast({ title:'Fusión completada', description:`Grupo ${g.by}: ${g.value}` })
                        await loadContacts({ page: 1 })
                        // Actualizar lista local de duplicados
                        const rest = [...dupGroups]
                        rest.splice(idx,1)
                        setDupGroups(rest)
                      }}>Fusionar grupo</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <div className="flex justify-end">
                <Button onClick={async ()=>{
                  for (const g of dupGroups) {
                    if (g.members.length < 2) continue
                    const [primary, ...dups] = g.members
                    for (const d of dups) { await mergeContacts(primary.id!, d.id!).catch(()=>{}) }
                  }
                  toast({ title:'Fusión en lote', description:`Se fusionaron ${dupGroups.length} grupo(s)` })
                  setDupsOpen(false)
                  await loadContacts({ page: 1 })
                }}>Fusionar todos</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Barra inferior fija para acciones masivas */}
      {showBottomBar && (
        <div className="fixed inset-x-0 bottom-3 z-40 px-4">
          <div className="mx-auto max-w-6xl rounded-2xl bg-white/85 backdrop-blur-xl border border-white/40 shadow-2xl p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">Seleccionados: <b>{selectedIds.size}</b></div>
              <div className="flex-1 flex items-center gap-2">
                <select value={bulkEtiqueta} onChange={e=>setBulkEtiqueta(e.target.value)} className="border rounded-md h-8 px-2 bg-white text-sm">
                  <option value="">Etiqueta…</option>
                  <option value="Techo Propio">Techo Propio</option>
                  <option value="Credito Mivivienda">Credito Mivivienda</option>
                  <option value="Terreno en Captacion">Terreno en Captacion</option>
                  <option value="Tasaciones">Tasaciones</option>
                  <option value="Construccion">Construccion</option>
                  <option value="Levantamiento Topografico">Levantamiento Topografico</option>
                </select>
                <Input value={bulkEtiquetaOtro} onChange={e=>setBulkEtiquetaOtro(e.target.value)} placeholder="Otros (opcional)" className="h-8 text-sm max-w-[220px]" />
                <Button variant="outline" size="sm" onClick={bulkTag}>Etiquetar</Button>
                <Button variant="outline" size="sm" onClick={bulkMove}>Pipeline</Button>
                <Button variant="destructive" size="sm" onClick={bulkDelete}>Eliminar</Button>
              </div>
              <Button variant="ghost" size="sm" onClick={clearSelection}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}
      {/* Spacer para asegurar que el contenido no quede oculto tras la barra inferior */}
      {showBottomBar && <div style={{ height: 96 }} />}
    </div>
  )
}
