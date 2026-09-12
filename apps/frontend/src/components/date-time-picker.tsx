import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateTimePickerProps {
  id?: string
  label: string
  value?: Date
  onChange: (date: Date | undefined) => void
}

export function DateTimePicker({ id, label, value, onChange }: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)

  const timeValue = value ? format(value, "HH:mm") : "08:00"

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) { onChange(undefined); setOpen(false); return }
    const [hours, minutes] = timeValue.split(":").map(Number)
    const combined = new Date(day)
    combined.setHours(hours ?? 0, minutes ?? 0, 0, 0)
    onChange(combined)
    setOpen(false)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = e.target.value.split(":").map(Number)
    const base = value ? new Date(value) : new Date()
    base.setHours(hours ?? 0, minutes ?? 0, 0, 0)
    onChange(base)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        {/* Selector de fecha con asChild (patrón estándar shadcn) */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              variant="outline"
              className={cn(
                "w-36 justify-start gap-2 font-normal",
                !value && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="size-4 shrink-0" />
              {value ? format(value, "dd/MM/yyyy") : "Seleccionar"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={value}
              captionLayout="dropdown"
              defaultMonth={value ?? new Date()}
              locale={es}
              onSelect={handleDaySelect}
            />
          </PopoverContent>
        </Popover>

        {/* Selector de hora */}
        <Input
          type="time"
          className="w-28 bg-background"
          value={timeValue}
          onChange={handleTimeChange}
        />
      </div>
    </div>
  )
}
