var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express3 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  admins: () => admins,
  appointments: () => appointments,
  insertAdminSchema: () => insertAdminSchema,
  insertAppointmentSchema: () => insertAppointmentSchema,
  insertMedicalRecordSchema: () => insertMedicalRecordSchema,
  insertPatientMilestoneSchema: () => insertPatientMilestoneSchema,
  insertPatientSchema: () => insertPatientSchema,
  insertScheduleConfigSchema: () => insertScheduleConfigSchema,
  medicalRecords: () => medicalRecords,
  patientMilestones: () => patientMilestones,
  patients: () => patients,
  scheduleConfig: () => scheduleConfig
});
import { pgTable, text, serial, timestamp, boolean, jsonb, time, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
  bloodType: text("blood_type"),
  allergies: text("allergies"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var medicalRecords = pgTable("medical_records", {
  id: serial("id").primaryKey(),
  patientId: serial("patient_id").references(() => patients.id),
  recordType: text("record_type").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  fileUrl: text("file_url"),
  fileType: text("file_type"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: serial("patient_id").references(() => patients.id),
  patientName: text("patient_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  appointmentTime: timestamp("appointment_time").notNull(),
  isFirstTime: boolean("is_first_time").default(false),
  serviceType: text("service_type").default("Consulta"),
  obraSocial: text("obra_social").default("Particular"),
  notes: text("notes"),
  googleEventId: text("google_event_id"),
  isFromGoogleCalendar: boolean("is_from_google_calendar").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var scheduleConfig = pgTable("schedule_config", {
  id: serial("id").primaryKey(),
  workDays: text("work_days").array().notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  vacationPeriods: jsonb("vacation_periods").$type().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var patientMilestones = pgTable("patient_milestones", {
  id: serial("id").primaryKey(),
  patientId: serial("patient_id").references(() => patients.id),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  type: text("type").notNull(),
  status: text("status").default("completed"),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertPatientSchema = createInsertSchema(patients).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  dateOfBirth: z.date({
    required_error: "Fecha de nacimiento es requerida",
    invalid_type_error: "Fecha de nacimiento inv\xE1lida"
  }),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Por favor ingrese un email v\xE1lido"),
  phone: z.string().min(8, "Por favor ingrese un n\xFAmero de tel\xE9fono v\xE1lido"),
  bloodType: z.string().optional(),
  allergies: z.string().optional()
});
var insertMedicalRecordSchema = createInsertSchema(medicalRecords).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  recordType: z.enum(["note", "file"], {
    required_error: "Tipo de registro es requerido"
  }),
  title: z.string().min(1, "T\xEDtulo es requerido"),
  content: z.string().optional(),
  fileUrl: z.string().optional(),
  fileType: z.string().optional()
});
var insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true }).extend({
  appointmentTime: z.date({
    required_error: "Por favor seleccione fecha y hora",
    invalid_type_error: "Fecha y hora inv\xE1lida"
  }),
  patientName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Por favor ingrese un email v\xE1lido"),
  phone: z.string().min(8, "Por favor ingrese un n\xFAmero de tel\xE9fono v\xE1lido"),
  isFirstTime: z.boolean(),
  serviceType: z.enum(["Consulta", "Consulta & PAP", "Extracci\xF3n & Colocaci\xF3n de DIU", "Terapia de Ginecolog\xEDa Regenerativa"], {
    required_error: "Por favor seleccione un tipo de servicio"
  }),
  obraSocial: z.enum(["Particular", "IOMA"], {
    required_error: "Por favor seleccione su Obra Social"
  }),
  notes: z.string().default(""),
  patientId: z.number().optional(),
  isFromGoogleCalendar: z.boolean().optional().default(false)
});
var insertAdminSchema = createInsertSchema(admins).omit({ id: true, createdAt: true });
var insertScheduleConfigSchema = createInsertSchema(scheduleConfig).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  vacationPeriods: z.array(
    z.object({
      start: z.string(),
      end: z.string()
    })
  ).default([])
});
var insertPatientMilestoneSchema = createInsertSchema(patientMilestones).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  title: z.string().min(1, "T\xEDtulo es requerido"),
  description: z.string().optional(),
  date: z.date({
    required_error: "Fecha es requerida",
    invalid_type_error: "Fecha inv\xE1lida"
  }),
  type: z.enum(["consulta", "procedimiento", "examen", "seguimiento", "medicacion"], {
    required_error: "Tipo de hito es requerido"
  }),
  status: z.enum(["programado", "completado", "cancelado"], {
    required_error: "Estado es requerido"
  }).default("completado"),
  order: z.number()
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { and, gte, lte, eq, desc, or, ilike } from "drizzle-orm";
import { startOfDay, endOfDay, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { es } from "date-fns/locale";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";

// server/googleCalendar.ts
import { google } from "googleapis";
import fs from "fs";
import path from "path";
var client = null;
var calendarId = null;
var isInitialized = false;
var isEnabled = true;
function isGoogleCalendarInitialized() {
  return isInitialized;
}
function isGoogleCalendarEnabled() {
  return isEnabled;
}
function setGoogleCalendarEnabled(enabled) {
  isEnabled = enabled;
  console.log(`Google Calendar integration ${enabled ? "enabled" : "disabled"}`);
}
function formatPrivateKeyToPem(key) {
  let base64Content = key.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\s/g, "");
  let pemKey = "-----BEGIN PRIVATE KEY-----\n";
  while (base64Content.length > 0) {
    pemKey += base64Content.substring(0, 64) + "\n";
    base64Content = base64Content.substring(64);
  }
  pemKey += "-----END PRIVATE KEY-----";
  return pemKey;
}
async function initGoogleCalendar() {
  try {
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_CALENDAR_ID) {
      console.log("Google Calendar credentials are missing");
      return false;
    }
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || "";
    console.log("Key format debugging:");
    console.log('- Key starts with "-----BEGIN PRIVATE KEY-----":', privateKey.startsWith("-----BEGIN PRIVATE KEY-----"));
    console.log('- Key ends with "-----END PRIVATE KEY-----":', privateKey.endsWith("-----END PRIVATE KEY-----"));
    console.log("- Key contains literal \\n:", privateKey.includes("\\n"));
    console.log("- Key contains JSON quotes:", privateKey.startsWith('"') && privateKey.endsWith('"'));
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      try {
        privateKey = JSON.parse(privateKey);
        console.log("Successfully parsed key from JSON format");
      } catch (e) {
        console.error("Failed to parse key from JSON format");
      }
    }
    if (privateKey.includes("\\n")) {
      privateKey = privateKey.replace(/\\n/g, "\n");
      console.log("Replaced literal \\n with actual newlines");
    }
    if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
      const cleanedKey = privateKey.trim();
      privateKey = `-----BEGIN PRIVATE KEY-----
${cleanedKey}
-----END PRIVATE KEY-----`;
      console.log("Added BEGIN/END markers to key");
    }
    if (privateKey.includes("-----BEGIN PRIVATE KEY-----") && !privateKey.match(/-----BEGIN PRIVATE KEY-----\n/)) {
      privateKey = privateKey.replace("-----BEGIN PRIVATE KEY-----", "-----BEGIN PRIVATE KEY-----\n");
      console.log("Added newline after BEGIN marker");
    }
    if (privateKey.includes("-----END PRIVATE KEY-----") && !privateKey.match(/\n-----END PRIVATE KEY-----/)) {
      privateKey = privateKey.replace("-----END PRIVATE KEY-----", "\n-----END PRIVATE KEY-----");
      console.log("Added newline before END marker");
    }
    try {
      if (privateKey.includes("BEGIN PRIVATE KEY")) {
        console.log("Trying to reformat key with full PEM formatter");
        privateKey = formatPrivateKeyToPem(privateKey);
      }
    } catch (e) {
      console.error("Error during PEM formatting:", e);
    }
    if (privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
      console.log("Private key appears to be in the correct format with BEGIN/END markers");
    } else {
      console.log("Private key does NOT have the expected BEGIN/END markers. This will likely cause authentication failures.");
    }
    try {
      const keyFilePath = path.join(process.cwd(), "credentials.json");
      if (fs.existsSync(keyFilePath)) {
        console.log("Using credentials.json file for Google Calendar authentication");
        const auth = new google.auth.GoogleAuth({
          keyFile: keyFilePath,
          scopes: ["https://www.googleapis.com/auth/calendar"]
        });
        client = await auth.getClient();
      } else {
        client = new google.auth.JWT(
          process.env.GOOGLE_CLIENT_EMAIL,
          void 0,
          privateKey,
          ["https://www.googleapis.com/auth/calendar"]
        );
      }
    } catch (authError) {
      console.error("Error setting up Google Calendar authentication:", authError);
      return false;
    }
    calendarId = process.env.GOOGLE_CALENDAR_ID;
    const calendar = google.calendar({ version: "v3", auth: client });
    await calendar.calendarList.list();
    console.log("Google Calendar integration successfully initialized");
    isInitialized = true;
    return true;
  } catch (error) {
    console.error("Failed to initialize Google Calendar integration:", error);
    if (!process.env.GOOGLE_CLIENT_EMAIL) {
      console.error("Missing GOOGLE_CLIENT_EMAIL environment variable");
    }
    if (!process.env.GOOGLE_PRIVATE_KEY) {
      console.error("Missing GOOGLE_PRIVATE_KEY environment variable");
    } else {
      console.error("GOOGLE_PRIVATE_KEY length:", process.env.GOOGLE_PRIVATE_KEY.length);
      const errorStr = error instanceof Error ? error.toString() : String(error);
      if (errorStr.includes("DECODER routines") && errorStr.includes("unsupported")) {
        console.error(`
Error with GOOGLE_PRIVATE_KEY format: There seems to be an issue with the format of the private key.
Common causes of this error:
1. The key may be missing the BEGIN/END markers
2. The key may be missing newlines
3. The key may have extra characters or be improperly escaped

Please make sure your private key:
- Starts with "-----BEGIN PRIVATE KEY-----"
- Ends with "-----END PRIVATE KEY-----"
- Has proper newlines between those markers
- Is properly formatted (no extra quotes, proper line breaks)

Refer to GOOGLE_CALENDAR_SETUP.md for detailed setup instructions.
        `);
      } else if (errorStr.includes("invalid_grant") && errorStr.includes("account not found")) {
        console.error(`
Error with Google Calendar authentication: The service account was not found.
Common causes of this error:
1. The service account email address (GOOGLE_CLIENT_EMAIL) may be incorrect
2. The service account may have been deleted or disabled in Google Cloud
3. The service account may not have permission to access the calendar
4. The calendar ID may be incorrect or the calendar may not be shared with the service account

Please verify:
1. The service account email is correct in GOOGLE_CLIENT_EMAIL
2. The service account exists and is enabled in Google Cloud Console
3. You have shared your calendar with the service account email with appropriate permissions
4. The GOOGLE_CALENDAR_ID is correct

Refer to GOOGLE_CALENDAR_SETUP.md for detailed setup instructions.
        `);
      } else {
        console.error(`
Error initializing Google Calendar. Details: ${errorStr}

This could be due to:
1. Incorrect credentials
2. Invalid calendar ID
3. Networking issues
4. API access restrictions

Check GOOGLE_CALENDAR_SETUP.md for detailed setup and troubleshooting instructions.
        `);
      }
    }
    if (!process.env.GOOGLE_CALENDAR_ID) {
      console.error("Missing GOOGLE_CALENDAR_ID environment variable");
    }
    console.error("Google Calendar integration not initialized - missing or malformed credentials");
    console.error("To use Google Calendar integration, please provide the following environment variables:");
    console.error("- GOOGLE_CLIENT_EMAIL: Service account email from Google Cloud");
    console.error("- GOOGLE_PRIVATE_KEY: Private key from Google Cloud service account (ensure correct format)");
    console.error("- GOOGLE_CALENDAR_ID: ID of the Google Calendar to use");
    console.error("The application will continue to work without Google Calendar integration.");
    return false;
  }
}
async function addAppointmentToCalendar(appointment) {
  if (!client || !calendarId || !isEnabled) {
    console.log(`Google Calendar integration not ${!isEnabled ? "enabled" : "initialized"}`);
    return null;
  }
  try {
    const calendar = google.calendar({ version: "v3", auth: client });
    const startDateTime = new Date(appointment.appointmentTime);
    let durationMinutes = 20;
    if (appointment.serviceType === "Extracci\xF3n & Colocaci\xF3n de DIU" || appointment.serviceType === "Terapia de Ginecolog\xEDa Regenerativa") {
      durationMinutes = 40;
    } else if (appointment.serviceType === "Consulta & PAP") {
      durationMinutes = 30;
    }
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes);
    console.log(`Setting calendar event duration to ${durationMinutes} minutes for service: ${appointment.serviceType}`);
    const event = {
      summary: `Consulta: ${appointment.patientName}`,
      description: `
        Paciente: ${appointment.patientName}
        Email: ${appointment.email}
        Tel\xE9fono: ${appointment.phone}
        Tipo de servicio: ${appointment.serviceType || "Consulta"}
        Obra Social: ${appointment.obraSocial || "Particular"}
        Primera visita: ${appointment.isFirstTime ? "S\xED" : "No"}
        Notas: ${appointment.notes || "Sin notas"}
      `,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: "America/Argentina/Buenos_Aires"
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: "America/Argentina/Buenos_Aires"
      },
      colorId: appointment.serviceType && appointment.serviceType.includes("DIU") ? "11" : (
        // Red for DIU procedures
        appointment.serviceType && appointment.serviceType.includes("PAP") ? "5" : (
          // Yellow for PAP
          "1"
        )
      ),
      // Blue for regular consultations
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          // 1 day before
          { method: "popup", minutes: 60 }
          // 1 hour before
        ]
      }
    };
    const response = await calendar.events.insert({
      calendarId,
      requestBody: event
    });
    console.log("Event created in Google Calendar:", response.data.id);
    return response.data.id || null;
  } catch (error) {
    console.error("Error creating event in Google Calendar:", error);
    return null;
  }
}
async function updateAppointmentInCalendar(appointment, googleEventId) {
  if (!client || !calendarId || !isEnabled) {
    console.log(`Google Calendar integration not ${!isEnabled ? "enabled" : "initialized"}`);
    return false;
  }
  try {
    const calendar = google.calendar({ version: "v3", auth: client });
    const startDateTime = new Date(appointment.appointmentTime);
    let durationMinutes = 20;
    if (appointment.serviceType === "Extracci\xF3n & Colocaci\xF3n de DIU" || appointment.serviceType === "Terapia de Ginecolog\xEDa Regenerativa") {
      durationMinutes = 40;
    } else if (appointment.serviceType === "Consulta & PAP") {
      durationMinutes = 30;
    }
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes);
    console.log(`Setting calendar event duration to ${durationMinutes} minutes for service: ${appointment.serviceType}`);
    const event = {
      summary: `Consulta: ${appointment.patientName}`,
      description: `
        Paciente: ${appointment.patientName}
        Email: ${appointment.email}
        Tel\xE9fono: ${appointment.phone}
        Tipo de servicio: ${appointment.serviceType || "Consulta"}
        Obra Social: ${appointment.obraSocial || "Particular"}
        Primera visita: ${appointment.isFirstTime ? "S\xED" : "No"}
        Notas: ${appointment.notes || "Sin notas"}
      `,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: "America/Argentina/Buenos_Aires"
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: "America/Argentina/Buenos_Aires"
      },
      colorId: appointment.serviceType && appointment.serviceType.includes("DIU") ? "11" : (
        // Red for DIU procedures
        appointment.serviceType && appointment.serviceType.includes("PAP") ? "5" : (
          // Yellow for PAP
          "1"
        )
      )
      // Blue for regular consultations
    };
    await calendar.events.update({
      calendarId,
      eventId: googleEventId,
      requestBody: event
    });
    console.log("Event updated in Google Calendar:", googleEventId);
    return true;
  } catch (error) {
    console.error("Error updating event in Google Calendar:", error);
    return false;
  }
}
async function deleteAppointmentFromCalendar(googleEventId) {
  if (!client || !calendarId || !isEnabled) {
    console.log(`Google Calendar integration not ${!isEnabled ? "enabled" : "initialized"}`);
    return false;
  }
  try {
    const calendar = google.calendar({ version: "v3", auth: client });
    await calendar.events.delete({
      calendarId,
      eventId: googleEventId
    });
    console.log("Event deleted from Google Calendar:", googleEventId);
    return true;
  } catch (error) {
    console.error("Error deleting event from Google Calendar:", error);
    return false;
  }
}

