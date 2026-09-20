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

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="w-full justify-start gap-2"
      title="Cambiar tema"
    >
      <SunIcon className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <MoonIcon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="dark:hidden">Modo oscuro</span>
      <span className="hidden dark:inline">Modo claro</span>
    </Button>
  )
}
