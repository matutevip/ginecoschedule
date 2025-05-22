import React, { useRef, useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarX, Check, CheckCircle, CircleX, Loader2, Trash2, Calendar, Clock } from "lucide-react";
import { format, parse, addDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertAppointmentSchema, Appointment } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

// Definición correcta del tipo InsertAppointment con isFromGoogleCalendar
type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

// Definimos tipos más específicos para evitar errores de tipado
type ServiceType = "Consulta" | "Consulta & PAP" | "Extracción & Colocación de DIU" | "Terapia de Ginecología Regenerativa" | "Biopsia";
type ObraSocial = "Particular" | "IOMA";

const quickAppointmentSchema = z.object({
  patientName: z.string().min(1, { message: "Nombre del paciente es requerido" }),
  email: z.string().email({ message: "Email inválido" }),
  phone: z.string().min(1, { message: "Teléfono es requerido" }),
  serviceType: z.enum(["Consulta", "Consulta & PAP", "Extracción & Colocación de DIU", "Terapia de Ginecología Regenerativa", "Biopsia"]),
  obraSocial: z.enum(["Particular", "IOMA"]),
  isFirstTime: z.boolean().default(false),
  notes: z.string().optional().default(""),
});

type QuickAppointmentFormValues = z.infer<typeof quickAppointmentSchema>;

interface QuickAppointmentFormProps {
  date: Date;
  timeStr: string;
  onSubmit: (data: InsertAppointment) => void;
  onCancel: () => void;
  onDelete?: (id: number) => void;
  isPending: boolean;
  initialData?: Appointment;
  mode?: 'create' | 'edit';
}

