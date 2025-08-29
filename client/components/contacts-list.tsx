"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Phone, Mail, MapPin, Plus } from "lucide-react"

// TODO: Conectar con datos reales de la base de datos
// Datos de ejemplo eliminados - deben cargarse desde la BD
const contacts: any[] = []

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
      currency: "PEN", // Cambiado de USD a PEN (Nuevo Sol Peruano)
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
      {filteredContacts.length === 0 ? (
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
          {/* TODO: Renderizar contactos desde la BD cuando estén disponibles */}
        </div>
      )}
    </div>
  )
}
