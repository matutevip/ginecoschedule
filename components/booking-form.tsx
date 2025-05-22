import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAppointmentSchema, type InsertAppointment } from "@shared/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay, isFuture, addWeeks, nextWednesday } from "date-fns";
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Edit2, Check, AlertTriangle, X, UserCheck, HelpCircle, Sun, Moon, Coffee, Calendar } from "lucide-react";
import { SiInstagram } from 'react-icons/si';
import { motion, AnimatePresence } from "framer-motion";
import { RegenerativeTherapyModal } from "@/components/ui/regenerative-therapy-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { parseISO, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TIMEZONE = 'America/Argentina/Buenos_Aires';
const START_HOUR = 9;
const END_HOUR = 12;
const INTERVAL_MINUTES = 20; // Cambiado de 30 a 20 para unificar con la vista del médico

const isVacationPeriod = (date: Date, vacationPeriods: Array<{ start: string, end: string }>) => {
  return vacationPeriods.some(period => {
    const start = parseISO(period.start);
    const end = parseISO(period.end);
    return isWithinInterval(date, { start, end });
  });
};

const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return {
      text: "¡Buenos días!",
      icon: <Sun className="w-5 h-5 text-yellow-500" aria-hidden="true" />
    };
  } else if (hour >= 12 && hour < 18) {
    return {
      text: "¡Buenas tardes!",
      icon: <Coffee className="w-5 h-5 text-orange-500" aria-hidden="true" />
    };
  } else {
    return {
      text: "¡Buenas noches!",
      icon: <Moon className="w-5 h-5 text-indigo-500" aria-hidden="true" />
    };
  }
};

const TimeSlotSkeleton = () => (
  <>
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div
        key={i}
        className="h-12 bg-gray-200 animate-pulse rounded-md"
        aria-hidden="true"
      />
    ))}
  </>
);

