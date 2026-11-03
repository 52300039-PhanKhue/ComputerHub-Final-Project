@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo =====================================================
echo COMPUTERHUB - NODE.JS + MONGODB ATLAS - KHONG SQL
 echo =====================================================
where node >nul 2>&1
if errorlevel 1 (
  echo LOI: Chua cai Node.js 20+ hoac node khong nam trong PATH.
  pause
  exit /b 1
)
if not exist ".env" (
  echo CHUA CO .env. Hay copy .env CU tu du an dang chay.
  echo Hoac chay CAU_HINH_MONGODB_ATLAS.cmd de tao va dien URI Atlas.
  pause
  exit /b 1
)
findstr /B /C:"MONGODB_URI=mongodb" ".env" >nul
if errorlevel 1 (
  echo .env chua co MONGODB_URI. Hay mo .env va nhap URI Atlas that.
  pause
  exit /b 1
)
if not exist "node_modules\express\package.json" (
  echo Dang cai thu vien: npm ci --no-audit --no-fund
  call npm ci --no-audit --no-fund
  if errorlevel 1 (
    echo LOI: npm ci that bai. Kiem tra Internet va version Node.js.
    pause
    exit /b 1
  )
)
echo Dang mo website tai http://localhost:3000
call npm start
echo Website da dung hoac co loi. Xem thong bao phia tren.
pause
exit /b 0
