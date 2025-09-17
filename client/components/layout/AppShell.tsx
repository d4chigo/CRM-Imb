"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Search, Users, LayoutGrid, BarChart3, CalendarDays, FileText, LogOut, Building2, Settings } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"
import { useDashboardTabs } from "@/contexts/DashboardTabsContext"

// Simple icon map for the sidebar
const NavIcon: Record<string, React.ReactNode> = {
  pipeline: <LayoutGrid className="size-4" />,
  contacts: <Users className="size-4" />,
  properties: <FileText className="size-4" />,
  activities: <CalendarDays className="size-4" />,
  statistics: <BarChart3 className="size-4" />,
}

export function AppShell({
  children,
  title = "CRM Inmobiliario",
}: {
  children: React.ReactNode
  title?: string
}) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { activeTab, setActiveTab } = useDashboardTabs()

  const nav = [
    { key: "pipeline", label: "Pipeline" },
    { key: "contacts", label: "Contactos" },
    { key: "properties", label: "Cotizaciones" },
    { key: "activities", label: "Actividades" },
    { key: "statistics", label: "Estadísticas" },
  ]

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar px-4 py-6">
        <div className="flex items-center gap-3 px-2 mb-6">
          <div className="p-2 rounded-md bg-[var(--sidebar-active)] text-[var(--sidebar-bg)]">
            <Building2 className="size-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm/5 text-white font-semibold">CRM</div>
            <div className="text-[11px] text-[var(--sidebar-muted)]">Inmobiliario</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {nav.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className="nav-item text-sm"
              aria-current={activeTab === item.key ? "page" : undefined}
            >
              <span className="text-white/90">{NavIcon[item.key]}</span>
              <span className="text-white/90">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto" />

        <div className="mt-6 rounded-lg border border-white/10 p-3">
          <div className="text-[11px] text-[var(--sidebar-muted)] mb-1">Sesión</div>
          <div className="flex items-center gap-2 text-sm text-white/90">
            <Avatar className="size-6">
              <AvatarFallback>{(user?.name || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="truncate">
              <div className="truncate max-w-[140px]">{user?.name || "Usuario"}</div>
              <div className="text-[11px] text-[var(--sidebar-muted)]">{user?.role || "agente"}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full mt-2 text-white/80 hover:text-[var(--sidebar-active)] hover:bg-white/5" onClick={logout}>
            <LogOut className="size-4" />
            Salir
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex h-full min-h-0 flex-col">
        {/* Topbar */}
        <header className="topbar">
          <div className="flex items-center justify-between h-14 px-5">
            <div className="flex items-center gap-3">
              <h1 className="text-[15px] font-semibold text-foreground">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 bg-secondary rounded-md px-2.5 py-1.5 border">
                <Search className="size-4 text-muted-foreground" />
                <Input placeholder="Buscar…" className="h-8 border-0 bg-transparent focus-visible:ring-0" />
              </div>
              <Button variant="ghost" size="icon" className="text-foreground">
                <Bell className="size-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content (single vertical scroll area) */}
        <main className="content-scroll flex-1 overflow-auto p-6 bg-[var(--background)]">{children}</main>
      </div>
    </div>
  )
}

export default AppShell
