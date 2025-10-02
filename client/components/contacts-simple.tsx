"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Pencil, Trash2, CheckCircle2, PlusCircle, Tag as TagIcon } from "lucide-react"
import { fetchContacts, updateContact, deleteContact, ContactDTO, bulkTagContacts, createContact } from "@/lib/contacts"
import { useToast } from "@/hooks/use-toast"
import { QuoteSimulator } from "@/components/quotes/QuoteSimulator"
import { EditContactDialog, type EditContactFormValues } from "@/components/forms/EditContactDialog"
import { NewContactDialog } from "@/components/forms/NewContactDialog"

export function ContactsSimple({ onlyClients = false, excludeClients = false }: { onlyClients?: boolean; excludeClients?: boolean }) {
  const [search, setSearch] = useState("")
  const [contacts, setContacts] = useState<ContactDTO[]>([])
  const [loading, setLoading] = useState(false)
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
  const [openNew, setOpenNew] = useState(false)
  const [importing, setImporting] = useState(false)
  const predefinedTags = [
    'Techo Propio',
    'Credito Mivivienda',
    'Tasaciones',
    'Construccion',
    'Levantamiento Topografico',
  ]
  
  async function handleEditSubmit(id: number, data: EditContactFormValues): Promise<void> {
    try {
      const updated = await updateContact(id, data)
      setContacts(prev => prev.map(c => c.id===id ? { ...c, ...updated } : c))
    } catch(e:any) {
      toast({ title:'No se pudo guardar', description:e.message || '', variant:'destructive' })
      throw e
    }
  }
  // Importar desde Google: siempre abre ventana de login OAuth primero y luego intenta sincronizar
  async function importFromGoogle() {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    try {
      setImporting(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
      // 1) Obtener URL de autenticación y abrir ventana
      let authUrl = ''
      try {
        const u = await fetch(`${base}/api/google/contacts/auth-url`, { credentials: 'include', headers: token ? { Authorization: `Bearer ${token}` } as any : undefined })
        const data = await u.json().catch(()=>({}))
        authUrl = data?.data?.url || data?.url || ''
      } catch { /* ignore */ }
      if (!authUrl) {
        // fallback: abrir endpoint directo (puede redirigir por sí mismo)
        authUrl = `${base}/api/google/contacts/auth-url`
      }
      // Abrir en pestaña nueva (dispara flujo OAuth)
      const w = window.open(authUrl, '_blank')
      if (w && typeof w.focus === 'function') w.focus()
      toast({ title:'Inicia sesión con Google', description:'Autoriza el acceso y luego vuelve aquí para sincronizar.' })

      // 2) Intentar sincronización (en segundo plano); si aún no hay auth, servidor responderá 401
      const res2 = await fetch(`${base}/api/google/contacts/sync`, { method: 'POST', credentials: 'include', headers })
      if (!res2.ok) {
        if (res2.status === 401) {
          // Usuario aún no autorizó; solo informamos
          toast({ title:'Esperando autorización', description:'Completa el login en la ventana abierta y vuelve a intentar.', variant:'destructive' })
          return
        }
        throw new Error((await res2.text()) || 'Error en sincronización')
      }
      toast({ title:'Importación iniciada', description:'Sincronizando en segundo plano…' })
      await load()
    } catch(e:any) {
      toast({ title:'No se pudo importar', description: e.message || 'Error al comunicar con Google', variant:'destructive' })
    } finally { setImporting(false) }
  }

  async function load() {
    setLoading(true)
    try {
      const page = await fetchContacts({ search, page: 1, pageSize: 50 })
      let list: ContactDTO[] = page.data || []
      const isClient = (c: ContactDTO) => {
        const tipo = (c.tipo || '').toLowerCase()
        const etiquetas = (Array.isArray(c.etiquetas) ? c.etiquetas : ((c as any).etiqueta ? [(c as any).etiqueta] : []))
        const hasClientTag = etiquetas.some(e => (e || '').toLowerCase() === 'cliente')
        return tipo === 'cliente' || hasClientTag
      }
      if (onlyClients) list = list.filter(isClient)
      if (excludeClients) list = list.filter(c => !isClient(c))
      setContacts(list)
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
  useEffect(()=>{ const t=setTimeout(load, 250); return ()=> clearTimeout(t) }, [search])

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
        </div>
        <div className="flex gap-2">
          {excludeClients && (
            <Button variant="outline" onClick={importFromGoogle} disabled={importing || loading}>
              {importing ? 'Importando…' : 'Importar Google'}
            </Button>
          )}
          <Button variant="brand" onClick={()=> setOpenNew(true)}>Nuevo contacto</Button>
          <Button variant="outline" onClick={load} disabled={loading}>{loading ? 'Cargando…' : 'Actualizar'}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contacts.map(c => {
          const isSel = selected.has(c.id!)
          return (
            <Card key={c.id} className={`border ${isSel ? 'ring-2 ring-indigo-500' : ''} cursor-pointer`} onClick={()=> toggle(c.id!)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center justify-between gap-2">
                  <span className="truncate">{c.nombre}</span>
                  <Badge className="shrink-0 bg-emerald-600 text-white">{(c.tipo||'lead')==='cliente' ? 'Cliente' : (c.tipo||'lead')}</Badge>
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 truncate">{c.email || 'Sin email'} · {c.telefono || 'Sin teléfono'}</CardDescription>
                {((Array.isArray(c.etiquetas) && c.etiquetas[0]) || (c as any).etiqueta) && (
                  <div className="mt-1 flex items-center gap-1">
                    <Badge variant="outline" className="text-[11px] px-2 py-0 h-5 inline-flex items-center gap-1">
                      <span className="truncate max-w-[160px]">{(Array.isArray(c.etiquetas) && c.etiquetas[0]) || (c as any).etiqueta}</span>
                      <button
                        type="button"
                        aria-label="Quitar etiqueta"
                        className="text-gray-500 hover:text-gray-700 ml-1"
                        onClick={(e)=> { e.stopPropagation(); removeTagSingle(c.id!) }}
                      >
                        ×
                      </button>
                    </Badge>
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 pt-0" onClick={(e)=> e.stopPropagation()}>
                <Button size="sm" variant="outline" onClick={()=> { setEditingContact(c); setEditOpen(true) }}>
                  <Pencil className="h-4 w-4 mr-1"/> Editar
                </Button>
                {onlyClients && (
                  <>
                    <Button size="sm" variant="outline" onClick={()=> openTagDialog([c.id!], (Array.isArray(c.etiquetas)&&c.etiquetas[0]) || (c as any).etiqueta || '')}>
                      <TagIcon className="h-4 w-4 mr-1"/> Etiquetar
                    </Button>
                    <Button size="sm" variant="outline" onClick={()=> { setSimulateContact(c); setSimulateOpen(true) }}>
                      <PlusCircle className="h-4 w-4 mr-1"/> Simular cotización
                    </Button>
                  </>
                )}
                {!onlyClients && (
                  <Button size="sm" variant="outline" onClick={()=> convertToClient(c.id!)}>
                    <CheckCircle2 className="h-4 w-4 mr-1"/> Convertir a cliente
                  </Button>
                )}
                {onlyClients ? (
                  <Button size="sm" variant="outline" className="text-amber-700" disabled={deletingId===c.id} onClick={async ()=>{
                    // En Clientes: "eliminar" significa sacarlo de clientes (tipo -> lead)
                    setDeletingId(c.id!)
                    try {
                      await updateContact(c.id!, { tipo: 'lead' } as any)
                      setContacts(prev => prev.filter(x => x.id !== c.id))
                      toast({ title:'Removido de clientes', description: c.nombre })
                    } catch(e:any) {
                      toast({ title:'No se pudo remover', description:e.message || '', variant:'destructive' })
                    } finally { setDeletingId(null) }
                  }}>
                    <Trash2 className="h-4 w-4 mr-1"/> Quitar de clientes
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="text-red-600" disabled={deletingId===c.id} onClick={()=> remove(c.id!)}>
                    <Trash2 className="h-4 w-4 mr-1"/> {deletingId===c.id ? 'Eliminando…' : 'Eliminar'}
                  </Button>
                )}
              </CardContent>
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
              <QuoteSimulator contactoId={simulateContact.id!} clienteNombre={simulateContact.nombre} />
            )}
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
