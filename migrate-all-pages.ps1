# Migration script for remaining 48 pages
# Filters: Exclude Dashboard, Home, Profil, GestionInscriptions, Matieres

$pages_dir = "src/pages"
$exclude_pages = @("Dashboard.jsx", "Home.jsx", "Profil.jsx", "GestionInscriptions.jsx", "Matieres.jsx")

$pages = Get-ChildItem $pages_dir -Filter "*.jsx" | Where-Object { $_.Name -notin $exclude_pages }

Write-Host "🚀 Migrating $($pages.Count) pages..." -ForegroundColor Green

foreach ($page in $pages) {
    $filepath = Join-Path $pages_dir $page.Name
    $content = Get-Content $filepath -Raw
    
    # Skip if already migrated (contains authService import)
    if ($content -match "import.*authService.*from.*@/api") {
        Write-Host "⏭️  SKIP $($page.Name) (already migrated)"
        continue
    }
    
    # Skip if no base44 usage
    if ($content -notmatch "base44") {
        Write-Host "⏭️  SKIP $($page.Name) (no base44 usage)"
        continue
    }
    
    Write-Host "🔄 Migrating $($page.Name)..." -ForegroundColor Cyan
    
    # 1. Replace import
    $content = $content -replace 'import\s*{\s*base44\s*}\s*from\s*["\']@/api/base44Client["\'];?', 'import { authService, dataService, functionService } from "@/api";'
    
    # 2. Replace auth.me() calls
    $content = $content -replace 'base44\.auth\.me\(\)', 'authService.getCurrentUser()'
    
    # 3. Replace auth.updateMe calls
    $content = $content -replace 'base44\.auth\.updateMe\(', 'authService.updateProfile('
    
    # 4. Replace base44.functions.invoke -> functionService.xxx
    # This will be a TODO for now since function names vary
    $content = $content -replace "base44\.functions\.invoke\('([^']+)'", "// TODO: functionService.`$1("
    
    # 5. Replace entity operations - simple patterns
    # base44.entities.X.list(...) -> dataService.query('X', ...)
    $content = $content -replace 'base44\.entities\.(\w+)\.list\(\)', "dataService.query('`$1')"
    $content = $content -replace "base44\.entities\.(\w+)\.list\('([^']*)'\)", "dataService.query('`$1', { orderBy: '`$2' })"
    
    # base44.entities.X.filter(...) -> dataService.query('X', ...)
    $content = $content -replace 'base44\.entities\.(\w+)\.filter\(\{', "dataService.query('`$1', { filters: [{"
    $content = $content -replace 'base44\.entities\.(\w+)\.filter\(', "dataService.query('`$1', { filters: [{"
    
    # base44.entities.X.create(...) -> dataService.create('X', ...)
    $content = $content -replace 'base44\.entities\.(\w+)\.create\(', "dataService.create('`$1', "
    
    # base44.entities.X.update(id, -> dataService.update('X', id,
    $content = $content -replace 'base44\.entities\.(\w+)\.update\(', "dataService.update('`$1', "
    
    # base44.entities.X.delete(id) -> dataService.delete('X', id)
    $content = $content -replace 'base44\.entities\.(\w+)\.delete\(', "dataService.delete('`$1', "
    
    # 6. Mark integrations as TODO
    $content = $content -replace 'base44\.integrations\.Core\.UploadFile', '// TODO: fileService.uploadFile'
    $content = $content -replace 'base44\.integrations\.Core\.SendEmail', '// TODO: emailService.sendEmail'
    
    # Save file
    Set-Content $filepath $content -Encoding UTF8
    Write-Host "✅ $($page.Name)" -ForegroundColor Green
}

Write-Host "`n🎉 Migration complete!" -ForegroundColor Cyan
