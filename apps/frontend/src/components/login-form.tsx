import { useState } from "react"
import { cn } from "cn"
import { Loader2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

/**
 * Propiedades para el formulario de inicio de sesión.
 * @interface LoginFormProps
 * @extends React.ComponentProps<"div">
 */
interface LoginFormProps extends React.ComponentProps<"div"> {
  onLoginSuccess: (token: string, role: string) => void
}

/**
 * Componente LoginForm para la autenticación de usuarios.
 * Maneja el estado local del formulario, las credenciales, el control del estado de error y carga,
 * y realiza la petición (fetch) al endpoint `/api/auth/login` para obtener el JWT y rol del usuario.
 *
 * @param {LoginFormProps} props - Callbacks y propiedades adicionales.
 * @returns {JSX.Element} Formulario de inicio de sesión.
 */
export function LoginForm({ className, onLoginSuccess, ...props }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Activa el estado de carga para deshabilitar interacciones
    setLoading(true)
    // Limpia el estado de error previo
    setError("")

    try {
      // Realiza el fetch al endpoint de autenticación mandando las credenciales
      const res = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Control de estado de error en caso de credenciales inválidas o fallo en el servidor
        setError(data.error || "Credenciales inválidas")
        return
      }

      // Almacena el token JWT y el rol en localStorage para la persistencia de la sesión
      localStorage.setItem("sicba_token", data.token)
      localStorage.setItem("sicba_role", data.role)
      localStorage.setItem("sicba_email", data.email)
      localStorage.setItem("sicba_name", data.name)
      onLoginSuccess(data.token, data.role)
    } catch {
      setError("No se pudo conectar con el servidor. Verifica que el backend esté activo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0 shadow-xl">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-10" onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                    S
                  </div>
                  <span className="text-xl font-bold tracking-tight">SICBA</span>
                </div>
                <h1 className="text-2xl font-bold">Iniciar Sesión</h1>
                <p className="text-balance text-sm text-muted-foreground">
                  Sistema Integral de Ciencias Básicas
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Field>
                <FieldLabel htmlFor="email">Correo Electrónico</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@escuela.edu.mx"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </Field>

              <Field>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
                  {loading ? "Verificando..." : "Ingresar al Sistema"}
                </Button>
              </Field>

              <FieldDescription className="text-center text-xs">
                Acceso exclusivo para personal autorizado del plantel.
              </FieldDescription>
            </FieldGroup>
          </form>

          <div className="relative hidden bg-muted md:block">
            <img
              src="/login-bg.jpg"
              alt="SICBA — Sistema Integral de Ciencias Básicas"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-primary/10 flex flex-col items-center justify-end p-8 text-center">
              <p className="text-sm font-medium text-primary/80 dark:text-primary/90 backdrop-blur-md bg-white/60 dark:bg-black/50 rounded-lg px-4 py-2">
                "La preparación académica rigurosa es la base del éxito profesional."
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
