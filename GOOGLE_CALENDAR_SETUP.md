# Configuración de Google Calendar para la aplicación de Turnos Médicos

Este documento proporciona instrucciones paso a paso para configurar la integración con Google Calendar en nuestra aplicación de reserva de turnos médicos.

## Requisitos previos

1. Una cuenta de Google con acceso a Google Cloud Platform
2. Permisos para crear proyectos en Google Cloud Platform
3. Un calendario de Google para sincronizar las citas

## ¿Qué hace esta integración?

La integración con Google Calendar permite:

- Sincronizar automáticamente todas las citas creadas en la aplicación con Google Calendar
- Actualizar las citas en Google Calendar cuando se modifican en la aplicación
- Eliminar eventos de Google Calendar cuando se cancelan citas
- Usar códigos de color en Google Calendar según el tipo de servicio

## Instrucciones de configuración detalladas

### 1. Crear un proyecto en Google Cloud Platform

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en "Crear proyecto" o selecciona un proyecto existente
4. Proporciona un nombre para el proyecto (ej. "Turnos Médicos")
5. Haz clic en "Crear"

### 2. Habilitar la API de Google Calendar

1. En la consola de Google Cloud, ve a "APIs y servicios" > "Biblioteca"
2. Busca "Google Calendar API"
3. Selecciona "Google Calendar API" de los resultados de búsqueda
4. Haz clic en "Habilitar"

### 3. Crear una cuenta de servicio

1. En la consola de Google Cloud, ve a "APIs y servicios" > "Credenciales"
2. Haz clic en "Crear credenciales" y selecciona "Cuenta de servicio"
3. Proporciona un nombre para la cuenta de servicio (ej. "Turnos Médicos Service Account")
4. Opcional: añade una descripción
5. Haz clic en "Crear y continuar"
6. En la sección de "Conceder a esta cuenta de servicio acceso al proyecto", selecciona el rol "Project" > "Editor"
7. Haz clic en "Continuar" y luego en "Listo"

### 4. Crear una clave privada para la cuenta de servicio

1. En la lista de cuentas de servicio, haz clic en la cuenta de servicio que acabas de crear
2. Ve a la pestaña "Claves"
3. Haz clic en "Añadir clave" > "Crear nueva clave"
4. Selecciona el formato "JSON" y haz clic en "Crear"
5. Se descargará un archivo JSON con las credenciales a tu computadora
6. Guarda este archivo en un lugar seguro

### 5. Compartir tu calendario con la cuenta de servicio

1. Abre [Google Calendar](https://calendar.google.com/)
2. En la barra lateral, busca el calendario que deseas usar
3. Haz clic en los tres puntos junto al nombre del calendario y selecciona "Configuración y uso compartido"
4. Desplázate hacia abajo hasta la sección "Compartir con personas específicas"
5. Haz clic en "Añadir personas" e ingresa la dirección de correo electrónico de la cuenta de servicio (la encontrarás en el archivo JSON descargado, en el campo "client_email")
6. Asegúrate de dar permisos de "Hacer cambios en eventos" o superiores
7. Haz clic en "Enviar"

### 6. Obtener el ID del calendario

1. Regresa a la configuración de tu calendario
2. Desplázate hacia abajo hasta la sección "ID del calendario"
3. Copia el ID del calendario (se verá algo como "abcdefg123456@group.calendar.google.com" o tu dirección de correo para el calendario principal)

### 7. Configurar las variables de entorno en la aplicación

Necesitarás configurar tres variables de entorno en tu aplicación:

1. `GOOGLE_CLIENT_EMAIL`: El correo electrónico de la cuenta de servicio (campo "client_email" en el archivo JSON)
2. `GOOGLE_PRIVATE_KEY`: La clave privada de la cuenta de servicio (campo "private_key" en el archivo JSON)
3. `GOOGLE_CALENDAR_ID`: El ID del calendario que copiaste en el paso anterior

**IMPORTANTE**: Al configurar `GOOGLE_PRIVATE_KEY`, asegúrate de incluir las comillas y escapar los saltos de línea correctamente. Debe contener "-----BEGIN PRIVATE KEY-----" y "-----END PRIVATE KEY-----", y todos los saltos de línea deben estar presentes.

## Verificación de la configuración

Una vez configurado todo correctamente, en el panel de administración:

1. Ve a la sección "Configurar horarios"
2. Selecciona la pestaña "Google Calendar"
3. Deberías ver un mensaje que indica que la integración está activa

## Solución de problemas comunes

### Error: "Invalid grant: account not found"

Este error indica que la cuenta de servicio especificada no se encuentra o no tiene los permisos necesarios.

**Soluciones posibles:**
1. Verifica que el correo electrónico (GOOGLE_CLIENT_EMAIL) sea exactamente el mismo que aparece en tu cuenta de servicio en Google Cloud
2. Asegúrate de que la cuenta de servicio no haya sido eliminada o deshabilitada en la consola de Google Cloud
3. Confirma que has habilitado la API de Google Calendar en el mismo proyecto donde creaste la cuenta de servicio
4. Verifica que has compartido tu calendario con exactamente la misma dirección de correo que especificaste en GOOGLE_CLIENT_EMAIL

### Error: "DECODER routines: unsupported"

Este error indica un problema con el formato de la clave privada.

**Soluciones posibles:**
1. Asegúrate de incluir todo el contenido de la clave, incluyendo "-----BEGIN PRIVATE KEY-----" y "-----END PRIVATE KEY-----"
2. Preserva todos los saltos de línea de la clave original
3. No elimines ningún carácter de la clave

**Formato correcto de la clave privada:**
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDN9PDXIiS3FwMh
... (más líneas de la clave) ...
4j8vim7RuKWw8T5zY9Dx7VryYPKB
-----END PRIVATE KEY-----
```

### Error: "Permiso denegado" o "No se puede acceder al calendario"

**Soluciones posibles:**
- Verifica que has compartido el calendario con la dirección de correo correcta de la cuenta de servicio
- Asegúrate de que has otorgado permisos de "Hacer cambios en eventos" o superiores
- Verifica que el ID del calendario (GOOGLE_CALENDAR_ID) sea correcto

### Error: "La API está deshabilitada"

**Soluciones posibles:**
1. Asegúrate de haber habilitado la API de Google Calendar en tu proyecto de Google Cloud
2. Confirma que estás usando las credenciales del mismo proyecto donde habilitaste la API
3. Verifica que tu proyecto no tenga restricciones que impidan el uso de la API

## Ejemplo del archivo JSON descargado

Cuando creas una clave privada para tu cuenta de servicio, se descarga un archivo JSON que tendrá un aspecto similar a este:

```json
{
  "type": "service_account",
  "project_id": "tu-proyecto-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvA...\n-----END PRIVATE KEY-----\n",
  "client_email": "tu-cuenta@tu-proyecto.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/tu-cuenta%40tu-proyecto.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
```

De este archivo necesitas:
- El valor de `client_email` para GOOGLE_CLIENT_EMAIL
- El valor de `private_key` para GOOGLE_PRIVATE_KEY (incluyendo los marcadores BEGIN/END y los saltos de línea)

Si sigues experimentando problemas después de intentar estas soluciones, contacta al soporte técnico para obtener ayuda adicional.