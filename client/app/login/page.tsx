'use client';

// Página de inicio de sesión
// Maneja autenticación de usuarios con validación y feedback

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await login({ email, password });
      
      if (response.success) {
        // Redirigir al dashboard después de login exitoso
        router.push('/dashboard');
      } else {
        setError(response.message || 'Error al iniciar sesión');
      }
    } catch (error) {
      setError('Error de conexión. Intenta nuevamente.');
      console.error('Error en login:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Lado izquierdo branding */}
  <div className="md:w-1/2 flex flex-col justify-center p-10 text-white relative overflow-hidden bg-primary">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #ffffff 0, transparent 60%)' }} />
        <div className="relative max-w-md">
          <h1 className="text-4xl font-extrabold mb-4 leading-tight drop-shadow-sm">CRM Inmobiliario</h1>
          <p className="text-white/90 text-lg mb-8">Gestiona contactos, oportunidades y tu pipeline de ventas en un solo lugar.</p>
          <ul className="space-y-3 text-sm text-white/90">
            <li className="flex items-start gap-2"><span className="mt-1 inline-block w-2 h-2 rounded-full bg-white" /> Importa contactos desde Google</li>
            <li className="flex items-start gap-2"><span className="mt-1 inline-block w-2 h-2 rounded-full bg-white" /> Arrastra y suelta oportunidades en el pipeline</li>
            <li className="flex items-start gap-2"><span className="mt-1 inline-block w-2 h-2 rounded-full bg-white" /> Crea oportunidades desde la lista de contactos</li>
          </ul>
          <div className="mt-10 text-xs text-white/70">© {new Date().getFullYear()} CRM-Imb</div>
        </div>
      </div>
      {/* Lado derecho formulario */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-gray-50">
        <Card className="w-full max-w-md shadow-lg border border-gray-200">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary">
                <Lock className="h-5 w-5 text-white" />
              </span>
              Acceso
            </CardTitle>
            <CardDescription>Ingresa tus credenciales para continuar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input id="email" type="email" className="pl-9" placeholder="admin@crm-imb.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input id="password" type="password" className="pl-9" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
                </div>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full font-semibold hover:opacity-90 transition" variant="brand">
                {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Validando...</> : 'Iniciar Sesión'}
              </Button>
              <div className="text-center text-sm text-gray-600">
                ¿No tienes cuenta?{' '}<Link href="/register" className="font-medium text-gray-900 hover:underline" style={{ color: '#b77900' }}>Regístrate</Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
