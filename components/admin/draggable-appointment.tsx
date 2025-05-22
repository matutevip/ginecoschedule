import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Building2, Clock, Pencil, Trash2, TimerIcon, XCircle } from "lucide-react";
import { Appointment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Función auxiliar para determinar si un tipo de servicio requiere 40 minutos
export const isFortyMinService = (serviceType: string): boolean => {
  // Servicios que requieren 40 minutos
  return serviceType === "Extracción & Colocación de DIU" || 
         serviceType === "Colocación de DIU" ||
         serviceType === "Extracción de DIU" ||
         serviceType === "Biopsia";
};

// Función auxiliar para servicios de 20 minutos (PAP, colposcopía y consultas estándar)
export const is20MinService = (serviceType: string): boolean => {
  // Todos los demás servicios requieren 20 minutos
  return !isFortyMinService(serviceType);
};

interface DraggableAppointmentProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  onDelete: (id: number) => void;
  onCancel?: (id: number) => void;
  onDetails: (appointment: Appointment) => void;
}

export function DraggableAppointment({
  appointment,
  onEdit,
  onDelete,
  onCancel,
  onDetails
}: DraggableAppointmentProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `appointment-${appointment.id}`,
    data: {
      type: 'appointment',
      appointment
    }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  // Determinar si es un servicio de 40 minutos
  const is40MinService = isFortyMinService(appointment.serviceType || "");
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "w-full text-left hover:bg-primary/20 hover:text-primary transition-colors mb-1 p-2 rounded-md border shadow-sm cursor-move",
        is40MinService 
          ? "bg-orange-50 border-orange-300" // Estilo visual para citas de 40 min
          : "bg-background/90 border-primary/20" // Estilo normal para citas de 20 min
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDetails(appointment);
      }}
      title={`${appointment.patientName} - ${appointment.obraSocial} - ${appointment.serviceType}${is40MinService ? ' (40 min)' : ' (20 min)'}`}
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
            : "bg-primary/10 text-primary"
        )}>
          {appointment.serviceType}
        </div>
      </div>
      <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
        <Building2 className="h-3 w-3" />
        {appointment.obraSocial}
      </div>
      
      <div className="flex mt-2 pt-2 border-t border-primary/10 gap-1 justify-end">
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
          <Pencil className="h-3 w-3 mr-1" />
          Editar
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
            disabled={appointment.status === 'cancelled_by_patient' || appointment.status === 'cancelled_by_professional'}
          >
            <XCircle className="h-3 w-3 mr-1" />
            Cancelar
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
          <Trash2 className="h-3 w-3 mr-1" />
          Eliminar
        </Button>
      </div>
    </div>
  );
}