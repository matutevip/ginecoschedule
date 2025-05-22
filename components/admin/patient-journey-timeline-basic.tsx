import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Pencil, Plus, X } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

// Define types based on the backend models
interface PatientMilestone {
  id: number;
  patientId: number;
  title: string;
  description: string | null;
  date: string;
  type: string;
  status: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// Form schema
const milestoneSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().optional(),
  date: z.date({
    required_error: "La fecha es requerida",
    invalid_type_error: "Fecha inválida",
  }),
  type: z.enum(["consulta", "procedimiento", "examen", "seguimiento", "medicacion"], {
    required_error: "El tipo es requerido",
  }),
  status: z.enum(["programado", "completado", "cancelado"], {
    required_error: "El estado es requerido",
  }).default("completado"),
  order: z.number().default(0),
});

type MilestoneFormValues = z.infer<typeof milestoneSchema>;

// Component props
interface PatientJourneyTimelineProps {
  patientId: number;
}

export function PatientJourneyTimeline({ patientId }: PatientJourneyTimelineProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<PatientMilestone | null>(null);
  const { toast } = useToast();

  // Query to fetch patient milestones
  const { data: milestones = [], isLoading } = useQuery({
    queryKey: ['/api/admin/patients', patientId, 'milestones'],
    queryFn: async () => {
      const res = await fetch(`/api/admin/patients/${patientId}/milestones`, {
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error("Error al cargar los hitos del paciente");
      }
      return res.json() as Promise<PatientMilestone[]>;
    },
    enabled: !!patientId,
  });

  // Form for creating/editing milestones
  const form = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: {
      title: "",
      description: "",
      date: new Date(),
      type: "consulta",
      status: "completado",
      order: 0,
    },
  });

  // Mutation for creating new milestone
  const createMilestoneMutation = useMutation({
    mutationFn: async (data: MilestoneFormValues) => {
      const res = await apiRequest(
        "POST",
        `/api/admin/patients/${patientId}/milestones`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/patients', patientId, 'milestones'] });
      toast({
        title: "Hito creado",
        description: "El hito ha sido creado exitosamente",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el hito",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating a milestone
  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: MilestoneFormValues }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/admin/milestones/${id}`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/patients', patientId, 'milestones'] });
      toast({
        title: "Hito actualizado",
        description: "El hito ha sido actualizado exitosamente",
      });
      setIsDialogOpen(false);
      setSelectedMilestone(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el hito",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting a milestone
  const deleteMilestoneMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(
        "DELETE",
        `/api/admin/milestones/${id}`
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/patients', patientId, 'milestones'] });
      toast({
        title: "Hito eliminado",
        description: "El hito ha sido eliminado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el hito",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: MilestoneFormValues) => {
    if (selectedMilestone) {
      updateMilestoneMutation.mutate({
        id: selectedMilestone.id,
        data,
      });
    } else {
      createMilestoneMutation.mutate(data);
    }
  };

  // Open dialog for editing a milestone
  const handleEdit = (milestone: PatientMilestone) => {
    setSelectedMilestone(milestone);
    form.reset({
      title: milestone.title,
      description: milestone.description || "",
      date: new Date(milestone.date),
      type: milestone.type as any,
      status: milestone.status as any,
      order: milestone.order,
    });
    setIsDialogOpen(true);
  };

  // Open dialog for creating a new milestone
  const handleAddNew = () => {
    setSelectedMilestone(null);
    form.reset({
      title: "",
      description: "",
      date: new Date(),
      type: "consulta",
      status: "completado",
      order: milestones.length || 0,
    });
    setIsDialogOpen(true);
  };

  // Helper function to get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completado":
        return "success";
      case "programado":
        return "secondary";
      case "cancelado":
        return "destructive";
      default:
        return "default";
    }
  };

  // Helper function to get type icon/color
  const getTypeInfo = (type: string) => {
    switch (type) {
      case "consulta":
        return { color: "bg-blue-100 text-blue-700", label: "Consulta" };
      case "procedimiento":
        return { color: "bg-purple-100 text-purple-700", label: "Procedimiento" };
      case "examen":
        return { color: "bg-amber-100 text-amber-700", label: "Examen" };
      case "seguimiento":
        return { color: "bg-emerald-100 text-emerald-700", label: "Seguimiento" };
      case "medicacion":
        return { color: "bg-red-100 text-red-700", label: "Medicación" };
      default:
        return { color: "bg-gray-100 text-gray-700", label: type };
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-6">Cargando línea de tiempo...</div>;
  }

  const sortedMilestones = [...milestones].sort((a: PatientMilestone, b: PatientMilestone) => {
    // First by date
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    const dateDiff = dateB.getTime() - dateA.getTime();
    
    // If same date, sort by order
    if (dateDiff === 0) {
      return a.order - b.order;
    }
    
    return dateDiff;
  });

  return (
    <div className="space-y-4">
      <motion.div 
        className="flex justify-between items-center mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h3 className="text-lg font-medium">Línea de Tiempo del Paciente</h3>
        <Button onClick={handleAddNew} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Hito
        </Button>
      </motion.div>

      {!sortedMilestones.length ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center py-8 text-muted-foreground"
        >
          No hay hitos registrados para este paciente. Haz clic en "Agregar Hito" para crear el primero.
        </motion.div>
      ) : (
        <div className="space-y-4 relative border-l-2 border-gray-200 pl-6 ml-4">
          <AnimatePresence>
            {sortedMilestones.map((milestone: PatientMilestone, index) => (
              <motion.div 
                key={milestone.id} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ 
                  duration: 0.5, 
                  delay: index * 0.1
                }}
                className="relative"
              >
                {/* Circle marker on timeline */}
                <div className="absolute w-4 h-4 bg-primary rounded-full -left-8 top-1/3 transform -translate-y-1/2"></div>
                
                <div className="bg-card rounded-lg p-4 shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{milestone.title}</h4>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(milestone.date), "d 'de' MMMM 'de' yyyy", { locale: es })}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(milestone)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          if (confirm("¿Estás seguro de eliminar este hito?")) {
                            deleteMilestoneMutation.mutate(milestone.id);
                          }
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-2">
                    <div className={`px-2 py-1 text-xs rounded-full ${getTypeInfo(milestone.type).color}`}>
                      {getTypeInfo(milestone.type).label}
                    </div>
                    <Badge variant={getStatusColor(milestone.status) as any}>
                      {milestone.status === "completado" ? "Completado" : 
                      milestone.status === "programado" ? "Programado" : "Cancelado"}
                    </Badge>
                  </div>

                  {milestone.description && (
                    <p className="text-sm mt-2">{milestone.description}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Dialog for adding/editing milestones */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedMilestone ? "Editar Hito" : "Agregar Hito"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="consulta">Consulta</SelectItem>
                          <SelectItem value="procedimiento">Procedimiento</SelectItem>
                          <SelectItem value="examen">Examen</SelectItem>
                          <SelectItem value="seguimiento">Seguimiento</SelectItem>
                          <SelectItem value="medicacion">Medicación</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="completado">Completado</SelectItem>
                          <SelectItem value="programado">Programado</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={
                              "w-full pl-3 text-left font-normal"
                            }
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Seleccionar fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMilestoneMutation.isPending || updateMilestoneMutation.isPending}
                >
                  {createMilestoneMutation.isPending || updateMilestoneMutation.isPending 
                    ? "Guardando..." 
                    : selectedMilestone ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}