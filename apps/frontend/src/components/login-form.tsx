import { useState, useEffect } from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

/**
 * Propiedades del componente LoginForm.
 * @interface LoginFormProps
 */
interface LoginFormProps extends React.ComponentProps<"div"> {
  /**
   * Callback invocado tras un inicio de sesión o registro exitoso.
   * @param token El JWT retornado por la API.
   * @param role El rol del usuario autenticado.
   */
  onLoginSuccess: (token: string, role: string) => void
}

/**
 * Componente interactivo para Autenticación (Login y Registro).
 * 
 * Gestiona formularios, estados de carga y validaciones.
 * Interactúa con la configuración global (`/api/settings/registration`)
 * para habilitar o deshabilitar la pestaña de registro según esté configurado.
 * 
 * @param {LoginFormProps} props - Callbacks y atributos nativos de contenedor.
 * @returns {JSX.Element} El formulario de autenticación.
 */
export function LoginForm({ className, onLoginSuccess, ...props }: LoginFormProps) {
  const [activeTab, setActiveTab] = useState("login")
  const [registrationOpen, setRegistrationOpen] = useState(false)
  
  // Login State
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Register State
  const [regEmail, setRegEmail] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [regFirstName, setRegFirstName] = useState("")
  const [regLastName, setRegLastName] = useState("")
  const [regSemester, setRegSemester] = useState("")
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState("")

  useEffect(() => {
    // Check if registration is open
    fetch("http://localhost:3000/api/settings/registration")
      .then(res => res.json())
      .then(data => {
        setRegistrationOpen(data.isOpen)
      })
      .catch(() => console.error("Could not fetch settings"))
  }, [])

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Credenciales inválidas")
        return
      }

      localStorage.setItem("sicba_token", data.token)
      localStorage.setItem("sicba_role", data.role)
      localStorage.setItem("sicba_email", data.email)
      localStorage.setItem("sicba_name", data.name)
      onLoginSuccess(data.token, data.role)
    } catch {
      setError("No se pudo conectar con el servidor.")
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegLoading(true)
    setRegError("")

    try {
      const res = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
          firstName: regFirstName,
          lastName: regLastName,
          semester: regSemester,
          role: "ALUMNO"
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setRegError(data.error || "Error al registrar")
        return
      }

      toast.success("Cuenta creada exitosamente. Ahora puedes iniciar sesión.")
      setActiveTab("login")
      setEmail(regEmail) // Pre-fill login email
    } catch {
      setRegError("No se pudo conectar con el servidor.")
    } finally {
      setRegLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0 shadow-xl">
        <CardContent className="grid p-0 md:grid-cols-2">
          
          <div className="p-6 md:p-10 flex flex-col justify-center">
            <div className="flex flex-col items-center gap-2 text-center mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">S</div>
                <span className="text-xl font-bold tracking-tight">SICBA</span>
              </div>
              <p className="text-balance text-sm text-muted-foreground">Sistema Integral de Ciencias Básicas</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {registrationOpen && (
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                  <TabsTrigger value="register">Crear Cuenta</TabsTrigger>
                </TabsList>
              )}
              
              <TabsContent value="login">
                <form onSubmit={handleLoginSubmit}>
                  <FieldGroup>
                    {error && <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">{error}</div>}
                    
                    <Field>
                      <FieldLabel htmlFor="email">Correo Electrónico</FieldLabel>
                      <Input id="email" type="email" placeholder="usuario@dominio.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                    </Field>
                    
                    <Field>
                      <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                      <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
                    </Field>
                    
                    <Field>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2Icon className="animate-spin mr-2" size={16} />}
                        {loading ? "Verificando..." : "Ingresar al Sistema"}
                      </Button>
                    </Field>
                    <FieldDescription className="text-center text-xs mt-2">Acceso exclusivo para personal autorizado y alumnos inscritos.</FieldDescription>
                  </FieldGroup>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegisterSubmit}>
                  <FieldGroup>
                    {regError && <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">{regError}</div>}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel htmlFor="firstName">Nombre</FieldLabel>
                        <Input id="firstName" required value={regFirstName} onChange={(e) => setRegFirstName(e.target.value)} disabled={regLoading} />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="lastName">Apellidos</FieldLabel>
                        <Input id="lastName" required value={regLastName} onChange={(e) => setRegLastName(e.target.value)} disabled={regLoading} />
                      </Field>
                    </div>

                    <Field>
                      <FieldLabel htmlFor="regEmail">Correo Institucional</FieldLabel>
                      <Input id="regEmail" type="email" placeholder="usuario@dominio.edu.mx" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} disabled={regLoading} />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="regSemester">Semestre Actual</FieldLabel>
                      <Select value={regSemester} onValueChange={(val) => setRegSemester(val || '')} required disabled={regLoading}>
                        <SelectTrigger id="regSemester">
                          <SelectValue placeholder="Selecciona un semestre" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                            <SelectItem key={num} value={num.toString()}>{num}º Semestre</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    
                    <Field>
                      <FieldLabel htmlFor="regPassword">Contraseña</FieldLabel>
                      <Input id="regPassword" type="password" required minLength={6} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} disabled={regLoading} />
                    </Field>
                    
                    <Field>
                      <Button type="submit" className="w-full mt-2" disabled={regLoading || !regSemester}>
                        {regLoading && <Loader2Icon className="animate-spin mr-2" size={16} />}
                        {regLoading ? "Registrando..." : "Crear mi Cuenta"}
                      </Button>
                    </Field>
                  </FieldGroup>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          <div className="relative hidden bg-muted md:block">
            <img src="/login-bg.jpg" alt="SICBA" className="absolute inset-0 h-full w-full object-cover" />
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
