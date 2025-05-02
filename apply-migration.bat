@echo off
echo Supabaseにマイグレーションを適用します...

rem Supabaseプロジェクト情報の設定
set SUPABASE_URL=https://uvvxfwsduknmiwmtpbkp.supabase.co
set SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2dnhmd3NkdWtubWl3bXRwYmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MDI3NTUsImV4cCI6MjA2MTQ3ODc1NX0.VNgnMiwiG8hax3KEFX_W7wxbZfO0iCuhGRwX_69oh0U

rem SQLスクリプトの実行（PowerShellを使用してSQLをHTTPリクエストで送信）
powershell -Command "& {
    $headers = @{
        'apikey' = '%SUPABASE_KEY%'
        'Authorization' = 'Bearer %SUPABASE_KEY%'
        'Content-Type' = 'application/json'
    }
    
    $sqlContent = Get-Content -Path 'migration_auth_fix.sql' -Raw
    
    $body = @{
        query = $sqlContent
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri '%SUPABASE_URL%/rest/v1/rpc/sql' -Method POST -Headers $headers -Body $body
        Write-Host 'マイグレーションが正常に適用されました！'
    } catch {
        Write-Host 'エラーが発生しました:' $_.Exception.Message
    }
}"

pause
