// Sin necesidad de declaración global para este caso

import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  DndContext, 
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { Switch } from "@/components/ui/switch";
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { TimePicker } from "@/components/ui/time-picker";
import {
  type Appointment,
  type ScheduleConfig,
  insertAppointmentSchema,
} from "@shared/schema";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isWithinInterval,
  isSameDay,
  isSameMonth,
  addWeeks,
  isAfter,
  isBefore,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  startOfDay,
  endOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Loader2,
  LogOut,
  Search,
  Trash2,
  Trash,
  Filter,
  FilterX,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Settings,
  ArrowUpDown,
  FileText,
  ArrowLeft,
  Clock,
  User,
  StickyNote,
  Bell,
  Edit,
  Stethoscope,
  CalendarClock,
  Building2,
  Plus,
  Check,
  CheckCircle,
  Laptop,
  MoreVertical,
  X,
  ListFilter,
  RefreshCw,
  Timer,
  XCircle,
  Calendar as CalendarIcon2
} from "lucide-react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { AppointmentsCarousel } from "../components/admin/appointments-carousel";
import { PatientMessageConfig } from "../components/admin/patient-message-config";
import { GoogleCalendarStatus } from "../components/admin/google-calendar-status";
import { StatisticsDashboard } from "../components/admin/statistics-dashboard";
import { StatisticsPreview } from "../components/admin/statistics-preview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ClinicalHistory } from "../components/admin/clinical-history";
import { AccountSettings } from "../components/admin/account-settings";
import { DraggableAppointment, isFortyMinService } from "../components/admin/draggable-appointment";
import { CalendarAppointment } from "../components/admin/calendar-appointment";
import { DroppableTimeSlot } from "../components/admin/droppable-time-slot";
import { NewQuickAppointmentForm } from "../components/admin/new-quick-appointment-form";

interface InsertAppointment {
  patientName: string;
  email: string;
  phone: string;
  serviceType: string;
  obraSocial: string;
  isFirstTime: boolean;
  notes: string;
  appointmentTime: Date;
  patientId?: number;
}

interface PatientMessage {
  id: number;
  title: string;
  content: string;
  displayDuration: number;
  daysToShow: number;
}

const sortOptions = [
  { value: "date-desc", label: "Fecha (más cercana)" },
  { value: "date-asc", label: "Fecha (más lejana)" },
  { value: "name-asc", label: "Nombre (A-Z)" },
  { value: "name-desc", label: "Nombre (Z-A)" },
];

