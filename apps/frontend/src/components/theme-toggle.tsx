import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

/**
 * Componente ThemeToggle para alternar el tema visual de la aplicación.
 * Utiliza el hook `useTheme` de `next-themes` para interactuar con el `ThemeProvider` global
 * y mutar el estado del tema (claro/oscuro), inyectando las clases correspondientes en el DOM.
 * 
 * @returns {JSX.Element} Botón para cambiar el modo de color.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = (e: React.MouseEvent) => {
    const isDark = theme === 'dark'
    const newTheme = isDark ? 'light' : 'dark'

    // Cambio instantáneo si no hay soporte
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

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ]
      document.documentElement.animate(
        {
          clipPath: isDark ? [...clipPath].reverse() : clipPath,
        },
        {
          duration: 400,
          easing: 'ease-in-out',
          pseudoElement: isDark
            ? '::view-transition-old(root)'
            : '::view-transition-new(root)',
        }
      )
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="w-full justify-start gap-3 relative overflow-hidden group hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
      title="Cambiar tema"
    >
      <div className="relative flex items-center justify-center size-4">
        <SunIcon className="absolute size-5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 text-amber-500" />
        <MoonIcon className="absolute size-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-indigo-400" />
      </div>
      <span className="dark:hidden font-medium text-muted-foreground group-hover:text-foreground transition-colors">Modo oscuro</span>
      <span className="hidden dark:inline font-medium text-muted-foreground group-hover:text-foreground transition-colors">Modo claro</span>
    </Button>
  )
}
