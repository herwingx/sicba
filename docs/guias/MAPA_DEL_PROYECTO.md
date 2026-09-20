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
        *   `src/routes/questions.ts`: CRUD del Banco de Reactivos y carga masiva `.xlsx` (multer + xlsx).
        *   `src/routes/exams.ts`: **Motor de Exámenes** — crear (Borrador, `isActive:false`), publicar/despublicar (`PATCH /publish`), listar, iniciar con reanudación (`savedAnswers`), registrar respuestas, calificar. Eliminar protegido contra alumnos activos.
        *   `src/routes/subjects.ts`: Listar y crear materias (alimenta el Select del ExamManager).
        *   `src/middlewares/auth.middleware.ts`: Verifica JWT Y consulta la tabla `Session` en BD (Sesión Única).
        *   `.env`: Guarda `JWT_SECRET`, `PORT`, `DATABASE_URL`, `DIRECT_URL`.

*   **`apps/frontend/`** 👉 **La Interfaz de Usuario — Sábado 5 Completo**
    *   **Tecnología:** React 19, Vite, Tailwind CSS v4 (nativo, sin PostCSS), shadcn/ui v4 (40+ componentes), `next-themes` (modo oscuro).
    *   **¿Qué hace?:** Login, Dashboard, Banco de Reactivos, Motor de Exámenes completo (crear, publicar, hacer con reanudación, ver resultados). Modo oscuro global.
    *   **Archivos clave:**
        *   `src/App.tsx`: Orquestador — 3 flujos: Login, ExamRoom (pantalla completa), Dashboard. Envuelto en `ThemeProvider`.
        *   `src/pages/DashboardHome.tsx`: Panel con estadísticas.
        *   `src/pages/QuestionsAdmin.tsx`: Banco de Reactivos con KaTeX y Drag & Drop.
        *   `src/pages/ExamManager.tsx`: Gestión de exámenes — flujo Borrador→Publicar, AlertDialog de confirmación, toasts Sonner.
        *   `src/pages/ExamRoom.tsx`: Sala de concurso con temporizador, anti-cierre (`beforeunload`), reanudación automática y pantalla "ya entregado".
        *   `src/pages/ExamResult.tsx`: Pantalla de resultado con puntaje y desglose.
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

**Flujo de Carga Masiva:**
1. El Admin arrastra un `.xlsx` a la zona Drag & Drop del Banco de Reactivos.
2. El frontend hace `POST /api/questions/bulk` con el archivo como `multipart/form-data`.
3. El backend lo procesa en memoria con `multer` + `xlsx`, e inserta todas las preguntas en una sola `prisma.$transaction`.
4. Si algo falla, ninguna pregunta se guarda (Atomicidad).

**Flujo de Gestión de Materias y Exámenes (Sábado 6):**
1. Las materias se cargan desde la API en un `Select`; al elegir materia se muestran las preguntas con sus nombres reales (no UUIDs).
2. El admin crea el examen → queda como **Borrador** (`isActive: false`). Aparece con badge gris en la tabla. Puede **Editarlo** por completo (título, fechas, preguntas, tiempo).
3. El admin pulsa **Publicar** → el endpoint `PATCH /api/exams/:id/publish` activa el examen. Si hay alumnos `IN_PROGRESS`, la operación es rechazada (`409`). Al estar publicado, el botón de Editar solo permite cambiar fechas para proteger la integridad.
4. El alumno ve un **Badge numérico rojo** en su sidebar que le notifica cuántos exámenes "En vivo" están disponibles. Al ingresar, el backend devuelve `savedAnswers` para reanudar si cerró el navegador.
5. Si el alumno intenta cerrar la pestaña durante el examen, el browser muestra una advertencia nativa (`beforeunload`).
6. Al entregar (o al expirar el tiempo), el listener `beforeunload` se limpia y el frontend llama a `POST /submit`.
7. El servidor calcula la calificación y el **breakdown** (pregunta, respuesta elegida, opción correcta y explicación). El alumno entra a la pantalla de **Resultado Interactivo** (`ExamResult.tsx`) donde despliega acordeones para retroalimentación.
8. El admin entra a su panel y pulsa el botón de gráfica para abrir el **Modal de Resultados Premium** (podio con medallas, stats rápidas superiores, tabla de estudiantes con avatares de iniciales y código de colores semánticos de porcentaje).
9. El admin puede **Despublicar** o **Eliminar** el examen; eliminar devuelve `409` si hay alumnos activos.

---

## 🎨 Arquitectura del Frontend al Detalle
Si el jurado te pregunta sobre cómo está construido visualmente o por qué no usas "archivos CSS viejos", diles que tienes un stack puramente moderno basado en componentes.
Hemos creado un documento exclusivo para que estudies todo esto a fondo. **Por favor lee el archivo:** `docs/guias/ARQUITECTURA_FRONTEND.md`. Allí está documentado detalladamente cómo funcionan los temas oscuros (`next-themes`), los ruteos de estado global, la seguridad anti-cierre, y la fusión de clases CSS (`cn()`).


