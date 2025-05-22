import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle, AlertTriangle } from "lucide-react";

interface AppointmentInfo {
  id: number;
  patientName: string;
  appointmentTime: string;
  serviceType: string;
  valid: boolean;
  message?: string;
}

export default function CancelarTurno() {
  const [location, setLocation] = useLocation();
  const [tokenFromUrl, setTokenFromUrl] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Extraer el token de la URL al cargar la página
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token');
    setTokenFromUrl(token);
  }, []);

  // Consultar información del turno usando el token
  const { data: appointmentInfo, isLoading, error } = useQuery({
    queryKey: ['/api/appointments/validate-token', tokenFromUrl],
    queryFn: async () => {
      if (!tokenFromUrl) return null;
      
      const response = await fetch(`/api/appointments/validate-token?token=${tokenFromUrl}`);
      if (!response.ok) {
        throw new Error('No se pudo validar el token');
      }
      return response.json() as Promise<AppointmentInfo>;
    },
    enabled: !!tokenFromUrl, // Solo ejecutar si hay un token
  });

  async function handleCancelAppointment() {
    if (!tokenFromUrl || !appointmentInfo?.valid) return;
    
    try {
      setCancelling(true);
      
      const response = await fetch('/api/appointments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenFromUrl })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setCancelResult({
          success: true,
          message: 'Su turno ha sido cancelado exitosamente.'
        });
      } else {
        setCancelResult({
          success: false,
          message: result.message || 'Ocurrió un error al cancelar el turno.'
        });
      }
    } catch (error) {
      setCancelResult({
        success: false,
        message: 'Ocurrió un error al procesar su solicitud.'
      });
    } finally {
      setCancelling(false);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return format(date, "EEEE d 'de' MMMM 'a las' HH:mm 'hs'", { locale: es });
  }

  return (
    <div className="min-h-screen bg-violet-50/50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-violet-800">Cancelación de Turno</h1>
          <p className="text-gray-600">Dra. Jazmín Montañés</p>
        </div>
        
        <Card className="p-6 shadow-md">
          {isLoading && (
            <div className="py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-700 mx-auto mb-4" />
              <p>Verificando información del turno...</p>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                No se pudo validar la información del turno. El enlace podría estar vencido o ser inválido.
              </AlertDescription>
            </Alert>
          )}

          {appointmentInfo && !appointmentInfo.valid && (
            <div className="text-center py-6">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Enlace no válido</h2>
              <p className="text-gray-600 mb-4">{appointmentInfo.message || 'Este enlace ha expirado o ya no es válido.'}</p>
              <Button 
                variant="outline" 
                onClick={() => setLocation('/')}
                className="mt-4"
              >
                Volver al inicio
              </Button>
            </div>
          )}

          {appointmentInfo && appointmentInfo.valid && !cancelResult && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Confirmación de cancelación</h2>
              
              <div className="bg-gray-50 p-4 rounded-md mb-6">
                <p className="mb-2"><strong>Paciente:</strong> {appointmentInfo.patientName}</p>
                <p className="mb-2"><strong>Fecha y hora:</strong> {formatDate(appointmentInfo.appointmentTime)}</p>
                <p><strong>Servicio:</strong> {appointmentInfo.serviceType}</p>
              </div>
              
              <Alert className="mb-6 bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Importante</AlertTitle>
                <AlertDescription>
                  Está a punto de cancelar su turno médico. Esta acción no se puede deshacer.
                </AlertDescription>
              </Alert>
              
              <div className="flex flex-col space-y-3">
                <Button 
                  onClick={handleCancelAppointment} 
                  disabled={cancelling}
                  variant="destructive"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : 'Confirmar cancelación'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => window.history.back()}
                  disabled={cancelling}
                >
                  Volver atrás
                </Button>
              </div>
            </div>
          )}

          {cancelResult && (
            <div className="text-center py-6">
              {cancelResult.success ? (
                <>
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Turno cancelado</h2>
                </>
              ) : (
                <>
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">No se pudo cancelar el turno</h2>
                </>
              )}
              
              <p className="text-gray-600 mb-6">{cancelResult.message}</p>
              
              <Separator className="my-6" />
              
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-4">
                  Si necesita ayuda adicional, puede contactarnos a:
                </p>
                <p className="text-sm mb-1">
                  <a href="mailto:info@jazmingineco.com.ar" className="text-violet-700 hover:underline">info@jazmingineco.com.ar</a>
                </p>
                <p className="text-sm">
                  <a href="https://wa.me/541138151880" className="text-violet-700 hover:underline">WhatsApp: +54 11 3815-1880</a>
                </p>
              </div>
              
              <Button 
                variant="outline" 
                onClick={() => setLocation('/')}
                className="mt-6 w-full"
              >
                Volver al inicio
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
