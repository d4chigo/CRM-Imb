"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Plus, Download, Pencil, Trash2, Loader2, Workflow } from "lucide-react"
import { NewContactDialog, NewContactFormValues } from "@/components/forms/NewContactDialog"
// Nuevo dialog para edición
import { EditContactDialog, EditContactFormValues } from '@/components/forms/EditContactDialog'
// Reemplazamos uso de hook local por contexto global del pipeline
import { usePipeline } from '@/contexts/PipelineContext'
import { fetchContacts, createContact, updateContact, deleteContact, ContactDTO } from "@/lib/contacts"
import { createOpportunityFromContact } from '@/lib/opportunities'
import { useAuth } from '@/contexts/AuthContext'
import { getGoogleContactsAuthUrl, openGoogleImportPopup } from "@/lib/googleContacts"
import { useToast } from '@/hooks/use-toast'
import { useDashboardTabs } from '@/contexts/DashboardTabsContext'

// Estado interno para contactos reales
// Se cargan desde la API al montar el componente

export function ContactsList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [openNew, setOpenNew] = useState(false)
  const [contacts, setContacts] = useState<ContactDTO[]>([])
  // Estado para edición
  const [editOpen, setEditOpen] = useState(false)
  const [contactEditing, setContactEditing] = useState<ContactDTO | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Refs para manejo robusto del popup y watchers
  const popupRef = useRef<Window | null>(null)
  const watcherRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)

  // ---- Helpers globales dentro del componente ----
  function clearWatchers() {
    if (watcherRef.current) { clearInterval(watcherRef.current); watcherRef.current = null }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
  }
  function finalizeImport(imported:number, skipped:number) {
    setImporting(false)
    clearWatchers()
    popupRef.current = null
    toast({ title: 'Importación completada', description: `Importados: ${imported} | Duplicados: ${skipped}` })
    loadContacts()
  }
  function failImport(msg:string) {
    setImporting(false)
    clearWatchers()
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

  async function loadContacts() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchContacts()
      setContacts(data)
    } catch (e:any) {
      setError(e.message || 'Error cargando contactos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    async function load() {
      if(active) await loadContacts()
    }
    load()
    return () => { active = false }
  }, [])

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
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const filteredContacts = contacts.filter((contact) => {
    const nombre = (contact.nombre || '').toLowerCase()
    const email = (contact.email || '').toLowerCase()
    const matchesSearch = nombre.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase())
    const matchesType = selectedType === "all" || (contact.tipo || 'lead') === selectedType
    return matchesSearch && matchesType
  })

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
      email: data.email,
      telefono: data.telefono,
      tipo: data.tipo,
      origen: data.origen,
      notas: data.notas
    })
    setContacts(prev => [created, ...prev])
    // Insertar como oportunidad inicial en etapa contacto_inicial (solo UI por ahora)
    addOpportunity('contacto_inicial', {
      clientName: created.nombre,
      serviceName: 'N/A',
      agent: 'Sin asignar',
      value: 0,
      probability: 0,
      closeDate: new Date().toISOString().slice(0,10),
      phone: created.telefono || '',
      email: created.email || ''
    })
  }

  // --- Manejo edición ---
  async function handleUpdateContact(id: number, data: EditContactFormValues) {
    try {
      const updated = await updateContact(id, data)
      // Actualizamos estado local sin refetch completo
      setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c))
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
        <div className="flex gap-2">
      <Button variant="outline" onClick={async () => {
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
            <Download className="h-4 w-4 mr-2" />Importar Google
          </Button>
          <Button style={{ backgroundColor: "#FCBA00" }} className="text-white" onClick={() => setOpenNew(true)}>
            <Plus className="h-4 w-4 mr-2" />Nuevo Contacto
          </Button>
        </div>
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map(c => (
            <Card key={c.id} className="border border-gray-200 group">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base font-semibold">
                  <span className="truncate" title={c.nombre}>{c.nombre}</span>
                  <div className="flex items-center gap-2">
                    <Badge style={{ backgroundColor: getTypeColor(c.tipo || 'lead'), color: '#fff' }}>{getTypeLabel(c.tipo || 'lead')}</Badge>
                    <div className="opacity-0 group-hover:opacity-100 transition flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setContactEditing(c); setEditOpen(true) }} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {/* Crear oportunidad en pipeline (persistente en backend) */}
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Añadir al pipeline" onClick={async () => {
                        try {
                          // Primero persistimos en backend como oportunidad
                          const opp = await createOpportunityFromContact({ id: c.id, nombre: c.nombre, telefono: c.telefono, email: c.email })
                          // Luego reflejamos en UI local (etapa contacto_inicial)
              console.log('[Pipeline] creando oportunidad desde contacto', opp)
                          addOpportunity('contacto_inicial', {
                            id: String(opp.id), // usar id backend para permitir persistir movimientos
                            clientName: opp.nombreCliente || c.nombre,
                            serviceName: 'Servicio',
                            agent: 'Sin asignar',
                            value: opp.valorUsd || 0,
                            probability: opp.probabilidad || 0,
                            closeDate: opp.fechaCierre || new Date().toISOString().slice(0,10),
                            phone: opp.telefono || c.telefono || '',
                            email: opp.email || c.email || ''
                          })
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
                        }
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
    </div>
  )
}
