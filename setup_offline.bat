@echo off
REM Batch file to set up Despacho Contable offline processing

REM Create project directory structure
echo Creating project directories...
mkdir "C:\Users\susan\OneDrive\Escritorio\DESPACHO\COBRANZA\2026" 2>nul
mkdir "C:\Users\susan\OneDrive\Escritorio\DESPACHO\COBRANZA\2026\RECIBOS" 2>nul

echo Project setup complete.
echo.
echo You can now run the Python offline processor with: python offline_ticket_processor.py
echo.
echo The processor will:
-echo 1. Check internet connectivity
-echo 2. Save tickets offline if no connection
-echo 3. Format images with appropriate naming
- echo 4. Store in month-name folders
@echo off
