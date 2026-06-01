$pages_dir = "src\pages"
$pattern_count = 0

# Get all .jsx files with base44 imports
$jsfiles = Get-ChildItem -Path $pages_dir -Filter "*.jsx" -Recurse | Where-Object { 
    (Get-Content $_.FullName -Raw) -match 'base44'
}

Write-Host "Found $($jsfiles.Count) files to migrate" -ForegroundColor Cyan

foreach ($file in $jsfiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Pattern 1: Replace import
    if ($content -like '*import { base44 }*') {
        $content = $content -replace 'import\s*\{[^}]*base44[^}]*\}\s*from\s*[''"]@/api/base44Client[''"];?', 'import { authService, dataService, functionService } from "@/api";'
        $pattern_count++
    }
    
    # Pattern 2: auth.me()
    $content = $content -replace 'base44\.auth\.me\(\)', 'authService.getCurrentUser()'
    
    # Pattern 3: auth.updateMe
    $content = $content -replace 'base44\.auth\.updateMe\(', 'authService.updateProfile('
    
    # Pattern 4: entities.*.list()
    $content = $content -replace 'base44\.entities\.(\w+)\.list\(\)', 'dataService.query(''$1'')'
    
    # Pattern 5: entities.*.filter({
    $content = $content -replace 'base44\.entities\.(\w+)\.filter\(', 'dataService.query(''$1'', { filters: ['
    
    # Pattern 6: entities.*.create(
    $content = $content -replace 'base44\.entities\.(\w+)\.create\(', 'dataService.create(''$1'', '
    
    # Pattern 7: entities.*.update(
    $content = $content -replace 'base44\.entities\.(\w+)\.update\(', 'dataService.update(''$1'', '
    
    # Pattern 8: entities.*.delete(
    $content = $content -replace 'base44\.entities\.(\w+)\.delete\(', 'dataService.delete(''$1'', '
    
    # Pattern 9: functions.invoke
    $content = $content -replace "base44\.functions\.invoke\('", '// TODO: functionService. //'
    
    # Save
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
    Write-Host "✅ $($file.BaseName)" -Foreground Green
}

Write-Host "`n🎉 Migration complete! $($jsfiles.Count) files processed" -ForegroundColor Cyan
