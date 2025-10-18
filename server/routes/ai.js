const express = require('express')
const router = express.Router()

// Simple AI insights endpoint using OpenAI via fetch (no extra deps)
// Expects: { summary: string, goals?: string }
// Env: OPENAI_API_KEY
router.post('/insights', async (req, res) => {
  try {
    const { summary = '', goals = '', provider = 'openai', metrics = null } = req.body || {}

    const system = [
      'Eres un asesor senior de marketing inmobiliario y ventas B2C en Perú.',
      'Tu salida es SOLO INFORMATIVA y ANALÍTICA (no generes copys, textos publicitarios, emails ni guiones).',
      'Devuelve bullets claros y un plan de 4 semanas centrado en: segmentos, canales, mensajes clave (a nivel de idea), presupuesto aproximado y KPIs.',
      'Incluye riesgos/supuestos y cómo medir resultados. Mantén un tono ejecutivo y conciso.'
    ].join(' ')

    const user = `Contexto CRM (resumen):\n${summary}\n\nObjetivos del usuario: ${goals || 'optimizar captación y conversión en 30-60 días'}`
    let content = ''

    const localSynthesis = () => {
      // Heurística con métricas: genera análisis y recomendaciones en función de la data
      const age = Array.isArray(metrics?.age) ? metrics.age : []
      const dept = Array.isArray(metrics?.dept) ? metrics.dept : []
      const sex = Array.isArray(metrics?.sex) ? metrics.sex : []

      const totalLeads = [...age, ...dept, ...sex].length ? Math.max(
        age.reduce((s, x)=> s + (Number(x.count)||0), 0),
        dept.reduce((s, x)=> s + (Number(x.count)||0), 0),
        sex.reduce((s, x)=> s + (Number(x.count)||0), 0)
      ) : undefined

      const topAges = age.slice().sort((a,b)=> (b.count||0)-(a.count||0)).slice(0,3)
      const topDepts = dept.slice().sort((a,b)=> (b.count||0)-(a.count||0)).slice(0,5)
      const sexMap = Object.fromEntries(sex.map(x=> [String(x.label).toLowerCase(), x.count]))
      const totalAge = age.reduce((s,x)=> s + (x.count||0), 0) || 0
      const totalDept = dept.reduce((s,x)=> s + (x.count||0), 0) || 0
      const totalSex = sex.reduce((s,x)=> s + (x.count||0), 0) || 0

      // Dispersión por departamento (índice de concentración Herfindahl-Hirschman simplificado)
      const hhiDept = totalDept>0 ? dept.reduce((acc, d)=> acc + Math.pow((d.count||0)/totalDept, 2), 0) : 0
      const dispersionDept = hhiDept>0 ? (1 - hhiDept) : 0 // 0: muy concentrado, 1: disperso

      const lines = []
      lines.push('Resumen Ejecutivo:')
      if (goals) lines.push(`- Objetivo: ${goals}`)
      if (typeof totalLeads === 'number') lines.push(`- Volumen de leads observado (aprox): ${totalLeads}`)
      if (summary) lines.push(`- Contexto de métricas: ${summary.substring(0, 800)}${summary.length>800?'…':''}`)
      lines.push('')

      // Segmentos
      lines.push('Segmentos Prioritarios (a partir de tus datos):')
      if (topAges.length) {
        const parts = topAges.map(x=> {
          const p = totalAge>0 ? Math.round((x.count||0)*100/totalAge) : 0
          return `${x.label} (${x.count}, ${p}%)`
        })
        lines.push(`- Rangos de edad dominantes: ${parts.join(', ')}`)
      }
      if (Object.keys(sexMap).length) {
        const sFem = sexMap['femenino'] || sexMap['female'] || 0
        const sMas = sexMap['masculino'] || sexMap['male'] || 0
        const sexoDom = sFem> sMas ? 'Femenino' : (sMas> sFem ? 'Masculino' : 'Balanceado')
        const pFem = totalSex>0 ? Math.round(sFem*100/totalSex) : 0
        const pMas = totalSex>0 ? Math.round(sMas*100/totalSex) : 0
        lines.push(`- Distribución por sexo: Femenino ${sFem} (${pFem}%) / Masculino ${sMas} (${pMas}%) → Dominante: ${sexoDom}`)
      }
      if (topDepts.length) {
        const parts = topDepts.map(x=> {
          const p = totalDept>0 ? Math.round((x.count||0)*100/totalDept) : 0
          return `${x.label} (${x.count}, ${p}%)`
        })
        lines.push(`- Zonas con mayor demanda: ${parts.join(', ')}`)
        lines.push(`- Dispersión geográfica: ${dispersionDept<0.2 ? 'Alta concentración en pocas zonas' : dispersionDept<0.5 ? 'Concentración media' : 'Demanda dispersa en varias zonas'}`)
      }
      if (!topAges.length && !topDepts.length) {
        lines.push('- Sin patrón dominante visible; iniciar con segmentación amplia y refinar por rendimiento.')
      }
      lines.push('')

      // Canales y mix según datos (si hay dominancia por edades jovenes, más social; si es balanceado, mix)
      const ageSignalYoung = topAges.some(x=> /(18|24|25|34)/.test(String(x.label)))
      lines.push('Canales y Mix propuesto (derivado de la distribución observada):')
      const mix = ageSignalYoung
        ? { social: 0.65, search: 0.25, crm: 0.10 }
        : { social: 0.50, search: 0.35, crm: 0.15 }
      if (dispersionDept>=0.5) {
        // Demanda muy dispersa → subir prospecting
        mix.social += 0.05; mix.search -= 0.05
      }
      lines.push(`- Social ${(mix.social*100).toFixed(0)}% · Search ${(mix.search*100).toFixed(0)}% · CRM ${(mix.crm*100).toFixed(0)}%`)
      lines.push('- Refuerzo orgánico: SEO local y Google Business Profile según zonas dominantes; contenidos cortos de proyectos.')
      lines.push('')

      // Enfoques de mensajes (a nivel de idea) derivados de los segmentos, sin frases predefinidas
      lines.push('Enfoques de mensajes (a nivel de idea, no textos):')
      if (ageSignalYoung) {
        lines.push('- Primeros compradores: claridad de requisitos, accesibilidad de cuota y tiempos de calificación cortos.')
      }
      if (topDepts.length) {
        lines.push(`- Relevancia local: resaltar ventajas específicas en ${topDepts.slice(0,2).map(x=>x.label).join(' y ') || 'las zonas dominantes'}.`)
      }
      lines.push('- Seguridad, acceso a servicios y alternativas de financiamiento según perfil.')
      lines.push('')

      // Presupuesto base proporcional al volumen
      const base = typeof totalLeads==='number' ? Math.max(3000, Math.min(15000, totalLeads*50)) : 6000
      const social = Math.round(base * (ageSignalYoung? 0.65: 0.5))
      const search = Math.round(base * (ageSignalYoung? 0.25: 0.35))
      const crm = Math.round(base * 0.15)
      lines.push('Presupuesto sugerido (aprox., derivado del volumen observado):')
      lines.push(`- Total mensual estimado: S/ ${base.toLocaleString('es-PE')} → Social S/ ${social}, Search S/ ${search}, CRM S/ ${crm}`)
      lines.push('')

      // KPIs
      lines.push('KPIs:')
      lines.push('- CPL objetivo por canal (S/): Social 6–12, Search 8–18, Orgánico 3–6.')
      lines.push('- Conversión lead→cita: 12–18%. Cita→visita: 30–40%.')
      lines.push('- Tiempo de respuesta < 5 min. + nurturing 5–7 toques/10 días.')
      lines.push('')

      // Plan 4 semanas
      lines.push('Plan 4 semanas (operativo):')
      lines.push('- Semana 1: Auditoría/tracking (UTM, píxeles), landings por segmentos detectados, creatividades base por edad/zona.')
      lines.push('- Semana 2: Lanzamiento campañas con el mix propuesto; definir SLA de contacto y flujos de nurturing.')
      lines.push('- Semana 3: Optimización por CTR/CPL y distribución por zonas; pruebas de formularios y mensajes por segmento.')
      lines.push('- Semana 4: Escalar conjuntos ganadores; activar alianzas locales en zonas con alta concentración; consolidar informe y próximos pasos.')
      lines.push('')

      lines.push('Riesgos y Supuestos: precisión de la muestra, sesgo temporal, disponibilidad de stock y velocidad de contacto; mitigar con medición semanal y SLA <5 min.')
      return lines.join('\n')
    }

    if (provider === 'local') {
      content = localSynthesis()
      return res.json({ success:true, data: { content } })
    }

    if (provider === 'gemini') {
      const gKey = process.env.GEMINI_API_KEY
      if (!gKey) return res.status(500).json({ success:false, message:'GEMINI_API_KEY no configurada' })

      async function tryGemini(url) {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `${system}\n\n${user}` }]}],
            generationConfig: { temperature: 0.7, maxOutputTokens: 900 }
          })
        })
        return r
      }

      const models = [
        process.env.GEMINI_MODEL || 'gemini-1.5-pro',
        'gemini-1.5-flash'
      ]
      const versions = [process.env.GEMINI_API_VERSION || 'v1']
      let ok = false, lastTxt = '', lastUrl = ''
      for (const m of models) {
        for (const v of versions) {
          const url = `https://generativelanguage.googleapis.com/${v}/models/${m}:generateContent?key=${gKey}`
          const respG = await tryGemini(url)
          if (respG.ok) {
            const dataG = await respG.json()
            content = dataG?.candidates?.[0]?.content?.parts?.[0]?.text || ''
            ok = true
            break
          } else if (provider === 'deepseek') {
      const dsKey = process.env.DEEPSEEK_API_KEY
      if (!dsKey) return res.status(500).json({ success:false, message:'DEEPSEEK_API_KEY no configurada' })
      const models = [ process.env.DEEPSEEK_MODEL || 'deepseek-chat', 'deepseek-reasoner' ]
      let ok = false, lastTxt = ''
      for (const m of models) {
        const resp = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${dsKey}`
          },
          body: JSON.stringify({
            model: m,
            messages: [
              { role:'system', content: system },
              { role:'user', content: user }
            ],
            temperature: 0.7,
            max_tokens: 900
          })
        })
        if (resp.ok) {
          const data = await resp.json()
          content = data?.choices?.[0]?.message?.content || ''
          ok = !!content
          if (ok) break
        } else {
          lastTxt = await resp.text().catch(()=> '')
        }
      }
      if (!ok) {
        return res.status(500).json({ success:false, message:'DeepSeek request failed', details: lastTxt, fallback: localSynthesis() })
      }
    } else {
            lastTxt = await respG.text().catch(()=> '')
            lastUrl = url
          }
        }
        if (ok) break
      }
      if (!ok) {
        return res.status(500).json({ success:false, message:'Gemini request failed', details: lastTxt, url: lastUrl, fallback: localSynthesis() })
      }
    } else {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) return res.status(500).json({ success:false, message:'OPENAI_API_KEY no configurada' })

      const models = [
        process.env.OPENAI_MODEL || 'gpt-4o-mini',
        'gpt-4o',
        'gpt-3.5-turbo-0125'
      ]
      let ok = false, lastTxt = ''
      for (const m of models) {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: m,
            messages: [
              { role:'system', content: system },
              { role:'user', content: user }
            ],
            temperature: 0.7,
            max_tokens: 900
          })
        })
        if (resp.ok) {
          const data = await resp.json()
          content = data?.choices?.[0]?.message?.content
                 || data?.choices?.[0]?.delta?.content
                 || ''
          ok = !!content
          if (ok) break
        } else {
          lastTxt = await resp.text().catch(()=> '')
        }
      }
      if (!ok) {
        return res.status(500).json({ success:false, message:'OpenAI request failed', details: lastTxt, fallback: localSynthesis() })
      }
    }

    return res.json({ success:true, data: { content } })
  } catch (e) {
    return res.status(500).json({ success:false, message: e.message || 'AI error' })
  }
})

module.exports = router