export default function Admin() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Inicializar la semana seleccionada para mostrar el miércoles más cercano
  const findClosestWednesday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = domingo, 3 = miércoles
    let daysToAdd;
    
    if (dayOfWeek < 3) {
      // Si estamos antes del miércoles, vamos al próximo miércoles
      daysToAdd = 3 - dayOfWeek;
    } else if (dayOfWeek > 3) {
      // Si estamos después del miércoles, vamos al próximo miércoles
      daysToAdd = 10 - dayOfWeek; // 7 días + (3 - dayOfWeek)
    } else {
      // Si ya es miércoles, usamos hoy
      daysToAdd = 0;
    }
    
    const closestWednesday = new Date(today);
    closestWednesday.setDate(today.getDate() + daysToAdd);
    return closestWednesday;
  };

  // Cargar todas las citas
  const {
    data: appointments = [],
    isLoading: appointmentsLoading,
    refetch: refetchAppointments,
  } = useQuery({
    queryKey: ["/api/admin/appointments"],
    select: (data: Appointment[]) => {
      // Convertir las fechas de string a Date
      return data.map((apt) => ({
        ...apt,
        appointmentTime: new Date(apt.appointmentTime),
      }));
    },
  });

  // Cargar la configuración del horario
  const {
    data: scheduleConfig,
    isLoading: scheduleLoading,
    refetch: refetchSchedule,
  } = useQuery({
    queryKey: ["/api/admin/schedule-config"],
  });

  // Refetch config when blocking/unblocking days
  const {
    data: blockedDays = [],
    isLoading: blockedDaysLoading,
    refetch: refetchBlockedDays
  } = useQuery({
    queryKey: ["/api/admin/blocked-days"]
  });
  
  // Estados para el manejo de días eventuales con horarios específicos
  const [showOccasionalDayTimeDialog, setShowOccasionalDayTimeDialog] = useState(false);
  const [newOccasionalDay, setNewOccasionalDay] = useState<string | null>(null);
  const [occasionalDayStartTime, setOccasionalDayStartTime] = useState<string>("09:00");
  const [occasionalDayEndTime, setOccasionalDayEndTime] = useState<string>("12:00");

  // Cargar datos de estadísticas para el mes actual
  const {
    data: statistics,
    isLoading: statisticsLoading,
    refetch: refetchStatistics,
  } = useQuery({
    queryKey: ["/api/admin/statistics"],
    queryFn: async () => {
      const today = new Date();
      const month = today.getMonth() + 1; // Mes actual (1-12)
      const year = today.getFullYear();
      
      return apiRequest(`/api/admin/statistics?month=${month}&year=${year}`);
    }
  });

  // Estado para manejar la vista actual
  const [viewMode, setViewMode] = useState<"calendar" | "list" | "week">("calendar");
  const [selectedWeek, setSelectedWeek] = useState<Date>(findClosestWednesday());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  
  // Estados para filtros y búsqueda
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [obraSocialFilter, setObraSocialFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  
  // Estados para ordenamiento y paginación
  const [sortOption, setSortOption] = useState<string>("date-desc");
  const [appointmentsPage, setAppointmentsPage] = useState<number>(0);
  const appointmentsPerPage = 10;
  
  // Estados para selección y edición de citas
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<{ hour: number, minute: number }[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{date: Date, time: string, hour: number, minute: number, fullDateTime: Date} | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [inlineEditId, setInlineEditId] = useState<number | null>(null);
  const [editingRowData, setEditingRowData] = useState<any | null>(null);
  const [blockDayDialogOpen, setBlockDayDialogOpen] = useState<boolean>(false);
  const [blockingDate, setBlockingDate] = useState<Date | null>(null);
  const [blockReason, setBlockReason] = useState<string>("");
  const [quickFormSlot, setQuickFormSlot] = useState<{timeStr: string, date: Date, appointment?: Appointment} | null>(null);
  const [dialogAppointment, setDialogAppointment] = useState<Appointment | null>(null);
  
  // Referencias para evitar comportamientos no deseados
  const selectedSlotRef = useRef<{date: Date, time: string, hour: number, minute: number} | null>(null);
  const formInitializedRef = useRef<boolean>(false);
  
  // Estados para modales
  const [showScheduleSettings, setShowScheduleSettings] = useState<boolean>(false);
  const [showPatientMessageModal, setShowPatientMessageModal] = useState<boolean>(false);
  const [showForm, setShowForm] = useState<boolean>(false);
  
  // Estados para manejar días eventuales con horarios específicos
  const [showOccasionalDayTimeDialog, setShowOccasionalDayTimeDialog] = useState<boolean>(false);
  const [newOccasionalDay, setNewOccasionalDay] = useState<string | null>(null);
  const [occasionalDayStartTime, setOccasionalDayStartTime] = useState<string>("09:00");
  const [occasionalDayEndTime, setOccasionalDayEndTime] = useState<string>("12:00");
  
  // Estados para confirmaciones
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<number | null>(null);
  const [noShowConfirmId, setNoShowConfirmId] = useState<number | null>(null);
  
  // Cargar datos específicos para pacientes
  const {
    data: patients = [],
    isLoading: patientsLoading,
  } = useQuery({
    queryKey: ["/api/admin/patients"],
  });

  // Formulario para editar configuración de horario
  const scheduleForm = useForm({
    defaultValues: {
      startTime: scheduleConfig?.startTime || "09:00",
      endTime: scheduleConfig?.endTime || "18:00",
    },
  });

  // Actualizar valores del formulario cuando cambia scheduleConfig
  useEffect(() => {
    if (scheduleConfig) {
      scheduleForm.reset({
        startTime: scheduleConfig.startTime || "09:00",
        endTime: scheduleConfig.endTime || "18:00",
      });
    }
  }, [scheduleConfig, scheduleForm]);

  // Actualizar reloj interno cada minuto
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const [editedConfig, setEditedConfig] = useState<Partial<ScheduleConfig> | null>(null);

  // Configuración del formulario para citas
  const form = useForm<InsertAppointment>({
    resolver: zodResolver(insertAppointmentSchema.extend({
      patientId: insertAppointmentSchema.shape.patientId.optional(),
    })),
    defaultValues: {
      patientName: "",
      email: "",
      phone: "",
      serviceType: "Consulta Ginecológica",
      obraSocial: "Particular",
      isFirstTime: false,
      notes: "",
      appointmentTime: new Date(),
    },
  });

  // Sensores para DnD
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // Mutación para crear citas
  const createMutation = useMutation({
    mutationFn: async (data: InsertAppointment) => {
      return apiRequest("/api/admin/appointments", {
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Cita creada",
        description: "La cita ha sido creada correctamente",
      });
      
      // Resetear formulario
      form.reset();
      setShowForm(false);
      
      // Actualizar datos
      refetchAppointments();
      refetchStatistics();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutación para editar citas
  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<InsertAppointment> }) => {
      return apiRequest(`/api/admin/appointments/${id}`, {
        method: "PATCH",
        data,
      });
    },
    onSuccess: (updatedAppointment: Appointment) => {
      toast({
        title: "Cita actualizada",
        description: "La cita ha sido actualizada correctamente",
      });
      
      // Cerrar formulario y actualizar datos
      setEditingAppointment(null);
      refetchAppointments();
      refetchStatistics();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutación para eliminar citas
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/appointments/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Cita eliminada",
        description: "La cita ha sido eliminada correctamente",
      });
      
      // Actualizar datos
      refetchAppointments();
      refetchStatistics();
      
      // Cerrar modal de confirmación
      setDeleteConfirmId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setDeleteConfirmId(null);
    },
  });

  // Mutación para marcar como "asistió"
  const attendedMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/appointments/${id}/status`, {
        method: "PATCH",
        data: { status: "attended" },
      });
    },
    onSuccess: () => {
      toast({
        title: "Estado actualizado",
        description: "La cita ha sido marcada como 'Asistió'",
      });
      
      // Actualizar datos
      refetchAppointments();
      refetchStatistics();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutación para marcar como "no asistió"
  const noShowMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/appointments/${id}/status`, {
        method: "PATCH",
        data: { status: "no_show" },
      });
    },
    onSuccess: () => {
      toast({
        title: "Estado actualizado",
        description: "La cita ha sido marcada como 'No asistió'",
      });
      
      // Actualizar datos
      refetchAppointments();
      refetchStatistics();
      
      // Cerrar modal de confirmación
      setNoShowConfirmId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setNoShowConfirmId(null);
    },
  });

  // Mutación para cancelar citas
  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/appointments/${id}/status`, {
        method: "PATCH",
        data: { status: "cancelled_by_professional" },
      });
    },
    onSuccess: () => {
      toast({
        title: "Cita cancelada",
        description: "La cita ha sido cancelada correctamente",
      });
      
      // Actualizar datos
      refetchAppointments();
      refetchStatistics();
      
      // Cerrar modal de confirmación
      setCancelConfirmId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setCancelConfirmId(null);
    },
  });

  // Mutación para actualizar la configuración del horario
  const updateScheduleMutation = useMutation({
    mutationFn: async (data: Partial<ScheduleConfig>) => {
      return apiRequest("/api/admin/schedule-config", {
        method: "PATCH",
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Configuración actualizada",
        description: "La configuración del horario ha sido actualizada correctamente",
      });
      
      // Actualizar datos
      refetchSchedule();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
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
      refetchBlockedDays();
      
      // Cerrar modal y limpiar datos
      setBlockDayDialogOpen(false);
      setBlockingDate(null);
      setBlockReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setBlockDayDialogOpen(false);
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
      refetchBlockedDays();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutación para rápida creación de citas
  const quickCreateMutation = useMutation({
    mutationFn: async (data: InsertAppointment) => {
      return apiRequest("/api/admin/appointments", {
        method: "POST",
        data,
      });
    },
    onSuccess: (newAppointment: Appointment) => {
      toast({
        title: "Cita creada",
        description: "La cita ha sido creada correctamente",
      });
      
      // Actualizar datos
      refetchAppointments();
      refetchStatistics();
      
      // Cerrar formulario
      setQuickFormSlot(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Definir tipos de servicios
  const serviceTypes = [
    "Consulta Ginecológica",
    "Control de Embarazo",
    "Ecografía",
    "Colocación de DIU",
    "Terapia de Ginecología Regenerativa"
  ];

  // Definir prestadores de servicios de salud
  const healthInsuranceProviders = [
    "Particular",
    "Swiss Medical",
    "OSDE",
    "Medifé",
    "Galeno",
    "Sancor Salud",
    "Omint",
    "Federada Salud",
    "IOMA",
    "PAMI",
    "Otro"
  ];

  // Event Handlers para confirmaciones
  useEffect(() => {
    // Handler para confirmar cancelación
    const handleCancelConfirm = (e: CustomEvent) => {
      const id = e.detail.id;
      cancelMutation.mutate(id);
    };
    
    // Handler para confirmar "no asistió"
    const handleNoShowConfirm = (e: CustomEvent) => {
      const id = e.detail.id;
      noShowMutation.mutate(id);
    };
    
    // Agregar event listeners
    document.addEventListener("confirmCancel", handleCancelConfirm as EventListener);
    document.addEventListener("confirmNoShow", handleNoShowConfirm as EventListener);
    
    // Limpiar event listeners
    return () => {
      document.removeEventListener("confirmCancel", handleCancelConfirm as EventListener);
      document.removeEventListener("confirmNoShow", handleNoShowConfirm as EventListener);
    };
  }, [cancelMutation, noShowMutation]);

  // Handler para enviar el formulario
  const onSubmit = async (data: InsertAppointment) => {
    // Asegurarse de que hay un slot seleccionado
    if (!selectedSlot) {
      toast({
        title: "Error",
        description: "Debe seleccionar un horario para la cita",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Construir fecha y hora de la cita
      let appointmentDateTime: Date;
      
      // Si estamos editando, usar la fecha de selectedSlot.fullDateTime
      if (editingAppointment) {
        appointmentDateTime = selectedSlot.fullDateTime;
      } else {
        // Si estamos creando, construir desde selectedSlot
        const { date, hour, minute } = selectedSlot;
        appointmentDateTime = new Date(date);
        appointmentDateTime.setHours(hour, minute, 0, 0);
      }
      
      // Asignar fecha al objeto de datos
      data.appointmentTime = appointmentDateTime;
      
      console.log("Enviando datos:", data);
      
      // Si estamos editando, usar mutation de edición
      if (editingAppointment) {
        await editMutation.mutateAsync({ 
          id: editingAppointment.id, 
          data: {
            ...data,
            // Para asegurar que los campos opcionales se guarden correctamente
            notes: data.notes || ""
          }
        });
        
        setEditingAppointment(null);
      } else {
        // Si estamos creando, usar mutation de creación
        await createMutation.mutateAsync({
          ...data,
          // Para asegurar que los campos opcionales se guarden correctamente
          notes: data.notes || ""
        });
      }
      
      // Resetear formulario y estado
      form.reset();
      setShowForm(false);
      setSelectedSlot(null);
      selectedSlotRef.current = null;
      
    } catch (error) {
      console.error("Error al procesar el turno:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar el turno",
        variant: "destructive"
      });
    }
  };

  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });
  const allDaysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const daysInWeek = allDaysInWeek.filter((day) => {
    // Verificar primero si es un día de trabajo ocasional
    const dateStr = format(day, "yyyy-MM-dd");
    const isOccasionalWorkDay = scheduleConfig?.occasionalWorkDays?.includes(dateStr) || false;
    
    if (isOccasionalWorkDay) {
      console.log(`Día ${format(day, "yyyy-MM-dd")} es día de trabajo ocasional en vista semanal`);
      return true;
    }
    
    // Si no es día ocasional, verificar si es un día de trabajo regular
    // Normalizar el nombre del día como se hace en el backend
    const dayName = format(day, "EEEE", { locale: es })
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    // Filtrar solo días laborables de scheduleConfig
    return scheduleConfig?.workDays.includes(dayName) || false;
  });

  const goToPreviousWeek = () => {
    setSelectedWeek(addWeeks(selectedWeek, -1));
  };

  const goToNextWeek = () => {
    setSelectedWeek(addWeeks(selectedWeek, 1));
  };

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter((apt) => 
      isSameDay(new Date(apt.appointmentTime), day) && 
      apt.status !== 'cancelled_by_professional' &&
      apt.status !== 'cancelled_by_patient'
    );
  };

  // Get time slots based on schedule configuration
  const timeSlots = scheduleConfig ? (() => {
    const [startHour, startMinute = 0] = scheduleConfig.startTime.split(":").map(Number);
    const [endHour, endMinute = 0] = scheduleConfig.endTime.split(":").map(Number);
    
    const slots = [];
    
    for (let hour = startHour; hour <= endHour; hour++) {
      // Si es la hora de inicio, empezamos desde el minuto configurado
      const startMin = hour === startHour ? startMinute : 0;
      
      // Si es la hora de fin, terminamos en el minuto configurado
      const endMin = hour === endHour ? endMinute : 60;
      
      for (let minute = startMin; minute < endMin; minute += 20) {
        slots.push({ 
          hour, 
          minute,
          timeStr: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        });
      }
    }
    
    return slots;
  })() : [];

  // Filtrar citas según la búsqueda y los filtros
  const filteredAppointments = appointments.filter((apt) => {
    // Aplicar filtro de búsqueda
    const matchesSearch = searchQuery === "" || 
      apt.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.phone.includes(searchQuery);
    
    // Aplicar filtro de obra social
    const matchesObraSocial = obraSocialFilter === "all" || apt.obraSocial === obraSocialFilter;
    
    // Aplicar filtro de fecha
    const matchesDateFilter = () => {
      if (!dateFilter.from && !dateFilter.to) return true;
      
      const appointmentDate = new Date(apt.appointmentTime);
      
      if (dateFilter.from && dateFilter.to) {
        return (
          isAfter(appointmentDate, startOfDay(dateFilter.from)) &&
          isBefore(appointmentDate, endOfDay(dateFilter.to))
        );
      }
      
      if (dateFilter.from) {
        return isAfter(appointmentDate, startOfDay(dateFilter.from));
      }
      
      if (dateFilter.to) {
        return isBefore(appointmentDate, endOfDay(dateFilter.to));
      }
      
      return true;
    };
    
    return matchesSearch && matchesObraSocial && matchesDateFilter();
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAppointments.length / appointmentsPerPage)
  );

  const getWorkingDaysInMonth = (date: Date) => {
    if (!scheduleConfig) return [];

    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const allDays = eachDayOfInterval({ start, end });

    // Log para depuración
    console.log("Configuración de días laborables:", scheduleConfig.workDays);
    console.log("Días ocasionales configurados:", scheduleConfig.occasionalWorkDays);
    
    // Obtener los días de la semana en español para cada día y filtrar
    const workingDays = allDays.filter((day) => {
      // Verificar si es un día de trabajo ocasional
      const dateStr = format(day, "yyyy-MM-dd");
      const isOccasionalWorkDay = scheduleConfig.occasionalWorkDays?.includes(dateStr) || false;
      
      if (isOccasionalWorkDay) {
        console.log(`Día ${format(day, "yyyy-MM-dd")} es día de trabajo ocasional`);
        return true;
      }
      
      // Si no es día ocasional, verificar si es un día de trabajo regular
      // Obtener el nombre del día normalizado como se hace en el backend
      const dayName = format(day, "EEEE", { locale: es }).toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      // Verificar si este día está en la lista de días laborables
      const isDayWorking = scheduleConfig.workDays.includes(dayName);
      // Log detallado para depuración
      console.log(`Comprobando: ${format(day, "yyyy-MM-dd")} (${dayName}), incluido: ${isDayWorking}, workDays: ${scheduleConfig.workDays}`);
      
      // Log para depuración: Verificar cada día y si es laborable
      if (isDayWorking) {
        console.log(`Día ${format(day, "yyyy-MM-dd")} (${dayName}) es laborable`);
      }
      
      return isDayWorking;
    });
    
    // Log para depuración: Total de días laborables encontrados
    console.log(`Total de días laborables en ${format(date, "MMMM yyyy", { locale: es })}: ${workingDays.length}`);
    
    // Si no hay días laborables y es el mes actual, agregar al menos el día de hoy si es laborable
    if (workingDays.length === 0 && isSameMonth(date, new Date())) {
      const today = new Date();
      
      // Verificar si hoy es un día de trabajo ocasional
      const todayStr = format(today, "yyyy-MM-dd");
      const isTodayOccasional = scheduleConfig.occasionalWorkDays?.includes(todayStr) || false;
      
      if (isTodayOccasional) {
        console.log(`Agregando día actual (${todayStr}) como día laborable ocasional`);
        return [today];
      }
      
      // Normalizar el nombre del día como se hace en el backend
      const todayName = format(today, "EEEE", { locale: es })
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      
      if (scheduleConfig.workDays.includes(todayName)) {
        console.log(`Agregando día actual (${format(today, "yyyy-MM-dd")}) como día laborable por defecto`);
        return [today];
      }
    }
    
    return workingDays;
  };

  // Log para verificar qué ocurre antes del ordenamiento
  console.log("Antes de ordenar y paginar - filteredAppointments:", filteredAppointments);
  
  // Verificación de datos antes de ordenar
  console.log("viewMode actual:", viewMode);
  console.log("Estado de los filtros:", {
    searchQuery,
    obraSocialFilter,
    dateFilter: {
      from: dateFilter.from?.toISOString() || 'no establecido',
      to: dateFilter.to?.toISOString() || 'no establecido'
    }
  });
  
  const sortedAppointments = [...filteredAppointments]
    .sort((a, b) => {
      switch (sortOption) {
        case "date-desc":
          // 'más reciente primero' - Ordenar por fecha/hora de forma descendente
          const timeA = new Date(a.appointmentTime).getTime();
          const timeB = new Date(b.appointmentTime).getTime();
          return timeB - timeA; // Más reciente primero
        case "date-asc":
          // 'más antigua primero' - Ordenar por fecha/hora de forma ascendente
          const dateA = new Date(a.appointmentTime).getTime();
          const dateB = new Date(b.appointmentTime).getTime();
          return dateA - dateB; // Más antigua primero
        case "name-asc":
          return a.patientName.localeCompare(b.patientName);
        case "name-desc":
          return b.patientName.localeCompare(a.patientName);
        default:
          return 0;
      }
    })
    .slice(
      appointmentsPage * appointmentsPerPage,
      (appointmentsPage + 1) * appointmentsPerPage
    );
    
  // Log después del ordenamiento y paginación
  console.log("Después de ordenar y paginar - sortedAppointments:", sortedAppointments);
    
  // Log para depurar el problema de las citas en modo Lista
  useEffect(() => {
    if (viewMode === "list") {
      console.log("Vista de Lista activada - Verificación completa:");
      console.log("Citas totales:", appointments.length);
      console.log("Citas filtradas:", filteredAppointments.length);
      console.log("Citas mostradas después de ordenar y paginar:", sortedAppointments.length);
      console.log("Detalles de las citas a mostrar:", sortedAppointments);
      console.log("Página actual:", appointmentsPage);
      console.log("Citas por página:", appointmentsPerPage);
    }
  }, [viewMode, appointments.length, filteredAppointments.length, sortedAppointments, appointmentsPage, appointmentsPerPage]);

  useEffect(() => {
    // Get all working days from the month regardless of availability
    const workingDays = getWorkingDaysInMonth(calendarMonth);

    // Set all working days as available dates without filtering by time slots
    setAvailableDates(workingDays);
    
    // Para propósitos de depuración
    console.log("Días laborables calculados:", workingDays.length);
    if (workingDays.length === 0 && scheduleConfig) {
      console.log("Días laborables configurados:", scheduleConfig.workDays);
      console.log("Mes actual:", format(calendarMonth, "MMMM yyyy", { locale: es }));
      
      // Si no hay días disponibles, forzar al menos el día actual si es laborable
      const today = new Date();
      // Normalizar el nombre del día como se hace en el backend
      const dayName = format(today, "EEEE", { locale: es })
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (scheduleConfig.workDays.includes(dayName)) {
        console.log("Agregando día actual como disponible:", format(today, "PPP", { locale: es }));
        setAvailableDates([today]);
      }
    }
  }, [calendarMonth, scheduleConfig]);

  // Get all available time slots for a specific date, including 30-minute intervals
  const getAvailableTimeSlots = (date: Date) => {
    // Usar nuestra función centralizada y convertir los resultados al formato esperado
    const availableTimeStrings = getAvailableTimeSlotsForDate(date, appointments, editingAppointment?.id);
    
    // Convertir strings de hora a objetos de slot
    const slots = availableTimeStrings.map(timeStr => {
      const [hoursStr, minutesStr] = timeStr.split(':');
      return {
        hour: parseInt(hoursStr, 10),
        minute: parseInt(minutesStr, 10)
      };
    });
    
    console.log(`Available slots for ${date.toDateString()}:`, slots.map(s => `${s.hour}:${s.minute}`));
    return slots;
  };

  // Este efecto se ejecuta cuando cambia la fecha seleccionada
  // pero solo debe calcular horarios disponibles, no seleccionar uno automáticamente
  useEffect(() => {
    if (selectedDate && selectedDate instanceof Date && !isNaN(selectedDate.getTime())) {
      const availableSlots = getAvailableTimeSlots(selectedDate);
      console.log("Available time slots for selected date:", availableSlots);
      
      // Ya no seleccionamos automáticamente ningún slot aquí para evitar ciclos
      // El usuario debe seleccionar explícitamente un horario
    }
  }, [selectedDate, scheduleConfig]);
  
  // Efecto separado para manejar la edición de citas 
  // que se ejecuta SOLO cuando cambia editingAppointment, no cuando cambia selectedDate
  useEffect(() => {
    if (editingAppointment) {
      // Este código se ejecuta solo cuando editingAppointment cambia, no en cada cambio de selectedDate
      console.log("Setting up appointment for editing");
      
      // No llamamos a handleSlotSelect aquí porque ya se establece 
      // el tiempo correctamente en el otro useEffect que maneja editingAppointment
    }
  }, [editingAppointment]);

  // Función utilitaria para construir una fecha con hora específica
  const buildAppointmentDate = (date: Date, timeStr: string): Date | null => {
    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeStr)) {
      console.log("Invalid time format:", timeStr);
      return null;
    }
    
    // Parse time string
    const [hoursStr, minutesStr] = timeStr.split(":");
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10) || 0;
    
    // Crear una nueva fecha para evitar mutaciones de objetos originales
    const newDate = new Date(date);
    // Normalizar siempre los segundos y milisegundos a cero
    newDate.setHours(hours, minutes, 0, 0);
    
    return newDate;
  };
  
  // Normalizar formato de hora a formato estándar con ceros iniciales
  const formatTimeString = (timeStr: string): string => {
    const [hoursStr, minutesStr] = timeStr.split(":");
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10) || 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };
  
  // Función para preparar datos de slot, sin efectos secundarios
  const prepareSlotData = (timeStr: string, dayParam?: Date): {
    slotData: SelectedSlot | null,
    formattedTime: string,
    dateTime: Date | null
  } => {
    console.log("Preparing slot data:", timeStr, "on day:", dayParam ? dayParam.toISOString() : 'undefined');
    
    // Normalizar formato de hora
    const formattedTimeStr = formatTimeString(timeStr);
    
    // Determinar la fecha base a usar
    const baseDate = dayParam ? new Date(dayParam) : 
                    (selectedDate ? new Date(selectedDate) : 
                     (selectedSlot?.date ? new Date(selectedSlot.date) : new Date()));
    
    // Construir la fecha completa
    const slotDateTime = buildAppointmentDate(baseDate, formattedTimeStr);
    
    if (!slotDateTime) {
      console.log("Failed to build appointment date");
      return { 
        slotData: null, 
        formattedTime: formattedTimeStr,
        dateTime: null 
      };
    }
    
    // Extraer horas y minutos para el objeto de retorno
    const [hoursStr, minutesStr] = formattedTimeStr.split(":");
    const hour = parseInt(hoursStr, 10);
    const minute = parseInt(minutesStr, 10) || 0;
    
    // Crear objeto de datos de slot
    const newSlotData: SelectedSlot = {
      date: new Date(baseDate),
      time: formattedTimeStr,
      hour,
      minute,
      fullDateTime: slotDateTime
    };
    
    return { 
      slotData: newSlotData, 
      formattedTime: formattedTimeStr,
      dateTime: slotDateTime
    };
  };
  
  // Función para actualizar el formulario con la fecha/hora seleccionada
  const updateFormDateTime = (dateTime: Date, delay = 0) => {
    if (dateTime) {
      console.log("Updating form dateTime:", dateTime.toISOString());
      
      // Esperar un tiempo para evitar ciclos de actualización
      setTimeout(() => {
        form.setValue("appointmentTime", dateTime);
      }, delay);
    }
  };
  
  // Función para resetear el formulario con un nuevo horario
  const resetFormWithTime = (dateTime: Date) => {
    if (editingAppointment) {
      // Si estamos editando, mantener los datos de la cita
      form.reset({
        ...editingAppointment,
        appointmentTime: dateTime
      });
    } else {
      // Si es una nueva cita, solo actualizar la hora
      form.setValue("appointmentTime", dateTime);
    }
  };
  
  // Función centralizada para manejar la selección de slots
  const handleSlotSelect = (slotStr: string, shouldOpenForm = false, day?: Date) => {
    console.log("handleSlotSelect llamado con:", { slotStr, shouldOpenForm, day: day?.toISOString() });
    console.log("Estado actual - selectedSlot:", selectedSlot);
    console.log("Estado actual - selectedDate:", selectedDate?.toISOString());
    
    // Preparar los datos del slot
    const { slotData, formattedTime, dateTime } = prepareSlotData(slotStr, day);
    
    if (!slotData || !dateTime) {
      console.log("No se pudo preparar los datos del slot");
      return;
    }
    
    // Actualizar la referencia para evitar ciclos
    selectedSlotRef.current = slotData;
    
    // Actualizar el estado
    setSelectedSlot(slotData);
    
    // Actualizar formulario solo si debemos abrirlo o si ya está abierto
    if (shouldOpenForm || showForm) {
      resetFormWithTime(dateTime);
      
      if (shouldOpenForm && !showForm) {
        setShowForm(true);
      }
    }
    
    console.log("Slot seleccionado:", slotData);
  };

  // Función centralizada para verificar disponibilidad de un horario específico
  // Esto maneja la lógica de conflictos para citas de 20 minutos y de 40 minutos
  const isSlotAvailable = (date: Date, timeStr: string, appointments: Appointment[], editingId?: number): boolean => {
    if (!timeStr || !date) return false;
    
    // Obtener la hora y minutos del string
    const [hours, minutes] = timeStr.split(":").map(Number);
    
    // Verificar disponibilidad en la fecha y hora específica
    return isTimeSlotAvailable(date, hours, minutes, appointments, editingId);
  };

  // Función para determinar si un horario específico está disponible
  const isTimeSlotAvailable = (day: Date, hour: number, minute: number, appointments: Appointment[], editingId?: number): boolean => {
    // Si está bloqueado por administrador, no está disponible
    const isBlocked = blockedDays.some(blockedDay => {
      const blockedDate = new Date(blockedDay.date);
      return isSameDay(blockedDate, day) && 
             blockedDay.blockedTimeSlots?.some(slot => {
               const [slotHour, slotMinute] = slot.split(":").map(Number);
               return slotHour === hour && slotMinute === minute;
             });
    });
    
    if (isBlocked) {
      return false;
    }
    
    // Filtrar citas solo para esta fecha específica
    const appointmentsForDay = appointments.filter(apt => 
      isSameDay(new Date(apt.appointmentTime), day) &&
      apt.status !== 'cancelled_by_professional' &&
      apt.status !== 'cancelled_by_patient'
    );
    
    // Si no hay citas, el horario está disponible
    if (appointmentsForDay.length === 0) {
      return true;
    }
    
    // Verificar si hay citas en este horario exacto
    const appointmentsForTime = getAppointmentsForDayAndTime(day, hour, minute);
    
    // Si hay citas en este horario y no estamos editando o la cita que editamos no es la que está en este horario,
    // entonces el horario no está disponible
    if (appointmentsForTime.length > 0) {
      // Si estamos editando, verificar si la cita que estamos editando es la única en este horario
      if (editingId) {
        return appointmentsForTime.every(apt => apt.id === editingId);
      }
      return false;
    }
    
    // Verificar servicios de 40 minutos que puedan ocupar slots subsiguientes
    const overlappingFortyMinAppts = getOverlappingFortyMinAppointments(day, hour, minute);
    
    if (overlappingFortyMinAppts.length > 0) {
      // Si estamos editando, verificar si la cita que estamos editando es la que ocupa este slot
      if (editingId) {
        return overlappingFortyMinAppts.every(apt => apt.id === editingId);
      }
      return false;
    }
    
    // Si este es un servicio de 40 minutos, verificar disponibilidad de los 2 slots siguientes
    // (Solo al seleccionar el primer slot, no al verificar disponibilidad de slots intermedios)
    const slotTimeInMinutes = hour * 60 + minute;
    
    // Verificar citas en los slots siguientes (20 minutos y 40 minutos después)
    const nextSlotAppointments = getAppointmentsForDayAndTime(day, 
      Math.floor((slotTimeInMinutes + 20) / 60), 
      (slotTimeInMinutes + 20) % 60
    );
    
    const secondNextSlotAppointments = getAppointmentsForDayAndTime(day, 
      Math.floor((slotTimeInMinutes + 40) / 60), 
      (slotTimeInMinutes + 40) % 60
    );
    
    // Si hay citas en alguno de los slots siguientes, y esas citas no son la que estamos editando,
    // entonces el horario no está disponible para un servicio de 40 minutos
    if (nextSlotAppointments.length > 0 || secondNextSlotAppointments.length > 0) {
      // Si estamos editando, verificar si es la misma cita
      if (editingId) {
        return nextSlotAppointments.every(apt => apt.id === editingId) && 
               secondNextSlotAppointments.every(apt => apt.id === editingId);
      }
      
      // Para slot inicial: 40min services necesitan 3 slots consecutivos
      if (isFortyMinService(editingAppointment?.serviceType || "") || 
          isFortyMinService(form.getValues().serviceType)) {
        return false;
      }
    }
    
    return true;
  };

  // Función para obtener todas las citas que comienzan en un día y hora específicos
  const getAppointmentsForDayAndTime = (day: Date, hour: number, minute: number) => {
    return appointments.filter(apt => {
      if (apt.status === 'cancelled_by_professional' || apt.status === 'cancelled_by_patient') return false;
      
      const aptDate = new Date(apt.appointmentTime);
      return isSameDay(aptDate, day) && 
             aptDate.getHours() === hour && 
             aptDate.getMinutes() === minute;
    });
  };

  // Función para obtener citas de 40 minutos que puedan solaparse con un horario específico
  const getOverlappingFortyMinAppointments = (day: Date, hour: number, minute: number) => {
    return appointments.filter(apt => {
      if (apt.status === 'cancelled_by_professional' || apt.status === 'cancelled_by_patient') return false;
      if (!isFortyMinService(apt.serviceType)) return false;
      
      const aptDate = new Date(apt.appointmentTime);
      if (!isSameDay(aptDate, day)) return false;
      
      const aptHour = aptDate.getHours();
      const aptMinute = aptDate.getMinutes();
      
      // Convertir todo a minutos para facilitar la comparación
      const aptTimeInMinutes = aptHour * 60 + aptMinute;
      const slotTimeInMinutes = hour * 60 + minute;
      
      // El horario actual está dentro del rango de la cita de 40 minutos
      return slotTimeInMinutes >= aptTimeInMinutes && slotTimeInMinutes < aptTimeInMinutes + 40;
    });
  };

  // Función centralizada para obtener todos los horarios disponibles para una fecha
  const getAvailableTimeSlotsForDate = (date: Date, appointments: Appointment[], editingId?: number): string[] => {
    if (!scheduleConfig || !timeSlots) return [];
    
    // Verificar que la fecha sea un día laborable o no esté bloqueada
    const isDayBlocked = blockedDays.some(blockedDay => {
      return isSameDay(new Date(blockedDay.date), date) && !blockedDay.blockedTimeSlots;
    });
    
    if (isDayBlocked) {
      console.log(`El día ${format(date, 'yyyy-MM-dd')} está completamente bloqueado`);
      return [];
    }
    
    // Filtrar los slots disponibles
    return timeSlots
      .filter(slot => {
        const timeStr = `${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`;
        
        // Comprobar si este slot específico está bloqueado
        const isTimeSlotBlocked = blockedDays.some(blockedDay => {
          return isSameDay(new Date(blockedDay.date), date) && 
                 blockedDay.blockedTimeSlots?.includes(timeStr);
        });
        
        if (isTimeSlotBlocked) {
          return false;
        }
        
        return isTimeSlotAvailable(date, slot.hour, slot.minute, appointments, editingId);
      })
      .map(slot => `${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`);
  };

  // Render de calendario semanal
  const renderWeekView = () => {
    if (!scheduleConfig || !timeSlots) {
      return <div className="p-8 text-center">Cargando configuración...</div>;
    }
    
    return (
      <div className="grid gap-4">
        <div className="flex items-center justify-between mb-4">
          <Button onClick={goToPreviousWeek} variant="outline" size="sm">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Semana anterior
          </Button>
          
          <div className="text-lg font-semibold">
            {format(weekStart, "MMMM d", { locale: es })} - {format(weekEnd, "MMMM d, yyyy", { locale: es })}
          </div>
          
          <Button onClick={goToNextWeek} variant="outline" size="sm">
            Semana siguiente
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        
        <div className="overflow-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {daysInWeek.map(day => {
              // Obtener citas para este día
              const dayAppointments = getAppointmentsForDay(day);
              
              return (
                <Card key={day.toISOString()} className="overflow-hidden">
                  <CardHeader className="bg-primary/5 py-3">
                    <CardTitle className="text-lg font-semibold flex justify-between items-center">
                      <span>
                        {format(day, "EEEE d", { locale: es })}
                      </span>
                      
                      <span className="text-sm font-normal">
                        {dayAppointments.length} {dayAppointments.length === 1 ? "cita" : "citas"}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="p-0">
                    {dayAppointments.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground">
                        No hay citas para este día
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {dayAppointments
                          .sort((a, b) => {
                            const timeA = new Date(a.appointmentTime).getTime();
                            const timeB = new Date(b.appointmentTime).getTime();
                            return timeA - timeB;
                          })
                          .map((appointment) => (
                            <div
                              key={appointment.id}
                              className="p-4 hover:bg-secondary/20 transition-colors cursor-pointer"
                              onClick={() => setDialogAppointment(appointment)}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">
                                    {appointment.patientName}
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {appointment.serviceType}
                                  </div>
                                  <div className="flex items-center gap-2 mt-2">
                                    {appointment.obraSocial && (
                                      <div className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-1 bg-secondary">
                                        <Building2 className="h-3 w-3" />
                                        {appointment.obraSocial}
                                      </div>
                                    )}
                                    {appointment.isFirstTime && (
                                      <div className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-1 bg-emerald-100 text-emerald-700">
                                        <Bell className="h-3 w-3" />
                                        Primera vez
                                      </div>
                                    )}
                                    {appointment.status === 'attended' && (
                                      <div className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-1 bg-blue-100 text-blue-700">
                                        <Check className="h-3 w-3" />
                                        Atendido
                                      </div>
                                    )}
                                    {appointment.status === 'no_show' && (
                                      <div className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-1 bg-red-100 text-red-700">
                                        <X className="h-3 w-3" />
                                        No asistió
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium">
                                    {format(new Date(appointment.appointmentTime), "HH:mm", { locale: es })}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {isFortyMinService(appointment.serviceType) ? "40 min" : "20 min"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Función para abrir el diálogo de configuración de horarios para días eventuales
  const handleOccasionalDayClick = (date: Date) => {
    // Solo permitimos agregar configurar horarios para días futuros
    if (isBefore(date, startOfDay(new Date()))) {
      toast({
        title: "Fecha inválida",
        description: "Solo puede configurar días eventuales en el futuro",
        variant: "destructive"
      });
      return;
    }
    
    // Formatear la fecha como ISO string
    const dateStr = format(date, "yyyy-MM-dd");
    
    // Verificar si ya existe en la lista de días eventuales
    const exists = scheduleConfig?.occasionalWorkDays?.includes(dateStr);
    
    // Si no existe, no permitimos configurar horarios
    if (!exists) {
      toast({
        title: "Día no configurado como eventual",
        description: "Este día no está en la lista de días eventuales",
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
        description: "No se puede configurar un día que está dentro de un período de vacaciones",
        variant: "destructive"
      });
      return;
    }
    
    // Obtener los horarios específicos para este día si existen
    const dayTimes = scheduleConfig?.occasionalWorkDayTimes?.[dateStr];
    
    // Establecer los horarios por defecto o los existentes
    setOccasionalDayStartTime(dayTimes?.startTime || scheduleConfig?.startTime.slice(0, 5) || "09:00");
    setOccasionalDayEndTime(dayTimes?.endTime || scheduleConfig?.endTime.slice(0, 5) || "12:00");
    
    // Establecer el día seleccionado y abrir el diálogo
    setNewOccasionalDay(dateStr);
    setShowOccasionalDayTimeDialog(true);
  };

  const disabledDates = useCallback((date: Date): boolean => {
    if (!scheduleConfig) return true;

    // Formatear la fecha para verificar si es un día ocasional
    const dateStr = format(date, "yyyy-MM-dd");
    const isOccasionalWorkDay = scheduleConfig.occasionalWorkDays?.includes(dateStr) || false;
    
    // Si es un día de trabajo ocasional, siempre está disponible (si no es pasado y no está en vacaciones)
    if (isOccasionalWorkDay) {
      // Comprobar si está en periodo de vacaciones
      const isVacation = scheduleConfig.vacationPeriods?.some((period) =>
        isWithinInterval(date, {
          start: new Date(period.start),
          end: new Date(period.end),
        })
      ) ?? false;

      // Comprobar si es anterior a hoy
      const isPast = isBefore(date, startOfDay(new Date()));
      
      // Log para diagnóstico
      console.log(`Fecha: ${dateStr} - Día ocasional: ${isOccasionalWorkDay}, es vacaciones: ${isVacation}, es pasado: ${isPast}`);
      
      return isVacation || isPast;
    }

    // Si no es día ocasional, aplicar las reglas normales
    // Normalizar el nombre del día como se hace en el backend
    const dayName = format(date, "EEEE", { locale: es })
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    
    // Comprobar si es día laboral usando la versión normalizada
    const isWorkDay = scheduleConfig.workDays.includes(dayName);
    
    // Comprobar si está en periodo de vacaciones
    const isVacation = scheduleConfig.vacationPeriods?.some((period) =>
      isWithinInterval(date, {
        start: new Date(period.start),
        end: new Date(period.end),
      })
    ) ?? false;

    // Comprobar si es anterior a hoy
    const isPast = isBefore(date, startOfDay(new Date()));
    
    // Log para diagnóstico
    console.log(`Fecha: ${format(date, 'yyyy-MM-dd')} (${dayName}), es día laboral: ${isWorkDay}, es vacaciones: ${isVacation}, es pasado: ${isPast}`);
    
    return !isWorkDay || isVacation || isPast;
  }, [scheduleConfig]);

  // Diálogo para configurar horarios específicos de días eventuales
  const OccasionalDayTimeDialog = () => (
    <AlertDialog open={showOccasionalDayTimeDialog} onOpenChange={setShowOccasionalDayTimeDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Configurar horario para día eventual</AlertDialogTitle>
          <AlertDialogDescription>
            Configure el horario específico para este día de atención eventual.
          </AlertDialogDescription>
          {newOccasionalDay && (
            <div className="mt-2 font-medium">
              {(() => {
                // Crear formato de fecha consistente
                const [year, month, day] = newOccasionalDay.split('-').map(num => parseInt(num, 10));
                // Crear fecha usando UTC para consistencia
                const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
                return `Fecha: ${format(date, "EEEE d 'de' MMMM yyyy", { locale: es })}`;
              })()}
            </div>
          )}
        </AlertDialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="occasional-start-time">Hora de inicio</Label>
              <Input 
                id="occasional-start-time" 
                type="time" 
                value={occasionalDayStartTime}
                onChange={(e) => setOccasionalDayStartTime(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="occasional-end-time">Hora de fin</Label>
              <Input 
                id="occasional-end-time" 
                type="time"
                value={occasionalDayEndTime}
                onChange={(e) => setOccasionalDayEndTime(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => {
            setNewOccasionalDay(null);
          }}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (!newOccasionalDay || !scheduleConfig) return;
              
              try {
                // Configurar los horarios específicos para este día
                const currentOccasionalDayTimes = scheduleConfig.occasionalWorkDayTimes || {};
                const newOccasionalDayTimes = {
                  ...currentOccasionalDayTimes,
                  [newOccasionalDay]: {
                    startTime: occasionalDayStartTime,
                    endTime: occasionalDayEndTime
                  }
                };
                
                console.log("📅 Configurando horario específico para día eventual:", {
                  day: newOccasionalDay,
                  startTime: occasionalDayStartTime,
                  endTime: occasionalDayEndTime
                });
                
                // Actualizar la configuración
                updateScheduleMutation.mutate({
                  occasionalWorkDayTimes: newOccasionalDayTimes
                }, {
                  onSuccess: () => {
                    console.log("✅ Horario específico configurado correctamente");
                    
                    // Formatear fecha para mensaje
                    const [year, month, day] = newOccasionalDay.split('-').map(num => parseInt(num, 10));
                    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
                    
                    toast({
                      title: "Horario configurado",
                      description: `Se configuró el horario para el día ${format(date, "EEEE d 'de' MMMM", { locale: es })}: ${occasionalDayStartTime} - ${occasionalDayEndTime}`,
                    });
                    
                    // Cerrar el diálogo y limpiar el estado
                    setShowOccasionalDayTimeDialog(false);
                    setNewOccasionalDay(null);
                  },
                  onError: (error) => {
                    console.error("Error al configurar horario específico:", error);
                    toast({
                      title: "Error al configurar horario",
                      description: "Ocurrió un error al intentar guardar el horario específico",
                      variant: "destructive"
                    });
                  }
                });
              } catch (error) {
                console.error("Error al procesar horario específico:", error);
                toast({
                  title: "Error al procesar datos",
                  description: "No se pudo procesar la configuración de horario específico",
                  variant: "destructive"
                });
              }
            }}
          >
            Guardar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

