import { db } from './db';
import { appointments, patients } from '@shared/schema';
import { and, between, count, eq, gt, sql } from 'drizzle-orm';

// Función para obtener estadísticas mensuales por profesional
export async function getMonthlyStatistics(professionalId: string | undefined, month: number, year: number) {
  const startDate = new Date(year, month - 1, 1); // Mes en JavaScript es 0-based (0 = enero)
  const endDate = new Date(year, month, 0); // Último día del mes
  
  endDate.setHours(23, 59, 59, 999); // Final del día
  
  // Conteo total de citas en el mes
  const totalAppointments = await db
    .select({ count: count() })
    .from(appointments)
    .where(
      and(
        between(appointments.appointmentTime, startDate, endDate),
        // Si se proporciona professionalId, filtrar por él (en futuras versiones)
      )
    );
  
  // Conteo de citas por estado
  const appointmentsByStatus = await db
    .select({ 
      status: appointments.status, 
      count: count() 
    })
    .from(appointments)
    .where(
      and(
        between(appointments.appointmentTime, startDate, endDate),
        // Si se proporciona professionalId, filtrar por él (en futuras versiones)
      )
    )
    .groupBy(appointments.status);
  
  // Conteo de citas por servicio
  const appointmentsByService = await db
    .select({ 
      serviceType: appointments.serviceType, 
      count: count() 
    })
    .from(appointments)
    .where(
      and(
        between(appointments.appointmentTime, startDate, endDate),
        // Si se proporciona professionalId, filtrar por él (en futuras versiones)
      )
    )
    .groupBy(appointments.serviceType);
  
  // Conteo de pacientes nuevos en el mes (citas con isFirstTime = true)
  const newPatients = await db
    .select({ count: count() })
    .from(appointments)
    .where(
      and(
        between(appointments.appointmentTime, startDate, endDate),
        eq(appointments.isFirstTime, true),
        // Si se proporciona professionalId, filtrar por él (en futuras versiones)
      )
    );
  
  // Lista de pacientes con no-shows
  const noShowPatientsQuery = db
    .select({
      patientId: appointments.patientId,
      patientName: appointments.patientName,
      count: count(appointments.id)
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.status, 'no_show'),
        // Si se proporciona professionalId, filtrar por él (en futuras versiones)
      )
    )
    .groupBy(appointments.patientId, appointments.patientName)
    .having(() => gt(count(appointments.id), 1))
    .orderBy(sql`count DESC`);
    
  const noShowPatients = await noShowPatientsQuery.execute();
  
  // Formatear la respuesta para mantener la estructura esperada
  const formattedNoShowPatients = noShowPatients.map(patient => ({
    patientId: patient.patientId,
    patientName: patient.patientName,
    noShowCount: patient.count
  }));
  
  // Estadisticas por día de la semana
  const appointmentsByWeekday = await db
    .select({
      weekday: sql`EXTRACT(DOW FROM ${appointments.appointmentTime})`,
      count: count(),
    })
    .from(appointments)
    .where(
      and(
        between(appointments.appointmentTime, startDate, endDate),
        // Si se proporciona professionalId, filtrar por él (en futuras versiones)
      )
    )
    .groupBy(sql`EXTRACT(DOW FROM ${appointments.appointmentTime})`);
  
  // Formatear estadísticas por estados
  const statusStats = {
    pending: 0,
    confirmed: 0,
    cancelled_by_patient: 0,
    cancelled_by_professional: 0,
    attended: 0,
    no_show: 0,
  };
  
  appointmentsByStatus.forEach(item => {
    if (item.status) {
      // @ts-ignore: El tipo está restringido por el enum en el schema
      statusStats[item.status] = item.count;
    }
  });
  
  // Formatear estadísticas por servicio
  const serviceStats: Record<string, number> = {};
  
  appointmentsByService.forEach(item => {
    if (item.serviceType) {
      serviceStats[item.serviceType] = item.count;
    }
  });
  
  // Formatear estadísticas por día de la semana
  const weekdayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const weekdayStats = weekdayNames.map((name, index) => {
    const found = appointmentsByWeekday.find(item => item.weekday === index);
    return {
      name,
      count: found ? found.count : 0,
    };
  });
  
  return {
    month,
    year,
    totalAppointments: totalAppointments[0]?.count || 0,
    statusStats,
    serviceStats,
    newPatients: newPatients[0]?.count || 0,
    noShowPatients: formattedNoShowPatients,
    weekdayStats,
  };
}
