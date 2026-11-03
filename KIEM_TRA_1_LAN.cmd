@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"
set "REPORT=BAO_CAO_TEST_TONG_HOP.txt"
set "FAILS=0"
set "WARNINGS=0"
> "%REPORT%" echo KIEM TRA COMPUTERHUB -- KET QUA CHAY TREN MAY CUA BAN
>> "%REPORT%" echo Luu y: PASS cac script KHONG dong nghia full diem 10.
echo.
echo ====================================================
echo   COMPUTERHUB: KIEM TRA TONG HOP MOT LAN
 echo ====================================================
echo.
if not exist "package.json" (
  echo FAIL: Dat 2 file test trong thu muc co package.json
  >> "%REPORT%" echo FAIL: Sai thu muc (thieu package.json)
  pause
  exit /b 2
)
where node >nul 2>&1
if errorlevel 1 (
  echo FAIL: Chua cai Node.js hoac chua them vao PATH.
  >> "%REPORT%" echo FAIL: Node.js missing
  pause
  exit /b 2
)
node -v
call npm -v
if not exist "node_modules" (
  echo [SETUP] Thu muc node_modules chua co. Dang chay npm ci...
  call npm ci --no-audit --no-fund
  if errorlevel 1 (
    echo FAIL: npm ci
    >> "%REPORT%" echo FAIL: npm ci
    pause
    exit /b 2
  )
)
echo.
echo [0/5] Test hoi quy gio hang / so luong
call npm run test:quantity
if errorlevel 1 (call :bad quantity) else (call :good quantity)
echo [0b/5] Test hoi quy frontend V6.2
call npm run test:ui-regression
if errorlevel 1 (call :bad ui-regression) else (call :good ui-regression)
echo.
echo [1/5] Kiem tra cu phap
call npm run verify:syntax
if errorlevel 1 (call :bad syntax) else (call :good syntax)
echo.
echo [2/5] Kiem tra models va EJS
call npm run test:static
if errorlevel 1 (call :bad static) else (call :good static)
echo.
echo [3/5] Kiem tra rubric tren code, cau hinh, file nop bai
node kiem_tra_rubric.js
if errorlevel 1 (call :bad rubric-code) else (call :good rubric-code)
echo.
echo [4/5] MongoDB smoke (MongoDB TEST RIENG, khong su dung npm run seed tren DB chinh)
echo Can co ket noi MongoDB Atlas; co the mat mot vai phut.
call npm test
if errorlevel 1 (call :bad mongodb-smoke) else (call :good mongodb-smoke)
echo.
echo [5/5] Kiem tra bao mat thu vien npm
call npm audit --audit-level=high
if errorlevel 1 (call :bad npm-audit) else (call :good npm-audit)
echo.
echo [TUY CHON] Kiem tra cu phap Docker Compose (KHONG khoi dong / KHONG seed)
where docker >nul 2>&1
if errorlevel 1 (
  echo CHECK: Docker chua co / khong trong PATH.
  >> "%REPORT%" echo CHECK: Docker khong kha dung de kiem tra
  set /a WARNINGS+=1
) else (
  docker compose config -q
  if errorlevel 1 (call :bad docker-config) else (call :good docker-config)
)
echo.
echo ====================================================
echo Da chay xong. Xem file: %REPORT%
echo Xem them: BAO_CAO_RUBRIC_CODE.txt
echo So bai FAIL: %FAILS%, muc can xem lai: %WARNINGS%
echo CHUA THE KET LUAN 10/10 CHO DEN KHI TEST MANUAL, DOCKER VA HO SO NOP BAI.
echo ====================================================
>> "%REPORT%" echo.
>> "%REPORT%" echo SO MUC FAIL: %FAILS%
>> "%REPORT%" echo Can kiem tra ngoai: Google OAuth, email, Docker chay thuc, giao dien, ho so nop bai.
pause
endlocal
exit /b 0
:good
 echo PASS: %~1
 >> "%REPORT%" echo PASS: %~1
 exit /b 0
:bad
 echo FAIL: %~1
 >> "%REPORT%" echo FAIL: %~1
 set /a FAILS+=1
 exit /b 0
