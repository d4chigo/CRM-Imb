"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Plus, Download, Pencil, Trash2, Loader2, Workflow, MessageSquare, Calendar as CalendarIcon, Merge } from "lucide-react"
import { NewContactDialog, NewContactFormValues } from "@/components/forms/NewContactDialog"
// Nuevo dialog para edición
import { EditContactDialog, EditContactFormValues } from '@/components/forms/EditContactDialog'
// Reemplazamos uso de hook local por contexto global del pipeline
import { usePipeline } from '@/contexts/PipelineContext'
import { fetchContacts, createContact, updateContact, deleteContact, ContactDTO, listDuplicateContacts, mergeContacts, bulkTagContacts, bulkMoveContactsToPipeline } from "@/lib/contacts"
import { createOpportunityFromContact } from '@/lib/opportunities'
import { useAuth } from '@/contexts/AuthContext'
import { getGoogleContactsAuthUrl, openGoogleImportPopup, createGoogleContact } from "@/lib/googleContacts"
import { useToast } from '@/hooks/use-toast'
import { useDashboardTabs } from '@/contexts/DashboardTabsContext'

// Estado interno para contactos reales
// Se cargan desde la API al montar el componente

export function ContactsList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState("all")
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
  const [lastImport, setLastImport] = useState<{ imported: number; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkEtiqueta, setBulkEtiqueta] = useState<string>('')
  const [bulkEtiquetaOtro, setBulkEtiquetaOtro] = useState<string>('')
  const [bubblePos, setBubblePos] = useState<{ top:number; left:number } | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewContact, setPreviewContact] = useState<ContactDTO | null>(null)
  // Refs para manejo robusto del popup y watchers
  const popupRef = useRef<Window | null>(null)
  const watcherRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)

  // ---- Helpers globales dentro del componente ----
  function clearWatchers() {
    if (watcherRef.current) { clearInterval(watcherRef.current); watcherRef.current = null }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
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
      return n
    })
  }

  function clearSelection() { setSelectedIds(new Set()); setBubblePos(null) }

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
      await bulkTagContacts(Array.from(selectedIds), bulkEtiqueta || undefined as any, bulkEtiquetaOtro || undefined)
      // Reflejar en estado local
      setContacts(prev => prev.map(c => selectedIds.has(c.id!) ? { ...c, etiquetas: bulkEtiqueta ? [bulkEtiqueta] : [], etiqueta_otro: bulkEtiquetaOtro || null } : c))
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
          try { await createOpportunityFromContact({ id: c.id, nombre: c.nombre, telefono: c.telefono, email: c.email }, 'contacto_inicial') } catch(_) {}
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
    clearWatchers()
  try { popupRef.current?.close() } catch(_) {}
  popupRef.current = null
  setLastImport({ imported, skipped })
    toast({ title: 'Importación completada', description: `Importados: ${imported} | Duplicados: ${skipped}` })
  // Refrescar a la primera página para ver lo nuevo
  loadContacts({ page: 1 })
  }
  function failImport(msg:string) {
    setImporting(false)
    clearWatchers()
  try { popupRef.current?.close() } catch(_) {}
  popupRef.current = null
    toast({ title: 'Importación', description: msg, variant: 'destructive' })
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
      setContacts(data)
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
        if (!checkLocalStorageFallback()) failImport('Popup cerrado sin completar.')
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
        return "#FCBA00"
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
  async function handleUpdateContact(id: number, data: EditContactFormValues) {
    try {
      const updated = await updateContact(id, data)
      // Actualizamos estado local sin refetch completo
      setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c))
      // Crear en Google si está autorizado (por ahora solo en creación; edición futura como upsert)
      try { await createGoogleContact({ nombre: data.nombre || updated.nombre, apellido: (updated as any).apellido, email: data.email || updated.email, telefono: data.telefono || updated.telefono }) } catch(_) {}
    } catch(e:any) {
      toast({ title: 'Error', description: e.message || 'No se pudo actualizar', variant: 'destructive' })
      throw e
    }
  }

  // --- Manejo eliminación ---
  async function handleDeleteContact(id: number) {
    // Mono-usuario: no validamos rol, backend ya no exige admin
    const confirmed = window.confirm('¿Eliminar este contacto? Esta acción no se puede deshacer.')
    if (!confirmed) return
    setDeletingId(id)
    try {
      await deleteContact(id)
      setContacts(prev => prev.filter(c => c.id !== id))
      toast({ title: 'Contacto eliminado' })
    } catch(e:any) {
      // Parsear formato mensaje|STATUS:### si existe
      let raw = e.message || ''
      let status: string | null = null
      const statusMatch = raw.match(/\|STATUS:(\d{3})$/)
      if (statusMatch) {
        status = statusMatch[1]
        raw = raw.replace(/\|STATUS:\d{3}$/,'')
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "#303030" }}>
            Contactos
          </h2>
          <p className="text-gray-600">Gestiona tus leads, prospectos y clientes</p>
        </div>
  <div className="flex gap-2 items-center">
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
                    failImport('Popup cerrado sin completar.');
                  } else {
                    // cierre inmediato: quizá el navegador bloqueó; intentamos fallback
                    if (!checkLocalStorageFallback()) failImport('Popup bloqueado o cerrado.');
                  }
                }
              }, 400);
              // Timeout duro por si nada llega
              timeoutRef.current = window.setTimeout(() => {
                if (importing) {
                  if (!checkLocalStorageFallback()) failImport('Tiempo de espera agotado (20s)');
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
          {lastImport && (
            <span className="text-xs text-gray-500">
              Última importación: +{lastImport.imported} · duplicados {lastImport.skipped}
            </span>
          )}
          <Button variant="outline" onClick={async ()=>{
            try {
              const groups = await listDuplicateContacts()
              if (!groups.length) { toast({ title:'Duplicados', description:'No se encontraron duplicados' }); return }
              const g = groups[0]
              const [primary, ...dups] = g.members
              const proceed = window.confirm(`Se encontraron duplicados por ${g.by}: ${g.value}\nFusionar el más antiguo con ${dups.length} duplicado(s)?`)
              if (!proceed) return
              for (const d of dups) { await mergeContacts(primary.id!, d.id!) }
              toast({ title:'Fusión completada', description:`Grupo ${g.by}: ${g.value}` })
              loadContacts({ page: 1 })
            } catch(e:any) {
              toast({ title:'Error', description: e.message || 'No se pudo obtener duplicados', variant:'destructive' })
            }
          }}>
            <Merge className="h-4 w-4 mr-2" />Duplicados
          </Button>
          <Button style={{ backgroundColor: "#FCBA00" }} className="text-white" onClick={() => setOpenNew(true)}>
            <Plus className="h-4 w-4 mr-2" />Nuevo Contacto
          </Button>
        </div>
      </div>

      {selectedIds.size > 0 && bubblePos && (
        <div className="fixed z-40" style={{ top: bubblePos.top, left: bubblePos.left }}>
          <div className="rounded-lg shadow-lg border bg-white p-3 w-[320px]">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm">Seleccionados: <b>{selectedIds.size}</b></div>
              <Button variant="ghost" size="sm" onClick={clearSelection}>Limpiar</Button>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-gray-600">Etiqueta</label>
                <select value={bulkEtiqueta} onChange={e=>setBulkEtiqueta(e.target.value)} className="mt-1 w-full border rounded-md h-8 px-2 bg-white text-sm">
                  <option value="">Selecciona…</option>
                  <option value="Techo Propio">Techo Propio</option>
                  <option value="Credito Mivivienda">Credito Mivivienda</option>
                  <option value="Terreno en Captacion">Terreno en Captacion</option>
                  <option value="Tasaciones">Tasaciones</option>
                  <option value="Construccion">Construccion</option>
                  <option value="Levantamiento Topografico">Levantamiento Topografico</option>
                </select>
              </div>
              <Input value={bulkEtiquetaOtro} onChange={e=>setBulkEtiquetaOtro(e.target.value)} placeholder="Otros (opcional)" className="h-8 text-sm" />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={bulkTag}>Etiquetar</Button>
                <Button variant="outline" size="sm" onClick={bulkMove}>Pipeline</Button>
                <Button variant="destructive" size="sm" onClick={bulkDelete}>Eliminar</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
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
            <div className="flex gap-2">
              <Button
                variant={selectedType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("all")}
                style={selectedType === "all" ? { backgroundColor: "#FCBA00" } : {}}
                className={selectedType === "all" ? "text-white" : ""}
              >
                Todos
              </Button>
              <Button
                variant={selectedType === "lead" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("lead")}
                style={selectedType === "lead" ? { backgroundColor: "#FCBA00" } : {}}
                className={selectedType === "lead" ? "text-white" : ""}
              >
                Leads
              </Button>
              <Button
                variant={selectedType === "prospecto" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("prospecto")}
                style={selectedType === "prospecto" ? { backgroundColor: "#FCBA00" } : {}}
                className={selectedType === "prospecto" ? "text-white" : ""}
              >
                Prospectos
              </Button>
              <Button
                variant={selectedType === "cliente" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("cliente")}
                style={selectedType === "cliente" ? { backgroundColor: "#FCBA00" } : {}}
                className={selectedType === "cliente" ? "text-white" : ""}
              >
                Clientes
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
            <p className="text-sm text-gray-400">
              Implementar conexión con API de contactos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map(c => (
            <Card key={c.id} className="border border-gray-200 group">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base font-semibold">
                  <span className="truncate flex items-center gap-2" title={c.nombre}>
                    <input type="checkbox" checked={selectedIds.has(c.id!)} onChange={(e)=> toggleSelected(c.id!, e)} />
                    <button type="button" className="text-left hover:underline" onClick={()=>{ setPreviewContact(c); setPreviewOpen(true) }}>
                      {c.nombre}
                    </button>
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge style={{ backgroundColor: getTypeColor(c.tipo || 'lead'), color: '#fff' }}>{getTypeLabel(c.tipo || 'lead')}</Badge>
                    <div className="flex gap-1">
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
                      {/* Crear oportunidad en pipeline (persistente en backend) */}
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Añadir al pipeline" disabled={creatingOppForId === c.id} onClick={async () => {
                        try {
                          if (creatingOppForId) return;
                          setCreatingOppForId(c.id!)
                          // Primero persistimos en backend como oportunidad
                          const opp = await createOpportunityFromContact({ id: c.id, nombre: c.nombre, telefono: c.telefono, email: c.email })
                          // Luego reflejamos en UI local (etapa contacto_inicial)
                          console.log('[Pipeline] creando oportunidad desde contacto', opp)
                          addOpportunity('contacto_inicial', {
                            id: String(opp.id), // usar id backend para permitir persistir movimientos
                            clientName: opp.nombreCliente || c.nombre,
                            serviceName: 'Cotización',
                            agent: 'Sin asignar',
                            value: opp.valorUsd || 0,
                            probability: opp.probabilidad || 0,
                            closeDate: opp.fechaCierre || new Date().toISOString().slice(0,10),
                            phone: opp.telefono || c.telefono || '',
                            email: opp.email || c.email || ''
                          })
                          // Actualizar tipo del contacto a 'cliente' (backend + UI)
                          try {
                            await updateContact(c.id!, { tipo: 'cliente' })
                            setContacts(prev => prev.map(x => x.id === c.id ? { ...x, tipo: 'cliente' } : x))
                          } catch(_) { /* no bloquear por este fallo */ }
                          toast({ title: 'Oportunidad creada', description: c.nombre })
                          // Cambiar automáticamente a la pestaña pipeline para mostrar la nueva oportunidad
                          setActiveTab('pipeline')
                          console.log('[Pipeline] estado añadido, navegando a pipeline')
                        } catch(e:any) {
                          let msg = e.message || 'No se pudo crear oportunidad'
                          const statusMatch = msg.match(/\|STATUS:(\d{3})$/)
                          let status = ''
                          if (statusMatch) { status = statusMatch[1]; msg = msg.replace(/\|STATUS:\d{3}$/,'') }
                          if (status === '401') msg = 'Sesión expirada o no autenticado'
                          if (status === '403') msg = 'Sin permisos para crear oportunidades'
                          toast({ title: 'Error creando oportunidad', description: msg, variant: 'destructive' })
                          console.error('[Pipeline] error creando oportunidad', status, e)
                        } finally { setCreatingOppForId(null) }
                      }}>
                        <Workflow className="h-4 w-4" />
                      </Button>
                      {/* Botón de eliminar visible para todos; el backend restringe a admin y el handler muestra mensaje si no tiene permisos */}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" disabled={deletingId === c.id} onClick={() => handleDeleteContact(c.id!)} title="Eliminar">
                        {deletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardTitle>
                <CardDescription className="text-xs text-gray-500">{c.email || 'Sin email'} · {c.telefono || 'Sin teléfono'}</CardDescription>
              </CardHeader>
              {c.notas && <CardContent className="pt-0 text-xs text-gray-600 whitespace-pre-line">{c.notas}</CardContent>}
            </Card>
          ))}
  </div>
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
      <DialogContent className="max-w-md sm:max-w-lg p-4 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contacto</DialogTitle>
        </DialogHeader>
        {previewContact && (
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500">Nombre:</span> {previewContact.nombre}</div>
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
    </div>
  )
}
