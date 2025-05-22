import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAppointmentSchema, type InsertAppointment } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { Checkbox } from "@/components/ui/checkbox";
import { addWeeks, nextWednesday, format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Clock, Loader2 } from "lucide-react";
import { PatientMessageModal } from "@/components/patient-message-modal";

interface TimeSlot {
  time: string;
  available: boolean;
}

interface AvailabilityResponse {
  date: string;
  timeSlots: TimeSlot[];
}

export default function Booking() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const form = useForm<InsertAppointment>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      patientName: "",
      email: "",
      phone: "",
      notes: "",
      isFirstTime: false,
      serviceType: "Consulta",
      obraSocial: "Particular",
      appointmentTime: new Date(), // Inicializado con la fecha actual en lugar de undefined
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertAppointment) => {
      const res = await apiRequest("POST", "/api/appointments", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Error al crear el turno");
      }
      return res.json();
    },
    onSuccess: () => {
      navigate("/confirmation");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  // Generate next 4 Wednesdays for date selection
  const availableDates = Array.from({ length: 4 }, (_, i) =>
    addWeeks(nextWednesday(new Date()), i)
  );

  // Obtener el tipo de servicio seleccionado en tiempo real
  const serviceType = form.watch("serviceType");

  // Consulta de disponibilidad que incluye el tipo de servicio
  const { data: availabilityData, isLoading: loadingAvailability } = useQuery<AvailabilityResponse>({
    queryKey: ["/api/appointments/availability", selectedDate ? selectedDate.toISOString() : null, serviceType],
    queryFn: async () => {
      if (!selectedDate) throw new Error("No date selected");
      const url = `/api/appointments/availability?date=${selectedDate.toISOString()}&serviceType=${encodeURIComponent(serviceType)}`;
      const res = await apiRequest("GET", url);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error checking availability");
      }
      return res.json();
    },
    enabled: !!selectedDate,
  });

  function onSubmit(data: InsertAppointment) {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
      return;
    }
    mutation.mutate(data);
  }

  const handleTimeSlotSelect = (timeStr: string) => {
    if (!selectedDate) return;

    setSelectedTime(timeStr);

    const [hours, minutes] = timeStr.split(':').map(Number);
    const dateTime = new Date(selectedDate);
    dateTime.setHours(hours, minutes, 0, 0);

    form.setValue('appointmentTime', dateTime, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  return (
    <div className="min-h-screen bg-[#fff7f2] py-12">
      <PatientMessageModal />
      <div className="container max-w-6xl mx-auto px-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-3 gap-4">
            {/* Step 1: Date and Time Selection */}
            <div className={cn(
              "bg-[#b39ddb] p-6 rounded-lg row-span-2 transition-all duration-300",
              currentStep === 1 ? "ring-2 ring-black shadow-lg" : "opacity-80"
            )}>
              <h2 className="text-2xl font-semibold mb-4">1. Elegí día y Horario</h2>
              <p className="mb-4">La doctora atiende todos los Miércoles de 09 a 12 hs</p>

              <FormField
                control={form.control}
                name="appointmentTime"
                render={({ field }) => (
                  <div className="space-y-4">
                    <Select
                      value={selectedDate?.toISOString()}
                      onValueChange={(value) => {
                        const newDate = new Date(value);
                        setSelectedDate(newDate);
                        setSelectedTime(null);
                        // No establecemos el valor de appointmentTime aquí, se hará cuando se seleccione una hora
                        // field.onChange(undefined);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar fecha">
                          {selectedDate &&
                            format(selectedDate, "EEEE d 'de' MMMM", {
                              locale: es,
                            })}
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

                    {selectedDate && (
                      <div className="space-y-3">
                        <h3 className="font-medium flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Horarios disponibles
                        </h3>
                        {loadingAvailability ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="w-6 h-6 animate-spin" />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {availabilityData?.timeSlots.map((slot) => {
                              const isSelected = selectedTime === slot.time;

                              return (
                                <button
                                  key={slot.time}
                                  type="button"
                                  disabled={!slot.available}
                                  onClick={() => handleTimeSlotSelect(slot.time)}
                                  className={cn(
                                    "p-3 rounded-md text-sm font-medium transition-all",
                                    "focus:outline-none focus:ring-2 focus:ring-primary",
                                    slot.available
                                      ? isSelected
                                        ? "bg-primary text-white hover:bg-primary/90"
                                        : "bg-white/80 hover:bg-white"
                                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                                  )}
                                >
                                  {slot.time} hs
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <FormMessage />
                      </div>
                    )}
                  </div>
                )}
              />
            </div>

            {/* Step 2: Patient Information */}
            <div className={cn(
              "bg-[#d993a6] p-6 rounded-lg transition-all duration-300",
              currentStep === 2 ? "ring-2 ring-black shadow-lg" : "opacity-80"
            )}>
              <h2 className="text-2xl font-semibold mb-4">2. Datos Personales</h2>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="patientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Nombre completo" {...field} />
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
                      <FormControl>
                        <Input type="email" placeholder="Correo Electrónico" {...field} />
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
                      <FormControl>
                        <Input placeholder="Whatsapp +5411********" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Step 3: Service Details */}
            <div className={cn(
              "bg-[#e6d6ff] p-6 rounded-lg transition-all duration-300",
              currentStep === 3 ? "ring-2 ring-black shadow-lg" : "opacity-80"
            )}>
              <h2 className="text-2xl font-semibold mb-4">3. Tipo de Consulta</h2>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="serviceType"
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        onValueChange={(value) => {
                          // Actualizar el valor del campo
                          field.onChange(value);
                          
                          // Reiniciar la selección de hora si ya había una seleccionada
                          if (selectedTime) {
                            setSelectedTime(null);
                            // No establecemos un valor para appointmentTime hasta que se seleccione una hora
                            // form.resetField('appointmentTime');
                          }
                          
                          // Refrescar la consulta de disponibilidad si hay una fecha seleccionada
                          if (selectedDate) {
                            // La consulta se actualizará automáticamente por el cambio en queryKey
                            console.log(`Tipo de servicio cambiado a ${value}, refrescando disponibilidad...`);
                          }
                        }}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione una Práctica" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Consulta">Consulta</SelectItem>
                          <SelectItem value="Consulta & PAP">Consulta & PAP</SelectItem>
                          <SelectItem value="Extracción & Colocación de DIU">
                            Extracción & Colocación de DIU
                          </SelectItem>
                          <SelectItem value="Terapia de Ginecología Regenerativa">
                            Terapia de Ginecología Regenerativa
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="obraSocial"
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione su obra social" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Particular">Particular</SelectItem>
                          <SelectItem value="OSDE">OSDE</SelectItem>
                          <SelectItem value="Swiss Medical">Swiss Medical</SelectItem>
                          <SelectItem value="Galeno">Galeno</SelectItem>
                          <SelectItem value="Medifé">Medifé</SelectItem>
                          <SelectItem value="IOMA">IOMA</SelectItem>
                          <SelectItem value="Other">Otra</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea placeholder="Notas adicionales" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Step 4: Review */}
            <div className={cn(
              "bg-[#9a7fb5] p-6 rounded-lg row-span-2 transition-all duration-300",
              currentStep === 4 ? "ring-2 ring-black shadow-lg" : "opacity-80"
            )}>
              <h2 className="text-2xl font-semibold mb-4">4. Revisá tu turno</h2>
              {currentStep >= 4 && (
                <div className="space-y-4 text-white">
                  <p><strong>Nombre:</strong> {form.getValues("patientName")}</p>
                  <p><strong>Email:</strong> {form.getValues("email")}</p>
                  <p><strong>Teléfono:</strong> {form.getValues("phone")}</p>
                  <p><strong>Fecha y Hora:</strong> {form.getValues("appointmentTime") &&
                    format(form.getValues("appointmentTime"), "PPpp", {
                      locale: es,
                    })}
                  </p>
                  <p><strong>Tipo de Servicio:</strong> {form.getValues("serviceType")}</p>
                  <p><strong>Obra Social:</strong> {form.getValues("obraSocial")}</p>
                  {form.getValues("notes") && (
                    <p><strong>Notas:</strong> {form.getValues("notes")}</p>
                  )}
                </div>
              )}
            </div>

            {/* Step 5: Confirmation */}
            <div className={cn(
              "bg-[#f4c2c2] p-6 rounded-lg col-span-3 transition-all duration-300",
              currentStep === 5 ? "ring-2 ring-black shadow-lg" : "opacity-80"
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold mb-4">5. Confirmación</h2>
                  {currentStep === 5 && (
                    <p className="text-lg">¡Su turno está listo para ser confirmado!</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="min-w-[120px]"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending
                    ? "Reservando..."
                    : currentStep === 5
                      ? "Confirmar Turno"
                      : "Continuar"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}