/**
 * Cliente de API para realizar solicitudes al backend
 */

import { queryClient } from "./queryClient";

interface ApiRequestOptions {
  method?: string;
  data?: any;
  headers?: Record<string, string>;
}

/**
 * Realiza una petición a la API
 */
export async function apiClient(endpoint: string, options: ApiRequestOptions = {}) {
  const { method = 'GET', data, headers = {} } = options;
  
  const url = endpoint.startsWith('http') ? endpoint : endpoint;
  
  const requestHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };
  
  const config: RequestInit = {
    method,
    headers: requestHeaders,
    credentials: 'include'
  };
  
  if (data) {
    config.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, config);
    
    if (response.status === 401) {
      // Redireccionar al login en caso de no estar autenticado
      if (window.location.pathname !== '/admin/login') {
        window.location.pathname = '/admin/login';
      }
      throw new Error('No autorizado');
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error: ${response.status}`);
    }
    
    if (response.status === 204) { // No content
      return null;
    }
    
    return await response.json();
  } catch (error: any) {
    console.error(`Error en solicitud API a ${url}:`, error);
    throw error;
  }
}

/**
 * Obtener la configuración de horarios
 */
export async function getScheduleConfig() {
  return apiClient('/api/admin/schedule-config');
}

/**
 * Actualizar la configuración de horarios
 */
export async function updateScheduleConfig(data: any) {
  // Aseguramos que estos campos estén siempre presentes
  // ya que son requeridos por el servidor
  const requiredDefaults = {
    workDays: data.workDays || [],
    startTime: data.startTime || "09:00:00",
    endTime: data.endTime || "12:00:00",
  };
  
  const completeData = {
    ...requiredDefaults,
    ...data
  };
  
  console.log("Enviando actualización de configuración:", completeData);
  
  return apiClient('/api/admin/schedule-config', {
    method: 'PATCH',
    data: completeData
  });
}

/**
 * Obtener la lista de días bloqueados
 */
export async function getBlockedDays() {
  return apiClient('/api/admin/blocked-days');
}

/**
 * Bloquear un día
 */
export async function blockDay(date: string, reason?: string) {
  console.log("Intentando bloquear día:", date, "Razón:", reason);
  
  const response = await apiClient('/api/admin/blocked-days', {
    method: 'POST',
    data: { date, reason }
  });
  
  console.log("Respuesta del servidor al bloquear día:", response.status || "Unknown");
  console.log("Día bloqueado exitosamente:", response);
  
  return response;
}

/**
 * Desbloquear un día
 */
export async function unblockDay(id: number) {
  return apiClient(`/api/admin/blocked-days/${id}`, {
    method: 'DELETE'
  });
}

/**
 * Invalidar las consultas para refrescar los datos
 */
export function invalidateScheduleQueries() {
  queryClient.invalidateQueries({ queryKey: ['/api/admin/schedule-config'] });
  queryClient.invalidateQueries({ queryKey: ['/api/schedule-config'] });
  queryClient.invalidateQueries({ queryKey: ['/api/admin/blocked-days'] });
}