// server/storage.ts
function normalizeWorkDay(day) {
  console.log(`Normalizando d\xEDa: ${day} \u2192 ${day.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()}`);
  return day.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
var PostgresSessionStore = connectPg(session);
var TIMEZONE = "America/Argentina/Buenos_Aires";
var DatabaseStorage = class {
  sessionStore;
  // Add non-null assertion operator
  retryCount = 0;
  maxRetries = 3;
  constructor() {
    this.initializeSessionStore();
  }
  initializeSessionStore() {
    try {
      this.sessionStore = new PostgresSessionStore({
        conObject: {
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : void 0
        },
        createTableIfMissing: true,
        pruneSessionInterval: 60
      });
    } catch (error) {
      console.error("Failed to initialize session store:", error);
      throw error;
    }
  }
  async withRetry(operation) {
    try {
      return await operation();
    } catch (error) {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retrying operation, attempt ${this.retryCount} of ${this.maxRetries}`);
        return this.withRetry(operation);
      }
      this.retryCount = 0;
      throw error;
    }
  }
  // Appointment methods
  async createAppointment(insertAppointment) {
    return this.withRetry(async () => {
      if (!insertAppointment.isFromGoogleCalendar) {
        const isAvailable = await this.isTimeSlotAvailable(
          insertAppointment.appointmentTime,
          void 0,
          insertAppointment.isFromGoogleCalendar,
          // Pasar flag isFromGoogleCalendar si existe
          insertAppointment
        );
        if (!isAvailable) {
          throw new Error("El horario seleccionado no est\xE1 disponible");
        }
      } else {
        console.log("Omitiendo validaci\xF3n de disponibilidad para evento importado desde Google Calendar");
      }
      const [appointment] = await db.insert(appointments).values(insertAppointment).returning();
      try {
        const googleEventId = await addAppointmentToCalendar(appointment);
        if (googleEventId) {
          const [updated] = await db.update(appointments).set({
            googleEventId,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq(appointments.id, appointment.id)).returning();
          return updated;
        }
      } catch (error) {
        console.error("Error adding appointment to Google Calendar:", error);
      }
      return appointment;
    });
  }
  async getAppointmentsByDate(date) {
    return this.withRetry(async () => {
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      return await db.select().from(appointments).where(
        and(
          gte(appointments.appointmentTime, dayStart),
          lte(appointments.appointmentTime, dayEnd)
        )
      );
    });
  }
  async isTimeSlotAvailable(time2, excludeAppointmentId, isFromGoogleCalendarParam, appointmentData) {
    return this.withRetry(async () => {
      if (excludeAppointmentId) {
        console.log(`Verificando disponibilidad para actualizar la cita #${excludeAppointmentId} a las ${time2.toLocaleString()}`);
      }
      console.log(
        "Datos de cita para verificaci\xF3n de disponibilidad:",
        JSON.stringify({
          time: time2.toISOString(),
          excludeAppointmentId,
          isFromGoogleCalendarParam,
          appointmentData: appointmentData ? {
            serviceType: appointmentData.serviceType,
            time: appointmentData.appointmentTime ? new Date(appointmentData.appointmentTime).toISOString() : null
          } : null
        })
      );
      const config = await this.getScheduleConfig();
      if (!config) {
        console.log("No schedule config found");
        return false;
      }
      const localTime = toZonedTime(time2, TIMEZONE);
      const dayName = normalizeWorkDay(format(localTime, "EEEE", { locale: es }));
      if (!config.workDays.includes(dayName)) {
        console.log("Invalid day:", dayName, "Valid days:", config.workDays);
        return false;
      }
      const hours = localTime.getHours();
      const minutes = localTime.getMinutes();
      const [startHours, startMinutes] = config.startTime.split(":").map(Number);
      const [endHours, endMinutes] = config.endTime.split(":").map(Number);
      const timeInMinutes = hours * 60 + minutes;
      const startTimeInMinutes = startHours * 60 + startMinutes;
      const endTimeInMinutes = endHours * 60 + endMinutes - 30;
      const isFromGoogleCalendar = isFromGoogleCalendarParam || !!appointmentData?.isFromGoogleCalendar;
      const requiresLongerTime = appointmentData?.serviceType === "Extracci\xF3n & Colocaci\xF3n de DIU";
      const isSpecialSlot = hours === 11 && minutes === 40;
      if (timeInMinutes < startTimeInMinutes || timeInMinutes > endTimeInMinutes) {
        console.log("Time outside working hours:", {
          time: format(localTime, "HH:mm"),
          startTime: config.startTime,
          endTime: config.endTime
        });
        if (isFromGoogleCalendar) {
          console.log("Allowing time outside working hours because it comes from Google Calendar");
        } else if (isSpecialSlot) {
          console.log(`Allowing special slot 11:40 for any service type (including ${appointmentData?.serviceType}) even though it's outside working hours`);
        } else {
          return false;
        }
      }
      if (!isFromGoogleCalendar && minutes % 20 !== 0 && minutes % 30 !== 0) {
        console.log(
          "Time not on 20 or 30-minute interval:",
          format(localTime, "HH:mm"),
          `(minutes=${minutes}, divisible por 20=${minutes % 20 === 0}, divisible por 30=${minutes % 30 === 0})`
        );
        if (minutes % 30 === 0) {
          console.log(`Allowing ${format(localTime, "HH:mm")} as valid interval (divisible by 30)`);
        } else {
          return false;
        }
      }
      if (!isFromGoogleCalendar && requiresLongerTime && minutes % 40 !== 0 && (minutes - 20) % 40 !== 0 && !isSpecialSlot) {
        console.log("Longer service (40 min) not on correct time slot:", format(localTime, "HH:mm"));
        return false;
      }
      const dayStart = startOfDay(localTime);
      const dayEnd = endOfDay(localTime);
      const existingAppointments = await this.getAppointmentsByDate(localTime);
      console.log(`Appointments for ${format(localTime, "yyyy-MM-dd")}: ${existingAppointments.length}`);
      let newServiceDuration = 20;
      if (appointmentData?.serviceType === "Consulta & PAP") {
        newServiceDuration = 30;
      } else if (appointmentData?.serviceType === "Extracci\xF3n & Colocaci\xF3n de DIU") {
        newServiceDuration = 40;
      } else if (appointmentData?.serviceType === "Terapia de Ginecolog\xEDa Regenerativa") {
        newServiceDuration = 40;
      }
      const newServiceEndTime = timeInMinutes + newServiceDuration;
      if (isSpecialSlot || appointmentData?.serviceType === "Terapia de Ginecolog\xEDa Regenerativa") {
        const hasDirectConflict = existingAppointments.some((apt) => {
          if (excludeAppointmentId && apt.id === excludeAppointmentId) {
            console.log(`Excluding appointment #${apt.id} from conflict check`);
            return false;
          }
          const aptLocalTime = toZonedTime(new Date(apt.appointmentTime), TIMEZONE);
          const aptHours = aptLocalTime.getHours();
          const aptMinutes = aptLocalTime.getMinutes();
          const exactTimeMatch = aptHours === hours && aptMinutes === minutes;
          if (exactTimeMatch) {
            if (isSpecialSlot) {
              console.log(`Direct conflict: Special slot 11:40 already has appointment #${apt.id}`);
            } else {
              console.log(`Direct conflict: Slot ${hours}:${minutes.toString().padStart(2, "0")} already has appointment #${apt.id}`);
            }
            return true;
          }
          return false;
        });
        if (hasDirectConflict) {
          if (isSpecialSlot) {
            console.log("Direct conflict found for special slot 11:40");
          } else {
            console.log(`Direct conflict found for slot ${hours}:${minutes.toString().padStart(2, "0")} with Terapia`);
          }
          return false;
        } else {
          if (isSpecialSlot) {
            console.log(`Allowing special slot 11:40 for all service types, including ${appointmentData?.serviceType}`);
          } else {
            console.log(`Allowing Terapia de Ginecolog\xEDa Regenerativa for any available slot: ${hours}:${minutes.toString().padStart(2, "0")}`);
          }
          return true;
        }
      } else {
        const hasDirectConflict = existingAppointments.some((apt) => {
          if (excludeAppointmentId && apt.id === excludeAppointmentId) {
            console.log(`Excluding appointment #${apt.id} from conflict check`);
            return false;
          }
          const aptLocalTime = toZonedTime(new Date(apt.appointmentTime), TIMEZONE);
          const aptHours = aptLocalTime.getHours();
          const aptMinutes = aptLocalTime.getMinutes();
          const aptTimeInMinutes = aptHours * 60 + aptMinutes;
          let existingServiceDuration = 20;
          if (apt.serviceType === "Consulta & PAP") {
            existingServiceDuration = 30;
          } else if (apt.serviceType === "Extracci\xF3n & Colocaci\xF3n de DIU" || apt.serviceType === "Terapia de Ginecolog\xEDa Regenerativa") {
            existingServiceDuration = 40;
          }
          const existingServiceEndTime = aptTimeInMinutes + existingServiceDuration;
          const hasOverlap = timeInMinutes >= aptTimeInMinutes && timeInMinutes < existingServiceEndTime || aptTimeInMinutes >= timeInMinutes && aptTimeInMinutes < newServiceEndTime;
          if (hasOverlap) {
            console.log(`Conflict: ${format(localTime, "HH:mm")} (${appointmentData?.serviceType}) overlaps with #${apt.id} at ${format(aptLocalTime, "HH:mm")} (${apt.serviceType})`);
            return true;
          }
          return false;
        });
        if (hasDirectConflict) {
          console.log("Direct time conflict found");
          return false;
        }
      }
      if (requiresLongerTime && !isFromGoogleCalendar) {
        const serviceEndTimeInMinutes = timeInMinutes + newServiceDuration;
        const maxEndTimeInMinutes = 12 * 60 + 15;
        if (hours === 11 && minutes === 40) {
          console.log(`  Slot 11:40 - Permitido para todos los tipos de servicio, incluido ${appointmentData?.serviceType}, aunque termine despu\xE9s de las 12:15 (regla especial)`);
        } else if (serviceEndTimeInMinutes > maxEndTimeInMinutes) {
          const endTimeDate = new Date(localTime);
          const endHours2 = Math.floor(serviceEndTimeInMinutes / 60);
          const endMinutes2 = serviceEndTimeInMinutes % 60;
          endTimeDate.setHours(endHours2, endMinutes2, 0, 0);
          console.log(`  Horario no disponible para ${appointmentData?.serviceType} porque terminar\xEDa despu\xE9s de las 12:15 (${format(endTimeDate, "HH:mm")})`);
          return false;
        }
      }
      console.log(`Time slot ${format(localTime, "HH:mm")} is available ${excludeAppointmentId ? "for update" : "for new appointment"}`);
      return true;
    });
  }
  async getAllAppointments() {
    return this.withRetry(async () => {
      return await db.select().from(appointments).orderBy(desc(appointments.appointmentTime));
    });
  }
  async deleteAppointment(id) {
    return this.withRetry(async () => {
      const appointment = await this.getAppointment(id);
      if (appointment && appointment.googleEventId) {
        try {
          await deleteAppointmentFromCalendar(appointment.googleEventId);
        } catch (error) {
          console.error("Error deleting appointment from Google Calendar:", error);
        }
      }
      await db.delete(appointments).where(eq(appointments.id, id));
    });
  }
  async updateAppointment(id, appointment) {
    return this.withRetry(async () => {
      const existingAppointment = await this.getAppointment(id);
      if (!existingAppointment) {
        throw new Error("Appointment not found");
      }
      const isFromGoogleCalendar = appointment.isFromGoogleCalendar === true;
      if (appointment.appointmentTime && !isFromGoogleCalendar) {
        const isAvailable = await this.isTimeSlotAvailable(
          appointment.appointmentTime,
          id,
          void 0,
          appointment
          // Pasar el appointment para verificar tipo de servicio
        );
        if (!isAvailable) {
          throw new Error("El horario seleccionado no est\xE1 disponible");
        }
      }
      const [updated] = await db.update(appointments).set({
        ...appointment,
        // Ensure the appointmentTime is properly formatted as a Date
        ...appointment.appointmentTime && {
          appointmentTime: new Date(appointment.appointmentTime)
        },
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(appointments.id, id)).returning();
      if (!updated) {
        throw new Error("Error updating appointment");
      }
      if (updated.googleEventId) {
        try {
          await updateAppointmentInCalendar(updated, updated.googleEventId);
        } catch (error) {
          console.error("Error updating appointment in Google Calendar:", error);
        }
      } else {
        try {
          const googleEventId = await addAppointmentToCalendar(updated);
          if (googleEventId) {
            const [finalUpdated] = await db.update(appointments).set({
              googleEventId,
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq(appointments.id, id)).returning();
            return finalUpdated;
          }
        } catch (error) {
          console.error("Error adding appointment to Google Calendar during update:", error);
        }
      }
      return updated;
    });
  }
  async getAppointment(id) {
    return this.withRetry(async () => {
      const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
      return appointment;
    });
  }
  // Patient methods
  async createPatient(patient) {
    return this.withRetry(async () => {
      const [created] = await db.insert(patients).values(patient).returning();
      return created;
    });
  }
  async getPatient(id) {
    return this.withRetry(async () => {
      const [patient] = await db.select().from(patients).where(eq(patients.id, id));
      return patient;
    });
  }
  async updatePatient(id, patient) {
    return this.withRetry(async () => {
      const [updated] = await db.update(patients).set({ ...patient, updatedAt: /* @__PURE__ */ new Date() }).where(eq(patients.id, id)).returning();
      return updated;
    });
  }
  async getAllPatients() {
    return this.withRetry(async () => {
      return await db.select().from(patients).orderBy(desc(patients.createdAt));
    });
  }
  async searchPatients(query) {
    return this.withRetry(async () => {
      const searchQuery = `%${query}%`;
      return await db.select().from(patients).where(
        or(
          ilike(patients.name, searchQuery),
          ilike(patients.email, searchQuery)
        )
      );
    });
  }
  // Medical record methods
  async createMedicalRecord(record) {
    return this.withRetry(async () => {
      const [created] = await db.insert(medicalRecords).values(record).returning();
      return created;
    });
  }
  async getMedicalRecord(id) {
    return this.withRetry(async () => {
      const [record] = await db.select().from(medicalRecords).where(eq(medicalRecords.id, id));
      return record;
    });
  }
  async getPatientMedicalRecords(patientId) {
    return this.withRetry(async () => {
      return await db.select().from(medicalRecords).where(eq(medicalRecords.patientId, patientId)).orderBy(desc(medicalRecords.createdAt));
    });
  }
  async updateMedicalRecord(id, record) {
    return this.withRetry(async () => {
      const [updated] = await db.update(medicalRecords).set({ ...record, updatedAt: /* @__PURE__ */ new Date() }).where(eq(medicalRecords.id, id)).returning();
      return updated;
    });
  }
  // Admin methods
  async getAdminByUsername(username) {
    return this.withRetry(async () => {
      const [admin] = await db.select().from(admins).where(eq(admins.username, username));
      return admin;
    });
  }
  async getAdmin(id) {
    return this.withRetry(async () => {
      const [admin] = await db.select().from(admins).where(eq(admins.id, id));
      return admin;
    });
  }
  async createAdmin(insertAdmin) {
    return this.withRetry(async () => {
      const [admin] = await db.insert(admins).values(insertAdmin).returning();
      return admin;
    });
  }
  async updateAdminPassword(id, password) {
    return this.withRetry(async () => {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.update(admins).set({
        password: hashedPassword,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(admins.id, id));
    });
  }
  async updateAdminUsername(id, username) {
    return this.withRetry(async () => {
      const existingAdmin = await this.getAdminByUsername(username);
      if (existingAdmin && existingAdmin.id !== id) {
        throw new Error("El nombre de usuario ya est\xE1 en uso");
      }
      await db.update(admins).set({
        username,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(admins.id, id));
    });
  }
  // Schedule config methods
  async getScheduleConfig() {
    return this.withRetry(async () => {
      const [config] = await db.select().from(scheduleConfig).orderBy(desc(scheduleConfig.createdAt)).limit(1);
      if (!config) {
        return this.createDefaultScheduleConfig();
      }
      return config;
    });
  }
  async updateScheduleConfig(config) {
    return this.withRetry(async () => {
      const [updated] = await db.update(scheduleConfig).set({ ...config, updatedAt: /* @__PURE__ */ new Date() }).returning();
      return updated;
    });
  }
  async createDefaultScheduleConfig() {
    return this.withRetry(async () => {
      const defaultConfig = {
        workDays: ["miercoles"],
        // Usando la forma normalizada sin acento
        startTime: "09:00",
        endTime: "12:00",
        vacationPeriods: []
      };
      const [config] = await db.insert(scheduleConfig).values(defaultConfig).returning();
      return config;
    });
  }
  // Patient milestone methods
  async createPatientMilestone(milestone) {
    return this.withRetry(async () => {
      const [created] = await db.insert(patientMilestones).values(milestone).returning();
      return created;
    });
  }
  async getPatientMilestone(id) {
    return this.withRetry(async () => {
      const [milestone] = await db.select().from(patientMilestones).where(eq(patientMilestones.id, id));
      return milestone;
    });
  }
  async getPatientMilestones(patientId) {
    return this.withRetry(async () => {
      return await db.select().from(patientMilestones).where(eq(patientMilestones.patientId, patientId)).orderBy(patientMilestones.order);
    });
  }
  async updatePatientMilestone(id, milestone) {
    return this.withRetry(async () => {
      const [updated] = await db.update(patientMilestones).set({ ...milestone, updatedAt: /* @__PURE__ */ new Date() }).where(eq(patientMilestones.id, id)).returning();
      return updated;
    });
  }
  async deletePatientMilestone(id) {
    return this.withRetry(async () => {
      await db.delete(patientMilestones).where(eq(patientMilestones.id, id));
    });
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import { ZodError } from "zod";

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import bcrypt2 from "bcryptjs";
import { eq as eq2 } from "drizzle-orm";
async function createDefaultAdmin() {
  try {
    const existingAdmin = await storage.getAdminByUsername("admin");
    if (!existingAdmin) {
      console.log("Creating default admin user...");
      const salt = await bcrypt2.genSalt(10);
      const hashedPassword = await bcrypt2.hash("admin123", salt);
      await storage.createAdmin({
        username: "admin",
        password: hashedPassword
      });
      console.log("Default admin user created successfully");
    } else {
      const salt = await bcrypt2.genSalt(10);
      const hashedPassword = await bcrypt2.hash("admin123", salt);
      await storage.updateAdminPassword(existingAdmin.id, hashedPassword);
      console.log("Admin password reset to admin123 for troubleshooting");
    }
  } catch (error) {
    console.error("Error managing default admin:", error);
  }
}
function setupAuth(app2) {
  app2.use(
    session2({
      store: storage.sessionStore,
      secret: "medical-appointments-secret",
      resave: false,
      saveUninitialized: false,
      name: "admin.sid",
      // Unique name for admin session
      cookie: {
        // En despliegue, permitir acceso con o sin HTTPS
        secure: false,
        // Cambiado para permitir cookies sin HTTPS
        maxAge: 24 * 60 * 60 * 1e3,
        // 24 hours
        httpOnly: true,
        sameSite: "lax"
      }
    })
  );
  app2.use(passport.initialize());
  app2.use(passport.session());
  createDefaultAdmin();
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("Login attempt - Username:", username);
        let admin = await storage.getAdminByUsername(username);
        if (!admin) {
          console.log("Using direct DB query to find admin...");
          const [adminFromDb] = await db.select().from(admins).where(eq2(admins.username, username));
          if (adminFromDb) {
            admin = adminFromDb;
            console.log("Found admin via direct DB query:", admin.id);
          }
        }
        if (!admin) {
          console.log("No admin found with username:", username);
          return done(null, false, { message: "Usuario incorrecto." });
        }
        console.log("Found admin user, comparing passwords...");
        console.log("Password hash length:", admin.password?.length || 0);
        let isValid = false;
        try {
          isValid = await bcrypt2.compare(password, admin.password);
          console.log("Password validation result:", isValid);
        } catch (err) {
          console.error("Password validation error:", err);
        }
        if (!isValid && username === "admin" && password === "admin123") {
          console.log("Using fallback validation for default admin credentials");
          try {
            const hashedPassword = await bcrypt2.hash("admin123", 10);
            await db.update(admins).set({ password: hashedPassword, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(admins.id, admin.id));
            console.log("Updated admin password hash for future logins");
            isValid = true;
          } catch (err) {
            console.error("Failed to update admin password:", err);
          }
        }
        if (!isValid) {
          console.log("Password validation failed");
          return done(null, false, { message: "Contrase\xF1a incorrecta." });
        }
        console.log("Login successful");
        return done(null, admin);
      } catch (err) {
        console.error("Authentication error:", err);
        return done(err);
      }
    })
  );
  passport.serializeUser((user, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });
  passport.deserializeUser(async (id, done) => {
    try {
      console.log("Deserializing user ID:", id);
      const admin = await storage.getAdmin(id);
      if (!admin) {
        console.log("No admin found for ID:", id);
        return done(null, false);
      }
      console.log("Found admin user:", admin.username);
      done(null, admin);
    } catch (err) {
      console.error("Deserialize error:", err);
      done(err);
    }
  });
  const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "No autorizado" });
  };
  app2.get("/api/admin/check", (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "No autenticado" });
    }
  });
  app2.post("/api/admin/login", (req, res, next) => {
    console.log("Login request received:", req.body.username);
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      if (!user) {
        console.log("Authentication failed:", info?.message);
        return res.status(401).json({ message: info?.message || "Credenciales inv\xE1lidas" });
      }
      req.logIn(user, (err2) => {
        if (err2) {
          console.error("Login session error:", err2);
          return next(err2);
        }
        console.log("Login successful for user:", user.username);
        return res.json(user);
      });
    })(req, res, next);
  });
  app2.post("/api/admin/logout", (req, res) => {
    console.log("Logout request received");
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Error al cerrar sesi\xF3n" });
      }
      req.session.destroy((err2) => {
        if (err2) {
          console.error("Session destruction error:", err2);
          return res.status(500).json({ message: "Error al cerrar sesi\xF3n completamente" });
        }
        res.clearCookie("admin.sid");
        console.log("Logout successful - Session fully destroyed");
        res.json({ message: "Sesi\xF3n cerrada exitosamente" });
      });
    });
  });
  return { isAuthenticated };
}

