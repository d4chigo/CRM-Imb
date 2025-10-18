"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus } from "lucide-react"

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
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-semibold text-foreground">Propiedades</h2>
          <p className="text-sm text-muted-foreground">Catálogo de propiedades disponibles</p>
        </div>
        <Button variant="brand">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Propiedad
        </Button>
      </div>

      {/* Toolbar estilo iOS/enterprise */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative md:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por código, dirección o nombre…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-600">Estado</div>
                <div className="inline-flex rounded-lg border bg-white overflow-hidden">
                  {[
                    { k: 'all', t: 'Todos' },
                    { k: 'disponible', t: 'Disponible' },
                    { k: 'reservada', t: 'Reservada' },
                    { k: 'vendida', t: 'Vendida' },
                  ].map(opt => (
                    <button
                      key={opt.k}
                      onClick={()=> setSelectedStatus(opt.k)}
                      className={`px-3 py-2 text-xs border-r last:border-r-0 ${selectedStatus===opt.k? 'bg-[var(--sidebar-active)] text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                    >{opt.t}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-600">Tipo</div>
                <div className="inline-flex rounded-lg border bg-white overflow-hidden">
                  {[
                    { k: 'all', t: 'Todos' },
                    { k: 'apartamento', t: 'Apartamento' },
                    { k: 'casa', t: 'Casa' },
                    { k: 'terreno', t: 'Terreno' },
                    { k: 'comercial', t: 'Comercial' },
                  ].map(opt => (
                    <button
                      key={opt.k}
                      onClick={()=> setSelectedType(opt.k)}
                      className={`px-3 py-2 text-xs border-r last:border-r-0 ${selectedType===opt.k? 'bg-[var(--sidebar-active)] text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                    >{opt.t}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">{filteredProperties.length} resultados</div>
              <div className="text-xs text-gray-500">Ordenar: Relevancia</div>
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
