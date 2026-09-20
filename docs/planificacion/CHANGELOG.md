# CHANGELOG — SICBA

Todos los cambios relevantes del proyecto quedan registrados aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [Sábado 6 - Noche] — 2026-09-19 ✅ COMPLETO

### Añadido (Edición Avanzada y UI/UX Premium)
- **Backend `PATCH /api/exams/:id`**: Nuevo endpoint para editar un examen con validación por estado:
    - **Borrador**: Se permite editar título, preguntas, tiempo límite y fechas.
    - **Publicado**: Solo se permite editar fechas.
    - **Finalizado o en progreso**: Bloqueado (`409 Conflict`).
- **Badge de Notificaciones**: En el sidebar de alumnos (`NavMain`), ahora aparece un contador con los exámenes disponibles en vivo que el alumno aún no entrega.

### Modificado (Refactor UX)
- **Modal de Resultados (Premium)**: Rediseño total del modal de admin (`ExamManager.tsx`). Ahora incluye stats rápidas superiores, tabla con avatares generados, insignias 🥇🥈🥉 para el top 3, indicadores semánticos de porcentaje y diseño *glassmorphism*.
- **ThemeToggleCompact**: El botón para cambiar de modo claro/oscuro fue movido fuera del sidebar al header principal (navbar), simplificado a un ícono (`size-8`) con un tooltip accesible.
- **ThemeToggle Fix**: Se reemplazó el uso de `theme` por `resolvedTheme` (`next-themes`) para eliminar un bug donde el primer click del toggle fallaba por mismatch de hidratación. Además, las transiciones tienen mejores animaciones (`rotate`, `scale`, `fade`).
- **Sidebar**: Eliminado el botón duplicado de "Cerrar sesión" en el header principal, conservando exclusivamente el del perfil inferior del sidebar para mayor limpieza visual.

### Correcciones (Bugfixes)
- **Filtro del Badge de Exámenes**: Se corrigió la lógica en `App.tsx` para que el contador rojo notifique también sobre los exámenes en estado "Próximamente" (futuros), y no solo los "En vivo".
- **Color de Notificación en Sidebar**: Se modificó la clase de color del badge a `bg-destructive text-destructive-foreground` para asegurar que destaque como una "burbuja roja" real y mantenga excelente contraste y legibilidad tanto en modo claro como en oscuro.
- **Sincronización de Navegación (SPA)**: Se enlazó el estado de navegación `currentPage` con el **hash de la URL (`window.location.hash`)**. Ahora, si el usuario recarga la página manualmente (`F5`), el sistema recuerda la vista en la que estaba y lo redirige automáticamente sin devolverlo al Dashboard.
- **Refresco de Estado en Tiempo Real (Polling)**: Se añadió un intervalo de `polling` cada 15 segundos en `App.tsx` para recalcular el número de exámenes pendientes (`refreshExamBadge`). Así, cuando un alumno termina un examen y vuelve a la lista, el badge se apaga automáticamente sin intervención.
- **Actualización Manual y UI Admin**: Se agregó un botón **"Actualizar"** explícito (`RefreshCwIcon`) en el panel de Exámenes para forzar la recarga manual de la tabla sin refrescar la app completa.
- **Modal de Resultados Responsivo**: Se modificaron las *stats* rápidas del modal de Resultados (`ExamManager.tsx`) para usar `grid-cols-2 sm:grid-cols-4` en lugar de `flex`. Esto previene que el texto se rompa o genere _scroll_ horizontal incómodo en pantallas pequeñas al mostrar los porcentajes.

---

## [Sábado 6 - Tarde] — 2026-09-19 ✅ COMPLETO

### Añadido (Resultados Interactivos y Panel de Alumnos)
- `POST /api/exams/:id/submit`: Ahora devuelve un `breakdown` completo (preguntas, opciones, respuesta seleccionada por el alumno, respuesta correcta, y explicación si la hay). Solo se revela después de entregar (SUBMITTED).
- `GET /api/exams`: Para el alumno, ahora incluye su propia participación (status y score) directamente en la respuesta del listado de exámenes.
- `GET /api/exams/:id/results`: Nuevo endpoint para el admin que devuelve el ranking de participaciones (alumno, estado, puntaje, tiempo) de un examen en particular.
- `POST /api/exams/:id/answer`: Se añadió una validación de seguridad extra: verifica que el `questionId` enviado realmente pertenece al `examId` en curso, evitando que usuarios técnicos inyecten respuestas a otras preguntas.
- `GET /api/users`: Nuevo endpoint (con `?role=ALUMNO`) protegido para ADMIN/MAESTRO para listar los usuarios del sistema.

