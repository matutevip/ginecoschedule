import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { useStatistics } from '@/hooks/use-statistics';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { StatisticsDashboard } from './statistics-dashboard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { BarChart2 } from 'lucide-react';

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

export function StatisticsPreview() {
  const { 
    statistics, 
    isLoading, 
    isError, 
    selectedMonth, 
    selectedYear,
  } = useStatistics();

  // Estado para controlar la apertura del diálogo modal
  const [showDetailedStats, setShowDetailedStats] = useState(false);

  // Etiqueta del mes actual
  const currentMonthLabel = format(new Date(selectedYear, selectedMonth - 1, 1), 'MMMM yyyy', { locale: es });

  if (isLoading) {
    return <div className="text-center p-4 w-full">Cargando estadísticas...</div>;
  }

  if (isError) {
    return <div className="text-center text-red-500 p-4 w-full">Error al cargar estadísticas</div>;
  }

  if (!statistics) {
    return <div className="text-center text-muted-foreground p-4 w-full">No hay datos estadísticos disponibles</div>;
  }

  // Procesar datos para el gráfico de estados (simplificado para el dashboard)
  const statusData = Object.entries(statistics.statusStats)
    .filter(([_, value]) => value > 0) // Solo mostrar estados con valores
    .map(([key, value]) => ({
      name: STATUS_NAMES[key as keyof typeof STATUS_NAMES] || key,
      value,
      color: STATUS_COLORS[key as keyof typeof STATUS_COLORS] || '#999',
    }));

  // Obtener datos para la gráfica de día de la semana
  const activeWeekdayData = statistics.weekdayStats
    .filter(day => day.count > 0)
    .slice(0, 5); // Limitar a 5 días para ahorrar espacio

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Estadísticas {currentMonthLabel}</h2>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs flex items-center gap-1"
          onClick={() => setShowDetailedStats(true)}
        >
          <BarChart2 className="h-4 w-4" />
          Ver detalles
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de citas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statistics.totalAppointments}</div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pacientes nuevos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statistics.newPatients}</div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
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

      {/* Gráfico de Estados */}
      {statusData.length > 0 && (
        <Card className="col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Distribución por estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={50}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} citas`, 'Cantidad']} 
                    labelFormatter={(_, data) => data && data[0] ? data[0].payload.name : ''}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diálogo modal con estadísticas detalladas */}
      <Dialog open={showDetailedStats} onOpenChange={setShowDetailedStats}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" style={{marginTop: '5vh'}}>
          <DialogHeader>
            <DialogTitle>Estadísticas Detalladas - {currentMonthLabel}</DialogTitle>
            <DialogDescription>
              Análisis completo del rendimiento de la consulta para el período seleccionado.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6">
            <StatisticsDashboard />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
