import { useState } from "react";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader,
  DialogTitle 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { formatDateForStorage } from "@/lib/occasionalDayUtils";

interface AdminCalendarSettingsProps {
  scheduleConfig: any;
  blockedDays: any[];
  onConfigUpdated: () => void;
  onBlockedDaysUpdated: () => void;
}

export function AdminCalendarSettings({ 
  scheduleConfig, 
  blockedDays, 
  onConfigUpdated, 
  onBlockedDaysUpdated 
}: AdminCalendarSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estados para la interfaz
  const [activeTab, setActiveTab] = useState<string>("occasional");
  const [showOccasionalDialog, setShowOccasionalDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  
  // Estados para días eventuales
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  
  // Estados para días bloqueados
  const [blockReason, setBlockReason] = useState("");
  const [selectedBlockedDayId, setSelectedBlockedDayId] = useState<number | null>(null);
  
  // Mutación para actualizar la configuración (días eventuales)
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
      setShowOccasionalDialog(false);
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
  
  // Mutación para bloquear días
  const blockDayMutation = useMutation({
    mutationFn: async ({ date, reason }: { date: Date, reason: string }) => {
      return apiRequest("/api/admin/blocked-days", {
        method: "POST",
        data: { date: format(date, "yyyy-MM-dd"), reason },
      });
    },
    onSuccess: () => {
      toast({
        title: "Día bloqueado",
        description: "El día ha sido bloqueado correctamente",
      });
      
      // Actualizar datos
      onBlockedDaysUpdated();
      
      // Cerrar modal y limpiar datos
      setShowBlockDialog(false);
      setSelectedDate(null);
      setBlockReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo bloquear el día",
        variant: "destructive",
      });
      setShowBlockDialog(false);
    },
  });
  
  // Mutación para desbloquear días
  const unblockDayMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/blocked-days/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Día desbloqueado",
        description: "El día ha sido desbloqueado correctamente",
      });
      
      // Actualizar datos
      onBlockedDaysUpdated();
      
      // Cerrar modal y limpiar datos
      setShowUnblockDialog(false);
      setSelectedBlockedDayId(null);
      setSelectedDate(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo desbloquear el día",
        variant: "destructive",
      });
      setShowUnblockDialog(false);
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
    
    // Verificar si el día está bloqueado
    if (isDayBlocked(selectedDate)) {
      toast({
        title: "Día bloqueado",
        description: "No se puede agregar un día eventual en una fecha bloqueada",
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
  
  // Función para verificar si una fecha está bloqueada
  const isDayBlocked = (date: Date): boolean => {
    return blockedDays.some(blockedDay => 
      isSameDay(new Date(blockedDay.date), date)
    );
  };
  
  // Función para obtener el ID de un día bloqueado
  const getBlockedDayId = (date: Date): number | null => {
    const blockedDay = blockedDays.find(day => 
      isSameDay(new Date(day.date), date)
    );
    return blockedDay ? blockedDay.id : null;
  };
  
  // Función para obtener la razón de bloqueo de un día
  const getBlockReason = (date: Date): string => {
    const blockedDay = blockedDays.find(day => 
      isSameDay(new Date(day.date), date)
    );
    return blockedDay ? blockedDay.reason : "";
  };
  
  // Manejar la selección de un día en el calendario
  const handleDaySelect = (date: Date | undefined) => {
    if (!date) return;
    
    setSelectedDate(date);
    
    // Según la pestaña activa, mostrar el diálogo correspondiente
    if (activeTab === "occasional") {
      setStartTime("09:00");
      setEndTime("12:00");
      setShowOccasionalDialog(true);
    } else if (activeTab === "blocked") {
      // Verificar si el día ya está bloqueado
      if (isDayBlocked(date)) {
        const id = getBlockedDayId(date);
        if (id) {
          setSelectedBlockedDayId(id);
          setShowUnblockDialog(true);
        }
      } else {
        // Si no está bloqueado, mostrar diálogo para bloquear
        setBlockReason("");
        setShowBlockDialog(true);
      }
    }
  };
  
  // Función para renderizar los días en el calendario (para días eventuales)
  const renderOccasionalDay = (day: Date) => {
    const isOccasional = isOccasionalDay(day);
    const isBlocked = isDayBlocked(day);
    
    let className = "";
    
    if (isOccasional) {
      className = "bg-green-50 border border-green-200 rounded";
    }
    
    if (isBlocked) {
      className = "bg-red-50 border border-red-200 rounded";
    }
    
    return (
      <div className={`relative ${className}`}>
        <div>{day.getDate()}</div>
        {isOccasional && !isBlocked && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
          </div>
        )}
        {isBlocked && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
            <div className="w-full h-0.5 bg-red-500 rotate-45 transform origin-center absolute"></div>
            <div className="w-full h-0.5 bg-red-500 -rotate-45 transform origin-center absolute"></div>
          </div>
        )}
      </div>
    );
  };
  
  // Función para renderizar los días en el calendario (para días bloqueados)
  const renderBlockedDay = (day: Date) => {
    const isBlocked = isDayBlocked(day);
    const isOccasional = isOccasionalDay(day);
    
    let className = "";
    
    if (isBlocked) {
      className = "bg-red-50 border border-red-200 rounded";
    }
    
    if (isOccasional && !isBlocked) {
      className = "bg-green-50 border border-green-200 rounded";
    }
    
    return (
      <div className={`relative ${className}`}>
        <div>{day.getDate()}</div>
        {isBlocked && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
            <div className="w-full h-0.5 bg-red-500 rotate-45 transform origin-center absolute"></div>
            <div className="w-full h-0.5 bg-red-500 -rotate-45 transform origin-center absolute"></div>
          </div>
        )}
        {isOccasional && !isBlocked && (
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
        <CardTitle>Configuración del Calendario</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="occasional">Días Eventuales</TabsTrigger>
            <TabsTrigger value="blocked">Días Bloqueados</TabsTrigger>
          </TabsList>
          
          <TabsContent value="occasional" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">
                  Agrega días laborales eventuales con horarios específicos
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Calendar
                  mode="single"
                  onSelect={handleDaySelect}
                  className="rounded-md border shadow-sm"
                  components={{
                    Day: ({ date, ...props }) => (
                      <div {...props}>
                        {renderOccasionalDay(date)}
                      </div>
                    )
                  }}
                />
                <div className="mt-4 text-sm text-gray-500">
                  <p>Haz clic en una fecha para agregarla como día eventual</p>
                  <div className="flex items-center mt-1">
                    <div className="w-4 h-4 bg-green-50 border border-green-200 rounded mr-2"></div>
                    <span>Días eventuales</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <div className="w-4 h-4 bg-red-50 border border-red-200 rounded mr-2"></div>
                    <span>Días bloqueados</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Días eventuales configurados:</h3>
                {scheduleConfig.occasionalWorkDays && scheduleConfig.occasionalWorkDays.length > 0 ? (
                  <div className="space-y-2">
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
                ) : (
                  <div className="text-gray-500">No hay días eventuales configurados</div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="blocked" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">
                  Bloquea días para que no estén disponibles para agendar citas
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Calendar
                  mode="single"
                  onSelect={handleDaySelect}
                  className="rounded-md border shadow-sm"
                  components={{
                    Day: ({ date, ...props }) => (
                      <div {...props}>
                        {renderBlockedDay(date)}
                      </div>
                    )
                  }}
                />
                <div className="mt-4 text-sm text-gray-500">
                  <p>Haz clic en una fecha para bloquearla o desbloquearla</p>
                  <div className="flex items-center mt-1">
                    <div className="w-4 h-4 bg-red-50 border border-red-200 rounded mr-2"></div>
                    <span>Días bloqueados</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <div className="w-4 h-4 bg-green-50 border border-green-200 rounded mr-2"></div>
                    <span>Días eventuales</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Días bloqueados:</h3>
                {blockedDays.length > 0 ? (
                  <div className="space-y-2">
                    {blockedDays.map((blockedDay) => {
                      const date = new Date(blockedDay.date);
                      const displayDate = format(date, "EEEE d 'de' MMMM yyyy", { locale: es });
                      
                      return (
                        <div key={blockedDay.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <div className="font-medium">{displayDate}</div>
                            {blockedDay.reason && (
                              <div className="text-sm text-gray-500">
                                Motivo: {blockedDay.reason}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedBlockedDayId(blockedDay.id);
                              setSelectedDate(date);
                              setShowUnblockDialog(true);
                            }}
                          >
                            Desbloquear
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-gray-500">No hay días bloqueados</div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {/* Diálogo para agregar día eventual */}
      <Dialog open={showOccasionalDialog} onOpenChange={setShowOccasionalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Día Laboral Eventual</DialogTitle>
            <DialogDescription>
              Define el horario específico para este día laboral eventual.
            </DialogDescription>
            {selectedDate && (
              <div className="mt-2 font-medium">
                {format(selectedDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
              </div>
            )}
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
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
            <Button variant="outline" onClick={() => setShowOccasionalDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddOccasionalDay}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para bloquear un día */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear día</DialogTitle>
            <DialogDescription>
              Este día no estará disponible para agendar citas.
            </DialogDescription>
            {selectedDate && (
              <div className="mt-2 font-medium">
                {format(selectedDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
              </div>
            )}
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="block-reason">Motivo (opcional)</Label>
              <Textarea 
                id="block-reason" 
                placeholder="Ingrese el motivo del bloqueo"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedDate(null);
              setBlockReason("");
              setShowBlockDialog(false);
            }}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!selectedDate) return;
                blockDayMutation.mutate({
                  date: selectedDate,
                  reason: blockReason
                });
              }}
            >
              Bloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para desbloquear un día */}
      <Dialog open={showUnblockDialog} onOpenChange={setShowUnblockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desbloquear día</DialogTitle>
            <DialogDescription>
              Este día volverá a estar disponible para agendar citas.
            </DialogDescription>
            {selectedDate && (
              <div className="mt-2 font-medium">
                {format(selectedDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
              </div>
            )}
            {selectedDate && getBlockReason(selectedDate) && (
              <div className="mt-2 text-sm">
                <span className="font-medium">Motivo del bloqueo:</span> {getBlockReason(selectedDate)}
              </div>
            )}
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedDate(null);
              setSelectedBlockedDayId(null);
              setShowUnblockDialog(false);
            }}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!selectedBlockedDayId) return;
                unblockDayMutation.mutate(selectedBlockedDayId);
              }}
            >
              Desbloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}