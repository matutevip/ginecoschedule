import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const messageSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  content: z.string().min(1, "El contenido es requerido"),
  displayDuration: z.number().min(1, "La duración debe ser mayor a 0"),
  daysToShow: z.number().min(1, "Los días deben ser mayor a 0"),
});

type MessageForm = z.infer<typeof messageSchema>;

interface PatientMessage extends MessageForm {
  id: number;
}

interface PatientMessageConfigProps {
  onSave: (message: MessageForm) => void;
  onDelete: (id: number) => void;
  messages: PatientMessage[];
}

export function PatientMessageConfig({ onSave, onDelete, messages }: PatientMessageConfigProps) {
  const [isAdding, setIsAdding] = useState(false);

  const form = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      title: "",
      content: "",
      displayDuration: 5,
      daysToShow: 7,
    },
  });

  const onSubmit = (data: MessageForm) => {
    onSave(data);
    form.reset();
    setIsAdding(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">Mensajes para pacientes</h3>
        {!isAdding && (
          <Button
            variant="outline"
            onClick={() => setIsAdding(true)}
            className="border-primary/20"
          >
            Agregar mensaje
          </Button>
        )}
      </div>

      {isAdding && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenido</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="displayDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración (segundos)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="daysToShow"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días a mostrar</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAdding(false)}
                className="border-primary/20"
              >
                Cancelar
              </Button>
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </Form>
      )}

      <div className="space-y-2">
        {messages.map((message) => (
          <Card key={message.id} className="border-primary/10">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="font-medium">{message.title}</h4>
                  <p className="text-sm text-muted-foreground">{message.content}</p>
                  <p className="text-xs text-muted-foreground">
                    Mostrar por {message.displayDuration} segundos durante {message.daysToShow} días
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(message.id)}
                  className="text-destructive hover:text-destructive/90"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
