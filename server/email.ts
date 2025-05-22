import { MailService } from '@sendgrid/mail';
import { format, addHours, formatISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';

// Definir la zona horaria de Argentina para uso en toda la aplicación
const TIMEZONE = 'America/Argentina/Buenos_Aires';

// Función para generar un enlace de Google Calendar
export function generateGoogleCalendarLink(appointment: {
  appointmentTime: Date;
  patientName: string;
  serviceType: string | null;
}) {
  try {
    const startDate = new Date(appointment.appointmentTime);
    const serviceType = appointment.serviceType || 'Consulta'; // Valor predeterminado si es null
    
    // Determinar la duración según el tipo de servicio
    let durationMinutes = 20; // Duración predeterminada
    if (serviceType.includes('PAP')) {
      durationMinutes = 30;
    } else if (serviceType.includes('DIU') || serviceType.includes('Regenerativa') || serviceType.includes('Biopsia')) {
      durationMinutes = 40;
    }
    
    const endDate = addHours(startDate, durationMinutes / 60);
    
    // Formatear fechas para la URL
    const formatForCalendar = (date: Date) => {
      return format(date, "yyyyMMdd'T'HHmmss");
    };
    
    const formattedStart = formatForCalendar(startDate);
    const formattedEnd = formatForCalendar(endDate);
    
    // Crear los parámetros para el enlace
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `Turno con Dra. Jazmín Montañés - ${serviceType}`,
      dates: `${formattedStart}/${formattedEnd}`,
      details: `Turno médico para ${appointment.patientName}. Servicio: ${serviceType}. 
                Por favor, llegue 10 minutos antes. En caso de no poder asistir, comunicarse a info@jazmingineco.com.ar`,
      location: 'Av. Rivadavia 15822, Haedo, Buenos Aires, Argentina',
    });
    
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  } catch (error) {
    console.error('Error al generar enlace de Google Calendar:', error);
    return ''; // Devolver cadena vacía en caso de error
  }
}

// Variable para controlar si se envían correos reales o simulados
const SIMULATE_EMAIL = true; // Cambiado a true para permitir ejecutar la aplicación sin API key

// Solo verificar API key si no estamos en modo simulación
if (!process.env.SENDGRID_API_KEY && !SIMULATE_EMAIL) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
if (!SIMULATE_EMAIL) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY || '');
  console.log('SendGrid inicializado en modo real.');
} else {
  console.log('SendGrid inicializado en modo de simulación. Los correos no se enviarán realmente.');
}

interface EmailParams {
  to: string;
  subject: string;
  text?: string; // Mantenemos como opcional en la interfaz
  html?: string;
}

/**
 * Envía un correo a la doctora notificando una nueva cita
 */
