"use client"

import { useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"

export default function HomePage() {
  const { isAuthenticated, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        // Si está autenticado, redirigir al dashboard
        window.location.href = "/dashboard"
      } else {
        // Si no está autenticado, redirigir al login
        window.location.href = "/login"
      }
    }
  }, [isAuthenticated, loading])

  // Mostrar loading mientras se verifica la autenticación
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#303030" }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto"></div>
        <p className="mt-4 text-white">Verificando autenticación...</p>
      </div>
    </div>
  )
}
