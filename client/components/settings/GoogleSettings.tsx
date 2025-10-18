import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/lib/auth';

export function GoogleSettings() {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [settings, setSettings] = React.useState({
    syncContacts: false,
    syncCalendar: false,
    autoSync: true
  });

  // Check connection status on mount
  React.useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await authService.authenticatedFetch('/api/google/status');
        const data = await response.json();
        setIsConnected(data.connected);
        
        if (data.connected) {
          setSettings({
            syncContacts: data.scopes?.includes('contacts') || false,
            syncCalendar: data.scopes?.includes('calendar') || false,
            autoSync: data.autoSync || true
          });
        }
      } catch (error) {
        console.error('Error checking Google connection:', error);
        toast({
          title: 'Error',
          description: 'No se pudo verificar el estado de la conexión con Google',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
  }, [toast]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      // Open the Google OAuth consent screen in a popup
      const width = 600;
      const height = 800;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        '/api/google/auth',
        'googleAuth',
        `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
      );
      
      // Check if the popup was blocked
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        throw new Error('No se pudo abrir la ventana de autenticación. Por favor, permite las ventanas emergentes para este sitio.');
      }
      
      // Poll to check if the popup is closed
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          // Refresh the connection status
          window.location.reload();
        }
      }, 500);
      
    } catch (error) {
      console.error('Error connecting Google account:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo conectar con Google',
        variant: 'destructive',
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsConnecting(true);
      const response = await authService.authenticatedFetch('/api/google/disconnect', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('No se pudo desconectar la cuenta de Google');
      }
      
      setIsConnected(false);
      setSettings({
        syncContacts: false,
        syncCalendar: false,
        autoSync: false
      });
      
      toast({
        title: 'Cuenta desconectada',
        description: 'Tu cuenta de Google se ha desconectado correctamente',
      });
      
    } catch (error) {
      console.error('Error disconnecting Google account:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo desconectar la cuenta de Google',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSettingChange = async (setting, value) => {
    try {
      const newSettings = { ...settings, [setting]: value };
      setSettings(newSettings);
      
      // If trying to enable sync but not connected, connect first
      if ((setting === 'syncContacts' || setting === 'syncCalendar') && value && !isConnected) {
        return handleConnect();
      }
      
      // Update settings on the server
      const response = await authService.authenticatedFetch('/api/google/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      
      if (!response.ok) {
        throw new Error('No se pudieron guardar las configuraciones');
      }
      
      toast({
        title: 'Configuración guardada',
        description: 'Tus preferencias se han guardado correctamente',
      });
      
    } catch (error) {
      console.error('Error updating settings:', error);
      // Revert the UI change if the request fails
      setSettings(prev => ({ ...prev, [setting]: !value }));
      
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron guardar los cambios',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div>Cargando configuración de Google...</div>;
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Conexión con Google</CardTitle>
        <CardDescription>
          Conecta tu cuenta de Google para sincronizar contactos y eventos del calendario.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Estado de la conexión</h3>
            <p className="text-sm text-muted-foreground">
              {isConnected 
                ? 'Tu cuenta está conectada' 
                : 'No hay ninguna cuenta de Google conectada'}
            </p>
          </div>
          {isConnected ? (
            <Button 
              variant="destructive" 
              onClick={handleDisconnect}
              disabled={isConnecting}
            >
              {isConnecting ? 'Desconectando...' : 'Desconectar'}
            </Button>
          ) : (
            <Button 
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? 'Conectando...' : 'Conectar con Google'}
            </Button>
          )}
        </div>
        
        {isConnected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="sync-contacts">Sincronizar Contactos</Label>
                <p className="text-sm text-muted-foreground">
                  Mantén tus contactos de Google sincronizados con el CRM
                </p>
              </div>
              <Switch
                id="sync-contacts"
                checked={settings.syncContacts}
                onCheckedChange={(checked) => handleSettingChange('syncContacts', checked)}
                disabled={!isConnected}
              />
            </div>
            
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="sync-calendar">Sincronizar Calendario</Label>
                <p className="text-sm text-muted-foreground">
                  Sincroniza eventos de Google Calendar con el CRM
                </p>
              </div>
              <Switch
                id="sync-calendar"
                checked={settings.syncCalendar}
                onCheckedChange={(checked) => handleSettingChange('syncCalendar', checked)}
                disabled={!isConnected}
              />
            </div>
            
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="auto-sync">Sincronización automática</Label>
                <p className="text-sm text-muted-foreground">
                  Actualizar automáticamente los datos de Google cada hora
                </p>
              </div>
              <Switch
                id="auto-sync"
                checked={settings.autoSync}
                onCheckedChange={(checked) => handleSettingChange('autoSync', checked)}
                disabled={!isConnected}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
