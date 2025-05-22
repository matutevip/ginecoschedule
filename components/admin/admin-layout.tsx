import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Calendar, Clock, Settings, Users, Home, BarChart2, Calendar as CalendarIcon } from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  
  const navItems = [
    { href: "/admin", label: "Inicio", icon: Home },
    { href: "/admin/statistics", label: "Estadísticas", icon: BarChart2 },
    { href: "/admin/patients", label: "Pacientes", icon: Users },
    { href: "/admin/config", label: "Configuración", icon: Settings },
  ];
  
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-primary text-primary-foreground py-2 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <h1 className="text-lg font-bold">Sistema de Citas - Administración</h1>
          </div>
          <nav>
            <ul className="flex space-x-4">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>
                    <div 
                      className={`flex items-center space-x-1 px-2 py-1 rounded hover:bg-primary-foreground/10 cursor-pointer
                                ${location === item.href ? 'border-b-2 border-white font-medium' : ''}`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="hidden md:inline">{item.label}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      
      <main className="flex-1">
        {children}
      </main>
      
      <footer className="bg-muted py-2 text-sm text-center text-muted-foreground">
        <div className="container mx-auto">
          &copy; {new Date().getFullYear()} Sistema de Citas - Dra. Jazmin Montañés
        </div>
      </footer>
    </div>
  );
}