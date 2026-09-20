# 🎬 Guion de Video — Sábado 5 (Entrega Final del Módulo de Exámenes)

Este guion está diseñado para que grabes la demostración final del sistema de exámenes. Mostrará todas las funciones consolidadas: Publicación, Anti-cierre, Modo Oscuro, Panel de Alumnos, Resultados Interactivos y Desglose Pedagógico.

**Nota importante:** Todo esto ocurre en tu entorno local. Asegúrate de tener los servicios levantados antes de grabar.

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

### Escena 1: Introducción y Modo Oscuro (0:00 - 0:45)
*   **Visual:** Pantalla de Login de SICBA. Haces inicio de sesión con la cuenta de **Admin**.
*   **Locución:** "Hola, bienvenidos a esta nueva demostración de SICBA. Para este Sábado 5, hemos integrado todo el módulo de gestión y ejecución de exámenes, convirtiéndolo en un sistema robusto, pedagógico y a prueba de errores. Lo primero que notarán es que hemos incorporado un modo oscuro nativo, el cual utiliza la moderna View Transitions API para crear este hermoso efecto de onda expansiva al activarlo."
*   **Acción:** Haz clic en el botón de la luna/sol en la parte inferior del menú lateral. Verás cómo el nuevo tema "nace" desde el botón y se expande en círculo. Alterna un par de veces y déjalo en el modo oscuro.

### Escena 2: Panel de Alumnos y Gestión de Exámenes (Admin) (0:45 - 2:00)
*   **Visual:** Navegas al menú "Alumnos" (StudentsPage) y luego a "Exámenes" (ExamManager).
*   **Locución:** "Como administrador, ahora tenemos un panel dedicado exclusivamente para ver a los alumnos registrados en el sistema con su información académica. Además, el flujo de creación de exámenes se ha perfeccionado. Ahora, cuando creamos un examen, este nace como un 'Borrador'. No es visible para los estudiantes hasta que nosotros, explícitamente, lo publicamos."
*   **Acción:** Ve a la pestaña de "Alumnos" y muestra la tabla. Luego ve a "Exámenes". Muestra un examen que esté en estado "Borrador". Haz clic en el botón "Publicar" y muestra cómo cambia el Badge a color verde (En vivo).

### Escena 3: Ingreso y Protección Anti-Cierre (Alumno) (2:00 - 3:30)
*   **Visual:** Cierra sesión y entra como **Alumno 1**.
*   **Locución:** "Vamos a cambiar de rol a estudiante. Fíjense en la barra lateral: acaba de aparecer un globo de notificación rojo. Este *badge* es inteligente, usa *polling* silencioso cada 15 segundos para avisarle al alumno si tiene exámenes activos o 'próximamente', sin necesidad de refrescar la página. Y hablando de refrescar, hemos implementado enrutamiento SPA avanzado: si presiono F5, el sistema recuerda exactamente en qué panel estoy gracias al hash en la URL, en lugar de regresarme al inicio."
*   **Acción:** Demuestra cómo al oprimir F5 la página se queda en Exámenes. Entra al examen publicado y responde la primera pregunta.
*   **Locución:** "Ya dentro, ¿qué pasa si el alumno intenta recargar la página o cerrar el navegador por accidente?"
*   **Acción:** Intenta recargar la página (F5 o botón de recargar). Se mostrará la advertencia nativa del navegador. Presiona "Cancelar" o "Permanecer en la página".

### Escena 4: Reanudación de Examen (3:30 - 4:30)
*   **Visual:** Sigues en el examen.
*   **Locución:** "Incluso si el alumno fuerza el cierre del navegador o pierde la conexión, el progreso no se pierde. Todo se sincroniza con el servidor. Vamos a simular que la pestaña se cierra y el alumno vuelve a entrar."
*   **Acción:** Vuelve a cargar la página forzadamente y regresa a `http://localhost:5173/#exams`. Entra de nuevo al examen en curso.
*   **Locución:** "Como pueden ver, al reingresar, el sistema recupera sus respuestas guardadas y le notifica que su progreso ha sido restaurado. Además, el temporizador es independiente, sigue contando el tiempo real que quedaba."

### Escena 5: Entrega y Resultados Pedagógicos (4:30 - 6:00)
*   **Visual:** Terminas de responder (intenta fallar una a propósito) y entregas el examen.
*   **Locución:** "Vamos a terminar de contestar y entregamos el examen. Inmediatamente el alumno es dirigido a una pantalla interactiva de resultados."
*   **Acción:** Confirma la entrega. Se carga `ExamResult.tsx`.
*   **Locución:** "Esta no es solo una calificación plana. El sistema ofrece retroalimentación pedagógica. Vemos el puntaje y el desglose de cada pregunta. Al expandir los acordeones, el alumno puede ver las fórmulas matemáticas procesadas en LaTeX, qué opción seleccionó erróneamente en color rojo, cuál era la correcta en verde, y la explicación respectiva. Por cierto, al volver al panel, verán que el badge rojo desaparece automáticamente porque el examen ya fue entregado."
*   **Acción:** Expande un par de acordeones. Luego haz clic en "Volver a exámenes" para mostrar cómo la vista se limpia.

### Escena 6: Modal de Resultados para Administradores (6:00 - 7:00)
*   **Visual:** Cierra sesión y vuelve a entrar como **Admin**. Ve a "Exámenes".
*   **Locución:** "Finalmente, volvemos a nuestro rol de administrador. Si queremos ver cómo le fue al grupo sin salir de la app, usamos el nuevo botón de 'Actualizar' en el panel, que refresca la tabla al instante. Y para los detalles, entramos al panel de resultados."
*   **Acción:** Haz clic en el botón "Actualizar" y luego en el botón "Resultados" (icono de gráfica). Se abre el modal.
*   **Locución:** "Se nos presenta el ranking en vivo. Note que el diseño ahora usa Grid CSS responsivo, de forma que los porcentajes y estadísticas siempre encajan a la perfección sin amontonarse o generar scrolls horizontales molestos, incluso en pantallas pequeñas."

### Escena 7: Conclusión (7:00 - 7:30)
*   **Visual:** Puedes dejar la pantalla en el Dashboard principal.
*   **Locución:** "Con estas adiciones del Sábado 5, SICBA ha consolidado su motor de exámenes. Tenemos seguridad, resiliencia ante caídas, ruteo SPA robusto, y un enfoque pedagógico fuerte con los resultados interactivos. Muchas gracias por su tiempo."
