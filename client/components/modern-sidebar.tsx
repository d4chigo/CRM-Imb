"use client"

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  Target, 
  Building, 
  BarChart3, 
  Settings,
  Phone,
  Mail,
  Calendar,
  FileText,
  PieChart,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  className?: string;
  isCollapsed?: boolean;
}

const navigationItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Vista general del sistema"
  },
  {
    title: "Contactos",
    href: "/dashboard/contacts",
    icon: Users,
    description: "Gestión de contactos"
  },
  {
    title: "Oportunidades",
    href: "/dashboard/opportunities",
    icon: Target,
    description: "Pipeline de ventas"
  },
  {
    title: "Empresas",
    href: "/dashboard/companies",
    icon: Building,
    description: "Gestión de empresas"
  },
  {
    title: "Actividades",
    href: "/dashboard/activities",
    icon: Calendar,
    description: "Tareas y eventos"
  },
  {
    title: "Reportes",
    href: "/dashboard/reports",
    icon: BarChart3,
    description: "Informes y analytics"
  }
];

const quickActions = [
  {
    title: "Nueva llamada",
    href: "/dashboard/call",
    icon: Phone
  },
  {
    title: "Enviar email",
    href: "/dashboard/email",
    icon: Mail
  },
  {
    title: "Crear reporte",
    href: "/dashboard/report",
    icon: FileText
  }
];

export function ModernSidebar({ className, isCollapsed = false }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={cn(
      "flex h-full flex-col bg-slate-900 text-white transition-all duration-300 ease-in-out",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Sidebar Header */}
      <div className="flex h-16 items-center justify-center border-b border-slate-800 px-4">
        {!isCollapsed ? (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">C</span>
            </div>
            <span className="text-lg font-bold">CRM System</span>
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">C</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        <div className={cn("space-y-1", !isCollapsed && "mb-6")}>
          {!isCollapsed && (
            <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Navegación
            </h2>
          )}
          
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-slate-800",
                  isActive 
                    ? "bg-primary/20 text-primary border-r-2 border-primary shadow-lg" 
                    : "text-slate-300 hover:text-white",
                  isCollapsed ? "justify-center" : "justify-start"
                )}
                title={isCollapsed ? item.title : undefined}
              >
                <Icon className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-primary" : "text-slate-400 group-hover:text-white",
                  !isCollapsed && "mr-3"
                )} />
                
                {!isCollapsed && (
                  <div className="flex flex-col">
                    <span>{item.title}</span>
                    {item.description && (
                      <span className="text-xs text-slate-400 group-hover:text-slate-300">
                        {item.description}
                      </span>
                    )}
                  </div>
                )}
                
                {isActive && !isCollapsed && (
                  <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Quick Actions */}
        {!isCollapsed && (
          <div className="border-t border-slate-800 pt-4">
            <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Acciones rápidas
            </h2>
            <div className="space-y-1">
              {quickActions.map((action) => {
                const Icon = action.icon;
                
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-slate-800 hover:text-white"
                  >
                    <Icon className="mr-3 h-4 w-4 text-slate-400 group-hover:text-primary" />
                    {action.title}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats Summary (when expanded) */}
        {!isCollapsed && (
          <div className="border-t border-slate-800 pt-4">
            <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Resumen
            </h2>
            <div className="space-y-2 px-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Contactos</span>
                <span className="font-medium text-primary">1,234</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Oportunidades</span>
                <span className="font-medium text-success">89</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Meta mensual</span>
                <span className="font-medium text-white">78%</span>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 p-4">
        <Link
          href="/dashboard/settings"
          className={cn(
            "group flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-slate-800 hover:text-white",
            isCollapsed ? "justify-center" : "justify-start"
          )}
          title={isCollapsed ? "Configuración" : undefined}
        >
          <Settings className={cn(
            "h-5 w-5 text-slate-400 group-hover:text-primary",
            !isCollapsed && "mr-3"
          )} />
          {!isCollapsed && "Configuración"}
        </Link>
      </div>
    </aside>
  );
}