- **ExamResult.tsx**: Reescrito completamente. Ahora muestra una tarjeta principal con el score, un resumen numérico y un desglose pregunta por pregunta interactivo (acordeones) donde el alumno ve exactamente qué respondió, qué era lo correcto, colores (verde/rojo) y la explicación si existe, todo con soporte LaTeX.
- **ExamManager.tsx**:
    - Para alumnos: Nueva columna "Mi Puntaje" que muestra su calificación si ya entregó, y el botón cambia de "Ingresar" a "Ver Resultados".
    - Para admin: Nuevo botón "Resultados" (icono de gráfica) que abre un modal con la tabla de clasificación de todos los alumnos que han participado en ese examen (ranking, estado, tiempo, puntaje).
- **StudentsPage.tsx**: Nueva página con la tabla de alumnos (nombre, email, carrera, semestre, fecha de registro) conectada al endpoint `/api/users`. Conectada en `App.tsx` en la ruta 'students'.

### Pulido UI/UX Avanzado (Modo Oscuro)
- **View Transitions API**: Implementación de una animación de "onda expansiva" (clip-path radial a 60 FPS) en el `ThemeToggle` al cambiar entre modo claro y oscuro.
- **Auditoría de Contrastes**: Refactorización de todos los colores quemados (`bg-green-50`, `bg-red-50`) utilizando la opacidad nativa del framework (`dark:bg-green-950/30`) para evitar deslumbramiento en modo oscuro (Cumplimiento de accesibilidad AAA).
- **Documentación Extrema**: Adición masiva de bloques `JSDoc` profesionales a más de 40 componentes (`src/components/` y `src/components/ui/`) para detallar la arquitectura y el propósito de cada hook y componente React.

---

## [Sábado 5] — 2026-09-18 ✅ COMPLETO

### Añadido

#### Backend (`apps/backend/src/routes/exams.ts`)
- **`PATCH /api/exams/:id/publish`** — Nuevo endpoint para activar/desactivar un examen. Bloquea la operación con `409 Conflict` si hay alumnos en estado `IN_PROGRESS`.
- **`POST /api/exams`** — Ahora fuerza `isActive: false` al crear; los exámenes nacen como **Borradores** y deben publicarse explícitamente.
- **`POST /api/exams/:id/start`** — Devuelve el mapa `savedAnswers` (questionId→selectedOptionId) para permitir reanudar el examen después de cerrar el navegador. Responde `409` con `{ alreadySubmitted: true }` si el alumno ya entregó.
- **`DELETE /api/exams/:id`** — Ahora protegido: responde `409 Conflict` si hay alumnos respondiendo activamente.

#### Frontend — General
- **`next-themes` (v0.4.6)** instalado.
- **`App.tsx`**: Envuelto en `ThemeProvider` de next-themes; `<Toaster richColors />` montado globalmente; botón "Salir" removido del header de ExamRoom.
- **`ThemeToggle`**: Nuevo componente en el footer del sidebar (toggle sol/luna para modo oscuro/claro).
- **`app-sidebar.tsx`**: ThemeToggle integrado; menú filtrado por rol — el rol `ALUMNO` solo ve *Dashboard* y *Exámenes*.

#### `ExamRoom.tsx`
- **Anti-cierre (`beforeunload`)**: Listener que muestra la advertencia nativa del browser si el alumno intenta cerrar la pestaña durante el examen.
- **Reanudación automática**: Carga `savedAnswers` desde el servidor al ingresar y pre-puebla el estado de respuestas; muestra un toast informativo.
- **Pantalla de carga mejorada**: Icono de escudo animado + skeletons de preguntas.
- **Pantalla "ya entregado"**: Estado específico con checkmark verde y botón "Volver a Exámenes" cuando el alumno ya entregó.
- **Toasts de tiempo**: Advertencia toast a los 2 minutos y al minuto restante.
- **Submit**: Limpia el listener `beforeunload` al entregar para no bloquear la navegación post-examen.

