import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * Componente ThemeToggle para alternar el tema visual de la aplicación.
 *
 * Utiliza `resolvedTheme` (no `theme`) para evitar el bug de primer clic donde
 * `theme` puede ser `undefined` durante la hidratación del cliente (SSR/CSR mismatch).
 * Implementa la View Transitions API para el efecto de onda expansiva.
 *
 * @returns {JSX.Element} Botón animado para cambiar el modo de color.
 */
export function ThemeToggle() {
  // resolvedTheme siempre devuelve 'light' o 'dark' incluso antes de la hidratación
  const { resolvedTheme, setTheme } = useTheme()

  // Montar-gate: evitar flash de iconos incorrecto antes de que next-themes hidrate
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const toggleTheme = (e: React.MouseEvent) => {
    const isDark = resolvedTheme === 'dark'
    const newTheme = isDark ? 'light' : 'dark'

    // Fallback sin animación para navegadores sin soporte
    if (!document.startViewTransition) {
      setTheme(newTheme)
      return
    }

    const x = e.clientX
    const y = e.clientY
    const endRadius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y)
    )

    const transition = document.startViewTransition(() => {
      setTheme(newTheme)
    })

    // La onda "nace" del cursor y se expande hasta cubrir toda la pantalla
    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ]
      document.documentElement.animate(
        { clipPath: isDark ? [...clipPath].reverse() : clipPath },
        {
          duration: 420,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: isDark
            ? '::view-transition-old(root)'
            : '::view-transition-new(root)',
        }
      )
    })
  }

  // Placeholder mientras hidrata para evitar CLS
  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="w-full justify-start gap-3 opacity-0" disabled>
        <div className="size-4" />
        <span>Modo oscuro</span>
      </Button>
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="w-full justify-start gap-3 relative overflow-hidden group hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {/* Contenedor del ícono con animación de rotación y escala */}
      <div className="relative flex items-center justify-center size-5 shrink-0">
        <SunIcon
          className={`absolute size-5 transition-all duration-300 text-amber-500
            ${isDark ? '-rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}
        />
        <MoonIcon
          className={`absolute size-4 transition-all duration-300 text-indigo-400
            ${isDark ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'}`}
        />
      </div>

      {/* Texto con animación suave de fade */}
      <span
        key={isDark ? 'dark' : 'light'}
        className="font-medium text-muted-foreground group-hover:text-foreground transition-colors animate-in fade-in duration-200"
      >
        {isDark ? 'Modo claro' : 'Modo oscuro'}
      </span>

      {/* Ripple de fondo al hacer hover */}
      <span className="absolute inset-0 rounded-md bg-primary/0 group-active:bg-primary/10 transition-colors duration-150" />
    </Button>
  )
}

/**
 * Versión compacta del ThemeToggle: solo ícono, sin texto.
 * Diseñada para colocarse en el navbar superior derecho siguiendo el estándar
 * de la industria (GitHub, Vercel, Linear). Incluye tooltip accesible.
 *
 * @returns {JSX.Element} Botón ícono compacto con animación de View Transitions.
 */
export function ThemeToggleCompact() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const toggleTheme = (e: React.MouseEvent) => {
    const isDark = resolvedTheme === 'dark'
    const newTheme = isDark ? 'light' : 'dark'

    if (!document.startViewTransition) {
      setTheme(newTheme)
      return
    }

    const x = e.clientX
    const y = e.clientY
    const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))

    const transition = document.startViewTransition(() => { setTheme(newTheme) })
    transition.ready.then(() => {
      const clipPath = [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`]
      document.documentElement.animate(
        { clipPath: isDark ? [...clipPath].reverse() : clipPath },
        {
          duration: 420,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: isDark ? '::view-transition-old(root)' : '::view-transition-new(root)',
        }
      )
    })
  }

  if (!mounted) return <div className="size-8" />

  const isDark = resolvedTheme === 'dark'

  return (
    <Tooltip>
      <TooltipTrigger>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="size-8 relative overflow-hidden"
          aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          <SunIcon
            className={`absolute size-4 transition-all duration-300 text-amber-500
              ${isDark ? '-rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}
          />
          <MoonIcon
            className={`absolute size-4 transition-all duration-300 text-indigo-400
              ${isDark ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'}`}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {isDark ? 'Modo claro' : 'Modo oscuro'}
      </TooltipContent>
    </Tooltip>
  )
}