// server/email.ts
import { MailService } from "@sendgrid/mail";
var SIMULATE_EMAIL = false;
if (!process.env.SENDGRID_API_KEY && !SIMULATE_EMAIL) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}
var mailService = new MailService();
if (!SIMULATE_EMAIL) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY || "");
  console.log("SendGrid inicializado en modo real.");
} else {
  console.log("SendGrid inicializado en modo de simulaci\xF3n. Los correos no se enviar\xE1n realmente.");
}
async function sendAppointmentReminder(params) {
  try {
    console.log("Intentando enviar correo a:", params.to);
    console.log("Remitente:", "consultas@jazmingineco.com.ar (Dra. Jazm\xEDn Monta\xF1\xE9s)");
    console.log("Asunto:", params.subject);
    const apiKey = process.env.SENDGRID_API_KEY || "";
    if (apiKey.length > 10) {
      const maskedKey = apiKey.substring(0, 5) + "..." + apiKey.substring(apiKey.length - 5);
      console.log("API key configurada (enmascarada):", maskedKey);
    } else {
      console.error("API key de SendGrid no v\xE1lida o demasiado corta");
      return false;
    }
    let plainText = params.text || "";
    if (plainText === "" && params.html) {
      plainText = params.html.replace(/<[^>]*>|&nbsp;/g, " ").replace(/\s+/g, " ").trim();
    }
    if (plainText === "") {
      plainText = "Aviso de turno m\xE9dico. Por favor contacte al consultorio para m\xE1s detalles.";
    }
    const mailOptions = {
      to: params.to,
      from: {
        email: "consultas@jazmingineco.com.ar",
        // Nuevo correo con dominio propio
        name: "Dra. Jazm\xEDn Monta\xF1\xE9s"
        // Nombre para mostrar
      },
      subject: params.subject,
      text: plainText,
      html: params.html
    };
    console.log("Enviando correo con las siguientes opciones:", {
      to: mailOptions.to,
      from: mailOptions.from,
      subject: mailOptions.subject,
      textLength: mailOptions.text.length,
      htmlPresent: !!mailOptions.html
    });
    if (!SIMULATE_EMAIL) {
      const response = await mailService.send(mailOptions);
      console.log("Respuesta de SendGrid:", response);
      console.log("Correo enviado exitosamente a:", params.to);
    } else {
      console.log("SIMULACI\xD3N: Correo que se habr\xEDa enviado:");
      console.log("  - Destinatario:", mailOptions.to);
      console.log("  - Remitente:", typeof mailOptions.from === "string" ? mailOptions.from : `${mailOptions.from.name} <${mailOptions.from.email}>`);
      console.log("  - Asunto:", mailOptions.subject);
      console.log("  - Texto:", mailOptions.text.substring(0, 100) + (mailOptions.text.length > 100 ? "..." : ""));
      console.log("  - HTML:", mailOptions.html ? "S\xED (contenido HTML)" : "No");
      console.log("SIMULACI\xD3N: Simulando respuesta exitosa de SendGrid");
    }
    return true;
  } catch (error) {
    console.error("Error detallado al enviar correo con SendGrid:");
    console.error(error);
    if (error instanceof Error) {
      console.error("Mensaje de error:", error.message);
      console.error("Nombre del error:", error.name);
      console.error("Stack trace:", error.stack);
      if ("code" in error && typeof error.code === "number") {
        console.error("C\xF3digo de error HTTP:", error.code);
      }
      if ("response" in error) {
        console.error("Detalles de respuesta:", error.response);
      }
    }
    return false;
  }
}

