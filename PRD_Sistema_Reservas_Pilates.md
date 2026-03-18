# PRD — Sistema de Gestión de Reservas para Estudio de Pilates

**Versión:** 1.0  
**Fecha:** Marzo 2026  
**Estado:** Borrador  
**Autor:** Por definir

---

## 1. Resumen Ejecutivo

Este documento describe los requerimientos para el desarrollo de un sistema de gestión de reservas orientado a profesores independientes de pilates. El sistema permitirá al profesor organizar su agenda, gestionar clases grupales y privadas, y automatizar recordatorios a sus alumnos, reemplazando el proceso manual actual basado en WhatsApp y mensajes directos.

---

## 2. Problema

Los profesores de pilates que trabajan de forma independiente gestionan sus reservas a través de WhatsApp o mensajes directos. Esto genera los siguientes problemas:

- **Desorganización:** La agenda se lleva de forma informal, lo que puede derivar en doble bookings o turnos perdidos.
- **Alta carga operativa:** El profesor dedica tiempo valioso a confirmar, recordar y reprogramar clases manualmente.
- **Falta de visibilidad:** No existe una vista clara y centralizada de la disponibilidad, clases programadas y alumnos inscritos.
- **Olvidos y ausencias:** Sin recordatorios automáticos, los alumnos faltan a clase o el profesor debe enviar mensajes manualmente.

---

## 3. Objetivo del Producto

Crear un sistema web sencillo que permita a un profesor de pilates independiente gestionar su agenda de clases (grupales y privadas), visualizar su disponibilidad y enviar recordatorios automáticos a sus alumnos, reduciendo el trabajo administrativo y mejorando la experiencia del alumno.

---

## 4. Usuarios Objetivo

### Usuario Primario: Profesor de Pilates (Administrador)

- Trabaja de forma independiente, sin personal de apoyo.
- Maneja clases grupales y privadas.
- Actualmente gestiona todo por WhatsApp.
- Necesita una herramienta simple, rápida y desde cualquier dispositivo.

### Usuario Secundario: Alumnos

- Reciben notificaciones y recordatorios de sus clases.
- En versiones futuras, podrían autogestionar sus reservas.

---

## 5. Alcance (Scope)

### ✅ Dentro del alcance (v1.0)

- Gestión de clases grupales (con capacidad máxima)
- Gestión de clases privadas (1 alumno)
- Creación y edición de horarios recurrentes o puntuales
- Alta y administración de alumnos
- Inscripción de alumnos a clases
- Envío de recordatorios automáticos por email y/o WhatsApp
- Vista de agenda semanal/mensual del profesor
- Cancelación de clases con notificación a alumnos

### ❌ Fuera del alcance (v1.0)

- Pagos y facturación en línea
- Portal de autogestión para alumnos (reservar por su cuenta)
- App nativa móvil (iOS / Android)
- Múltiples profesores o salas
- Historial de asistencia y métricas avanzadas

---

## 6. Requerimientos Funcionales

### 6.1 Gestión de Clases

- El profesor puede crear una clase con los siguientes atributos:
  - Tipo: grupal o privada
  - Fecha y hora
  - Duración (en minutos)
  - Capacidad máxima (para grupales)
  - Nombre o descripción (ej. "Pilates Mat Nivel 2")
  - Recurrencia: única, semanal, quincenal
- El profesor puede editar o cancelar cualquier clase.
- El sistema debe mostrar una advertencia si se genera un conflicto de horario.
- Las clases grupales deben mostrar cuántos cupos quedan disponibles.

### 6.2 Gestión de Alumnos

- El profesor puede dar de alta alumnos con: nombre, apellido, email y número de WhatsApp.
- El profesor puede inscribir y desinscribir alumnos de clases.
- El sistema debe impedir inscribir a un alumno en una clase sin cupos.

### 6.3 Vista de Agenda

- El profesor puede ver su agenda en vista semanal y mensual.
- Las clases deben diferenciarse visualmente entre grupales y privadas.
- Al hacer clic en una clase, el profesor puede ver quiénes están inscriptos.

### 6.4 Recordatorios Automáticos

