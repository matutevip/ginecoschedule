import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

interface StatisticsParams {
  month: number;
  year: number;
}

interface WeekdayStat {
  name: string;
  count: number;
}

interface NoShowPatient {
  patientId: number;
  patientName: string;
  noShowCount: number;
}

export interface Statistics {
  month: number;
  year: number;
  totalAppointments: number;
  statusStats: {
    pending: number;
    confirmed: number;
    cancelled_by_patient: number;
    cancelled_by_professional: number;
    attended: number;
    no_show: number;
  };
  serviceStats: Record<string, number>;
  newPatients: number;
  noShowPatients: NoShowPatient[];
  weekdayStats: WeekdayStat[];
}

// Hook personalizado para obtener y controlar las estadísticas
export function useStatistics() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // Month is 0-indexed in JS
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

  // Query para obtener las estadísticas del mes seleccionado
  const { data, isLoading, isError, error, refetch } = useQuery<Statistics>({
    queryKey: ['statistics', selectedMonth, selectedYear],
    queryFn: async () => {
      const response = await fetch(`/api/admin/statistics?month=${selectedMonth}&year=${selectedYear}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener estadísticas');
      }
      
      return response.json();
    },
  });

  // Función para cambiar el mes/año seleccionado
  const setDateRange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  // Función para avanzar al próximo mes
  const nextMonth = () => {
    if (selectedMonth === 12) {
      setDateRange(1, selectedYear + 1);
    } else {
      setDateRange(selectedMonth + 1, selectedYear);
    }
  };

  // Función para retroceder al mes anterior
  const prevMonth = () => {
    if (selectedMonth === 1) {
      setDateRange(12, selectedYear - 1);
    } else {
      setDateRange(selectedMonth - 1, selectedYear);
    }
  };

  return {
    statistics: data,
    isLoading,
    isError,
    error,
    selectedMonth,
    selectedYear,
    setDateRange,
    nextMonth,
    prevMonth,
    refresh: refetch,
  };
}
