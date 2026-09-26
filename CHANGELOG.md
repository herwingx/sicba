# Changelog

Todos los cambios notables de este proyecto se documentarán en este archivo.

## [2026-09-26]

### Añadido / Cambiado (Backend)
- **Motor Anti-fraude:** Se ha refactorizado la recolección de datos de auditoría (`FraudLog`). Ahora el `studentId` se extrae de manera segura a partir del token JWT (`req.user`) en el servidor, en lugar de provenir del cuerpo de la petición. Esto mejora la seguridad al evitar la falsificación de identidad.
- **Lógica de envío de exámenes:** Se ha reforzado la validación en el servidor al enviar respuestas. Ahora el backend verifica de manera estricta que no se puedan inyectar respuestas adicionales cuando:
  - La fecha y hora actual hayan sobrepasado el tiempo de finalización estipulado (`exam.endTime`).
  - La participación del alumno ya se encuentre marcada como entregada (`SUBMITTED`).

### Correcciones (Frontend)
- **Estado de Exámenes:** Se corrigió un problema de visualización y consistencia en el estado de los exámenes para los alumnos. Ahora el texto reflejado en la interfaz es "Terminado" en lugar de "Finalizado", alineándose con los lineamientos de UI/UX definidos para la aplicación.
