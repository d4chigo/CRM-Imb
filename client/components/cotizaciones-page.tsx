"use client"

import * as React from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CotizacionesList } from "@/components/cotizaciones-list"
import { QuoteSimulator } from "@/components/quotes/QuoteSimulator"

export function CotizacionesPage() {
  const [tab, setTab] = React.useState<string>('listado')
  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-6">
      <TabsList>
        <TabsTrigger value="listado">Listado</TabsTrigger>
        <TabsTrigger value="simulador">Simulador</TabsTrigger>
      </TabsList>
      <TabsContent value="listado" className="space-y-6">
        <CotizacionesList />
      </TabsContent>
      <TabsContent value="simulador" className="space-y-6">
        <QuoteSimulator />
      </TabsContent>
    </Tabs>
  )
}
