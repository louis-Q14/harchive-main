╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║                   🚀 POSTMAN - DÉMARRAGE RAPIDE 🚀                        ║
║                                                                            ║
║                        3 Étapes Seulement!                               ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝


═════════════════════════════════════════════════════════════════════════════
✅ ÉTAPE 1: LANCER LE BACKEND
═════════════════════════════════════════════════════════════════════════════

Double-cliquez sur ce fichier:

  📁 c:\Users\LOUIS-QUATORZE\Documents\harchive-main\
     └─ START_BACKEND.bat

Vous verrez:
  ✅ Server running on http://localhost:3001

Laissez cette fenêtre ouverte!


═════════════════════════════════════════════════════════════════════════════
💻 ÉTAPE 2: OUVRIR POSTMAN & IMPORTER
═════════════════════════════════════════════════════════════════════════════

1. Ouvrez Postman
   (Téléchargement: https://www.postman.com/download/)

2. Cliquez File → Import

3. Sélectionnez ce fichier:
   C:\Users\LOUIS-QUATORZE\Documents\harchive-main\backend\
   HARCHIVE_Backend_Tests.postman_collection.json

4. Cliquez Import ✅

5. Recommencez File → Import pour l'environnement:
   C:\Users\LOUIS-QUATORZE\Documents\harchive-main\backend\
   HARCHIVE_Backend_Environment.postman_environment.json

6. Cliquez Import ✅


═════════════════════════════════════════════════════════════════════════════
🎯 ÉTAPE 3: SÉLECTIONNER ENVIRONNEMENT & TESTER
═════════════════════════════════════════════════════════════════════════════

SÉLECTIONNER L'ENVIRONNEMENT:
  1. En haut à droite Postman, il y a un dropdown
  2. Cliquez sur le dropdown (dit "No Environment" ou blank)
  3. Sélectionnez: HARCHIVE Backend Environment ✅

LANCER LES TESTS:
  OPTION A - Tests un par un (débutants):
    1. À gauche, trouvez "HARCHIVE Backend Tests"
    2. Cliquez sur "1. Health Check"
    3. Cliquez le bouton bleu "Send"
    4. En bas à droite: vous verrez {"status": "ok"} ✅
    5. Continuez con les tests 2, 3, 4, etc.

  OPTION B - Tous les tests d'un coup (automatisé):
    1. À gauche, trouvez "HARCHIVE Backend Tests"
    2. Cliquez sur "..." (trois points)
    3. Cliquez "Run collection"
    4. Cliquez le bouton "Run HARCHIVE Backend Tests"
    5. Regardez tous les 11 tests s'exécuter! ✅


═════════════════════════════════════════════════════════════════════════════
🎉 RÉSULTATS ATTENDUS
═════════════════════════════════════════════════════════════════════════════

Chaque test devrait afficher:
  ✅ Status: 200 OK (ou 201 Created)
  ✅ Response: JSON formaté
  ✅ Test Result: PASS

Tous les tests ensemble:
  11/11 PASS ✅


═════════════════════════════════════════════════════════════════════════════
❓ BESOIN D'AIDE?
═════════════════════════════════════════════════════════════════════════════

Problème                          Solution
─────────────────────────────────────────────────────────────────────────
Backend ne démarre pas             Vérifiez: C:\Users\LOUIS-QUATORZE\
                                   Documents\harchive-main\backend\
                                   data\harchive.db existe?

"Cannot connect"                   Assurez-vous START_BACKEND.bat 
                                   tourne (fenêtre ouverte)

"401 Unauthorized"                 Tests doivent s'exécuter dans l'ordre!
                                   Commencez par test 1

Postman ne peut pas importer       Vérifiez les chemins de fichiers
                                   (pas d'accents ou caractères spéciaux)

"Email already exists"             Supprimez: backend/data/harchive.db
                                   Redémarrez backend


═════════════════════════════════════════════════════════════════════════════
📚 PLUS DE DÉTAILS
═════════════════════════════════════════════════════════════════════════════

Fichiers disponibles pour approfondir:

  → POSTMAN_GUIDE.md                (Guide détaillé - 170+ lignes)
  → TESTING_GUIDE.md                (Référence complète - 300+ lignes)
  → TEST_README.md                  (Quick reference - 150 lignes)
  → SETUP_SUMMARY.txt               (Vue d'ensemble)


═════════════════════════════════════════════════════════════════════════════
🚀 C'EST TOUT!
═════════════════════════════════════════════════════════════════════════════

  1. Lancer backend →  START_BACKEND.bat
  2. Ouvrir Postman
  3. Importer 2 fichiers
  4. Sélectionner environnement
  5. Cliquer "Send"
  6. Voir les tests passer ✅

Bonne chance! 🎉

═════════════════════════════════════════════════════════════════════════════