export async function sendDoctorNotification(appointment: {
  appointmentTime: Date;
  patientName: string;
  serviceType: string;
  email: string;
  phone: string;
  obraSocial: string;
  isFirstTime: boolean;
  notes?: string;
}): Promise<boolean> {
  // Convertir la fecha a la zona horaria de Argentina
  const appointmentDate = toZonedTime(new Date(appointment.appointmentTime), TIMEZONE);
  
  console.log('Enviando notificación a doctora - Información de horario:');
  console.log(' - Fecha UTC original:', appointment.appointmentTime);
  console.log(' - Fecha Argentina ajustada:', appointmentDate);
  console.log(' - Hora Argentina:', format(appointmentDate, 'HH:mm'));
  
  const formattedDate = format(appointmentDate, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es });
  
  const subject = `Nueva cita: ${appointment.patientName} - ${format(appointmentDate, "d/M/yy HH:mm")}`;
  
  // Generar enlace de WhatsApp para la doctora
  const whatsappLink = formatWhatsAppLink(appointment.phone);
  
  // Detalles importantes para la doctora
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <h2 style="color: #8a4a8c; border-bottom: 1px solid #8a4a8c; padding-bottom: 10px;">Nueva cita agendada</h2>
      
      <p>Hola Dra. Jazmín,</p>
      
      <p>Se ha registrado una nueva cita en su agenda:</p>
      
      <div style="background-color: #f9f0f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Paciente:</strong> ${appointment.patientName} ${appointment.isFirstTime ? '(Primera consulta)' : ''}</p>
        <p><strong>Fecha y hora:</strong> ${formattedDate}</p>
        <p><strong>Tipo de servicio:</strong> ${appointment.serviceType}</p>
        <p><strong>Obra social:</strong> ${appointment.obraSocial}</p>
        <p><strong>Teléfono:</strong> <a href="${whatsappLink}" target="_blank" style="color: #25D366; text-decoration: underline;">${appointment.phone}</a></p>
        <p><strong>Email:</strong> ${appointment.email}</p>
        ${appointment.notes ? `<p><strong>Notas:</strong> ${appointment.notes}</p>` : ''}
      </div>
      
      <p>Esta cita ya ha sido registrada automáticamente en su Google Calendar.</p>
      
      <p style="font-size: 0.9em; color: #666; margin-top: 30px;">
        Este es un mensaje automático del sistema de turnos online.
      </p>
    </div>
  `;
  
  return await sendAppointmentReminder({
    to: 'info@jazmingineco.com.ar', // Correo de la doctora
    subject: subject,
    html: html
  });
}

/**
 * Convierte un número de teléfono en un enlace de WhatsApp
 * @param phone Número de teléfono (puede contener espacios, guiones, etc.)
 * @returns URL de WhatsApp formateada
 */
function formatWhatsAppLink(phone: string): string {
  // Eliminar todos los caracteres no numéricos
  const cleanedPhone = phone.replace(/\D/g, '');
  
  // Si el número no comienza con 54 (código de Argentina), agregarlo
  let whatsappNumber = cleanedPhone;
  if (!cleanedPhone.startsWith('54')) {
    whatsappNumber = '54' + cleanedPhone;
  }
  
  return `https://wa.me/${whatsappNumber}`;
}

/**
 * Envía un resumen diario de citas para el día siguiente
 * @param appointmentsForNextDay Lista de citas para el día siguiente
 * @param nextDay Fecha del día siguiente
 */
