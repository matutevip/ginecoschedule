import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Loader2, Lock, Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "El usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AdminLogin() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  // Check if already logged in
  const { data: user, isLoading: checkingAuth } = useQuery({
    queryKey: ["/api/admin/check"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/check");
      if (!res.ok) {
        return null;
      }
      return res.json();
    },
  });

  // Redirect to admin panel if already logged in
  useEffect(() => {
    if (user) {
      navigate("/admin");
    }
  }, [user, navigate]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginFormData) => {
      // Primero intentamos el login normal
      try {
        console.log("Intentando login normal");
        const res = await apiRequest("POST", "/api/admin/login", credentials);
        if (res.ok) {
          console.log("Login normal exitoso");
          return res.json();
        }

        console.log("Login normal falló, intentando login directo");

        // Si falla, intentamos el método directo
        const directRes = await apiRequest(
          "POST",
          "/api/admin/direct-login",
          credentials,
        );
        if (!directRes.ok) {
          const error = await directRes.json();
          throw new Error(error.message || "Error de autenticación");
        }

        console.log("Login directo exitoso");
        return directRes.json();
      } catch (err) {
        console.error("Error en login:", err);
        throw err;
      }
    },
    onSuccess: () => {
      console.log("Redirección al panel de administración");
      navigate("/admin");
    },
    onError: (error: Error) => {
      console.error("Error en mutación de login:", error);
      toast({
        title: "Error de autenticación",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20 px-4 py-8">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="mx-auto rounded-full bg-primary/10 p-3 w-12 h-12 flex items-center justify-center mb-2">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">
            Panel Administrativo
          </CardTitle>
          <CardDescription className="text-lg">
            Dra. Jazmín Montañés
            <br />
            Ginecología y Obstetricia
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ingrese su usuario"
                        {...field}
                        disabled={loginMutation.isPending}
                        className="border-primary/20 focus-visible:ring-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Ingrese su contraseña"
                          {...field}
                          disabled={loginMutation.isPending}
                          className="border-primary/20 focus-visible:ring-primary pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="text-xs text-muted-foreground p-0 h-auto"
                  onClick={() => navigate("/admin/reset-password")}
                >
                  ¿Olvidó su contraseña?
                </Button>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </span>
                ) : (
                  "Iniciar sesión"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} - Consultorio Dra. Montañés
          </p>
          <p className="text-xs text-gray-400">
            Desarrollo y diseño por{" "}
            <a
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
