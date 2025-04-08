@echo off
echo ===================================================
echo  Prueba del conversor PDF a Markdown (Codificación)
echo ===================================================
echo.

REM Verificar si Python está instalado
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Python no está instalado.
    echo Por favor, instala Python 3.6+ desde https://python.org/
    pause
    exit /b 1
)

REM Verificar las dependencias
echo Verificando dependencias...
python -c "import fitz" >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Instalando PyMuPDF...
    pip install PyMuPDF
)

python -c "import markdownify" >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Instalando markdownify...
    pip install markdownify
)

echo.
echo Dependencias verificadas.
echo.
echo Por favor arrastra un archivo PDF a esta ventana y pulsa Enter:
set /p pdf_file="> "

echo.
echo Convirtiendo %pdf_file% a Markdown con codificación UTF-8...

REM Ejecutar la conversión con codificación UTF-8 forzada
python -c "import sys; sys.stdout.reconfigure(encoding='utf-8'); sys.stderr.reconfigure(encoding='utf-8')" >nul 2>nul

REM Redireccionar la salida a un archivo con codificación UTF-8
python converter.py "%pdf_file%" > test_output.md

if %ERRORLEVEL% equ 0 (
    echo.
    echo ¡Conversión exitosa!
    echo El resultado se ha guardado en test_output.md
) else (
    echo.
    echo Error en la conversión. Mostrando detalles:
    echo.
    python converter.py "%pdf_file%" 2>&1
)

echo.
pause