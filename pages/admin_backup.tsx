import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import {
  Loader2,
  LogOut,
  Search,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Settings,
  Calendar,
  ArrowUpDown,
  FileText,
  Clock,
  User,
  StickyNote,
  Bell,
  Edit,
  Stethoscope,
  Building2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { ClinicalHistory } from "../components/admin/clinical-history";

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
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [obraSocialFilter, setObraSocialFilter] = useState<string>("all");
  const [selectedAppointments, setSelectedAppointments] = useState<number[]>(
    [],
  );
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showScheduleSettings, setShowScheduleSettings] = useState(false);
  // Used to track appointment details when viewing or performing actions
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [showNewAppointment, setShowNewAppointment] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      patientName: "",
      email: "",
      phone: "",
      serviceType: "Consulta",
      obraSocial: "Particular",
      isFirstTime: false,
      notes: "",
      appointmentTime: new Date(),
    },
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Reset form when opening new appointment dialog
  useEffect(() => {
    if (showNewAppointment) {
      if (!selectedDate || (!selectedTime && viewMode !== "calendar")) {
        const newDate = viewMode === "calendar" && selectedDate ? selectedDate : new Date();
        let appointmentDateTime = new Date(newDate);

        if (selectedTime && viewMode === "calendar") {
          const [hoursPart, minutesPart] = selectedTime.split(":");
          const hours = parseInt(hoursPart, 10);
          const minutes = parseInt(minutesPart, 10);

          if (!isNaN(hours) && !isNaN(minutes)) {
            appointmentDateTime.setHours(hours, minutes, 0, 0);
          }
        }

        form.reset({
          patientName: "",
          email: "",
          phone: "",
          serviceType: "Consulta",
          obraSocial: "Particular",
          isFirstTime: false,
          notes: "",
          appointmentTime: appointmentDateTime,
        });

        form.setValue("appointmentTime", appointmentDateTime, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        });

        if (viewMode !== "calendar") {
          setSelectedDate(null);
          setSelectedTime(null);
        }
      }
    }
  }, [showNewAppointment, form, viewMode, selectedDate, selectedTime]);
  const [editedConfig, setEditedConfig] = useState<ScheduleConfig | undefined>(
    undefined,
  );
  const [upcomingAppointmentsPage, setUpcomingAppointmentsPage] = useState(0);
  const [appointmentsPage, setAppointmentsPage] = useState(0);
  const [vacationStart, setVacationStart] = useState<Date | undefined>(
    undefined,
  );
  const [vacationEnd, setVacationEnd] = useState<Date | undefined>(undefined);
  const [patientMessages, setPatientMessages] = useState<PatientMessage[]>([]);
  const [dateFilter, setDateFilter] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [sortOption, setSortOption] = useState<string>("date-desc");
  const [showClinicalHistory, setShowClinicalHistory] = useState<number | null>(
    null,
  );
  const [availableDates, setAvailableDates] = useState<Date[]>([]);

  const scheduleForm = useForm({
    defaultValues: {
      startTime: "",
      endTime: "",
      workDays: [],
      vacationPeriods: [],
    },
  });

  const { isLoading: checkingAuth, error: authError } = useQuery({
    queryKey: ["/api/admin/check"],
    retry: false,
  });

  useEffect(() => {
    if (authError) {
      navigate("/admin/login");
    }
  }, [authError, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (editingAppointment) {
      const appointmentTime = new Date(editingAppointment.appointmentTime);

      const formData: InsertAppointment = {
        patientName: editingAppointment.patientName,
        email: editingAppointment.email,
        phone: editingAppointment.phone,
        serviceType: editingAppointment.serviceType || "Consulta",
        obraSocial: editingAppointment.obraSocial || "Particular",
        isFirstTime: editingAppointment.isFirstTime || false,
        notes: editingAppointment.notes || "",
        appointmentTime: appointmentTime,
      };

      if (editingAppointment.patientId) {
        formData.patientId = editingAppointment.patientId;
      }

      // Set the selected date and time for the UI
      setSelectedDate(appointmentTime);

      // Make sure we use the correct time format with minutes if needed - use padStart for hours too
      const hours = appointmentTime.getHours();
      const minutes = appointmentTime.getMinutes();
      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes === 0 ? '00' : minutes.toString().padStart(2, '0')}`;
      setSelectedTime(formattedTime);

      console.log("Setting time for editing appointment:", formattedTime, "Date:", appointmentTime.toISOString());

      // Make sure this appointment time is considered available in the time slot selection
      // by updating availableDates to include this date
      if (availableDates.every(date => !isSameDay(date, appointmentTime))) {
        setAvailableDates(prev => [...prev, appointmentTime]);
      }

      // Reset form with the appointment data AFTER setting the UI elements
      setTimeout(() => {
        form.reset(formData);

        // Double-check that the value was set correctly after a short delay
        setTimeout(() => {
          const currentValue = form.getValues("appointmentTime");
          console.log("Form reset completed with appointment time:", currentValue);

          // If needed, force set it again
          if (currentValue && (new Date(currentValue).getHours() !== hours || 
                              new Date(currentValue).getMinutes() !== minutes)) {
            console.log("Time wasn't set correctly, forcing update");
            form.setValue("appointmentTime", appointmentTime, {
              shouldValidate: true,
              shouldDirty: true,
              shouldTouch: true,
            });
          }
        }, 50);
      }, 0);
    }
  }, [editingAppointment, form, availableDates]);

  const { data: scheduleConfig } =
    useQuery<ScheduleConfig>({
      queryKey: ["/api/admin/schedule-config"],
      enabled: !checkingAuth && !authError,
    });

  useEffect(() => {
    if (scheduleConfig && !editedConfig) {
      setEditedConfig(scheduleConfig);
    }
  }, [scheduleConfig]);

  const { data: appointmentsData, isLoading: loadingAppointments } = useQuery<Appointment[]>({
    queryKey: ["/api/admin/appointments"],
    enabled: !checkingAuth && !authError,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  const appointments = appointmentsData || [];

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertAppointment> }) => {
      const res = await apiRequest("PATCH", `/api/appointments/${id}`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Error al actualizar el turno");
      }
      return res.json();
    },
    onSuccess: (updatedAppointment: Appointment) => {
      // Update the cache with the edited appointment
      queryClient.setQueryData<Appointment[]>(["/api/admin/appointments"], (old) => {
        return old 
          ? old.map(apt => apt.id === updatedAppointment.id ? updatedAppointment : apt)
          : [updatedAppointment];
      });

      setEditingAppointment(null);
      toast({
        title: "Turno actualizado",
        description: "El turno ha sido actualizado exitosamente.",
      });

      // Reset form and selection states
      form.reset();
      setSelectedDate(null);
      setSelectedTime(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number | null) => {
      if (!id) return;
      const res = await apiRequest("DELETE", `/api/appointments/${id}`);
      if (!res.ok) {
        throw new Error("Error al eliminar el turno");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/appointments"] });
      toast({
        title: "Turno eliminado",
        description: "El turno ha sido eliminado exitosamente.",
      });
      setSelectedAppointments([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(
        ids.map((id) => apiRequest("DELETE", `/api/appointments/${id}`)),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/appointments"] });
      toast({
        title: "Turnos eliminados",
        description: `${selectedAppointments.length} turnos han sido eliminados exitosamente.`,
      });
      setSelectedAppointments([]);
      setShowBulkDeleteConfirm(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/logout");
      if (!res.ok) {
        throw new Error("Error al cerrar sesión");
      }
    },
    onSuccess: () => {
      toast({
        title: "Sesión cerrada",
        description: "Ha cerrado sesión exitosamente",
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reminderMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(
        "POST",
        `/api/admin/appointments/${id}/send-reminder`,
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Error al enviar el recordatorio");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Recordatorio enviado",
        description: "El recordatorio ha sido enviado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async (config: Partial<ScheduleConfig>) => {
      const finalConfig = {
        ...scheduleConfig,
        ...config,
        vacationPeriods:
          config.vacationPeriods?.map((period) => ({
            start: new Date(period.start).toISOString(),
            end: new Date(period.end).toISOString(),
          })) ||
          scheduleConfig?.vacationPeriods ||
          [],
      };

      const res = await apiRequest(
        "PATCH",
        "/api/admin/schedule-config",
        finalConfig,
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(
          error.message || "Error al actualizar la configuración",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/schedule-config"],
      });
      toast({
        title: "Configuración actualizada",
        description:
          "Los horarios y períodos de vacaciones han sido actualizados exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: InsertAppointment) => {
      console.log("Creating appointment with data:", data);
      const res = await apiRequest("POST", "/api/appointments", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Error al crear el turno");
      }
      return res.json();
    },
    onSuccess: (newAppointment: Appointment) => {
      // Update the cache with the new appointment
      queryClient.setQueryData<Appointment[]>(["/api/admin/appointments"], (old) => {
        return old ? [newAppointment, ...old] : [newAppointment];
      });

      setShowNewAppointment(false);
      toast({
        title: "Turno creado",
        description: "El turno ha sido creado exitosamente.",
      });

      // Reset form and selection states
      form.reset();
      setSelectedDate(null);
      setSelectedTime(null);
    },
    onError: (error: Error) => {
      console.error("Error creating appointment:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar el turno",
        variant: "destructive"
      });
    }
  });

  const saveMessageMutation = useMutation({
    mutationFn: async (message: Omit<PatientMessage, "id">) => {
      const res = await apiRequest(
        "POST",
        "/api/admin/patient-messages",
        message,
      );

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Error al procesar la respuesta del servidor");
      }

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Error al guardar el mensaje");
      }
      return res.json();
    },
    onSuccess: (newMessage) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/patient-messages"],
      });
      setPatientMessages((prevMessages) => [...prevMessages, newMessage]);
      toast({
        title: "Mensaje guardado",
        description: "El mensaje ha sido guardado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(
        "DELETE",
        `/api/admin/patient-messages/${id}`,
      );
      if (!res.ok) {
        throw new Error("Error al eliminar el mensaje");
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/patient-messages"],
      });
      setPatientMessages((prevMessages) =>
        prevMessages.filter((message) => message.id !== id),
      );
      toast({
        title: "Mensaje eliminado",
        description: "El mensaje ha sido eliminado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAppointments(appointments.map((app) => app.id));
    } else {
      setSelectedAppointments([]);
    }
  };

  const handleSelectAppointment = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedAppointments((prev) => [...prev, id]);
    } else {
      setSelectedAppointments((prev) => prev.filter((appId) => appId !== id));
    }
  };

  const onSubmit = async (data: InsertAppointment) => {
    try {
      console.log("Form submission data:", data);

      if (!data.appointmentTime) {
        toast({
          title: "Error",
          description: "Por favor seleccione una fecha y hora para el turno",
          variant: "destructive"
        });
        return;
      }

      // Create a new date object with the correct time
      const appointmentDateTime = new Date(data.appointmentTime);
      if (selectedTime) {
        const [hours, minutes] = selectedTime.split(":").map(Number);
        appointmentDateTime.setHours(hours, minutes, 0, 0);
        data.appointmentTime = appointmentDateTime;
      }

      console.log("Processing appointment with datetime:", appointmentDateTime.toISOString());

      // Validate the time slot is available
      const isValidTimeSlot = isTimeSlotAvailable(
        appointmentDateTime,
        appointmentDateTime.getHours(),
        appointmentDateTime.getMinutes(),
        appointments
      );

      if (!isValidTimeSlot) {
        toast({
          title: "Error",
          description: "El horario seleccionado no está disponible",
          variant: "destructive"
        });
        return;
      }

      if (editingAppointment) {
        console.log("Editing appointment:", editingAppointment.id, data);
        await editMutation.mutateAsync({ 
          id: editingAppointment.id, 
          data 
        });
      } else {
        console.log("Creating new appointment:", data);
        await createAppointmentMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error("Appointment submission error:", error);
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
    const dayName = format(day, "EEEE", { locale: es }).toLowerCase();
    // Filter only working days from scheduleConfig
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
      isSameDay(new Date(apt.appointmentTime), day),
    );
  };

  // Get time slots based on schedule configuration
  const timeSlots = scheduleConfig ? (() => {
    const [startHour, startMinute = 0] = scheduleConfig.startTime.split(":").map(Number);
    const [endHour, endMinute = 0] = scheduleConfig.endTime.split(":").map(Number);

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    const slots: { hour: number; minute: number }[] = [];
    for (let minutes = startTotalMinutes; minutes < endTotalMinutes; minutes += 30) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        slots.push({ hour, minute });
    }

    return slots;
  })() : Array.from({ length: 9 }, (_, i) => ({ hour: i + 9, minute: 0 })); // Default if no config

  const getAvailableTimeSlotsForDay = (day: Date) => {
    return timeSlots.filter((slot) => isTimeSlotAvailable(day, slot.hour, slot.minute, appointments));
  };

  useEffect(() => {
    if (selectedDate && selectedDate instanceof Date && !isNaN(selectedDate.getTime())) {
      const availableSlots = getAvailableTimeSlots(selectedDate);
      console.log("Available time slots for selected date:", availableSlots);

      // Set the full date and time in the form when date is selected
      if (availableSlots.length > 0) {
        const firstAvailableSlot = availableSlots[0];
        const formattedTime = `${firstAvailableSlot.hour}:${firstAvailableSlot.minute === 0 ? '00' : firstAvailableSlot.minute}`;
        handleSlotSelect(formattedTime);
      } else {
        // Clear the time selection if no slots are available
        setSelectedTime(null);
      }
    }
  }, [selectedDate, scheduleConfig]);


  const appointmentsPerPage = 5;
  const startOfNextWeek = addWeeks(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    1,
  );
  const endOfNextWeek = endOfWeek(startOfNextWeek, { weekStartsOn: 1 });

  const upcomingAppointments = appointments
    .filter((apt) => {
      const aptDate = new Date(apt.appointmentTime);
      return (
        isAfter(aptDate, new Date()) &&
        isWithinInterval(aptDate, {
          start: new Date(),
          end: endOfNextWeek,
        })
      );
    })
    .sort(
      (a, b) =>
        new Date(a.appointmentTime).getTime() -
        new Date(b.appointmentTime).getTime(),
    )
    .slice(
      upcomingAppointmentsPage * appointmentsPerPage,
      (upcomingAppointmentsPage + 1) * appointmentsPerPage,
    );

  const totalUpcomingAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.appointmentTime);
    return (
      isAfter(aptDate, new Date()) &&
      isWithinInterval(aptDate, {
        start: new Date(),
        end: endOfNextWeek,
      })
    );
  }).length;

  const totalPages = Math.max(
    1,
    Math.ceil(totalUpcomingAppointments / appointmentsPerPage),
  );

  const obraSocialOptions = [
    { value: "all", label: "Todas las obras sociales" },
    { value: "Particular", label: "Particular" },
    { value: "IOMA", label: "IOMA" },
  ];

  const filteredAppointments = appointments.filter((appointment) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      appointment.patientName.toLowerCase().includes(searchLower) ||
      appointment.email.toLowerCase().includes(searchLower);

    const matchesObraSocial =
      obraSocialFilter === "all" || appointment.obraSocial === obraSocialFilter;

    const appointmentDate = new Date(appointment.appointmentTime);
    const matchesDateRange =
      (!dateFilter.from ||
        isAfter(appointmentDate, startOfDay(dateFilter.from))) &&
      (!dateFilter.to || isBefore(appointmentDate, endOfDay(dateFilter.to)));

    return matchesSearch && matchesObraSocial && matchesDateRange;
  });

  const totalFilteredPages = Math.max(
    1,
    Math.ceil(filteredAppointments.length / appointmentsPerPage)
  );

  const getWorkingDaysInMonth = (date: Date) => {
    if (!scheduleConfig) return [];

    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const allDays = eachDayOfInterval({ start, end });

    return allDays.filter((day) => {
      const dayName = format(day, "EEEE", { locale: es }).toLowerCase();
      return scheduleConfig.workDays.includes(dayName);
    });
  };

  const sortedAppointments = [...filteredAppointments]
    .sort((a, b) => {
      switch (sortOption) {
        case "date-desc":
          // 'más reciente' - Sort by closest to current date (absolute difference)
          const now = new Date().getTime();
          const diffA = Math.abs(new Date(a.appointmentTime).getTime() - now);
          const diffB = Math.abs(new Date(b.appointmentTime).getTime() - now);
          return diffA - diffB; // Closest dates first
        case "date-asc":
          // 'más antigua' - Sort by furthest from current date (absolute difference)
          const nowTime = new Date().getTime();
          const distA = Math.abs(new Date(a.appointmentTime).getTime() - nowTime);
          const distB = Math.abs(new Date(b.appointmentTime).getTime() - nowTime);
          return distB - distA; // Furthest dates first
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

  useEffect(() => {
    // Get all working days from the month regardless of availability
    const workingDays = getWorkingDaysInMonth(calendarMonth);

    // Set all working days as available dates without filtering by time slots
    setAvailableDates(workingDays);
  }, [calendarMonth, scheduleConfig]);

  // Get all available time slots for a specific date, including 30-minute intervals
  const getAvailableTimeSlots = (date: Date) => {
    if (!scheduleConfig) return [];

    // Parse start and end times from schedule config
    const [startHour, startMinute = 0] = scheduleConfig.startTime.split(":").map(Number);
    const [endHour, endMinute = 0] = scheduleConfig.endTime.split(":").map(Number);

    // Convert to total minutes for easier calculation
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    // Generate time slots every 30 minutes
    const slots = [];
    for (let minutes = startTotalMinutes; minutes < endTotalMinutes; minutes += 30) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;

      // For edited appointments, consider its own slot as available
      const slotDate = new Date(date);
      slotDate.setHours(hour, minute, 0, 0);
      const slotTimeInMinutes = hour * 60 + minute;

      let isAvailable = !appointments.some(apt => {
        // Skip checking the appointment being edited
        if (editingAppointment && apt.id === editingAppointment.id) {
          return false;
        }

        const aptTime = new Date(apt.appointmentTime);

        // Check for exact time slot conflict
        const exactMatch = isSameDay(aptTime, slotDate) && 
               aptTime.getHours() === hour && 
               aptTime.getMinutes() === minute;

        // Check for adjacent conflicts with special services
        const isSpecialService = apt.serviceType === "Extracción & Colocación de DIU";

        // If it's a special service, only block slots before the appointment
        if (isSpecialService && isSameDay(aptTime, slotDate)) {
          // Calculate time in minutes for comparison
          const aptTimeInMinutes = aptTime.getHours() * 60 + aptTime.getMinutes();

          // Block only slots that are 30 minutes or less before the DIU service
          const isSlotBeforeDIU = (slotTimeInMinutes <= aptTimeInMinutes) && 
                                 (aptTimeInMinutes - slotTimeInMinutes <= 30);
          return exactMatch || isSlotBeforeDIU;
        }

        return exactMatch;
      });

      if (isAvailable) {
        slots.push({ hour, minute });
      }
    }

    console.log(`Available slots for ${date.toDateString()}:`, slots.map(s => `${s.hour}:${s.minute}`));
    return slots;
  };

  useEffect(() => {
    if (selectedDate && selectedDate instanceof Date && !isNaN(selectedDate.getTime())) {
      const availableSlots = getAvailableTimeSlots(selectedDate);
      console.log("Available time slots for selected date:", availableSlots);

      // Only set time if we're editing an appointment
      if (editingAppointment) {
        const appointmentTime = new Date(editingAppointment.appointmentTime);
        const formattedTime = format(appointmentTime, 'HH:mm');
        handleSlotSelect(formattedTime);
      }
      // Remove automatic selection of first available slot
      // Let the user explicitly select a time slot
    }
  }, [selectedDate, scheduleConfig]);

  const handleSlotSelect = (slotStr: string) => {
    console.log("Slot selected:", slotStr);
    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(slotStr)) {
      console.error("Invalid time format:", slotStr);
      return;
    }
    setSelectedTime(slotStr);

    if (selectedDate && slotStr) {
      // Parse the slot string
      const [hours, minutes] = slotStr.split(":").map(Number);

      // Create a new date object and set the time
      const appointmentDateTime = new Date(selectedDate);
      // Ensure we're working with local time
      const localHours = hours;
      const localMinutes = minutes || 0;
      appointmentDateTime.setHours(localHours, localMinutes, 0, 0);

      console.log("Setting appointment time:", appointmentDateTime.toISOString());

      // Update the form value with the selected time
      setTimeout(() => {
        form.setValue("appointmentTime", appointmentDateTime, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true
        });
      }, 0);
    }
  };

  // Time slot availability checker
  const isTimeSlotAvailable = (day: Date, hour: number, minute: number, appointments: Appointment[]): boolean => {
    if (!scheduleConfig) return false;

    // Create a date object for the specific slot
    const slotDate = new Date(day);
    slotDate.setHours(hour, minute, 0, 0);
    const slotTimeInMinutes = hour * 60 + minute;

    // Check if it's within working hours
    const [startHour, startMinute] = scheduleConfig.startTime.split(':').map(Number);
    const [endHour, endMinute] = scheduleConfig.endTime.split(':').map(Number);
    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;

    if (slotTimeInMinutes < startTimeInMinutes || slotTimeInMinutes >= endTimeInMinutes) {
      return false;
    }

    // Check if any appointment conflicts with this slot
    return !appointments.some((apt) => {
      // If we're editing this appointment, consider its slot as available  
      if (editingAppointment && apt.id === editingAppointment.id) {
        return false;
      }

      const aptTime = new Date(apt.appointmentTime);

      // Check for exact slot conflict
      const exactMatch = isSameDay(aptTime, slotDate) && 
             aptTime.getHours() === hour && 
             aptTime.getMinutes() === minute;

      // Check for adjacent conflicts with special services
      const isSpecialService = apt.serviceType === "Extracción & Colocación de DIU";

      // If it's a special service, only block slots before the appointment
      if (isSpecialService && isSameDay(aptTime, slotDate)) {
        // Calculate minutes for comparison
        const aptTimeInMinutes = aptTime.getHours() * 60 + aptTime.getMinutes();

        // Block only slots that are 30 minutes or less before the DIU service
        const isSlotBeforeDIU = (slotTimeInMinutes <= aptTimeInMinutes) && 
                               (aptTimeInMinutes - slotTimeInMinutes <= 30);
        return exactMatch || isSlotBeforeDIU;
      }

      return exactMatch;
    });
  };

  // Calendar rendering components
  const renderCalendarGrid = () => {
    if (!scheduleConfig) return null;

    return (
      <div className="grid grid-cols-[auto,1fr] gap-4">
        <div className="space-y-4">
          {timeSlots.map((slot) => (
            <div 
              key={`header-${slot.hour}-${slot.minute}`}
              className="h-24 flex items-center justify-end pr-4 text-sm font-medium"
            >
              {`${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-primary/10">
          {daysInWeek.map((day) => (
            <div key={day.toISOString()}>
              <div className="bg-background p-2 text-center">
                <div className="text-sm font-medium">
                  {format(day, "EEEE", { locale: es })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(day, "d MMM", { locale: es })}
                </div>
              </div>
              <div className="divide-y divide-primary/10">
                {timeSlots.map((slot) => {
                  const formattedTime = `${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`;
                  const isAvailable = isTimeSlotAvailable(day, slot.hour, slot.minute, appointments);

                  return (
                    <div 
                      key={`${day.toISOString()}-${slot.hour}-${slot.minute}`}
                      className={cn(
                        "h-24 flex items-center justify-center text-sm font-medium border-b border-primary/10 last:border-b-0",
                        isAvailable ? "bg-green-50" : "bg-red-50"
                      )}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-xs">{formattedTime}</span>
                        {isAvailable ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDate(day);
                              setSelectedTime(formattedTime);
                              handleSlotSelect(formattedTime);
                              
                              // Esperar a que React actualice el estado antes de abrir el modal
                              // Esperar a que React actualice `selectedTime` antes de abrir el modal
                              setTimeout(() => {
                                if (selectedTime) {
                                  setShowNewAppointment(true);
                                }
                              }, 50);
                            }}
                            className="mt-1"
                          >
                            Disponible
                          </Button>
                        ) : (
                          <span className="text-xs text-red-500 mt-1">Ocupado</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const disabledDates = useCallback((date: Date): boolean => {
    if (!scheduleConfig) return true;

    const dayName = format(date, "EEEE", { locale: es }).toLowerCase();
    const isWorkDay = scheduleConfig.workDays.includes(dayName);
    const isVacation = scheduleConfig.vacationPeriods?.some((period) =>
      isWithinInterval(date, {
        start: new Date(period.start),
        end: new Date(period.end),
      })
    ) ?? false;

    return !isWorkDay || isVacation || isBefore(date, startOfDay(new Date()));
  }, [scheduleConfig]);





  if (checkingAuth || loadingAppointments) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-6">
      <Card className="border-primary/10">
        <CardHeader className="space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold text-primary">
                Panel Administrativo
              </CardTitle>
              <CardDescription className="text-lg">
                Dra. Jazmín Montañés
                <br />
                Ginecología y Obstetricia
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="default"
                onClick={() => setShowNewAppointment(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Nuevo Turno
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowScheduleSettings(true)}
                className="border-primary/20 hover:bg-primary/5"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configurar horarios
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="border-primary/20 hover:bg-primary/5"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar sesión
              </Button>
            </div>
          </div>
          <CardDescription className="text-base">
            {format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy', ' HH:mm 'hs'", {
              locale: es,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Próximos Turnos (Esta semana y la siguiente)
              </h3>
            </div>
            <AppointmentsCarousel
              appointments={upcomingAppointments}
              onEdit={setEditingAppointment}
              onDelete={setDeleteConfirmId}
              onReminder={(id) => {
                if (id !== undefined) {
                  reminderMutation.mutate(id);
                }
              }}
              onViewHistory={setShowClinicalHistory}
            />
          </div>

          <div className="flex justify-end mb-4 gap-2">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              onClick={() => setViewMode("list")}
              className="border-primary/20"
            >
              Lista
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "outline"}
              onClick={() => setViewMode("calendar")}
              className="border-primary/20"
            >
              Calendario
            </Button>
          </div>

          {viewMode === "list" ? (
            <>
              <div className="mb-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre o email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 border-primary/20"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[280px] justify-start text-left font-normal border-primary/20",
                            !dateFilter.from && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFilter.from ? (
                            dateFilter.to ? (
                              <>
                                {format(dateFilter.from, "P", { locale: es })} -{" "}
                                {format(dateFilter.to, "P", { locale: es })}
                              </>
                            ) : (
                              format(dateFilter.from, "P", { locale: es })
                            )
                          ) : (
                            "Seleccionar fechas"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          initialFocus
                          mode="range"
                          defaultMonth={dateFilter.from}
                          selected={{
                            from: dateFilter.from,
                            to: dateFilter.to,
                          }}
                          onSelect={(range) => {
                            setDateFilter({
                              from: range?.from,
                              to: range?.to,
                            });
                          }}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                    <Select value={sortOption} onValueChange={setSortOption}>
                      <SelectTrigger className="w-[200px] border-primary/20">
                        <ArrowUpDown className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Ordenar por..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sortOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select
                      value={obraSocialFilter}
                      onValueChange={setObraSocialFilter}
                    >
                      <SelectTrigger className="w-[200px] border-primary/20">
                        <SelectValue placeholder="Filtrar por obra social" />
                      </SelectTrigger>
                      <SelectContent>
                        {obraSocialOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedAppointments.length > 0 && (
                      <Button
                        variant="destructive"
                        onClick={() => setShowBulkDeleteConfirm(true)}
                        className="whitespace-nowrap"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar ({selectedAppointments.length})
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-primary/10">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          appointments.length > 0 &&
                          selectedAppointments.length ===
                            appointments.length
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Fecha y Hora</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Obra Social</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAppointments.map((appointment) => (
                    <TableRow
                      key={appointment.id}
                      className="border-primary/10"
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedAppointments.includes(
                            appointment.id,
                          )}
                          onCheckedChange={(checked) =>
                            handleSelectAppointment(
                              appointment.id,
                              checked as boolean,
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {format(new Date(appointment.appointmentTime), "PPpp", {
                          locale: es,
                        })}
                      </TableCell>
                      <TableCell>{appointment.patientName}</TableCell>
                      <TableCell>{appointment.serviceType}</TableCell>
                      <TableCell>{appointment.obraSocial}</TableCell>
                      <TableCell>
                        <div>{appointment.email}</div>
                        <div className="text-sm text-muted-foreground">
                          {appointment.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {appointment.patientId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setShowClinicalHistory(appointment.patientId)
                              }
                              className="border-primary/20 hover:bg-primary/5"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Historia
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingAppointment(appointment)}
                            className="border-primary/20 hover:bg-primary/5"
                          >
                            Editar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteConfirmId(appointment.id)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-center space-x-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setAppointmentsPage(Math.max(0, appointmentsPage - 1))}
                  disabled={appointmentsPage === 0}
                  className="border-primary/20 hover:bg-primary/5"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalFilteredPages) }, (_, i) => {
                    // Calculate page number to show (for pagination with many pages)
                    const pageIndex = appointmentsPage < 3
                      ? i
                      : appointmentsPage + i - 2 >= totalFilteredPages 
                        ? totalFilteredPages - 5 + i
                        : appointmentsPage + i - 2;

                    return pageIndex >= 0 && pageIndex < totalFilteredPages ? (
                      <Button
                        key={pageIndex}
                        variant={appointmentsPage === pageIndex ? "default" : "outline"}
                        onClick={() => setAppointmentsPage(pageIndex)}
                        className={cn(
                          "w-9 h-9 p-0",
                          appointmentsPage === pageIndex 
                            ? "bg-primary text-white" 
                            : "border-primary/20"
                        )}
                      >
                        {pageIndex + 1}
                      </Button>
                    ) : null;
                  })}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setAppointmentsPage(Math.min(totalFilteredPages - 1, appointmentsPage + 1))}
                  disabled={appointmentsPage >= totalFilteredPages - 1}
                  className="border-primary/20 hover:bg-primary/5"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="outline"
                    onClick={goToPreviousWeek}
                    className="border-primary/20"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Semana anterior
                  </Button>
                  <h3 className="text-lg font-medium">
                    Semana: {format(weekStart, "d 'de' MMMM", { locale: es })} - {format(weekEnd, "d 'de' MMMM", { locale: es })}
                  </h3>
                  <Button
                    variant="outline"
                    onClick={goToNextWeek}
                    className="border-primary/20"
                  >
                    Siguiente semana
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>

                {/* Full week calendar view */}
                <div className="border rounded-lg border-primary/10 shadow-sm overflow-hidden">
                  {/* Header row with day names */}
                  <div className="grid grid-cols-5 bg-secondary/30">
                    {daysInWeek.map((day) => (
                      <div 
                        key={day.toISOString()} 
                        className="text-center font-medium p-4 border-r border-primary/10 last:border-r-0"
                      >
                        <div className="text-primary text-lg mb-1">
                          {format(day, "EEEE", { locale: es })}
                        </div>
                        <div className="text-sm">
                          {format(day, "d 'de' MMMM", { locale: es })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Time slots grid */}
                  <div className="relative">
                    {/* Time indicators column */}
                    <div className="absolute left-0 top-0 bottom-0 w-20 bg-secondary/10 border-r border-primary/10 flex flex-col">
                      {timeSlots.map((slot) => (
                        <div 
                          key={`time-${slot.hour}-${slot.minute}`} 
                          className="h-24 flex items-center justify-center text-sm font-medium border-b border-primary/10 last:border-b-0"
                        >
                          <div className="flex flex-col items-center">
                            <span className="text-primary font-bold">{slot.hour.toString().padStart(2, '0')}</span>
                            <span className="text-xs text-muted-foreground">{slot.minute === 0 ? '00' : slot.minute} min</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="ml-20 grid grid-cols-5">
                      {/* Generate columns for each day */}
                      {daysInWeek.map((day) => (
                        <div key={`col-${day.toISOString()}`} className="border-r border-primary/10 last:border-r-0">
                          {/* Generate time slots for this day */}
                          {timeSlots.map((slot) => {
                            const timeStr = `${slot.hour.toString().padStart(2, '0')}:${slot.minute === 0 ? '00' : slot.minute}`;

                            // Check if this time slot is available
                            const isAvailable = isTimeSlotAvailable(day, slot.hour, slot.minute, appointments);

                            // Get appointments for this specific time slot
                            const appointmentsForTime = getAppointmentsForDay(day).filter((apt) => {
                              const aptDate = new Date(apt.appointmentTime);
                              return aptDate.getHours() === slot.hour && aptDate.getMinutes() === slot.minute;
                            });

                            return (
                              <div
                                key={`slot-${day.toISOString()}-${timeStr}`}
                                className={cn(
                                  "h-24 p-2 border-b border-primary/10 transition-colors relative",
                                  isAvailable 
                                    ? "hover:bg-secondary/30 cursor-pointer" 
                                    : "bg-gray-50"
                                )}
                                onClick={() => {
                                  if (isAvailable) {
                                    // Extract date components from the day
                                    const year = day.getFullYear();
                                    const month = day.getMonth();
                                    const date = day.getDate();

                                    // Create a completely new date object with the exact components
                                    const appointmentDateTime = new Date(year, month, date, slot.hour, slot.minute, 0, 0);

                                    // Format time string properly with leading zeros
                                    const formattedTimeStr = `${slot.hour.toString().padStart(2, '0')}:${slot.minute === 0 ? '00' : slot.minute}`;

                                    console.log("Creating appointment for specific time:", 
                                      formattedTimeStr, 
                                      "Date components:", year, month + 1, date,
                                      "Result:", appointmentDateTime.toISOString());

                                    // Set selected date and time BEFORE setting form values
                                    // Make a new copy of the day to avoid any reference issues
                                    setSelectedDate(new Date(year, month, date));
                                    setSelectedTime(formattedTimeStr);

                                    // Reset form with explicitly created appointment date and time
                                    form.reset({
                                      patientName: "",
                                      email: "",
                                      phone: "",
                                      serviceType: "Consulta",
                                      obraSocial: "Particular",
                                      isFirstTime: false,
                                      notes: "",
                                      appointmentTime: appointmentDateTime,
                                    });

                                    // Force update the form value with the correct date and time immediately
                                    setTimeout(() => {
                                      form.setValue("appointmentTime", appointmentDateTime, { 
                                        shouldValidate: true,
                                        shouldDirty: true,
                                        shouldTouch: true 
                                      });

                                      // Verify the value was set correctly
                                      const setValue = form.getValues("appointmentTime");
                                      const setDate = setValue instanceof Date ? setValue : new Date(setValue);

                                      console.log("Form value after setting:", 
                                        setDate.toISOString(), 
                                        "Hours:", setDate.getHours(), 
                                        "Minutes:", setDate.getMinutes());

                                      // If the time wasn't set correctly, try one more time
                                      if (setDate.getHours() !== slot.hour || setDate.getMinutes() !== slot.minute) {
                                        console.log("Time wasn't set correctly, trying again with explicit date");
                                        form.setValue("appointmentTime", appointmentDateTime, { 
                                          shouldValidate: true,
                                          shouldDirty: true,
                                          shouldTouch: true 
                                        });
                                      }
                                    }, 50);

                                    // Open the dialog after form is properly set
                                    setShowNewAppointment(true);
                                  }
                                }}
                              >
                                {appointmentsForTime.length > 0 ? (
                                  <div className="absolute inset-1 bg-primary/10 rounded-md shadow-sm p-1 overflow-hidden flex flex-col">
                                    {appointmentsForTime.map((apt) => (
                                      <button
                                        key={apt.id}
                                        className="w-full text-left truncate hover:bg-primary/20 hover:text-primary transition-colors mb-1 bg-background/90 p-2 rounded-md border border-primary/20 shadow-sm"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setSelectedAppointment(apt);
                                        }}
                                        title={`${apt.patientName} - ${apt.obraSocial} - ${apt.serviceType}`}
                                      >
                                        <div className="font-medium text-sm">{apt.patientName}</div>
                                        <div className="flex items-center justify-between mt-1">
                                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {format(new Date(apt.appointmentTime), "HH:mm", { locale: es })}
                                          </div>
                                          <div className="px-1.5 py-0.5 bg-primary/10 rounded-full text-[10px] text-primary font-medium">
                                            {apt.serviceType}
                                          </div>
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                                          <Building2 className="h-3 w-3" />
                                          {apt.obraSocial}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <div className={cn(
                                    "absolute inset-0 flex items-center justify-center text-sm rounded-md border-2 border-dashed m-1 transition-all", 
                                    isAvailable 
                                      ? "border-primary/40 text-primary hover:border-primary hover:bg-primary/5 hover:shadow-md" 
                                      : "border-gray-200 text-gray-400"
                                  )}>
                                    {isAvailable ? (
                                      <div className="flex flex-col items-center p-2">
                                        <Clock className="h-5 w-5 mb-1 text-primary/70" />
                                        <span className="font-medium">{timeStr} hs</span>
                                        <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full mt-1">Disponible</span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center">
                                        <span className="font-medium">No disponible</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent className="border-primary/10">
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro que desea eliminar este turno? Esta acción no se
              puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              className="border-primary/20 hover:bg-primary/5"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteMutation.mutate(deleteConfirmId);
                setDeleteConfirmId(null);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Eliminando...
                </span>
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
      >
        <DialogContent className="border-primary/10">
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación Múltiple</DialogTitle>
            <DialogDescription>
              ¿Está seguro que desea eliminar {selectedAppointments.length}{" "}
              turnos? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteConfirm(false)}
              className="border-primary/20 hover:bg-primary/5"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => bulkDeleteMutation.mutate(selectedAppointments)}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Eliminando...
                </span>
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="border-primary/10">
          <DialogHeader>
            <div className="space-y-2">
              <DialogTitle>Confirmar cierre de sesión</DialogTitle>
              <DialogDescription>
                ¿Está seguro que desea cerrar sesión?
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="flex justify-center gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowLogoutConfirm(false)}
              className="border-primary/20 hover:bg-primary/5"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cerrando sesión...
                </span>
              ) : (
                "Cerrar sesión"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedAppointment}
        onOpenChange={() => setSelectedAppointment(null)}
      >
        <DialogContent className="border-primary/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary text-xl">Detalles del Turno</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4 mt-2">
              <div className="bg-secondary/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div className="font-semibold text-primary">Fecha y Hora</div>
                </div>
                <div className="ml-7 text-lg">
                  {format(
                    new Date(selectedAppointment.appointmentTime),
                    "PPP 'a las' HH:mm",
                    { locale: es },
                  )}
                </div>
              </div>

              <div className="bg-secondary/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-5 w-5 text-primary" />
                  <div className="font-semibold text-primary">Paciente</div>
                </div>
                <div className="ml-7 text-lg">{selectedAppointment.patientName}</div>

                <div className="mt-3 space-y-2">
                  {selectedAppointment.isFirstTime && (
                    <div className="ml-7 inline-flex items-center bg-primary/10 text-primary text-sm rounded-full px-3 py-1">
                      Primera consulta
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-secondary/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="font-semibold text-primary">Detalles de la consulta</div>
                </div>
                <div className="ml-7 space-y-2">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{selectedAppointment.serviceType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{selectedAppointment.obraSocial}</span>
                  </div></div></div>

              {selectedAppointment.notes && (
                <div className="bg-secondary/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <StickyNote className="h-5 w-5 text-primary" />
                    <div className="font-semibold text-primary">Notas</div>
                  </div>
                  <div className="ml-7 text-muted-foreground whitespace-pre-wrap">{selectedAppointment.notes}</div>
                </div>
              )}

              <DialogFooter className="gap-2 pt-4">
                {selectedAppointment.patientId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowClinicalHistory(selectedAppointment.patientId);
                      setSelectedAppointment(null);
                    }}
                    className="border-primary/20 hover:bg-primary/5"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Historia Clínica
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => {
                    reminderMutation.mutate(selectedAppointment.id);
                  }}
                  className="border-primary/20 hover:bg-primary/5"
                  disabled={reminderMutation.isPending}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  {reminderMutation.isPending ? "Enviando..." : "Enviar Recordatorio"}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingAppointment(selectedAppointment);
                    setSelectedAppointment(null);
                  }}
                  className="border-primary/20 hover:bg-primary/5"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => {
                    setDeleteConfirmId(selectedAppointment.id);
                    setSelectedAppointment(null);
                  }}
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showScheduleSettings}
        onOpenChange={setShowScheduleSettings}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Configuración de horarios y mensajes</DialogTitle>
            <DialogDescription>
              Configure los horarios de atención, períodos de vacaciones y
              mensajes para pacientes
                        </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="schedule" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="schedule">Horarios de atención</TabsTrigger>
              <TabsTrigger value="vacation">Período de vacaciones</TabsTrigger>
              <TabsTrigger value="messages">Mensajes</TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="space-y-4 mt-4">
              <Form {...scheduleForm}>
                <form
                  onSubmit={scheduleForm.handleSubmit(() => {
                    if (editedConfig) {
                      updateScheduleMutation.mutate(editedConfig);
                    }
                  })}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={scheduleForm.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hora de inicio</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={scheduleForm.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hora de fin</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <FormLabel>Días de atención</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].map(
                        (day) => (
                          <Button
                            key={day}
                            type="button"
                            variant={
                              scheduleConfig?.workDays.includes(day.toLowerCase())
                                ? "default"
                                : "outline"
                            }
                            onClick={() => {
                              const newWorkDays =
                                scheduleConfig?.workDays.includes(
                                  day.toLowerCase(),
                                )
                                  ? scheduleConfig.workDays.filter(
                                      (d) => d !== day.toLowerCase(),
                                    )
                                  : [
                                      ...(scheduleConfig?.workDays || []),
                                      day.toLowerCase(),
                                    ];

                              updateScheduleMutation.mutate({
                                workDays: newWorkDays,
                              });
                            }}
                            className="border-primary/20"
                          >
                            {day}
                          </Button>
                        ),
                      )}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={updateScheduleMutation.isPending}
                    >
                      {updateScheduleMutation.isPending
                        ? "Guardando..."
                        : "Guardar cambios"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="vacation" className="space-y-4 mt-4">
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-4">Período de Vacaciones</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="font-medium text-sm">Desde</div>
                      <CalendarComponent
                        mode="single"
                        selected={vacationStart}
                        onSelect={setVacationStart}
                        disabled={(date) => isBefore(date, new Date())}
                        className="rounded-md border"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="font-medium text-sm">Hasta</div>
                      <CalendarComponent
                        mode="single"
                        selected={vacationEnd}
                        onSelect={setVacationEnd}
                        disabled={(date) =>
                          isBefore(date, new Date()) ||
                          (vacationStart ? isBefore(date, vacationStart) : false)
                        }
                        className="rounded-md border"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      if (vacationStart && vacationEnd) {
                        updateScheduleMutation.mutate({
                          workDays: scheduleConfig?.workDays || [],
                          startTime: scheduleConfig?.startTime || "09:00",
                          endTime: scheduleConfig?.endTime || "17:00",
                          vacationPeriods: [
                            {
                              start: vacationStart.toISOString(),
                              end: vacationEnd.toISOString(),
                            },
                          ],
                        });
                      }
                    }}
                    disabled={
                      !vacationStart ||
                      !vacationEnd ||
                      updateScheduleMutation.isPending
                    }
                  >
                    {updateScheduleMutation.isPending
                      ? "Guardando..."
                      : "Guardar período de vacaciones"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="messages" className="space-y-4 mt-4">
              <PatientMessageConfig
                messages={patientMessages}
                onSave={(message) => saveMessageMutation.mutate(message)}
                onDelete={(id) => deleteMessageMutation.mutate(id)}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingAppointment}
        onOpenChange={(open) => {
          if (!open) {
            setEditingAppointment(null);
            // Reset form when closing edit dialog
            form.reset({
              patientName: "",
              email: "",
              phone: "",
              serviceType: "Consulta",
              obraSocial: "Particular",
              isFirstTime: false,
              notes: "",
              appointmentTime: new Date(),
            });
            setSelectedDate(null);
            setSelectedTime(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Turno</DialogTitle>
            <DialogDescription>
              Modifique los datos del turno y guarde los cambios.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="appointmentTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha y Hora</FormLabel>
                    <div className="space-y-2">
                      <Select
                        value={selectedDate instanceof Date && !isNaN(selectedDate.getTime()) ? selectedDate.toISOString() : ""}
                        onValueChange={(value) => {
                          if (value) {
                            const newDate = new Date(value);
                            setSelectedDate(newDate);
                            setSelectedTime(null);
                          }
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
                          <div className="grid grid-cols-4 gap-2">
                            {selectedDate && getAvailableTimeSlots(selectedDate).map((slot) => {
                              const timeStr = `${slot.hour}:${slot.minute === 0 ? '00' : slot.minute}`;
                              const isSelected = selectedTime === timeStr;

                              return (
                                <button
                                  key={slot.hour}
                                  type="button"
                                  onClick={() => {
                                    handleSlotSelect(timeStr);
                                    // Esperar a que React actualice `selectedTime` antes de abrir el modal
                                    setTimeout(() => {
                                      if (selectedTime) {
                                        setShowNewAppointment(true);
                                      }
                                    }, 50);
                                  }}
                                  className={cn(
                                    "p-2 rounded text-sm transition-colors",
                                    isSelected
                                      ? "bg-primary text-white"
                                      : "bg-secondary hover:bg-secondary/80"
                                  )}
                                >
                                  {timeStr}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <FormMessage />
                    </div>
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
                      <Input {...field} />
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
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el tipo de servicio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Consulta">Consulta</SelectItem>
                        <SelectItem value="Consulta & PAP">
                          Consulta & PAP
                        </SelectItem>
                        <SelectItem value="Extracción & Colocación de DIU">
                          Extracción & Colocación de DIU
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
                    <FormLabel>Obra Social</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione la obra social" />
                      </SelectTrigger>
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
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      Primera consulta
                    </FormLabel>
                  </FormItem>
                )}
              />

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

              <DialogFooter className="mt-6 flex items-center justify-end gap-2 sticky bottom-0 bg-background pt-2 pb-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingAppointment(null);
                    // Reset form when closing edit dialog
                    form.reset({
                      patientName: "",
                      email: "",
                      phone: "",
                      serviceType: "Consulta",
                      obraSocial: "Particular",
                      isFirstTime: false,
                      notes: "",
                      appointmentTime: new Date(),
                    });
                    setSelectedDate(null);
                    setSelectedTime(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={editMutation.isPending}
                >
                  {editMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Guardar Cambios
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showNewAppointment}
        onOpenChange={(open) => {
          setShowNewAppointment(open);
          if (!open && editingAppointment) {
            setEditingAppointment(null);
            form.reset({
              patientName: "",
              email: "",
              phone: "",
              serviceType: "Consulta",
              obraSocial: "Particular",
              isFirstTime: false,
              notes: "",
              appointmentTime: new Date(),
            });
            setSelectedDate(null);
            setSelectedTime(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-primary/10 flex flex-col">
          <DialogHeader>
            <DialogTitle>Nuevo Turno</DialogTitle>
            <DialogDescription>
              Complete el formulario para agendar un nuevo turno.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="appointmentTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha y Hora</FormLabel>
                    <div className="space-y-4">
                      <Select
                        value={selectedDate instanceof Date && !isNaN(selectedDate.getTime()) ? selectedDate.toISOString() : ""}
                        onValueChange={(value) => {
                          if (value) {
                            try {
                              // Parse the ISO string to get a date
                              const parsedDate = new Date(value);

                              if (!isNaN(parsedDate.getTime())) {
                                // Create a new date with just the date parts to avoid time zone issues
                                const year = parsedDate.getFullYear();
                                const month = parsedDate.getMonth();
                                const day = parsedDate.getDate();

                                // Create clean date at midnight
                                const newDate = new Date(year, month, day, 0, 0, 0, 0);

                                console.log("Selected date from dropdown:", 
                                  value,
                                  "Parsed components:", year, month + 1, day,
                                  "New date object:", newDate.toISOString());

                                setSelectedDate(newDate);
                                setSelectedTime(null);

                                // Clear the appointment time until a time slot is selected
                                field.onChange(undefined);
                              }
                            } catch (err) {
                              console.error("Error parsing date:", err, "Value:", value);
                            }
                          }
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
                          {viewMode === "calendar" && selectedTime ? (
                            <div className="bg-secondary/20 p-4 rounded-lg">
                              <h3 className="font-medium flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Horario seleccionado
                              </h3>
                              <div className="mt-2 flex items-center">
                                <div className="p-2 rounded bg-primary text-white font-medium text-center">
                                  {selectedTime} hs
                                </div>
                                <div className="ml-3 text-sm text-muted-foreground">
                                  {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h3 className="font-medium flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Horarios disponibles
                              </h3>
                              <div className="grid grid-cols-4 gap-2">
                                {selectedDate && getAvailableTimeSlots(selectedDate).map((slot) => {
                                  // Format time string with leading zeros for consistency
                                  const timeStr = `${slot.hour.toString().padStart(2, '0')}:${slot.minute === 0 ? '00' : slot.minute}`;

                                  // Check if this specific time slot is available
                                  const slotDate = new Date(selectedDate);
                                  slotDate.setHours(slot.hour, slot.minute, 0, 0);

                                  // For appointment being edited, consider its time slot as available
                                  let isAvailable = true;

                                  if (!editingAppointment) {
                                    // For new appointments, check if the slot is available
                                    isAvailable = !appointments.some(apt => {
                                      const aptTime = new Date(apt.appointmentTime);

                                      // Check for exact time slot conflict
                                      const exactMatch = isSameDay(aptTime, slotDate) && 
                                            aptTime.getHours() === slot.hour && 
                                            aptTime.getMinutes() === slot.minute;

                                      // Check for adjacent conflicts with special services
                                      const isSpecialService = apt.serviceType === "Extracción & Colocación de DIU";

                                      // If it's a special service, block adjacent slots
                                      if (isSpecialService && isSameDay(aptTime, slotDate)) {
                                        // Calculate time in minutes for comparison
                                        const slotTimeInMinutes = slot.hour * 60 + slot.minute;
                                        const aptTimeInMinutes = aptTime.getHours() * 60 + aptTime.getMinutes();

                                        // Block 30 minutes before and after DIU services
                                        const isAdjacent = Math.abs(slotTimeInMinutes - aptTimeInMinutes) <= 30;
                                        return exactMatch || isAdjacent;
                                      }

                                      return exactMatch;
                                    });
                                  } else {
                                    // For edited appointments, consider its own slot as available
                                    isAvailable = !appointments.some(apt => {
                                      if (apt.id === editingAppointment.id) return false;

                                      const aptTime = new Date(apt.appointmentTime);

                                      // Check for exact time slot conflict
                                      const exactMatch = isSameDay(aptTime, slotDate) && 
                                            aptTime.getHours() === slot.hour && 
                                            aptTime.getMinutes() === slot.minute;

                                      // Check for adjacent conflicts with special services
                                      const isSpecialService = apt.serviceType === "Extracción & Colocación de DIU";

                                      // If it's a special service, block adjacent slots
                                      if (isSpecialService && isSameDay(aptTime, slotDate)) {
                                        // Calculate time in minutes for comparison
                                        const slotTimeInMinutes = slot.hour * 60 + slot.minute;
                                        const aptTimeInMinutes = aptTime.getHours() * 60 + aptTime.getMinutes();

                                        // Block 30 minutes before and after DIU services
                                        const isAdjacent = Math.abs(slotTimeInMinutes - aptTimeInMinutes) <= 30;
                                        return exactMatch || isAdjacent;
                                      }

                                      return exactMatch;
                                    });
                                  }

                                  // Check if the current time matches the selected time (accounting for potential format differences)
                                  const isSelected = selectedTime === timeStr;

                                  return (
                                    <button
                                      key={timeStr}
                                      type="button"
                                      disabled={!isAvailable && !editingAppointment}
                                      onClick={() => {
                                        handleSlotSelect(timeStr);
                                        // Esperar a que React actualice `selectedTime` antes de abrir el modal
                                        setTimeout(() => {
                                          if (selectedTime) {
                                            setShowNewAppointment(true);
                                          }
                                        }, 50);
                                      }}
                                      className={cn(
                                        "p-2 rounded text-sm transition-colors",
                                        isSelected
                                          ? "bg-primary text-white"
                                          : isAvailable
                                            ? "bg-secondary hover:bg-secondary/80"
                                            : "bg-muted cursor-not-allowed",
                                      )}
                                    >
                                      {timeStr}
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      <FormMessage />
                    </div>
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
                      <Input {...field} />
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
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el tipo de servicio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Consulta">Consulta</SelectItem>
                        <SelectItem value="Consulta & PAP">
                          Consulta & PAP
                        </SelectItem>
                        <SelectItem value="Extracción & Colocación de DIU">
                          Extracción & Colocación de DIU
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
                    <FormLabel>Obra Social</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione la obra social" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Particular">Particular</SelectItem>
                        <SelectItem value="OSDE">OSDE</SelectItem>
                        <SelectItem value="Swiss Medical">
                          Swiss Medical
                        </SelectItem>
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
                name="isFirstTime"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      Primera consulta
                    </FormLabel>
                  </FormItem>
                )}
              />

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

              <DialogFooter className="mt-6 flex items-center justify-end gap-2 sticky bottom-0 bg-background pt-2 pb-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewAppointment(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={editingAppointment ? editMutation.isPending : createAppointmentMutation.isPending}
                >
                  {(editingAppointment ? editMutation.isPending : createAppointmentMutation.isPending) ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {editingAppointment ? "Guardar Cambios" : "Guardar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!showClinicalHistory}
        onOpenChange={(open) => !open && setShowClinicalHistory(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-primary/10">
          <DialogHeader>
            <DialogTitle>Historia Clínica del Paciente</DialogTitle>
          </DialogHeader>
          {showClinicalHistory && (
            <ClinicalHistory patientId={showClinicalHistory} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const isTimeSlotAvailable = (day: Date, hour: number, minute: number, appointments: Appointment[]): boolean => {
  return !appointments.some(apt => {
    const aptTime = new Date(apt.appointmentTime);
    return isSameDay(aptTime, day) && 
           aptTime.getHours() === hour && 
           aptTime.getMinutes() === minute;
  });
};