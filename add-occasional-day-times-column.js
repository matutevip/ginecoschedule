// Script para agregar la columna occasional_work_day_times a la tabla schedule_config
require('dotenv').config();
const { Pool } = require('pg');

async function addOccasionalDayTimesColumn() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    console.log('Conectando a la base de datos...');
    
    // Agregar columna si no existe
    await pool.query(`
      ALTER TABLE schedule_config 
      ADD COLUMN IF NOT EXISTS occasional_work_day_times JSONB DEFAULT '{}' NOT NULL
    `);
    
    console.log('✅ Columna occasional_work_day_times agregada con éxito');
    
    // Verificar que la columna existe
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'schedule_config' 
      AND column_name = 'occasional_work_day_times'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Columna verificada correctamente');
    } else {
      console.error('❌ La columna no fue creada correctamente');
    }
  } catch (error) {
    console.error('Error al agregar la columna:', error);
  } finally {
    await pool.end();
    console.log('Conexión a la base de datos cerrada');
  }
}

addOccasionalDayTimesColumn().catch(console.error);