import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useStatistics } from '@/hooks/use-statistics';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Colores para los gráficos
const COLORS = {
  primary: '#0079c1',
  success: '#4caf50',
  warning: '#ff9800',
  danger: '#f44336',
  info: '#2196f3',
  attended: '#4caf50',     // Verde
  pending: '#ff9800',       // Naranja
  confirmed: '#0079c1',     // Azul
  cancelled: '#f44336',     // Rojo
  noShow: '#9c27b0',        // Púrpura
  accent: '#8bc34a',
  secondary: '#607d8b',
};

// Colores por estado de cita
const STATUS_COLORS = {
  pending: COLORS.pending,
  confirmed: COLORS.confirmed,
  cancelled_by_patient: COLORS.cancelled,
  cancelled_by_professional: COLORS.cancelled,
  attended: COLORS.attended,
  no_show: COLORS.noShow,
};

// Nombres legibles de los estados
const STATUS_NAMES = {
  pending: 'Pendientes',
  confirmed: 'Confirmadas',
  cancelled_by_patient: 'Canceladas por paciente',
  cancelled_by_professional: 'Canceladas por profesional',
  attended: 'Atendidas',
  no_show: 'No asistidas',
};

export function StatisticsDashboard() {
  const { 
    statistics, 
    isLoading, 
    isError, 
    selectedMonth, 
    selectedYear, 
    nextMonth, 
    prevMonth 
  } = useStatistics();

  // Etiqueta del mes actual
  const currentMonthLabel = format(new Date(selectedYear, selectedMonth - 1, 1), 'MMMM yyyy', { locale: es });

  // Estado para la pestaña seleccionada
  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading) {
    return <div className="p-4 text-center">Cargando estadísticas...</div>;
  }

  if (isError) {
    return <div className="p-4 text-center text-red-500">Error al cargar las estadísticas. Por favor intente de nuevo.</div>;
  }

  if (!statistics) {
    return <div className="p-4 text-center">No hay datos estadísticos disponibles para este período.</div>;
  }

  // Procesar datos para el gráfico de estados
  const statusData = Object.entries(statistics.statusStats).map(([key, value]) => ({
    name: STATUS_NAMES[key as keyof typeof STATUS_NAMES] || key,
    value,
    color: STATUS_COLORS[key as keyof typeof STATUS_COLORS] || COLORS.secondary,
  }));

  // Procesar datos para el gráfico de servicios
  const serviceData = Object.entries(statistics.serviceStats).map(([key, value]) => ({
    name: key,
    value,
  }));

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Estadísticas</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={prevMonth} variant="outline" size="sm">
            &larr; Anterior
          </Button>
          <span className="text-lg font-medium capitalize">{currentMonthLabel}</span>
          <Button onClick={nextMonth} variant="outline" size="sm">
            Siguiente &rarr;
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="services">Servicios</TabsTrigger>
          <TabsTrigger value="patients">Pacientes</TabsTrigger>
        </TabsList>
        
        {/* Pestaña de Resumen General */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total de citas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{statistics.totalAppointments}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pacientes nuevos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{statistics.newPatients}</div>
                <div className="text-xs text-muted-foreground">
                  {Math.round((statistics.newPatients / (statistics.totalAppointments || 1)) * 100)}% del total
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tasa de asistencia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {Math.round((statistics.statusStats.attended / 
                    (statistics.totalAppointments || 1)) * 100)}%
                </div>
                <Progress 
                  value={(statistics.statusStats.attended / (statistics.totalAppointments || 1)) * 100} 
                  className="mt-2"
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Distribución por estado</CardTitle>
              <CardDescription>Desglose de citas por estado mensual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} citas`, 'Cantidad']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribución por día de la semana</CardTitle>
              <CardDescription>Cantidad de citas por día de semana</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statistics.weekdayStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(value) => [`${value} citas`, 'Cantidad']} />
                    <Bar dataKey="count" fill={COLORS.primary} name="Citas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Servicios */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribución por tipo de servicio</CardTitle>
              <CardDescription>Desglose de citas por tipo de servicio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serviceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={150} />
                    <Tooltip formatter={(value) => [`${value} citas`, 'Cantidad']} />
                    <Bar dataKey="value" fill={COLORS.info} name="Citas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Pacientes */}
        <TabsContent value="patients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pacientes con ausencias frecuentes</CardTitle>
              <CardDescription>Pacientes con 2 o más ausencias sin aviso</CardDescription>
            </CardHeader>
            <CardContent>
              {statistics.noShowPatients.length > 0 ? (
                <div className="divide-y">
                  {statistics.noShowPatients.map((patient) => (
                    <div key={patient.patientId} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{patient.patientName}</p>
                        <p className="text-sm text-muted-foreground">ID: {patient.patientId}</p>
                      </div>
                      <Badge variant="destructive">{patient.noShowCount} ausencias</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4">No hay pacientes con ausencias frecuentes en este período.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
