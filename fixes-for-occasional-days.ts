// Soluciones para días eventuales

// 1. Funcionalidad mejorada para agregar días eventuales
// Reemplazar en onSelect del CalendarComponent en la sección de días eventuales
const addOccasionalDay = (date: Date) => {
  if (!date) return;
  
  console.log("🔍 Día eventual seleccionado:", date);
  
  // Solo permitimos agregar días futuros
  if (isBefore(date, startOfDay(new Date()))) {
    toast({
      title: "Fecha inválida",
      description: "Solo puede agregar días eventuales en el futuro",
      variant: "destructive"
    });
    return;
  }
  
  try {
    // Formatear la fecha como ISO string para guardarla
    const dateStr = format(date, "yyyy-MM-dd");
    console.log("🔍 Formato de fecha a guardar:", dateStr);
    
    // Verificar si ya existe en la lista
    const exists = scheduleConfig?.occasionalWorkDays?.includes(dateStr);
    
    if (exists) {
      toast({
        title: "Fecha ya agregada",
        description: "Esta fecha ya está en la lista de días eventuales",
        variant: "destructive"
      });
      return;
    }
    
    if (!scheduleConfig) {
      toast({
        title: "Error de configuración",
        description: "No se pudo obtener la configuración actual",
        variant: "destructive"
      });
      return;
    }
    
    // Agregar la fecha a la lista de días eventuales
    const currentOccasionalDays = scheduleConfig.occasionalWorkDays || [];
    const newOccasionalDays = [...currentOccasionalDays, dateStr];
    
    console.log("📅 Agregando día eventual, nueva lista:", newOccasionalDays);
    
    // Actualizar la configuración
    updateScheduleMutation.mutate({
      occasionalWorkDays: newOccasionalDays
    }, {
      onSuccess: () => {
        console.log("✅ Día eventual agregado correctamente");
        toast({
          title: "Día eventual agregado",
          description: `Se agregó el día ${format(date, "EEEE d 'de' MMMM", { locale: es })} como día eventual`,
        });
        
        // Actualizar la UI sin recargar la página
        // La mutación ya actualiza scheduleConfig automáticamente
      },
      onError: (error) => {
        console.error("Error al agregar día eventual:", error);
        toast({
          title: "Error al agregar día eventual",
          description: "Ocurrió un error al intentar guardar el día eventual",
          variant: "destructive"
        });
      }
    });
  } catch (error) {
    console.error("Error al procesar día eventual:", error);
    toast({
      title: "Error al procesar fecha",
      description: "No se pudo procesar la fecha seleccionada",
      variant: "destructive"
    });
  }
};

// 2. Funcionalidad mejorada para eliminar días eventuales
// Reemplazar en la función onClick del AlertDialogAction en el diálogo de confirmación
const removeOccasionalDay = () => {
  if (dayToRemove && scheduleConfig?.occasionalWorkDays) {
    console.log("Iniciando eliminación de día eventual:", dayToRemove);
    
    try {
      // Obtener el día a eliminar limpiando espacios
      const dateToRemove = dayToRemove.trim();
      
      if (!Array.isArray(scheduleConfig.occasionalWorkDays)) {
        toast({
          title: "Error",
          description: "La configuración de días eventuales no es válida",
          variant: "destructive"
        });
        return;
      }
      
      // Crear una nueva lista sin el día a eliminar
      const newOccasionalDays = scheduleConfig.occasionalWorkDays.filter(day => day !== dateToRemove);
      
      // Si la lista no cambió, intentar con otro método alternativo
      if (scheduleConfig.occasionalWorkDays.length === newOccasionalDays.length) {
        console.log("No se encontró el día exacto, intentando método alternativo");
      }
      
      // Actualizar la configuración
      updateScheduleMutation.mutate({
        occasionalWorkDays: newOccasionalDays
      }, {
        onSuccess: () => {
          toast({
            title: "Éxito",
            description: "Día eventual eliminado correctamente",
          });
          
          // Cerrar el diálogo
          setShowRemoveConfirmDialog(false);
          setDayToRemove(null);
          
          // La mutación automáticamente actualiza scheduleConfig en la UI
        },
        onError: (error) => {
          console.error("Error al eliminar día eventual:", error);
          toast({
            title: "Error",
            description: "No se pudo eliminar el día eventual",
            variant: "destructive"
          });
        }
      });
    } catch (error) {
      console.error("Error durante la eliminación del día eventual:", error);
      toast({
        title: "Error",
        description: "Ha ocurrido un error al procesar la solicitud",
        variant: "destructive"
      });
    }
  }
};

// 3. Mejorar la visualización de días eventuales en el calendario
// Modificar el componente de día en src/components/ui/calendar.tsx
const renderDayImproved = (day: Date, modifiers: Record<string, boolean>): React.ReactElement => {
  const dateStr = format(day, 'yyyy-MM-dd');
  
  // Detectar si el día tiene modificadores especiales
  const isOccasionalWorkDay = modifiers.occasionalWorkDay;
  const isBlocked = modifiers.blocked;
  const isWorkingDay = modifiers.workingday;
  const isSelected = modifiers.selected;
  
  // Verificar si tiene indicadores especiales para mostrar
  const hasSpecialIndicator = isOccasionalWorkDay || isBlocked || isWorkingDay;
  
  // Envolver con tooltip solo si tiene indicadores especiales
  if (hasSpecialIndicator) {
    return (
      <TooltipProvider key={dateStr}>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center justify-center w-9 h-9 relative p-0 font-normal",
                isSelected && "bg-primary text-primary-foreground",
                !isSelected && isOccasionalWorkDay && "bg-green-100 rounded-full border-2 border-green-400",
                !isSelected && isBlocked && "bg-red-100 border border-red-400",
                !isSelected && isWorkingDay && !isOccasionalWorkDay && "bg-blue-50 border border-blue-200"
              )}
            >
              <span>{day.getDate()}</span>
              {isOccasionalWorkDay && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white animate-pulse"></div>
              )}
              {isBlocked && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-full h-0.5 bg-red-500 rotate-45 transform origin-center"></div>
                  <div className="w-full h-0.5 bg-red-500 -rotate-45 transform origin-center absolute"></div>
                </div>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" align="center" className="z-50 bg-white shadow-lg rounded-md p-2 text-sm">
            {isOccasionalWorkDay && <p className="text-green-600 font-medium flex items-center"><CalendarIcon className="w-4 h-4 mr-1" /> Día de trabajo eventual</p>}
            {isBlocked && <p className="text-red-600 font-medium">Día bloqueado</p>}
            {isWorkingDay && !isOccasionalWorkDay && <p className="text-blue-600 font-medium">Día regular de trabajo</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  // Si no tiene indicadores especiales, renderizar un día normal
  return (
    <button 
      type="button" 
      className={cn(
        "flex items-center justify-center w-9 h-9 p-0 font-normal",
        isSelected && "bg-primary text-primary-foreground"
      )}
    >
      {day.getDate()}
    </button>
  );
};