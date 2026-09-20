# 🎬 Guion de Video — Sábado 5 (Entrega Final del Módulo de Exámenes)

Este guion está diseñado para que grabes la demostración final del sistema de exámenes. Mostrará todas las funciones consolidadas con un fuerte enfoque en **Frontend, UI/UX y control de estado**, que es el núcleo de la materia, demostrando cómo se sincroniza con el backend para lograr un sistema pedagógico y a prueba de errores.

**Nota importante:** Todo esto ocurre en tu entorno local. Asegúrate de tener los servicios levantados antes de grabar (y recuerda reiniciar tu backend para aplicar los últimos cambios de fecha).

---

## 📝 Checklist Pre-Grabación

1.  [ ] Asegúrate de tener la terminal corriendo: `pnpm run dev` en la raíz.
2.  [ ] Abre Google Chrome o tu navegador favorito en `http://localhost:5173`.
3.  [ ] Ten a la mano tus credenciales de prueba:
    *   **Admin:** `admin@sicba.edu` / `password123`
    *   **Alumno 1:** `alumno1@sicba.edu` / `password123`
    *   **Alumno 2:** `alumno2@sicba.edu` / `password123`
4.  [ ] Asegúrate de tener un examen en estado **Borrador** con un límite de tiempo corto (ej. 2 minutos) para demostrar que el tiempo avanza.

---

## 📹 Escenas y Locuciones

### Escena 1: Introducción y Código de View Transitions API (0:00 - 1:00)
*   **Visual:** Pantalla de Login de SICBA. Haces inicio de sesión con la cuenta de **Admin**.
*   **Locución:** "Hola, bienvenidos a esta nueva demostración de SICBA. Para este Sábado 5, hemos integrado el módulo completo de exámenes enfocándonos fuertemente en la experiencia de usuario y el manejo avanzado del DOM en Frontend. Lo primero que notarán es la incorporación de un modo oscuro nativo, impulsado por la nueva *View Transitions API* de CSS y JavaScript."
*   **Acción:** Haz clic en el botón de la luna/sol en la parte inferior del menú lateral. Verás el efecto de onda expansiva al activarlo.
*   **Visual (Muestra de Código):** Abre tu editor de código (VS Code) y muestra el archivo `src/components/theme-toggle.tsx`.
*   **Locución:** "Aquí pueden ver cómo implementamos esto. Usamos `document.startViewTransition()`. Lo que hace esta API nativa es tomar un 'screenshot' del DOM actual, luego aplicamos el cambio de estado de React (cambiando a dark mode), y el navegador anima automáticamente la transición entre ambos estados usando `clipPath` radial para generar este efecto de expansión desde donde el usuario hizo clic. Es puro frontend moderno sin librerías pesadas de animación."

### Escena 2: Panel de Alumnos y Gestión de Exámenes (Admin) (0:45 - 2:00)
*   **Visual:** Navegas al menú "Alumnos" (StudentsPage) y luego a "Exámenes" (ExamManager).
*   **Locución:** "Como administrador, ahora tenemos un panel dedicado exclusivamente para ver a los alumnos registrados en el sistema con su información académica. Además, el flujo de creación de exámenes se ha perfeccionado. Ahora, cuando creamos un examen, este nace como un 'Borrador'. No es visible para los estudiantes hasta que nosotros, explícitamente, lo publicamos."
*   **Acción:** Ve a la pestaña de "Alumnos" y muestra la tabla. Luego ve a "Exámenes". Muestra un examen que esté en estado "Borrador". Haz clic en el botón "Publicar" y muestra cómo cambia el Badge a color verde (En vivo).

