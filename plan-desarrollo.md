Plan de Desarrollo — Sistema de Gestión de Reservas para Pilates


Decisiones Confirmadas

Decisión	Valor
Equipo	1 fullstack senior
Deadline	Lo antes posible
Diseño	Sin diseñador — el dev diseña
Estilo visual	Hims-like (limpio, wellness, minimalista) — a definir
v1.0	Agenda + Alumnos + Clases + Lista de espera
v1.1	Recordatorios por WhatsApp + Sección Notificaciones
Canal de recordatorio	WhatsApp (configuración desde cero)
Clases semanales típicas	~40
Recurrencia	Regla + generación dinámica de instancias
Cancelación de instancia recurrente	Permitida individualmente
Solapamiento	Advertencia (no bloqueo)
Eliminar alumno	Solo desinscribir de clases
Edición de clase	Mostrar alumnos a notificar
Autenticación	Email + password
Hosting	VPS propio
Staging	No
Datos iniciales	Desde cero
Backup/Export	Sí
PWA	No — web responsive


Stack Definitivo

Capa	Tecnología	Justificación
Frontend	React 18 + Vite + TypeScript	Rápido, tipado, ecosistema maduro
UI / Styling	Tailwind CSS	Desarrollo ágil sin diseñador, consistencia visual
Componentes base	shadcn/ui	Componentes accesibles, customizables, estilo limpio
Backend	Node.js + Express + TypeScript	Consistencia de lenguaje en todo el stack
ORM	Prisma	Migraciones, type-safety, DX excelente
Base de datos	PostgreSQL	Requerido por PRD
Auth	JWT + bcrypt	Simple, sin dependencia de terceros
Email (v1.1)	Resend	Simple, developer-friendly, free tier generoso
WhatsApp (v1.1)	Twilio WhatsApp Business API	Documentación sólida, setup relativamente directo
Deploy	VPS (Ubuntu) + Nginx + PM2	Control total, bajo costo


Estructura del Proyecto

text
text
pilates-booking/
├── client/                    # React + Vite + TS
│   ├── src/
│   │   ├── components/        # UI reutilizable
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   ├── layout/        # Sidebar, Header, Shell
│   │   │   ├── classes/       # ClassCard, ClassForm, etc.
│   │   │   ├── students/      # StudentCard, StudentForm, etc.
│   │   │   ├── agenda/        # WeekView, MonthView
│   │   │   └── notifications/ # (v1.1)
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Classes.tsx
│   │   │   ├── Students.tsx
│   │   │   ├── Agenda.tsx
│   │   │   ├── Notifications.tsx  # (v1.1)
│   │   │   └── Login.tsx
│   │   ├── hooks/             # useClasses, useStudents, useAuth
│   │   ├── lib/               # api.ts, utils.ts
│   │   ├── types/             # Interfaces TypeScript
│   │   └── App.tsx
│   └── index.html
│
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── classes.routes.ts
│   │   │   ├── students.routes.ts
│   │   │   ├── enrollments.routes.ts
│   │   │   └── notifications.routes.ts  # (v1.1)
│   │   ├── controllers/
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── validate.ts
│   │   │   └── errorHandler.ts
│   │   ├── services/
│   │   │   ├── class.service.ts
│   │   │   ├── student.service.ts
│   │   │   ├── enrollment.service.ts
│   │   │   ├── recurrence.service.ts
│   │   │   └── notification.service.ts  # (v1.1)
│   │   ├── utils/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── index.ts
│   └── package.json
│
├── docker-compose.yml         # PostgreSQL local
├── deploy.sh                  # Script de deploy al VPS
└── README.md


Modelo de Datos (Prisma Schema)

prisma
prisma
model Teacher {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  classes Class[]
}

model Student {
  id        String   @id @default(cuid())
  firstName String
  lastName  String
  email     String?
  phone     String   // WhatsApp number
  notes     String?
  createdAt DateTime @default(now())

  enrollments  Enrollment[]
  waitlist     WaitlistEntry[]
}

model Class {
  id              String       @id @default(cuid())
  teacherId       String
  teacher         Teacher      @relation(fields: [teacherId], references: [id])
  type            ClassType    // GRUPAL | PRIVADA
  title           String
  description     String?
  startDate       DateTime     // Primera ocurrencia
  startTime       String       // "09:00" — hora del día
  duration        Int          // minutos
  maxCapacity     Int          // 1 para privada
  recurrence      Recurrence   // NONE | WEEKLY | BIWEEKLY
  recurrenceEnd   DateTime?    // Hasta cuándo genera instancias
  isActive        Boolean      @default(true)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  enrollments     Enrollment[]
  waitlist        WaitlistEntry[]
  cancellations  ClassCancellation[]

  @@index([teacherId, startDate])
}

model ClassCancellation {
  id        String   @id @default(cuid())
  classId   String
  class     Class    @relation(fields: [classId], references: [id], onDelete: Cascade)
  date      DateTime // Fecha de la instancia cancelada
  createdAt DateTime @default(now())

  @@unique([classId, date])
}

