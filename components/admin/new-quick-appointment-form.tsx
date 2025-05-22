import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { CalendarPlus } from "lucide-react";

const createAppointmentSchema = z.object({
  patientFirstName: z.string().min(1, "El nombre es requerido"),
  patientLastName: z.string().min(1, "El apellido es requerido"),
  patientPhone: z.string().min(1, "El teléfono es requerido"),
  patientEmail: z.string().email("Email inválido").or(z.string().length(0)),
  serviceType: z.string().min(1, "El tipo de servicio es requerido"),
  appointmentTime: z.string().min(1, "La hora de la cita es requerida"),
  notes: z.string().optional(),
});

type CreateAppointmentForm = z.infer<typeof createAppointmentSchema>;

interface NewQuickAppointmentFormProps {
  selectedDate?: Date;
  selectedTime?: string;
  onSuccess?: () => void;
}

export function NewQuickAppointmentForm({
  selectedDate = new Date(),
  selectedTime,
  onSuccess
}: NewQuickAppointmentFormProps) {
  const { toast } = useToast();
  const [serviceTypes] = useState([
    "Consulta General",
    "Consulta de Ginecología",
    "Consulta de Obstetricia",
    "Control Prenatal",
    "Ecografía",
    "Terapia de Ginecología Regenerativa",
    "Papanicolaou",
    "Colocación de DIU",
    "Control de Rutina",
    "Consulta Postoperatoria"
  ]);

  const form = useForm<CreateAppointmentForm>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: {
      patientFirstName: "",
      patientLastName: "",
      patientPhone: "",
      patientEmail: "",
      serviceType: "Consulta General",
      appointmentTime: selectedTime || "",
      notes: "",
    },
  });

  // Actualizar la hora de la cita cuando cambia la selección de hora
  if (selectedTime && form.getValues().appointmentTime !== selectedTime) {
    form.setValue("appointmentTime", selectedTime);
  }

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: CreateAppointmentForm) => {
      // Construir la fecha y hora completa de la cita
      const appointmentDateTime = new Date(selectedDate);
      const [hours, minutes] = data.appointmentTime.split(":").map(Number);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      const formattedDate = format(appointmentDateTime, "yyyy-MM-dd'T'HH:mm:ss");

      return apiClient("/api/admin/appointments", {
        method: "POST",
        data: {
          ...data,
          appointmentTime: formattedDate,
          status: "scheduled",
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Cita creada",
        description: "La cita ha sido creada exitosamente",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/appointments/upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/appointments/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/appointments/tomorrow'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/statistics'] });
      
      // Llamar al callback de éxito si existe
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la cita",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: CreateAppointmentForm) {
    createAppointmentMutation.mutate(data);
  }

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="bg-primary/5 p-3 rounded-lg mb-4">
            <h3 className="font-medium mb-1">Fecha seleccionada:</h3>
            <p className="text-muted-foreground">
              {format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es })}
              {selectedTime && ` a las ${selectedTime} hs`}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="patientFirstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del paciente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="patientLastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellido</FormLabel>
                  <FormControl>
                    <Input placeholder="Apellido del paciente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="patientPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="Teléfono del paciente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="patientEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Email del paciente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="serviceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de servicio</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un servicio" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {serviceTypes.map((service) => (
                      <SelectItem key={service} value={service}>
                        {service}
                      </SelectItem>
                    ))}
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
                <FormLabel>Notas (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Notas adicionales" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={createAppointmentMutation.isPending}
          >
            <CalendarPlus className="mr-2 h-4 w-4" />
            {createAppointmentMutation.isPending ? "Creando cita..." : "Crear cita rápida"}
          </Button>
        </form>
      </Form>
    </div>
  );
}