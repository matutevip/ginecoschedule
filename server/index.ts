import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes, sendDailyScheduleSummaryEmail } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";
import { storage } from "./storage";
import { initGoogleCalendar, syncCalendarToDatabase, isGoogleCalendarEnabled, isGoogleCalendarInitialized } from "./googleCalendar";
import { isTuesday } from "date-fns";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Verify database connection before starting server
async function startServer() {
  try {
    // Test database connection
    await db.execute('SELECT 1');
    log("Database connection successful");

    // Initialize Google Calendar integration
    const gcalInitialized = await initGoogleCalendar();
    if (gcalInitialized) {
      log("Google Calendar integration initialized successfully");
    } else {
      log("Google Calendar integration not initialized - missing or malformed credentials");
      log("To use Google Calendar integration, please provide the following environment variables:");
      log("- GOOGLE_CLIENT_EMAIL: Service account email from Google Cloud");
      log("- GOOGLE_PRIVATE_KEY: Private key from Google Cloud service account (ensure correct format)");
      log("- GOOGLE_CALENDAR_ID: ID of the Google Calendar to use");
      log("The application will continue to work without Google Calendar integration.");
    }

    const server = await registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error: ${message}`);
      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`Server listening on port ${PORT}`);
      
      // Setup periodic Google Calendar synchronization
      if (isGoogleCalendarInitialized() && isGoogleCalendarEnabled()) {
        log("Google Calendar integration is enabled for outbound sync only");
        log("Synchronization from Google Calendar to our database has been temporarily disabled");
        log("Only changes made in our application will be sent to Google Calendar");
        
        // Comentado temporalmente - Sincronización desde Google Calendar a nuestra base de datos desactivada
        /*
        // Initial sync after server starts - solo mes actual y siguiente
        setTimeout(async () => {
          try {
            log("Running initial Google Calendar synchronization...");
            // Usar un rango de fechas limitado (mes actual y siguiente)
            const today = new Date();
            // Primer día del mes actual
            const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            // Último día del mes siguiente
            const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
            
            log(`Using optimized date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
            const result = await syncCalendarToDatabase(db, storage, startDate, endDate);
            log(`Initial Google Calendar sync result: ${JSON.stringify(result)}`);
          } catch (error) {
            log(`Error in initial Google Calendar sync: ${error}`);
          }
        }, 10000); // Wait 10 seconds after server start for initial sync
        
        // Sincronización periódica cada 15 minutos para evitar sobrecargar la API de Google Calendar
        setInterval(async () => {
          try {
            log("Running periodic Google Calendar synchronization...");
            
            // Usar un rango de fechas muy limitado para cada sincronización periódica
            // Solo los próximos 3 días (enfoque en los más inmediatos)
            const today = new Date();
            // Hoy
            const startDate = new Date(today);
            // 3 días adelante
            const endDate = new Date(today);
            endDate.setDate(today.getDate() + 3);
            
            log(`Periodic sync using optimized date range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
            const result = await syncCalendarToDatabase(db, storage, startDate, endDate);
            log(`Periodic Google Calendar sync result: ${JSON.stringify(result)}`);
          } catch (error) {
            if (error instanceof Error && error.message.includes('rateLimitExceeded')) {
              log(`Google Calendar API rate limit exceeded in periodic sync. Will try again in the next interval.`);
            } else {
              log(`Error in periodic Google Calendar sync: ${error}`);
            }
          }
        }, 15 * 60 * 1000); // 15 minutos en milisegundos (mucho menos frecuente para evitar límites de tasa)
        */
      } else {
        log("Google Calendar synchronization not enabled - skipping periodic sync");
      }
      
      // Configurar envío automático del resumen diario de citas
      log("Configurando programador para el envío automático del resumen diario de citas");
      
      // Ejecutamos una vez al iniciar para verificar funcionamiento (solo en desarrollo)
      if (process.env.NODE_ENV === 'development') {
        setTimeout(async () => {
          try {
            log("Ejecutando prueba inicial del envío de resumen diario de citas...");
            const today = new Date();
            // En la prueba inicial verificamos si mañana es laboral, sin buscar próximo día laboral
            const result = await sendDailyScheduleSummaryEmail(undefined, false);
            log(`Resultado de la prueba de envío de resumen: ${result ? 'Éxito' : 'Fallo'}`);
          } catch (error) {
            log(`Error en prueba inicial de envío de resumen: ${error}`);
          }
        }, 30000); // Esperar 30 segundos después del inicio del servidor
      }
      
      // Configurar el envío diario - verificar cada hora si es el momento adecuado
      // Esto ejecutará la verificación cada hora, pero solo enviará el resumen para días laborales
      // Verificamos a las 18:00 horas del día anterior a cada día laboral configurado
      setInterval(async () => {
        try {
          const now = new Date();
          const hour = now.getHours();
          
          // Verificamos solo a las 18:00 horas (período de 18:00 a 18:59)
          if (hour === 18) {
            log("Son las 18 horas, verificando si mañana es un día laboral para enviar resumen de citas...");
            
            // El envío automático utiliza el comportamiento clásico (verifica solo el día siguiente)
            // No busca el próximo día laboral, solo verifica si mañana es laboral
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const result = await sendDailyScheduleSummaryEmail(tomorrow, false);
            
            if (result) {
              log("✅ Verificación de resumen diario de citas completada");
            } else {
              log("❌ Error al verificar o enviar el resumen diario de citas");
            }
          }
        } catch (error) {
          log(`Error en el programador de envío de resumen diario: ${error}`);
        }
      }, 60 * 60 * 1000); // Verificar cada hora (60 min * 60 seg * 1000 ms)
    });
  } catch (error) {
    log(`Failed to start server: ${error}`);
    process.exit(1);
  }
}

startServer();