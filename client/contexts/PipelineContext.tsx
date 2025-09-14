"use client";
// Contexto global para el pipeline: permite que Contactos y PipelineBoard compartan
// el mismo estado de columnas y oportunidades. Soluciona el problema de que al
// añadir una oportunidad desde la lista de contactos no aparecía en el tablero
// (cada componente tenía su propio estado interno separado).

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { Column, Opportunity } from '@/types/pipeline';
import { initialColumns } from '@/data/pipeline';
import { fetchStages } from '@/lib/pipelineStages';
import { listOpportunities } from '@/lib/opportunities';
import { listCotizaciones } from '@/lib/cotizaciones';
import { canonicalStageOrder } from '@/hooks/use-pipeline-dnd';

interface PipelineContextValue {
  columns: Column[];
  addOpportunity: (columnId: string, opportunity: Omit<Opportunity,'id'> & Partial<Pick<Opportunity,'id'>>) => void;
  updateOpportunityLocal: (id: string, patch: Partial<Opportunity>) => void;
  removeOpportunityLocal: (id: string) => void;
  moveOpportunityLocal: (fromCol: string, toCol: string, indexFrom: number, indexTo: number) => void;
  reorderWithinColumn: (colId: string, from: number, to: number) => void;
  reorderColumns: (order: string[]) => void;
  addColumn: (c: { id: string; title: string; color: string }) => void;
  removeColumn: (id: string, opts?: { force?: boolean }) => boolean;
  updateColumn: (id: string, data: Partial<Pick<Column,'title'|'color'>>) => void;
  setColumns: React.Dispatch<React.SetStateAction<Column[]>>;
}

const PipelineContext = createContext<PipelineContextValue | null>(null);

export function PipelineProvider({ children }: { children: React.ReactNode }) {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [loaded, setLoaded] = useState(false); // evita re-hidrataciones múltiples

  // Hidratación inicial: etapas y oportunidades persistidas
  useEffect(() => {
    if (loaded) return; // ya hidratado
    let mounted = true;
    (async () => {
      try {
        const apiStages = await fetchStages();
        if (!mounted) return;
        let mapped: Column[] = apiStages.map(s => ({ id: s.id, title: s.title, color: s.color, opportunities: [] }));
        mapped = mapped.sort((a,b) => {
          const ia = canonicalStageOrder.indexOf(a.id);
            const ib = canonicalStageOrder.indexOf(b.id);
          if (ia === -1 && ib === -1) return a.title.localeCompare(b.title);
          if (ia === -1) return 1;
          if (ib === -1) return -1;
          return ia - ib;
        });
        try {
          const [opps, servicios] = await Promise.all([
            listOpportunities(),
            listCotizaciones().catch(() => [])
          ]);
          const servicioMap = new Map<number, string>();
          (servicios as any[]).forEach((s:any) => servicioMap.set(Number(s.id), s.nombre));
          opps.forEach(o => {
            const etapa = o.etapaId || 'contacto_inicial';
            let col = mapped.find(c => c.id === etapa);
            if (!col) {
              col = { id: etapa, title: etapa, color: '#6B7280', opportunities: [] };
              mapped.push(col);
            }
            col.opportunities.push({
              id: String(o.id),
              clientName: o.nombreCliente,
              serviceName: (o.servicioId && servicioMap.get(Number(o.servicioId))) || 'Servicio',
              agent: 'Sin asignar',
              value: o.valorUsd || 0,
              probability: o.probabilidad || 0,
              closeDate: o.fechaCierre || new Date().toISOString().slice(0,10),
              phone: o.telefono || '',
              email: o.email || ''
            });
          });
        } catch(e) {
          console.warn('PipelineProvider: no se pudieron cargar oportunidades.', (e as any)?.message);
        }
    setColumns(mapped);
    setLoaded(true);
      } catch(_) {
        // Silenciar errores iniciales
      }
    })();
    return () => { mounted = false; };
  }, [loaded]);

  const addOpportunity = useCallback((columnId: string, opportunity: Omit<Opportunity,'id'> & Partial<Pick<Opportunity,'id'>>) => {
    const id = opportunity.id ?? `${Date.now()}`;
    setColumns(prev => prev.map(col => col.id === columnId ? { ...col, opportunities: [{ id, ...opportunity } as Opportunity, ...col.opportunities] } : col));
  }, []);

  const updateOpportunityLocal = useCallback((id: string, patch: Partial<Opportunity>) => {
    setColumns(prev => prev.map(col => ({ ...col, opportunities: col.opportunities.map(o => o.id === id ? { ...o, ...patch } : o) })));
  }, []);

  const removeOpportunityLocal = useCallback((id: string) => {
    setColumns(prev => prev.map(col => ({
      ...col,
      opportunities: col.opportunities.filter(o => o.id !== id)
    })));
  }, []);

  const moveOpportunityLocal = useCallback((fromCol: string, toCol: string, indexFrom: number, indexTo: number) => {
    setColumns(prev => {
      const source = prev.find(c => c.id === fromCol);
      const dest = prev.find(c => c.id === toCol);
      if (!source || !dest) return prev;
      const sourceOps = [...source.opportunities];
      const [moved] = sourceOps.splice(indexFrom,1);
      if (!moved) return prev;
      const destOps = [...dest.opportunities];
      destOps.splice(indexTo,0,moved);
      return prev.map(c => {
        if (c.id === fromCol) return { ...c, opportunities: sourceOps };
        if (c.id === toCol) return { ...c, opportunities: destOps };
        return c;
      });
    });
  }, []);

  const reorderWithinColumn = useCallback((colId: string, from: number, to: number) => {
    setColumns(prev => prev.map(c => {
      if (c.id !== colId) return c;
      const list = [...c.opportunities];
      const [item] = list.splice(from,1);
      list.splice(to,0,item);
      return { ...c, opportunities: list };
    }));
  }, []);

  const addColumn = useCallback((column: { id: string; title: string; color: string }) => {
    setColumns(prev => prev.some(c => c.id === column.id) ? prev : [...prev, { ...column, opportunities: [] }]);
  }, []);

  const removeColumn = useCallback((id: string, opts?: { force?: boolean }) => {
    let removed = false;
    setColumns(prev => {
      const col = prev.find(c => c.id === id);
      if (!col) return prev;
      if (col.opportunities.length > 0 && !opts?.force) return prev;
      removed = true;
      return prev.filter(c => c.id !== id);
    });
    return removed;
  }, []);

  const updateColumn = useCallback((id: string, data: Partial<Pick<Column,'title'|'color'>>) => {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  }, []);

  const reorderColumns = useCallback((order: string[]) => {
    setColumns(prev => {
      const map = new Map(prev.map(c => [c.id, c] as const));
      return order.map(id => map.get(id)).filter(Boolean) as Column[];
    });
  }, []);

  const value: PipelineContextValue = useMemo(() => ({
    columns,
    addOpportunity,
    updateOpportunityLocal,
    removeOpportunityLocal,
    moveOpportunityLocal,
    reorderWithinColumn,
    reorderColumns,
    addColumn,
    removeColumn,
    updateColumn,
    setColumns
  }), [columns, addOpportunity, updateOpportunityLocal, removeOpportunityLocal, moveOpportunityLocal, reorderWithinColumn, reorderColumns, addColumn, removeColumn, updateColumn]);

  return <PipelineContext.Provider value={value}>{children}</PipelineContext.Provider>;
}

export function usePipeline() {
  const ctx = useContext(PipelineContext);
  if (!ctx) throw new Error('usePipeline debe usarse dentro de PipelineProvider');
  return ctx;
}
