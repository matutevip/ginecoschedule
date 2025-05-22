import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import {
  type Appointment,
  type ScheduleConfig,
  type BlockedDay,
  insertAppointmentSchema,
} from "@shared/schema";
import { StatisticsPreview } from "@/components/admin/statistics-preview";
import { StatisticsDashboard } from "@/components/admin/statistics-dashboard";
import { NewQuickAppointmentForm } from "@/components/admin/new-quick-appointment-form";
import { DailyCalendarView } from "@/components/admin/calendar/daily-calendar-view";
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
  parseISO,
  addDays,
  subMonths,
  addMonths,
  startOfDay,
  endOfDay,
  getDay
} from "date-fns";
import { es } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/apiClient";
import {
  Calendar,
  Loader2,
  LogOut,
  Search,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Mail,
  ArrowDown,
  ArrowUp,
  Bell,
  FileText,
  Edit,
  Settings,
  CalendarDays,
  ExternalLink,
  Plus,
  BarChart2,
  User,
  CalendarPlus,
  XCircle,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { DayPicker } from "react-day-picker";
import { Label } from "@/components/ui/label";

export default function Admin() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  
  // Manejar la fecha y hora seleccionada para citas rápidas
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showQuickAppointmentForm, setShowQuickAppointmentForm] = useState(false);
  
  // Obtener todas las citas para mostrarlas en el calendario
  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery({
    queryKey: ['/api/admin/appointments'],
    queryFn: async () => {
      const result = await apiClient('/api/admin/appointments');
      return result;
    }
  });

  // Consultar citas para hoy y mañana para el resumen
  const { data: todayAppointments = [], isLoading: isLoadingToday } = useQuery({
    queryKey: ['/api/admin/appointments/today'],
    queryFn: async () => {
      const result = await apiClient('/api/admin/appointments/today');
      return result;
    }
  });

  // Obtener configuración de horarios
  const { data: scheduleConfig, isLoading: isLoadingSchedule } = useQuery({
    queryKey: ['/api/admin/schedule-config'],
    queryFn: async () => {
      return await apiClient('/api/admin/schedule-config');
    }
  });
  
  // Obtener días bloqueados
  const { data: blockedDays = [], isLoading: isLoadingBlockedDays, refetch: refetchBlockedDays } = useQuery({
    queryKey: ['/api/admin/blocked-days'],
    queryFn: async () => {
      return await apiClient('/api/admin/blocked-days');
    }
  });

  // Estado para manejo de días bloqueados
  const [selectedBlockDay, setSelectedBlockDay] = useState<Date | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  
  // Estado para la fecha seleccionada y modal de día eventual
  const [occasionalDayDialogOpen, setOccasionalDayDialogOpen] = useState(false);
  const [selectedOccasionalDay, setSelectedOccasionalDay] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");

  // Función para bloquear un día
  const handleBlockDay = async () => {
    if (!selectedBlockDay) return;
    
    try {
      await apiClient('/api/admin/blocked-days', {
        method: 'POST',
        data: {
          date: format(selectedBlockDay, 'yyyy-MM-dd'),
          reason: blockReason || "Día bloqueado por la doctora"
        }
      });
      
      toast({
        title: "Día bloqueado correctamente",
        description: `Se ha bloqueado el día ${format(selectedBlockDay, 'PPP', { locale: es })}`,
      });
      
      setBlockDialogOpen(false);
      setSelectedBlockDay(null);
      setBlockReason("");
      refetchBlockedDays();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al bloquear el día",
        description: error.message || "No se pudo bloquear el día seleccionado"
      });
    }
  };
  
  // Función para agregar un día eventual
  const handleAddOccasionalDay = async () => {
    if (!selectedOccasionalDay) return;
    
    try {
      // Formatear la fecha y horarios
      const formattedDate = format(selectedOccasionalDay, 'yyyy-MM-dd');
      
      // Si ya existe scheduleConfig, usamos esos datos como base
      let occasionalWorkDayTimes = scheduleConfig?.occasionalWorkDayTimes || {};
      
      // Agregamos o actualizamos el día eventual
      occasionalWorkDayTimes[formattedDate] = {
        startTime: `${startTime}:00`,
        endTime: `${endTime}:00`
      };
      
      // Actualizamos la configuración
      await apiClient('/api/admin/schedule-config', {
        method: 'PATCH',
        data: {
          workDays: scheduleConfig?.workDays || [],
          startTime: scheduleConfig?.startTime || "09:00:00",
          endTime: scheduleConfig?.endTime || "18:00:00",
          occasionalWorkDayTimes
        }
      });
      
      toast({
        title: "Día eventual agregado",
        description: `Se ha configurado el día ${format(selectedOccasionalDay, 'PPP', { locale: es })} como día eventual`,
      });
      
      setOccasionalDayDialogOpen(false);
      setSelectedOccasionalDay(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al agregar día eventual",
        description: error.message || "No se pudo configurar el día eventual"
      });
    }
  };
  
  // Verificar si un día está bloqueado
  const isDayBlocked = (day: Date) => {
    if (!blockedDays) return false;
    return blockedDays.some((blockedDay: any) => 
      isSameDay(new Date(blockedDay.date), day)
    );
  };
  
  // Verificar si un día es eventual
  const isOccasionalDay = (day: Date) => {
    if (!scheduleConfig?.occasionalWorkDayTimes) return false;
    
    const formattedDate = format(day, 'yyyy-MM-dd');
    return Object.keys(scheduleConfig.occasionalWorkDayTimes).includes(formattedDate);
  };
  
  // Verificar si un día es laboral regular
  const isRegularWorkday = (day: Date) => {
    if (!scheduleConfig?.workDays) return false;
    
    const dayName = format(day, 'EEEE', { locale: es }).toLowerCase();
    return scheduleConfig.workDays.includes(dayName);
  };
  
  // Verificar si un día está en el pasado
  const isDayInPast = (day: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return isBefore(day, today);
  };
  
  // Manejar el clic en un bloque de tiempo
  const handleTimeSlotClick = (time: string) => {
    setSelectedTime(time);
    setShowQuickAppointmentForm(true);
  };
  
  // Función para cerrar el formulario de cita rápida
  const handleCloseQuickForm = () => {
    setShowQuickAppointmentForm(false);
    setSelectedTime(null);
  };

  return (
    <AdminLayout>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Panel Administrativo</h1>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Ver página de pacientes
              </a>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/config">
                <Settings className="mr-2 h-4 w-4" />
                Configuración
              </Link>
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Resumen de citas para hoy */}
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle>Citas para hoy</CardTitle>
              <CardDescription>
                {format(new Date(), 'EEEE, d MMMM yyyy', { locale: es })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingToday ? (
                <p>Cargando citas de hoy...</p>
              ) : todayAppointments && todayAppointments.length > 0 ? (
                <ul className="space-y-2">
                  {todayAppointments.map((appointment: any) => (
                    <li key={appointment.id} className="p-2 border rounded-md">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{format(parseISO(appointment.appointmentTime), 'HH:mm', { locale: es })}</span>
                        <span className="text-sm bg-primary/10 px-2 py-0.5 rounded-full">{appointment.serviceType}</span>
                      </div>
                      <p className="text-sm mt-1">{appointment.patientFirstName} {appointment.patientLastName}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-center py-4">No hay citas programadas para hoy</p>
              )}
            </CardContent>
          </Card>
          
          {/* Botones de acción rápida */}
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle>Acciones rápidas</CardTitle>
              <CardDescription>Operaciones comunes del sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/admin/statistics">
                    <BarChart2 className="mr-2 h-4 w-4" />
                    Ver estadísticas
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/admin/patients">
                    <User className="mr-2 h-4 w-4" />
                    Gestionar pacientes
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/admin-calendar">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Gestión avanzada del calendario
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Sección principal: Calendario con bloques de horario */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Selector de fecha */}
          <Card className="border-primary/10">
            <CardHeader>
              <CardTitle>Seleccionar fecha</CardTitle>
              <CardDescription>Elige un día para administrar citas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={es}
                  modifiers={{
                    blocked: (date) => isDayBlocked(date),
                    past: (date) => isDayInPast(date),
                    workDay: (date) => isRegularWorkday(date),
                    occasionalDay: (date) => isOccasionalDay(date)
                  }}
                  modifiersStyles={{
                    blocked: { backgroundColor: "#FFECEC", color: "#FF4D4D", textDecoration: "line-through" },
                    workDay: { backgroundColor: "#ECFFEC", fontWeight: "bold" },
                    occasionalDay: { backgroundColor: "#ECF5FF", fontWeight: "bold" },
                    past: { opacity: 0.5 }
                  }}
                  footer={
                    <div className="mt-4 text-center text-sm space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#ECFFEC]"></div>
                        <span>Día laboral regular</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#ECF5FF]"></div>
                        <span>Día eventual</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#FFECEC]"></div>
                        <span>Día bloqueado</span>
                      </div>
                    </div>
                  }
                />
              </div>
              
              <div className="mt-4 space-y-3">
                <Button 
                  onClick={() => setSelectedBlockDay(selectedDate)}
                  className="w-full"
                  variant="outline"
                  disabled={isDayBlocked(selectedDate)}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Bloquear día
                </Button>
                <Button 
                  onClick={() => setSelectedOccasionalDay(selectedDate)}
                  className="w-full"
                  variant="outline"
                  disabled={isOccasionalDay(selectedDate) || isDayBlocked(selectedDate)}
                >
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Configurar como día eventual
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Bloques de horarios */}
          <div className="lg:col-span-2">
            {isLoadingSchedule || isLoadingBlockedDays || isLoadingAppointments ? (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="pt-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-center mt-4">Cargando datos del calendario...</p>
                </CardContent>
              </Card>
            ) : (
              <DailyCalendarView
                selectedDate={selectedDate}
                scheduleConfig={scheduleConfig}
                blockedDays={blockedDays}
                appointments={appointments}
                onDateChange={setSelectedDate}
                onTimeSlotClick={handleTimeSlotClick}
              />
            )}
          </div>
        </div>
      </div>

      {/* Diálogo para bloquear día */}
      <Dialog open={blockDialogOpen || !!selectedBlockDay} onOpenChange={(open) => {
        setBlockDialogOpen(open);
        if (!open) setSelectedBlockDay(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear día</DialogTitle>
          </DialogHeader>
          
          {selectedBlockDay && (
            <div className="py-4">
              <p className="mb-4">
                Estás por bloquear el día <span className="font-semibold">{format(selectedBlockDay, 'PPP', { locale: es })}</span>. 
                Este día no estará disponible para agendar citas.
              </p>
              
              <div className="space-y-3">
                <Label htmlFor="blockReason">Motivo del bloqueo (opcional)</Label>
                <Textarea 
                  id="blockReason" 
                  placeholder="Ingresa el motivo por el cual bloqueas este día"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setBlockDialogOpen(false);
              setSelectedBlockDay(null);
            }}>
              Cancelar
            </Button>
            <Button onClick={handleBlockDay}>
              Bloquear día
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para agregar día eventual */}
      <Dialog open={occasionalDayDialogOpen || !!selectedOccasionalDay} onOpenChange={(open) => {
        setOccasionalDayDialogOpen(open);
        if (!open) setSelectedOccasionalDay(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar día eventual</DialogTitle>
          </DialogHeader>
          
          {selectedOccasionalDay && (
            <div className="py-4">
              <p className="mb-4">
                Estás por configurar el día <span className="font-semibold">{format(selectedOccasionalDay, 'PPP', { locale: es })}</span> como día eventual 
                con horarios especiales.
              </p>
              
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Hora de inicio</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="endTime">Hora de fin</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setOccasionalDayDialogOpen(false);
              setSelectedOccasionalDay(null);
            }}>
              Cancelar
            </Button>
            <Button onClick={handleAddOccasionalDay}>
              Guardar día eventual
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para formulario de cita rápida */}
      <Dialog open={showQuickAppointmentForm} onOpenChange={setShowQuickAppointmentForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear cita rápida</DialogTitle>
            <DialogDescription>
              {format(selectedDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
              {selectedTime && ` a las ${selectedTime}`}
            </DialogDescription>
          </DialogHeader>
          
          <NewQuickAppointmentForm 
            selectedDate={selectedDate}
            selectedTime={selectedTime || undefined}
            onSuccess={handleCloseQuickForm}
          />
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleCloseQuickForm}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}