export async function sendDailyScheduleSummary(
  appointmentsForNextDay: Array<{
    appointmentTime: Date;
    patientName: string;
    serviceType: string | null;
    phone: string;
    obraSocial: string | null;
    isFirstTime: boolean | null;
    notes?: string | null;
  }>,
  nextDay: Date
): Promise<boolean> {
  try {
    // En modo de simulación, no verificamos la API key
    if (!SIMULATE_EMAIL) {
      // Verificamos si la API key de SendGrid está configurada
      const apiKey = process.env.SENDGRID_API_KEY || '';
      if (!apiKey || apiKey.length < 10) {
        console.error('No hay una API key válida de SendGrid configurada. No se puede enviar el resumen diario.');
        return false;
      }
    } else {
      console.log('Modo de simulación: Saltando verificación de API key para el resumen diario');
    }

    console.log(`Preparando resumen diario para el día ${format(nextDay, "EEEE d 'de' MMMM", { locale: es })}`);
    
    // Si no hay citas, enviamos un email indicándolo
    if (appointmentsForNextDay.length === 0) {
      console.log(`No hay citas para el día ${format(nextDay, "EEEE d 'de' MMMM", { locale: es })}, se enviará un email informativo.`);
      
      // Enviar email indicando que no hay citas
      return await sendAppointmentReminder({
        to: 'info@jazmingineco.com.ar', // Correo de la doctora
        subject: `No hay citas programadas para mañana: ${format(nextDay, "EEEE d 'de' MMMM", { locale: es })}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #0284c7; text-align: center;">Resumen de Agenda</h2>
            <p>Dra. Jazmín Montañés,</p>
            <p>Le informamos que no hay citas programadas para mañana, ${format(nextDay, "EEEE d 'de' MMMM", { locale: es })}.</p>
            <p>Tenga un buen día.</p>
            <p style="font-size: 12px; color: #666; margin-top: 30px; text-align: center;">
              Este es un mensaje automático del sistema de turnos online.
            </p>
          </div>
        `
      });
    }

    const formattedDate = format(nextDay, "EEEE d 'de' MMMM", { locale: es });
    const subject = `Agenda para mañana: ${format(nextDay, "EEEE d 'de' MMMM", { locale: es })} (${appointmentsForNextDay.length} ${appointmentsForNextDay.length === 1 ? 'cita' : 'citas'})`;
    
    // Ordenar citas por hora
    const sortedAppointments = [...appointmentsForNextDay].sort((a, b) => {
      return new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime();
    });
    
    // Construir tabla HTML con las citas
    let appointmentsHtml = '';
    sortedAppointments.forEach((apt) => {
      // Convertir la hora a la zona horaria de Argentina
      const aptTimeWithZone = toZonedTime(new Date(apt.appointmentTime), TIMEZONE);
      const aptTime = format(aptTimeWithZone, "HH:mm", { locale: es });
      
      // Asegurar que serviceType no sea null
      const serviceType = apt.serviceType || 'Consulta';
      
      // Determinar duración según el tipo de servicio
      let duration = '20 min';
      if (serviceType.includes('PAP')) {
        duration = '30 min';
      } else if (serviceType.includes('DIU') || serviceType.includes('Regenerativa') || serviceType.includes('Biopsia')) {
        duration = '40 min';
      }
      
      const whatsappLink = formatWhatsAppLink(apt.phone);
      
      appointmentsHtml += `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px; border-right: 1px solid #eee;"><strong>${aptTime}</strong></td>
          <td style="padding: 10px; border-right: 1px solid #eee;">${apt.patientName} ${apt.isFirstTime ? '<span style="color: #8a4a8c; font-size: 0.85em;">(Primera vez)</span>' : ''}</td>
          <td style="padding: 10px; border-right: 1px solid #eee;">${serviceType}<br><span style="color: #666; font-size: 0.85em;">${duration}</span></td>
          <td style="padding: 10px; border-right: 1px solid #eee;">${apt.obraSocial || 'Particular'}</td>
          <td style="padding: 10px;">
            <a href="${whatsappLink}" target="_blank" style="color: #25D366; text-decoration: underline; display: inline-flex; align-items: center;">
              <span style="margin-right: 3px;">📱</span> ${apt.phone}
            </a>
          </td>
        </tr>
      `;
    });
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #8a4a8c; border-bottom: 1px solid #8a4a8c; padding-bottom: 10px;">Resumen de Agenda para Mañana</h2>
        
        <p>Hola Dra. Jazmín,</p>
        
        <p>Este es el resumen de su agenda para <strong>${formattedDate}</strong>:</p>
        
        <div style="margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
            <thead>
              <tr style="background-color: #f9f0f9;">
                <th style="padding: 10px; text-align: left; border-right: 1px solid #eee;">Hora</th>
                <th style="padding: 10px; text-align: left; border-right: 1px solid #eee;">Paciente</th>
                <th style="padding: 10px; text-align: left; border-right: 1px solid #eee;">Servicio</th>
                <th style="padding: 10px; text-align: left; border-right: 1px solid #eee;">Obra Social</th>
                <th style="padding: 10px; text-align: left;">Teléfono</th>
              </tr>
            </thead>
            <tbody>
              ${appointmentsHtml}
            </tbody>
          </table>
        </div>
        
        <p><strong>Total de citas:</strong> ${appointmentsForNextDay.length}</p>
        
        <p style="font-size: 0.9em; color: #666; margin-top: 30px;">
          Este es un mensaje automático de su sistema de turnos online.
        </p>
      </div>
    `;
    
    return await sendAppointmentReminder({
      to: 'drajazmingineco@gmail.com', // Correo de la doctora
      subject: subject,
      html: html
    });
  } catch (error) {
    console.error('Error al enviar resumen diario de citas:', error);
    return false;
  }
}

export async function sendAppointmentReminder(params: EmailParams): Promise<boolean> {
  try {
    console.log('Intentando enviar correo a:', params.to);
    console.log('Remitente:', 'consultas@jazmingineco.com.ar (Dra. Jazmín Montañés)');
    console.log('Asunto:', params.subject);
    
    // En modo simulación, no verificamos la API key
    if (!SIMULATE_EMAIL) {
      // Verificar la API key (solo mostramos los primeros y últimos 5 caracteres por seguridad)
      const apiKey = process.env.SENDGRID_API_KEY || '';
      if (apiKey.length > 10) {
        const maskedKey = apiKey.substring(0, 5) + '...' + apiKey.substring(apiKey.length - 5);
        console.log('API key configurada (enmascarada):', maskedKey);
      } else {
        console.error('API key de SendGrid no válida o demasiado corta');
        return false;
      }
    } else {
      console.log('Modo de simulación: Saltando verificación de API key para el envío de correo');
    }
    
    // Generar texto plano a partir del HTML si no se proporciona
    let plainText = params.text || '';  // Iniciar con valor vacío para evitar undefined
    
    if (plainText === '' && params.html) {
      // Usamos una expresión regular segura que no devuelve undefined
      plainText = params.html.replace(/<[^>]*>|&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    }
    
    // Si no hay texto plano ni HTML, usar un texto genérico
    if (plainText === '') {
      plainText = 'Aviso de turno médico. Por favor contacte al consultorio para más detalles.';
    }
    
    // Crear el objeto de correo con nombre y correo
    const mailOptions = {
      to: params.to,
      from: {
        email: 'consultas@jazmingineco.com.ar', // Nuevo correo con dominio propio
        name: 'Dra. Jazmín Montañés' // Nombre para mostrar
      },
      subject: params.subject,
      text: plainText,
      html: params.html,
    };
    
    console.log('Enviando correo con las siguientes opciones:', {
      to: mailOptions.to,
      from: mailOptions.from,
      subject: mailOptions.subject,
      textLength: mailOptions.text.length,
      htmlPresent: !!mailOptions.html
    });
    
    // Enviar el correo o simularlo
    if (!SIMULATE_EMAIL) {
      // Envío real
      const response = await mailService.send(mailOptions);
      console.log('Respuesta de SendGrid:', response);
      console.log('Correo enviado exitosamente a:', params.to);
    } else {
      // Simulación de envío
      console.log('SIMULACIÓN: Correo que se habría enviado:');
      console.log('  - Destinatario:', mailOptions.to);
      console.log('  - Remitente:', typeof mailOptions.from === 'string' ? mailOptions.from : `${mailOptions.from.name} <${mailOptions.from.email}>`);
      console.log('  - Asunto:', mailOptions.subject);
      console.log('  - Texto:', mailOptions.text.substring(0, 100) + (mailOptions.text.length > 100 ? '...' : ''));
      console.log('  - HTML:', mailOptions.html ? 'Sí (contenido HTML)' : 'No');
      console.log('SIMULACIÓN: Simulando respuesta exitosa de SendGrid');
    }
    
    return true;
  } catch (error) {
    console.error('Error detallado al enviar correo con SendGrid:');
    console.error(error);
    
    // Intentar obtener más información sobre el error
    if (error instanceof Error) {
      console.error('Mensaje de error:', error.message);
      console.error('Nombre del error:', error.name);
      console.error('Stack trace:', error.stack);
      
      // Si es un error de respuesta HTTP (como 403 Forbidden)
      if ('code' in error && typeof (error as any).code === 'number') {
        console.error('Código de error HTTP:', (error as any).code);
      }
      
      // Si el error tiene información adicional
      if ('response' in error) {
        console.error('Detalles de respuesta:', (error as any).response);
      }
    }
    
    return false;
  }
}
