import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Appointment } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

interface TimeSlotProps {
  time: string;
  hour: string;
  minute: string;
  appointment?: Appointment;
  onClick: (time: string) => void;
}

export function TimeSlot({ time, hour, minute, appointment, onClick }: TimeSlotProps) {
  const hasAppointment = !!appointment;
  
  return (
    <div className="relative border border-dashed border-blue-200 rounded-md p-3 mb-3">
      <div className="flex items-start mb-2">
        <div className="text-blue-500 font-bold">{hour}:{minute}</div>
      </div>
      
      {hasAppointment ? (
        <div className="bg-white rounded-md p-2 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{appointment.patientName}</div>
              <div className="text-xs text-muted-foreground">{appointment.serviceType}</div>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 px-2"
              onClick={() => onClick(time)}
            >
              <Clock className="h-3 w-3 mr-1" />
              <span className="text-xs">Editar</span>
            </Button>
          </div>
        </div>
      ) : (
        <div 
          className="h-10 flex items-center justify-center cursor-pointer hover:bg-blue-50 rounded-md transition-colors"
          onClick={() => onClick(time)}
        >
          <span className="text-sm text-blue-500">Libre</span>
        </div>
      )}
    </div>
  );
}