- El sistema envía un recordatorio automático a cada alumno inscrito antes de su clase.
- El tiempo de anticipación del recordatorio es configurable por el profesor (ej. 24 hs, 2 hs antes).
- Los canales de envío disponibles son: **email** y/o **WhatsApp** (vía integración con WhatsApp Business API o Twilio).
- El mensaje de recordatorio debe incluir: nombre del alumno, nombre de la clase, fecha y hora.
- El profesor puede activar o desactivar los recordatorios por clase o de forma global.

---

## 7. Requerimientos No Funcionales

| Atributo | Descripción |
|---|---|
| **Usabilidad** | La interfaz debe ser simple y operable desde un celular sin entrenamiento previo. |
| **Disponibilidad** | El sistema debe estar disponible al menos el 99% del tiempo. |
| **Rendimiento** | Las páginas deben cargar en menos de 2 segundos en condiciones normales. |
| **Seguridad** | El acceso al panel del profesor requiere autenticación (usuario y contraseña). Los datos de alumnos deben almacenarse de forma segura. |
| **Escalabilidad** | Aunque v1.0 es para un solo profesor, la arquitectura debe permitir agregar múltiples profesores en el futuro. |

---

## 8. Criterios de Aceptación

- [ ] El profesor puede crear una clase grupal con capacidad limitada y el sistema impide inscribir más alumnos que la capacidad máxima.
- [ ] El profesor puede crear una clase privada y asignarle un único alumno.
- [ ] El sistema envía un recordatorio automático al alumno por email o WhatsApp antes de la clase, según la configuración.
- [ ] El profesor puede ver su agenda semanal con todas las clases programadas.
- [ ] Al cancelar una clase, el sistema notifica automáticamente a los alumnos inscriptos.
- [ ] No se pueden crear dos clases con el mismo horario solapado.

---

## 9. Métricas de Éxito

| Métrica | Objetivo |
|---|---|
| Reducción de mensajes manuales de coordinación | > 80% menos que el proceso actual |
| Tasa de ausencias | Reducción del 30% gracias a recordatorios |
| Tiempo del profesor en tareas administrativas | Reducción de al menos 2 hs por semana |
| Satisfacción del profesor (NPS o encuesta) | > 8 / 10 al mes de uso |

---

## 10. Supuestos y Restricciones

**Supuestos:**
- El profesor tiene conexión a internet estable desde su lugar de trabajo.
- El profesor cuenta con una cuenta de email activa y, opcionalmente, una cuenta de WhatsApp Business.
- Los alumnos tienen email y/o WhatsApp activos para recibir notificaciones.

**Restricciones:**
- El sistema no manejará pagos en esta versión.
- Los alumnos no podrán hacer reservas por su cuenta en v1.0 — el profesor gestiona todo.

---

## 11. Dependencias Técnicas (Referencia)

- Integración con **WhatsApp Business API** o **Twilio** para envío de mensajes.
- Servicio de envío de emails (ej. SendGrid, Resend).
- Sistema de autenticación seguro para el acceso del profesor.

---

## 12. Stack Tecnológico

| Capa | Tecnología | Notas |
|---|---|---|
| **Frontend** | React + Vite | SPA, interfaz del panel del profesor |
| **Backend** | Node.js + Express | API REST |
| **ORM** | Prisma | Gestión y migraciones de base de datos |
| **Base de datos** | PostgreSQL | Base de datos relacional principal |
| **Hosting** | VPS | Despliegue propio del servidor |
| **Recordatorios email** | Por definir (ej. SendGrid, Resend) | Servicio de envío de emails transaccionales |
| **Recordatorios WhatsApp** | Por definir (ej. Twilio, WhatsApp Business API) | Integración para mensajes automáticos |

---

## 13. Preguntas Abiertas

| # | Pregunta | Responsable | Estado |
|---|---|---|---|
| 1 | ¿El profesor quiere que los alumnos puedan reservar por sí mismos en una versión futura? | Product | Abierta |
| 2 | ¿Se necesita soporte para clases con múltiples horarios en el mismo día? | Product | Abierta |
| 3 | ¿Cuál es el canal de recordatorio preferido: email, WhatsApp o ambos? | Product | Abierta |
| 4 | ¿El sistema debe manejar listas de espera para clases grupales completas? | Product | Abierta |

---

## 14. Historial de Versiones

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | Marzo 2026 | Versión inicial del documento |

---

*Este documento es un borrador vivo y será actualizado a medida que evolucione el producto.*
