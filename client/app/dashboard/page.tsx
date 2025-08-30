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
import { useAuth, useRequireAuth } from "@/contexts/AuthContext"

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("pipeline")
  const { user, logout } = useAuth()
  
  // Proteger ruta - redirigir a login si no está autenticado
  const { isAuthenticated, loading } = useRequireAuth()

  const handleLogout = async () => {
    try {
      await logout()
      window.location.href = "/login"
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  // Mostrar loading mientras se verifica autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si no está autenticado, no mostrar contenido (useRequireAuth redirigirá)
  if (!isAuthenticated) {
    return null
  }

  // TODO: Conectar con datos reales de la base de datos
  // Estadísticas eliminadas - deben venir de la BD
  // const stats = []

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
              <span className="text-sm font-medium">{user?.name || 'Usuario'}</span>
              <Badge variant="secondary">
                {user?.role === 'admin' ? 'Administrador' : 'Agente'}
              </Badge>
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
        {/* TODO: Stats Cards - Conectar con datos reales de la BD */}
        {/* Sección de estadísticas eliminada - debe implementarse con datos de la base de datos */}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pipeline">Pipeline de Ventas</TabsTrigger>
            <TabsTrigger value="contacts">Contactos</TabsTrigger>
            <TabsTrigger value="properties">Servicios</TabsTrigger>
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
                {/* TODO: Conectar con datos reales de la base de datos */}
                <div className="p-8 text-center">
                  <p className="text-gray-500">
                    Las actividades deben cargarse desde la base de datos.
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Implementar conexión con API de actividades
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
