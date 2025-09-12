"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { authService } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts"

interface StatItem { label: string; count: number }

export function StatsDashboard() {
  const [byDept, setByDept] = useState<StatItem[]>([])
  const [bySex, setBySex] = useState<StatItem[]>([])
  const [byAge, setByAge] = useState<StatItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Filtros seleccionables (sin valores preseleccionados)
  // rangesKey: 'none' | '25-30_35-40' | 'defaultBuckets'
  const [rangesKey, setRangesKey] = useState<string>('none')
  // deptLimitSel: 'none' | '5' | '10' | '20' | '50'
  const [deptLimitSel, setDeptLimitSel] = useState<string>('none')

  function rangesFromKey(key: string): string | undefined {
    if (key === 'none') return undefined
    if (key === '25-30_35-40') return '25-30,35-40'
    if (key === 'defaultBuckets') return undefined // sin param -> el backend usa buckets por defecto
    return undefined
  }

  function limitFromKey(key: string): number | undefined {
    if (key === 'none') return undefined
    const n = parseInt(key, 10)
    return Number.isFinite(n) ? n : undefined
  }

  async function fetchData() {
    const rangesParam = rangesFromKey(rangesKey)
    const limitParam = limitFromKey(deptLimitSel)
    const depUrl = limitParam !== undefined ? `/api/stats/contacts/by-department?limit=${encodeURIComponent(limitParam)}` : `/api/stats/contacts/by-department`
    const ageUrl = rangesParam !== undefined ? `/api/stats/contacts/by-age?ranges=${encodeURIComponent(rangesParam)}` : `/api/stats/contacts/by-age`
    const [r1, r2, r3] = await Promise.all([
      authService.authenticatedFetch(depUrl),
      authService.authenticatedFetch(`/api/stats/contacts/by-sex`),
      authService.authenticatedFetch(ageUrl)
    ])
    const j1 = await r1.json()
    const j2 = await r2.json()
    const j3 = await r3.json()
    if (!j1.success || !j2.success || !j3.success) throw new Error('Error de API de estadísticas')
    setByDept(j1.data)
    setBySex(j2.data)
    setByAge(j3.data)
  }

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        // Cargar sin filtros aplicados (no enviar params)
        const [r1, r2, r3] = await Promise.all([
          authService.authenticatedFetch(`/api/stats/contacts/by-department`),
          authService.authenticatedFetch(`/api/stats/contacts/by-sex`),
          authService.authenticatedFetch(`/api/stats/contacts/by-age`)
        ])
        const j1 = await r1.json()
        const j2 = await r2.json()
        const j3 = await r3.json()
        if (!j1.success || !j2.success || !j3.success) throw new Error('Error de API de estadísticas')
        if (!mounted) return
        setByDept(j1.data); setBySex(j2.data); setByAge(j3.data)
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message || 'Error cargando estadísticas')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">Cargando estadísticas...</div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">{error}</div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecciona filtros y presiona Aplicar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Rangos de edad</label>
              <Select value={rangesKey} onValueChange={setRangesKey}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sin filtro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Presets</SelectLabel>
                    <SelectItem value="none">Sin filtro</SelectItem>
                    <SelectItem value="defaultBuckets">Buckets por defecto</SelectItem>
                    <SelectItem value="25-30_35-40">25-30 y 35-40</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Máx. departamentos</label>
              <Select value={deptLimitSel} onValueChange={setDeptLimitSel}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sin límite" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Top N</SelectLabel>
                    <SelectItem value="none">Sin límite</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button onClick={async () => {
                try {
                  setLoading(true)
                  setError(null)
                  await fetchData()
                } catch (e: any) {
                  setError(e?.message || 'Error cargando estadísticas')
                } finally {
                  setLoading(false)
                }
              }}>Aplicar</Button>
            </div>
          </div>
          {/* Visibilidad de gráficos */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked id="vis-sex" onChange={(e)=>{
              const el = document.getElementById('chart-sex'); if (el) (el as HTMLDivElement).style.display = e.target.checked? 'block':'none'
            }} /> Mostrar "Por Sexo"</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked id="vis-dept" onChange={(e)=>{
              const el = document.getElementById('chart-dept'); if (el) (el as HTMLDivElement).style.display = e.target.checked? 'block':'none'
            }} /> Mostrar "Por Departamento"</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked id="vis-age" onChange={(e)=>{
              const el = document.getElementById('chart-age'); if (el) (el as HTMLDivElement).style.display = e.target.checked? 'block':'none'
            }} /> Mostrar "Por Rangos de Edad"</label>
          </div>
          {/* Enlaces útiles */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href="https://www.mivivienda.com.pe/PORTALWEB/usuario-busca-viviendas/apoyo-habitacional-previo.aspx" target="_blank" rel="noopener noreferrer">Verificar bono recibido</a>
            </Button>
            <Button asChild variant="outline">
              <a href="https://www.mivivienda.com.pe/PORTALWEB/usuario-busca-viviendas/estados-tramite.aspx" target="_blank" rel="noopener noreferrer">Estado del trámite (programa)</a>
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card id="chart-sex" className="col-span-1 lg:col-span-1">
          <CardHeader>
            <CardTitle>Por Sexo</CardTitle>
            <CardDescription>Distribución de contactos por sexo</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-72">
              <ResponsiveContainer>
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={bySex}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    label
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

      <Card id="chart-dept" className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Por Departamento</CardTitle>
          <CardDescription>De dónde son mis clientes</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}}
            className="h-72">
            <BarChart data={byDept}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="#3B82F6" radius={[4,4,0,0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card id="chart-age" className="col-span-1 lg:col-span-3">
        <CardHeader>
          <CardTitle>Por Rangos de Edad</CardTitle>
          <CardDescription>Rangos configurables: 25-30, 35-40</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}}
            className="h-80">
            <BarChart data={byAge}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="#10B981" radius={[4,4,0,0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
