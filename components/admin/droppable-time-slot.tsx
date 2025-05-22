import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Timer, AlertCircle, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Appointment } from "@shared/schema";
import { isFortyMinService } from "./draggable-appointment";

interface DroppableTimeSlotProps {
  day: Date;
  timeStr: string;
  isAvailable: boolean;
  children?: React.ReactNode;
  onClick: () => void;
  serviceType?: string;
  isForty?: boolean;
  isPartiallyOccupied?: boolean;
  previousAppointment?: Appointment;
  // Nuevas propiedades para mostrar servicios de 40 minutos
  occupiedByFortyMin?: boolean;  // Si este slot está ocupado por un servicio de 40 min (pero no es el slot inicial)
  mainAppointment?: Appointment; // La cita principal que ocupa este slot (cuando es un slot secundario)
  positionInForty?: 'first' | 'middle' | 'last'; // Posición relativa en un bloque de 40 min
}

export function DroppableTimeSlot({
  day,
  timeStr,
  isAvailable,
  children,
  onClick,
  serviceType,
  isForty = false,
  isPartiallyOccupied = false,
  previousAppointment,
  occupiedByFortyMin = false,
  mainAppointment,
  positionInForty
}: DroppableTimeSlotProps) {
  const dayId = format(day, "yyyy-MM-dd", { locale: es });
  const slotId = `${dayId}-${timeStr}`;
  
  const { isOver, setNodeRef } = useDroppable({
    id: slotId,
    data: {
      type: 'timeSlot',
      day,
      timeStr
    },
    disabled: !isAvailable && !isPartiallyOccupied
  });

  // Determinar si este slot está ocupado parcialmente por un servicio de 40 minutos
  const showPartialOccupation = isPartiallyOccupied && previousAppointment;
  
  // Extraer información del slot actual
  const [hourStr, minuteStr] = timeStr.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  
  // Calcular cuántos minutos de este slot están ocupados
  let occupiedMinutes = 0;
  let remainingMinutes = 30;
  
  if (showPartialOccupation) {
    // Para un servicio de 40 minutos, si comienza 30 minutos antes,
    // ocupará los primeros 10 minutos de este slot
    occupiedMinutes = 10;
    remainingMinutes = 20;
  }
  
  // Estado de bloqueo manual (simulación)
  const [isManuallyBlocked, setIsManuallyBlocked] = React.useState(false);
  
  // Determinar el texto a mostrar según el estado del slot
  let statusText = isAvailable 
    ? isManuallyBlocked 
      ? "Bloqueado manualmente" 
      : "Disponible" 
    : "No disponible";
  
  let statusClass = isAvailable 
    ? isManuallyBlocked
      ? "bg-red-100 text-red-700" 
      : "bg-primary/10 text-primary" 
    : "bg-gray-100 text-gray-600";
  
  if (isForty) {
    statusText = "40 minutos - Especial";
    statusClass = "bg-orange-100 text-orange-700 border border-orange-200";
  } else if (occupiedByFortyMin && mainAppointment) {
    statusText = "Parte de turno de 40 min";
    statusClass = "bg-orange-100 text-orange-700 border border-orange-200";
  } else if (showPartialOccupation) {
    statusText = `${remainingMinutes} min disponibles`;
    statusClass = "bg-yellow-100 text-yellow-700 border border-yellow-200";
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[130px] relative transition-all duration-200",
        isOver && (isAvailable || isPartiallyOccupied) && "bg-primary/10 scale-[1.02]",
        isManuallyBlocked && "bg-red-50 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,0,0,0.1)_10px,rgba(255,0,0,0.1)_20px)]"
      )}
    >
      {isManuallyBlocked && (
        <div className="absolute top-0 right-0 m-1 bg-red-500 rounded-full p-0.5 z-10">
          <Lock className="h-3 w-3 text-white" />
        </div>
      )}
      {/* Visualización para slots parcialmente ocupados por servicios de 40 min */}
      {showPartialOccupation && (
        <div className="absolute top-0 left-0 right-0 h-[33%] bg-orange-200 opacity-80 z-0 rounded-t-md border-b border-orange-300">
          <div className="w-full h-full flex items-center justify-center text-[10px] font-medium text-orange-800">
            <Timer className="h-3 w-3 mr-1" />
            Ocupado 10 min (servicio de 40 min)
          </div>
        </div>
      )}
      
      {/* Visualización para slots que son parte de un turno de 40 minutos pero no son el slot inicial */}
      {occupiedByFortyMin && mainAppointment && (
        <div className={cn(
          "absolute inset-0 bg-orange-100 opacity-90 z-0 flex items-center justify-center",
          positionInForty === 'last' ? "rounded-b-md" : "",
          positionInForty === 'middle' ? "border-t border-b border-orange-200" : ""
        )}>
          <div className="text-[10px] font-medium text-orange-800 text-center p-1">
            <Timer className="h-3 w-3 inline mr-1" />
            <span>
              Continúa turno de 
              <span className="font-bold"> {mainAppointment.patientName}</span>
              <br/>
              {mainAppointment.serviceType === "Extracción & Colocación de DIU" ? "DIU" : 
               mainAppointment.serviceType === "Terapia de Ginecología Regenerativa" ? "Terapia" : 
               mainAppointment.serviceType}
            </span>
          </div>
        </div>
      )}
      
      {/* Div para manejar el onClick, evitando propagación a elementos hijos */}
      <div 
        className="absolute inset-0 z-0"
        onClick={(e) => {
          if (e.currentTarget === e.target) {
            onClick();
          }
        }}
      ></div>
      
      {children ? (
        // Contenedor para los children con z-index más alto y espacio suficiente
        <div className="relative z-10 p-1 min-h-[80px] max-h-fit overflow-y-auto">{children}</div>
      ) : (
        <div 
          role="button"
          tabIndex={0}
          className={cn(
            "absolute inset-0 flex items-center justify-center text-sm rounded-md border-2 border-dashed m-1 transition-all z-10", 
            isAvailable 
              ? isForty 
                ? "border-orange-300 text-orange-700 hover:border-orange-400 hover:bg-orange-50 hover:shadow-md"
                : "border-primary/40 text-primary hover:border-primary hover:bg-primary/5 hover:shadow-md" 
              : isPartiallyOccupied
                ? "border-yellow-300 text-yellow-700 hover:border-yellow-400 hover:bg-yellow-50 hover:shadow-md"
                : "border-gray-200 text-gray-400"
          )}
          onClick={(e) => {
            // Prevenir propagación para asegurar que no haya interferencia con otros elementos
            e.stopPropagation();
            onClick();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          }}
        >
          {(isAvailable || isPartiallyOccupied) ? (
            <div className="flex flex-col items-center p-2">
              {isForty ? (
                <Timer className="h-5 w-5 mb-1 text-orange-500" />
              ) : isPartiallyOccupied ? (
                <AlertCircle className="h-5 w-5 mb-1 text-yellow-500" />
              ) : (
                <Clock className="h-5 w-5 mb-1 text-primary/70" />
              )}
              <span className="font-medium">{timeStr} hs</span>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full mt-1 font-medium",
                statusClass
              )}>
                {statusText}
              </span>
              
              {/* Toggle para bloquear/desbloquear slot individual */}
              {isAvailable && !isForty && !isPartiallyOccupied && (
                <button 
                  className={`mt-2 text-xs flex items-center gap-1 px-2 py-1 rounded ${isManuallyBlocked ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsManuallyBlocked(prev => !prev);
                    toast({
                      title: isManuallyBlocked ? "Slot desbloqueado" : "Slot bloqueado",
                      description: `Has ${isManuallyBlocked ? 'desbloqueado' : 'bloqueado'} el horario de las ${timeStr} hs.`,
                      variant: isManuallyBlocked ? "default" : "destructive"
                    });
                  }}
                >
                  {isManuallyBlocked ? (
                    <>
                      <Unlock className="h-3 w-3" />
                      <span>Desbloquear</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3" />
                      <span>Bloquear</span>
                    </>
                  )}
                </button>
              )}
              
              {(isForty && serviceType) && (
                <div className="text-[10px] mt-1 bg-orange-50 border border-orange-100 rounded p-1 text-orange-700 text-center">
                  <span className="font-medium">Servicio especial:</span><br/>
                  {serviceType === "Extracción & Colocación de DIU" ? "DIU" : 
                   serviceType === "Terapia de Ginecología Regenerativa" ? "Terapia" : 
                   serviceType}
                </div>
              )}
              
              {showPartialOccupation && previousAppointment && (
                <div className="text-[10px] mt-1 bg-yellow-50 border border-yellow-100 rounded p-1 text-yellow-700 text-center">
                  <span className="font-medium">Parcialmente ocupado:</span><br/>
                  <span className="text-orange-700">
                    {previousAppointment.patientName}<br/>
                    {previousAppointment.serviceType === "Extracción & Colocación de DIU" ? "DIU" : 
                     previousAppointment.serviceType === "Terapia de Ginecología Regenerativa" ? "Terapia" : 
                     previousAppointment.serviceType}
                  </span>
                </div>
              )}
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
}