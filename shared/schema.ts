import { pgTable, text, serial, timestamp, boolean, jsonb, time, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
  bloodType: text("blood_type"),
  allergies: text("allergies"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const medicalRecords = pgTable("medical_records", {
  id: serial("id").primaryKey(),
  patientId: serial("patient_id").references(() => patients.id),
  recordType: text("record_type").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  fileUrl: text("file_url"),
  fileType: text("file_type"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: serial("patient_id").references(() => patients.id),
  patientName: text("patient_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  appointmentTime: timestamp("appointment_time").notNull(),
  isFirstTime: boolean("is_first_time").default(false),
  serviceType: text("service_type").default('Consulta'),
  obraSocial: text("obra_social").default('Particular'),
  notes: text("notes"),
  googleEventId: text("google_event_id"),
  isFromGoogleCalendar: boolean("is_from_google_calendar").default(false),
  // Campos para el módulo de estadísticas
  status: text("status").default('pending').notNull(),
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: text("cancelled_by"),
  attendedAt: timestamp("attended_at"),
  noShowAt: timestamp("no_show_at"),
  // Campos para la cancelación desde email
  cancellationToken: text("cancellation_token"),
  cancellationTokenExpiresAt: timestamp("cancellation_token_expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const scheduleConfig = pgTable("schedule_config", {
  id: serial("id").primaryKey(),
  workDays: text("work_days").array().notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  vacationPeriods: jsonb("vacation_periods").$type<Array<{ start: string; end: string }>>().default([]),
  occasionalWorkDays: jsonb("occasional_work_days").$type<Array<string>>().default([]),
  occasionalWorkDayTimes: jsonb("occasional_work_day_times").$type<Record<string, { startTime: string; endTime: string }>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const blockedDays = pgTable("blocked_days", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const patientMilestones = pgTable("patient_milestones", {
  id: serial("id").primaryKey(),
  patientId: serial("patient_id").references(() => patients.id),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  type: text("type").notNull(),
  status: text("status").default("completed"),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPatientSchema = createInsertSchema(patients)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    dateOfBirth: z.date({
      required_error: "Fecha de nacimiento es requerida",
      invalid_type_error: "Fecha de nacimiento inválida",
    }),
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    email: z.string().email("Por favor ingrese un email válido"),
    phone: z.string().min(8, "Por favor ingrese un número de teléfono válido"),
    bloodType: z.string().optional(),
    allergies: z.string().optional(),
  });

export const insertMedicalRecordSchema = createInsertSchema(medicalRecords)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    recordType: z.enum(["note", "file"], {
      required_error: "Tipo de registro es requerido",
    }),
    title: z.string().min(1, "Título es requerido"),
    content: z.string().optional(),
    fileUrl: z.string().optional(),
    fileType: z.string().optional(),
  });

export const insertAppointmentSchema = createInsertSchema(appointments)
  .omit({ id: true })
  .extend({
    appointmentTime: z.date({
      required_error: "Por favor seleccione fecha y hora",
      invalid_type_error: "Fecha y hora inválida",
    }),
    patientName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    email: z.string().email("Por favor ingrese un email válido"),
    phone: z.string().min(8, "Por favor ingrese un número de teléfono válido"),
    isFirstTime: z.boolean(),
    serviceType: z.enum(["Consulta", "Consulta & PAP", "Extracción & Colocación de DIU", "Terapia de Ginecología Regenerativa", "Biopsia"], {
      required_error: "Por favor seleccione un tipo de servicio",
    }),
    obraSocial: z.enum(["Particular", "IOMA"], {
      required_error: "Por favor seleccione su Obra Social",
    }),
    notes: z.string().default(""),
    patientId: z.number().optional(),
    isFromGoogleCalendar: z.boolean().optional().default(false),
    // Campos para el módulo de estadísticas
    status: z.enum(["pending", "confirmed", "cancelled_by_patient", "cancelled_by_professional", "attended", "no_show"]).default("pending"),
    cancelledAt: z.date().optional(),
    cancelledBy: z.enum(["patient", "professional"]).optional(),
    attendedAt: z.date().optional(),
    noShowAt: z.date().optional(),
    // Campos para la cancelación desde email
    cancellationToken: z.string().optional(),
    cancellationTokenExpiresAt: z.date().optional(),
  });

export const insertAdminSchema = createInsertSchema(admins)
  .omit({ id: true, createdAt: true });

export const insertScheduleConfigSchema = createInsertSchema(scheduleConfig)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    vacationPeriods: z.array(
      z.object({
        start: z.string(),
        end: z.string(),
      })
    ).default([]),
    occasionalWorkDays: z.array(z.string()).default([]),
    occasionalWorkDayTimes: z.record(z.string(), z.object({
      startTime: z.string(),
      endTime: z.string()
    })).default({}),
  });

export const insertPatientMilestoneSchema = createInsertSchema(patientMilestones)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    title: z.string().min(1, "Título es requerido"),
    description: z.string().optional(),
    date: z.date({
      required_error: "Fecha es requerida",
      invalid_type_error: "Fecha inválida",
    }),
    type: z.enum(["consulta", "procedimiento", "examen", "seguimiento", "medicacion"], {
      required_error: "Tipo de hito es requerido",
    }),
    status: z.enum(["programado", "completado", "cancelado"], {
      required_error: "Estado es requerido",
    }).default("completado"),
    order: z.number(),
  });

export const insertBlockedDaySchema = createInsertSchema(blockedDays)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    date: z.date({
      required_error: "Fecha es requerida",
      invalid_type_error: "Fecha inválida",
    }),
    reason: z.string().optional(),
  });

export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;
export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Admin = typeof admins.$inferSelect;
export type InsertScheduleConfig = z.infer<typeof insertScheduleConfigSchema>;
export type ScheduleConfig = typeof scheduleConfig.$inferSelect;
export type InsertPatientMilestone = z.infer<typeof insertPatientMilestoneSchema>;
export type PatientMilestone = typeof patientMilestones.$inferSelect;
export type InsertBlockedDay = z.infer<typeof insertBlockedDaySchema>;
export type BlockedDay = typeof blockedDays.$inferSelect;