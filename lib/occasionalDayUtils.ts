import { format, isSameDay } from "date-fns";

/**
 * Gestiona todas las funciones relacionadas con días eventuales y sus horarios específicos
 */

/**
 * Formatea una fecha para su almacenamiento en el formato YYYY-MM-DD
 */
export const formatDateForStorage = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

/**
 * Verifica si una fecha está configurada como día laboral eventual
 */
export const isOccasionalWorkDay = (date: Date, occasionalWorkDays: string[] | null): boolean => {
  if (!occasionalWorkDays || !Array.isArray(occasionalWorkDays)) {
    return false;
  }
  
  const dateStr = formatDateForStorage(date);
  return occasionalWorkDays.includes(dateStr);
};

/**
 * Obtiene los horarios específicos para un día eventual
 */
export const getOccasionalDayTimes = (
  date: Date, 
  occasionalWorkDayTimes: Record<string, { start: string, end: string }> | null
): { start: string, end: string } | null => {
  if (!occasionalWorkDayTimes) {
    return null;
  }
  
  const dateStr = formatDateForStorage(date);
  return occasionalWorkDayTimes[dateStr] || null;
};

/**
 * Genera franjas horarias basadas en horarios específicos para días eventuales
 */
export const generateTimeSlotsForOccasionalDay = (
  date: Date,
  occasionalWorkDayTimes: Record<string, { start: string, end: string }> | null,
  defaultStartTime: string,
  defaultEndTime: string,
  intervalMinutes: number = 30
): string[] => {
  const dateStr = formatDateForStorage(date);
  
  // Obtener horarios específicos para este día o usar los predeterminados
  const times = occasionalWorkDayTimes?.[dateStr] || { 
    start: defaultStartTime, 
    end: defaultEndTime 
  };
  
  // Parsear horarios
  const [startHours, startMinutes] = times.start.split(':').map(Number);
  const [endHours, endMinutes] = times.end.split(':').map(Number);
  
  const slots: string[] = [];
  let currentDate = new Date(date);
  currentDate.setHours(startHours, startMinutes, 0, 0);
  
  const endDate = new Date(date);
  endDate.setHours(endHours, endMinutes, 0, 0);
  
  // Generar slots hasta la hora de fin
  while (currentDate < endDate) {
    slots.push(format(currentDate, 'HH:mm'));
    currentDate.setMinutes(currentDate.getMinutes() + intervalMinutes);
  }
  
  return slots;
};

/**
 * Verifica si un día está bloqueado
 */
export const isDateBlocked = (date: Date, blockedDays: Array<{ date: string }>): boolean => {
  return blockedDays.some(blockedDay => 
    isSameDay(new Date(blockedDay.date), date)
  );
};

/**
 * Obtiene los días disponibles basado en días laborales regulares, eventuales y bloqueados
 */
export const getAvailableDates = (
  regularWorkDays: string[],
  occasionalWorkDays: string[] | null,
  blockedDays: Array<{ date: string }>,
  numberOfWeeks: number = 8
): Date[] => {
  const today = new Date();
  const availableDates: Date[] = [];
  
  // Generar 8 semanas de fechas para evaluar
  for (let i = 0; i < numberOfWeeks * 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    // Obtener el nombre del día de la semana en minúsculas
    const dayName = format(date, 'EEEE').toLowerCase();
    
    // Verificar si es un día laboral regular o eventual
    const isRegularWorkDay = regularWorkDays.includes(dayName);
    const isOccasional = isOccasionalWorkDay(date, occasionalWorkDays);
    
    // Verificar si no está bloqueado
    const blocked = isDateBlocked(date, blockedDays);
    
    // Si es día laboral (regular o eventual) y no está bloqueado, agregar a disponibles
    if ((isRegularWorkDay || isOccasional) && !blocked) {
      availableDates.push(date);
    }
  }
  
  return availableDates;
};