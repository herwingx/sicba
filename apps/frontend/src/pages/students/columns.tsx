"use client"

import { createColumnHelper } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type DataTableFeatures } from "./data-table-features"

export type Student = {
  id: string
  email: string
  role: string
  firstName: string | null
  lastName: string | null
  career: string | null
  semester: number | null
  createdAt: string
}

const columnHelper = createColumnHelper<DataTableFeatures, Student>()

export const columns = columnHelper.columns([
  columnHelper.display({
    id: "index",
    header: "#",
    cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.index + 1}</span>,
  }),
  columnHelper.accessor(row => row.firstName && row.lastName ? `${row.firstName} ${row.lastName}` : null, {
    id: "name",
    header: ({ column }) => (
      <Button variant="ghost" className="-ml-4 h-8" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Nombre
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ getValue }) => {
      const name = getValue()
      return name ? <span className="font-medium">{name as string}</span> : <span className="text-muted-foreground italic">Sin perfil</span>
    },
  }),
  columnHelper.accessor("email", {
    header: ({ column }) => (
      <Button variant="ghost" className="-ml-4 h-8" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Email
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.getValue("email")}</span>,
  }),
  columnHelper.accessor("career", {
    header: "Carrera",
    cell: ({ row }) => {
      const career = row.getValue("career")
      return career ? <Badge variant="outline">{career as string}</Badge> : <span className="text-muted-foreground text-sm">—</span>
    },
  }),
  columnHelper.accessor("semester", {
    header: () => <div className="text-center">Semestre</div>,
    cell: ({ row }) => {
      const sem = row.getValue("semester") as number | null
      return <div className="text-center text-sm">{sem !== null ? sem : <span className="text-muted-foreground">—</span>}</div>
    },
  }),
  columnHelper.accessor("createdAt", {
    header: "Registrado",
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt") as string)
      return <div className="text-sm text-muted-foreground">{date.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
    },
  }),
])
