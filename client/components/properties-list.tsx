"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Bed, Bath, Car, Maximize, MapPin, DollarSign } from "lucide-react"

const properties = [
  {
    id: 1,
    code: "LP-001",
    title: "Departamento 2 hab - Torre A",
    type: "apartamento",
    description: "Moderno departamento con vista panorámica",
    address: "Torre A - Piso 5",
    city: "Lima",
    totalArea: 85.5,
    builtArea: 75.2,
    bedrooms: 2,
    bathrooms: 2,
    parking: 1,
    price: 220000,
    status: "disponible",
    project: "Residencial Los Pinos",
  },
  {
    id: 2,
    code: "LP-002",
    title: "Departamento 3 hab - Torre B",
    type: "apartamento",
    description: "Amplio departamento familiar",
    address: "Torre B - Piso 8",
    city: "Lima",
    totalArea: 105.3,
    builtArea: 95.1,
    bedrooms: 3,
    bathrooms: 2,
    parking: 1,
    price: 280000,
    status: "disponible",
    project: "Residencial Los Pinos",
  },
  {
    id: 3,
    code: "CASA-001",
    title: "Casa en San Isidro",
    type: "casa",
    description: "Hermosa casa independiente",
    address: "Calle Las Flores 456",
    city: "Lima",
    totalArea: 200.0,
    builtArea: 180.0,
    bedrooms: 4,
    bathrooms: 3,
    parking: 2,
    price: 450000,
    status: "disponible",
    project: null,
  },
  {
    id: 4,
    code: "LP-003",
    title: "Departamento 1 hab - Torre A",
    type: "apartamento",
    description: "Acogedor departamento para solteros",
    address: "Torre A - Piso 3",
    city: "Lima",
    totalArea: 65.0,
    builtArea: 55.0,
    bedrooms: 1,
    bathrooms: 1,
    parking: 1,
    price: 180000,
    status: "reservada",
    project: "Residencial Los Pinos",
  },
]

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
      currency: "USD",
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
        <Button style={{ backgroundColor: "#FCBA00" }} className="text-white">
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
                variant={selectedStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus("all")}
                style={selectedStatus === "all" ? { backgroundColor: "#FCBA00" } : {}}
                className={selectedStatus === "all" ? "text-white" : ""}
              >
                Todos los Estados
              </Button>
              <Button
                variant={selectedStatus === "disponible" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus("disponible")}
                style={selectedStatus === "disponible" ? { backgroundColor: "#FCBA00" } : {}}
                className={selectedStatus === "disponible" ? "text-white" : ""}
              >
                Disponible
              </Button>
              <Button
                variant={selectedStatus === "reservada" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus("reservada")}
                style={selectedStatus === "reservada" ? { backgroundColor: "#FCBA00" } : {}}
                className={selectedStatus === "reservada" ? "text-white" : ""}
              >
                Reservada
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProperties.map((property) => (
          <Card key={property.id} className="hover:shadow-md transition-shadow">
            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg relative">
              <div className="absolute top-4 left-4">
                <Badge
                  style={{
                    backgroundColor: `${getStatusColor(property.status)}20`,
                    color: getStatusColor(property.status),
                    border: `1px solid ${getStatusColor(property.status)}`,
                  }}
                >
                  {getStatusLabel(property.status)}
                </Badge>
              </div>
              <div className="absolute top-4 right-4">
                <Badge variant="secondary">{property.code}</Badge>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Maximize className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-sm">Imagen de propiedad</p>
                </div>
              </div>
            </div>

            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{property.title}</CardTitle>
                  <CardDescription className="flex items-center space-x-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {property.address}, {property.city}
                    </span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">{property.description}</p>

              {property.project && (
                <div className="text-sm">
                  <span className="text-gray-500">Proyecto: </span>
                  <span className="font-medium">{property.project}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Bed className="h-4 w-4 text-gray-400" />
                    <span>{property.bedrooms}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Bath className="h-4 w-4 text-gray-400" />
                    <span>{property.bathrooms}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Car className="h-4 w-4 text-gray-400" />
                    <span>{property.parking}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Área total</p>
                  <p className="font-medium">{property.totalArea} m²</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5" style={{ color: "#FCBA00" }} />
                  <span className="text-xl font-bold" style={{ color: "#303030" }}>
                    {formatCurrency(property.price)}
                  </span>
                </div>
                <Badge variant="outline">{getTypeLabel(property.type)}</Badge>
              </div>

              <div className="flex space-x-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                  Ver Detalles
                </Button>
                <Button size="sm" className="flex-1 text-white" style={{ backgroundColor: "#FCBA00" }}>
                  Contactar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProperties.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No se encontraron propiedades que coincidan con los filtros.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
