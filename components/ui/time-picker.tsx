import React from "react";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";

interface TimePickerProps {
  date: Date;
  setDate: (date: Date) => void;
  disabled?: boolean;
  availableHours?: number[];
  availableMinutes?: number[];
  getAvailableMinutes?: (hour: number) => number[];
}

export function TimePicker({ 
  date, 
  setDate, 
  disabled = false, 
  availableHours,
  availableMinutes,
  getAvailableMinutes 
}: TimePickerProps) {
  const currentHour = date.getHours();
  let currentMinute = date.getMinutes();

  // Crear opciones de horas (de 8 a 20) o usar las proporcionadas
  const hours = availableHours || Array.from({ length: 13 }, (_, i) => i + 8);
  // Incluir slots de 20 y 30 minutos (0, 20, 30) o usar los proporcionados
  const defaultMinutes = [0, 20, 30];
  
  // Si se proporciona getAvailableMinutes, usar esa función para obtener minutos basados en la hora actual
  const minutesForCurrentHour = getAvailableMinutes ? getAvailableMinutes(currentHour) : null;
  const minutes = minutesForCurrentHour || availableMinutes || defaultMinutes;
  
  // Redondear los minutos actuales al valor más cercano (0, 20, 30)
  const normalizeMinutes = (mins: number): number => {
    if (mins < 10) return 0;
    if (mins < 25) return 20;
    if (mins < 45) return 30;
    return 0; // Si es >= 45, volvemos a 0 y se incrementaría la hora
  };
  
  // Normalizar los minutos si no son 0, 20 o 30
  if (![0, 20, 30].includes(currentMinute)) {
    currentMinute = normalizeMinutes(currentMinute);
  }
  
  const handleHourChange = (hour: string) => {
    const newDate = new Date(date);
    newDate.setHours(parseInt(hour, 10));
    setDate(newDate);
  };
  
  const handleMinuteChange = (minute: string) => {
    const newDate = new Date(date);
    newDate.setMinutes(parseInt(minute, 10));
    setDate(newDate);
  };
  
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <Label htmlFor="hours">Hora</Label>
          <Select
            disabled={disabled}
            value={currentHour.toString()}
            onValueChange={handleHourChange}
          >
            <SelectTrigger id="hours">
              <SelectValue placeholder="Hora" />
            </SelectTrigger>
            <SelectContent>
              {hours.map((hour) => (
                <SelectItem key={hour} value={hour.toString()}>
                  {hour.toString().padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="minutes">Minutos</Label>
          <Select
            disabled={disabled}
            value={currentMinute.toString()}
            onValueChange={handleMinuteChange}
          >
            <SelectTrigger id="minutes">
              <SelectValue placeholder="Minutos" />
            </SelectTrigger>
            <SelectContent>
              {minutes.map((minute) => (
                <SelectItem key={minute} value={minute.toString()}>
                  {minute.toString().padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}