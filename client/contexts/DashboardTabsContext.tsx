"use client";
// Contexto para controlar la pestaña activa del dashboard desde componentes anidados
import React, { createContext, useContext, useState, useCallback } from 'react';

interface DashboardTabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const DashboardTabsContext = createContext<DashboardTabsContextValue | null>(null);

export function DashboardTabsProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState('pipeline');
  const value = { activeTab, setActiveTab: useCallback((t:string)=> setActiveTab(t), []) };
  return <DashboardTabsContext.Provider value={value}>{children}</DashboardTabsContext.Provider>;
}

export function useDashboardTabs() {
  const ctx = useContext(DashboardTabsContext);
  if(!ctx) throw new Error('useDashboardTabs debe usarse dentro de DashboardTabsProvider');
  return ctx;
}
