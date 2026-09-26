# 🗺️ Mapa del Proyecto SICBA (Uso Interno Exclusivo)

Este documento es una brújula para que nunca te pierdas en el proyecto. **Git ignora este archivo**, así que el profesor o jurado nunca lo verá. Es solo para ti.

---

## 📁 Estructura Principal del Monorepo

SICBA utiliza **pnpm workspaces**, lo que significa que es un "Monorepo". En lugar de tener un repositorio para el frontend y otro para el backend, ambos viven juntos aquí, pero aislados en sus propias carpetas dentro de `apps/` y `packages/`.

### 1. `apps/` (Aplicaciones Ejecutables)
Aquí vive el código que realmente "se enciende" y se expone a internet.

*   **`apps/backend/`** 👉 **El Servidor (Cerebro)**
    *   **Tecnología:** Node.js (v24), Express, TypeScript (ejecutado hiperrápido con `tsx watch`, reemplazando el deprecado `ts-node`).
    *   **¿Qué hace?:** Recibe las peticiones del frontend, procesa la lógica pesada (ej. verificar contraseñas, generar tokens JWT) y habla con la base de datos.
    *   **Archivos clave:**
        *   `src/index.ts`: El punto de entrada, donde el servidor se levanta y escucha en el puerto 3000.
        *   `src/routes/auth.ts`: Login y registro con JWT + bcryptjs. Control de Sesión Única Activa.
        *   `src/routes/questions.ts`: CRUD del Banco de Reactivos, Exportación del banco a `.xlsx` (`GET /api/questions/export`), y carga masiva `.xlsx` hiper-optimizada con ejecución en lotes (batch) para prevenir bloqueos por timeout de PgBouncer.
        *   `src/routes/exams.ts`: **Motor de Exámenes** — crear (Borrador, `isActive:false`), publicar/despublicar (`PATCH /publish`), listar, inscribirse con código (`POST /enroll`), iniciar con reanudación (`savedAnswers`), registrar respuestas, calificar (`POST /submit`), consulta de resultado y desglose propio (`GET /api/exams/:id/my-result`), ranking admin (`GET /:id/results`). Eliminar protegido contra alumnos activos. Enrutamiento seguro para prevenir el acceso encubierto a la etapa de inicio de examen (`403 Forbidden`).
        *   `src/routes/settings.ts`: Control de configuración global (`GET` y `PATCH /api/settings/registration`).
        *   `src/routes/subjects.ts`: Listar y crear materias (alimenta el Select del ExamManager).
        *   `src/middlewares/auth.middleware.ts`: Verifica JWT Y consulta la tabla `Session` en BD (Sesión Única).
        *   `.env`: Guarda `JWT_SECRET`, `PORT`, `DATABASE_URL`, `DIRECT_URL`.

*   **`apps/frontend/`** 👉 **La Interfaz de Usuario — Entrega Final (Sábado 8 Completo)**
    *   **Tecnología:** React 19, Vite, Tailwind CSS v4 (nativo, sin PostCSS), shadcn/ui v4 (40+ componentes), `next-themes` (modo oscuro).
    *   **¿Qué hace?:** Login, Dashboard, Banco de Reactivos, Motor de Exámenes completo (crear, publicar, hacer con reanudación, ver resultados). Modo oscuro global.
    *   **Archivos clave:**
        *   `src/App.tsx`: Orquestador — 3 flujos: Login, ExamRoom (pantalla completa), Dashboard. Envuelto en `ThemeProvider`.
        *   `src/pages/DashboardHome.tsx`: Panel con estadísticas, con consultas segmentadas estrictamente por `studentId` para precisión del historial analítico del alumno.
        *   `src/pages/QuestionsAdmin.tsx`: Banco de Reactivos con KaTeX, Drag & Drop, Botón de Exportación Excel, Paginación del lado del cliente (15 items/página), buscador instantáneo textual y filtro por materia.
        *   `src/pages/ExamManager.tsx`: Gestión de exámenes — flujo Borrador→Publicar, panel seguro de inicio de examen sin saltos de contexto. AlertDialog de confirmación, toasts Sonner.
        *   `src/pages/ExamRoom.tsx`: Sala de concurso con temporizador, anti-cierre (`beforeunload`), reanudación automática y pantalla "ya entregado".
        *   `src/pages/ExamResult.tsx`: Pantalla de resultado con puntaje y desglose.
        *   `src/pages/ReportsPage.tsx`: Panel analítico (Admin) con gráficos Recharts.
        *   `src/pages/StudentHistory.tsx`: Kardex histórico de exámenes del alumno.
        *   `src/pages/SettingsPage.tsx`: Configuraciones de sistema (purga, bloqueo de registro).
        *   `src/pages/UsersAdmin.tsx`: Padrón integral de usuarios del sistema.
        *   `src/components/date-time-picker.tsx`: Componente DateTimePicker propio (Calendar+Popover+Time, campos apilados).
        *   `src/components/app-sidebar.tsx`: Sidebar filtrado por rol + ThemeToggle en footer.
        *   `src/components/theme-toggle.tsx`: Botón de toggle sol/luna para modo oscuro/claro.

