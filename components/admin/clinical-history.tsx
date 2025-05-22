import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Patient, type MedicalRecord, insertMedicalRecordSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, FileText, Trash2, FileImage, File, History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientJourneyTimeline } from "./patient-journey-timeline-basic";

interface ClinicalHistoryProps {
  patientId: number;
}

export function ClinicalHistory({ patientId }: ClinicalHistoryProps) {
  const { toast } = useToast();
  const [showNewRecordDialog, setShowNewRecordDialog] = useState(false);
  const [deleteRecordId, setDeleteRecordId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm({
    resolver: zodResolver(insertMedicalRecordSchema),
    defaultValues: {
      patientId,
      recordType: "note",
      title: "",
      content: "",
      fileUrl: "",
      fileType: "",
    },
  });

  const { data: patient } = useQuery<Patient>({
    queryKey: [`/api/patients/${patientId}`],
  });

  const { data: records = [], isLoading: loadingRecords } = useQuery<MedicalRecord[]>({
    queryKey: [`/api/patients/${patientId}/medical-records`],
  });

  const createRecordMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", `/api/patients/${patientId}/medical-records`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Error al crear el registro médico");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medical-records`] });
      setShowNewRecordDialog(false);
      toast({
        title: "Registro creado",
        description: "El registro médico ha sido creado exitosamente.",
      });
      form.reset();
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: async (recordId: number) => {
      const res = await apiRequest("DELETE", `/api/medical-records/${recordId}`);
      if (!res.ok) {
        throw new Error("Error al eliminar el registro médico");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/medical-records`] });
      setDeleteRecordId(null);
      toast({
        title: "Registro eliminado",
        description: "El registro médico ha sido eliminado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: any) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key]) formData.append(key, data[key]);
    });

    if (selectedFile) {
      formData.append('file', selectedFile);
      formData.append('fileType', selectedFile.type);
    }

    createRecordMutation.mutate(formData);
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <FileText className="h-4 w-4" />;
    if (fileType.startsWith('image/')) return <FileImage className="h-4 w-4" />;
    if (fileType === 'application/pdf') return <File className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  if (loadingRecords) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="records" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="records" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Registros Médicos
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Línea de Tiempo
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="records" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Historia Clínica</h2>
            <Button onClick={() => setShowNewRecordDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Registro
            </Button>
          </div>

          <div className="grid gap-4">
            {records.map((record) => (
              <Card key={record.id} className="border-primary/10">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{record.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(record.createdAt || new Date()), "PPpp", { locale: es })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteRecordId(record.id)}
                      className="text-destructive hover:text-destructive/90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {record.recordType === "note" ? (
                    <p className="whitespace-pre-wrap">{record.content}</p>
                  ) : (
                    <div className="flex items-center gap-2">
                      {getFileIcon(record.fileType)}
                      <a
                        href={record.fileUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Ver documento adjunto
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="timeline" className="mt-6">
          <PatientJourneyTimeline patientId={patientId} />
        </TabsContent>
      </Tabs>

      <Dialog open={showNewRecordDialog} onOpenChange={setShowNewRecordDialog}>
        <DialogContent className="border-primary/10">
          <DialogHeader>
            <DialogTitle>Nuevo Registro Médico</DialogTitle>
            <DialogDescription>
              Agregue una nota o documento a la historia clínica del paciente.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="recordType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Registro</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione el tipo de registro" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="note">Nota</SelectItem>
                        <SelectItem value="file">Documento</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Título del registro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("recordType") === "note" ? (
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contenido</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Escriba el contenido de la nota"
                          className="min-h-[200px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="fileUrl"
                  render={({ field: { onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Documento</FormLabel>
                      <FormControl>
                        <Input 
                          type="file" 
                          accept=".pdf,.jpg,.jpeg,.png,.gif"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSelectedFile(file);
                              onChange(file);
                            }
                          }}
                          {...field}
                        />
                      </FormControl>
                      <p className="text-sm text-muted-foreground">
                        Formatos permitidos: PDF, JPG, PNG, GIF. Tamaño máximo: 5MB
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={createRecordMutation.isPending}
                >
                  {createRecordMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Guardar Registro
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteRecordId} onOpenChange={() => setDeleteRecordId(null)}>
        <DialogContent className="border-primary/10">
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro que desea eliminar este registro médico?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteRecordId(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteRecordId && deleteRecordMutation.mutate(deleteRecordId)}
              disabled={deleteRecordMutation.isPending}
            >
              {deleteRecordMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}