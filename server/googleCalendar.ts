import { google, calendar_v3 } from 'googleapis';
import { Appointment } from '@shared/schema';
import fs from 'fs';
import path from 'path';

/**
 * Helper function to determine the appointment duration in minutes
 * based on the service type.
 */
function getAppointmentDuration(serviceType: string): number {
  // Services that require 40 minutes
  if (
    serviceType === "Extracción & Colocación de DIU" ||
    serviceType === "Extracción de DIU" ||
    serviceType === "Colocación de DIU" ||
    serviceType === "Biopsia"
  ) {
    return 40;
  }
  
  // All other services (including Consulta normal and Consulta & PAP) are 20 minutes
  return 20;
}

// Configuration for Google Calendar
let client: any = null;
let calendarId: string | null = null;
let isInitialized: boolean = false;
let isEnabled: boolean = true; // Por defecto, la integración está habilitada si está inicializada

// Function to check if Google Calendar is initialized
export function isGoogleCalendarInitialized(): boolean {
  return isInitialized;
}

// Function to check if Google Calendar integration is enabled
export function isGoogleCalendarEnabled(): boolean {
  return isEnabled;
}

// Function to set whether Google Calendar integration is enabled
export function setGoogleCalendarEnabled(enabled: boolean): void {
  isEnabled = enabled;
  console.log(`Google Calendar integration ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Helper function to convert a key to PEM format
 */
function formatPrivateKeyToPem(key: string): string {
  // Remove any BEGIN/END markers and whitespace to get just the base64 content
  let base64Content = key
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  
  // Add back the markers and format with proper line breaks
  let pemKey = '-----BEGIN PRIVATE KEY-----\n';
  
  // Add the base64 content in chunks of 64 characters
  while (base64Content.length > 0) {
    pemKey += base64Content.substring(0, 64) + '\n';
    base64Content = base64Content.substring(64);
  }
  
  pemKey += '-----END PRIVATE KEY-----';
  return pemKey;
}

/**
 * Initialize the Google Calendar client with credentials
 */
export async function initGoogleCalendar(): Promise<boolean> {
  try {
    if (!process.env.GOOGLE_CLIENT_EMAIL || 
        !process.env.GOOGLE_PRIVATE_KEY || 
        !process.env.GOOGLE_CALENDAR_ID) {
      console.log('Google Calendar credentials are missing');
      return false;
    }

    // Format the private key - handle various formats
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
    
    // Make sure the key has the right format with begin/end markers and proper newlines
    // Handle different formats of the key that might come from various environment sources
    
    // Log key format details (without showing the actual key)
    console.log('Key format debugging:');
    console.log('- Key starts with "-----BEGIN PRIVATE KEY-----":', privateKey.startsWith('-----BEGIN PRIVATE KEY-----'));
    console.log('- Key ends with "-----END PRIVATE KEY-----":', privateKey.endsWith('-----END PRIVATE KEY-----'));
    console.log('- Key contains literal \\n:', privateKey.includes('\\n'));
    console.log('- Key contains JSON quotes:', privateKey.startsWith('"') && privateKey.endsWith('"'));
    
    // Try multiple approaches to get the key in the right format
    
    // First approach: If the key is JSON stringified, parse it
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      try {
        privateKey = JSON.parse(privateKey);
        console.log('Successfully parsed key from JSON format');
      } catch (e) {
        console.error('Failed to parse key from JSON format');
      }
    }
    
    // Second approach: Replace literal \n with actual newlines
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
      console.log('Replaced literal \\n with actual newlines');
    }
    
    // Third approach: For keys that don't have BEGIN/END markers, attempt to fix
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      const cleanedKey = privateKey.trim();
      privateKey = `-----BEGIN PRIVATE KEY-----\n${cleanedKey}\n-----END PRIVATE KEY-----`;
      console.log('Added BEGIN/END markers to key');
    }
    
    // Fourth approach: Ensure the key is properly formatted with newlines after BEGIN and before END
    if (privateKey.includes('-----BEGIN PRIVATE KEY-----') && 
        !privateKey.match(/-----BEGIN PRIVATE KEY-----\n/)) {
      privateKey = privateKey.replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n');
      console.log('Added newline after BEGIN marker');
    }
    
    if (privateKey.includes('-----END PRIVATE KEY-----') && 
        !privateKey.match(/\n-----END PRIVATE KEY-----/)) {
      privateKey = privateKey.replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
      console.log('Added newline before END marker');
    }
    
    // Fifth approach: Try the complete PEM formatting function
    try {
      // If we still have issues, try the full PEM formatter
      if (privateKey.includes('BEGIN PRIVATE KEY')) {
        console.log('Trying to reformat key with full PEM formatter');
        privateKey = formatPrivateKeyToPem(privateKey);
      }
    } catch (e) {
      console.error('Error during PEM formatting:', e);
    }
    
    // Log a diagnostic message (without the actual key content)
    if (privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      console.log('Private key appears to be in the correct format with BEGIN/END markers');
    } else {
      console.log('Private key does NOT have the expected BEGIN/END markers. This will likely cause authentication failures.');
    }
    
    try {
      // Try an alternative approach using file-based credentials if available
      const keyFilePath = path.join(process.cwd(), 'credentials.json');
      if (fs.existsSync(keyFilePath)) {
        console.log('Using credentials.json file for Google Calendar authentication');
        const auth = new google.auth.GoogleAuth({
          keyFile: keyFilePath,
          scopes: ['https://www.googleapis.com/auth/calendar'],
        });
        client = await auth.getClient();
      } else {
        // Create the JWT client for authentication
        client = new google.auth.JWT(
          process.env.GOOGLE_CLIENT_EMAIL,
          undefined,
          privateKey,
          ['https://www.googleapis.com/auth/calendar']
        );
      }
    } catch (authError) {
      console.error('Error setting up Google Calendar authentication:', authError);
      return false;
    }
    
    calendarId = process.env.GOOGLE_CALENDAR_ID;
    
    // Test the connection
    const calendar = google.calendar({ version: 'v3', auth: client });
    await calendar.calendarList.list();
    
    console.log('Google Calendar integration successfully initialized');
    isInitialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize Google Calendar integration:', error);
    
    // More detailed diagnostics
    if (!process.env.GOOGLE_CLIENT_EMAIL) {
      console.error('Missing GOOGLE_CLIENT_EMAIL environment variable');
    }
    if (!process.env.GOOGLE_PRIVATE_KEY) {
      console.error('Missing GOOGLE_PRIVATE_KEY environment variable');
    } else {
      console.error('GOOGLE_PRIVATE_KEY length:', process.env.GOOGLE_PRIVATE_KEY.length);
      
      // More detailed diagnostics based on the type of error
      const errorStr = error instanceof Error ? error.toString() : String(error);
      
      if (errorStr.includes('DECODER routines') && errorStr.includes('unsupported')) {
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
      } else if (errorStr.includes('invalid_grant') && errorStr.includes('account not found')) {
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
        // For other types of errors, provide a general diagnostic message
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
      console.error('Missing GOOGLE_CALENDAR_ID environment variable');
    }
    
    console.error('Google Calendar integration not initialized - missing or malformed credentials');
    console.error('To use Google Calendar integration, please provide the following environment variables:');
    console.error('- GOOGLE_CLIENT_EMAIL: Service account email from Google Cloud');
    console.error('- GOOGLE_PRIVATE_KEY: Private key from Google Cloud service account (ensure correct format)');
    console.error('- GOOGLE_CALENDAR_ID: ID of the Google Calendar to use');
    console.error('The application will continue to work without Google Calendar integration.');
    
    return false;
  }
}

/**
 * Add an appointment to Google Calendar
 */
export async function addAppointmentToCalendar(appointment: Appointment): Promise<string | null> {
  if (!client || !calendarId || !isEnabled) {
    console.log(`Google Calendar integration not ${!isEnabled ? 'enabled' : 'initialized'}`);
    return null;
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth: client });
    
    // Calculate end time based on service type
    const startDateTime = new Date(appointment.appointmentTime);
    
    // Determine service type and set duration
    let durationMinutes = 20; // Default for standard consultations
    
    if (appointment.serviceType === "Extracción & Colocación de DIU" || 
        appointment.serviceType === "Terapia de Ginecología Regenerativa") {
      // Special services that require 40 minutes
      durationMinutes = 40;
    } else if (appointment.serviceType === "Consulta & PAP") {
      // PAP services might need a bit more time
      durationMinutes = 30;
    }
    
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes);
    console.log(`Setting calendar event duration to ${durationMinutes} minutes for service: ${appointment.serviceType}`);

    // Create event
    const event: calendar_v3.Schema$Event = {
      summary: `Consulta: ${appointment.patientName}`,
      description: `
        Paciente: ${appointment.patientName}
        Email: ${appointment.email}
        Teléfono: ${appointment.phone}
        Tipo de servicio: ${appointment.serviceType || 'Consulta'}
        Obra Social: ${appointment.obraSocial || 'Particular'}
        Primera visita: ${appointment.isFirstTime ? 'Sí' : 'No'}
        Notas: ${appointment.notes || 'Sin notas'}
      `,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      colorId: (appointment.serviceType && appointment.serviceType.includes('DIU')) ? '11' : // Red for DIU procedures
              (appointment.serviceType && appointment.serviceType.includes('PAP')) ? '5' :   // Yellow for PAP
              '1',                                              // Blue for regular consultations
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 },      // 1 hour before
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event,
    });

    console.log('Event created in Google Calendar:', response.data.id);
    return response.data.id || null;
  } catch (error) {
    console.error('Error creating event in Google Calendar:', error);
    return null;
  }
}

/**
 * Update an appointment in Google Calendar
 */
export async function updateAppointmentInCalendar(
  appointment: Appointment, 
  googleEventId: string
): Promise<boolean> {
  if (!client || !calendarId || !isEnabled) {
    console.log(`Google Calendar integration not ${!isEnabled ? 'enabled' : 'initialized'}`);
    return false;
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth: client });
    
    // Calculate end time based on service type
    const startDateTime = new Date(appointment.appointmentTime);
    
    // Determine service type and set duration
    let durationMinutes = 20; // Default for standard consultations
    
    if (appointment.serviceType === "Extracción & Colocación de DIU" || 
        appointment.serviceType === "Terapia de Ginecología Regenerativa") {
      // Special services that require 40 minutes
      durationMinutes = 40;
    } else if (appointment.serviceType === "Consulta & PAP") {
      // PAP services might need a bit more time
      durationMinutes = 30;
    }
    
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes);
    console.log(`Setting calendar event duration to ${durationMinutes} minutes for service: ${appointment.serviceType}`);

    // Update event
    const event: calendar_v3.Schema$Event = {
      summary: `Consulta: ${appointment.patientName}`,
      description: `
        Paciente: ${appointment.patientName}
        Email: ${appointment.email}
        Teléfono: ${appointment.phone}
        Tipo de servicio: ${appointment.serviceType || 'Consulta'}
        Obra Social: ${appointment.obraSocial || 'Particular'}
        Primera visita: ${appointment.isFirstTime ? 'Sí' : 'No'}
        Notas: ${appointment.notes || 'Sin notas'}
      `,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      colorId: (appointment.serviceType && appointment.serviceType.includes('DIU')) ? '11' : // Red for DIU procedures
              (appointment.serviceType && appointment.serviceType.includes('PAP')) ? '5' :   // Yellow for PAP
              '1',                                              // Blue for regular consultations
    };

    await calendar.events.update({
      calendarId: calendarId,
      eventId: googleEventId,
      requestBody: event,
    });

    console.log('Event updated in Google Calendar:', googleEventId);
    return true;
  } catch (error) {
    console.error('Error updating event in Google Calendar:', error);
    return false;
  }
}

/**
 * Delete an appointment from Google Calendar
 */
export async function deleteAppointmentFromCalendar(googleEventId: string): Promise<boolean> {
  if (!client || !calendarId || !isEnabled) {
    console.log(`Google Calendar integration not ${!isEnabled ? 'enabled' : 'initialized'}`);
    return false;
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth: client });
    
    await calendar.events.delete({
      calendarId: calendarId,
      eventId: googleEventId,
    });

    console.log('Event deleted from Google Calendar:', googleEventId);
    return true;
  } catch (error) {
    console.error('Error deleting event from Google Calendar:', error);
    return false;
  }
}

/**
 * Fetch events from Google Calendar for a specific date range
 */
export async function getCalendarEvents(
  startDate: Date, 
  endDate: Date,
  maxResults: number = 100 // Limitar el número de resultados por defecto
): Promise<calendar_v3.Schema$Event[] | null> {
  if (!client || !calendarId || !isEnabled) {
    console.log(`Google Calendar integration not ${!isEnabled ? 'enabled' : 'initialized'}`);
    return null;
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth: client });
    
    console.log(`Fetching up to ${maxResults} calendar events from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
    
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: maxResults // Limitar el número de eventos que se obtienen
    });

    console.log(`Successfully retrieved ${response.data.items?.length || 0} events from Google Calendar`);
    return response.data.items || [];
  } catch (error) {
    if (error instanceof Error && error.message.includes('rateLimitExceeded')) {
      console.error('Google Calendar API rate limit exceeded. Try again later or reduce the frequency of synchronization.');
    } else {
      console.error('Error fetching events from Google Calendar:', error);
    }
    return null;
  }
}

