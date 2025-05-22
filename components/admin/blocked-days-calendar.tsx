import { useState } from "react";
import { format, isBefore, startOfDay, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

interface BlockedDaysCalendarProps {
  blockedDays: any[];
  onBlockedDaysUpdated: () => void;
}

export function BlockedDaysCalendar({ blockedDays, onBlockedDaysUpdated }: BlockedDaysCalendarProps) {
  const { toast } = useToast();
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [selectedBlockedDayId, setSelectedBlockedDayId] = useState<number | null>(null);
  
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
      
      // Actualizar datos y limpiar estado
      onBlockedDaysUpdated();
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
      
      // Actualizar datos y limpiar estado
      onBlockedDaysUpdated();
      setShowUnblockDialog(false);
      setSelectedBlockedDayId(null);
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
    
    // Verificar si el día ya está bloqueado
    if (isDayBlocked(date)) {
      const id = getBlockedDayId(date);
      if (id) {
        setSelectedBlockedDayId(id);
        setSelectedDate(date);
        setShowUnblockDialog(true);
      }
    } else {
      // Si no está bloqueado, mostrar diálogo para bloquear
      setSelectedDate(date);
      setBlockReason("");
      setShowBlockDialog(true);
    }
  };
  
  // Componente para renderizar cada día en el calendario
  const renderDay = (date: Date) => {
    const isBlocked = isDayBlocked(date);
    let className = "";
    
    if (isBlocked) {
      className = "bg-red-50 border border-red-200 rounded";
    }
    
    return (
      <div className={`relative ${className}`}>
        <div>{date.getDate()}</div>
        {isBlocked && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
            <div className="w-full h-0.5 bg-red-500 rotate-45 transform origin-center absolute"></div>
            <div className="w-full h-0.5 bg-red-500 -rotate-45 transform origin-center absolute"></div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Gestión de Días Bloqueados</CardTitle>
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
            <div className="mt-4 text-sm text-gray-500">
              <p>Haz clic en una fecha para bloquearla o desbloquearla</p>
              <div className="flex items-center mt-1">
                <div className="w-4 h-4 bg-red-50 border border-red-200 rounded mr-2"></div>
                <span>Días bloqueados</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Días bloqueados</h3>
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
      </CardContent>
      
      {/* Diálogo para bloquear un día */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloquear día</AlertDialogTitle>
            <AlertDialogDescription>
              Este día no estará disponible para agendar citas.
            </AlertDialogDescription>
            {selectedDate && (
              <div className="mt-2 font-medium">
                {format(selectedDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
              </div>
            )}
          </AlertDialogHeader>
          
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
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setSelectedDate(null);
              setBlockReason("");
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!selectedDate) return;
                blockDayMutation.mutate({
                  date: selectedDate,
                  reason: blockReason
                });
              }}
            >
              Bloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Diálogo para desbloquear un día */}
      <AlertDialog open={showUnblockDialog} onOpenChange={setShowUnblockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desbloquear día</AlertDialogTitle>
            <AlertDialogDescription>
              Este día volverá a estar disponible para agendar citas.
            </AlertDialogDescription>
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
          </AlertDialogHeader>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setSelectedDate(null);
              setSelectedBlockedDayId(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!selectedBlockedDayId) return;
                unblockDayMutation.mutate(selectedBlockedDayId);
              }}
            >
              Desbloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}