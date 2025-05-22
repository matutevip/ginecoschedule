import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/apiClient";
import { addMonths, format, parse, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart, LineChart, PieChart, Bar, Line, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

export default function AdminStatistics() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para filtrar por mes/año
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Colores para los gráficos
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const month = currentMonth.getMonth() + 1; // date-fns usa 0-11 para meses, API usa 1-12
        const year = currentMonth.getFullYear();
        
        const response = await apiClient(`/api/admin/statistics?month=${month}&year=${year}`);
        setStats(response);
        setError(null);
      } catch (err: any) {
        console.error("Error al cargar estadísticas:", err);
        setError(err.message || "Error al cargar estadísticas");
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [currentMonth]);
  
  const handlePreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  // Formatear los datos para los gráficos
  const getServiceTypeData = () => {
    if (!stats || !stats.serviceTypeCount) return [];
    
    return Object.entries(stats.serviceTypeCount).map(([name, count]) => ({
      name,
      value: count
    }));
  };
  
  const getStatusData = () => {
    if (!stats || !stats.statusCount) return [];
    
    return Object.entries(stats.statusCount).map(([name, count]) => ({
      name: name === "scheduled" ? "Programado" : 
            name === "completed" ? "Completado" : 
            name === "cancelled" ? "Cancelado" : 
            name === "noshow" ? "No asistió" : name,
      value: count
    }));
  };
  
  const getWeekdayData = () => {
    if (!stats || !stats.weekdayCount) return [];
    
    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    
    return Object.entries(stats.weekdayCount)
      .map(([dayNumber, count]) => ({
        name: dayNames[parseInt(dayNumber)],
        count: count
      }))
      .sort((a, b) => {
        // Ordenar por día de la semana (0 = domingo)
        const dayA = dayNames.indexOf(a.name);
        const dayB = dayNames.indexOf(b.name);
        return dayA - dayB;
      });
  };
  
  return (
    <AdminLayout>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Estadísticas</h1>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      
        {loading && (
          <div className="flex justify-center items-center h-60">
            <p>Cargando estadísticas...</p>
          </div>
        )}
        
        {error && (
          <div className="text-red-500 text-center p-4">
            {error}
          </div>
        )}
        
        {!loading && !error && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tarjeta de resumen */}
            <Card>
              <CardHeader>
                <CardTitle>Resumen del mes</CardTitle>
                <CardDescription>Datos generales de {format(currentMonth, 'MMMM yyyy', { locale: es })}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary/10 p-4 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Total de citas</p>
                    <p className="text-3xl font-bold">{stats.totalAppointments || 0}</p>
                  </div>
                  <div className="bg-green-500/10 p-4 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Completadas</p>
                    <p className="text-3xl font-bold">{stats.statusCount?.completed || 0}</p>
                  </div>
                  <div className="bg-red-500/10 p-4 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Cancelaciones</p>
                    <p className="text-3xl font-bold">{stats.statusCount?.cancelled || 0}</p>
                  </div>
                  <div className="bg-amber-500/10 p-4 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">No asistieron</p>
                    <p className="text-3xl font-bold">{stats.statusCount?.noshow || 0}</p>
                  </div>
                </div>
                
                {stats.totalAppointments > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">Tasa de asistencia</p>
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-primary rounded-full" 
                        style={{ 
                          width: `${(stats.statusCount?.completed || 0) / stats.totalAppointments * 100}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-sm mt-1">
                      {Math.round((stats.statusCount?.completed || 0) / stats.totalAppointments * 100)}%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Gráfico de tipos de servicio */}
            <Card>
              <CardHeader>
                <CardTitle>Servicios solicitados</CardTitle>
                <CardDescription>Distribución por tipo de servicio</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {getServiceTypeData().length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getServiceTypeData()}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {getServiceTypeData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-muted-foreground">No hay datos disponibles</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Gráfico por día de la semana */}
            <Card>
              <CardHeader>
                <CardTitle>Citas por día de la semana</CardTitle>
                <CardDescription>Distribución de citas según el día</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {getWeekdayData().length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getWeekdayData()}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" name="Citas" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-muted-foreground">No hay datos disponibles</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Gráfico de estado de citas */}
            <Card>
              <CardHeader>
                <CardTitle>Estado de citas</CardTitle>
                <CardDescription>Distribución por estado</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {getStatusData().length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getStatusData()}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {getStatusData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-muted-foreground">No hay datos disponibles</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}