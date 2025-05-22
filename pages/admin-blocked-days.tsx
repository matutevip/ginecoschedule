import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BlockedDaysCalendar } from "@/components/admin/blocked-days-calendar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { AdminLayout } from "@/components/admin/admin-layout";

export default function AdminBlockedDaysPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Consulta para obtener días bloqueados
  const { 
    data: blockedDays = [], 
    isLoading, 
    isError, 
    refetch 
  } = useQuery({
    queryKey: ['/api/admin/blocked-days'],
    retry: 1,
    refetchOnWindowFocus: false,
  });
  
  useEffect(() => {
    // Mensaje si hay error al cargar los días bloqueados
    if (isError) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los días bloqueados",
        variant: "destructive",
      });
    }
  }, [isError, toast]);
  
  // Función para actualizar la lista de días bloqueados
  const handleBlockedDaysUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/blocked-days'] });
  };
  
  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Gestión de Días Bloqueados</h1>
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
              <p>Cargando días bloqueados...</p>
            </div>
          </div>
        ) : (
          <BlockedDaysCalendar 
            blockedDays={blockedDays} 
            onBlockedDaysUpdated={handleBlockedDaysUpdated}
          />
        )}
      </div>
    </AdminLayout>
  );
}