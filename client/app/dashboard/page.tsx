"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { PipelineBoard } from "@/components/pipeline-board"
import { ContactsList } from "@/components/contacts-list"
import { PipelineProvider } from '@/contexts/PipelineContext'
import { DashboardTabsProvider, useDashboardTabs } from '@/contexts/DashboardTabsContext'
import { QuotesHistory } from "@/components/quotes/QuotesHistory"
import { useAuth, useRequireAuth } from "@/contexts/AuthContext"
import { StatsDashboard } from "@/components/stats-dashboard"
import { AppShell } from "@/components/layout/AppShell"

function DashboardInner() {
  const { activeTab, setActiveTab } = useDashboardTabs()
  const { user } = useAuth()
  
  // Proteger ruta - redirigir a login si no está autenticado
  const { isAuthenticated, loading } = useRequireAuth()

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

  const sectionTitle = {
    pipeline: 'Pipeline de Ventas',
    contacts: 'Contactos',
    properties: 'Cotizaciones',
    activities: 'Actividades',
    statistics: 'Estadísticas'
  }[activeTab] || 'Dashboard'

  const sectionSubtitle = {
    pipeline: 'Arrastra las oportunidades entre las etapas.',
    contacts: 'Gestiona y segmenta tus contactos.',
    properties: 'Administra tus cotizaciones y servicios.',
    activities: 'Controla tareas y seguimientos.',
    statistics: 'Analiza el rendimiento de tu CRM.',
  }[activeTab] || 'Gestiona tu CRM con una interfaz clara y moderna.'

  return (
      <AppShell title="CRM Inmobiliario">
        {/* Section header (replaces duplicate tab bar) */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-foreground">{sectionTitle}</h2>
          <p className="text-sm text-muted-foreground">{sectionSubtitle}</p>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">

          <TabsContent value="pipeline" className="space-y-6">
            <PipelineBoard />
          </TabsContent>

          <TabsContent value="contacts" className="space-y-6">
            <ContactsList />
          </TabsContent>

          <TabsContent value="properties" className="space-y-6">
            <QuotesHistory />
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

          <TabsContent value="statistics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Filtros de Análisis Estadísticos</CardTitle>
                <CardDescription>
                  De dónde son mis clientes, por departamentos, por rangos de edad (25-30, 35-40) y por sexo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StatsDashboard />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </AppShell>
  )
}

export default function Dashboard() {
  return (
    <DashboardTabsProvider>
      <PipelineProvider>
        <DashboardInner />
      </PipelineProvider>
    </DashboardTabsProvider>
  )
}
