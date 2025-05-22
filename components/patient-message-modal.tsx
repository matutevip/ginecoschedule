import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PatientMessage {
  id: number;
  title: string;
  content: string;
  displayDuration: number;
  daysToShow: number;
}

export function PatientMessageModal() {
  const [messages, setMessages] = useState<PatientMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<PatientMessage | undefined>(undefined);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch('/api/patient-messages');
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
          // Show the first applicable message if any
          if (data.length > 0) {
            setCurrentMessage(data[0]);
            setShowMessage(true);
          }
        }
      } catch (error) {
        console.error('Error fetching patient messages:', error);
      }
    };

    fetchMessages();
  }, []);

  return (
    <Dialog open={showMessage} onOpenChange={setShowMessage}>
      <DialogContent className="sm:max-w-md border-primary/10">
        <DialogHeader>
          <DialogTitle>{currentMessage?.title}</DialogTitle>
        </DialogHeader>
        <div className="prose dark:prose-invert max-w-none">
          {currentMessage?.content && (
            <div dangerouslySetInnerHTML={{ __html: currentMessage.content }} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}