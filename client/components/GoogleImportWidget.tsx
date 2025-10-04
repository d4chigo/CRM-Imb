"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, RefreshCw, CheckCircle2, AlertTriangle, Loader2, Users, Cloud } from "lucide-react"
import { getGoogleContactsAuthUrl, openGoogleImportPopup, getGoogleSyncStatus, manualGoogleSync } from "@/lib/googleContacts"
import { useToast } from '@/hooks/use-toast'

interface GoogleImportWidgetProps {
  onImportComplete?: (imported: number, skipped: number) => void;
  compact?: boolean;
}

export function GoogleImportWidget({ onImportComplete, compact = false }: GoogleImportWidgetProps) {
  const [importing, setImporting] = useState(false)
  const [importFailed, setImportFailed] = useState<string | null>(null)
  const [lastImport, setLastImport] = useState<{ imported: number; skipped: number } | null>(null)
  const [googleStatus, setGoogleStatus] = useState<{ connected: boolean; syncEnabled: boolean; lastSync: string | null }>({ connected: false, syncEnabled: false, lastSync: null })
  
  const popupRef = useRef<Window | null>(null)
  const watcherRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Cargar estado de Google al iniciar
  useEffect(() => {
    loadGoogleStatus()
  }, [])

  // Limpiar referencias al desmontar
  useEffect(() => {
    return () => {
      if (watcherRef.current) clearInterval(watcherRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (popupRef.current) popupRef.current.close()
    }
  }, [])

  // Escuchar mensajes del popup
  useEffect(() => {
    function handleMessage(ev: MessageEvent) {
      if (!ev.data) return;
      console.log('[GoogleImport] Received message:', ev.data);
      if (ev.data.type === 'google-import-result') {
        console.log('[GoogleImport] Import result:', ev.data.imported, 'imported,', ev.data.skipped, 'skipped');
        finalizeImport(ev.data.imported, ev.data.skipped)
      } else if (ev.data.type === 'google-import-error') {
        const err = (ev.data.error || '').toString();
        let description = ev.data.description || 'Error en autorización con Google';
        console.error('[GoogleImport] Import error:', err, description);
        if (err === 'access_denied') {
          description = 'Acceso denegado. Asegúrate de que tu correo esté añadido como Test User en Google Cloud (OAuth consent screen) y vuelve a intentar.';
        } else if (err.includes('invalid_grant')) {
          description = 'Token de Google inválido. Vuelve a autorizar la conexión.';
        }
        failImport(description)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  async function loadGoogleStatus() {
    try {
      const status = await getGoogleSyncStatus()
      setGoogleStatus(status)
    } catch (error) {
      console.error('Error loading Google status:', error)
    }
  }

  function checkLocalStorageFallback() {
    try {
      const stored = localStorage.getItem('googleImportResult')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Date.now() - parsed.ts < 5000) {
          localStorage.removeItem('googleImportResult')
          finalizeImport(parsed.imported, parsed.skipped)
          return true
        }
      }
    } catch (e) {}
    return false
  }

  function finalizeImport(imported: number, skipped: number) {
    setImporting(false)
    setImportFailed(null)
    setLastImport({ imported, skipped })
    if (watcherRef.current) clearInterval(watcherRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (popupRef.current) popupRef.current.close()
    
    toast({ 
      title: 'Importación completada', 
      description: `${imported} contactos importados, ${skipped} duplicados omitidos` 
    })
    
    // Actualizar estado de Google después de importar
    loadGoogleStatus()
    
    // Notificar al componente padre
    if (onImportComplete) {
      onImportComplete(imported, skipped)
    }
  }

  function failImport(message: string) {
    setImporting(false)
    setImportFailed(message)
    if (watcherRef.current) clearInterval(watcherRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    toast({ title: 'Error en importación', description: message, variant: 'destructive' })
  }

  async function startGoogleImport() {
    if (importing) return;
    
    const popup = openGoogleImportPopup('about:blank');
    popupRef.current = popup;
    
    try {
      setImporting(true)
      setImportFailed(null)
      
      if (popup) popup.document.write('<p style="font-family:sans-serif;padding:10px;">Obteniendo URL de autorización...</p>');
      
      console.log('[GoogleImport] Requesting auth URL...');
      const url = await getGoogleContactsAuthUrl();
      console.log('[GoogleImport] Auth URL received, redirecting...');
      
      if (popup) popup.location.replace(url);
      
      toast({ 
        title: 'Redirigiendo a Google', 
        description: 'Autoriza el acceso y se importarán tus contactos.' 
      });
      
      // Detectar cierre del popup
      const started = Date.now();
      watcherRef.current = setInterval(() => {
        if (checkLocalStorageFallback()) return;
        
        if (popupRef.current && popupRef.current.closed) {
          if (Date.now() - started > 800) {
            failImport('Se cerró el popup antes de completar la autorización');
          } else {
            if (!checkLocalStorageFallback()) {
              failImport('Popup bloqueado por el navegador o cerrado prematuramente');
            }
          }
        }
      }, 400);
      
      // Timeout de seguridad
      timeoutRef.current = setTimeout(() => {
        if (importing) {
          if (!checkLocalStorageFallback()) {
            failImport('Tiempo de espera agotado durante la autorización');
          }
        }
      }, 30000);
      
    } catch (error: any) {
      console.error('[GoogleImport] Error starting import:', error);
      let msg = error?.message || 'Error desconocido';
      
      if (msg.includes('401') || msg.includes('Unauthorized')) {
        msg = 'Sesión expirada. Vuelve a iniciar sesión.';
      } else if (msg.includes('403') || msg.includes('Forbidden')) {
        msg = 'Acceso denegado. Verifica que tu cuenta esté autorizada en Google Cloud Console.';
      } else if (msg.includes('Token de Google expirado')) {
        msg = 'Autorización de Google expirada. Vuelve a autorizar la conexión.';
      }
      
      failImport(msg);
      
      if (popup) {
        popup.document.open();
        popup.document.write(`
          <div style="font-family:sans-serif;padding:16px;max-width:360px;text-align:center;">
            <h3 style="color:#dc2626;">Error al conectar con Google</h3>
            <p style="color:#b91c1c;">${msg}</p>
            <p style="font-size:12px;color:#555;margin-top:16px;">Cierra esta ventana y reintenta.</p>
            <p style="font-size:10px;color:#888;">Error técnico: ${error?.message || 'Desconocido'}</p>
          </div>
        `);
        popup.document.close();
      }
    }
  }

  async function retrySync() {
    try {
      setImportFailed(null)
      const res = await manualGoogleSync();
      toast({ 
        title: 'Sincronización completada', 
        description: `${res.synced} contactos sincronizados de ${res.total}` 
      })
      setLastImport({ imported: res.synced, skipped: res.total - res.synced })
      loadGoogleStatus()
      
      if (onImportComplete) {
        onImportComplete(res.synced, res.total - res.synced)
      }
    } catch (error: any) {
      toast({ 
        title: 'Error en sincronización', 
        description: error.message || 'No se pudo sincronizar', 
        variant: 'destructive' 
      })
      setImportFailed(error.message || 'Error en sincronización manual')
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {googleStatus.connected ? (
          <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1"/>
            Conectado
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">
            <AlertTriangle className="h-3 w-3 mr-1"/>
            No conectado
          </Badge>
        )}
        
        <Button 
          size="sm"
          variant={googleStatus.connected ? "outline" : "default"}
          disabled={importing}
          onClick={startGoogleImport}
        >
          {importing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Cloud className="h-4 w-4 mr-2" />
          )}
          {importing ? 'Conectando...' : (googleStatus.connected ? 'Sincronizar' : 'Conectar')}
        </Button>
        
        {importFailed && (
          <Button size="sm" variant="ghost" onClick={retrySync}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Importar desde Google Contacts</CardTitle>
              <CardDescription>
                Sincroniza tus contactos de Google con el CRM
              </CardDescription>
            </div>
          </div>
          
          {googleStatus.connected ? (
            <Badge className="bg-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1"/>
              Conectado
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              <AlertTriangle className="h-3 w-3 mr-1"/>
              No conectado
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {lastImport && (
              <p className="text-sm text-gray-600 mb-2">
                Última importación: <span className="font-medium text-green-600">+{lastImport.imported}</span> contactos
                {lastImport.skipped > 0 && (
                  <span className="text-gray-500"> · {lastImport.skipped} duplicados omitidos</span>
                )}
              </p>
            )}
            
            {importFailed && (
              <p className="text-sm text-red-600 mb-2">
                Error: {importFailed}
              </p>
            )}
            
            <p className="text-xs text-gray-500">
              {googleStatus.connected 
                ? "Haz clic en 'Sincronizar' para obtener contactos actualizados"
                : "Conecta tu cuenta de Google para importar contactos automáticamente"
              }
            </p>
          </div>
          
          <div className="flex gap-2">
            {importFailed && (
              <Button variant="outline" size="sm" onClick={retrySync}>
                <RefreshCw className="h-4 w-4 mr-2"/>
                Reintentar
              </Button>
            )}
            
            <Button 
              variant={googleStatus.connected ? "outline" : "default"}
              disabled={importing}
              onClick={startGoogleImport}
              className={!googleStatus.connected ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
            >
              {importing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {importing 
                ? 'Importando...' 
                : (googleStatus.connected ? 'Sincronizar Google' : 'Conectar Google')
              }
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}