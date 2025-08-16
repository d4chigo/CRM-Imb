"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Users, TrendingUp, Calendar, DollarSign, User, LogOut } from "lucide-react"
import { PipelineBoard } from "@/components/pipeline-board"
import { ContactsList } from "@/components/contacts-list"
import { PropertiesList } from "@/components/properties-list"

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("pipeline")

  const handleLogout = () => {
    window.location.href = "/"
  }

  const stats = [
    {
      title: "Contactos Activos",
      value: "247",
      change: "+12%",
      icon: Users,
      color: "#FCBA00",
    },
    {
      title: "Oportunidades",
      value: "89",
      change: "+8%",
      icon: TrendingUp,
      color: "#FCBA00",
    },
    {
      title: "Propiedades",
      value: "156",
      change: "+5%",
      icon: Building2,
      color: "#FCBA00",
    },
    {
      title: "Ventas del Mes",
      value: "$2.4M",
      change: "+15%",
      icon: DollarSign,
      color: "#FCBA00",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: "#FCBA00" }}>
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "#303030" }}>
                CRM Inmobiliario
              </h1>
              <p className="text-sm text-gray-500">Panel de Control</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Juan Pérez</span>
              <Badge variant="secondary">Agente</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-transparent"
            >
              <LogOut className="h-4 w-4" />
              <span>Salir</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold" style={{ color: "#303030" }}>
                      {stat.value}
                    </p>
                    <p className="text-sm" style={{ color: stat.color }}>
                      {stat.change} vs mes anterior
                    </p>
                  </div>
                  <div className="p-3 rounded-full" style={{ backgroundColor: `${stat.color}20` }}>
                    <stat.icon className="h-6 w-6" style={{ color: stat.color }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pipeline">Pipeline de Ventas</TabsTrigger>
            <TabsTrigger value="contacts">Contactos</TabsTrigger>
            <TabsTrigger value="properties">Propiedades</TabsTrigger>
            <TabsTrigger value="activities">Actividades</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="space-y-6">
            <PipelineBoard />
          </TabsContent>

          <TabsContent value="contacts" className="space-y-6">
            <ContactsList />
          </TabsContent>

          <TabsContent value="properties" className="space-y-6">
            <PropertiesList />
          </TabsContent>

          <TabsContent value="activities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Actividades Programadas</CardTitle>
                <CardDescription>Próximas reuniones y seguimientos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="p-2 rounded-full" style={{ backgroundColor: "#FCBA0020" }}>
                        <Calendar className="h-4 w-4" style={{ color: "#FCBA00" }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Reunión con cliente - María García</p>
                        <p className="text-sm text-gray-500">Hoy 15:30 - Presentación Residencial Los Pinos</p>
                      </div>
                      <Badge variant="outline">Pendiente</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
