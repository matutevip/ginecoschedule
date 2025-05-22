import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

// Esquema de validación para cambio de contraseña
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "La contraseña actual es requerida"),
  newPassword: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string().min(6, "La confirmación de contraseña es requerida"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

// Esquema de validación para cambio de nombre de usuario
const usernameSchema = z.object({
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
});

type UsernameFormData = z.infer<typeof usernameSchema>;

// Esquema para solicitar recuperación de contraseña
const resetSchema = z.object({
  email: z.string().email("Debe ingresar un email válido"),
});

type ResetFormData = z.infer<typeof resetSchema>;

export function AccountSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Formulario para cambio de contraseña
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Formulario para cambio de nombre de usuario
  const usernameForm = useForm<UsernameFormData>({
    resolver: zodResolver(usernameSchema),
    defaultValues: {
      username: "",
    },
  });

  // Formulario para recuperación de contraseña
  const resetForm = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: "",
    },
  });

  // Función para cambiar la contraseña
  const onChangePassword = async (data: PasswordFormData) => {
    setIsLoading(true);
    try {
      await apiRequest(
        "POST",
        "/api/admin/change-password",
        {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }
      );

      toast({
        title: "Contraseña actualizada",
        description: "La contraseña ha sido actualizada correctamente.",
        variant: "default",
      });

      passwordForm.reset();
    } catch (error) {
      console.error("Error changing password:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Ha ocurrido un error al cambiar la contraseña. Verifique que la contraseña actual sea correcta.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Función para cambiar el nombre de usuario
  const onChangeUsername = async (data: UsernameFormData) => {
    setIsLoading(true);
    try {
      await apiRequest(
        "POST",
        "/api/admin/change-username",
        {
          username: data.username,
        }
      );

      toast({
        title: "Nombre de usuario actualizado",
        description: "El nombre de usuario ha sido actualizado correctamente.",
        variant: "default",
      });

      usernameForm.reset();
    } catch (error) {
      console.error("Error changing username:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Ha ocurrido un error al cambiar el nombre de usuario.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Función para solicitar recuperación de contraseña
  const onRequestReset = async (data: ResetFormData) => {
    setIsLoading(true);
    try {
      await apiRequest(
        "POST",
        "/api/admin/request-password-reset",
        {
          email: data.email,
        }
      );

      toast({
        title: "Solicitud enviada",
        description: "Se ha enviado un correo con instrucciones para restablecer su contraseña.",
        variant: "default",
      });

      resetForm.reset();
    } catch (error) {
      console.error("Error requesting password reset:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Ha ocurrido un error al solicitar el restablecimiento de contraseña.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div>
        <h3 className="text-xl font-medium">Configuración de cuenta</h3>
        <p className="text-sm text-muted-foreground">
          Gestione los detalles de su cuenta y sus credenciales de acceso
        </p>
      </div>
      <Separator />

      <Tabs defaultValue="password" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="password">Cambiar contraseña</TabsTrigger>
          <TabsTrigger value="username">Cambiar nombre de usuario</TabsTrigger>
        </TabsList>

        <TabsContent value="password" className="space-y-4 mt-4">
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cambiar contraseña</CardTitle>
              <CardDescription>
                Actualice su contraseña para mantener la seguridad de su cuenta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña actual</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Ingrese su contraseña actual" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nueva contraseña</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Ingrese la nueva contraseña" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar contraseña</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirme la nueva contraseña" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Actualizando..." : "Actualizar contraseña"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">¿Olvidó su contraseña?</CardTitle>
              <CardDescription>
                Solicite un restablecimiento de contraseña si no puede iniciar sesión
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...resetForm}>
                <form onSubmit={resetForm.handleSubmit(onRequestReset)} className="space-y-4">
                  <FormField
                    control={resetForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo electrónico</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="nombre@ejemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" variant="outline" disabled={isLoading}>
                    {isLoading ? "Enviando..." : "Solicitar restablecimiento"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="username" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cambiar nombre de usuario</CardTitle>
              <CardDescription>
                Actualice su nombre de usuario para iniciar sesión
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...usernameForm}>
                <form onSubmit={usernameForm.handleSubmit(onChangeUsername)} className="space-y-4">
                  <FormField
                    control={usernameForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nuevo nombre de usuario</FormLabel>
                        <FormControl>
                          <Input placeholder="Ingrese el nuevo nombre de usuario" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Actualizando..." : "Actualizar nombre de usuario"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}