import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { apiRequest } from "@/lib/queryClient";

interface OccasionalDaySettingsProps {
  scheduleConfig: any;
  onConfigUpdated: () => void;
}

export function OccasionalDaySettings({ scheduleConfig, onConfigUpdated }: OccasionalDaySettingsProps) {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  
  // Función para formatear fechas en formato ISO para almacenamiento
  const formatDateForStorage = (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
  };
  
  // Mutación para actualizar la configuración
  const updateConfigMutation = useMutation({
    mutationFn: async (config: any) => {
      return apiRequest("/api/admin/schedule-config", {
        method: "PATCH",
        data: config,
      });
    },
    onSuccess: () => {
      toast({
        title: "Configuración actualizada",
        description: "Los días eventuales se han actualizado correctamente",
      });
      onConfigUpdated();
      setShowDialog(false);
      setSelectedDate(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la configuración",
        variant: "destructive",
      });
    },
  });
  
  // Función para agregar un día eventual con horarios específicos
  const handleAddOccasionalDay = () => {
    if (!selectedDate || !startTime || !endTime) {
      toast({
        title: "Error",
        description: "Por favor, selecciona una fecha y define el horario",
        variant: "destructive",
      });
      return;
    }
    
    const dateStr = formatDateForStorage(selectedDate);
    
    // Verificar si ya existe en la lista de días eventuales
    const occasionalWorkDays = scheduleConfig.occasionalWorkDays || [];
    if (!occasionalWorkDays.includes(dateStr)) {
      occasionalWorkDays.push(dateStr);
    }
    
    // Agregar o actualizar el horario específico para este día
    const occasionalWorkDayTimes = {
      ...(scheduleConfig.occasionalWorkDayTimes || {}),
      [dateStr]: { start: startTime, end: endTime }
    };
    
    // Actualizar la configuración
    updateConfigMutation.mutate({
      id: scheduleConfig.id,
      occasionalWorkDays,
      occasionalWorkDayTimes
    });
  };
  
  // Función para eliminar un día eventual
  const handleRemoveOccasionalDay = (dateStr: string) => {
    const occasionalWorkDays = (scheduleConfig.occasionalWorkDays || [])
      .filter((day: string) => day !== dateStr);
    
    // Eliminar también los horarios específicos
    const occasionalWorkDayTimes = { ...(scheduleConfig.occasionalWorkDayTimes || {}) };
    delete occasionalWorkDayTimes[dateStr];
    
    // Actualizar la configuración
    updateConfigMutation.mutate({
      id: scheduleConfig.id,
      occasionalWorkDays,
      occasionalWorkDayTimes
    });
  };
  
  // Obtener el horario específico de un día eventual
  const getOccasionalDayTimes = (dateStr: string) => {
    const times = scheduleConfig.occasionalWorkDayTimes?.[dateStr];
    if (times) {
      return `${times.start} - ${times.end}`;
    }
    return "Horario estándar";
  };
  
  // Determinar si una fecha ya está configurada como día eventual
  const isOccasionalDay = (date: Date) => {
    const dateStr = formatDateForStorage(date);
    return scheduleConfig.occasionalWorkDays?.includes(dateStr) || false;
  };
  
  // Función para renderizar los días en el calendario
  const renderDay = (day: Date) => {
    const isOccasional = isOccasionalDay(day);
    return (
      <div className={`relative ${isOccasional ? 'bg-green-50 border border-green-200 rounded' : ''}`}>
        <div>{day.getDate()}</div>
        {isOccasional && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Días Laborales Eventuales</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">
                Agrega días laborales eventuales con horarios específicos
              </p>
            </div>
            <Button 
              onClick={() => {
                setStartTime("09:00");
                setEndTime("12:00");
                setShowDialog(true);
              }}
            >
              Agregar Día Eventual
            </Button>
          </div>
          
          {scheduleConfig.occasionalWorkDays && scheduleConfig.occasionalWorkDays.length > 0 ? (
            <div className="space-y-2 mt-4">
              <h3 className="text-sm font-medium">Días eventuales configurados:</h3>
              <div className="grid gap-2">
                {scheduleConfig.occasionalWorkDays.map((dateStr: string) => {
                  // Convertir el string a Date para formato legible
                  const date = new Date(dateStr);
                  const formattedDate = format(date, "EEEE d 'de' MMMM yyyy", { locale: es });
                  
                  return (
                    <div 
                      key={dateStr} 
                      className="flex justify-between items-center p-2 border rounded"
                    >
                      <div>
                        <div className="font-medium">{formattedDate}</div>
                        <div className="text-sm text-gray-500">
                          Horario: {getOccasionalDayTimes(dateStr)}
                        </div>
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleRemoveOccasionalDay(dateStr)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No hay días eventuales configurados
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Diálogo para agregar día eventual */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Día Laboral Eventual</DialogTitle>
            <DialogDescription>
              Selecciona la fecha y define el horario específico para este día laboral eventual.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="date">Fecha</Label>
              <div className="mt-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                  components={{
                    Day: ({ date, ...props }) => (
                      <div {...props}>
                        {renderDay(date)}
                      </div>
                    )
                  }}
                />
              </div>
              {selectedDate && (
                <p className="mt-2 text-sm">
                  Fecha seleccionada: {format(selectedDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Hora de inicio</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endTime">Hora de fin</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddOccasionalDay}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}