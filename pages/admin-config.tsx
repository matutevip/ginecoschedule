import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IntegratedCalendarSettings } from "@/components/admin/integrated-calendar-settings";

// Importaciones para Google Calendar
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/apiClient";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarClock, Mail, AlertTriangle, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";

export default function AdminConfig() {
  const [activeTab, setActiveTab] = useState("regular-schedule");
  const { toast } = useToast();
  
  // Estado para la configuración de Google Calendar
  const [googleCalendarEnabled, setGoogleCalendarEnabled] = useState(false);
  const [googleCalendarStatus, setGoogleCalendarStatus] = useState<"checking" | "enabled" | "disabled" | "error">("checking");
  
  // Estado para los mensajes
  const [messageConfig, setMessageConfig] = useState({
    appointmentConfirmation: "",
    appointmentReminder: "",
    appointmentCancellation: "",
    paymentLink: ""
  });
  
  // Cargar configuración al iniciar con useEffect
  useEffect(() => {
    let isMounted = true;
    
    // Cargar estado de Google Calendar
    const checkGoogleCalendarStatus = async () => {
      try {
        const response = await apiClient('/api/admin/google-calendar/status');
        if (isMounted) {
          setGoogleCalendarEnabled(response.enabled);
          setGoogleCalendarStatus(response.enabled ? "enabled" : "disabled");
        }
      } catch (error) {
        console.error("Error al verificar estado de Google Calendar:", error);
        if (isMounted) {
          setGoogleCalendarStatus("error");
        }
      }
    };
    
    // Cargar mensajes
    const loadMessageTemplates = async () => {
      try {
        const response = await apiClient('/api/admin/message-templates');
        if (isMounted) {
          setMessageConfig(response);
        }
      } catch (error) {
        console.error("Error al cargar plantillas de mensajes:", error);
      }
    };
    
    checkGoogleCalendarStatus();
    loadMessageTemplates();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Obtener configuración del horario y días bloqueados
  const { data: scheduleConfig } = useQuery({
    queryKey: ['/api/admin/schedule-config'],
    staleTime: 1000 * 60, // 1 minuto
  });
  
  const { data: blockedDays = [] } = useQuery({
    queryKey: ['/api/admin/blocked-days'],
    staleTime: 1000 * 60, // 1 minuto
  });
  
  // Manejar cambio en Google Calendar
  const handleGoogleCalendarToggle = async () => {
    try {
      setGoogleCalendarStatus("checking");
      
      const response = await apiClient('/api/admin/google-calendar/toggle', {
        method: 'POST',
        data: { enabled: !googleCalendarEnabled }
      });
      
      setGoogleCalendarEnabled(response.enabled);
      setGoogleCalendarStatus(response.enabled ? "enabled" : "disabled");
      
      toast({
        title: response.enabled ? "Google Calendar activado" : "Google Calendar desactivado",
        description: response.enabled 
          ? "Las citas se sincronizarán automáticamente con Google Calendar" 
          : "Las citas ya no se sincronizarán con Google Calendar",
      });
    } catch (error) {
      setGoogleCalendarStatus("error");
      
      toast({
        title: "Error",
        description: "No se pudo cambiar la configuración de Google Calendar",
        variant: "destructive",
      });
    }
  };
  
  // Guardar plantillas de mensajes
  const handleSaveMessageTemplates = async () => {
    try {
      await apiClient('/api/admin/message-templates', {
        method: 'POST',
        data: messageConfig
      });
      
      toast({
        title: "Plantillas guardadas",
        description: "Las plantillas de mensajes han sido actualizadas",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron guardar las plantillas de mensajes",
        variant: "destructive",
      });
    }
  };
  
  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold tracking-tight mb-6">Configuración del sistema</h1>
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 grid grid-cols-4 h-auto">
            <TabsTrigger value="regular-schedule" className="py-3">
              Horarios regulares
            </TabsTrigger>
            <TabsTrigger value="occasional-days" className="py-3">
              Días eventuales
            </TabsTrigger>
            <TabsTrigger value="blocked-days" className="py-3">
              Días bloqueados
            </TabsTrigger>
            <TabsTrigger value="google-calendar" className="py-3">
              Google Calendar
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="regular-schedule">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de horarios regulares</CardTitle>
                <CardDescription>
                  Configure los días y horarios de atención regulares
                </CardDescription>
              </CardHeader>
              <CardContent>
                <IntegratedCalendarSettings 
                  activeTab="regular-schedule" 
                  scheduleConfig={scheduleConfig} 
                  blockedDays={blockedDays} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="occasional-days">
            <Card>
              <CardHeader>
                <CardTitle>Días de atención eventuales</CardTitle>
                <CardDescription>
                  Configure días específicos adicionales para atención
                </CardDescription>
              </CardHeader>
              <CardContent>
                <IntegratedCalendarSettings 
                  activeTab="occasional-days" 
                  scheduleConfig={scheduleConfig} 
                  blockedDays={blockedDays} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="blocked-days">
            <Card>
              <CardHeader>
                <CardTitle>Días bloqueados</CardTitle>
                <CardDescription>
                  Configure días en los que no habrá atención
                </CardDescription>
              </CardHeader>
              <CardContent>
                <IntegratedCalendarSettings 
                  activeTab="blocked-days" 
                  scheduleConfig={scheduleConfig} 
                  blockedDays={blockedDays} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="google-calendar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CalendarClock className="mr-2 h-5 w-5" />
                    Integración con Google Calendar
                  </CardTitle>
                  <CardDescription>
                    Sincronice las citas con su calendario de Google
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {googleCalendarStatus === "checking" ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <p>Verificando estado...</p>
                    </div>
                  ) : googleCalendarStatus === "error" ? (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        No se pudo obtener el estado de la integración con Google Calendar.
                        Por favor, intente nuevamente más tarde.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2 mb-4">
                        <Switch 
                          id="google-calendar-toggle"
                          checked={googleCalendarEnabled}
                          onCheckedChange={handleGoogleCalendarToggle}
                        />
                        <Label htmlFor="google-calendar-toggle">
                          {googleCalendarEnabled ? "Integración activa" : "Integración inactiva"}
                        </Label>
                      </div>
                      
                      {googleCalendarEnabled ? (
                        <Alert variant="default" className="bg-green-50 text-green-800 border-green-200">
                          <Check className="h-4 w-4" />
                          <AlertTitle>Integración activa</AlertTitle>
                          <AlertDescription>
                            Las citas se están sincronizando automáticamente con Google Calendar.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert variant="default" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Integración inactiva</AlertTitle>
                          <AlertDescription>
                            Las citas no se están sincronizando con Google Calendar.
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Mail className="mr-2 h-5 w-5" />
                    Plantillas de mensajes
                  </CardTitle>
                  <CardDescription>
                    Configure los mensajes automáticos enviados a pacientes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="confirmation-template">Mensaje de confirmación de cita</Label>
                      <Textarea 
                        id="confirmation-template"
                        value={messageConfig.appointmentConfirmation}
                        onChange={(e) => setMessageConfig({...messageConfig, appointmentConfirmation: e.target.value})}
                        placeholder="Escriba el mensaje de confirmación de cita"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="reminder-template">Mensaje de recordatorio de cita</Label>
                      <Textarea 
                        id="reminder-template"
                        value={messageConfig.appointmentReminder}
                        onChange={(e) => setMessageConfig({...messageConfig, appointmentReminder: e.target.value})}
                        placeholder="Escriba el mensaje de recordatorio de cita"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="cancellation-template">Mensaje de cancelación de cita</Label>
                      <Textarea 
                        id="cancellation-template"
                        value={messageConfig.appointmentCancellation}
                        onChange={(e) => setMessageConfig({...messageConfig, appointmentCancellation: e.target.value})}
                        placeholder="Escriba el mensaje de cancelación de cita"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="payment-link">Link de pago (opcional)</Label>
                      <Input 
                        id="payment-link"
                        value={messageConfig.paymentLink}
                        onChange={(e) => setMessageConfig({...messageConfig, paymentLink: e.target.value})}
                        placeholder="Ingrese el link para pago de consultas"
                        className="mt-1"
                      />
                    </div>
                    
                    <Button onClick={handleSaveMessageTemplates}>Guardar plantillas</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}