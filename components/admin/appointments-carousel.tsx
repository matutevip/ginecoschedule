import { type Appointment } from "@shared/schema";
import { useState } from "react";
import { AppointmentCard } from "./appointment-card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AppointmentsCarouselProps {
  appointments: Appointment[];
  onEdit?: (appointment: Appointment) => void;
  onDelete?: (id: number) => void;
  onReminder?: (id: number) => void;
  onViewHistory?: (patientId: number) => void;
  onCancel?: (id: number) => void;
}

export function AppointmentsCarousel({ appointments, onEdit, onDelete, onReminder, onViewHistory, onCancel }: AppointmentsCarouselProps) {
  const [scrollPosition, setScrollPosition] = useState(0);

  const scrollLeft = () => {
    const container = document.getElementById('appointments-container');
    if (container) {
      const newPosition = Math.max(scrollPosition - 350, 0);
      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  const scrollRight = () => {
    const container = document.getElementById('appointments-container');
    if (container) {
      const maxScroll = container.scrollWidth - container.clientWidth;
      const newPosition = Math.min(scrollPosition + 350, maxScroll);
      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  if (!appointments.length) {
    return (
      <div className="text-center p-6 bg-muted/20 rounded-lg">
        <p className="text-muted-foreground">No hay turnos programados</p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div 
        id="appointments-container"
        className="flex overflow-x-hidden scroll-smooth gap-4 px-4"
        style={{ whiteSpace: 'nowrap' }}
      >
        {appointments.map((appointment) => (
          <div key={appointment.id} className="inline-block w-[350px]">
            <AppointmentCard 
              appointment={appointment}
              onEdit={onEdit}
              onDelete={onDelete}
              onReminder={onReminder}
              onViewHistory={onViewHistory}
              onCancel={onCancel}
            />
          </div>
        ))}
      </div>

      <div className="absolute top-1/2 -translate-y-1/2 flex justify-between w-full px-4 pointer-events-none">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full pointer-events-auto bg-white/80 hover:bg-white"
          onClick={scrollLeft}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full pointer-events-auto bg-white/80 hover:bg-white"
          onClick={scrollRight}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}