// Fix para la duración de las citas en Google Calendar

/*
Esta es una solución temporal para cambiar la duración de las citas en Google Calendar.
Por problemas con el editor, no podemos modificar directamente el archivo googleCalendar.ts
para usar la función getAppointmentDuration. 

La solución correcta sería modificar los bloques de código en googleCalendar.ts 
en las líneas aproximadamente 277-287 y 356-366, reemplazando el código de duración por:

// Get appointment duration based on service type using the helper function
const durationMinutes = getAppointmentDuration(appointment.serviceType || "");

Esto conseguiría que las citas de "Consulta normal" y "Consulta & PAP" tengan una duración de 20 minutos
en lugar de 30 minutos en Google Calendar.
*/