model Enrollment {
  id        String        @id @default(cuid())
  classId   String
  class     Class         @relation(fields: [classId], references: [id], onDelete: Cascade)
  studentId String
  student   Student       @relation(fields: [studentId], references: [id])
  status    EnrollmentStatus @default(ACTIVE)
  enrolledAt DateTime     @default(now())

  @@unique([classId, studentId])
}

model WaitlistEntry {
  id        String   @id @default(cuid())
  classId   String
  class     Class    @relation(fields: [classId], references: [id], onDelete: Cascade)
  studentId String
  student   Student  @relation(fields: [studentId], references: [id])
  position  Int
  createdAt DateTime @default(now())

  @@unique([classId, studentId])
}

enum ClassType {
  GRUPAL
  PRIVADA
}

enum Recurrence {
  NONE
  WEEKLY
  BIWEEKLY
}

enum EnrollmentStatus {
  ACTIVE
  CANCELLED
}


Endpoints de la API

Auth
text
text
POST   /api/auth/login
POST   /api/auth/register        (solo primera vez)
GET    /api/auth/me               (verificar token)

Clases
text
text
GET    /api/classes               (lista con filtros: fecha, tipo)
GET    /api/classes/:id           (detalle + alumnos inscriptos)
POST   /api/classes               (crear — devuelve warning si solapa)
PUT    /api/classes/:id           (editar — devuelve alumnos a notificar)
DELETE /api/classes/:id           (cancelar clase — notifica alumnos)
DELETE /api/classes/:id/instances/:date  (cancelar instancia recurrente)
GET    /api/classes/:id/instances        (genera instancias en rango de fechas)

Alumnos
text
text
GET    /api/students              (lista con búsqueda)
GET    /api/students/:id          (detalle + clases inscriptas)
POST   /api/students              (crear)
PUT    /api/students/:id          (editar)

Inscripciones
text
text
POST   /api/enrollments           (inscribir alumno a clase)
DELETE /api/enrollments/:id       (desinscribir)
GET    /api/classes/:id/enrollments

Lista de Espera
text
text
POST   /api/classes/:id/waitlist    (agregar a lista)
DELETE /api/waitlist/:id             (quitar de lista)
GET    /api/classes/:id/waitlist

Notificaciones (v1.1)
text
text
GET    /api/notifications/pending   (alumnos a notificar: ediciones, cancelaciones)
POST   /api/notifications/send      (enviar por WhatsApp)


Lógica Clave: Generación de Instancias Recurrentes

Las clases recurrentes NO se guardan como N registros. Se guarda UN registro con la regla (recurrence: WEEKLY, startDate, recurrenceEnd). Las instancias se generan dinámicamente:


typescript
typescript
// Pseudocódigo
function generateInstances(classData, from: Date, to: Date): Instance[] {
  const instances = []
  let current = classData.startDate

  while (current <= to && current <= classData.recurrenceEnd) {
    if (current >= from) {
      const isCancelled = classData.cancellations.some(c => c.date === current)
      if (!isCancelled) {
        instances.push({
          date: current,
          startTime: classData.startTime,
          enrolled: getEnrollmentsForDate(classData.id, current)
        })
      }
    }
    // Avanzar según recurrencia
    current = addDays(current, classData.recurrence === 'WEEKLY' ? 7 : 14)
  }
  return instances
}


Fases del Proyecto

FASE 0 — Fundación (Día 1-2)

Objetivo: Proyecto corriendo localmente, DB configurada, auth funcional.


Tarea	Detalle
Inicializar monorepo	client/ con Vite+React+TS, server/ con Express+TS
Configurar Prisma	Schema, docker-compose.yml con PostgreSQL, primera migración
Configurar Tailwind + shadcn/ui	Base de diseño lista
Sistema de auth	Registro, login, middleware JWT, hash de password
Shell/Layout base	Sidebar + Header + routing (React Router)
Login page	Formulario de email + password

Entregable: Login funcional, layout vacío con navegación.



FASE 1 — Gestión de Clases (Día 3-5)

Objetivo: CRUD completo de clases con lógica de solapamiento y recurrencia.


Tarea	Detalle
API: CRUD de clases	Crear, leer, actualizar, eliminar (soft delete)
Detección de solapamiento	Al crear/editar, verificar conflictos y devolver warning
Generación de instancias	Motor de recurrencia (WEEKLY / BIWEEKLY)
Cancelación de instancia	Marcar fecha como cancelada sin afectar la serie
Frontend: Lista de clases	Cards con tipo, horario, cupos
Frontend: Formulario de clase	Crear/editar con validación, selector de recurrencia
Frontend: Warning de solapamiento	Toast/modal informativo

Entregable: Crear, editar, cancelar clases. Ver instancias generadas.



FASE 2 — Gestión de Alumnos (Día 6-7)

Objetivo: CRUD de alumnos e inscripciones.


Tarea	Detalle
API: CRUD de alumnos	Crear, leer, actualizar (sin eliminar)
API: Inscripciones	Inscribir, desinscribir, listar por clase
API: Lista de espera	Agregar/quitar cuando clase está llena
Frontend: Lista de alumnos	Tabla con búsqueda
Frontend: Formulario de alumno	Alta y edición
Frontend: Inscribir desde clase	Selector de alumnos + mostrar cupos
Frontend: Lista de espera	Indicador visual de posición

