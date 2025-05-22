import { db } from './server/db';
import { admins, scheduleConfig, patients, appointments, medicalRecords, patientMilestones } from './shared/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function initDb() {
  try {
    console.log('Iniciando creación de tablas...');
    
    // Crear tablas
    await db.execute(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        date_of_birth TIMESTAMP NOT NULL,
        blood_type TEXT,
        allergies TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS medical_records (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id),
        record_type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        file_url TEXT,
        file_type TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id),
        patient_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        appointment_time TIMESTAMP NOT NULL,
        is_first_time BOOLEAN DEFAULT FALSE,
        service_type TEXT DEFAULT 'Consulta',
        obra_social TEXT DEFAULT 'Particular',
        notes TEXT,
        google_event_id TEXT,
        is_from_google_calendar BOOLEAN DEFAULT FALSE,
        status TEXT DEFAULT 'pending',
        cancelled_at TIMESTAMP,
        cancelled_by TEXT,
        attended_at TIMESTAMP,
        no_show_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS schedule_config (
        id SERIAL PRIMARY KEY,
        work_days TEXT[] NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        vacation_periods JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS patient_milestones (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id),
        title TEXT NOT NULL,
        description TEXT,
        date TIMESTAMP NOT NULL,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'completed',
        "order" INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Tablas creadas correctamente.');
    
    // Crear admin por defecto
    const existingAdmin = await db.select().from(admins).where(eq(admins.username, 'admin')).limit(1);
    
    if (existingAdmin.length === 0) {
      console.log('Creando admin por defecto...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      await db.insert(admins).values({
        username: 'admin',
        password: hashedPassword
      });
      
      console.log('Admin creado correctamente.');
    } else {
      console.log('El admin ya existe, actualizando contraseña...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      await db.update(admins)
        .set({ password: hashedPassword })
        .where(eq(admins.id, existingAdmin[0].id));
        
      console.log('Contraseña del admin actualizada correctamente.');
    }
    
    // Crear configuración de horario por defecto
    const existingConfig = await db.select().from(scheduleConfig).limit(1);
    
    if (existingConfig.length === 0) {
      console.log('Creando configuración de horario por defecto...');
      
      await db.insert(scheduleConfig).values({
        workDays: ['miercoles'],
        startTime: '09:00:00',
        endTime: '12:00:00',
        vacationPeriods: []
      });
      
      console.log('Configuración de horario creada correctamente.');
    }
    
    console.log('Base de datos inicializada correctamente!');
    process.exit(0);
  } catch (error) {
    console.error('Error inicializando la base de datos:', error);
    process.exit(1);
  }
}

initDb();