### 2. `packages/` (Paquetes Compartidos)
Aquí viven las herramientas y librerías que pueden ser usadas tanto por el backend como por el frontend (aunque por ahora solo las usa el backend).

*   **`packages/database/`** 👉 **El Corazón de los Datos (Supabase + Prisma)**
    *   **Tecnología:** Prisma ORM.
    *   **¿Qué hace?:** Define cómo son las tablas en la base de datos y provee el código para hacer consultas (SELECT, INSERT) sin escribir SQL a mano.
    *   **Archivos clave:**
        *   `prisma/schema.prisma`: **El archivo más importante de datos.** Aquí diseñas la base de datos (Modelos: User, Question, Exam). Si lo cambias, debes correr `prisma db push`.
        *   `src/index.ts`: Exporta el "cliente" de Prisma para que `apps/backend` lo pueda importar y usar.
        *   `.env`: Guarda la `DATABASE_URL` y la `DIRECT_URL` (Tus contraseñas de conexión a Supabase).

### 3. `docs/` (Tu Bóveda Secreta)
Todo lo que está aquí es **invisible para Git**.
*   `guias/MAPA_DEL_PROYECTO.md`: Este archivo.
*   `guias/ARQUITECTURA_FRONTEND.md`: Arquitectura técnica detallada del frontend (stack, módulos, patrones).
*   `guias/RECUPERACION_BD.md`: ⚠️ **LEER SI ALGO SALE MAL** — Guía paso a paso para migrar la BD a otra cuenta de Supabase o a otro proveedor (Railway, Neon, etc.).
*   `planificacion/CHANGELOG.md`: Historial de cambios por entrega.
*   `videos/`: Los guiones para grabar tus avances semanales sin trabarte.

---

## 🛠️ Archivos en la Raíz (Root)
*   **`.gitignore`**: La lista negra de Git. Todo lo que esté anotado aquí (como `.env` o la carpeta `docs/guias/`) no se subirá a GitHub. Es tu escudo de privacidad.
*   **`pnpm-workspace.yaml`**: Le dice a pnpm que este proyecto es un monorepo y que debe buscar código dentro de `apps/` y `packages/`.
*   **`pnpm-lock.yaml`**: Un registro súper exacto de cada versión de cada librería que instalamos. (No se edita a mano).

---

## 🔄 Flujo de Trabajo — Sistema Completo (Sábado 6 Noche)

**Flujo de Autenticación:**
1. El usuario abre `http://localhost:5173` → ve el **Login** (shadcn `login-04`).
2. Escribe email y contraseña → el frontend hace `POST /api/auth/login`.
3. El backend **destruye sesiones anteriores** del usuario en la tabla `Session`, crea una nueva y devuelve el JWT.
4. El frontend guarda el JWT en `localStorage` y renderiza el **Dashboard**.
5. Cada petición subsecuente adjunta el JWT en el header `Authorization: Bearer <token>`.
6. El middleware `requireAuth` valida el token Y consulta que exista en la tabla `Session` (anti-fraude).

