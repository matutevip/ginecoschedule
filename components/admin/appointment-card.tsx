import { type Appointment } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { User, Calendar, Phone, Mail, Stethoscope, Building2, StickyNote, Edit, Trash2, Bell, FileText, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { AppointmentForm } from "./appointment-form";

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit?: (appointment: Appointment) => void;
  onDelete?: (id: number) => void;
  onReminder?: (id: number) => void;
  onViewHistory?: (patientId: number) => void;
  onCancel?: (id: number) => void;
}

export function AppointmentCard({ appointment, onEdit, onDelete, onReminder, onViewHistory, onCancel }: AppointmentCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    onEdit?.(appointment);
  };

  return (
    <>
      <Card className="h-full bg-white shadow hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <User className="h-5 w-5" />
              <h3 className="font-semibold">{appointment.patientName}</h3>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <p>{format(new Date(appointment.appointmentTime), "PPP 'a las' HH:mm", { locale: es })}</p>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <p>{appointment.phone}</p>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <p>{appointment.email}</p>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Stethoscope className="h-4 w-4" />
              <p>{appointment.serviceType}</p>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <p>{appointment.obraSocial}</p>
            </div>

            {appointment.notes && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <StickyNote className="h-4 w-4 mt-1" />
                <p className="text-sm">{appointment.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-primary/10">
              {onViewHistory && appointment.patientId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewHistory(appointment.patientId)}
                  className="hover:bg-primary/5"
                >
                  <FileText className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEditDialog(true)}
                className="hover:bg-primary/5"
              >
                <Edit className="h-4 w-4" />
              </Button>
              {onReminder && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReminder(appointment.id)}
                  className="hover:bg-primary/5"
                >
                  <Bell className="h-4 w-4" />
                </Button>
              )}
              {onCancel && appointment.status !== 'cancelled_by_patient' && appointment.status !== 'cancelled_by_professional' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCancel(appointment.id)}
                  className="hover:bg-primary/5 text-amber-600"
                  title="Cancelar turno"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(appointment.id)}
                  className="hover:bg-primary/5 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Turno</DialogTitle>
          </DialogHeader>
          <AppointmentForm
            mode="edit"
            initialData={appointment}
            onSuccess={handleEditSuccess}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}