#### `ExamManager.tsx`
- **Flujo Borrador → Publicar**: Botón "Publicar"/"Despublicar" por fila en la tabla de exámenes.
- **Badge "Borrador"**: Indicador visual para exámenes inactivos.
- **`AlertDialog` shadcn**: Diálogo de confirmación para eliminar examen (reemplaza `confirm()` nativo del browser).
- **Toasts Sonner**: Notificaciones `toast()` para todas las acciones — crear, publicar, despublicar, eliminar y errores.
- **Nombres reales en checklist**: El checklist de reactivos muestra el texto de la pregunta en lugar del UUID.
- **`DateTimePicker`**: Campos de fecha y hora apilados en lugar de `grid-cols-2` para evitar overflow del input de hora.

---

## [Sábado 3] — 2026-09-05 ✅ COMPLETO

### Añadido
- **Frontend profesional end-to-end** usando bloques oficiales de `shadcn/ui`:
  - `login-04`: Pantalla de Login split-screen con imagen de fondo, formulario funcional conectado al backend real.
  - `dashboard-01`: Panel con Sidebar colapsable, header sticky, navegación entre páginas.
- **33 nuevos componentes** de shadcn/ui instalados: `Sidebar`, `Table`, `Badge`, `Input`, `Avatar`, `Tooltip`, `Breadcrumb`, `Sheet`, `Drawer`, `Sonner`, `Chart`, `DropdownMenu`, etc.
- **Banco de Reactivos** con:
  - Tabla de preguntas con renderizado KaTeX (fórmulas LaTeX en tiempo real).
  - Zona de **Drag & Drop** para Carga Masiva de archivos `.xlsx` y `.csv`.
  - Botones de acción por fila (Ver, Editar, Eliminar).
  - Badges de dificultad (Básico / Medio / Avanzado).
- **Panel Principal (Dashboard):** 4 tarjetas de estadísticas con íconos y tendencias.
- **Sesión Única Activa (Anti-Fraude):** Al hacer login, el sistema destruye cualquier sesión anterior en la tabla `Session` de PostgreSQL. El middleware `requireAuth` verifica cada petición contra la BD.
- **Carga Masiva de Reactivos:** Endpoint `POST /api/questions/bulk` con `multer` (en memoria) + `xlsx` + `prisma.$transaction` para inserción atómica.
- **NavUser** adaptado al español con acceso a "Cerrar Sesión" desde el Dropdown del Sidebar.
- **Seed de base de datos** ejecutado con 3 usuarios de prueba.
- **`react-router-dom`** instalado para gestión de rutas futuras.

### Modificado
- `apps/backend/src/routes/auth.ts`: Login ahora registra y revoca sesiones en la tabla `Session`.
- `apps/backend/src/middlewares/auth.middleware.ts`: Ahora es `async` y valida el token contra la BD (sesión única).
- `apps/backend/src/routes/questions.ts`: Añadido endpoint `POST /api/questions/bulk`.
- `apps/frontend/src/App.tsx`: Routing condicional Login → Dashboard con JWT en localStorage.
- `apps/frontend/src/components/app-sidebar.tsx`: Reescrito con navegación SICBA (Banco, Exámenes, Alumnos, Reportes).
- `apps/frontend/src/components/nav-main.tsx`: Soporte para `onClick` e `isActive`.
- `apps/frontend/src/components/nav-user.tsx`: Traducido al español, iniciales dinámicas, `onLogout` funcional.
- `apps/frontend/tsconfig.json`: Añadido `ignoreDeprecations: "6.0"` para TS 7.

### Corregido
- Error fatal `ts-node` en Node.js 24: reemplazado por `tsx watch` (Esbuild).
- Puerto del backend corregido de `3001` a `3000` en toda la documentación.

---

## [Sábado 2] — 2026-08-30 ✅ COMPLETO

### Añadido
- Módulo de autenticación custom: `POST /api/auth/register` y `POST /api/auth/login` con JWT + bcryptjs.
- Middleware `requireAuth` para proteger rutas privadas.
- CRUD de Reactivos: `GET /api/questions` y `POST /api/questions` (protegidos).
- Vista `QuestionsAdmin.tsx` con demostración de KaTeX.
- Migración a **Tailwind CSS v4** nativo con `@tailwindcss/vite` (eliminación de PostCSS y Autoprefixer).
- Componentes base de shadcn/ui: `Card`, `Button`.
- Integración de **KaTeX** (`react-latex-next`) para fórmulas matemáticas.

### Modificado
- `apps/frontend/src/index.css`: Directiva `@theme inline` para tokens de diseño de shadcn.
- `apps/frontend/vite.config.ts`: Plugin `@tailwindcss/vite`.
- `apps/backend/package.json`: `ts-node` → `tsx watch`.

