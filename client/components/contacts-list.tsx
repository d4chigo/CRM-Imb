"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Phone, Mail, MapPin, Plus } from "lucide-react"

const contacts = [
  {
    id: 1,
    name: "Ana Martínez",
    email: "ana@email.com",
    phone: "+51987654321",
    type: "lead",
    source: "web",
    budget: { min: 200000, max: 250000 },
    interest: "apartamento",
    zone: "San Isidro",
    agent: "Juan Pérez",
    lastContact: "2024-01-15",
  },
  {
    id: 2,
    name: "Carlos Ruiz",
    email: "carlos@email.com",
    phone: "+51987654322",
    type: "prospecto",
    source: "referido",
    budget: { min: 400000, max: 500000 },
    interest: "casa",
    zone: "Miraflores",
    agent: "María García",
    lastContact: "2024-01-14",
  },
  {
    id: 3,
    name: "Luis Torres",
    email: "luis@email.com",
    phone: "+51987654323",
    type: "cliente",
    source: "redes_sociales",
    budget: { min: 250000, max: 300000 },
    interest: "apartamento",
    zone: "San Borja",
    agent: "Carlos López",
    lastContact: "2024-01-13",
  },
  {
    id: 4,
    name: "Patricia Silva",
    email: "patricia@email.com",
    phone: "+51987654324",
    type: "lead",
    source: "publicidad",
    budget: { min: 180000, max: 220000 },
    interest: "apartamento",
    zone: "Surco",
    agent: "Juan Pérez",
    lastContact: "2024-01-12",
  },
]

export function ContactsList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState("all")

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === "all" || contact.type === selectedType
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
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount)
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
        <Button style={{ backgroundColor: "#FCBA00" }} className="text-white">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Contacto
        </Button>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContacts.map((contact) => (
          <Card key={contact.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback style={{ backgroundColor: "#FCBA0020", color: "#FCBA00" }}>
                      {contact.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{contact.name}</CardTitle>
                    <CardDescription>{contact.agent}</CardDescription>
                  </div>
                </div>
                <Badge
                  style={{
                    backgroundColor: `${getTypeColor(contact.type)}20`,
                    color: getTypeColor(contact.type),
                    border: `1px solid ${getTypeColor(contact.type)}`,
                  }}
                >
                  {getTypeLabel(contact.type)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{contact.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{contact.phone}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{contact.zone}</span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Interés</p>
                    <p className="font-medium capitalize">{contact.interest}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Presupuesto</p>
                    <p className="font-medium">
                      {formatCurrency(contact.budget.min)} - {formatCurrency(contact.budget.max)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-gray-500">Último contacto: {contact.lastContact}</span>
                <div className="flex space-x-1">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Phone className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Mail className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredContacts.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No se encontraron contactos que coincidan con los filtros.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
