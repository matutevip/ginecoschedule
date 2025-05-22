import { format, parseISO, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { type Appointment } from "@shared/schema";
import { TimeSlot } from "./time-slot";

interface TimeColumnProps {
  hour: string;
  timeSlots: string[];
  appointments: Appointment[];
  selectedDate: Date;
  onTimeSlotClick: (time: string) => void;
}

export function TimeColumn({ 
  hour, 
  timeSlots, 
  appointments, 
  selectedDate,
  onTimeSlotClick 
}: TimeColumnProps) {
  // Filtra solo los slots que corresponden a esta hora
  const hourTimeSlots = timeSlots.filter(slot => slot.startsWith(hour));
  
  // Obtiene las citas para estos slots
  const getAppointmentForTime = (time: string) => {
    return appointments.find(appointment => {
      const appointmentDate = typeof appointment.appointmentTime === 'string' 
        ? parseISO(appointment.appointmentTime) 
        : appointment.appointmentTime;
      return isSameDay(appointmentDate, selectedDate) && 
             format(appointmentDate, "HH:mm") === time;
    });
  };
  
  return (
    <div className="w-full">
      <div className="mb-2 text-sm font-semibold">
        {hour}:00
      </div>
      
      <div className="space-y-1">
        {hourTimeSlots.map(time => {
          const [slotHour, slotMinute] = time.split(':');
          const appointment = getAppointmentForTime(time);
          
          return (
            <TimeSlot
              key={time}
              time={time}
              hour={slotHour}
              minute={slotMinute}
              appointment={appointment}
              onClick={onTimeSlotClick}
            />
          );
        })}
      </div>
    </div>
  );
}