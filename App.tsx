import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Booking from "@/pages/booking";
import Confirmation from "@/pages/confirmation";
import CancelarTurno from "@/pages/cancelar-turno";
import AdminLogin from "@/pages/admin-login";
import ResetPassword from "@/pages/reset-password";
import Admin from "@/pages/admin";
import AdminOccasionalDays from "@/pages/admin-occasional-days";
import AdminBlockedDays from "@/pages/admin-blocked-days";
import AdminCalendar from "@/pages/admin-calendar";
import AdminStatistics from "@/pages/admin-statistics";
import AdminPatients from "@/pages/admin-patients";
import AdminConfig from "@/pages/admin-config";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

// Función para detectar si estamos en el subdominio admin
const isAdminSubdomain = () => {
  const hostname = window.location.hostname;
  console.log("Detección de subdominio admin - Hostname:", hostname);
  
  // Verificar si es un subdominio que comienza con "admin."
  const isSubdomain = hostname.startsWith("admin.");
  console.log("Hostname comienza con \"admin.\":", isSubdomain ? "SÍ" : "NO");
  
  // También podemos verificar si hay un parámetro en la URL para testeo local
  const urlParams = new URLSearchParams(window.location.search);
  const adminParam = urlParams.get('admin') === 'true';
  console.log("Parámetro admin en URL:", adminParam ? "SÍ" : "NO");
  
  return isSubdomain || adminParam;
};

function Router() {
  const [location, setLocation] = useLocation();
  
  // Redirigir a admin si estamos en el subdominio admin
  useEffect(() => {
    if (isAdminSubdomain() && location === "/") {
      // Si estamos en el subdominio admin y en la raíz, redirigir al panel admin
      setLocation("/admin");
    }
  }, [location, setLocation]);
  
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/book" component={Booking} />
      <Route path="/confirmation" component={Confirmation} />
      <Route path="/cancelar-turno" component={CancelarTurno} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/reset-password" component={ResetPassword} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/statistics" component={AdminStatistics} />
      <Route path="/admin/patients" component={AdminPatients} />
      <Route path="/admin/config" component={AdminConfig} />
      <Route path="/admin-occasional-days" component={AdminOccasionalDays} />
      <Route path="/admin-blocked-days" component={AdminBlockedDays} />
      <Route path="/admin-calendar" component={AdminCalendar} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
      </TooltipProvider>
      <Toaster />
    </QueryClientProvider>
  );
}