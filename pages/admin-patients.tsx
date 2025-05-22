import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Phone, Mail, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// Definición de tipos
interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  socialInsurance?: string;
  socialInsuranceNumber?: string;
  createdAt: string;
}

interface Appointment {
  id: number;
  patientId: number;
  appointmentTime: string;
  serviceType: string;
  status: string;
  price?: number;
  notes?: string;
  createdAt: string;
}

interface PatientWithAppointments extends Patient {
  appointments: Appointment[];
}

export default function AdminPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<PatientWithAppointments | null>(null);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const response = await apiClient('/api/admin/patients');
        setPatients(response);
        setError(null);
      } catch (err: any) {
        console.error("Error al cargar pacientes:", err);
        setError(err.message || "Error al cargar pacientes");
      } finally {
        setLoading(false);
      }
    };
    
    fetchPatients();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredPatients = patients.filter(patient => {
    const searchLower = searchTerm.toLowerCase();
    return (
      patient.firstName.toLowerCase().includes(searchLower) ||
      patient.lastName.toLowerCase().includes(searchLower) ||
      patient.email.toLowerCase().includes(searchLower) ||
      patient.phone.includes(searchTerm)
    );
  });

  const handleViewPatient = async (patientId: number) => {
    try {
      setLoading(true);
      // Obtener información detallada del paciente
      const patient = await apiClient(`/api/admin/patients/${patientId}`);
      // Obtener historial de citas del paciente
      const appointments = await apiClient(`/api/admin/patient-appointments/${patientId}`);
      
      setSelectedPatient({
        ...patient,
        appointments: appointments
      });
      
      setPatientDialogOpen(true);
      setError(null);
    } catch (err: any) {
      console.error("Error al cargar detalles del paciente:", err);
      setError(err.message || "Error al cargar detalles del paciente");
    } finally {
      setLoading(false);
    }
  };

  const formatWhatsAppLink = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return `https://wa.me/${cleaned}`;
  };

  const handleExportToCSV = () => {
    // Preparar datos para CSV
    const headers = ["Nombre", "Apellido", "Email", "Teléfono", "Obra Social", "Número de Afiliado"];
    
    const rows = filteredPatients.map(patient => [
      patient.firstName,
      patient.lastName,
      patient.email,
      patient.phone,
      patient.socialInsurance || "",
      patient.socialInsuranceNumber || ""
    ]);
    
    // Crear contenido CSV
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\\n");
    
    // Crear Blob y descargar
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pacientes_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="outline" className="bg-blue-100">Programada</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-100">Completada</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-100">Cancelada</Badge>;
      case "noshow":
        return <Badge variant="outline" className="bg-amber-100">No asistió</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Pacientes</h1>
          
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar pacientes..."
                className="pl-8 w-[250px]"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            <Button variant="outline" onClick={handleExportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>
        
        {loading && !patientDialogOpen && (
          <div className="flex justify-center items-center h-60">
            <p>Cargando pacientes...</p>
          </div>
        )}
        
        {error && (
          <div className="text-red-500 text-center p-4">
            {error}
          </div>
        )}
        
        {!loading && !error && (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre completo</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Obra Social</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6">
                        No se encontraron pacientes
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPatients.map(patient => (
                      <TableRow key={patient.id}>
                        <TableCell>
                          {patient.firstName} {patient.lastName}
                        </TableCell>
                        <TableCell>
                          <a 
                            href={`mailto:${patient.email}`} 
                            className="flex items-center hover:text-primary"
                          >
                            <Mail className="mr-1 h-4 w-4" />
                            {patient.email}
                          </a>
                        </TableCell>
                        <TableCell>
                          <a 
                            href={formatWhatsAppLink(patient.phone)} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center hover:text-primary"
                          >
                            <Phone className="mr-1 h-4 w-4" />
                            {patient.phone}
                          </a>
                        </TableCell>
                        <TableCell>
                          {patient.socialInsurance || "-"}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleViewPatient(patient.id)}
                          >
                            Ver detalles
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        
        {/* Diálogo de detalles del paciente */}
        <Dialog open={patientDialogOpen} onOpenChange={setPatientDialogOpen}>
          <DialogContent className="max-w-3xl">
            {selectedPatient ? (
              <>
                <DialogHeader>
                  <DialogTitle>Información del paciente</DialogTitle>
                  <DialogDescription>
                    Detalles completos e historial de citas
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Información personal</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Nombre:</span> {selectedPatient.firstName} {selectedPatient.lastName}</p>
                      <p>
                        <span className="font-medium">Email:</span> 
                        <a href={`mailto:${selectedPatient.email}`} className="ml-1 hover:text-primary">
                          {selectedPatient.email}
                        </a>
                      </p>
                      <p>
                        <span className="font-medium">WhatsApp:</span> 
                        <a 
                          href={formatWhatsAppLink(selectedPatient.phone)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-1 hover:text-primary"
                        >
                          {selectedPatient.phone}
                        </a>
                      </p>
                      <p><span className="font-medium">Obra Social:</span> {selectedPatient.socialInsurance || "No especificada"}</p>
                      <p><span className="font-medium">Número de afiliado:</span> {selectedPatient.socialInsuranceNumber || "No especificado"}</p>
                      <p><span className="font-medium">Fecha de registro:</span> {format(new Date(selectedPatient.createdAt), 'PPP', { locale: es })}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Estadísticas</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-primary/10 p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Total de citas</p>
                        <p className="text-2xl font-bold">{selectedPatient.appointments.length}</p>
                      </div>
                      <div className="bg-green-500/10 p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Completadas</p>
                        <p className="text-2xl font-bold">
                          {selectedPatient.appointments.filter(a => a.status === "completed").length}
                        </p>
                      </div>
                      <div className="bg-red-500/10 p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Canceladas</p>
                        <p className="text-2xl font-bold">
                          {selectedPatient.appointments.filter(a => a.status === "cancelled").length}
                        </p>
                      </div>
                      <div className="bg-amber-500/10 p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">No asistió</p>
                        <p className="text-2xl font-bold">
                          {selectedPatient.appointments.filter(a => a.status === "noshow").length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Tabs defaultValue="appointments">
                  <TabsList>
                    <TabsTrigger value="appointments">Historial de citas</TabsTrigger>
                    <TabsTrigger value="records" disabled>
                      Historial médico
                      <span className="ml-2 text-xs bg-primary/20 px-2 py-0.5 rounded-full">Próximamente</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="appointments" className="mt-4">
                    {selectedPatient.appointments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CalendarClock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                        <p>Este paciente no tiene historial de citas</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha y hora</TableHead>
                            <TableHead>Servicio</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Precio</TableHead>
                            <TableHead>Notas</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...selectedPatient.appointments]
                            .sort((a, b) => new Date(b.appointmentTime).getTime() - new Date(a.appointmentTime).getTime())
                            .map(appointment => (
                              <TableRow key={appointment.id}>
                                <TableCell>
                                  {format(new Date(appointment.appointmentTime), 'PPP p', { locale: es })}
                                </TableCell>
                                <TableCell>{appointment.serviceType}</TableCell>
                                <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                                <TableCell>
                                  {appointment.price ? `$${appointment.price.toLocaleString()}` : '-'}
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate">
                                  {appointment.notes || '-'}
                                </TableCell>
                              </TableRow>
                            ))
                          }
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                </Tabs>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPatientDialogOpen(false)}>
                    Cerrar
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <div className="flex justify-center items-center h-40">
                <p>Cargando información del paciente...</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}