const BookingForm = () => {
  const queryClient = useQueryClient();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showEditConfirmation, setShowEditConfirmation] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showVacationDialog, setShowVacationDialog] = useState(false);
  const [showRegenerativeModal, setShowRegenerativeModal] = useState(false);
  const originalValues = useRef<InsertAppointment | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string>("");
  const [submittedPhone, setSubmittedPhone] = useState<string>("");

  const scheduleConfigQuery = useQuery({
    queryKey: ['/api/schedule-config'],
    queryFn: async () => {
      console.log('Fetching schedule config in booking form');
      const response = await apiRequest('GET', '/api/schedule-config');
      
      // Log the response for debugging
      if (!response.ok) {
        console.error('Error fetching schedule config:', await response.text());
        throw new Error('Error al obtener la configuración de horarios');
      }
      
      const data = await response.json();
      console.log('Retrieved schedule config:', data);
      return data;
    }
  });

  // Función para determinar si un servicio requiere 40 minutos (en lugar de 20)
  const requiresLongerTime = (serviceType: string): boolean => {
    return serviceType === "Extracción & Colocación de DIU" || 
           serviceType === "Terapia de Ginecología Regenerativa";
  };
  
  const mutation = useMutation({
    mutationFn: async (data: InsertAppointment) => {
      const localDate = parseISO(data.appointmentTime.toISOString());

      console.log('Submitting appointment:', {
        originalTime: localDate.toISOString(),
        appointmentDate: data.appointmentTime.toISOString()
      });

      const res = await apiRequest("POST", "/api/appointments", {
        ...data,
        appointmentTime: data.appointmentTime.toISOString()
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Error al crear el turno");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/appointments"] });
      setSubmittedEmail(variables.email);
      setSubmittedPhone(variables.phone);
      setShowConfirmation(true);
      setCurrentStep(1);
      setSelectedDate(null);
      setSelectedTime(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = () => {
    if (!isEditing) {
      originalValues.current = form.getValues();
      setIsEditing(true);
    } else {
      handleConfirmEdit();
    }
  };

  const handleConfirmEdit = () => {
    setShowEditConfirmation(true);
  };

  const finalizeEdit = () => {
    setIsEditing(false);
    setShowEditConfirmation(false);
  };

  const handleCancelEdit = () => {
    if (originalValues.current) {
      form.reset(originalValues.current);
    }
    setIsEditing(false);
    setShowEditConfirmation(false);
  };

  const isFieldChanged = (fieldName: keyof InsertAppointment) => {
    if (!originalValues.current || !isEditing) return false;
    const currentValue = form.getValues(fieldName);
    const originalValue = originalValues.current[fieldName];

    if (fieldName === 'appointmentTime') {
      return currentValue instanceof Date && originalValue instanceof Date
        ? currentValue.getTime() !== originalValue.getTime()
        : currentValue !== originalValue;
    }
    return currentValue !== originalValue;
  };

  const form = useForm<InsertAppointment>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      patientName: "",
      email: "",
      phone: "",
      notes: "",
      isFirstTime: false,
      serviceType: undefined,
      obraSocial: undefined,
      appointmentTime: undefined,
    },
  });

  // Consulta de disponibilidad usando el tipo de servicio seleccionado
  const availabilityQuery = useQuery({
    queryKey: [
      'appointments', 
      'availability', 
      selectedDate instanceof Date && !isNaN(selectedDate.getTime()) ? selectedDate.toISOString() : null, 
      form.watch('serviceType')
    ],
    queryFn: async () => {
      // Verificar que selectedDate sea una fecha válida
      if (!selectedDate || !(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) return null;
      
      const serviceType = form.watch('serviceType');
      
      try {
        const response = await apiRequest(
          'GET',
          `/api/appointments/availability?date=${selectedDate.toISOString()}&serviceType=${encodeURIComponent(serviceType || '')}`
        );
        const data = await response.json();
        console.log('Availability data:', data);
        return data;
      } catch (error) {
        console.error('Error fetching availability:', error);
        return null;
      }
    },
    enabled: !!(selectedDate instanceof Date && !isNaN(selectedDate.getTime()))
  });

  // Cuando cambia el tipo de servicio, intentamos mantener la selección si es posible
  useEffect(() => {
    const currentServiceType = form.watch('serviceType');
    if (currentServiceType) {
      console.log('Cambió el tipo de servicio a:', currentServiceType);
      
      // Si ya hay una fecha seleccionada, forzar la recarga de los slots para el nuevo tipo de servicio
      if (selectedDate instanceof Date && !isNaN(selectedDate.getTime())) {
        console.log('Actualizando disponibilidad con el nuevo tipo de servicio');
        
        // La consulta se actualizará automáticamente gracias a la dependencia en el queryKey
        // Si el horario 11:40 está seleccionado para un servicio largo y sigue estando disponible,
        // lo mantenemos, de lo contrario, dejamos que el usuario seleccione un nuevo horario

        // Determinamos si estamos cambiando entre tipos de servicios de diferentes duraciones
        const prevServiceType = selectedTime ? form.getValues().serviceType : '';
        const wasLongService = prevServiceType === "Extracción & Colocación de DIU" || 
                              prevServiceType === "Terapia de Ginecología Regenerativa";
        const isLongService = currentServiceType === "Extracción & Colocación de DIU" || 
                             currentServiceType === "Terapia de Ginecología Regenerativa";

        // Si es el horario especial 11:40, lo mantenemos independientemente del tipo de servicio
        if (selectedTime === '11:40') {
          console.log('Manteniendo selección de horario especial 11:40 independientemente del cambio de servicio');
          
          // No hacemos nada, preservamos el horario seleccionado
        }
        // Para otros horarios, verificamos si cambia el tipo de duración del servicio
        else if ((wasLongService && !isLongService) || (!wasLongService && isLongService)) {
          // Solo si hay un horario seleccionado, necesitamos preocuparnos por cambiarlo
          if (selectedTime) {
            console.log(`Reseteando selección de tiempo ${selectedTime} debido a cambio de tipo de servicio`);
            
            // Dejar que el usuario elija un nuevo horario
            setSelectedTime(null);
            form.setValue('appointmentTime', undefined as any, {
              shouldValidate: true,
              shouldDirty: true
            });
            
            // Mensaje más amigable
            toast({
              title: "Tipo de servicio actualizado",
              description: "Por favor, selecciona un horario disponible para " + currentServiceType,
              variant: "default",
              duration: 3000,
            });
          }
        }
      }
    }
  }, [form.watch('serviceType')]);

  // Combinar días regulares (miércoles) con días eventuales
  const availableDates = useMemo(() => {
    // Obtenemos los próximos 8 miércoles por defecto
    const regularDates = Array.from({ length: 8 }, (_, i) => {
      const date = addWeeks(nextWednesday(new Date()), i);
      return date;
    });

    // Si hay días eventuales configurados, los agregamos
    const occasionalDates: Date[] = [];
    if (scheduleConfigQuery.data?.occasionalWorkDays?.length) {
      // Filtramos solo los días eventuales que están en el futuro
      scheduleConfigQuery.data.occasionalWorkDays.forEach((dateStr: string) => {
        // Parseamos la fecha correctamente asegurando que se usa la zona horaria correcta
        // Formato esperado de dateStr: "YYYY-MM-DD"
        try {
          // Crear la fecha en UTC para evitar problemas de zona horaria
          const [year, month, day] = dateStr.split('-').map((num: string) => parseInt(num, 10));
          if (isNaN(year) || isNaN(month) || isNaN(day)) {
            console.error('Formato de fecha inválido:', dateStr);
            return;
          }
          
          // Creamos la fecha con los componentes específicos para evitar desplazamientos de zona horaria
          // Mes es 0-indexado en JavaScript (0 = enero, 11 = diciembre)
          const eventualDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
          
          console.log(`Procesando fecha eventual: ${dateStr} => ${eventualDate.toISOString()}`);
          
          if (isFuture(eventualDate)) {
            occasionalDates.push(eventualDate);
          }
        } catch (error) {
          console.error('Error al procesar fecha eventual:', dateStr, error);
        }
      });
      
      console.log('Días eventuales encontrados:', occasionalDates.map(d => format(d, 'yyyy-MM-dd')));
    }
    
    // Combinar ambos arrays y ordenar por fecha
    const allDates = [...regularDates, ...occasionalDates].sort((a, b) => a.getTime() - b.getTime());
    
    // Eliminar duplicados (si un día eventual coincide con un miércoles)
    const uniqueDates = allDates.filter((date, index, self) => 
      index === self.findIndex(d => isSameDay(d, date))
    );
    
    console.log('Fechas disponibles para reserva:', uniqueDates.map(d => format(d, 'yyyy-MM-dd')));
    return uniqueDates;
  }, [scheduleConfigQuery.data]);

  const handleDateTimeSelection = (date: Date | null) => {
    if (date) {
      const config = scheduleConfigQuery.data;
      if (config?.vacationPeriods?.length > 0 && isVacationPeriod(date, config.vacationPeriods)) {
        setShowVacationDialog(true);
        return;
      }

      if (selectedTime) {
        const [hours, minutes] = selectedTime.split(':').map(Number);
        const appointmentDate = new Date(date);
        appointmentDate.setHours(hours, minutes, 0, 0);
        const buenosAiresDate = toZonedTime(appointmentDate, TIMEZONE);
        form.setValue('appointmentTime', buenosAiresDate, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true
        });
      }

      setSelectedDate(date);
      if (!isEditing && currentStep === 1) {
        setCurrentStep(2);
      }
    }
  };

  const canProceedToStep3 = () => {
    const { patientName, email, phone } = form.getValues();
    const errors = form.formState.errors;
    return patientName && email && phone && !errors.patientName && !errors.email && !errors.phone;
  };

  const canProceedToStep4 = () => {
    const values = form.getValues();
    const errors = form.formState.errors;

    return (
      values.patientName &&
      values.email &&
      values.phone &&
      values.serviceType &&
      values.obraSocial &&
      values.appointmentTime &&
      Object.keys(errors).length === 0
    );
  };

  const handleFieldChange = (field: keyof InsertAppointment, value: any) => {
    form.setValue(field, value, { shouldValidate: true });
    console.log(`handleFieldChange called for field: ${field}, value: ${value}, currentStep: ${currentStep}`);

    // Validamos que el appointmentTime esté presente
    const appointmentTime = form.getValues().appointmentTime;
    if (!appointmentTime && field !== 'appointmentTime') {
      console.log("appointmentTime no está presente, usando el selectedTime si está disponible");
      if (selectedTime && selectedDate) {
        // Recrear el appointmentTime basado en selectedDate y selectedTime
        const [hours, minutes] = selectedTime.split(':').map(Number);
        const appointmentDate = new Date(selectedDate);
        appointmentDate.setHours(hours, minutes, 0, 0);
        const buenosAiresDate = toZonedTime(appointmentDate, TIMEZONE);
        
        form.setValue('appointmentTime', buenosAiresDate, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true
        });
        console.log("Fijamos appointmentTime basado en selectedTime:", selectedTime);
      }
    }

    if (isEditing) return;

    if (currentStep === 2) {
      const { patientName, email, phone } = form.getValues();
      const personalInfoErrors = form.formState.errors;
      if (patientName && email && phone && !personalInfoErrors.patientName && !personalInfoErrors.email && !personalInfoErrors.phone) {
        console.log("Advancing to step 3 - Contact info complete");
        setCurrentStep(3);
      }
    } else if (currentStep === 3 && (field === 'serviceType' || field === 'obraSocial')) {
      // Verificamos inmediatamente después de la actualización del campo
      setTimeout(() => {
        const { serviceType, obraSocial, appointmentTime } = form.getValues();
        const serviceErrors = form.formState.errors;
        
        console.log(`Checking service info: serviceType=${serviceType}, obraSocial=${obraSocial}, appointmentTime=${appointmentTime ? 'present' : 'missing'}`);
        console.log(`Errors: ${JSON.stringify(serviceErrors)}`);

        if (serviceType && obraSocial && appointmentTime && !serviceErrors.serviceType && !serviceErrors.obraSocial) {
          console.log("Advancing to step 4 - Service info complete");
          setCurrentStep(4);
        } else if (serviceType && obraSocial && !appointmentTime) {
          // Mostrar mensaje de error
          toast({
            title: "Selección incompleta",
            description: "Por favor, regresa al Paso 1 y selecciona un horario disponible",
            variant: "destructive",
            duration: 5000,
          });
        }
      }, 100); // Pequeño retraso para asegurar que se actualicen los valores
    }
  };

  const filterAvailableTimeSlots = (slots: { time: string; available: boolean }[]) => {
    // Simplificamos completamente la función - confiamos en el backend
    // Si el backend dice que el slot está disponible, lo mostramos sin filtrado adicional
    console.log(`Mostrando slots disponibles según el backend (sin filtros adicionales): ${slots.filter(slot => slot.available).length} disponibles`);
    
    // Retornamos directamente los slots marcados como disponibles
    return slots.filter(slot => slot.available);
  };

  const onSubmit = (data: InsertAppointment) => {
    if (!isEditing && currentStep === 4) {
      mutation.mutate(data);
    }
  };

  const handleStartOver = () => {
    navigate("/");
  };

  const closeConfirmation = () => {
    setShowConfirmation(false);
    queryClient.invalidateQueries({ queryKey: ['appointments', 'availability'] });
    navigate("/");
  };

  const formatDateTime = (date: Date) => {
    return formatInTimeZone(date, TIMEZONE, "PPP 'a las' HH:mm", { locale: es });
  };

  const handleTimeSlotClick = (slot: { time: string; available: boolean }) => {
    if (slot.available && selectedDate) {
      const [hours, minutes] = slot.time.split(':').map(Number);
      const appointmentDate = new Date(selectedDate);
      appointmentDate.setHours(hours, minutes, 0, 0);
      const buenosAiresDate = toZonedTime(appointmentDate, TIMEZONE);

      console.log('Time slot selection:', {
        slotTime: slot.time,
        selectedDate: selectedDate instanceof Date && !isNaN(selectedDate.getTime()) ? selectedDate.toISOString() : null,
        appointmentDate: appointmentDate instanceof Date && !isNaN(appointmentDate.getTime()) ? appointmentDate.toISOString() : null,
        buenosAiresDate: buenosAiresDate instanceof Date && !isNaN(buenosAiresDate.getTime()) ? buenosAiresDate.toISOString() : null
      });

      setSelectedTime(slot.time);
      form.setValue('appointmentTime', buenosAiresDate, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });

      if (!isEditing && currentStep === 1) {
        setCurrentStep(2);
      }
    }
  };

  const greeting = getTimeBasedGreeting();

  return (
    <div
      className="bento-grid"
      role="main"
      aria-label="Formulario de reserva de turnos"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
          <div
            className={cn("paso1", currentStep === 1 ? "focus" : "")}
            role="region"
            aria-label="Paso 1: Selección de fecha y horario"
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 text-2xl font-semibold mb-6"
            >
              {greeting.icon}
              <span>{greeting.text}</span>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-muted-foreground text-center mb-6"
            >
              Reservá tu turno con la Dra. Montañés
            </motion.p>

            <div className="flex items-center gap-2">
              <h2 id="step1-heading">1. Elegí día y Horario</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      aria-label="Ayuda sobre selección de fecha y horario"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Seleccioná el miércoles que prefieras y luego
                       elegí un horario disponible entre las 9 y las 12 hs.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <FormField
              control={form.control}
              name="appointmentTime"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="space-y-4">
                      <Select
                        value={selectedDate instanceof Date && !isNaN(selectedDate.getTime()) ? selectedDate.toISOString() : undefined}
                        onValueChange={(value) => {
                          try {
                            const date = new Date(value);
                            if (!isNaN(date.getTime())) {
                              handleDateTimeSelection(date);
                              setSelectedTime(null);
                              field.onChange(null);
                            }
                          } catch (err) {
                            console.error('Error al parsear la fecha:', err);
                          }
                        }}
                        aria-label="Seleccionar fecha de turno"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar fecha">
                            {selectedDate instanceof Date && !isNaN(selectedDate.getTime()) 
                              ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es })
                              : "Seleccionar fecha"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {availableDates.map((date) => (
                            <SelectItem
                              key={date.toISOString()}
                              value={date.toISOString()}
                            >
                              {format(date, "EEEE d 'de' MMMM", { locale: es })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {selectedDate instanceof Date && !isNaN(selectedDate.getTime()) && availabilityQuery.isPending ? (
                        <div
                          className="grid grid-cols-3 gap-2"
                          role="status"
                          aria-label="Cargando horarios disponibles"
                        >
                          <TimeSlotSkeleton />
                        </div>
                      ) : selectedDate instanceof Date && !isNaN(selectedDate.getTime()) && availabilityQuery.data?.timeSlots?.length > 0 ? (
                        <div>
                          {filterAvailableTimeSlots(availabilityQuery.data.timeSlots).length > 0 ? (
                            <div
                              className="grid grid-cols-3 gap-2"
                              role="radiogroup"
                              aria-label="Horarios disponibles"
                            >
                              <AnimatePresence>
                                {filterAvailableTimeSlots(availabilityQuery.data.timeSlots).map((slot: { time: string; available: boolean }) => (
                                  <motion.div
                                    key={slot.time}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <Button
                                      type="button"
                                      variant={selectedTime === slot.time ? "default" : "outline"}
                                      className={cn(
                                        "w-full transition-all duration-200",
                                        !slot.available && "opacity-50 cursor-not-allowed",
                                        selectedTime === slot.time && "bg-primary text-primary-foreground",
                                        "hover:shadow-md hover:border-primary/50"
                                      )}
                                      disabled={!slot.available}
                                      onClick={() => handleTimeSlotClick(slot)}
                                      role="radio"
                                      aria-checked={selectedTime === slot.time}
                                      aria-label={`Horario ${slot.time} ${!slot.available ? 'no disponible' : ''}`}
                                    >
                                      {slot.time} hs
                                    </Button>
                                  </motion.div>
                                ))}
                              </AnimatePresence>
                            </div>
                          ) : (
                            <div
                              className="text-center py-6 px-4 border-2 border-yellow-200 bg-yellow-50 rounded-lg"
                              role="alert"
                              aria-live="polite"
                            >
                              <AlertTriangle className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                              <p className="text-sm font-medium text-yellow-700">
                                No hay horarios disponibles para este día
                              </p>
                              <p className="text-xs text-yellow-600 mt-1">
                                Por favor seleccione otra fecha o consulte más adelante
                              </p>
                            </div>
                          )}
                        </div>
                      ) : selectedDate instanceof Date && !isNaN(selectedDate.getTime()) ? (
                        <div
                          className="text-center py-6 px-4 border-2 border-yellow-200 bg-yellow-50 rounded-lg"
                          role="alert"
                          aria-live="polite"
                        >
                          <AlertTriangle className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                          <p className="text-sm font-medium text-yellow-700">
                            No hay horarios disponibles para este día
                          </p>
                          <p className="text-xs text-yellow-600 mt-1">
                            Por favor seleccione otra fecha o consulte más adelante
                          </p>
                        </div>
                      ) : (
                        <div
                          className="text-center py-6 px-4 border-2 border-blue-200 bg-blue-50 rounded-lg"
                          role="alert"
                          aria-live="polite"
                        >
                          <Calendar className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                          <p className="text-sm font-medium text-blue-700">
                            Seleccione una fecha para ver los horarios disponibles
                          </p>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className={cn(
            "paso2",
            currentStep === 2 ? "focus" : ""
          )}>
            <div className="flex items-center gap-2">
              <h2 id="step2-heading">2. Datos Personales</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5" aria-label="Ayuda sobre datos personales">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ingresá tus datos de contacto para poder enviarte
                       la confirmación por email.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="formulario-paciente">
              <FormField
                control={form.control}
                name="patientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="patientName">Nombre</FormLabel>
                    <FormControl>
                      <Input
                        id="patientName"
                        placeholder="Nombre completo"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          handleFieldChange('patientName', e.target.value);
                        }}
                        aria-describedby="patientName-description"
                      />
                    </FormControl>
                    <p id="patientName-description" className="sr-only">
                      Ingrese su nombre completo como figura en su documento
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="email">Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Correo Electrónico"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          handleFieldChange('email', e.target.value);
                        }}
                        aria-describedby="email-description"
                      />
                    </FormControl>
                    <p id="email-description" className="sr-only">
                      Ingrese su dirección de correo electrónico para recibir la confirmación del turno
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="phone">Whatsapp</FormLabel>
                    <FormControl>
                      <Input
                        id="phone"
                        placeholder="Whatsapp +5411********"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          handleFieldChange('phone', e.target.value);
                        }}
                        aria-describedby="phone-description"
                      />
                    </FormControl>
                    <p id="phone-description" className="sr-only">
                      Ingrese su número de WhatsApp incluyendo el código de área
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className={cn(
            "paso3",
            currentStep === 3 ? "focus" : ""
          )}>
            <div className="flex items-center gap-2">
              <h2 id="step3-heading">3. Tipo de Consulta</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5" aria-label="Ayuda sobre tipo de consulta">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Seleccioná el tipo de consulta que necesitás y
                       tu obra social. Si es tu primera consulta, marcá la casilla correspondiente.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <FormField
              control={form.control}
              name="serviceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="serviceType">Tipo de Consulta</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleFieldChange('serviceType', value);
                        
                        // Mostrar modal para terapia de ginecología regenerativa
                        if (value === "Terapia de Ginecología Regenerativa") {
                          setShowRegenerativeModal(true);
                        }
                      }}
                      value={field.value}
                      aria-describedby="serviceType-description"
                    >
                      <SelectTrigger id="serviceType">
                        <SelectValue placeholder="Seleccione tipo de consulta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Consulta">Consulta</SelectItem>
                        <SelectItem value="Consulta & PAP">Consulta + PAP y Colpo</SelectItem>
                        <SelectItem value="Extracción & Colocación de DIU">
                          DIU / SIU / Implante
                        </SelectItem>
                        <SelectItem value="Terapia de Ginecología Regenerativa">
                          Terapia de Ginecología Regenerativa
                        </SelectItem>
                        <SelectItem value="Biopsia">
                          Biopsia
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <p id="serviceType-description" className="sr-only">
                    Seleccione el tipo de consulta o procedimiento que necesita
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="obraSocial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="obraSocial">Obra Social</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleFieldChange('obraSocial', value);
                        
                        // Avanzar inmediatamente si tenemos toda la info necesaria
                        const { serviceType, appointmentTime } = form.getValues();
                        if (serviceType && appointmentTime && value) {
                          console.log("Advancing to step 4 after selecting obra social");
                          setTimeout(() => setCurrentStep(4), 100);
                        }
                      }}
                      value={field.value}
                      aria-describedby="obraSocial-description"
                    >
                      <SelectTrigger id="obraSocial">
                        <SelectValue placeholder="Seleccione su obra social" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Particular">Particular</SelectItem>
                        <SelectItem value="IOMA">IOMA</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <p id="obraSocial-description" className="sr-only">
                    Seleccione su obra social si corresponde
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isFirstTime"
              render={({ field }) => (
                <FormItem className="flex flex-col space-y-2 border rounded-lg p-4 bg-primary/5 border-primary/20">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-primary" aria-hidden="true" />
                    <FormLabel htmlFor="isFirstTime" className="text-base font-medium">
                      Primera Consulta
                    </FormLabel>
                  </div>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        id="isFirstTime"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-primary"
                        aria-describedby="isFirstTime-description"
                      />
                    </FormControl>
                    <FormDescription id="isFirstTime-description" className="text-sm">
                      Marque esta opción si es su primera consulta con la Dra. Montañés
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="notes">Notas Adicionales</FormLabel>
                  <FormControl>
                    <Textarea
                      id="notes"
                      placeholder="Notas adicionales (opcional)"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange('notes', e.target.value);
                      }}
                      aria-describedby="notes-description"
                    />
                  </FormControl>
                  <p id="notes-description" className="sr-only">
                    Ingrese cualquier información adicional o aclaración importante para su consulta
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>


          <div
            className={cn(
              "paso4",
              currentStep === 4 ? "focus" : "",
              currentStep < 4 ? "hidden" : ""
            )}
            role="region"
            aria-label="Paso 4: Revisión y confirmación"
          >
            <div className="flex items-center gap-2">
              <h2 id="step4-heading">4. Chequeá tu turno</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      aria-label="Ayuda sobre revisión del turno"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Revisá que todos los datos sean correctos antes de confirmar.
                       Podés modificarlos usando el botón de editar si es necesario.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <p>Revisá la información de tu turno y confirmá.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={handleEdit}
                className="bg-white text-[#9a7fb5] hover:bg-[#9a7fb5] hover:text-white border-2 border-[#9a7fb5] font-bold transition-colors duration-300 ease-in-out flex items-center gap-2"
                aria-label={isEditing ? "Confirmar cambios" : "Editar información del turno"}
              >
                {isEditing ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Confirmar
                  </>
                ) : (
                  <>
                    <Edit2 className="h-4 w-4" aria-hidden="true" />
                    Editar
                  </>
                )}
              </Button>
            </div>
            <div
              className="space-y-4 mt-4 text-white"
              role="region"
              aria-label="Resumen del turno"
            >
              <p><strong>Nombre:</strong> <span className={isFieldChanged('patientName') ? "highlight-changed" : "highlight"}>{form.getValues("patientName")}</span></p>
              <p><strong>Email:</strong> <span className={isFieldChanged('email') ? "highlight-changed" : "highlight"}>{form.getValues("email")}</span></p>
              <p><strong>Teléfono:</strong> <span className={isFieldChanged('phone') ? "highlight-changed" : "highlight"}>{form.getValues("phone")}</span></p>
              <p><strong>Fecha y Hora:</strong> <span className={isFieldChanged('appointmentTime') ? "highlight-changed" : "highlight"}>
                {form.getValues("appointmentTime") &&
                  formatDateTime(form.getValues("appointmentTime"))
                }
              </span></p>
              <p><strong>Tipo de Servicio:</strong> <span className={isFieldChanged('serviceType') ? "highlight-changed" : "highlight"}>{form.getValues("serviceType")}</span></p>
              <p><strong>Obra Social:</strong> <span className={isFieldChanged('obraSocial') ? "highlight-changed" : "highlight"}>{form.getValues("obraSocial")}</span></p>
              {form.getValues("notes") && (
                <p><strong>Notas:</strong> <span className={isFieldChanged('notes') ? "highlight-changed" : "highlight"}>{form.getValues("notes")}</span></p>
              )}
              {!isEditing && (
                <div className="flex justify-end mt-8">
                  <Button
                    type="submit"
                    className="mensaje"
                    disabled={mutation.isPending}
                    aria-label={mutation.isPending ? "Reservando turno..." : "Confirmar turno"}
                  >
                    {mutation.isPending ? "Reservando..." : "Confirmar Turno"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {showConfirmation && (
            <div
              className="paso5-overlay"
              role="dialog"
              aria-label="Confirmación de turno"
              aria-modal="true"
            >
              <motion.div
                className="paso5-content relative"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2"
                  onClick={closeConfirmation}
                  aria-label="Cerrar confirmación"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>

                <motion.div
                  className="text-center space-y-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <h3 className="text-2xl font-bold text-green-700">
                    ¡Turno Confirmado!
                  </h3>
                  <div className="text-gray-600 space-y-2">
                    <p>Te enviamos un email a {submittedEmail} con los detalles de tu turno.</p>
                  </div>
                  <Button
                    className="mt-6"
                    onClick={closeConfirmation}
                    aria-label="Volver al inicio"
                  >
                    Volver al Inicio
                  </Button>
                </motion.div>

              </motion.div>
            </div>
          )}

          {showEditConfirmation && (
            <Dialog open={showEditConfirmation} onOpenChange={setShowEditConfirmation}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Confirmar Cambios
                  </DialogTitle>
                  <DialogDescription>
                    ¿Está seguro de que desea guardar los cambios realizados en la información del turno?
                    Los campos modificados aparecen resaltados en naranja.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Cancelar
                  </Button>
                  <Button onClick={finalizeEdit}>
                    Confirmar Cambios
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {showVacationDialog && (
            <Dialog open={showVacationDialog} onOpenChange={setShowVacationDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-center">
                    Período de Vacaciones
                  </DialogTitle>
                </DialogHeader>
                <div className="p-6 text-center space-y-4">
                  <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
                  <p className="text-lg">
                    La Dra. Montañés estará de vacaciones en las fechas seleccionadas.
                    Por favor, elija otra fecha para su turno.
                  </p>
                </div>
                <DialogFooter>
                  <Button onClick={() => setShowVacationDialog(false)}>
                    Entendido
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          
          {/* Modal para terapia regenerativa */}
          <RegenerativeTherapyModal
            isOpen={showRegenerativeModal}
            onClose={() => setShowRegenerativeModal(false)}
            onConfirm={(hasHadInitialConsultation) => {
              if (!hasHadInitialConsultation) {
                // Si no ha tenido consulta inicial, marcar como primera vez
                form.setValue("isFirstTime", true);
              }
              setShowRegenerativeModal(false);
            }}
          />
        </form>
      </Form>
    </div>
  );
};

export default BookingForm;

const checkmarkVariants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: "easeInOut",
    },
  },
};