import { useState, useEffect } from "react";
import { format, isSameDay, parseISO, addMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiClient } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { Check, Clock, X } from "lucide-react";

interface TimeBlockCalendarProps {
  selectedDate: Date;
  scheduleConfig: any;
  blockedDays: any[];
  appointments: any[];
  onTimeSlotClick: (time: string) => void;
}

export function TimeBlockCalendar({ 
  selectedDate, 
  scheduleConfig, 
  blockedDays,
  appointments,
  onTimeSlotClick
}: TimeBlockCalendarProps) {
  const { toast } = useToast();
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [appointmentsByTime, setAppointmentsByTime] = useState<Record<string, any>>({});
  
  // Calcular bloques de tiempo cada 20 minutos entre las horas de inicio y fin
  useEffect(() => {
    if (!scheduleConfig || !selectedDate) return;
    
    const slots: string[] = [];
    let currentTime = new Date(selectedDate);
    
    // Determinar hora de inicio y fin para este día
    let startTime = scheduleConfig.startTime || "09:00:00";
    let endTime = scheduleConfig.endTime || "18:00:00";
    
    // Verificar si es un día eventual con horario específico
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    if (scheduleConfig.occasionalWorkDayTimes && scheduleConfig.occasionalWorkDayTimes[dateStr]) {
      const specificTimes = scheduleConfig.occasionalWorkDayTimes[dateStr];
      startTime = specificTimes.startTime || specificTimes.start;
      endTime = specificTimes.endTime || specificTimes.end;
    }
    
    // Configurar la hora de inicio
    const [startHour, startMinute] = startTime.split(':').map(Number);
    currentTime.setHours(startHour, startMinute, 0, 0);
    
    // Configurar la hora de fin
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const endDateTime = new Date(selectedDate);
    endDateTime.setHours(endHour, endMinute, 0, 0);
    
    // Generar bloques de 20 minutos
    while (currentTime < endDateTime) {
      slots.push(format(currentTime, "HH:mm"));
      currentTime = addMinutes(currentTime, 20);
    }
    
    setTimeSlots(slots);
  }, [selectedDate, scheduleConfig]);
  
  // Organizar citas por hora para mostrarlas en los bloques de tiempo
  useEffect(() => {
    if (!appointments || !selectedDate) return;
    
    const appointmentsMap: Record<string, any> = {};
    
    appointments.forEach(appointment => {
      const appointmentDate = parseISO(appointment.appointmentTime);
      if (isSameDay(appointmentDate, selectedDate)) {
        const timeKey = format(appointmentDate, "HH:mm");
        appointmentsMap[timeKey] = appointment;
      }
    });
    
    setAppointmentsByTime(appointmentsMap);
  }, [appointments, selectedDate]);
  
  // Verificar si el día está bloqueado
  const isDayBlocked = () => {
    if (!blockedDays || !selectedDate) return false;
    return blockedDays.some(blockedDay => 
      isSameDay(new Date(blockedDay.date), selectedDate)
    );
  };
  
  // Verificar si es un día laboral (regular o eventual)
  const isWorkingDay = () => {
    if (!scheduleConfig || !selectedDate) return false;
    
    // Comprobar si está en la lista de días regulares
    const dayName = format(selectedDate, "EEEE", { locale: es }).toLowerCase();
    const isRegularWorkDay = scheduleConfig.workDays?.includes(dayName);
    
    // Comprobar si es un día eventual
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const isOccasionalWorkDay = scheduleConfig.occasionalWorkDays?.includes(dateStr);
    
    return isRegularWorkDay || isOccasionalWorkDay;
  };
  
  // Si el día está bloqueado o no es un día laboral, mostrar mensaje
  if (isDayBlocked()) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="pt-6 text-center">
          <div className="rounded-full bg-red-100 p-3 w-12 h-12 flex items-center justify-center mx-auto mb-4">
            <X className="h-6 w-6 text-red-500" />
          </div>
          <h3 className="font-medium text-lg mb-2">Día bloqueado</h3>
          <p className="text-muted-foreground">Este día no está disponible para agendar citas.</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!isWorkingDay()) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="pt-6 text-center">
          <div className="rounded-full bg-yellow-100 p-3 w-12 h-12 flex items-center justify-center mx-auto mb-4">
            <Clock className="h-6 w-6 text-yellow-500" />
          </div>
          <h3 className="font-medium text-lg mb-2">Día no laborable</h3>
          <p className="text-muted-foreground">Este día no está configurado como día laboral en el sistema.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="font-medium text-lg mb-4 flex items-center">
          <Clock className="mr-2 h-5 w-5" />
          Horarios del {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
        </h3>
        
        <ScrollArea className="h-[400px] pr-4">
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map(time => {
              const hasAppointment = !!appointmentsByTime[time];
              const appointment = appointmentsByTime[time];
              
              return (
                <Button
                  key={time}
                  variant={hasAppointment ? "secondary" : "outline"}
                  className={`h-auto py-3 flex flex-col items-center justify-center ${hasAppointment ? 'bg-primary/10' : ''}`}
                  onClick={() => onTimeSlotClick(time)}
                >
                  <span className="font-medium">{time}</span>
                  {hasAppointment && (
                    <div className="text-xs mt-1 text-center">
                      <div className="font-medium">{appointment.patientFirstName} {appointment.patientLastName}</div>
                      <div className="text-muted-foreground">{appointment.serviceType}</div>
                    </div>
                  )}
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}