**Flujo de Banco de Reactivos (Carga y Descarga):**
1. El Admin arrastra un `.xlsx` a la zona Drag & Drop del Banco de Reactivos.
2. El frontend hace `POST /api/questions/bulk` con el archivo como `multipart/form-data`.
3. El backend lo procesa en memoria con `multer` + `xlsx`. Para prevenir cuellos de botella con la base de datos (Ej. `P2028` en PgBouncer), las materias se compilan en un caché interno. Seguidamente, se crea una matriz (Array) de operaciones (`prisma.question.create`) y todas se mandan a insertar simultáneamente vía `prisma.$transaction([])` puro y atómico.
4. Si algo falla, ninguna pregunta se guarda (Atomicidad).
5. El Admin también puede presionar el botón "Exportar Banco", invocando la ruta `GET /api/questions/export` para descargar automáticamente una hoja `.xlsx` generada con la información vigente del sistema.

**Flujo de Gestión de Materias, Usuarios y Exámenes (Sábado 7):**
1. Las materias se cargan desde la API en un `Select`; al elegir materia se muestran las preguntas con sus nombres reales (no UUIDs).
2. El control de registros es **Master Switch**. El Admin puede activar/desactivar la creación de nuevas cuentas de alumnos desde la vista `StudentsPage`. Los registros exigen dominio `@mina.tecnm.mx` y selección de Semestre.
3. El admin crea el examen → queda como **Borrador** (`isActive: false`). Aparece con badge gris en la tabla. Puede **Editarlo** por completo (título, fechas, preguntas, tiempo).
4. El admin pulsa **Publicar** → el endpoint genera automáticamente un **Código de Acceso** (ej. `TEC-ABX3`) que se muestra en la tabla junto a un botón para copiarlo. El estado cambia a activo. Si hay alumnos `IN_PROGRESS`, la operación es rechazada (`409`). Al estar publicado, el botón de Editar solo permite cambiar fechas para proteger la integridad.
5. El alumno **no ve todos los exámenes** por defecto. En su lugar, usa el botón "Unirme a Concurso", introduce el código del examen proporcionado por el profesor y se inscribe.
6. El alumno ve un **Badge numérico rojo** en su sidebar que le notifica cuántos de *sus* exámenes "En vivo" (inscritos) están disponibles. Al ingresar, el backend devuelve `savedAnswers` para reanudar si cerró el navegador.
7. Si el alumno intenta cerrar la pestaña durante el examen, el browser muestra una advertencia nativa (`beforeunload`).
8. Al entregar (o al expirar el tiempo), el listener `beforeunload` se limpia y el frontend llama a `POST /submit`.
9. El servidor calcula la calificación y el **breakdown** (pregunta, respuesta elegida, opción correcta y explicación). El alumno entra a la pantalla de **Resultado Interactivo** (`ExamResult.tsx`) donde despliega acordeones para retroalimentación. Asimismo, cuando el alumno vuelve a consultar su lista de exámenes en `ExamManager`, el botón **"Ver Resultados"** consume `GET /api/exams/:id/my-result` y lo lleva directamente a la pantalla de resultados interactiva sin pasar por `ExamRoom`.
10. El admin entra a su panel y pulsa el botón de gráfica para abrir el **Modal de Resultados Premium** (podio con medallas, stats rápidas superiores, tabla de estudiantes con avatares de iniciales y código de colores semánticos de porcentaje).
11. Al finalizar el año escolar, el Admin puede ejecutar el botón **"Purgar Alumnos"** que elimina de tajo a todos los estudiantes y sus respuestas, dejando el sistema limpio para una nueva generación.

---

## 🎨 Arquitectura del Frontend al Detalle
Si el jurado te pregunta sobre cómo está construido visualmente o por qué no usas "archivos CSS viejos", diles que tienes un stack puramente moderno basado en componentes.
Hemos creado un documento exclusivo para que estudies todo esto a fondo. **Por favor lee el archivo:** `docs/guias/ARQUITECTURA_FRONTEND.md`. Allí está documentado detalladamente cómo funcionan los temas oscuros (`next-themes`), los ruteos de estado global, la seguridad anti-cierre, y la fusión de clases CSS (`cn()`).


