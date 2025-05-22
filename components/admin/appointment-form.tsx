import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAppointmentSchema, type InsertAppointment, type ScheduleConfig, type Appointment } from "@shared/schema";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Clock } from "lucide-react";
import { format, isAfter, startOfToday, isSameDay, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { RegenerativeTherapyModal } from "@/components/ui/regenerative-therapy-modal";

interface AppointmentFormProps {
  onSuccess?: () => void;
  initialData?: Partial<Appointment>;
  mode?: 'create' | 'edit';
}

type ServiceType = "Consulta" | "Consulta & PAP" | "Extracción & Colocación de DIU" | "Terapia de Ginecología Regenerativa";
type ObraSocial = "Particular" | "IOMA";

export function AppointmentForm({ onSuccess, initialData, mode = 'create' }: AppointmentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialData?.appointmentTime ? new Date(initialData.appointmentTime) : undefined
  );
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [showRegenerativeModal, setShowRegenerativeModal] = useState(false);

  const { data: scheduleConfig } = useQuery<ScheduleConfig>({
    queryKey: ["/api/admin/schedule-config"],
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/admin/appointments"],
  });

  const form = useForm<InsertAppointment>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      patientName: initialData?.patientName || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      serviceType: (initialData?.serviceType as ServiceType) || "Consulta",
      obraSocial: (initialData?.obraSocial as ObraSocial) || "Particular",
      notes: initialData?.notes || "",
      appointmentTime: initialData?.appointmentTime ? new Date(initialData.appointmentTime) : undefined,
      isFirstTime: initialData?.isFirstTime || false
    },
  });

