"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronDownIcon } from "lucide-react"

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

  // Extrae la hora actual del valor o usa un default
  const timeValue = value
    ? format(value, "HH:mm")
    : "08:00"

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) { onChange(undefined); setOpen(false); return }

    // Conservar la hora que ya tenía el campo de tiempo
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
        {/* Selector de fecha */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button
                id={id}
                variant="outline"
                className="w-36 justify-between font-normal"
              >
                {value ? format(value, "dd/MM/yyyy") : "Seleccionar"}
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
            }
          />
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
          className="w-28 appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          value={timeValue}
          onChange={handleTimeChange}
        />
      </div>
    </div>
  )
}
