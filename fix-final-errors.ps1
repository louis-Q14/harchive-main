# Correction massive des 26+ erreurs de syntaxe

$files = @(
    'src/pages/Amis.jsx',
    'src/pages/ChatbotIA.jsx',
    'src/pages/GroupeDetails.jsx',
    'src/pages/Messagerie.jsx',
    'src/pages/NotesEnfants.jsx',
    'src/pages/Users.jsx',
    'src/pages/AffectationProfesseurs.jsx',
    'src/pages/DifferenciationModule.jsx',
    'src/pages/Documents.jsx',
    'src/pages/MesDossiersAcademiques.jsx',
    'src/pages/PlanificationPedagogique.jsx',
    'src/pages/RotationCours.jsx'
)

$fileChanges = 0

foreach ($file in $files) {
    if (!(Test-Path $file)) {
        continue
    }

    $content = Get-Content $file -Raw
    $original = $content

    # Pattern 1: Corriger les commentaires cassés du type "await // TODO: functionService. //..."
    # Cherche le pattern exact et le remplace avec functionService.method()
    $content = [regex]::Replace($content, 'await\s+//\s*TODO:\s*functionService\.\s*//listAllUsers[''"]?\s*,\s*\{\}', "dataService.query('DemandeInscription', { filters: [{ statut: 'approuvee' }] })")
    $content = [regex]::Replace($content, 'await\s+//\s*TODO:\s*functionService\.\s*//sendFriendRequest[''"]?\s*,\s*\{([^}]*)\}', 'socialService.sendFriendRequest({ $1 })')
    $content = [regex]::Replace($content, 'await\s+//\s*TODO:\s*functionService\.\s*//acceptFriendRequest[''"]?\s*,\s*\{([^}]*)\}', 'socialService.acceptFriendRequest({ $1 })')
    $content = [regex]::Replace($content, 'await\s+//\s*TODO:\s*functionService\.\s*//rejectFriendRequest[''"]?\s*,\s*\{([^}]*)\}', 'socialService.rejectFriendRequest({ $1 })')
    $content = [regex]::Replace($content, 'await\s+//\s*TODO:\s*functionService\.\s*//removeFriend[''"]?\s*,\s*\{([^}]*)\}', 'socialService.removeFriend({ $1 })')
    $content = [regex]::Replace($content, 'await\s+//\s*TODO:\s*functionService\.\s*//blockUser[''"]?\s*,\s*\{([^}]*)\}', 'socialService.blockUser({ $1 })')
    $content = [regex]::Replace($content, 'await\s+//\s*TODO:\s*functionService\.\s*//unblockUser[''"]?\s*,\s*\{([^}]*)\}', 'socialService.unblockUser({ $1 })')
    $content = [regex]::Replace($content, 'await\s+//\s*TODO:\s*functionService\.\s*//deepseekChat[''"]?\s*,', '// TODO: Implement deepseekChat')
    $content = [regex]::Replace($content, 'await\s+//\s*TODO:\s*functionService\.\s*//getStudentPhoto[''"]?\s*,\s*\{([^}]*)\}', 'functionService.getStudentPhoto({ $1 })')
    $content = [regex]::Replace($content, 'await\s+//\s*TODO:\s*functionService\.\s*//syncAllUsers[''"]?\s*,\s*\{\}', 'functionService.syncAllUsers({})')

    # Pattern 2: Corriger les dataService.query avec crochets fermants manquants
    # Cherche le pattern { filters: [{ ... }); et remplace par { filters: [{ ... }] });
    $content = [regex]::Replace($content, "\{\s*filters:\s*\[\{\s*([^}]+)\}\s*\,\s*\}\);", "{ filters: [{ `$1 }] });")
    $content = [regex]::Replace($content, "\{\s*filters:\s*\[\{\s*([^}]+)\}\s*\}\);", "{ filters: [{ `$1 }] });")
    
    # Pattern 3: Corriger les crochets fermants simples
    $content = [regex]::Replace($content, "\{\s*filters:\s*\[\{\s*([^}]+)\}\s*\}\);", "{ filters: [{ `$1 }] });")
    $content = [regex]::Replace($content, "}\s*\,\s*\}\);", "}] });")

    # Pattern 4: Corriger les ordres mal placés (pour NotesEnfants)
    $content = [regex]::Replace($content, '\{\s*filters:\s*\[\{\s*([^}]+)\}\s*\,\s*"([^"]+)"\);', '{ filters: [{ $1 }], orderBy: "$2" });')

    if ($original -ne $content) {
        Set-Content $file -Value $content -Encoding UTF8
        $fileChanges++
        Write-Host "✅ $file corrigé"
    }
}

Write-Host "`n🎉 Correction terminée! $fileChanges fichiers modifiés."
