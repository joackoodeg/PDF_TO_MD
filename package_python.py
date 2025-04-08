# package_python.py
import PyInstaller.__main__
import os
import sys
import shutil

# Ruta al entorno virtual
venv_path = os.path.join(os.getcwd(), 'venv')
python_path = os.path.join(venv_path, 'Scripts', 'python.exe')

# Opciones de PyInstaller
options = [
    '--distpath=./python-dist',
    '--workpath=./build',
    '--noconfirm',
    '--hidden-import=fitz',
    '--hidden-import=markdownify',
    '--onedir',
    '--name=python',
    python_path
]

# Ejecutar PyInstaller
PyInstaller.__main__.run(options)

# Mover python.exe a la raíz del directorio
src = os.path.join('python-dist', 'python', 'python.exe')
dst = os.path.join('python-dist', 'python.exe')
shutil.copy(src, dst)

print('Python empaquetado completado.')