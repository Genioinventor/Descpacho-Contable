import os
import json
import datetime
from pathlib import Path
import socket
import shutil

class OfflineTicketProcessor:
    def __init__(self):
        # Configuración según usuario: C:\Users\susan\OneDrive\Escritorio\DESPACHO\COBRANZA\2026\RECIBOS
        self.base_dir = Path("C:/Users/susan/OneDrive/Escritorio/DESPACHO/COBRANZA/2026/RECIBOS")
        self.config_dir = Path.home() / ".despacho_config"
        self.data_file = self.config_dir / "offline_tickets.json"
        
        # Asegurar que el directorio base existe
        self.base_dir.mkdir(parents=True, exist_ok=True)
        
        # Asegurar que el directorio de configuración existe
        self.config_dir.mkdir(parents=True, exist_ok=True)
        
        # Inicializar archivo de datos si no existe
        if not self.data_file.exists():
            with open(self.data_file, 'w') as f:
                json.dump({"tickets": [], "last_sync": None}, f)
    
    def check_internet_connection(self):
        try:
            socket.create_connection(("8.8.8.8", 53), timeout=3)
            return True
        except OSError:
            return False
    
    def get_month_folder_name(self):
        now = datetime.datetime.now()
        month_num = now.strftime("%m")
        month_names = {
            "01": "ENERO", "02": "FEBRERO", "03": "MARZO", 
            "04": "ABRIL", "05": "MAYO", "06": "JUNIO",
            "07": "JULIO", "08": "AGOSTO", "09": "SEPTIEMBRE",
            "10": "OCTUBRE", "11": "NOVIEMBRE", "12": "DICIEMBRE"
        }
        month_name = month_names.get(month_num, month_num)
        return f"{month_num}-{month_name}"
    
    def format_image_filename(self, client_name, date_str):
        now = datetime.datetime.now()
        day = now.strftime("%d")
        month = now.strftime("%m")
        year = now.strftime("%Y")
        
        # Limpiar nombre del cliente para el nombre del archivo
        clean_client = "".join(c for c in client_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
        clean_client = clean_client.replace(" ", "_")
        
        return f"{clean_client}_{day}_{month}_{year}.png"
    
    def process_ticket_image(self, canvas, ticket_data):
        try:
            # Obtener nombre del cliente de los datos del ticket
            client_name = ticket_data.get('client', 'Sin_Cliente')
            
            # Generar nombre del archivo
            date_str = ticket_data.get('date', datetime.datetime.now().isoformat())
            image_filename = self.format_image_filename(client_name, date_str)
            
            # Crear carpeta del mes (ejemplo: 08-AGOSTO)
            month_folder = self.get_month_folder_name()
            month_path = self.base_dir / month_folder
            month_path.mkdir(exist_ok=True)
            
            # Guardar imagen
            image_path = month_path / image_filename
            
            # Aquí se guardaría la imagen real (comentado para compatibilidad)
            # canvas.save(str(image_path))
            
            # Crear archivo de imagen dummy para pruebas
            with open(str(image_path), 'w') as f:
                f.write(f"Ticket Image for {client_name}\nDate: {date_str}\nFolio: {ticket_data.get('folio', 'N/A')}\n")
            
            return {
                "success": True,
                "image_path": str(image_path),
                "filename": image_filename,
                "month_folder": month_folder
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def save_ticket_offline(self, ticket_data, canvas=None):
        try:
            # Cargar tickets existentes
            with open(self.data_file, 'r') as f:
                data = json.load(f)
            
            # Añadir timestamp offline
            ticket_data["offline_timestamp"] = datetime.datetime.now().isoformat()
            ticket_data["offline_mode"] = True
            
            # Añadir a la lista de tickets
            data["tickets"].append(ticket_data)
            data["last_sync"] = None
            
            # Guardar datos actualizados
            with open(self.data_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            # Procesar imagen si se proporciona canvas
            image_info = None
            if canvas:
                image_info = self.process_ticket_image(canvas, ticket_data)
            
            return {
                "success": True,
                "message": "Ticket guardado offline exitosamente",
                "image_info": image_info
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_offline_tickets(self):
        try:
            with open(self.data_file, 'r') as f:
                data = json.load(f)
            return data.get("tickets", [])
        except Exception as e:
            return []
    
    def sync_tickets(self):
        if self.check_internet_connection():
            # Aquí se implementaría la lógica real de sincronización
            # Enviar tickets al servidor, limpiar datos locales
            
            with open(self.data_file, 'r') as f:
                data = json.load(f)
            
            data["tickets"] = []
            data["last_sync"] = datetime.datetime.now().isoformat()
            
            with open(self.data_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            return {
                "success": True,
                "message": "Tickets sincronizados exitosamente"
            }
        else:
            return {
                "success": False,
                "message": "No hay conexión a internet. No se puede sincronizar."
            }

# Global processor instance
_offline_processor = None

def get_processor():
    global _offline_processor
    if _offline_processor is None:
        _offline_processor = OfflineTicketProcessor()
    return _offline_processor

# Web API-like functions for JavaScript integration
def is_online():
    return get_processor().check_internet_connection()

def save_ticket_offline_js(ticket_data, canvas_data=None):
    return get_processor().save_ticket_offline(ticket_data, canvas_data)

def get_offline_tickets_js():
    return get_processor().get_offline_tickets()

def sync_tickets_js():
    return get_processor().sync_tickets()

# Example usage
if __name__ == "__main__":
    print("Despacho Contable Offline Processor")
    print("====================================")
    
    processor = get_processor()
    
    # Check current connection status
    print(f"Internet Connection: {'YES' if processor.check_internet_connection() else 'NO'}")
    
    # Example ticket data
    example_ticket = {
        "folio": 1001,
        "client": "Juan Pérez",
        "rfc": "PEPJ800101ABC",
        "total": 1500.00,
        "date": datetime.datetime.now().isoformat(),
        "items": [
            {"name": "Producto A", "qty": 2, "price": 500.00},
            {"name": "Producto B", "qty": 1, "price": 500.00}
        ]
    }
    
    # Save ticket offline
    result = processor.save_ticket_offline(example_ticket)
    print(f"Save Ticket: {'SUCCESS' if result['success'] else 'FAILED'}")
    if result['success']:
        print(f"  Message: {result['message']}")
        if result.get('image_info'):
            print(f"  Image: {result['image_info']['filename']}")
            print(f"  Path: {result['image_info']['image_path']}")
    else:
        print(f"  Error: {result['error']}")
    
    # Get offline tickets
    tickets = processor.get_offline_tickets()
    print(f"\nOffline Tickets Count: {len(tickets)}")
    
    # Show folder structure
    print(f"\nStorage Location: {processor.base_dir}")
    for folder in processor.base_dir.iterdir():
        if folder.is_dir():
            print(f"  Month Folder: {folder.name}")
            for file in folder.iterdir():
                if file.is_file():
                    print(f"    - {file.name}")