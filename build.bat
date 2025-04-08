@echo off
echo ===== PDF to Markdown - Build Script v1.0 =====
echo.

:: Verificar que Node.js esté instalado
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js no está instalado o no está en el PATH.
    echo Por favor, instale Node.js desde https://nodejs.org/
    exit /b 1
)

:: Verificar que Python esté instalado
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Python no está instalado o no está en el PATH.
    echo Por favor, instale Python desde https://www.python.org/
    exit /b 1
)

echo Instalando dependencias de Node.js...
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: No se pudieron instalar las dependencias de Node.js.
    exit /b 1
)

echo Creando entorno virtual de Python...
python -m venv venv
call venv\Scripts\activate.bat

echo Instalando dependencias de Python...
pip install PyMuPDF markdownify pyinstaller
if %ERRORLEVEL% neq 0 (
    echo ERROR: No se pudieron instalar las dependencias de Python.
    exit /b 1
)

:: Crear un script de entrada para PyInstaller
echo import sys > entry_point.py
echo import fitz >> entry_point.py
echo import markdownify >> entry_point.py
echo print("Python package initialized") >> entry_point.py

echo Empaquetando Python...
pyinstaller --distpath=./python-dist --workpath=./build --noconfirm --hidden-import=fitz --hidden-import=markdownify --onedir --name=python entry_point.py
if %ERRORLEVEL% neq 0 (
    echo ERROR: No se pudo empaquetar Python.
    exit /b 1
)

:: Copiar converter.py a la carpeta de recursos
copy converter.py python-dist\python\

echo Construyendo la aplicación Electron...
call npm run package
if %ERRORLEVEL% neq 0 (
    echo ERROR: No se pudo construir la aplicación Electron.
    exit /b 1
)

echo.
echo ===== Build completado exitosamente =====
echo La aplicación está disponible en la carpeta 'dist'
echo.

exit /b 0