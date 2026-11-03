@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"
set "FAIL=0"
> "BAO_CAO_TEST_OFFLINE_NHANH.txt" echo COMPUTERHUB NODE JS / MONGODB ATLAS - OFFLINE TEST
>> "BAO_CAO_TEST_OFFLINE_NHANH.txt" echo Khong ket noi DB; KHONG du dieu kien de ket luan 10 diem.
where node >nul 2>&1
if errorlevel 1 (
  echo FAIL: May chua cai Node.js 20+
  pause
  exit /b 1
)
echo [1/4] KIEM TRA CU PHAP
call npm run verify:syntax
if errorlevel 1 (call :fail syntax) else (call :pass syntax)
echo [2/4] GIỎ HANG / QUANTITY
call npm run test:quantity
if errorlevel 1 (call :fail quantity) else (call :pass quantity)
echo [3/4] HOI QUY UI
call npm run test:ui-regression
if errorlevel 1 (call :fail ui-regression) else (call :pass ui-regression)
echo [4/4] RUBRIC TINH (CHI KIEM TRA HIEN DIEN TRONG SOURCE)
node kiem_tra_rubric.js
if errorlevel 1 (call :fail rubric-code) else (call :pass rubric-code)
echo.
echo Test offline xong. So bai FAIL: %FAIL%
echo BAO_CAO_TEST_OFFLINE_NHANH.txt
if "%FAIL%"=="0" (
  echo PASS OFFLINE - CHUA DU DE KET LUAN 10 DIEM.
) else (
  echo CO LOI - XEM BAO CAO VA TERMINAL.
)
pause
if "%FAIL%"=="0" (endlocal & exit /b 0) else (endlocal & exit /b 1)
:pass
echo PASS: %~1
>> "BAO_CAO_TEST_OFFLINE_NHANH.txt" echo PASS: %~1
exit /b 0
:fail
echo FAIL: %~1
>> "BAO_CAO_TEST_OFFLINE_NHANH.txt" echo FAIL: %~1
set /a FAIL+=1
exit /b 0