useEffect(() => {
    if (selectedDate && scheduleConfig) {
      const slots: string[] = [];
      
      // Obtener slots disponibles utilizando la misma lógica que en admin.tsx
      const [startHour, startMinute = 0] = scheduleConfig.startTime.split(':').map(Number);
      const [endHour, endMinute = 0] = scheduleConfig.endTime.split(':').map(Number);
      
      const startTotal = startHour * 60 + startMinute;
      const endTotal = endHour * 60 + endMinute;
      
      // Generar slots cada 30 minutos (intervalo configurable)
      const intervalMinutes = 30;
      
      for (let minutes = startTotal; minutes < endTotal; minutes += intervalMinutes) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const slotDate = new Date(selectedDate);
        slotDate.setHours(hour, minute, 0, 0);
        
        // When editing, don't mark the current appointment time as booked
        const isBooked = appointments.some(apt => {
          if (mode === 'edit' && initialData?.id === apt.id) {
            return false;
          }
          const aptDate = new Date(apt.appointmentTime);
          return isSameDay(aptDate, slotDate) && 
                 format(aptDate, 'HH:mm') === timeString;
        });
        
        if (!isBooked) {
          slots.push(timeString);
        }
      }
      
      // Si estamos editando, asegurarnos de que el horario actual esté disponible
      if (mode === 'edit' && initialData?.appointmentTime) {
        const initialTime = format(new Date(initialData.appointmentTime), 'HH:mm');
        if (!slots.includes(initialTime)) {
          slots.push(initialTime);
        }
      }
      
      // Ordenar los slots para que aparezcan en orden cronológico
      setAvailableTimeSlots([...slots].sort());
    }
  }, [selectedDate, scheduleConfig, appointments, initialData, mode]);

  const mutation = useMutation({
    mutationFn: async (data: InsertAppointment) => {
      const endpoint = mode === 'edit' && initialData?.id
        ? `/api/appointments/${initialData.id}`
        : "/api/appointments";
      const method = mode === 'edit' ? "PATCH" : "POST";

      const res = await apiRequest(method, endpoint, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || `Error al ${mode === 'edit' ? 'actualizar' : 'crear'} el turno`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/appointments"] });
      toast({
        title: mode === 'edit' ? "Turno actualizado" : "Turno creado",
        description: mode === 'edit' ? 
          "El turno ha sido actualizado exitosamente" : 
          "El turno ha sido creado exitosamente",
      });
      form.reset();
      setSelectedDate(undefined);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Función para determinar si un servicio requiere 40 minutos (en lugar de 20)
  const requiresLongerTime = (serviceType: ServiceType): boolean => {
    return serviceType === "Extracción & Colocación de DIU" || 
           serviceType === "Terapia de Ginecología Regenerativa";
  };

  // Manejador para el modal de terapia de ginecología regenerativa
  const handleRegenerativeTherapyConfirm = (hasHadInitialConsultation: boolean) => {
    if (!hasHadInitialConsultation) {
      // Si no ha tenido consulta inicial, marcar como primera vez
      form.setValue("isFirstTime", true);
    }
    setShowRegenerativeModal(false);
  };

  const onSubmit = (data: InsertAppointment) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="appointmentTime"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha y Hora</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={`w-full pl-3 text-left font-normal ${
                        !field.value && "text-muted-foreground"
                      }`}
                    >
                      {field.value ? (
                        format(field.value, "PPP HH:mm", { locale: es })
                      ) : (
                        <span>Seleccione fecha y hora</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-3">
                    <Select
                      value={selectedDate?.toISOString()}
                      onValueChange={(value) => {
                        const date = new Date(value);
                        setSelectedDate(date);
                        // Reset time when date changes to avoid invalid combinations
                        field.onChange(undefined);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar fecha">
                          {selectedDate && format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 60 }, (_, i) => {
                          const date = new Date();
                          date.setDate(date.getDate() + i);
                          if (scheduleConfig?.workDays.includes(format(date, 'EEEE', { locale: es }).toLowerCase())) {
                            return (
                              <SelectItem
                                key={date.toISOString()}
                                value={date.toISOString()}
                              >
                                {format(date, "EEEE d 'de' MMMM", { locale: es })}
                              </SelectItem>
                            );
                          }
                          return null;
                        }).filter(Boolean)}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedDate && (
                    <div className="p-3 border-t">
                      {availableTimeSlots.length > 0 ? (
                        <>
                          <h3 className="font-medium flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4" />
                            Horarios disponibles
                          </h3>
                          <div className="grid grid-cols-4 gap-2">
                            {availableTimeSlots.map((time) => {
                              // Check if this time is selected
                              const isSelected = field.value && format(field.value, "HH:mm") === time;

                              return (
                                <button
                                  key={time}
                                  type="button"
                                  onClick={() => {
                                    if (selectedDate && time) {
                                      const [hours, minutes] = time.split(":");
                                      const newDate = new Date(selectedDate);
                                      newDate.setHours(parseInt(hours));
                                      newDate.setMinutes(parseInt(minutes));
                                      field.onChange(newDate);
                                    }
                                  }}
                                  className={cn(
                                    "p-2 rounded text-sm transition-colors",
                                    isSelected
                                      ? "bg-primary text-white"
                                      : "bg-secondary hover:bg-secondary/80"
                                  )}
                                >
                                  {time}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-center py-2 text-muted-foreground">
                          No hay horarios disponibles para esta fecha
                        </div>
                      )}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="patientName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Paciente</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="serviceType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Servicio</FormLabel>
              <Select 
                onValueChange={(value: ServiceType) => {
                  field.onChange(value);
                  
                  // Mostrar modal para terapia de ginecología regenerativa
                  if (value === "Terapia de Ginecología Regenerativa" && mode !== 'edit') {
                    setShowRegenerativeModal(true);
                  }
                  
                  // Lógica para servicios que requieren bloques de tiempo más largos (40 min)
                  if (requiresLongerTime(value) && mode !== 'edit') {
                    const currentDate = form.getValues("appointmentTime");
                    // Create a new date with just the date part
                    if (currentDate) {
                      const newDate = new Date(currentDate);
                      newDate.setHours(9, 0, 0, 0); // Set to default time 9:00
                      form.setValue('appointmentTime', newDate);
                    }
                  }
                }} 
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un servicio" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Consulta">Consulta</SelectItem>
                  <SelectItem value="Consulta & PAP">Consulta + PAP y Colpo</SelectItem>
                  <SelectItem value="Extracción & Colocación de DIU">DIU / SIU / Implante</SelectItem>
                  <SelectItem value="Terapia de Ginecología Regenerativa">Terapia de Ginecología Regenerativa</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="obraSocial"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Obra Social</FormLabel>
                <Select 
                  onValueChange={(value: ObraSocial) => field.onChange(value)} 
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione obra social" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Particular">Particular</SelectItem>
                    <SelectItem value="IOMA">IOMA</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="isFirstTime"
            render={({ field }) => (
              <FormItem className="flex items-end space-x-2">
                <FormControl>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant={field.value ? "default" : "outline"}
                      className={`flex-1 ${field.value ? "bg-primary text-primary-foreground" : "border-primary/20 hover:bg-primary/5"}`}
                      onClick={() => field.onChange(true)}
                    >
                      Primera Vez
                    </Button>
                    <Button
                      type="button"
                      variant={!field.value ? "default" : "outline"}
                      className={`flex-1 ${!field.value ? "bg-primary text-primary-foreground" : "border-primary/20 hover:bg-primary/5"}`}
                      onClick={() => field.onChange(false)}
                    >
                      Paciente Recurrente
                    </Button>
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={mutation.isPending}
        >
          {mutation.isPending 
            ? (mode === 'edit' ? "Actualizando..." : "Creando...") 
            : (mode === 'edit' ? "Actualizar Turno" : "Crear Turno")}
        </Button>
      </form>
      
      {/* Modal para terapia de ginecología regenerativa */}
      <RegenerativeTherapyModal
        isOpen={showRegenerativeModal}
        onClose={() => setShowRegenerativeModal(false)}
        onConfirm={handleRegenerativeTherapyConfirm}
      />
    </Form>
  );
}