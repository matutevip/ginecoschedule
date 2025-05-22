import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQueryFn, apiRequest } from '@/lib/queryClient';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Calendar, AlertCircle, CheckCircle2, Power, RefreshCw } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface GoogleCalendarStatusResponse {
  initialized: boolean;
  enabled: boolean;
  message: string;
}

export function GoogleCalendarStatus() {
  const [showSetupInstructions, setShowSetupInstructions] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useQuery<GoogleCalendarStatusResponse>({
    queryKey: ['/api/admin/google-calendar-status'],
    queryFn: getQueryFn({ on401: "throw" })
  });

  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest("PATCH", "/api/admin/google-calendar-status", { enabled });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error al actualizar la integración con Google Calendar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/google-calendar-status'] });
      toast({
        title: "Configuración actualizada",
        description: "La configuración de Google Calendar ha sido actualizada exitosamente."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation para la sincronización manual
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/google-calendar-sync", {});
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error al sincronizar con Google Calendar");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/appointments'] });
      toast({
        title: "Sincronización completada",
        description: data.message || `Sincronización exitosa. Se actualizaron ${data.updated} citas.`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error de sincronización",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar Integration
          </CardTitle>
          <CardDescription>
            Verificando estado de la integración con Google Calendar...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Error de Integración
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>No se pudo verificar el estado de la integración con Google Calendar.</p>
        </CardContent>
      </Card>
    );
  }

  const handleToggleIntegration = (checked: boolean) => {
    mutation.mutate(checked);
  };

  const areCredentialsConfigured = data?.initialized;
  const isIntegrationEnabled = data?.enabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar Integration
        </CardTitle>
        <CardDescription>
          Integración para sincronizar citas con Google Calendar (Solo App → Google Calendar)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {areCredentialsConfigured ? (
          <>
            <Alert className="bg-success/20 border-success">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertTitle>Credenciales Configuradas</AlertTitle>
              <AlertDescription>
                La integración con Google Calendar está correctamente configurada.
              </AlertDescription>
            </Alert>
            
            <div className="flex items-center justify-between space-x-2 mt-4 pt-4 border-t">
              <div>
                <h4 className="text-sm font-medium">Activar/Desactivar Integración</h4>
                <p className="text-sm text-muted-foreground">
                  {isIntegrationEnabled 
                    ? "La sincronización con Google Calendar está activada" 
                    : "La sincronización con Google Calendar está desactivada"}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="google-calendar-toggle"
                  checked={isIntegrationEnabled}
                  onCheckedChange={handleToggleIntegration}
                  disabled={mutation.isPending}
                />
                <Label htmlFor="google-calendar-toggle" className="sr-only">
                  Activar Google Calendar
                </Label>
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              </div>
            </div>
            
            <div className="flex items-center justify-between space-x-2 mt-4 pt-4 border-t">
              <div>
                <h4 className="text-sm font-medium">Sincronización Manual</h4>
                <p className="text-sm text-muted-foreground">
                  Sincronización temporal unidireccional (App → Google Calendar)
                </p>
                <p className="text-xs text-amber-500 mt-1">
                  <AlertCircle className="h-3 w-3 inline-block mr-1" />
                  La sincronización desde Google Calendar está temporalmente deshabilitada para evitar límites de tasa de la API
                </p>
              </div>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending || !isIntegrationEnabled}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                {syncMutation.isPending ? 'Sincronizando...' : 'Ver Estado'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Alert className="bg-muted border-muted-foreground/50">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Integración No Configurada</AlertTitle>
              <AlertDescription>
                La integración con Google Calendar no está configurada o tiene errores.
                Las citas no se sincronizarán con el calendario hasta que se configure correctamente.
              </AlertDescription>
            </Alert>

            {showSetupInstructions && (
              <div className="mt-4 text-sm border rounded-md p-4 bg-card">
                <h4 className="font-medium mb-2">Instrucciones de Configuración</h4>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Crear una cuenta de servicio en Google Cloud Platform</li>
                  <li>Habilitar la API de Google Calendar</li>
                  <li>Generar una clave privada para la cuenta de servicio</li>
                  <li>Compartir el calendario con la cuenta de servicio</li>
                  <li>Configurar las variables de entorno en el servidor:
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li><code className="bg-muted px-1 rounded">GOOGLE_CLIENT_EMAIL</code>: Email de la cuenta de servicio</li>
                      <li><code className="bg-muted px-1 rounded">GOOGLE_PRIVATE_KEY</code>: Clave privada de la cuenta de servicio</li>
                      <li><code className="bg-muted px-1 rounded">GOOGLE_CALENDAR_ID</code>: ID del calendario a utilizar</li>
                    </ul>
                  </li>
                </ol>
                <p className="mt-2">Consulte el archivo <code className="bg-muted px-1 rounded">GOOGLE_CALENDAR_SETUP.md</code> para instrucciones detalladas.</p>
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter>
        {!areCredentialsConfigured && (
          <Button 
            variant="outline" 
            onClick={() => setShowSetupInstructions(!showSetupInstructions)}
          >
            {showSetupInstructions ? 'Ocultar Instrucciones' : 'Mostrar Instrucciones de Configuración'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}