/**
 * Synchronize appointments from Google Calendar to our database
 * This function fetches events from Google Calendar and updates our appointments
 * if changes were made directly in Google Calendar
 */
export async function syncCalendarToDatabase(
  db: any, // Drizzle instance
  storage: any, // Storage instance
  startDate?: Date,
  endDate?: Date
): Promise<{ success: boolean, updated: number, errors: number }> {
  // Si no se proporcionan fechas, usar solo 7 días a partir de hoy (reducido para evitar sobrecarga) 
  if (!startDate) {
    const today = new Date();
    // Simplemente 7 días atrás
    startDate = new Date(today);
    startDate.setDate(today.getDate() - 7);
  }
  
  if (!endDate) {
    const today = new Date();
    // Solo 7 días adelante (mucho más conservador)
    endDate = new Date(today);
    endDate.setDate(today.getDate() + 7);
  }
  
  // Limitar el rango a un máximo de 30 días para evitar sobrecarga
  const maxRangeMs = 30 * 24 * 60 * 60 * 1000; // 30 días en milisegundos
  const requestedRangeMs = endDate.getTime() - startDate.getTime();
  
  if (requestedRangeMs > maxRangeMs) {
    console.log(`Requested sync range (${Math.round(requestedRangeMs / (24 * 60 * 60 * 1000))} days) is too large, limiting to 30 days`);
    endDate = new Date(startDate.getTime() + maxRangeMs);
  }
  
  console.log(`Synchronizing calendar using date range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
  
  if (!client || !calendarId || !isEnabled) {
    console.log(`Google Calendar integration not ${!isEnabled ? 'enabled' : 'initialized'}`);
    return { success: false, updated: 0, errors: 0 };
  }

  try {
    console.log('Starting synchronization from Google Calendar to database...');
    console.log(`Fetching events from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Get events from Google Calendar
    const events = await getCalendarEvents(startDate, endDate);
    console.log(`Retrieved ${events?.length || 0} events from Google Calendar`);
    
    if (!events || events.length === 0) {
      console.log('No events found or error fetching events from Google Calendar');
      return { success: true, updated: 0, errors: 0 };
    }

    // Get all appointments with a Google Calendar event ID
    const appointments = await storage.getAllAppointments();
    const googleLinkedAppointments = appointments.filter((apt: any) => apt.googleEventId);
    
    // Create a map of appointments by Google event ID for quicker lookups
    const appointmentsByGoogleId = new Map();
    googleLinkedAppointments.forEach((apt: any) => {
      if (apt.googleEventId) {
        appointmentsByGoogleId.set(apt.googleEventId, apt);
      }
    });

    // Create a set of processed Google event IDs to avoid duplicates in the same sync session
    const processedEventIds = new Set<string>();

    let updatedCount = 0;
    let errorCount = 0;

    // Crear un conjunto de IDs de eventos de Google Calendar para identificar eliminados
    const currentGoogleEventIds = new Set<string>();
    
    // Recolectar todos los IDs de eventos actuales
    events.forEach(event => {
      if (event.id) {
        currentGoogleEventIds.add(event.id);
      }
    });
    
    // Verificar eventos eliminados en Google Calendar
    // Convertimos las entradas del Map a un array para evitar problemas de iteración
    const appointmentEntries = Array.from(appointmentsByGoogleId.entries());
    
    for (const [googleEventId, appointment] of appointmentEntries) {
      // Si un evento ya no está en Google Calendar pero tenemos una cita enlazada a él
      if (!currentGoogleEventIds.has(googleEventId)) {
        console.log(`Event ${googleEventId} has been deleted from Google Calendar. Updating status of appointment ${appointment.id}...`);
        
        try {
          // Actualizar el estado de la cita a cancelado
          await storage.updateAppointment(appointment.id, {
            status: "canceled",
            notes: (appointment.notes || '') + "\nCancelado automáticamente: Evento eliminado de Google Calendar",
            isFromGoogleCalendar: true
          });
          
          console.log(`Appointment ${appointment.id} marked as canceled due to Google Calendar deletion.`);
          updatedCount++;
        } catch (error) {
          console.error(`Error updating appointment ${appointment.id} to canceled:`, error);
          errorCount++;
        }
      }
    }
    
    // Process each event from Google Calendar
    for (const event of events) {
      if (!event.id) continue;
      
      // Skip if we've already processed this event in the current sync session
      if (processedEventIds.has(event.id)) {
        console.log(`Event ${event.id} already processed in this sync session - skipping`);
        continue;
      }

      // Mark event as processed to avoid duplicate processing in the same sync
      processedEventIds.add(event.id);
      
      // Obtener fechas del evento
      const eventStart = event.start?.dateTime ? new Date(event.start.dateTime) : null;
      if (!eventStart) continue;
      
      // Verificar si este evento está vinculado a una cita en nuestra BD
      if (appointmentsByGoogleId.has(event.id)) {
        // CASO 1: Evento existente - Verificar si hubo cambios en Google Calendar
        const appointment = appointmentsByGoogleId.get(event.id);
        const appointmentTime = new Date(appointment.appointmentTime);
        
        // Si el evento tiene una hora de inicio diferente a nuestra cita
        if (eventStart.getTime() !== appointmentTime.getTime()) {
          console.log(`Event ${event.id} has been updated in Google Calendar. Updating appointment ${appointment.id}...`);
          
          try {
            // Actualizar la cita con la nueva hora e indicar que los cambios
            // vienen de Google Calendar para omitir algunas validaciones
            await storage.updateAppointment(appointment.id, {
              appointmentTime: eventStart,
              isFromGoogleCalendar: true
            });
            
            console.log(`Appointment ${appointment.id} updated successfully.`);
            updatedCount++;
          } catch (error) {
            console.error(`Error updating appointment ${appointment.id}:`, error);
            errorCount++;
          }
        }
      } else {
        // CASO 2: Nuevo evento creado en Google Calendar
        // Verificar si debemos crear una cita para este evento
        
        if (event.summary) {
          // Primero registramos el evento para debug
          console.log(`Evaluando evento de Google Calendar: ${event.id}, "${event.summary}", fecha: ${eventStart.toISOString()}`);
          console.log(`New event found in Google Calendar: ${event.id}, ${event.summary}`);
          
          try {
            // Verificar si ya existe una cita con la misma fecha/hora y nombre similar
            // esto ayudará a evitar duplicados incluso si no tienen el mismo googleEventId
            const sameTimeAppointments = await storage.getAppointmentsByDate(eventStart);
            const exactTimeMatch = sameTimeAppointments.filter((apt: any) => {
              const aptTime = new Date(apt.appointmentTime);
              return aptTime.getTime() === eventStart.getTime();
            });

            // Si ya hay citas en ese horario exacto, verificar si el nombre es similar
            if (exactTimeMatch.length > 0) {
              const patientName = event.summary.split('-')[0]?.trim() || event.summary;
              
              // Buscar coincidencia aproximada por nombre
              const nameMatch = exactTimeMatch.find((apt: any) => {
                // Si ya tiene googleEventId pero es diferente, es otra cita
                if (apt.googleEventId && apt.googleEventId !== event.id) return false;
                
                // Verificar si el nombre del paciente es similar (ignora caso y espacios)
                const simplifyName = (name: string) => name.toLowerCase().replace(/\s+/g, '');
                const simpleEventName = simplifyName(patientName);
                const simpleAptName = simplifyName(apt.patientName);
                
                return simpleEventName.includes(simpleAptName) || 
                       simpleAptName.includes(simpleEventName) ||
                       // O coincidencia exacta en hora y fecha
                       (apt.patientName === "Paciente desde Google Calendar");
              });
              
              if (nameMatch) {
                console.log(`Found existing appointment #${nameMatch.id} with similar name and same time. Updating with Google ID instead of creating duplicate.`);
                
                // Actualizar la cita existente con el ID de Google
                await storage.updateAppointment(nameMatch.id, {
                  googleEventId: event.id,
                  isFromGoogleCalendar: true
                });
                
                updatedCount++;
                continue; // Skip creation since we updated an existing one
              }
            }
            
            // Extraer el nombre del paciente y otros detalles del resumen o la descripción
            let patientName = "Paciente desde Google Calendar";
            let serviceType = "Consulta";
            let obraSocial = "Particular";
            
            if (event.summary) {
              // Primero intentamos analizar el título para extraer toda la información
              // Formato esperado: "Nombre Paciente - Servicio - Obra Social"
              const titleParts = event.summary.split('-').map(part => part.trim());
              
              // El primer segmento siempre es el nombre
              if (titleParts.length >= 1) {
                patientName = titleParts[0];
              }
              
              // Si hay un segundo segmento, es el tipo de servicio
              if (titleParts.length >= 2) {
                // Normalizar el tipo de servicio
                const normalizedService = titleParts[1].toLowerCase();
                
                if (normalizedService.includes('pap')) {
                  serviceType = "Consulta & PAP";
                } else if (normalizedService.includes('diu')) {
                  serviceType = "Extracción & Colocación de DIU";
                } else if (normalizedService.includes('terapia') || normalizedService.includes('regenerativa')) {
                  serviceType = "Terapia de Ginecología Regenerativa";
                } else {
                  serviceType = titleParts[1];
                }
              }
              
              // Si hay un tercer segmento, es la obra social
              if (titleParts.length >= 3) {
                obraSocial = titleParts[2];
              }
            }
            
            // Si hay descripción, también intentamos extraer información de allí
            // (esto es para compatibilidad con eventos antiguos)
            if (event.description) {
              if (event.description.includes('Servicio:') && serviceType === "Consulta") {
                const serviceMatch = event.description.match(/Servicio:\s*(.*?)(?:\n|$)/);
                if (serviceMatch && serviceMatch[1]) {
                  serviceType = serviceMatch[1].trim();
                }
              }
              
              if (event.description.includes('Obra Social:') && obraSocial === "Particular") {
                const osMatch = event.description.match(/Obra Social:\s*(.*?)(?:\n|$)/);
                if (osMatch && osMatch[1]) {
                  obraSocial = osMatch[1].trim();
                }
              }
            }
            
            console.log(`Información extraída del evento de Google Calendar:`, {
              titulo: event.summary,
              patientName,
              serviceType,
              obraSocial
            });
            
            // Crear la cita en nuestra base de datos - usando isFromGoogleCalendar=true
            // para evitar validaciones de disponibilidad
            const newAppointment = await storage.createAppointment({
              patientName,
              appointmentTime: eventStart,
              email: "",
              phone: "",
              serviceType,
              obraSocial,
              googleEventId: event.id,
              isFirstTime: false,
              status: "confirmed",
              notes: `Creado automáticamente desde Google Calendar. Evento original: ${event.summary}`,
              isFromGoogleCalendar: true // Marcar que viene de Google Calendar para omitir validaciones
            });
            
            console.log(`Created new appointment from Google Calendar event: ${newAppointment.id}`);
            updatedCount++;
          } catch (error) {
            console.error(`Error creating appointment from Google Calendar event ${event.id}:`, error);
            errorCount++;
          }
        }
      }
    }

    console.log(`Synchronization complete. Updated ${updatedCount} appointments. Errors: ${errorCount}.`);
    return { success: true, updated: updatedCount, errors: errorCount };
  } catch (error) {
    console.error('Error synchronizing from Google Calendar to database:', error);
    return { success: false, updated: 0, errors: 1 };
  }
}