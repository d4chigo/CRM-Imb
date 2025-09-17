"use client"

import React from 'react';
import { Search, Bell, User, Menu, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface HeaderProps {
  onMenuClick?: () => void;
  user?: {
    name?: string;
    nombre?: string;
    email: string;
    avatar?: string;
  };
}

export function ModernHeader({ onMenuClick, user }: HeaderProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [notificationCount] = React.useState(3); // Example notification count

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left Section - Menu and Logo */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden hover:bg-accent"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">C</span>
            </div>
            <span className="hidden font-bold text-foreground sm:inline-block">
              CRM
            </span>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-2xl mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar contactos, oportunidades..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 bg-background/50 border-border focus:bg-background transition-all duration-200"
            />
          </div>
        </div>

        {/* Right Section - Notifications and Profile */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-accent"
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-xs font-medium text-destructive-foreground flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex-col items-start p-4">
                <div className="font-medium">Nueva oportunidad</div>
                <div className="text-sm text-muted-foreground">
                  Juan Pérez está interesado en el producto Premium
                </div>
                <div className="text-xs text-muted-foreground mt-1">Hace 5 min</div>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex-col items-start p-4">
                <div className="font-medium">Recordatorio</div>
                <div className="text-sm text-muted-foreground">
                  Llamar a María García a las 3:00 PM
                </div>
                <div className="text-xs text-muted-foreground mt-1">Hace 1 hora</div>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex-col items-start p-4">
                <div className="font-medium">Contacto actualizado</div>
                <div className="text-sm text-muted-foreground">
                  Carlos López actualizó su información
                </div>
                <div className="text-xs text-muted-foreground mt-1">Hace 2 horas</div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.avatar} alt={user?.name || user?.nombre || "Usuario"} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {((user?.name || user?.nombre)?.split(' ').map(n => n[0]).join('').toUpperCase()) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name || user?.nombre || "Usuario"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || "usuario@ejemplo.com"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configuración</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}