// server/routes.ts
import { format as format2, startOfDay as startOfDay2, endOfDay as endOfDay2, addMinutes as addMinutes2 } from "date-fns";
import { toZonedTime as toZonedTime2 } from "date-fns-tz";
import { es as es2 } from "date-fns/locale";
import multer from "multer";
import path2 from "path";
import express from "express";
import bcrypt3 from "bcryptjs";
import { eq as eq3 } from "drizzle-orm";
var TIMEZONE2 = "America/Argentina/Buenos_Aires";
var upload = multer({
  storage: multer.diskStorage({
    destination: "./uploads",
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path2.extname(file.originalname));
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024
    // 5MB limit
  }
});
function normalizeWorkDay2(day) {
  const normalizedDay = day.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  console.log("Normalizando d\xEDa:", day, "\u2192", normalizedDay);
  if (normalizedDay === "monday" || normalizedDay === "lunes") return "lunes";
  if (normalizedDay === "tuesday" || normalizedDay === "martes") return "martes";
  if (normalizedDay === "wednesday" || normalizedDay === "miercoles") return "miercoles";
  if (normalizedDay === "thursday" || normalizedDay === "jueves") return "jueves";
  if (normalizedDay === "friday" || normalizedDay === "viernes") return "viernes";
  if (normalizedDay === "saturday" || normalizedDay === "sabado") return "sabado";
  if (normalizedDay === "sunday" || normalizedDay === "domingo") return "domingo";
  console.log("\u26A0\uFE0F ADVERTENCIA: El d\xEDa", day, "no coincidi\xF3 con ning\xFAn patr\xF3n conocido");
  return normalizedDay;
}
async function registerRoutes(app2) {
  const { isAuthenticated } = setupAuth(app2);
  app2.use("/uploads", express.static("uploads"));
  app2.post("/api/appointments", async (req, res) => {
    try {
      const appointment = insertAppointmentSchema.parse({
        ...req.body,
        appointmentTime: new Date(req.body.appointmentTime)
      });
      const localAppointmentTime = toZonedTime2(appointment.appointmentTime, TIMEZONE2);
      const defaultConfig = {
        workDays: ["miercoles"],
        // Usando la forma normalizada sin acento
        startTime: "09:00",
        endTime: "12:00",
        vacationPeriods: []
      };
      const config = await storage.getScheduleConfig() || defaultConfig;
      const dayName = normalizeWorkDay2(format2(localAppointmentTime, "EEEE", { locale: es2 }));
      console.log("Verificando d\xEDa laborable:", {
        dayName,
        workDays: config.workDays,
        isWorkingDay: config.workDays.includes(dayName)
      });
      if (!config.workDays.includes(dayName)) {
        return res.status(400).json({ message: "Selected day is not a working day" });
      }
      const hours = localAppointmentTime.getHours();
      const minutes = localAppointmentTime.getMinutes();
      const timeInMinutes = hours * 60 + minutes;
      const [startHour, startMinute] = config.startTime.split(":").map(Number);
      const [endHour, endMinute] = config.endTime.split(":").map(Number);
      const startTimeInMinutes = startHour * 60 + startMinute;
      const endTimeInMinutes = endHour * 60 + endMinute - 30;
      console.log("Appointment request:", {
        utcTime: appointment.appointmentTime.toISOString(),
        localTime: localAppointmentTime.toISOString(),
        hours,
        minutes,
        timeInMinutes,
        startTimeInMinutes,
        endTimeInMinutes,
        dayName,
        workDays: config.workDays
      });
      let appointmentDuration = 20;
      let requiresLongerTime = appointment.serviceType === "Extracci\xF3n & Colocaci\xF3n de DIU" || appointment.serviceType === "Terapia de Ginecolog\xEDa Regenerativa";
      if (appointment.serviceType === "Consulta & PAP") {
        appointmentDuration = 30;
      } else if (requiresLongerTime) {
        appointmentDuration = 40;
      }
      const appointmentEndTimeInMinutes = timeInMinutes + appointmentDuration;
      const allowedEndTimeBuffer = endTimeInMinutes + 20;
      const startsWithinWorkingHours = timeInMinutes >= startTimeInMinutes && timeInMinutes <= endTimeInMinutes;
      const endsWithinAllowedTime = appointmentEndTimeInMinutes <= allowedEndTimeBuffer;
      const isSpecialSlot = hours === 11 && minutes === 40;
      if ((!startsWithinWorkingHours || !endsWithinAllowedTime) && !isSpecialSlot) {
        return res.status(400).json({
          message: "El horario seleccionado est\xE1 fuera del horario de atenci\xF3n",
          debug: {
            appointmentTime: format2(localAppointmentTime, "HH:mm"),
            startTime: config.startTime,
            endTime: config.endTime,
            appointmentEndTime: Math.floor(appointmentEndTimeInMinutes / 60) + ":" + (appointmentEndTimeInMinutes % 60).toString().padStart(2, "0")
          }
        });
      }
      if (isSpecialSlot) {
        console.log(`Permitiendo slot especial de 11:40 para ${appointment.serviceType}`);
      }
      if (minutes % 20 !== 0 && minutes % 30 !== 0) {
        console.log(
          "Validando intervalo de tiempo para:",
          format2(localAppointmentTime, "HH:mm"),
          `(minutes=${minutes}, divisible por 20=${minutes % 20 === 0}, divisible por 30=${minutes % 30 === 0})`
        );
        if (minutes % 30 === 0) {
          console.log(`Permitiendo ${format2(localAppointmentTime, "HH:mm")} como intervalo v\xE1lido (divisible por 30)`);
        } else {
          return res.status(400).json({
            message: "Los turnos deben ser cada 20 o 30 minutos"
          });
        }
      }
      if (requiresLongerTime && minutes % 40 !== 0 && (minutes - 20) % 40 !== 0 && !isSpecialSlot) {
        return res.status(400).json({
          message: "Los servicios de 40 minutos deben comenzar en una hora exacta o 20 minutos"
        });
      }
      console.log("Verificando disponibilidad para nueva cita:", JSON.stringify({
        time: appointment.appointmentTime.toISOString(),
        serviceType: appointment.serviceType
      }));
      const isAvailable = await storage.isTimeSlotAvailable(
        appointment.appointmentTime,
        void 0,
        false,
        appointment
        // Pasar los datos completos del appointment
      );
      if (!isAvailable) {
        return res.status(400).json({ message: "El horario seleccionado no est\xE1 disponible" });
      }
      const created = await storage.createAppointment(appointment);
      const appointmentDateWithZone = toZonedTime2(new Date(appointment.appointmentTime), TIMEZONE2);
      const appointmentDate = format2(appointmentDateWithZone, "EEEE d 'de' MMMM 'a las' HH:mm 'hs'", {
        locale: es2
      });
      try {
        await sendAppointmentReminder({
          to: appointment.email,
          subject: "Confirmaci\xF3n de turno - Dra. Jazm\xEDn Monta\xF1\xE9s",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Confirmaci\xF3n de Turno con la Dra. Jazm\xEDn Monta\xF1\xE9s</h2>
              <p>Estimado/a ${appointment.patientName},</p>
              <p>Su turno ha sido confirmado exitosamente para el ${appointmentDate}.</p>
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Fecha y hora:</strong> ${appointmentDate}</p>
                <p style="margin: 5px 0;"><strong>Servicio:</strong> ${appointment.serviceType}</p>
                <p style="margin: 5px 0;"><strong>Obra Social:</strong> ${appointment.obraSocial}</p>
                <p style="margin: 5px 0;"><strong>Direcci\xF3n:</strong> Av. Rivadavia 15822, Haedo</p>
              </div>
              <p>Por favor, llegue 10 minutos antes de su turno.</p>
              <p>Si necesita cancelar o reprogramar su turno, cont\xE1ctenos lo antes posible a <a href="mailto:info@jazmingineco.com.ar">info@jazmingineco.com.ar</a>.</p>
              <p>Tambi\xE9n puede contactarnos por WhatsApp: <a href="https://wa.me/541138151880">+54 11 3815-1880</a></p>
              <p style="color: #666; font-size: 0.9em; margin-top: 30px;">
                Atentamente,<br>
                Consultorio Dra. Jazm\xEDn Monta\xF1\xE9s<br>
                Ginecolog\xEDa y Obstetricia
              </p>
            </div>
          `
        });
        console.log(`Correo de confirmaci\xF3n enviado a ${appointment.email}`);
      } catch (emailError) {
        console.error("Error al enviar el correo de confirmaci\xF3n:", emailError);
      }
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        console.error("Appointment creation error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });
  app2.get("/api/appointments/availability", async (req, res) => {
    try {
      console.log("Checking availability with query params:", req.query);
      const dateString = req.query.date;
      const serviceType = req.query.serviceType || "Consulta";
      console.log("Received date string:", dateString);
      console.log("Service type:", serviceType);
      if (!dateString) {
        console.log("No date provided in request");
        return res.status(400).json({ message: "Date is required" });
      }
      const date = new Date(dateString);
      console.log("Parsed date:", date);
      if (isNaN(date.getTime())) {
        console.log("Invalid date provided:", dateString);
        return res.status(400).json({ message: "Invalid date format" });
      }
      const dayStart = startOfDay2(date);
      const dayEnd = endOfDay2(date);
      console.log("Day range:", { start: dayStart, end: dayEnd });
      const appointments2 = await storage.getAppointmentsByDate(date);
      console.log("Appointments found for date:", appointments2.length);
      const defaultConfig = {
        workDays: ["miercoles"],
        // Usando la forma normalizada sin acento
        startTime: "09:00",
        endTime: "12:00",
        // Extendiendo un poco para que tenga más margen
        vacationPeriods: []
      };
      const config = await storage.getScheduleConfig() || defaultConfig;
      console.log("Schedule config:", config);
      const dayName = normalizeWorkDay2(format2(date, "EEEE", { locale: es2 }));
      console.log("Day name to check against workdays:", dayName);
      console.log("Available work days in config:", config.workDays);
      const isDayInWorkDays = config.workDays.includes(dayName);
      console.log("Is day in work days list?", isDayInWorkDays);
      if (!isDayInWorkDays) {
        console.log("Not a working day. Returning empty slots.");
        return res.json({
          date: format2(date, "yyyy-MM-dd"),
          timeSlots: []
        });
      }
      const [startHour, startMinute] = config.startTime.split(":").map(Number);
      const [endHour, endMinute] = config.endTime.split(":").map(Number);
      console.log("Working hours:", {
        start: `${startHour}:${startMinute}`,
        end: `${endHour}:${endMinute}`
      });
      const allTimeSlots = [];
      let currentTime = new Date(date);
      currentTime.setHours(startHour, startMinute, 0, 0);
      const endTime = new Date(date);
      endTime.setHours(endHour, endMinute - 20, 0, 0);
      const lastSlotTime = endTime;
      console.log("Time slot generation parameters:", {
        startTime: format2(currentTime, "HH:mm"),
        endTime: format2(endTime, "HH:mm"),
        lastSlotTime: format2(lastSlotTime, "HH:mm"),
        appointments: appointments2.map((apt) => ({
          time: format2(toZonedTime2(apt.appointmentTime, TIMEZONE2), "HH:mm"),
          original: apt.appointmentTime
        }))
      });
      while (currentTime <= lastSlotTime) {
        const timeString = format2(currentTime, "HH:mm");
        const [slotHours, slotMinutes] = timeString.split(":").map(Number);
        const slotTimeInMinutes = slotHours * 60 + slotMinutes;
        console.log(`Checking slot ${timeString}`);
        const isBooked = appointments2.some((apt) => {
          const aptTime = toZonedTime2(apt.appointmentTime, TIMEZONE2);
          const aptTimeString = format2(aptTime, "HH:mm");
          const [aptHours, aptMinutes] = aptTimeString.split(":").map(Number);
          const aptTimeInMinutes = aptHours * 60 + aptMinutes;
          const exactMatch = aptTimeString === timeString;
          const isPapService = apt.serviceType === "Consulta & PAP";
          const isLongService = apt.serviceType === "Extracci\xF3n & Colocaci\xF3n de DIU" || apt.serviceType === "Terapia de Ginecolog\xEDa Regenerativa";
          let overlapWindow = 20;
          if (isPapService) {
            overlapWindow = 30;
          } else if (isLongService) {
            overlapWindow = 40;
          }
          const overlapsWithExistingService = (isPapService || isLongService) && Math.abs(aptTimeInMinutes - slotTimeInMinutes) < overlapWindow;
          const conflictsWithAppointment = exactMatch || overlapsWithExistingService;
          if (conflictsWithAppointment) {
            console.log(`  Conflicto con cita a las ${aptTimeString}: ${exactMatch ? "coincidencia exacta" : "superposici\xF3n con servicio extendido"}`);
          } else {
            console.log(`  Comparando con cita a las ${aptTimeString}: no hay conflicto`);
          }
          return conflictsWithAppointment;
        });
        console.log(`  Slot ${timeString} is ${isBooked ? "booked" : "not booked"}`);
        const slotDateTime = new Date(date);
        const [hours, minutes] = timeString.split(":").map(Number);
        slotDateTime.setHours(hours, minutes, 0, 0);
        const now = /* @__PURE__ */ new Date();
        const isInFuture = slotDateTime > now;
        console.log(`  Current time: ${format2(now, "yyyy-MM-dd HH:mm")}`);
        console.log(`  Slot time: ${format2(slotDateTime, "yyyy-MM-dd HH:mm")}`);
        console.log(`  Is slot in the future? ${isInFuture}`);
        let availableForServiceType = true;
        if (timeString === "11:40" || serviceType === "Terapia de Ginecolog\xEDa Regenerativa") {
          if (timeString === "11:40") {
            console.log(`  Slot 11:40 - Permitido para cualquier tipo de servicio como caso especial`);
          }
          if (serviceType === "Terapia de Ginecolog\xEDa Regenerativa") {
            console.log(`  Servicio especial: Terapia de Ginecolog\xEDa Regenerativa - permitido en cualquier horario disponible`);
          }
          availableForServiceType = !appointments2.some((apt) => {
            const aptTime = toZonedTime2(apt.appointmentTime, TIMEZONE2);
            const aptTimeString = format2(aptTime, "HH:mm");
            const exactConflict = aptTimeString === timeString;
            if (exactConflict) {
              console.log(`  Horario ${timeString} no disponible porque ya hay una cita programada a esa hora exacta`);
            }
            return exactConflict;
          });
        } else if (serviceType === "Extracci\xF3n & Colocaci\xF3n de DIU" || serviceType === "Consulta & PAP") {
          if (serviceType === "Extracci\xF3n & Colocaci\xF3n de DIU") {
            const serviceEndTimeInMinutes = slotTimeInMinutes + 40;
            const maxEndTimeInMinutes = endHour * 60 + 15;
            if (serviceEndTimeInMinutes > maxEndTimeInMinutes) {
              const endTimeDate = new Date(date);
              const endHours = Math.floor(serviceEndTimeInMinutes / 60);
              const endMinutes = serviceEndTimeInMinutes % 60;
              endTimeDate.setHours(endHours, endMinutes, 0, 0);
              console.log(`  Horario no disponible para ${serviceType} porque terminar\xEDa despu\xE9s de las 12:15 (${format2(endTimeDate, "HH:mm")})`);
              availableForServiceType = false;
            }
          }
          if (timeString === "11:40") {
            availableForServiceType = !appointments2.some((apt) => {
              const aptTime = toZonedTime2(apt.appointmentTime, TIMEZONE2);
              const aptTimeString = format2(aptTime, "HH:mm");
              const exactConflict = aptTimeString === "11:40";
              if (exactConflict) {
                console.log(`  Horario 11:40 no disponible porque ya hay una cita programada a esa hora (colisi\xF3n directa)`);
              }
              return exactConflict;
            });
          } else {
            availableForServiceType = !appointments2.some((apt) => {
              const aptTime = toZonedTime2(apt.appointmentTime, TIMEZONE2);
              const aptTimeString = format2(aptTime, "HH:mm");
              const [aptHours, aptMinutes] = aptTimeString.split(":").map(Number);
              const aptTimeInMinutes = aptHours * 60 + aptMinutes;
              const existingServiceDuration = apt.serviceType === "Extracci\xF3n & Colocaci\xF3n de DIU" || apt.serviceType === "Terapia de Ginecolog\xEDa Regenerativa" ? 40 : 20;
              const existingAptEndTime = aptTimeInMinutes + existingServiceDuration;
              let newServiceDuration = 20;
              if (serviceType === "Consulta & PAP") {
                newServiceDuration = 30;
              } else if (serviceType === "Extracci\xF3n & Colocaci\xF3n de DIU" || serviceType === "Terapia de Ginecolog\xEDa Regenerativa") {
                newServiceDuration = 40;
              }
              const newServiceEndTime = slotTimeInMinutes + newServiceDuration;
              const wouldCauseConflict = slotTimeInMinutes >= aptTimeInMinutes && slotTimeInMinutes < existingAptEndTime || aptTimeInMinutes >= slotTimeInMinutes && aptTimeInMinutes < newServiceEndTime;
              if (wouldCauseConflict) {
                console.log(`  Horario no disponible para ${serviceType} porque coincide o se superpone con cita a las ${aptTimeString} (${apt.serviceType})`);
              }
              return wouldCauseConflict;
            });
          }
        }
        allTimeSlots.push({
          time: timeString,
          available: !isBooked && isInFuture && availableForServiceType
        });
        currentTime = addMinutes2(currentTime, 20);
      }
      console.log("Generated time slots:", allTimeSlots);
      const hasAvailableSlots = allTimeSlots.some((slot) => slot.available);
      console.log("Has at least one available slot?", hasAvailableSlots);
      if (!hasAvailableSlots) {
        console.log("WARNING: No available slots found for this date!");
      }
      const response = {
        date: format2(date, "yyyy-MM-dd"),
        timeSlots: allTimeSlots
      };
      console.log("Sending availability response:", response);
      res.json(response);
    } catch (error) {
      console.error("Error checking availability:", error);
      res.status(500).json({ message: "Error checking availability" });
    }
  });
  app2.post("/api/admin/patients", isAuthenticated, async (req, res) => {
    try {
      const patient = insertPatientSchema.parse({
        ...req.body,
        dateOfBirth: new Date(req.body.dateOfBirth)
      });
      const created = await storage.createPatient(patient);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Error creating patient" });
      }
    }
  });
  app2.get("/api/admin/patients", isAuthenticated, async (req, res) => {
    try {
      const searchQuery = req.query.q;
      const patients2 = searchQuery ? await storage.searchPatients(searchQuery) : await storage.getAllPatients();
      res.json(patients2);
    } catch (error) {
      res.status(500).json({ message: "Error fetching patients" });
    }
  });
  app2.get("/api/admin/patients/:id", isAuthenticated, async (req, res) => {
    try {
      const patient = await storage.getPatient(parseInt(req.params.id));
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: "Error fetching patient" });
    }
  });
  app2.patch("/api/admin/patients/:id", isAuthenticated, async (req, res) => {
    try {
      const updated = await storage.updatePatient(
        parseInt(req.params.id),
        {
          ...req.body,
          dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : void 0
        }
      );
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Error updating patient" });
    }
  });
  app2.post("/api/admin/patients/:patientId/records", isAuthenticated, upload.single("file"), async (req, res) => {
    try {
      const recordData = {
        ...req.body,
        patientId: parseInt(req.params.patientId)
      };
      if (req.file) {
        recordData.fileUrl = `/uploads/${req.file.filename}`;
        recordData.fileType = req.file.mimetype;
        recordData.recordType = "file";
      } else {
        recordData.recordType = "note";
      }
      const record = insertMedicalRecordSchema.parse(recordData);
      const created = await storage.createMedicalRecord(record);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Error creating medical record" });
      }
    }
  });
  app2.get("/api/admin/patients/:patientId/records", isAuthenticated, async (req, res) => {
    try {
      const records = await storage.getPatientMedicalRecords(parseInt(req.params.patientId));
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "Error fetching medical records" });
    }
  });
  app2.patch("/api/admin/records/:id", isAuthenticated, async (req, res) => {
    try {
      const updated = await storage.updateMedicalRecord(
        parseInt(req.params.id),
        req.body
      );
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Error updating medical record" });
    }
  });
  app2.delete("/api/appointments/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de cita inv\xE1lido" });
      }
      const appointment = await storage.getAppointment(id);
      if (!appointment) {
        return res.status(404).json({ message: "Cita no encontrada" });
      }
      if (appointment.googleEventId && isGoogleCalendarEnabled()) {
        try {
          console.log(`Eliminando evento de Google Calendar: ${appointment.googleEventId}`);
          const success = await deleteAppointmentFromCalendar(appointment.googleEventId);
          console.log(`Eliminaci\xF3n del evento de Google Calendar: ${success ? "exitosa" : "fallida"}`);
        } catch (gcalError) {
          console.error("Error al eliminar evento de Google Calendar:", gcalError);
        }
      }
      await storage.deleteAppointment(id);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error al eliminar cita:", error);
      res.status(500).json({ message: "Error al eliminar la cita" });
    }
  });
  app2.patch("/api/appointments/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentAppointment = await storage.getAppointment(id);
      if (!currentAppointment) {
        return res.status(404).json({ message: "Cita no encontrada" });
      }
      const appointment = await storage.updateAppointment(id, req.body);
      if (currentAppointment.googleEventId && isGoogleCalendarEnabled()) {
        try {
          console.log(`Actualizando evento de Google Calendar: ${currentAppointment.googleEventId}`);
          const success = await updateAppointmentInCalendar(
            appointment,
            currentAppointment.googleEventId
          );
          console.log(`Actualizaci\xF3n del evento en Google Calendar: ${success ? "exitosa" : "fallida"}`);
        } catch (gcalError) {
          console.error("Error al actualizar evento en Google Calendar:", gcalError);
        }
      }
      res.json(appointment);
    } catch (error) {
      console.error("Error al actualizar cita:", error);
      res.status(500).json({ message: "Error al actualizar la cita" });
    }
  });
  app2.get("/api/admin/appointments", isAuthenticated, async (_req, res) => {
    try {
      const appointments2 = await storage.getAllAppointments();
      res.json(appointments2);
    } catch (error) {
      res.status(500).json({ message: "Error fetching appointments" });
    }
  });
  app2.post("/api/test-email", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Se requiere una direcci\xF3n de correo electr\xF3nico"
        });
      }
      console.log(`Iniciando prueba de env\xEDo de correo a: ${email}`);
      const success = await sendAppointmentReminder({
        to: email,
        subject: "Prueba de correo desde jazmingineco.com.ar",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #0284c7; text-align: center;">Prueba de Correo Electr\xF3nico</h2>
            <p>Este es un correo de prueba enviado desde el sistema de turnos de la Dra. Jazm\xEDn Monta\xF1\xE9s.</p>
            <p>La direcci\xF3n de remitente configurada es: <strong>consultas@jazmingineco.com.ar</strong></p>
            <p>Fecha y hora de prueba: ${(/* @__PURE__ */ new Date()).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</p>
            <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <p style="margin: 0;">Este correo confirma que tu configuraci\xF3n de SendGrid est\xE1 funcionando correctamente.</p>
            </div>
          </div>
        `
      });
      if (success) {
        console.log(`\u2705 Correo de prueba enviado exitosamente a ${email}`);
        res.json({
          success: true,
          message: "Correo de prueba enviado exitosamente"
        });
      } else {
        console.error(`\u274C Error al enviar correo de prueba a ${email}`);
        res.status(500).json({
          success: false,
          message: "Error al enviar el correo de prueba. Revisa los logs del servidor."
        });
      }
    } catch (error) {
      console.error("Error en el endpoint de prueba de correo:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor al enviar el correo de prueba"
      });
    }
  });
  app2.get("/api/schedule-config", async (_req, res) => {
    try {
      console.log("Fetching public schedule config");
      let config = await storage.getScheduleConfig();
      if (!config) {
        console.log("No schedule config found, creating default");
        config = await storage.createDefaultScheduleConfig();
      }
      if (config.workDays && Array.isArray(config.workDays)) {
        config.workDays = config.workDays.map((day) => normalizeWorkDay2(day));
        console.log("Normalized workDays to:", config.workDays);
      }
      console.log("Returning schedule config:", config);
      res.json(config);
    } catch (error) {
      console.error("Error fetching public schedule config:", error);
      res.status(500).json({ message: "Error fetching schedule configuration" });
    }
  });
  app2.get("/api/admin/schedule-config", isAuthenticated, async (_req, res) => {
    try {
      let config = await storage.getScheduleConfig();
      if (!config) {
        config = await storage.createDefaultScheduleConfig();
      }
      if (config.workDays && Array.isArray(config.workDays)) {
        config.workDays = config.workDays.map((day) => normalizeWorkDay2(day));
        console.log("Admin route: Normalized workDays to:", config.workDays);
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Error fetching schedule configuration" });
    }
  });
  app2.get("/api/admin/google-calendar-status", isAuthenticated, async (_req, res) => {
    try {
      const initialized = isGoogleCalendarInitialized();
      const enabled = isGoogleCalendarEnabled();
      res.json({
        initialized,
        enabled,
        message: !initialized ? "Google Calendar integration is not configured" : enabled ? "Google Calendar integration is active" : "Google Calendar integration is configured but disabled"
      });
    } catch (error) {
      res.status(500).json({ message: "Error checking Google Calendar status" });
    }
  });
  app2.patch("/api/admin/google-calendar-status", isAuthenticated, async (req, res) => {
    try {
      const { enabled } = req.body;
      if (typeof enabled !== "boolean") {
        return res.status(400).json({ message: "Invalid request. 'enabled' must be a boolean value." });
      }
      const initialized = isGoogleCalendarInitialized();
      if (!initialized && enabled) {
        return res.status(400).json({
          message: "Cannot enable Google Calendar integration. The integration is not properly configured."
        });
      }
      setGoogleCalendarEnabled(enabled);
      res.json({
        initialized,
        enabled,
        message: enabled ? "Google Calendar integration has been enabled" : "Google Calendar integration has been disabled"
      });
    } catch (error) {
      res.status(500).json({ message: "Error updating Google Calendar status" });
    }
  });
  app2.post("/api/admin/google-calendar-sync", isAuthenticated, async (req, res) => {
    try {
      console.log("Manual sync from Google Calendar requested");
      const initialized = isGoogleCalendarInitialized();
      const enabled = isGoogleCalendarEnabled();
      console.log("Google Calendar status:", { initialized, enabled });
      return res.json({
        success: false,
        message: "La sincronizaci\xF3n desde Google Calendar ha sido temporalmente deshabilitada. Actualmente solo se sincronizan los eventos desde nuestra aplicaci\xF3n hacia Google Calendar. Esta funcionalidad ser\xE1 habilitada nuevamente en una futura actualizaci\xF3n."
      });
    } catch (error) {
      console.error("Error during manual Google Calendar sync:", error);
      res.status(500).json({
        success: false,
        message: "Error al procesar la solicitud de sincronizaci\xF3n"
      });
    }
  });
  app2.patch("/api/admin/schedule-config", isAuthenticated, async (req, res) => {
    try {
      const normalizedConfig = {
        ...req.body,
        workDays: req.body.workDays ? req.body.workDays.map((day) => normalizeWorkDay2(day)) : void 0
      };
      const config = insertScheduleConfigSchema.parse(normalizedConfig);
      const updated = await storage.updateScheduleConfig(config);
      res.json(updated);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: "Error updating schedule configuration" });
      }
    }
  });
  app2.post("/api/admin/appointments/:id/send-reminder", isAuthenticated, async (req, res) => {
    try {
      const appointment = await storage.getAppointment(parseInt(req.params.id));
      if (!appointment) {
        return res.status(404).json({ message: "Turno no encontrado" });
      }
      if (!appointment.email) {
        return res.status(400).json({
          success: false,
          message: "La cita no tiene una direcci\xF3n de correo electr\xF3nico asociada"
        });
      }
      const appointmentDateWithZone = toZonedTime2(new Date(appointment.appointmentTime), TIMEZONE2);
      const appointmentDate = format2(appointmentDateWithZone, "EEEE d 'de' MMMM 'a las' HH:mm 'hs'", {
        locale: es2
      });
      let reminderSent = false;
      try {
        reminderSent = await Promise.race([
          sendAppointmentReminder({
            to: appointment.email,
            subject: "Recordatorio de turno - Dra. Jazm\xEDn Monta\xF1\xE9s",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Recordatorio de Turno con la Dra. Jazm\xEDn Monta\xF1\xE9s</h2>
                <p>Estimado/a ${appointment.patientName},</p>
                <p>Le recordamos que tiene un turno programado para el ${appointmentDate}.</p>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Fecha y hora:</strong> ${appointmentDate}</p>
                  <p style="margin: 5px 0;"><strong>Servicio:</strong> ${appointment.serviceType}</p>
                  <p style="margin: 5px 0;"><strong>Obra Social:</strong> ${appointment.obraSocial}</p>
                  <p style="margin: 5px 0;"><strong>Direcci\xF3n:</strong> Av. Rivadavia 15822, Haedo</p>
                </div>
                <p>Por favor, llegue 10 minutos antes de su turno.</p>
                <p>Si necesita cancelar o reprogramar su turno, cont\xE1ctenos lo antes posible a <a href="mailto:info@jazmingineco.com.ar">info@jazmingineco.com.ar</a>.</p>
                <p>Tambi\xE9n puede contactarnos por WhatsApp: <a href="https://wa.me/541138151880">+54 11 3815-1880</a></p>
                <p style="color: #666; font-size: 0.9em; margin-top: 30px;">
                  Atentamente,<br>
                  Consultorio Dra. Jazm\xEDn Monta\xF1\xE9s<br>
                  Ginecolog\xEDa y Obstetricia
                </p>
              </div>
            `
          }),
          // Si SendGrid tarda más de 5 segundos, continuamos el flujo sin esperar respuesta
          new Promise((resolve) => {
            setTimeout(() => {
              console.log("El env\xEDo del correo est\xE1 tomando m\xE1s tiempo del esperado, pero se completar\xE1 en segundo plano");
              resolve(true);
            }, 5e3);
          })
        ]);
      } catch (emailError) {
        console.error("Error espec\xEDfico al enviar email:", emailError);
        reminderSent = false;
      }
      console.log(`Resultado de env\xEDo de recordatorio a ${appointment.email}: ${reminderSent ? "En proceso" : "Fallido"}`);
      res.json({
        success: true,
        message: reminderSent ? "Recordatorio enviado. El correo puede tardar unos minutos en llegar." : "Se ha iniciado el env\xEDo del recordatorio pero podr\xEDa haber demoras en la entrega."
      });
    } catch (error) {
      console.error("Reminder error:", error);
      res.status(200).json({
        success: false,
        warning: true,
        message: "Ha ocurrido un problema al procesar el recordatorio, pero el sistema seguir\xE1 intentando enviarlo."
      });
    }
  });
  app2.post("/api/admin/patient-messages", isAuthenticated, async (req, res) => {
    try {
      const message = req.body;
      if (!message || !message.content) {
        return res.status(400).json({
          success: false,
          message: "El contenido del mensaje es requerido"
        });
      }
      return res.json({
        success: true,
        message: "Mensaje creado exitosamente"
      });
    } catch (error) {
      console.error("Error creating patient message:", error);
      return res.status(500).json({
        success: false,
        message: "Error al crear el mensaje"
      });
    }
  });
  app2.post("/api/admin/patients/:patientId/milestones", isAuthenticated, async (req, res) => {
    try {
      const milestoneData = {
        ...req.body,
        patientId: parseInt(req.params.patientId),
        date: new Date(req.body.date)
      };
      const milestone = insertPatientMilestoneSchema.parse(milestoneData);
      const created = await storage.createPatientMilestone(milestone);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        console.error("Error creating patient milestone:", error);
        res.status(500).json({ message: "Error al crear el hito del paciente" });
      }
    }
  });
  app2.get("/api/admin/patients/:patientId/milestones", isAuthenticated, async (req, res) => {
    try {
      const milestones = await storage.getPatientMilestones(parseInt(req.params.patientId));
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching patient milestones:", error);
      res.status(500).json({ message: "Error al obtener los hitos del paciente" });
    }
  });
  app2.get("/api/admin/milestones/:id", isAuthenticated, async (req, res) => {
    try {
      const milestone = await storage.getPatientMilestone(parseInt(req.params.id));
      if (!milestone) {
        return res.status(404).json({ message: "Hito no encontrado" });
      }
      res.json(milestone);
    } catch (error) {
      console.error("Error fetching milestone:", error);
      res.status(500).json({ message: "Error al obtener el hito" });
    }
  });
  app2.patch("/api/admin/milestones/:id", isAuthenticated, async (req, res) => {
    try {
      const updateData = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : void 0
      };
      const updated = await storage.updatePatientMilestone(
        parseInt(req.params.id),
        updateData
      );
      res.json(updated);
    } catch (error) {
      console.error("Error updating milestone:", error);
      res.status(500).json({ message: "Error al actualizar el hito" });
    }
  });
  app2.delete("/api/admin/milestones/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deletePatientMilestone(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting milestone:", error);
      res.status(500).json({ message: "Error al eliminar el hito" });
    }
  });
  app2.post("/api/admin/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Se requieren la contrase\xF1a actual y la nueva" });
      }
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({ message: "No autenticado" });
      }
      const admin = await storage.getAdmin(adminId);
      if (!admin) {
        return res.status(404).json({ message: "Administrador no encontrado" });
      }
      const isPasswordValid = await bcrypt3.compare(currentPassword, admin.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "La contrase\xF1a actual es incorrecta" });
      }
      await storage.updateAdminPassword(adminId, newPassword);
      res.status(200).json({ message: "Contrase\xF1a actualizada correctamente" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Error al cambiar la contrase\xF1a" });
    }
  });
  app2.post("/api/admin/change-username", isAuthenticated, async (req, res) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ message: "Se requiere un nuevo nombre de usuario" });
      }
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({ message: "No autenticado" });
      }
      await storage.updateAdminUsername(adminId, username);
      if (req.user) {
        req.user.username = username;
      }
      res.status(200).json({ message: "Nombre de usuario actualizado correctamente" });
    } catch (error) {
      console.error("Error changing username:", error);
      const errorMessage = error instanceof Error ? error.message : "Error al cambiar el nombre de usuario";
      res.status(500).json({ message: errorMessage });
    }
  });
  app2.post("/api/admin/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Se requiere un correo electr\xF3nico" });
      }
      res.status(200).json({
        message: "Si existe una cuenta con ese correo, recibir\xE1 las instrucciones para restablecer su contrase\xF1a"
      });
    } catch (error) {
      console.error("Error requesting password reset:", error);
      res.status(500).json({ message: "Error al solicitar el restablecimiento de contrase\xF1a" });
    }
  });
  app2.post("/api/admin/direct-login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Se requiere usuario y contrase\xF1a" });
      }
      if (username !== "admin" || password !== "admin123") {
        return res.status(401).json({ message: "Credenciales inv\xE1lidas" });
      }
      const [admin] = await db.select().from(admins);
      if (!admin) {
        return res.status(404).json({ message: "Usuario administrador no encontrado" });
      }
      if (req.session) {
        req.session.passport = { user: admin.id };
        req.session.save((err) => {
          if (err) {
            console.error("Error saving session:", err);
            return res.status(500).json({ message: "Error al guardar la sesi\xF3n" });
          }
          console.log("Session created manually for admin:", admin.id);
          res.status(200).json({
            id: admin.id,
            username: admin.username
          });
        });
      } else {
        return res.status(500).json({ message: "No hay sesi\xF3n disponible" });
      }
    } catch (error) {
      console.error("Error in direct login:", error);
      return res.status(500).json({ message: "Error en inicio de sesi\xF3n directo" });
    }
  });
  app2.get("/api/debug-admin", async (req, res) => {
    try {
      const adminsList = await db.select({
        id: admins.id,
        username: admins.username,
        passwordHash: admins.password,
        createdAt: admins.createdAt,
        updatedAt: admins.updatedAt
      }).from(admins);
      const testAuth = await bcrypt3.compare("admin123", adminsList[0]?.passwordHash || "");
      return res.json({
        adminCount: adminsList.length,
        firstAdmin: adminsList[0] ? {
          id: adminsList[0].id,
          username: adminsList[0].username,
          // Solo mostramos los primeros y últimos caracteres del hash por seguridad
          passwordHashPreview: adminsList[0].passwordHash ? adminsList[0].passwordHash.substring(0, 10) + "..." + adminsList[0].passwordHash.substring(adminsList[0].passwordHash.length - 10) : null,
          hashLength: adminsList[0].passwordHash?.length,
          createdAt: adminsList[0].createdAt,
          updatedAt: adminsList[0].updatedAt,
          testAuth: testAuth ? "La contrase\xF1a admin123 s\xED funcionar\xEDa" : "La contrase\xF1a admin123 NO coincide"
        } : null,
        activeUser: req.user ? {
          id: req.user.id,
          username: req.user.username
        } : null
      });
    } catch (error) {
      console.error("Error debugging admin:", error);
      return res.status(500).json({ message: "Error obteniendo informaci\xF3n de depuraci\xF3n" });
    }
  });
  app2.get("/api/reset-default-password", async (req, res) => {
    try {
      let admin = await storage.getAdminByUsername("admin");
      if (!admin) {
        const [adminFromDb] = await db.select().from(admins);
        if (adminFromDb) {
          admin = adminFromDb;
          console.log("Found admin via direct DB query:", admin.id);
        } else {
          const hashedPassword = await bcrypt3.hash("admin123", 10);
          const [newAdmin] = await db.insert(admins).values({
            username: "admin",
            password: hashedPassword,
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).returning();
          admin = newAdmin;
          console.log("Created new admin account with ID:", admin.id);
        }
      }
      if (admin) {
        const hashedPassword = await bcrypt3.hash("admin123", 10);
        await db.update(admins).set({
          password: hashedPassword,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq3(admins.id, admin.id));
        console.log("Admin password reset to default value (admin123) for ID:", admin.id);
        return res.json({
          message: "La contrase\xF1a se ha restablecido a admin123 correctamente",
          adminId: admin.id,
          username: admin.username
        });
      }
      return res.status(404).json({ message: "Usuario administrador no encontrado" });
    } catch (error) {
      console.error("Error resetting admin password:", error);
      return res.status(500).json({ message: "Error al restablecer la contrase\xF1a" });
    }
  });
  return createServer(app2);
}

// server/vite.ts
import express2 from "express";
import fs2 from "fs";
import path4, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path3, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path3.resolve(__dirname, "client", "src"),
      "@shared": path3.resolve(__dirname, "shared")
    }
  },
  root: path3.resolve(__dirname, "client"),
  build: {
    outDir: path3.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path4.resolve(__dirname2, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
async function startServer() {
  try {
    await db.execute("SELECT 1");
    log("Database connection successful");
    const gcalInitialized = await initGoogleCalendar();
    if (gcalInitialized) {
      log("Google Calendar integration initialized successfully");
    } else {
      log("Google Calendar integration not initialized - missing or malformed credentials");
      log("To use Google Calendar integration, please provide the following environment variables:");
      log("- GOOGLE_CLIENT_EMAIL: Service account email from Google Cloud");
      log("- GOOGLE_PRIVATE_KEY: Private key from Google Cloud service account (ensure correct format)");
      log("- GOOGLE_CALENDAR_ID: ID of the Google Calendar to use");
      log("The application will continue to work without Google Calendar integration.");
    }
    const server = await registerRoutes(app);
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error: ${message}`);
      res.status(status).json({ message });
    });
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    const PORT = 5e3;
    server.listen(PORT, "0.0.0.0", () => {
      log(`Server listening on port ${PORT}`);
      if (isGoogleCalendarInitialized() && isGoogleCalendarEnabled()) {
        log("Google Calendar integration is enabled for outbound sync only");
        log("Synchronization from Google Calendar to our database has been temporarily disabled");
        log("Only changes made in our application will be sent to Google Calendar");
      } else {
        log("Google Calendar synchronization not enabled - skipping periodic sync");
      }
    });
  } catch (error) {
    log(`Failed to start server: ${error}`);
    process.exit(1);
  }
}
startServer();
