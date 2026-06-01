# Script de correction MASSIVE pour tous les erreurs dataService.query()

$files = @(
    'src/pages/Amis.jsx',
    'src/pages/CalendrierAcademique.jsx',
    'src/pages/DocumentsEnfants.jsx',
    'src/pages/Etablissements.jsx',
    'src/pages/GroupeDetails.jsx',
    'src/pages/Journal.jsx',
    'src/pages/MaPromotion.jsx',
    'src/pages/MesDossiersAcademiques.jsx',
    'src/pages/MesMatieres.jsx',
    'src/pages/Moderation.jsx',
    'src/pages/Messagerie.jsx',
    'src/pages/NotesEnfants.jsx',
    'src/pages/PlanificationPedagogique.jsx',
    'src/pages/RotationCours.jsx',
    'src/pages/Statistiques.jsx',
    'src/pages/SaisieNotes.jsx'
)

$fixCount = 0

foreach ($file in $files) {
    if (!(Test-Path $file)) {
        Write-Host "❌ Fichier non trouvé: $file"
        continue
    }

    $content = Get-Content $file -Raw
    $original = $content

    # Pattern 1: Corriger les accolades fermantes manquantes - cas simple }); 
    $content = [regex]::Replace($content, '\{ filters: \[\{([^}]+)\}\);', '{ filters: [{ $1 }] });')
    
    # Pattern 2: Cas avec virgule après
    $content = [regex]::Replace($content, '\{ filters: \[\{([^}]+)\}\),', '{ filters: [{ $1 }] }),')
    
    # Pattern 3: Cas sans point-virgule final
    $content = [regex]::Replace($content, '\{ filters: \[\{([^}]+)\}\)(?=\s*\})', '{ filters: [{ $1 }] })')

    if ($original -ne $content) {
        Set-Content $file -Value $content -Encoding UTF8
        $fixCount++
        Write-Host "✅ $file corrigé"
    } else {
        Write-Host "⏭️  $file : pas de modification"
    }
}

Write-Host "`n🎉 Correction terminée! $fixCount fichiers modifiés."
