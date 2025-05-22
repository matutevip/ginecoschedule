// Script para probar el envío de correo electrónico
import fetch from 'node-fetch';

async function testEmail() {
  try {
    // Usamos tu correo para la prueba (puedes cambiarlo si prefieres otro)
    const testEmail = 'jazminmontanes@gmail.com';
    
    console.log(`Intentando enviar correo de prueba a: ${testEmail}`);
    
    const response = await fetch('http://localhost:5000/api/test-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail
      }),
    });
    
    const data = await response.json();
    console.log('Respuesta:', data);
    
    if (data.success) {
      console.log('✅ Correo enviado exitosamente');
    } else {
      console.log('❌ Error al enviar correo:', data.message);
    }
  } catch (error) {
    console.error('Error en la solicitud:', error);
  }
}

testEmail();