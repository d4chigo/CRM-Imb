'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock, Mail, Eye, EyeOff, Users, TrendingUp, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [id]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validación básica
    if (!formData.email || !formData.password) {
      setError('Por favor, completa todos los campos');
      return;
    }
    
    // Validación de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Por favor, ingresa un email válido');
      return;
    }

    setIsLoading(true);

    try {
      const response = await login(formData);

      if (response.success) {
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
    <div className="min-h-screen flex flex-col lg:flex-row overflow-y-auto">
      {/* Panel izquierdo */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="absolute inset-0 opacity-60">
          <div className="absolute top-20 left-20 w-32 h-32 rounded-full bg-gradient-to-r from-amber-300/30 to-orange-300/20 blur-2xl"></div>
          <div className="absolute bottom-32 right-32 w-40 h-40 rounded-full bg-gradient-to-l from-yellow-300/20 to-amber-300/15 blur-3xl"></div>
          <div className="absolute top-1/2 left-1/3 w-24 h-24 rounded-full bg-gradient-to-br from-orange-300/25 to-amber-300/20 blur-xl"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 py-16">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center border border-amber-200">
                <Image
                  src="/imb_logo.png"
                  alt="IMB Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">CRM Inmobiliario</h1>
                <p className="text-amber-700 text-sm font-medium">Tu plataforma de gestión</p>
              </div>
            </div>
            <p className="text-lg text-gray-700 max-w-md leading-relaxed">
              Potencia tu negocio inmobiliario con nuestra plataforma integral de gestión de contactos y oportunidades.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 border border-amber-200">
                <Users className="h-6 w-6 text-amber-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">Gestión de Contactos</h3>
                <p className="text-sm text-gray-600">Importa desde Google Contacts y organiza tu base de datos</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0 border border-orange-200">
                <TrendingUp className="h-6 w-6 text-orange-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">Pipeline Visual</h3>
                <p className="text-sm text-gray-600">Arrastra y suelta oportunidades para gestionar tu proceso de ventas</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center flex-shrink-0 border border-yellow-200">
                <Star className="h-6 w-6 text-yellow-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">Dashboard Inteligente</h3>
                <p className="text-sm text-gray-600">Visualiza métricas clave y toma decisiones informadas</p>
              </div>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-amber-200">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} CRM-Imb. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>

      {/* Panel derecho */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white shadow-lg flex items-center justify-center border border-amber-200">
                <Image
                  src="/imb_logo.png"
                  alt="IMB Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">CRM Inmobiliario</h1>
            </div>
          </div>

          <Card className="shadow-2xl border-0 bg-white">
            <CardHeader className="space-y-1 pb-6 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4 border border-amber-200">
                <Lock className="h-7 w-7 text-amber-700" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-800">
                Bienvenido de vuelta
              </CardTitle>
              <CardDescription className="text-gray-600">
                Ingresa tus credenciales para acceder a tu panel de control
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertDescription className="text-sm text-red-700">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Correo electrónico
                  </Label>
                  <div className="relative">
                    <Mail className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-11 h-12 border-gray-300 bg-gray-50 focus:bg-white focus:border-amber-500 focus:ring-amber-500 transition-all"
                      placeholder="tu@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className="pl-11 pr-11 h-12 border-gray-300 bg-gray-50 focus:bg-white focus:border-amber-500 focus:ring-amber-500 transition-all"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      disabled={isLoading}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end text-sm">
                  <Link
                    href="/forgot-password"
                    className="text-amber-600 hover:text-amber-700 font-medium transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Iniciando sesión...
                    </>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </Button>

                <div className="text-center text-sm text-gray-600">
                  ¿No tienes cuenta?{' '}
                  <Link
                    href="/register"
                    className="font-medium text-amber-600 hover:text-amber-700 transition-colors underline-offset-4 hover:underline"
                  >
                    Regístrate aquí
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}