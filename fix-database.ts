// Script para crear la tabla blocked_days si no existe
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function fixDatabase() {
  console.log('Verificando si existe la tabla blocked_days...');
  try {
    // Verificar si la tabla existe
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'blocked_days'
      );
    `);
    
    const exists = tableExists[0].exists;
    
    if (!exists) {
      console.log('La tabla blocked_days no existe. Creándola...');
      // Crear la tabla si no existe
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS blocked_days (
          id SERIAL PRIMARY KEY,
          date TIMESTAMP NOT NULL,
          reason TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('Tabla blocked_days creada correctamente.');
    } else {
      console.log('La tabla blocked_days ya existe.');
    }
  } catch (error) {
    console.error('Error al verificar o crear la tabla blocked_days:', error);
  }
  
  process.exit(0);
}

fixDatabase();