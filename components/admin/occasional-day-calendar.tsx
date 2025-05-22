import { useState } from "react";
import { format, isBefore, startOfDay, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OccasionalDaySettings } from "./occasional-day-settings";
import { type ScheduleConfig } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

interface OccasionalDayCalendarProps {
  scheduleConfig: ScheduleConfig | undefined;
  onConfigUpdated: () => void;
}

export function OccasionalDayCalendar({ scheduleConfig, onConfigUpdated }: OccasionalDayCalendarProps) {
  const { toast } = useToast();
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // Mutación para actualizar la configuración del horario
  const updateScheduleMutation = useMutation({
    mutationFn: async (data: Partial<ScheduleConfig>) => {
      return apiRequest("/api/admin/schedule-config", {
        method: "PATCH",
        data,
      });
    },
    onSuccess: () => {
      onConfigUpdated();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la configuración",
        variant: "destructive",
      });
    },
  });
  
  // Función para marcar días ocasionales en el calendario
  const isOccasionalDay = (date: Date): boolean => {
    if (!scheduleConfig?.occasionalWorkDays) return false;
    const dateStr = format(date, "yyyy-MM-dd");
    return scheduleConfig.occasionalWorkDays.includes(dateStr);
  };
  
  // Función para verificar si un día tiene horarios específicos configurados
  const hasSpecificTimes = (date: Date): boolean => {
    if (!scheduleConfig?.occasionalWorkDayTimes) return false;
    const dateStr = format(date, "yyyy-MM-dd");
    return !!scheduleConfig.occasionalWorkDayTimes[dateStr];
  };
  
  // Función para obtener información sobre horarios específicos
  const getSpecificTimes = (date: Date) => {
    if (!scheduleConfig?.occasionalWorkDayTimes) return null;
    const dateStr = format(date, "yyyy-MM-dd");
    return scheduleConfig.occasionalWorkDayTimes[dateStr];
  };
  
  // Manejar la selección de un día en el calendario
  const handleDaySelect = (date: Date | undefined) => {
    if (!date) return;
    
    // Formatear la fecha seleccionada
    const dateStr = format(date, "yyyy-MM-dd");
    
    // Verificar si ya es un día ocasional
    const isOccasional = scheduleConfig?.occasionalWorkDays?.includes(dateStr) || false;
    
    // Si ya es un día ocasional, abrir el diálogo para configurar horarios
    if (isOccasional) {
      setSelectedDate(dateStr);
      setShowSettingsDialog(true);
      return;
    }
    
    // Si no es un día ocasional, verificar si se puede agregar
    // Solo permitimos agregar días futuros
    if (isBefore(date, startOfDay(new Date()))) {
      toast({
        title: "Fecha inválida",
        description: "Solo puede agregar días eventuales en el futuro",
        variant: "destructive"
      });
      return;
    }
    
    // Comprobar si el día está en un período de vacaciones
    const isVacation = scheduleConfig?.vacationPeriods?.some((period) =>
      isWithinInterval(date, {
        start: new Date(period.start),
        end: new Date(period.end),
      })
    ) ?? false;
    
    if (isVacation) {
      toast({
        title: "Día en período de vacaciones",
        description: "No se puede agregar un día que está dentro de un período de vacaciones",
        variant: "destructive"
      });
      return;
    }
    
    // Preguntar si desea agregar como día ocasional
    if (confirm(`¿Desea agregar el ${format(date, "EEEE d 'de' MMMM", { locale: es })} como día de atención eventual?`)) {
      try {
        // Agregar la fecha a la lista de días eventuales
        const currentOccasionalDays = scheduleConfig?.occasionalWorkDays || [];
        const newOccasionalDays = [...currentOccasionalDays, dateStr];
        
        // Actualizar la configuración
        updateScheduleMutation.mutate({
          occasionalWorkDays: newOccasionalDays
        });
        
        // Mostrar toast de éxito
        toast({
          title: "Día eventual agregado",
          description: `Se agregó el día ${format(date, "EEEE d 'de' MMMM", { locale: es })} como día eventual`,
        });
        
        // Abrir el diálogo para configurar horarios específicos
        setTimeout(() => {
          setSelectedDate(dateStr);
          setShowSettingsDialog(true);
        }, 500);
      } catch (error) {
        console.error("Error al agregar día eventual:", error);
        toast({
          title: "Error al agregar día eventual",
          description: "Ocurrió un error al intentar guardar el día eventual",
          variant: "destructive"
        });
      }
    }
  };
  
  // Función para eliminar un día ocasional
  const handleRemoveOccasionalDay = (dateStr: string) => {
    if (!scheduleConfig) return;
    
    if (confirm(`¿Está seguro que desea eliminar este día eventual?`)) {
      try {
        // Crear una nueva lista sin el día a eliminar
        const newOccasionalDays = (scheduleConfig.occasionalWorkDays || []).filter(day => day !== dateStr);
        
        // Crear una copia de los horarios específicos sin este día
        const currentTimes = scheduleConfig.occasionalWorkDayTimes || {};
        const newTimes = { ...currentTimes };
        delete newTimes[dateStr];
        
        // Actualizar la configuración
        updateScheduleMutation.mutate({
          occasionalWorkDays: newOccasionalDays,
          occasionalWorkDayTimes: newTimes
        });
        
        // Mostrar toast de éxito
        toast({
          title: "Día eventual eliminado",
          description: "El día eventual ha sido eliminado correctamente",
        });
      } catch (error) {
        console.error("Error al eliminar día eventual:", error);
        toast({
          title: "Error al eliminar día eventual",
          description: "Ocurrió un error al intentar eliminar el día eventual",
          variant: "destructive"
        });
      }
    }
  };
  
  // Componente para renderizar cada día en el calendario
  const renderDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const isOccasional = isOccasionalDay(day);
    const hasSpecific = hasSpecificTimes(day);
    const times = getSpecificTimes(day);
    
    let className = "";
    let indicator = null;
    
    if (isOccasional) {
      className = "bg-green-50 border border-green-200 rounded";
      
      if (hasSpecific) {
        indicator = (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white"></div>
        );
      }
    }
    
    return (
      <div className={`relative ${className}`}>
        <div>{day.getDate()}</div>
        {indicator}
      </div>
    );
  };
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Configuración de Días Eventuales</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Calendar
              mode="single"
              onSelect={handleDaySelect}
              className="rounded-md border shadow-sm"
              components={{
                Day: ({ date, ...props }) => (
                  <div {...props}>
                    {renderDay(date)}
                  </div>
                )
              }}
            />
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Días eventuales configurados</h3>
            {scheduleConfig?.occasionalWorkDays && scheduleConfig.occasionalWorkDays.length > 0 ? (
              <div className="space-y-2">
                {scheduleConfig.occasionalWorkDays.map((dateStr) => {
                  // Crear formato de fecha consistente
                  const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
                  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
                  const displayDate = format(date, "EEEE d 'de' MMMM yyyy", { locale: es });
                  
                  // Obtener horarios específicos si existen
                  const times = scheduleConfig.occasionalWorkDayTimes?.[dateStr];
                  
                  return (
                    <div key={dateStr} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium">{displayDate}</div>
                        {times ? (
                          <div className="text-sm text-gray-500">
                            Horario: {times.startTime} - {times.endTime}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            Horario por defecto: {scheduleConfig.startTime.slice(0, 5)} - {scheduleConfig.endTime.slice(0, 5)}
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDate(dateStr);
                            setShowSettingsDialog(true);
                          }}
                        >
                          Configurar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveOccasionalDay(dateStr)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-500">No hay días eventuales configurados</div>
            )}
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Cómo usar:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Haga clic en una fecha en el calendario para agregarla como día eventual.</li>
                <li>Días marcados en verde son días eventuales.</li>
                <li>Días con un punto verde tienen horarios específicos configurados.</li>
                <li>Haga clic en un día eventual para configurar sus horarios.</li>
              </ol>
            </div>
          </div>
        </div>
      </CardContent>
      
      {/* Diálogo para configurar horarios específicos */}
      <OccasionalDaySettings
        scheduleConfig={scheduleConfig}
        onSettingsUpdated={onConfigUpdated}
        isOpen={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
        selectedDate={selectedDate}
        onSelectedDateChange={setSelectedDate}
      />
    </Card>
  );
}