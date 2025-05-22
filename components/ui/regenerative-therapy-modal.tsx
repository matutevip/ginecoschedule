import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RegenerativeTherapyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (hasHadInitialConsultation: boolean) => void;
}

export function RegenerativeTherapyModal({
  isOpen,
  onClose,
  onConfirm,
}: RegenerativeTherapyModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Información sobre Terapia de Ginecología Regenerativa</DialogTitle>
          <DialogDescription>
            Para cualquier tratamiento de Terapia de Ginecología Regenerativa se requiere una consulta inicial para evaluación.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="mb-4 text-sm text-gray-700">
            Por favor, indique si ya ha tenido una consulta inicial con la Dra. Montañés para este tratamiento.
          </p>
        </div>
        <DialogFooter className="flex sm:justify-between">
          <Button
            variant="outline"
            onClick={() => onConfirm(false)}
            className="flex-1 mr-2"
          >
            No, necesito consulta inicial
          </Button>
          <Button 
            onClick={() => onConfirm(true)}
            className="flex-1"
          >
            Sí, ya tuve consulta inicial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}