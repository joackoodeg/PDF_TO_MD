# converter.py
import sys
import os
import re

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Error: No se pudo importar PyMuPDF. Instálalo con 'pip install PyMuPDF'", file=sys.stderr)
    sys.exit(1)

try:
    from markdownify import markdownify as md
except ImportError:
    print("Error: No se pudo importar markdownify. Instálalo con 'pip install markdownify'", file=sys.stderr)
    sys.exit(1)

def clean_text(text):
    """
    Limpia el texto para mejorar el formato del markdown y reemplaza caracteres problemáticos
    """
    # Reemplazar caracteres Unicode problemáticos con equivalentes ASCII o espacios
    # Esto ayuda a prevenir errores de codificación
    text = re.sub(r'[\u0080-\uffff]', lambda x: ' ', text)
    
    # Eliminar múltiples saltos de línea
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Eliminar espacios múltiples
    text = re.sub(r' {2,}', ' ', text)
    return text

def detect_headers(text):
    """
    Detecta y formatea encabezados en el texto
    """
    lines = text.split('\n')
    result = []
    
    for line in lines:
        # Buscar líneas que parezcan títulos (cortas, en mayúsculas, sin punto final)
        if (line.strip() and len(line.strip()) < 60 and 
            line.strip().isupper() and not line.strip().endswith('.')):
            # Convertir a un encabezado de nivel 2
            result.append(f"\n## {line.strip()}\n")
        else:
            result.append(line)
            
    return '\n'.join(result)

def pdf_to_markdown(pdf_path):
    """
    Convierte un archivo PDF a Markdown con funciones básicas
    """
    try:
        # Configurar la codificación de salida para evitar errores con caracteres especiales
        # En Windows, redirigir stdout a utf-8
        if sys.platform == 'win32':
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        
        # Abrir el documento PDF
        doc = fitz.open(pdf_path)
            
        # Inicializar el texto completo
        base_name = os.path.splitext(os.path.basename(pdf_path))[0]
        full_text = f"# {base_name}\n\n"
        
        # Extraer información del documento
        full_text += "## Información del documento\n\n"
        if doc.metadata:
            for key, value in doc.metadata.items():
                if value:
                    # Limpiar metadata para evitar caracteres problemáticos
                    cleaned_value = str(value).encode('ascii', 'replace').decode('ascii')
                    full_text += f"- **{key}**: {cleaned_value}\n"
        full_text += f"- **Páginas**: {len(doc)}\n\n"
        
        # Tabla de contenido
        full_text += "## Contenido\n\n"
            
        # Procesar cada página
        for i in range(len(doc)):
            try:
                page = doc.load_page(i)
                # Obtener texto con manejo de errores para caracteres especiales
                try:
                    page_text = page.get_text()
                except UnicodeEncodeError:
                    # Si hay error de codificación, intentar con otra estrategia
                    page_text = page.get_text("text", sort=True)
                
                # Limpiar el texto para evitar problemas de codificación
                page_text = clean_text(page_text)
                
                # Detectar encabezados
                page_text = detect_headers(page_text)
                
                # Agregar contenido de la página
                full_text += f"\n## Página {i + 1}\n\n"
                full_text += page_text
                full_text += "\n\n---\n\n"
            except Exception as e:
                full_text += f"\n## Página {i + 1}\n\n*Error al procesar esta página: {str(e)}*\n\n---\n\n"
        
        # Convertir a markdown con markdownify
        try:
            markdown = md(full_text)
        except UnicodeEncodeError:
            # Si hay error, hacemos una limpieza más agresiva
            full_text = full_text.encode('ascii', 'replace').decode('ascii')
            markdown = md(full_text)
        
        # Ajustes finales para mejorar formato
        markdown = re.sub(r'\n{3,}', '\n\n', markdown)  # Normalizar saltos de línea
        
        # Imprimir resultado para Electron
        print(markdown)
        
        return True
        
    except Exception as e:
        error_msg = str(e)
        print(f"Error al procesar el PDF: {error_msg}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python converter.py <ruta-al-pdf>", file=sys.stderr)
        sys.exit(1)
        
    pdf_path = sys.argv[1]
    if not os.path.isfile(pdf_path):
        print(f"El archivo '{pdf_path}' no existe.", file=sys.stderr)
        sys.exit(1)
    
    # Establecer codificación UTF-8 para salida
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    
    success = pdf_to_markdown(pdf_path)
    if not success:
        sys.exit(1)