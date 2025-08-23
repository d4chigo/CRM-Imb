/**
 * Datos simulados del pipeline de ventas.
 * @module data/pipeline
 */

import type { Column } from "@/types/pipeline"

/**
 * Conjunto de columnas iniciales para poblar el tablero de pipeline.
 */
export const initialColumns: Column[] = [
  {
    id: "contacto_inicial",
    title: "Contacto Inicial",
    color: "#94A3B8",
    opportunities: [
      {
        id: "1",
        clientName: "Ana Martínez",
        serviceName: "Compra de propiedades",
        agent: "Juan Pérez",
        value: 220000,
        probability: 10,
        closeDate: "2024-02-15",
        phone: "+51987654321",
        email: "ana@email.com",
      },
      {
        id: "2",
        clientName: "Carlos Ruiz",
        serviceName: "Venta de propiedades",
        agent: "María García",
        value: 450000,
        probability: 15,
        closeDate: "2024-02-20",
        phone: "+51987654322",
        email: "carlos@email.com",
      },
    ],
  },
  {
    id: "calificacion",
    title: "Calificación",
    color: "#FCBA00",
    opportunities: [
      {
        id: "3",
        clientName: "Luis Torres",
        serviceName: "Crédito MiVivienda",
        agent: "Carlos López",
        value: 280000,
        probability: 25,
        closeDate: "2024-02-10",
        phone: "+51987654323",
        email: "luis@email.com",
      },
    ],
  },
  {
    id: "presentacion",
    title: "Presentación",
    color: "#F59E0B",
    opportunities: [
      {
        id: "4",
        clientName: "Patricia Silva",
        serviceName: "Programa Techo Propio",
        agent: "Juan Pérez",
        value: 220000,
        probability: 40,
        closeDate: "2024-01-30",
        phone: "+51987654324",
        email: "patricia@email.com",
      },
    ],
  },
  {
    id: "negociacion",
    title: "Negociación",
    color: "#EF4444",
    opportunities: [
      {
        id: "5",
        clientName: "Roberto Díaz",
        serviceName: "Venta de propiedades",
        agent: "María García",
        value: 450000,
        probability: 60,
        closeDate: "2024-01-25",
        phone: "+51987654325",
        email: "roberto@email.com",
      },
    ],
  },
  {
    id: "propuesta",
    title: "Propuesta",
    color: "#8B5CF6",
    opportunities: [
      {
        id: "6",
        clientName: "Elena Vega",
        serviceName: "Compra de propiedades",
        agent: "Carlos López",
        value: 280000,
        probability: 80,
        closeDate: "2024-01-20",
        phone: "+51987654326",
        email: "elena@email.com",
      },
    ],
  },
  {
    id: "cierre_ganado",
    title: "Cierre Ganado",
    color: "#10B981",
    opportunities: [
      {
        id: "7",
        clientName: "Miguel Santos",
        serviceName: "Crédito MiVivienda",
        agent: "Juan Pérez",
        value: 220000,
        probability: 100,
        closeDate: "2024-01-15",
        phone: "+51987654327",
        email: "miguel@email.com",
      },
    ],
  },
]
