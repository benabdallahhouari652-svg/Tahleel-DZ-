@echo off
chcp 65001 >nul
echo ========================================================
echo   رفع تطبيق تحليل DZ إلى GitHub ونشره على Vercel
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] تهيئة مستودع Git وإضافة الملفات...
git init
git add .
git commit -m "Initial release: Tahleel DZ (تحليل DZ)"

echo.
echo [2/3] الربط مع مستودع GitHub...
echo الرجاء إنشاء مستودع جديد على حسابك في GitHub بالاسم: Tahleel-DZ
echo الرابط: https://github.com/new
echo.
set /p REPO_URL="أدخل رابط المستودع (مثال: https://github.com/username/Tahleel-DZ.git): "

if not "%REPO_URL%"=="" (
    git branch -M main
    git remote remove origin 2>nul
    git remote add origin %REPO_URL%
    git push -u origin main
    echo.
    echo [✓] تم الرفع بنجاح إلى GitHub!
) else (
    echo [!] لم يتم إدخال رابط مستودع GitHub، يمكنك تنفيذه يدوياً لاحقاً.
)

echo.
echo [3/3] النشر السحابي على Vercel...
echo سيتم الآن تشغيل أداة Vercel لنشر التطبيق أونلاين:
vercel --prod

echo.
echo ========================================================
echo   انتهت العملية بنجاح! مبروك نشر تطبيق تحليل DZ
echo ========================================================
pause
