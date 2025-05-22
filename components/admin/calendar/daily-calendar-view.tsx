import { useState, useEffect } from "react";
import { format, parseISO, isSameDay, addMinutes, getHours } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Calendar, X, Clock } from "lucide-react";
import { type Appointment, type ScheduleConfig, type BlockedDay } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NewQuickAppointmentForm } from "../new-quick-appointment-form";
import { TimeColumn } from "./time-column";

interface DailyCalendarViewProps {
  selectedDate: Date;
  scheduleConfig: ScheduleConfig | undefined;
  blockedDays: BlockedDay[];
  appointments: Appointment[];
  onDateChange: (date: Date) => void;
  onTimeSlotClick: (time: string) => void;
}

export function DailyCalendarView({
  selectedDate,
  scheduleConfig,
  blockedDays,
  appointments,
  onDateChange,
  onTimeSlotClick
}: DailyCalendarViewProps) {
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [openQuickForm, setOpenQuickForm] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [hourGroups, setHourGroups] = useState<string[]>([]);

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
      if (specificTimes && typeof specificTimes === 'object') {
        startTime = specificTimes.startTime || startTime;
        endTime = specificTimes.endTime || endTime;
      }
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
    
    // Extraer las horas únicas para agrupar
    const uniqueHours = Array.from(new Set(slots.map(slot => slot.split(':')[0])));
    setHourGroups(uniqueHours);
  }, [selectedDate, scheduleConfig]);

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

  const handlePrevDay = () => {
    const prevDay = new Date(selectedDate);
    prevDay.setDate(prevDay.getDate() - 1);
    onDateChange(prevDay);
  };

  const handleNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    onDateChange(nextDay);
  };

  const handleTimeSlotClick = (time: string) => {
    setSelectedTime(time);
    setOpenQuickForm(true);
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
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-bold">
            Agenda del día
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handlePrevDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="font-medium px-2">
              {format(selectedDate, "d 'de' MMMM yyyy", { locale: es })}
            </div>
            <Button variant="outline" size="sm" onClick={handleNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[70vh] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hourGroups.map(hour => (
                <TimeColumn
                  key={hour}
                  hour={hour}
                  timeSlots={timeSlots}
                  appointments={appointments}
                  selectedDate={selectedDate}
                  onTimeSlotClick={handleTimeSlotClick}
                />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      <Dialog open={openQuickForm} onOpenChange={setOpenQuickForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar turno rápido</DialogTitle>
          </DialogHeader>
          <NewQuickAppointmentForm
            selectedDate={selectedDate}
            selectedTime={selectedTime || undefined}
            onSuccess={() => setOpenQuickForm(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}