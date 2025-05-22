import React from "react";
import { Appointment } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Building2, Check, Clock, Pencil, Trash2, User, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isFortyMinService } from "./draggable-appointment";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CalendarAppointmentProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  onDelete: (id: number) => void;
  onCancel?: (id: number) => void;
  onDetails: (appointment: Appointment) => void;
  onNoShow?: (id: number) => void;
  onAttended?: (id: number) => void;
}

export function CalendarAppointment({
  appointment,
  onEdit,
  onDelete,
  onCancel,
  onDetails,
  onNoShow,
  onAttended
}: CalendarAppointmentProps) {
  const is40MinService = isFortyMinService(appointment.serviceType || "");
  const isCancelled = appointment.status === 'cancelled_by_patient' || appointment.status === 'cancelled_by_professional';
  const isCompleted = appointment.status === 'attended' || appointment.status === 'no_show';

  return (
    <div
      className={cn(
        "w-full text-left transition-colors p-2 rounded-md border shadow-sm cursor-pointer",
        is40MinService 
          ? "bg-orange-50 border-orange-300" // Estilo visual para citas de 40 min
          : "bg-background/90 border-primary/20", // Estilo normal para citas de 20 min
        isCancelled && "opacity-60 bg-gray-100", // Atenuado para citas canceladas
        appointment.status === 'attended' && "bg-green-50 border-green-200", // Verde para citas completadas
        appointment.status === 'no_show' && "bg-red-50 border-red-200" // Rojo para ausencias
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDetails(appointment);
      }}
    >
      <div className="font-medium text-sm">{appointment.patientName}</div>
      <div className="flex items-center justify-between mt-1">
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {format(new Date(appointment.appointmentTime), "HH:mm", { locale: es })}
          {is40MinService && (
            <span className="ml-1 px-1 py-0.5 bg-orange-100 text-orange-700 rounded-sm text-[9px] font-medium">
              40 min
            </span>
          )}
        </div>
        <div className={cn(
          "px-1.5 py-0.5 rounded-full text-[10px] font-medium",
          is40MinService 
            ? "bg-orange-100 text-orange-700" 
            : "bg-primary/10 text-primary",
          appointment.status === 'attended' && "bg-green-100 text-green-700",
          appointment.status === 'no_show' && "bg-red-100 text-red-700"
        )}>
          {appointment.serviceType}
        </div>
      </div>
      
      <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
        <Building2 className="h-3 w-3" />
        {appointment.obraSocial}
      </div>

      {/* Mostrar el estado de la cita */}
      {appointment.status && appointment.status !== 'pending' && appointment.status !== 'confirmed' && (
        <div className="mt-1">
          <span className={cn(
            "text-[10px] py-0.5 px-1.5 rounded-sm",
            appointment.status === 'attended' && "bg-green-100 text-green-700",
            appointment.status === 'no_show' && "bg-red-100 text-red-700",
            appointment.status === 'cancelled_by_patient' && "bg-amber-100 text-amber-700",
            appointment.status === 'cancelled_by_professional' && "bg-amber-100 text-amber-700"
          )}>
            {appointment.status === 'attended' && "Asistió"}
            {appointment.status === 'no_show' && "No asistió"}
            {appointment.status === 'cancelled_by_patient' && "Cancelado por paciente"}
            {appointment.status === 'cancelled_by_professional' && "Cancelado por profesional"}
          </span>
        </div>
      )}
      
      <div className="flex mt-2 pt-2 border-t border-primary/10 gap-1 justify-end flex-wrap">
        {/* Botones para marcar asistencia/ausencia */}
        {!isCancelled && !isCompleted && onAttended && onNoShow && (
          <TooltipProvider>
            <div className="flex gap-1 mr-auto">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:text-green-800"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onAttended(appointment.id);
                    }}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Marcar como asistido</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onNoShow(appointment.id);
                    }}
                  >
                    <User className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Marcar como ausente</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}

        {/* Botones de acciones */}
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit(appointment);
          }}
          title="Editar"
        >
          <Pencil className="h-3 w-3" />
        </Button>

        {onCancel && (
          <Button
            variant="default"
            size="sm"
            className="h-6 px-2 text-xs bg-amber-600 hover:bg-amber-700 text-white"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel(appointment.id);
            }}
            title="Cancelar Turno"
            disabled={isCancelled || isCompleted}
          >
            <XCircle className="h-3 w-3" />
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(appointment.id);
          }}
          title="Eliminar"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}