### Escena 3: Ingreso, Componentes Controlados y Anti-Cierre (2:00 - 3:30)
*   **Visual:** Cierra sesión y entra como **Alumno 1**.
*   **Locución:** "Vamos a cambiar de rol a estudiante. Fíjense en el badge rojo inteligente, que usa polling silencioso para avisarle al alumno si tiene exámenes. Entremos al examen publicado."
*   **Acción:** Entra al examen publicado y detente un momento en la primera pregunta.
*   **Locución:** "A nivel UI, hemos construido este wizard de preguntas usando componentes de Shadcn, pero completamente 'controlados' en React. Miren la barra de progreso animada en la parte superior; reacciona al estado de las respuestas. Y si el alumno intenta cerrar el navegador..."
*   **Acción:** Intenta recargar la página (F5 o botón de cerrar pestaña). Se mostrará la advertencia nativa del navegador. Presiona "Cancelar".
*   **Visual (Muestra de Código):** Muestra el archivo `src/pages/ExamRoom.tsx` brevemente.
*   **Locución:** "Logramos esta retención interceptando el evento nativo `beforeunload` del DOM desde un `useEffect` de React. Esto evita que el usuario pierda su sesión local accidentalmente."

### Escena 4: Reanudación de Estado y Temporizador (3:30 - 4:30)
*   **Visual:** Sigues en el examen. Responde 1 o 2 preguntas para que la barra de progreso avance.
*   **Locución:** "A pesar de ser una materia de Frontend, tuvimos que integrar el Backend para lograr una UX verdaderamente resiliente. Si simulo una caída forzando el cierre y vuelvo a entrar..."
*   **Acción:** Vuelve a cargar la página forzadamente (sin confirmar en el dialog, solo dale "Reload" o cierra y abre) y regresa a `http://localhost:5173/#exams`. Entra de nuevo al examen.
*   **Locución:** "Noten cómo el componente React automáticamente 'salta' a la primera pregunta sin contestar, la barra de progreso refleja exactamente lo que teníamos, y las opciones previas se pintan automáticamente gracias al bindeo bidireccional (`checked` y `onChange`) que hicimos en el código. Además, el temporizador vuelve a calcular el tiempo real restante basándose en cuándo inició la sesión este alumno."

### Escena 5: Entrega y Parsing Dinámico de LaTeX (4:30 - 6:00)
*   **Visual:** Terminas de responder (intenta fallar una a propósito) y entregas el examen.
*   **Locución:** "Vamos a entregar el examen. Inmediatamente el alumno es dirigido a una pantalla interactiva de resultados."
*   **Acción:** Confirma la entrega. Se carga la vista de resultados.
*   **Locución:** "En esta pantalla el trabajo de Frontend es intensivo. No es solo mostrar un número, usamos componentes tipo Acordeón para un desglose pedagógico. Presten atención a cómo renderizamos dinámicamente notación matemática compleja utilizando la librería `react-latex-next` combinada con Tailwind para mostrar qué se respondió mal en rojo y cuál era la opción correcta en verde, ofreciendo un feedback visual inmediato y claro."
*   **Acción:** Expande un par de acordeones donde haya fórmulas. Luego haz clic en "Volver a exámenes".

### Escena 6: Modal de Resultados y CSS Grid (6:00 - 7:00)
*   **Visual:** Cierra sesión y vuelve a entrar como **Admin**. Ve a "Exámenes". Haz clic en el botón "Actualizar" y abre los "Resultados".
*   **Locución:** "Finalmente, volviendo al panel de administración, podemos revisar el ranking. En el diseño de esta tabla modal, aplicamos utilidades avanzadas de CSS Grid y Flexbox. Esto garantiza que sin importar el tamaño del texto o de la pantalla, los porcentajes y tiempos encajen perfectamente sin colapsar ni generar barras de desplazamiento horizontal molestas."
*   **Acción:** Redimensiona un poco la ventana del navegador para mostrar cómo el modal es responsivo y se adapta limpiamente.

### Escena 7: Conclusión (7:00 - 7:30)
*   **Visual:** Puedes dejar la pantalla en el Dashboard principal en modo oscuro.
*   **Locución:** "Con estas adiciones, demostramos no solo una gestión de estado robusta en React y consumo de APIs, sino una clara atención al detalle visual, animaciones fluidas con View Transitions, y UX avanzada en el Front-End. Gracias por su atención."
