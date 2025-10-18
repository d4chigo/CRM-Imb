"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { authService } from "@/lib/auth"

export function AIMarketingAdvisor() {
  const { toast } = useToast()
  const [goals, setGoals] = React.useState<string>("Incrementar leads calificados y cerrar más ventas en 60 días")
  const [summary, setSummary] = React.useState<string>("")
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<string>("")
  const [provider, setProvider] = React.useState<'openai'|'gemini'|'deepseek'|'local'>('local')
  const [useAuto, setUseAuto] = React.useState<boolean>(false)
  const [lastError, setLastError] = React.useState<string>("")

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

  // Parser sencillo: divide el texto por secciones con encabezados terminados en ':'
  const parsedSections = React.useMemo(() => {
    if (!result) return null
    const lines = result.split(/\r?\n/)
    const sections: Array<{ title: string; body: string[] }> = []
    let current: { title: string; body: string[] } | null = null
    for (const line of lines) {
      const h = line.trim().match(/^(.+):\s*$/)
      if (h) {
        if (current) sections.push(current)
        current = { title: h[1], body: [] }
        continue
      }
      if (!current) {
        current = { title: 'Resumen', body: [] }
      }
      current.body.push(line)
    }
    if (current) sections.push(current)
    // Limpieza básica
    return sections.map(s => ({ title: s.title, body: s.body.join('\n').trim() })).filter(s => s.body)
  }, [result])

  // Compact view: keep only important sections and limit lines
  const importantOrder = ['Resumen Ejecutivo', 'Segmentos', 'Canales y Mix', 'Presupuesto', 'KPIs', 'Plan 4 semanas', 'Riesgos']
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({})
  const displayedSections = React.useMemo(() => {
    if (!parsedSections) return null
    const pick = (t:string) => parsedSections.find(s => s.title.toLowerCase().startsWith(t.toLowerCase()))
    const ordered = importantOrder.map(t => pick(t)).filter(Boolean) as Array<{title:string;body:string}>
    // fallback: if none matched, return all parsed
    return ordered.length ? ordered : parsedSections
  }, [parsedSections])

  async function buildAutoSummary(): Promise<{ text: string; metrics: any }|null> {
    try {
      const [ageR, deptR, sexR] = await Promise.all([
        authService.authenticatedFetch(`/api/stats/contacts/by-age`),
        authService.authenticatedFetch(`/api/stats/contacts/by-department?limit=10`),
        authService.authenticatedFetch(`/api/stats/contacts/by-sex`),
      ])
      const [ageJ, deptJ, sexJ] = await Promise.all([ageR.json(), deptR.json(), sexR.json()])
      const ageTxt = Array.isArray(ageJ?.data) ? ageJ.data.map((x:any)=> `${x.label}:${x.count}`).join(', ') : ''
      const deptTxt = Array.isArray(deptJ?.data) ? deptJ.data.map((x:any)=> `${x.label}:${x.count}`).join(', ') : ''
      const sexTxt = Array.isArray(sexJ?.data) ? sexJ.data.map((x:any)=> `${x.label}:${x.count}`).join(', ') : ''
      const parts = [
        ageTxt ? `Por edades: ${ageTxt}` : '',
        deptTxt ? `Por departamento (top10): ${deptTxt}` : '',
        sexTxt ? `Por sexo: ${sexTxt}` : '',
      ].filter(Boolean)
      return { text: parts.join('\n'), metrics: {
        age: Array.isArray(ageJ?.data) ? ageJ.data : [],
        dept: Array.isArray(deptJ?.data) ? deptJ.data : [],
        sex: Array.isArray(sexJ?.data) ? sexJ.data : [],
      }}
    } catch { return null }
  }

  async function generate() {
    setLoading(true)
    try {
      let finalSummary = summary
      let metrics: any = undefined
      if (useAuto) {
        const auto = await buildAutoSummary()
        if (auto) {
          finalSummary = (summary ? (summary + '\n\n') : '') + auto.text
          metrics = auto.metrics
        }
      }
      const res = await fetch(`${apiBase}/api/ai/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: finalSummary, goals, provider, metrics })
      })
      const js = await res.json().catch(()=>({}))
      if (!res.ok) {
        const msg = [js?.message, js?.details].filter(Boolean).join(' | ')
        if (js?.fallback) {
          setResult(js.fallback)
          setLastError(msg || 'Proveedor externo falló, usando modo Local.')
          toast({ title:'Aviso', description:'Proveedor externo falló, usando modo Local.', variant:'default' })
          return
        }
        setLastError(msg || 'No se pudo generar el análisis')
        throw new Error(msg || 'No se pudo generar el análisis')
      }
      setResult(js?.data?.content || 'No hubo contenido en la respuesta de IA.')
      setLastError("")
    } catch(e:any) {
      toast({ title:'Error', description: e.message || 'Fallo al invocar AI', variant:'destructive' })
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-600">Objetivos</label>
          <Textarea value={goals} onChange={(e)=> setGoals(e.target.value)} placeholder="Ej. Aumentar leads de Techo Propio 30% y mejorar conversión a cita al 15%" className="min-h-[90px]" />
          <div className="text-[11px] text-gray-500 mt-1">Describe lo que quieres lograr (segmentos, canales, presupuesto, plazos).</div>
        </div>
        <div>
          <label className="text-xs text-gray-600">Resumen de datos (opcional)</label>
          <Textarea value={summary} onChange={(e)=> setSummary(e.target.value)} placeholder="Pega un resumen de tus métricas (clientes por edad/sexo/ubicación, fuentes de leads, etapas del pipeline, TEA, montos, etc.)" className="min-h-[90px]" />
          <div className="text-[11px] text-gray-500 mt-1">Si lo dejas vacío, la IA propondrá un plan basado en supuestos razonables.</div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xs text-gray-600">Proveedor</span>
          <select value={provider} onChange={(e)=> setProvider(e.target.value as any)} className="h-8 rounded-md border bg-white px-2">
            <option value="local">Local (sin APIs)</option>
            <option value="openai">OpenAI</option>
            <option value="deepseek">DeepSeek</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={useAuto} onChange={(e)=> setUseAuto(e.target.checked)} />
          Usar datos del CRM
        </label>
        <Button onClick={generate} disabled={loading}>{loading ? 'Analizando…' : 'Generar insights'}</Button>
        <div className="text-[11px] text-gray-500">La salida es informativa y analítica. En modo Local no usa APIs externas.</div>
      </div>

      {(result || lastError) ? (
        parsedSections && parsedSections.length >= 2 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {parsedSections.map((s, idx) => (
              <div key={idx} className="rounded-md border p-4 bg-white text-sm">
                <div className="font-semibold mb-2">{s.title}</div>
                <div className="whitespace-pre-wrap leading-6 text-[13.5px]">{s.body}</div>
              </div>
            ))}
            {lastError ? (
              <div className="rounded-md border p-4 bg-white text-sm md:col-span-2">
                <div className="font-semibold mb-2 text-red-700">Detalle</div>
                <div className="text-red-600 text-[13px]">{lastError}</div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-md border p-4 bg-white whitespace-pre-wrap text-sm leading-6">
            {result || ''}
            {lastError ? (
              <div className="mt-2 text-red-600 text-[13px]">{lastError}</div>
            ) : null}
          </div>
        )
      ) : null}
    </div>
  )
}
