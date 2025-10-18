"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { authService } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  PointElement,
  LineElement,
} from "chart.js"
import { Pie, Bar, Line } from "react-chartjs-2"

interface StatItem { label: string; count: number }

ChartJS.register(ArcElement, ChartTooltip, ChartLegend, CategoryScale, LinearScale, BarElement, ChartTitle, PointElement, LineElement)

function useThemeColor(varName: string, fallback: string) {
  return useMemo(() => {
    if (typeof window === 'undefined') return fallback
    const rs = getComputedStyle(document.documentElement)
    const v = rs.getPropertyValue(varName).trim()
    return v || fallback
  }, [varName, fallback])
}

const defaultPalette = [
  "#C59D26", // brand gold
  "#1F2937", // slate-800
  "#3B82F6", // blue-500
  "#10B981", // emerald-500
  "#6366F1", // indigo-500
  "#F59E0B", // amber-500
  "#EF4444", // red-500
  "#8B5CF6", // violet-500
]

export function StatsDashboard() {
  const [byDept, setByDept] = useState<StatItem[]>([])
  const [bySex, setBySex] = useState<StatItem[]>([])
  const [byAge, setByAge] = useState<StatItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros (controlan qué gráficos se mostrarán)
  const [deptLimitSel, setDeptLimitSel] = useState<string>('10')
  // Edades: modo y rangos personalizados
  const BONUS_MAX_AGE = 65
  const [ageMode, setAgeMode] = useState<'default' | 'custom'>('default')
  const [customRanges, setCustomRanges] = useState<Array<{ from: number; to: number }>>([])
  const [ageFrom, setAgeFrom] = useState<number>(20)
  const [ageTo, setAgeTo] = useState<number>(25)

  // UI state
  const [activeTab, setActiveTab] = useState<'sex' | 'dept' | 'age'>('age')
  
  function limitFromKey(key: string): number | undefined {
    const n = parseInt(key, 10)
    return Number.isFinite(n) ? n : undefined
  }

  function buildAgeRangesParam(): string | undefined {
    if (ageMode === 'default') return undefined
    if (!customRanges.length) return undefined
    return customRanges.map(r => `${Math.max(20, r.from)}-${Math.min(BONUS_MAX_AGE, r.to)}`).join(',')
  }

  function addCustomRange() {
    // Validaciones básicas
    if (!Number.isFinite(ageFrom) || !Number.isFinite(ageTo)) return
    if (ageFrom < 20 || ageTo < 20) return
    if (ageFrom > BONUS_MAX_AGE || ageTo > BONUS_MAX_AGE) return
    if (ageFrom >= ageTo) return
    // Evitar solapamientos simples
    const overlaps = customRanges.some(r => !(ageTo <= r.from || ageFrom >= r.to))
    if (overlaps) return
    const next = [...customRanges, { from: Math.floor(ageFrom), to: Math.floor(ageTo) }]
      .sort((a,b)=> a.from - b.from)
    setCustomRanges(next)
  }

  function removeCustomRange(idx: number) {
    setCustomRanges(prev => prev.filter((_, i) => i !== idx))
  }

  async function fetchInitialAge() {
    const r = await authService.authenticatedFetch(`/api/stats/contacts/by-age`)
    const j = await r.json()
    if (!j.success) throw new Error('Error de API de estadísticas (edades)')
    setByAge(j.data)
  }

  async function applyDept() {
    try {
      setLoading(true)
      const limitParam = limitFromKey(deptLimitSel)
      const depUrl = limitParam !== undefined ? `/api/stats/contacts/by-department?limit=${encodeURIComponent(limitParam)}` : `/api/stats/contacts/by-department`
      const r = await authService.authenticatedFetch(depUrl)
      const j = await r.json()
      if (!j.success) throw new Error('Error de API (departamento)')
      setByDept(j.data)
      setActiveTab('dept')
    } catch (e) {
      setError((e as any)?.message || 'Error cargando por departamento')
    } finally {
      setLoading(false)
    }
  }

  async function applyAge() {
    try {
      setLoading(true)
      const rangesParam = buildAgeRangesParam()
      const ageUrl = rangesParam ? `/api/stats/contacts/by-age?ranges=${encodeURIComponent(rangesParam)}` : `/api/stats/contacts/by-age`
      const r = await authService.authenticatedFetch(ageUrl)
      const j = await r.json()
      if (!j.success) throw new Error('Error de API (edades)')
      setByAge(j.data)
      setActiveTab('age')
    } catch (e) {
      setError((e as any)?.message || 'Error cargando por rangos de edad')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        await fetchInitialAge()
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

  const primary = useThemeColor('--primary', '#C59D26')
  const fg = useThemeColor('--foreground', '#0f172a')
  const mutedFg = useThemeColor('--muted-foreground', '#6b7280')
  const border = useThemeColor('--border', '#e5e7eb')

  const lineSexData = useMemo(() => {
    const labels = bySex.map(d => d.label)
    const data = bySex.map(d => d.count)
    return {
      labels,
      datasets: [
        {
          label: 'Contactos',
          data,
          borderColor: primary,
          backgroundColor: primary + '33',
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: primary,
        }
      ]
    }
  }, [bySex, primary])

  const barDeptData = useMemo(() => {
    const labels = byDept.map(d => d.label)
    const data = byDept.map(d => d.count)
    return {
      labels,
      datasets: [
        {
          label: 'Contactos',
          data,
          backgroundColor: primary + 'CC', // 80% opacity
          borderColor: primary,
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    }
  }, [byDept, primary])

  const barAgeData = useMemo(() => {
    const labels = byAge.map(d => d.label)
    const data = byAge.map(d => d.count)
    return {
      labels,
      datasets: [
        {
          label: 'Contactos',
          data,
          backgroundColor: '#10B98155',
          borderColor: '#10B981',
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    }
  }, [byAge])

  const barOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'white',
        titleColor: fg,
        bodyColor: fg,
        borderColor: border,
        borderWidth: 1,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: mutedFg, maxRotation: 30, minRotation: 0 },
      },
      y: {
        grid: { color: border },
        ticks: { color: mutedFg },
      },
    },
  }), [fg, mutedFg, border])

  const lineOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'white',
        titleColor: fg,
        bodyColor: fg,
        borderColor: border,
        borderWidth: 1,
        displayColors: false,
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: mutedFg } },
      y: { grid: { color: border }, ticks: { color: mutedFg }, beginAtZero: true },
    },
  }), [fg, mutedFg, border])

  const pieOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { color: mutedFg } },
      tooltip: {
        backgroundColor: 'white',
        titleColor: fg,
        bodyColor: fg,
        borderColor: border,
        borderWidth: 1,
        displayColors: true,
      },
    },
  }), [fg, mutedFg, border])

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
      {/* Acciones / enlaces útiles */}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <a href="https://www.mivivienda.com.pe/PORTALWEB/usuario-busca-viviendas/apoyo-habitacional-previo.aspx" target="_blank" rel="noopener noreferrer">Verificar bono recibido</a>
        </Button>
        <Button asChild variant="outline">
          <a href="https://www.mivivienda.com.pe/PORTALWEB/usuario-busca-viviendas/estados-tramite.aspx" target="_blank" rel="noopener noreferrer">Estado del trámite (programa)</a>
        </Button>
      </div>

      {/* Tabs para las estadísticas */}
      <Tabs value={activeTab} onValueChange={(v)=> setActiveTab(v as any)} className="w-full">
        <TabsList className="mb-2">
          <TabsTrigger value="sex">Por Sexo</TabsTrigger>
          <TabsTrigger value="dept">Por Departamento</TabsTrigger>
          <TabsTrigger value="age">Por Rangos de Edad</TabsTrigger>
        </TabsList>

        <TabsContent value="sex">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Por Sexo</CardTitle>
              <CardDescription>Distribución de contactos por sexo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] relative">
                <Line data={lineSexData} options={lineOptions} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dept">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Por Departamento</CardTitle>
                  <CardDescription>De dónde son mis clientes</CardDescription>
                </div>
                <div className="flex items-end gap-2 w-full sm:w-auto">
                  <div className="min-w-44">
                    <label className="block text-xs text-gray-600 mb-1">Top N a mostrar</label>
                    <Select value={deptLimitSel} onValueChange={setDeptLimitSel}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Top 10" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="5">Top 5</SelectItem>
                          <SelectItem value="10">Top 10</SelectItem>
                          <SelectItem value="20">Top 20</SelectItem>
                          <SelectItem value="50">Top 50</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={applyDept}>Aplicar</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {byDept.length === 0 ? (
                <div className="text-sm text-gray-500">Selecciona un Top y pulsa "Aplicar" para cargar este gráfico.</div>
              ) : (
                <div className="h-[280px] relative">
                  <Bar data={barDeptData} options={barOptions} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="age">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Por Rangos de Edad</CardTitle>
                  <CardDescription>Rangos configurables</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-end gap-2 w-full sm:w-auto">
                  <div className="min-w-56">
                    <label className="block text-xs text-gray-600 mb-1">Modo</label>
                    <Select value={ageMode} onValueChange={(v)=> setAgeMode(v as 'default'|'custom')}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Buckets por defecto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Presets</SelectLabel>
                          <SelectItem value="default">Buckets por defecto</SelectItem>
                          <SelectItem value="custom">Personalizado</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  {ageMode === 'custom' && (
                    <div className="flex flex-col sm:flex-row items-end gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Desde</label>
                        <Input type="number" min={20} max={BONUS_MAX_AGE} value={ageFrom} onChange={e=> setAgeFrom(parseInt(e.target.value||'20',10))} className="w-24" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Hasta</label>
                        <Input type="number" min={20} max={BONUS_MAX_AGE} value={ageTo} onChange={e=> setAgeTo(parseInt(e.target.value||'25',10))} className="w-24" />
                      </div>
                      <Button variant="outline" onClick={addCustomRange}>Agregar</Button>
                    </div>
                  )}

                  <Button onClick={applyAge}>Aplicar</Button>
                </div>
              </div>

              {ageMode === 'custom' && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {customRanges.length === 0 ? (
                    <span className="text-xs text-gray-500">Agrega uno o más rangos, p. ej. 20–25, 26–30… (máx. {BONUS_MAX_AGE}).</span>
                  ) : (
                    customRanges.map((r, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded inline-flex items-center gap-2">
                        {r.from}–{r.to}
                        <button className="text-gray-500 hover:text-gray-700" onClick={()=> removeCustomRange(i)}>✕</button>
                      </span>
                    ))
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {byAge.length === 0 ? (
                <div className="text-sm text-gray-500">Selecciona el modo y pulsa "Aplicar" para ver este gráfico.</div>
              ) : (
                <div className="h-[320px] relative">
                  <Bar data={barAgeData} options={barOptions} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
