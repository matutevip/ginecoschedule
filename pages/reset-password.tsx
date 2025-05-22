import { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Loader2, Lock } from "lucide-react";

const resetPasswordSchema = z.object({
  email: z.string().email("Email inválido").min(1, "El email es requerido"),
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormData) => {
      // Esta es una simulación, ya que aún no tenemos el endpoint real
      // Aquí se implementaría la llamada al API real:
      // const res = await apiRequest("POST", "/api/admin/reset-password-request", data);
      // if (!res.ok) {
      //   const error = await res.json();
      //   throw new Error(error.message || "Error al solicitar cambio de contraseña");
      // }
      // return res.json();
      
      // Por ahora, simularemos una respuesta exitosa después de un retraso
      return new Promise((resolve) => {
        setTimeout(() => resolve({ success: true }), 1500);
      });
    },
    onSuccess: () => {
      setEmailSent(true);
      toast({
        title: "Solicitud enviada",
        description: "Se ha enviado un email con las instrucciones para restablecer su contraseña",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ResetPasswordFormData) => {
    resetMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20 px-4 py-8">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="mx-auto rounded-full bg-primary/10 p-3 w-12 h-12 flex items-center justify-center mb-2">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">
            {emailSent ? "Correo Enviado" : "Recuperar Contraseña"}
          </CardTitle>
          <CardDescription className="text-lg">
            {emailSent
              ? "Por favor, revise su correo electrónico"
              : "Ingrese su correo electrónico para recibir instrucciones"}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          {emailSent ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Hemos enviado un correo electrónico con instrucciones para restablecer su contraseña.
                Si no lo recibe en los próximos minutos, verifique su carpeta de spam.
              </p>
              <Button 
                onClick={() => navigate("/admin/login")} 
                className="w-full"
              >
                Volver al inicio de sesión
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo Electrónico</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="su-email@ejemplo.com" 
                          type="email"
                          {...field} 
                          disabled={resetMutation.isPending}
                          className="border-primary/20 focus-visible:ring-primary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col space-y-3 pt-2">
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={resetMutation.isPending}
                  >
                    {resetMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando...
                      </span>
                    ) : (
                      "Enviar instrucciones"
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex items-center gap-2 justify-center"
                    onClick={() => navigate("/admin/login")}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Volver al inicio de sesión
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} - Consultorio Médico
          </p>
          <p className="text-xs text-gray-400">
            Desarrollo y diseño por <a 
              href="https://cafeenjarritoweb.com" 
              target="_blank"
              className="hover:text-primary transition-colors"
            >
              cafeenjarritoweb
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}