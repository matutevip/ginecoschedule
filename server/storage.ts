

import { appointments, admins, scheduleConfig, patients, medicalRecords, patientMilestones, blockedDays, type Appointment, type InsertAppointment, type Admin, type InsertAdmin, type ScheduleConfig, type InsertScheduleConfig, type Patient, type InsertPatient, type MedicalRecord, type InsertMedicalRecord, type PatientMilestone, type InsertPatientMilestone, type BlockedDay, type InsertBlockedDay } from "@shared/schema";
import { db } from "./db";
import { and, gte, lte, eq, desc, or, ilike, ne } from "drizzle-orm";
import { addMinutes, subMinutes, startOfDay, endOfDay, format, parse, setHours, setMinutes, addDays } from "date-fns";
import { toZonedTime } from 'date-fns-tz';
import { es } from 'date-fns/locale'
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { addAppointmentToCalendar, updateAppointmentInCalendar, deleteAppointmentFromCalendar } from "./googleCalendar";
import { randomBytes } from "crypto";

// Función para normalizar los nombres de días de la semana (quitar acentos, etc.)
function normalizeWorkDay(day: string): string {
  console.log(`Normalizando día: ${day} → ${day.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()}`);
  return day.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const PostgresSessionStore = connectPg(session);

const TIMEZONE = 'America/Argentina/Buenos_Aires';

export interface IStorage {
  // Appointment methods
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointmentsByDate(date: Date, includeAllStatuses?: boolean): Promise<Appointment[]>;
  getAppointmentsByDateRange(startDate: Date, endDate: Date, includeAllStatuses?: boolean): Promise<Appointment[]>;
  isTimeSlotAvailable(time: Date, excludeAppointmentId?: number, isFromGoogleCalendarParam?: boolean, appointmentData?: Partial<InsertAppointment>): Promise<boolean>;
  getAllAppointments(): Promise<Appointment[]>;
  deleteAppointment(id: number): Promise<void>;
  updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAppointmentByCancellationToken(token: string): Promise<Appointment | undefined>;

  // Patient methods
  createPatient(patient: InsertPatient): Promise<Patient>;
  getPatient(id: number): Promise<Patient | undefined>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient>;
  getAllPatients(): Promise<Patient[]>;
  searchPatients(query: string): Promise<Patient[]>;

  // Medical record methods
  createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord>;
  getMedicalRecord(id: number): Promise<MedicalRecord | undefined>;
  getPatientMedicalRecords(patientId: number): Promise<MedicalRecord[]>;
  updateMedicalRecord(id: number, record: Partial<InsertMedicalRecord>): Promise<MedicalRecord>;

  // Patient milestone methods
  createPatientMilestone(milestone: InsertPatientMilestone): Promise<PatientMilestone>;
  getPatientMilestone(id: number): Promise<PatientMilestone | undefined>;
  getPatientMilestones(patientId: number): Promise<PatientMilestone[]>;
  updatePatientMilestone(id: number, milestone: Partial<InsertPatientMilestone>): Promise<PatientMilestone>;
  deletePatientMilestone(id: number): Promise<void>;

  // Admin methods
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  getAdmin(id: number): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  updateAdminPassword(id: number, password: string): Promise<void>;
  updateAdminUsername(id: number, username: string): Promise<void>;

  // Schedule config methods
  getScheduleConfig(): Promise<ScheduleConfig | undefined>;
  updateScheduleConfig(config: InsertScheduleConfig): Promise<ScheduleConfig>;
  createDefaultScheduleConfig(): Promise<ScheduleConfig>;

  // Blocked days methods
  createBlockedDay(blockedDay: InsertBlockedDay): Promise<BlockedDay>;
  getBlockedDays(): Promise<BlockedDay[]>;
  getBlockedDay(id: number): Promise<BlockedDay | undefined>;
  deleteBlockedDay(id: number): Promise<void>;
  isDateBlocked(date: Date): Promise<boolean>;

  // Session store
  sessionStore: session.Store;
}

  export class DatabaseStorage implements IStorage {  
    sessionStore!: session.Store; // Add non-null assertion operator
    private retryCount: number = 0;
    private maxRetries: number = 3;
    constructor() {
      this.initializeSessionStore();
    }

  private initializeSessionStore() {
    try {
      this.sessionStore = new PostgresSessionStore({
        conObject: {
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
        },
        createTableIfMissing: true,
        pruneSessionInterval: 60
      });
    } catch (error) {
      console.error('Failed to initialize session store:', error);
      throw error;
    }
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
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
  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    return this.withRetry(async () => {
      // Si es una cita creada desde Google Calendar, omitimos la validación de disponibilidad
      // porque confiamos en Google Calendar como fuente de verdad
      if (!insertAppointment.isFromGoogleCalendar) {
        // Verificar que el horario esté disponible
        const isAvailable = await this.isTimeSlotAvailable(
          insertAppointment.appointmentTime,
          undefined,
          insertAppointment.isFromGoogleCalendar, // Pasar flag isFromGoogleCalendar si existe
          insertAppointment
        );
        if (!isAvailable) {
          throw new Error("El horario seleccionado no está disponible");
        }
      } else {
        console.log("Omitiendo validación de disponibilidad para evento importado desde Google Calendar");
      }
      
      // Generar token de cancelación y fecha de expiración
      // El token expira 48hs antes del turno
      const cancellationToken = randomBytes(32).toString("hex");
      const cancellationTokenExpiresAt = subMinutes(insertAppointment.appointmentTime, 48 * 60);
      
      console.log(`Generando token de cancelación: ${cancellationToken.substring(0, 10)}... que expira: ${cancellationTokenExpiresAt.toISOString()}`);
      
      // Agregar token y fecha de expiración a los datos del turno
      const appointmentWithToken = {
        ...insertAppointment,
        cancellationToken,
        cancellationTokenExpiresAt
      };
      
      // First create the appointment in our database
      const [appointment] = await db
        .insert(appointments)
        .values(appointmentWithToken)
        .returning();
      
      // Then add it to Google Calendar
      try {
        const googleEventId = await addAppointmentToCalendar(appointment);
        if (googleEventId) {
          // If successfully added to Google Calendar, update our record with the event ID
          const [updated] = await db
            .update(appointments)
            .set({ 
              googleEventId,
              updatedAt: new Date()
            })
            .where(eq(appointments.id, appointment.id))
            .returning();
          
          return updated;
        }
      } catch (error) {
        console.error('Error adding appointment to Google Calendar:', error);
        // Continue with the original appointment if Google Calendar integration fails
      }
      
      return appointment;
    });
  }

  async getAppointmentsByDate(date: Date, includeAllStatuses: boolean = false): Promise<Appointment[]> {
    return this.withRetry(async () => {
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      // Condiciones base: rango de fechas
      const conditions = [
        and(
          gte(appointments.appointmentTime, dayStart),
          lte(appointments.appointmentTime, dayEnd)
        )
      ];
      
      // Si no se solicitan todos los estados, excluimos citas canceladas
      if (!includeAllStatuses) {
        conditions.push(
          and(
            ne(appointments.status, 'cancelled_by_patient'),
            ne(appointments.status, 'cancelled_by_professional')
          )
        );
      }
      
      return await db
        .select()
        .from(appointments)
        .where(and(...conditions));
    });
  }
  
  async getAppointmentsByDateRange(startDate: Date, endDate: Date, includeAllStatuses: boolean = false): Promise<Appointment[]> {
    return this.withRetry(async () => {
      console.log(`Buscando citas en el rango: ${startDate.toISOString()} - ${endDate.toISOString()}`);
      
      // Condiciones base: rango de fechas
      const conditions = [
        and(
          gte(appointments.appointmentTime, startDate),
          lte(appointments.appointmentTime, endDate)
        )
      ];
      
      // Si no se solicitan todos los estados, excluimos citas canceladas
      if (!includeAllStatuses) {
        conditions.push(
          and(
            ne(appointments.status, 'cancelled_by_patient'),
            ne(appointments.status, 'cancelled_by_professional')
          )
        );
      }
      
      return await db
        .select()
        .from(appointments)
        .where(and(...conditions))
        .orderBy(appointments.appointmentTime);
    });
  }

  async isTimeSlotAvailable(
    time: Date, 
    excludeAppointmentId?: number, 
    isFromGoogleCalendarParam?: boolean,
    appointmentData?: Partial<InsertAppointment>
  ): Promise<boolean> {
    return this.withRetry(async () => {
      // Si estamos actualizando una cita desde Google Calendar, verificar si es la misma cita
      if (excludeAppointmentId) {
        console.log(`Verificando disponibilidad para actualizar la cita #${excludeAppointmentId} a las ${time.toLocaleString()}`);
      }
      
      // Imprimir datos de la cita para depuración
      console.log('Datos de cita para verificación de disponibilidad:',
        JSON.stringify({
          time: time.toISOString(),
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
        console.log('No schedule config found');
        return false;
      }

      const localTime = toZonedTime(time, TIMEZONE);
      const dayName = normalizeWorkDay(format(localTime, 'EEEE', { locale: es }));

      if (!config.workDays.includes(dayName)) {
        console.log('Invalid day:', dayName, 'Valid days:', config.workDays);
        return false;
      }

      const hours = localTime.getHours();
      const minutes = localTime.getMinutes();

      const [startHours, startMinutes] = config.startTime.split(':').map(Number);
      const [endHours, endMinutes] = config.endTime.split(':').map(Number);

      const timeInMinutes = hours * 60 + minutes;
      const startTimeInMinutes = startHours * 60 + startMinutes;
      const endTimeInMinutes = endHours * 60 + endMinutes - 30;

      // Check if time is within working hours - con intervalo de 20 min para consultas estándar
      // No hacemos una validación estricta para los casos de Google Calendar, donde podría
      // tener horarios no alineados con nuestras reglas
      // Determinar si la cita viene de Google Calendar, ya sea por el parámetro explícito
      // o por estar siendo actualizada desde una sincronización
      const isFromGoogleCalendar = isFromGoogleCalendarParam || !!appointmentData?.isFromGoogleCalendar;

      // Regla especial para horario 11:40 - aplicamos algunas verificaciones especiales
      // pero permitimos cualquier tipo de servicio en este horario
      // Verificar si el servicio requiere una duración más larga (solo DIU necesita restricciones reales)
      // Terapia ya no se considera servicio restringido para disponibilidad de slots
      const requiresLongerTime = 
        appointmentData?.serviceType === "Extracción & Colocación de DIU";
      const isSpecialSlot = hours === 11 && minutes === 40; // Ya no limitamos por tipo de servicio
      
      // Solo aplicamos restricciones de intervalo para nuevas citas, no para actualizaciones desde Google Calendar
      if (timeInMinutes < startTimeInMinutes || timeInMinutes > endTimeInMinutes) {
        console.log('Time outside working hours:', {
          time: format(localTime, 'HH:mm'),
          startTime: config.startTime,
          endTime: config.endTime
        });
        
        // Si viene de Google Calendar o es el slot especial 11:40, permitimos horarios fuera del horario laboral
        if (isFromGoogleCalendar) {
          console.log('Allowing time outside working hours because it comes from Google Calendar');
        } else if (isSpecialSlot) {
          console.log(`Allowing special slot 11:40 for any service type (including ${appointmentData?.serviceType}) even though it's outside working hours`);
        } else {
          return false;
        }
      }
      
      // Verificar intervalo de 20 o 30 min solo para nuevas citas
      if (!isFromGoogleCalendar && minutes % 20 !== 0 && minutes % 30 !== 0) {
        console.log('Time not on 20 or 30-minute interval:', format(localTime, 'HH:mm'), 
          `(minutes=${minutes}, divisible por 20=${minutes % 20 === 0}, divisible por 30=${minutes % 30 === 0})`);
        
        // Permitir explícitamente cualquier horario que termine en minuto :30
        // Por ejemplo: 10:30, 11:30, etc.
        if (minutes % 30 === 0) {
          console.log(`Allowing ${format(localTime, 'HH:mm')} as valid interval (divisible by 30)`);
          // No retornamos false, permitimos continuar
        } else {
          return false;
        }
      }
      
      // Verificar que los servicios de 40 minutos tengan el horario correcto
      // Ya definimos requiresLongerTime arriba, no necesitamos redeclararlo
      // Verificar que no sea el slot especial 11:40 (que ya permitimos explícitamente)
      if (!isFromGoogleCalendar && requiresLongerTime && minutes % 40 !== 0 && (minutes - 20) % 40 !== 0 && !isSpecialSlot) {
        console.log('Longer service (40 min) not on correct time slot:', format(localTime, 'HH:mm'));
        return false;
      }

      // Get all appointments for the day
      const dayStart = startOfDay(localTime);
      const dayEnd = endOfDay(localTime);
      
      // Al verificar disponibilidad, excluimos las citas canceladas
      const existingAppointments = await this.getAppointmentsByDate(localTime);

      // Log existing appointments for debugging
      console.log(`Appointments for ${format(localTime, 'yyyy-MM-dd')}: ${existingAppointments.length}`);
      
      // ==== LÓGICA MEJORADA PARA DETECTAR CONFLICTOS DE HORARIOS ====
      // Determinar la duración del nuevo servicio
      let newServiceDuration = 20; // Duración estándar para consultas normales
      
      // Añadimos log para depuración
      console.log(`Verificando disponibilidad para servicio tipo: "${appointmentData?.serviceType}"`);
      
      if (appointmentData?.serviceType === "Consulta & PAP") {
        newServiceDuration = 20; // 20 minutos para PAP (como se especificó)
        console.log(`Tipo de cita: Consulta & PAP (PAP y Colpo) - Duración: ${newServiceDuration} minutos`);
      } else if (appointmentData?.serviceType === "Extracción & Colocación de DIU") {
        newServiceDuration = 40; // 40 minutos para DIU
        console.log(`Tipo de cita: DIU / SIU / Implante - Duración: ${newServiceDuration} minutos`);
      } else if (appointmentData?.serviceType === "Terapia de Ginecología Regenerativa") {
        // Aunque la terapia puede ocupar cualquier slot disponible,
        // mantenemos su duración para fines de cálculo de fin de la consulta
        newServiceDuration = 40; // 40 minutos para Terapia
        console.log(`Tipo de cita: Terapia - Duración: ${newServiceDuration} minutos`);
      } else {
        console.log(`Tipo de cita: Consulta estándar - Duración: ${newServiceDuration} minutos`);
      }
      
      // Calcular el fin del nuevo servicio en minutos
      const newServiceEndTime = timeInMinutes + newServiceDuration;
      
      // Verificar superposiciones con turnos existentes
      // Casos especiales: horario 11:40 o Terapia de Ginecología Regenerativa
      // Verificamos solo superposiciones directas (del mismo horario exacto)
      if (isSpecialSlot || (appointmentData?.serviceType === "Terapia de Ginecología Regenerativa")) {
        // Para 11:40 o Terapia, solo consideramos conflicto si hay una cita exactamente a la misma hora
        const hasDirectConflict = existingAppointments.some(apt => {
          // Excluir la cita que estamos actualizando
          if (excludeAppointmentId && apt.id === excludeAppointmentId) {
            console.log(`Excluding appointment #${apt.id} from conflict check`);
            return false;
          }
          
          const aptLocalTime = toZonedTime(new Date(apt.appointmentTime), TIMEZONE);
          const aptHours = aptLocalTime.getHours();
          const aptMinutes = aptLocalTime.getMinutes();
          
          // Solo conflicto directo de horarios (exactamente el mismo horario)
          const exactTimeMatch = aptHours === hours && aptMinutes === minutes;
          
          if (exactTimeMatch) {
            if (isSpecialSlot) {
              console.log(`Direct conflict: Special slot 11:40 already has appointment #${apt.id}`);
            } else {
              console.log(`Direct conflict: Slot ${hours}:${minutes.toString().padStart(2, '0')} already has appointment #${apt.id}`);
            }
            return true;
          }
          
          return false;
        });
        
        if (hasDirectConflict) {
          if (isSpecialSlot) {
            console.log('Direct conflict found for special slot 11:40');
          } else {
            console.log(`Direct conflict found for slot ${hours}:${minutes.toString().padStart(2, '0')} with Terapia`);
          }
          return false;
        } else {
          if (isSpecialSlot) {
            console.log(`Allowing special slot 11:40 for all service types, including ${appointmentData?.serviceType}`);
          } else {
            console.log(`Allowing Terapia de Ginecología Regenerativa for any available slot: ${hours}:${minutes.toString().padStart(2, '0')}`);
          }
          // Permitimos el horario si no hay conflicto directo
          return true;
        }
      } else {
        // Para el resto de horarios, aplicamos la lógica normal de superposición
        const hasDirectConflict = existingAppointments.some(apt => {
          // Excluir la cita que estamos actualizando
          if (excludeAppointmentId && apt.id === excludeAppointmentId) {
            console.log(`Excluding appointment #${apt.id} from conflict check`);
            return false;
          }
          
          const aptLocalTime = toZonedTime(new Date(apt.appointmentTime), TIMEZONE);
          const aptHours = aptLocalTime.getHours();
          const aptMinutes = aptLocalTime.getMinutes();
          const aptTimeInMinutes = aptHours * 60 + aptMinutes;
          
          // Determinar la duración del servicio existente
          let existingServiceDuration = 20; // Duración estándar
          
          if (apt.serviceType === "Consulta & PAP") {
            existingServiceDuration = 20; // Actualizamos a 20 minutos para PAP
            console.log(`Cita existente: ${apt.serviceType} - Duración: ${existingServiceDuration} minutos`);
          } else if (apt.serviceType === "Extracción & Colocación de DIU" || 
                    apt.serviceType === "Terapia de Ginecología Regenerativa") {
            existingServiceDuration = 40; // 40 minutos para DIU y Terapia
            console.log(`Cita existente: ${apt.serviceType} - Duración: ${existingServiceDuration} minutos`);
          } else {
            console.log(`Cita existente: ${apt.serviceType} - Duración: ${existingServiceDuration} minutos (estándar)`);
          }
          
          // Calcular el fin del servicio existente
          const existingServiceEndTime = aptTimeInMinutes + existingServiceDuration;
          
          // Verificar si hay superposición real entre los dos servicios
          // Escenarios de superposición:
          // 1. El inicio del nuevo servicio está dentro de la duración del existente
          // 2. El inicio del existente está dentro de la duración del nuevo
          // Caso especial: permitimos iniciar un servicio exactamente cuando termina otro
          
          // Comprobamos si el nuevo servicio empieza exactamente cuando termina el existente
          const newServiceStartsWhenExistingEnds = timeInMinutes === existingServiceEndTime;
          
          // O si el servicio existente empieza exactamente cuando termina el nuevo
          const existingServiceStartsWhenNewEnds = aptTimeInMinutes === newServiceEndTime;
          
          // Solo hay conflicto si hay superposición Y NO es un caso de "back-to-back"
          const hasOverlap = 
            ((timeInMinutes >= aptTimeInMinutes && timeInMinutes < existingServiceEndTime) || 
             (aptTimeInMinutes >= timeInMinutes && aptTimeInMinutes < newServiceEndTime)) && 
            !newServiceStartsWhenExistingEnds && 
            !existingServiceStartsWhenNewEnds;
          
          if (hasOverlap) {
            console.log(`Conflict: ${format(localTime, 'HH:mm')} (${appointmentData?.serviceType}) overlaps with #${apt.id} at ${format(aptLocalTime, 'HH:mm')} (${apt.serviceType})`);
            return true;
          }
          
          return false;
        });
        
        if (hasDirectConflict) {
          console.log('Direct time conflict found');
          return false;
        }
      }
      
      // Verificar si un servicio largo terminaría después de las 12:15
      if (requiresLongerTime && !isFromGoogleCalendar) {
        const serviceEndTimeInMinutes = timeInMinutes + newServiceDuration;
        const maxEndTimeInMinutes = 12 * 60 + 15; // 12:15
        
        // Regla especial para el horario de las 11:40
        if (hours === 11 && minutes === 40) {
          console.log(`  Slot 11:40 - Permitido para todos los tipos de servicio, incluido ${appointmentData?.serviceType}, aunque termine después de las 12:15 (regla especial)`);
        } else if (serviceEndTimeInMinutes > maxEndTimeInMinutes) {
          const endTimeDate = new Date(localTime);
          const endHours = Math.floor(serviceEndTimeInMinutes / 60);
          const endMinutes = serviceEndTimeInMinutes % 60;
          endTimeDate.setHours(endHours, endMinutes, 0, 0);
          
          console.log(`  Horario no disponible para ${appointmentData?.serviceType} porque terminaría después de las 12:15 (${format(endTimeDate, 'HH:mm')})`);
          return false;
        }
      }

      // Success, slot is available
      console.log(`Time slot ${format(localTime, 'HH:mm')} is available ${excludeAppointmentId ? 'for update' : 'for new appointment'}`);
      return true;
    });
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return this.withRetry(async () => {
      return await db
        .select()
        .from(appointments)
        .orderBy(desc(appointments.appointmentTime));
    });
  }

  async deleteAppointment(id: number): Promise<void> {
    return this.withRetry(async () => {
      // First get the appointment to check if it has a Google Calendar event
      const appointment = await this.getAppointment(id);
      
      if (appointment && appointment.googleEventId) {
        // Try to delete from Google Calendar first
        try {
          await deleteAppointmentFromCalendar(appointment.googleEventId);
        } catch (error) {
          console.error('Error deleting appointment from Google Calendar:', error);
          // Continue with deletion even if Google Calendar deletion fails
        }
      }
      
      // Then delete from our database
      await db.delete(appointments).where(eq(appointments.id, id));
    });
  }

  async updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment> {
    return this.withRetry(async () => {
      // First, verify that the appointment exists
      const existingAppointment = await this.getAppointment(id);
      if (!existingAppointment) {
        throw new Error('Appointment not found');
      }

      // Si es una actualización desde Google Calendar, podemos omitir la verificación
      // de disponibilidad ya que Google Calendar debería ser la fuente de verdad
      const isFromGoogleCalendar = appointment.isFromGoogleCalendar === true;

      // If updating appointment time, verify it's available (pass id to exclude this appointment)
      if (appointment.appointmentTime && !isFromGoogleCalendar) {
        const isAvailable = await this.isTimeSlotAvailable(
          appointment.appointmentTime, 
          id,
          undefined,
          appointment // Pasar el appointment para verificar tipo de servicio
        );
        if (!isAvailable) {
          throw new Error('El horario seleccionado no está disponible');
        }
      }

      // Update the appointment in our database
      const [updated] = await db
        .update(appointments)
        .set({
          ...appointment,
          // Ensure the appointmentTime is properly formatted as a Date
          ...(appointment.appointmentTime && {
            appointmentTime: new Date(appointment.appointmentTime)
          }),
          updatedAt: new Date()
        })
        .where(eq(appointments.id, id))
        .returning();

      if (!updated) {
        throw new Error('Error updating appointment');
      }

      // If the appointment has a Google Calendar event, update it
      if (updated.googleEventId) {
        try {
          await updateAppointmentInCalendar(updated, updated.googleEventId);
        } catch (error) {
          console.error('Error updating appointment in Google Calendar:', error);
          // Continue with the update even if Google Calendar update fails
        }
      } 
      // If no Google Calendar event but we should have one, create it
      else {
        try {
          const googleEventId = await addAppointmentToCalendar(updated);
          if (googleEventId) {
            // Update our record with the new event ID
            const [finalUpdated] = await db
              .update(appointments)
              .set({ 
                googleEventId,
                updatedAt: new Date()
              })
              .where(eq(appointments.id, id))
              .returning();
            
            return finalUpdated;
          }
        } catch (error) {
          console.error('Error adding appointment to Google Calendar during update:', error);
          // Continue with the update even if Google Calendar creation fails
        }
      }

      return updated;
    });
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    return this.withRetry(async () => {
      const [appointment] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, id));
      return appointment;
    });
  }
  
  async getAppointmentByCancellationToken(token: string): Promise<Appointment | undefined> {
    return this.withRetry(async () => {
      console.log(`Buscando cita con token de cancelación: ${token.substring(0, 10)}...`);
      
      const [appointment] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.cancellationToken, token));
      
      if (appointment) {
        console.log(`Cita encontrada: ID ${appointment.id}, ${appointment.patientName}, ${new Date(appointment.appointmentTime).toLocaleString()}`);
      } else {
        console.log('No se encontró ninguna cita con ese token de cancelación');
      }
      
      return appointment;
    });
  }

  // Patient methods
  async createPatient(patient: InsertPatient): Promise<Patient> {
    return this.withRetry(async () => {
      const [created] = await db
        .insert(patients)
        .values(patient)
        .returning();
      return created;
    });
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    return this.withRetry(async () => {
      const [patient] = await db
        .select()
        .from(patients)
        .where(eq(patients.id, id));
      return patient;
    });
  }

  async updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient> {
    return this.withRetry(async () => {
      const [updated] = await db
        .update(patients)
        .set({ ...patient, updatedAt: new Date() })
        .where(eq(patients.id, id))
        .returning();
      return updated;
    });
  }

  async getAllPatients(): Promise<Patient[]> {
    return this.withRetry(async () => {
      return await db
        .select()
        .from(patients)
        .orderBy(desc(patients.createdAt));
    });
  }

  async searchPatients(query: string): Promise<Patient[]> {
    return this.withRetry(async () => {
      const searchQuery = `%${query}%`;
      return await db
        .select()
        .from(patients)
        .where(
          or(
            ilike(patients.name, searchQuery),
            ilike(patients.email, searchQuery)
          )
        );
    });
  }

  // Medical record methods
  async createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord> {
    return this.withRetry(async () => {
      const [created] = await db
        .insert(medicalRecords)
        .values(record)
        .returning();
      return created;
    });
  }

  async getMedicalRecord(id: number): Promise<MedicalRecord | undefined> {
    return this.withRetry(async () => {
      const [record] = await db
        .select()
        .from(medicalRecords)
        .where(eq(medicalRecords.id, id));
      return record;
    });
  }

  async getPatientMedicalRecords(patientId: number): Promise<MedicalRecord[]> {
    return this.withRetry(async () => {
      return await db
        .select()
        .from(medicalRecords)
        .where(eq(medicalRecords.patientId, patientId))
        .orderBy(desc(medicalRecords.createdAt));
    });
  }

  async updateMedicalRecord(id: number, record: Partial<InsertMedicalRecord>): Promise<MedicalRecord> {
    return this.withRetry(async () => {
      const [updated] = await db
        .update(medicalRecords)
        .set({ ...record, updatedAt: new Date() })
        .where(eq(medicalRecords.id, id))
        .returning();
      return updated;
    });
  }

  // Admin methods
  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    return this.withRetry(async () => {
      const [admin] = await db
        .select()
        .from(admins)
        .where(eq(admins.username, username));
      return admin;
    });
  }

  async getAdmin(id: number): Promise<Admin | undefined> {
    return this.withRetry(async () => {
      const [admin] = await db
        .select()
        .from(admins)
        .where(eq(admins.id, id));
      return admin;
    });
  }

  async createAdmin(insertAdmin: InsertAdmin): Promise<Admin> {
    return this.withRetry(async () => {
      const [admin] = await db
        .insert(admins)
        .values(insertAdmin)
        .returning();
      return admin;
    });
  }

  async updateAdminPassword(id: number, password: string): Promise<void> {
    return this.withRetry(async () => {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db
        .update(admins)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(admins.id, id));
    });
  }

  async updateAdminUsername(id: number, username: string): Promise<void> {
    return this.withRetry(async () => {
      // Verificar si el nombre de usuario ya existe
      const existingAdmin = await this.getAdminByUsername(username);
      if (existingAdmin && existingAdmin.id !== id) {
        throw new Error("El nombre de usuario ya está en uso");
      }

      await db
        .update(admins)
        .set({ 
          username,
          updatedAt: new Date()
        })
        .where(eq(admins.id, id));
    });
  }

  // Schedule config methods
  async getScheduleConfig(): Promise<ScheduleConfig | undefined> {
    return this.withRetry(async () => {
      const [config] = await db
        .select()
        .from(scheduleConfig)
        .orderBy(desc(scheduleConfig.createdAt))
        .limit(1);

      if (!config) {
        return this.createDefaultScheduleConfig();
      }

      return config;
    });
  }

  async updateScheduleConfig(config: InsertScheduleConfig): Promise<ScheduleConfig> {
    return this.withRetry(async () => {
      const [updated] = await db
        .update(scheduleConfig)
        .set({ ...config, updatedAt: new Date() })
        .returning();
      return updated;
    });
  }

  async createDefaultScheduleConfig(): Promise<ScheduleConfig> {
    return this.withRetry(async () => {
      const defaultConfig = {
        workDays: ["miercoles"], // Usando la forma normalizada sin acento
        startTime: "09:00",
        endTime: "12:00",
        vacationPeriods: [],
      };

      const [config] = await db
        .insert(scheduleConfig)
        .values(defaultConfig)
        .returning();
      return config;
    });
  }

  // Patient milestone methods
  async createPatientMilestone(milestone: InsertPatientMilestone): Promise<PatientMilestone> {
    return this.withRetry(async () => {
      const [created] = await db
        .insert(patientMilestones)
        .values(milestone)
        .returning();
      return created;
    });
  }

  async getPatientMilestone(id: number): Promise<PatientMilestone | undefined> {
    return this.withRetry(async () => {
      const [milestone] = await db
        .select()
        .from(patientMilestones)
        .where(eq(patientMilestones.id, id));
      return milestone;
    });
  }

  async getPatientMilestones(patientId: number): Promise<PatientMilestone[]> {
    return this.withRetry(async () => {
      return await db
        .select()
        .from(patientMilestones)
        .where(eq(patientMilestones.patientId, patientId))
        .orderBy(patientMilestones.order);
    });
  }

  async updatePatientMilestone(id: number, milestone: Partial<InsertPatientMilestone>): Promise<PatientMilestone> {
    return this.withRetry(async () => {
      const [updated] = await db
        .update(patientMilestones)
        .set({ ...milestone, updatedAt: new Date() })
        .where(eq(patientMilestones.id, id))
        .returning();
      return updated;
    });
  }

  async deletePatientMilestone(id: number): Promise<void> {
    return this.withRetry(async () => {
      await db.delete(patientMilestones).where(eq(patientMilestones.id, id));
    });
  }

  // Métodos de gestión de días bloqueados
  async createBlockedDay(blockedDay: InsertBlockedDay): Promise<BlockedDay> {
    return this.withRetry(async () => {
      const [newBlockedDay] = await db.insert(blockedDays).values(blockedDay).returning();
      return newBlockedDay;
    });
  }

  async getBlockedDays(): Promise<BlockedDay[]> {
    return this.withRetry(async () => {
      const result = await db.select().from(blockedDays);
      return result;
    });
  }

  async getBlockedDay(id: number): Promise<BlockedDay | undefined> {
    return this.withRetry(async () => {
      const result = await db.select().from(blockedDays).where(eq(blockedDays.id, id)).limit(1);
      return result[0];
    });
  }

  async deleteBlockedDay(id: number): Promise<void> {
    return this.withRetry(async () => {
      await db.delete(blockedDays).where(eq(blockedDays.id, id));
    });
  }

  async isDateBlocked(date: Date): Promise<boolean> {
    return this.withRetry(async () => {
      // Creamos fechas para comparar solo la fecha (sin la hora)
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const result = await db.select()
        .from(blockedDays)
        .where(
          and(
            gte(blockedDays.date, startOfDay),
            lte(blockedDays.date, endOfDay)
          )
        )
        .limit(1);
        
      return result.length > 0;
    });
  }
}

export const storage = new DatabaseStorage();