export function QuickAppointmentForm({
  date,
  timeStr,
  onSubmit,
  onCancel,
  onDelete,
  isPending,
  initialData,
  mode = 'create'
}: QuickAppointmentFormProps) {
  // Estados para la fecha y hora seleccionadas
  const [selectedDate, setSelectedDate] = useState<Date>(date);
  const [selectedTime, setSelectedTime] = useState<string>(timeStr);
  
  const form = useForm<QuickAppointmentFormValues>({
    resolver: zodResolver(quickAppointmentSchema),
    defaultValues: {
      patientName: initialData?.patientName || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      serviceType: (initialData?.serviceType as ServiceType) || "Consulta",
      obraSocial: (initialData?.obraSocial as ObraSocial) || "Particular",
      isFirstTime: initialData?.isFirstTime || false,
      notes: initialData?.notes || "",
    },
  });

  // Inicializar el formulario y los estados de fecha/hora cuando los datos iniciales cambian
  React.useEffect(() => {
    if (initialData && mode === 'edit') {
      // Inicializar fecha y hora desde initialData si es edición
      const appointmentDate = new Date(initialData.appointmentTime);
      setSelectedDate(appointmentDate);
      setSelectedTime(format(appointmentDate, 'HH:mm'));
      
      form.reset({
        patientName: initialData.patientName,
        email: initialData.email,
        phone: initialData.phone,
        serviceType: initialData.serviceType as ServiceType,
        obraSocial: initialData.obraSocial as ObraSocial,
        isFirstTime: initialData.isFirstTime || false,
        notes: initialData.notes || "",
      });
    } else {
      // Inicializar con los valores pasados como props si es creación
      setSelectedDate(date);
      setSelectedTime(timeStr);
    }
  }, [initialData, form, mode, date, timeStr]);

  const handleSubmit = (values: QuickAppointmentFormValues) => {
    // Crear objeto de fecha para la cita usando los estados seleccionados
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const appointmentDateTime = new Date(selectedDate);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    // Preparar datos para enviar con tipado correcto
    const appointmentData: InsertAppointment = {
      patientName: values.patientName,
      email: values.email,
      phone: values.phone,
      serviceType: values.serviceType as ServiceType,
      obraSocial: values.obraSocial as ObraSocial,
      isFirstTime: values.isFirstTime,
      notes: values.notes || "",
      appointmentTime: appointmentDateTime,
      isFromGoogleCalendar: false,
      // Conservar el patientId si existe en los datos iniciales
      ...(initialData?.patientId ? { patientId: initialData.patientId } : {}),
      // Conservar el googleEventId si existe en los datos iniciales
      ...(initialData?.googleEventId ? { googleEventId: initialData.googleEventId } : {}),
    };

    onSubmit(appointmentData);
  };

  // Generar opciones de tiempo (cada 20 minutos desde las 8 hasta las 20)
  const timeOptions = Array.from({ length: 37 }, (_, i) => {
    const hour = Math.floor(i / 3) + 8;
    const minute = (i % 3) * 20;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  const dateFormatted = format(selectedDate, "EEEE d 'de' MMMM", { locale: es });

  // Referencias y estados para el posicionamiento inteligente
  const cardRef = useRef<HTMLDivElement>(null);
  const [isTopPositioned, setIsTopPositioned] = useState(true);
  
  // Efecto para determinar la posición óptima del formulario basado en la posición del slot en el viewport
  useEffect(() => {
    // Dado que nuestro formulario está basado en la posición en viewport más que en la hora,
    // utilizamos un valor inicial basado en la hora solo como fallback
    const [hours, minutes] = timeStr.split(":").map(Number);
    const timeAsDecimal = hours + (minutes / 60);
    
    // Punto de referencia inicial: 10:00 AM
    const initialPositionThreshold = 10.0;
    
    // Inicializamos con un valor por defecto
    let shouldPositionTop = timeAsDecimal < initialPositionThreshold;
    
    // Añadimos una comprobación adicional basada en la posición del elemento en el viewport
    const checkViewportPosition = () => {
      if (!cardRef.current) return;
      
      const rect = cardRef.current.getBoundingClientRect();
      const parentElement = cardRef.current.parentElement;
      
      if (!parentElement) return;
      
      const parentRect = parentElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Verificamos si hay suficiente espacio debajo del elemento
      const spaceBelow = viewportHeight - parentRect.bottom;
      // Altura estimada del formulario (ajustar según necesidad)
      const formHeight = 450;
      
      // Si no hay suficiente espacio debajo, posicionamos arriba
      if (spaceBelow < formHeight) {
        shouldPositionTop = false;
      } else {
        shouldPositionTop = true;
      }
      
      // Si la posición es muy alta en la pantalla, forzamos que se muestre hacia abajo
      if (parentRect.top < 150) {
        shouldPositionTop = true;
      }
      
      setIsTopPositioned(shouldPositionTop);
    };
    
    // Verificación inicial
    setTimeout(checkViewportPosition, 0);
    
    // Agregar listener para redimensionamientos
    window.addEventListener('resize', checkViewportPosition);
    
    // Limpiar listener al desmontar
    return () => {
      window.removeEventListener('resize', checkViewportPosition);
    };
  }, [timeStr]);

  return (
    <>
      {/* Overlay semi-transparente */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        }}
      />
      
      <Card 
        ref={cardRef}
        className={`w-full fixed ${isTopPositioned ? 'top-[80px]' : 'bottom-[20px]'} left-1/2 z-50 shadow-lg border-primary/30 bg-white max-h-[85vh] overflow-y-auto`}
        style={{
          maxWidth: '500px',
          width: '95%',
          transform: 'translateX(-50%)',
          transition: 'transform 0.2s ease'
        }}
      >
        <CardHeader className="p-3 pb-0">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>{mode === 'edit' ? 'Editar' : 'Nuevo'} turno: {dateFormatted} - {timeStr}</span>
            <div className="flex space-x-1">
              {mode === 'edit' && initialData?.id && onDelete && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-destructive/10" 
                  onClick={() => onDelete(initialData.id)}
                  disabled={isPending}
                  title="Eliminar turno"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-6 w-6 p-0" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCancel();
                }} 
                disabled={isPending}
                title="Cerrar"
              >
                <CalendarX className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-2">
              <FormField
                control={form.control}
                name="patientName"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Paciente</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="h-7 text-xs" 
                        placeholder="Nombre completo"
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">Email</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="h-7 text-xs" 
                          placeholder="correo@ejemplo.com" 
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">Teléfono</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="h-7 text-xs" 
                          placeholder="+54 9 11..." 
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="serviceType"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">Servicio</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Consulta">Consulta</SelectItem>
                          <SelectItem value="Consulta & PAP">Consulta + PAP y Colpo</SelectItem>
                          <SelectItem value="Extracción & Colocación de DIU">DIU / SIU / Implante</SelectItem>
                          <SelectItem value="Terapia de Ginecología Regenerativa">Terapia</SelectItem>
                          <SelectItem value="Biopsia">Biopsia</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="obraSocial"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">Obra Social</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Particular">Particular</SelectItem>
                          <SelectItem value="IOMA">IOMA</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="isFirstTime"
                render={({ field }) => (
                  <FormItem className="space-y-1 flex flex-col">
                    <FormLabel className="text-xs">Primera Vez</FormLabel>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={field.value ? "default" : "outline"}
                        className={`h-7 text-xs ${field.value ? "bg-primary text-primary-foreground" : ""}`}
                        onClick={() => field.onChange(true)}
                        disabled={isPending}
                      >
                        <CheckCircle className={`h-3 w-3 mr-1 ${field.value ? "" : "opacity-50"}`} />
                        Sí
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={!field.value ? "default" : "outline"}
                        className={`h-7 text-xs ${!field.value ? "bg-primary text-primary-foreground" : ""}`}
                        onClick={() => field.onChange(false)}
                        disabled={isPending}
                      >
                        <CircleX className={`h-3 w-3 mr-1 ${!field.value ? "" : "opacity-50"}`} />
                        No
                      </Button>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Notas</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        className="min-h-[60px] text-xs" 
                        placeholder="Notas adicionales"
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="submit"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Check className="h-3 w-3 mr-1" />
                  )}
                  Guardar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}