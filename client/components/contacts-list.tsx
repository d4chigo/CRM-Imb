"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Plus, Download } from "lucide-react"
import { NewContactDialog, NewContactFormValues } from "@/components/forms/NewContactDialog"
import { usePipelineDnd } from "@/hooks/use-pipeline-dnd"
import { fetchContacts, createContact, ContactDTO } from "@/lib/contacts"
import { getGoogleContactsAuthUrl, openGoogleImportPopup } from "@/lib/googleContacts"
import { useToast } from '@/hooks/use-toast'

// Estado interno para contactos reales
// Se cargan desde la API al montar el componente

export function ContactsList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [openNew, setOpenNew] = useState(false)
  const [contacts, setContacts] = useState<ContactDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { columns, addOpportunity } = usePipelineDnd()
  const { toast } = useToast();

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
      if (ev.data && ev.data.type === 'google-import-result') {
        toast({ title: 'Importación completada', description: `Importados: ${ev.data.imported} | Duplicados: ${ev.data.skipped}` })
        loadContacts()
      }
    }
    window.addEventListener('message', handleMessage)
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
            try {
              const url = await getGoogleContactsAuthUrl();
              openGoogleImportPopup(url);
            } catch(e:any) {
              toast({ title:'Error', description: e.message, variant:'destructive' })
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
            <Card key={c.id} className="border border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base font-semibold">
                  <span>{c.nombre}</span>
                  <Badge style={{ backgroundColor: getTypeColor(c.tipo || 'lead'), color: '#fff' }}>{getTypeLabel(c.tipo || 'lead')}</Badge>
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
    </div>
  )
}