### Eliminado
- `postcss.config.js` y dependencias `postcss`, `autoprefixer`.
- `apps/frontend/src/App.css` (plantilla obsoleta de Vite).

---

## [Sábado 1] — 2026-08-22 ✅ COMPLETO

### Añadido
- Inicialización del **Monorepo** con `pnpm workspaces`.
- `apps/backend`: Express + TypeScript + Helmet + CORS + Compression.
- `packages/database`: Prisma ORM con `schema.prisma` completo.
  - Modelos: `User`, `Profile`, `Subject`, `Question`, `Option`, `Exam`, `ExamQuestion`, `Participation`, `Answer`, `Session`.
  - Enums: `Role`, `ParticipationStatus`.
  - Soft-deletes y comentarios TSDoc en cada modelo.
- `apps/frontend`: Vite + React + TypeScript base.
- Conexión a **Supabase** (PostgreSQL) con Connection Pooling (puerto 6543) y URL directa (puerto 5432).
- Habilitación de **Row Level Security (RLS)** en todas las tablas de Supabase.
- Seed inicial y script `api.http` para pruebas rápidas con REST Client.
- Configuración de `.gitignore` para excluir `docs/`, `.env`, y herramientas de IA.

---

## [Sábado 4] — 2026-09-12 ✅ COMPLETO

### Añadido
- **Motor de Exámenes completo** — `apps/backend/src/routes/exams.ts`:
  - `POST /api/exams`: Admin/Maestro crea examen con lista de preguntas, tiempo límite y fechas.
  - `GET /api/exams`: Lista de exámenes (alumnos ven solo activos, admin ve todos).
  - `POST /api/exams/:id/start`: Alumno inicia examen — genera `Participation`, aplica shuffle **Fisher-Yates** a preguntas y opciones. `isCorrect` nunca se revela al cliente.
  - `POST /api/exams/:id/answer`: Registra respuesta en tiempo real (upsert). Valida tiempo en servidor.
  - `POST /api/exams/:id/submit`: Califica automáticamente server-side. Score = (correctas/total)×100.
- **`ExamManager.tsx`** (Admin): Tabla de exámenes con badges de estado (En vivo/Próximo/Finalizado) y formulario modal para crear exámenes.
- **`ExamRoom.tsx`** (Alumno): Sala de examen en pantalla completa con:
  - Temporizador regresivo (rojo parpadeante < 60s, naranja < 2min).
  - Navegación entre preguntas con indicadores de respondida/activa.
  - Opciones marcadas A/B/C/D con feedback visual al seleccionar.
  - Envío de respuesta al backend en tiempo real al seleccionar.
  - Submit automático al expirar el tiempo.
  - Renderizado KaTeX en preguntas y opciones.
  - Confirmación antes de entregar con `AlertDialog`.
- **`ExamResult.tsx`**: Pantalla de resultado con puntaje, desglose correcto/incorrecto y nivel de desempeño.
- Nuevos componentes shadcn: `Progress`, `AlertDialog`, `Dialog`.
- `App.tsx` refactorizado: 3 flujos independientes (Login, ExamRoom sin sidebar, Dashboard normal).

### Algoritmo Anti-Fraude
- `isCorrect` omitido en la respuesta del endpoint `/start` — imposible hacer trampa inspeccionando la red.
- Score calculado 100% server-side — el cliente no puede falsificarlo.
- Validación de `endTime` en cada respuesta — respuestas tardías son rechazadas.
- Idempotencia en `/start` — doble clic o reconexión devuelve la misma `Participation`.

### Añadido (actualización post-Sábado 4)
- **`DateTimePicker`** componente propio combinando `Calendar` + `Popover` + `Input[type=time]` de shadcn/ui con locale español.
- **`/api/subjects`** — Nuevo endpoint GET/POST para listar y crear materias.
- **`ExamManager`** renovado: Select de materias desde API, checklist visual de preguntas por materia (ya no se necesitan UUIDs manuales), CopyId para copiar con un clic.
- **Seed completo** — 3 materias (Cálculo, Álgebra, Física), 7 reactivos con LaTeX real y opciones con `isCorrect` correctamente marcadas. IDs impresos automáticamente al correrlo.
- Nuevos componentes shadcn: `Calendar`, `Popover`, `Select`, `Textarea`.
