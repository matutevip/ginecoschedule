import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";

export default function Confirmation() {
  const [_, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">¡Turno Confirmado!</h1>
          <p className="mb-6 text-gray-600">
            Gracias por reservar tu cita con la Dra. Jazmín Montañes. Recibirás
            un correo de confirmación en breve.
          </p>
          <Button onClick={() => navigate("/")} className="w-full">
            Volver al Inicio
          </Button>
          <p className="text-xs text-gray-400 mt-6">
            Desarrollo y diseño por <a 
              href="https://cafeenjarritoweb.com" 
              target="_blank"
              className="hover:text-primary transition-colors"
            >
              cafeenjarritoweb
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