Entregable: Gestionar alumnos, inscribirlos a clases, manejar lista de espera.



FASE 3 — Vista de Agenda (Día 8-10)

Objetivo: Visualización semanal y mensual de la agenda.


Tarea	Detalle
API: Instancias en rango	GET /api/classes/instances?from=&to=
Frontend: Vista semanal	Grid de 7 columnas, clases como bloques coloreados
Frontend: Vista mensual	Calendario tipo Google Calendar
Diferenciación visual	Grupal vs privada (color, icono)
Click en clase	Modal/drawer con detalle + alumnos inscriptos
Navegación	Semana/mes anterior-siguiente, "Hoy"

Entregable: Agenda semanal y mensual funcional, interactiva.



FASE 4 — Dashboard + UX General (Día 11-12)

Objetivo: Pantalla principal con resumen + pulido general.


Tarea	Detalle
Dashboard	Clases de hoy, próximas clases, alumnos recientes
Estados vacíos	Mensajes amigables cuando no hay datos
Loading states	Skeletons, spinners
Manejo de errores	Toast notifications, páginas de error
Responsive	Test en mobile, tablet, desktop

Entregable: Experiencia completa usable desde celular.



FASE 5 — Backup + Deploy (Día 13-14)

Objetivo: Sistema en producción en VPS.


Tarea	Detalle
Script de backup	pg_dump automático diario a archivo
Endpoint de export	Descargar alumnos/clases como CSV
Configurar VPS	Ubuntu, Nginx reverse proxy, PM2, SSL (Let's Encrypt)
Script de deploy	Build + migración + restart
Variables de entorno	.env producción seguro
Health check endpoint	GET /api/health

Entregable: Sistema en producción, backups automáticos.



FASE 6 — v1.1: Recordatorios por WhatsApp (Día 15-19)

Objetivo: Notificaciones automáticas + sección de notificaciones manuales.


Tarea	Detalle
Configurar Twilio	Cuenta, WhatsApp Business sandbox/approval
Servicio de notificaciones	Envío de mensajes por WhatsApp
Sección "Notificaciones"	Lista de alumnos a notificar (ediciones, cancelaciones)
Envío manual	Seleccionar alumnos → enviar mensaje predefinido
Recordatorios automáticos	Cron job: X horas antes de cada clase
Configuración de timing	Profesor define cuánto antes (24h, 2h, etc.)
Templates de mensajes	"Hola {nombre}, recordá que mañana a las {hora} tenés {clase}"
Log de envíos	Historial de mensajes enviados

Entregable: Recordatorios automáticos + envío manual de notificaciones.



Cronograma Visual

text
text
Día  1-2   ████░░░░░░░░░░░░░░░  Fase 0: Fundación
Día  3-5   ░░░░█████░░░░░░░░░░  Fase 1: Clases
Día  6-7   ░░░░░░░░░██░░░░░░░░  Fase 2: Alumnos
Día  8-10  ░░░░░░░░░░░████░░░░  Fase 3: Agenda
Día 11-12  ░░░░░░░░░░░░░░██░░░  Fase 4: Dashboard
Día 13-14  ░░░░░░░░░░░░░░░░██░  Fase 5: Deploy
           ──── v1.0 listo ────
Día 15-19  ░░░░░░░░░░░░░░░░░███  Fase 6: WhatsApp (v1.1)

v1.0 en ~2 semanas. v1.1 completa en ~3 semanas.



Decisiones de Diseño Propuestas (estilo Hims)

Como no pudimos acceder al link de Mobbin, propongo esta dirección basada en el estilo Hims (wellness, limpio, médico-moderno):


Elemento	Decisión
Tipografía	Plus Jakarta Sans (display) + Inter (body) — limpio, legible, moderno
Colores	Fondo: #FAFAF8 (off-white cálido). Superficie: #FFFFFF. Texto: #1A1A1A. Acento: #2D5A3D (verde wellness). Secundario: #E8E4DF (beige). Error: #C44536.
Bordes	Redondeados (border-radius: 12px), sutiles (border: 1px solid #E8E4DF)
Espaciado	Generoso, mucho whitespace, sensación de calma
Sombras	Mínimas, solo en cards y modales
Iconos	Lucide React (consistente, lineal, limpio)
Tono general	Sereno, profesional, sin ruido visual

¿Te resuena esta dirección o preferís ajustar algo? (Si podés capturar screenshots del link de Hims que te gustó, me ayudaría mucho a ajustar el estilo exacto.)



Resumen Ejecutivo

Aspecto	Detalle
Qué se construye	Sistema web de gestión de reservas para profesor de pilates
Para quién	1 profesor independiente, ~40 clases/semana
Stack	React + Vite + TS / Node + Express + Prisma / PostgreSQL
v1.0	Agenda + Clases + Alumnos + Lista de espera + Backup
v1.1	Recordatorios WhatsApp + Notificaciones manuales
Tiempo estimado	2 semanas (v1.0) + 1 semana (v1.1)
Deploy	VPS propio, Nginx + PM2

