"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Bed, Bath, Car, Maximize, MapPin, DollarSign } from "lucide-react"

// TODO: Conectar con datos reales de la base de datos
// Datos de ejemplo eliminados - deben cargarse desde la BD
const properties: any[] = []

export function PropertiesList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedType, setSelectedType] = useState("all")

  const filteredProperties = properties.filter((property) => {
    const matchesSearch =
      property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === "all" || property.status === selectedStatus
    const matchesType = selectedType === "all" || property.type === selectedType
    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "disponible":
        return "#10B981"
      case "reservada":
        return "#FCBA00"
      case "vendida":
        return "#6B7280"
      case "construccion":
        return "#3B82F6"
      default:
        return "#6B7280"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "disponible":
        return "Disponible"
      case "reservada":
        return "Reservada"
      case "vendida":
        return "Vendida"
      case "construccion":
        return "En Construcción"
      default:
        return status
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "apartamento":
        return "Apartamento"
      case "casa":
        return "Casa"
      case "terreno":
        return "Terreno"
      case "comercial":
        return "Comercial"
      case "oficina":
        return "Oficina"
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
            Propiedades
          </h2>
          <p className="text-gray-600">Catálogo de propiedades disponibles</p>
        </div>
        <Button variant="brand">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Propiedad
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar propiedades..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedStatus === "all" ? "brand" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus("all")}
              >
                Todos los Estados
              </Button>
              <Button
                variant={selectedStatus === "disponible" ? "brand" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus("disponible")}
              >
                Disponible
              </Button>
              <Button
                variant={selectedStatus === "reservada" ? "brand" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus("reservada")}
              >
                Reservada
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">
              No hay propiedades para mostrar.
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Las propiedades deben cargarse desde la base de datos.
            </p>
            <p className="text-sm text-gray-400">
              Implementar conexión con API de propiedades.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* TODO: Renderizar propiedades desde la BD cuando estén disponibles */}
        </div>
      )}
    </div>
  )
}
