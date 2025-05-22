import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { IntegratedCalendarSettings } from "@/components/admin/integrated-calendar-settings";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { AdminLayout } from "@/components/admin/admin-layout";

export default function AdminCalendarPage() {
  const { toast } = useToast();

  // Consulta para obtener la configuración del horario
  const { 
    data: scheduleConfig, 
    isLoading: scheduleLoading, 
    isError: scheduleError, 
  } = useQuery({
    queryKey: ['/api/admin/schedule-config'],
    retry: 1,
    refetchOnWindowFocus: false,
  });
  
  // Consulta para obtener días bloqueados
  const { 
    data: blockedDays = [], 
    isLoading: blockedDaysLoading, 
    isError: blockedDaysError, 
  } = useQuery({
    queryKey: ['/api/admin/blocked-days'],
    retry: 1,
    refetchOnWindowFocus: false,
  });
  
  const isLoading = scheduleLoading || blockedDaysLoading;
  const isError = scheduleError || blockedDaysError;
  
  useEffect(() => {
    // Mensaje si hay error al cargar la configuración
    if (isError) {
      toast({
        title: "Error",
        description: "No se pudieron cargar algunos datos. Intenta recargar la página.",
        variant: "destructive",
      });
    }
  }, [isError, toast]);
  
  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Configuración de Calendario</h1>
          <div className="flex space-x-2">
            <Button asChild variant="outline">
              <Link href="/admin">
                Volver al Panel
              </Link>
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Cargando configuración...</p>
            </div>
          </div>
        ) : !scheduleConfig ? (
          <div className="text-center py-8 text-gray-500">
            No se pudo cargar la configuración. Intenta recargar la página.
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-gray-600">
              Configura los días del calendario, incluyendo días eventuales con horarios específicos y días bloqueados.
            </p>
            
            <IntegratedCalendarSettings 
              scheduleConfig={scheduleConfig} 
              blockedDays={blockedDays}
            />
            
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Información importante</h3>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>Los días eventuales se muestran en el calendario público como días disponibles para agendar citas.</li>
                <li>Puedes definir un horario específico para cada día eventual, que puede ser diferente del horario regular.</li>
                <li>Los días bloqueados no estarán disponibles para agendar citas en el calendario público.</li>
                <li>No es posible configurar un día eventual sobre un día que ya está bloqueado, y viceversa.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}