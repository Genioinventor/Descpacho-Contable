# Despacho A & N - Panel de Control

Panel de control para generar tickets y gestionar clientes con sincronización en tiempo real con Firestore. Incluye soporte completo para modo offline con guardado local y procesamiento de imágenes.

## Características

### Generación de Tickets
- Generador de tickets profesional con vista previa en tiempo real
- Cálculo automático de totales, descuentos y conversión a letras (español)
- Descarga de tickets en formato PDF y PNG

### Gestión de Clientes
- CRUD completo de clientes con sincronización automática
- Importación masiva de clientes desde JSON
- Búsqueda y filtrado de clientes

### Estadísticas
- Panel de control con métricas de negocio
- Visualización de tickets por cliente
- Resumen de ingresos y productos

### Sincronización Offline/Online
- Guardado automático en dispositivos sin conexión
- Sincronización automática cuando se recupera la conexión
- Backup local con prioridad a datos críticos

### Funciones Web
- QR generator para accesos rápidos
- Botón de WhatsApp para compartir tickets
- Validación en tiempo real de formularios

## Requisitos del Sistema

- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Firebase (para sincronización en tiempo real)
- HTML5 Canvas API (para generación de imágenes)

## Uso

### Función Principal
El panel funciona completamente en línea con sincronización automática con Firestore. En caso de pérdida de conexión, los datos se guardan localmente y se sincrornizan automáticamente cuando se restablece la conexión.

### Modo Offline
Cuando el navegador está sin conexión:
1. Los tickets se guardan localmente en `C:\Users\[usuario]\OneDrive\Escritorio\DESPACHO\COBRANZA\2026\RECIBOS`
2. Se organizan en carpetas mensuales (ej: `08-AGOSTO`)
3. Las imágenes se guardan con nombres que incluyen nombre del cliente, día, mes y año
4. Las funciones principales de WhatsApp, PDF y copia al portapapeles siguen funcionando

### Instalación

#### Usar la aplicación Python (Offline Processor)

1. Guarda el archivo `offline_ticket_processor.py`

2. Ejecuta el script de configuración:
   ```bash
   setup_offline.bat
   ```

3. Usa el procesador Python para gestionar tickets offline:
   ```python
   from offline_ticket_processor import (
       save_ticket_offline_js, 
       is_online, 
       get_offline_tickets_js,
       sync_tickets_js
   )
   
   # Guardar un ticket localmente
   ticket_data = {
       "folio": 1001,
       "client": "Juan Pérez",
       "rfc": "PEPJ800101ABC",
       "total": 1500.00,
       "date": "2026-08-02T10:30:00",
       "items": [{"name": "Producto A", "qty": 2, "price": 500.00}]
   }
   
   result = save_ticket_offline_js(ticket_data)
   print(f"Ticket guardado: {result['success']}")
   ```

#### Usar la página web

La página web principal incluye soporte completo offline:

- **Botón WhatsApp** (ID: `waBtn`): Funciona completamente offline, genera un mensaje con los detalles del ticket y lo abre en WhatsApp Web

- **Botón PDF** (ID: `pdfBtn`): Usa `_uploadedCanvas` o captura la página para generar PDFs offline

- **Botón PNG** (ID: `pngBtn`): Similar al PDF, funciona sin conexión cuando hay canvas disponible

- **Botón Copiar Imagen** (ID: `copyImgBtn`): Copia la imagen del ticket al portapapeles usando la API Clipboard

### Trabajar Completamente Offline

1. **Genera un ticket**: Completa el formulario y haz clic en "Subir ticket"
2. **Mira el banner offline**: Si se pierde conexión, aparecerá un banner indicando que se está trabajando offline
3. **Comparte por WhatsApp**: Haz clic en el botón WhatsApp (siempre funciona)
4. **Descarga archivos**: PDF y PNG funcionan con canvas guardado o generando nuevos
5. **Sincroniza**: Usa el botón de sincronización o espera a que se recupere la conexión

## Estructura de Archivos

- `index.html`: Página principal con interfaz de usuario
- `script.js`: Lógica principal del panel con funciones offline
- `clientes/script.js`: Módulo de gestión de clientes
- `stats/script.js`: Módulo de estadísticas
- `style.css`: Estilos
- `offline_ticket_processor.py`: Procesador Python para gestión offline
- `setup_offline.bat`: Script de instalación

## Desarrolladores

- Design original: [Tu Nombre]
- Implementación: [Tu Nombre]
- Soporte offline: [Tu Nombre]

## Licencia

Este proyecto está bajo licencia propietaria. Contacta para información de licencias.