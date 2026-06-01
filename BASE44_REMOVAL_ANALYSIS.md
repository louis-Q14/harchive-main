# Base44 Dependency Analysis - Phase 3 Migration Report
**Generated:** March 19, 2026

---

## Executive Summary

Total pages using Base44: **53 out of 55 pages** (96% of codebase)
Estimated API calls to replace: **1000+**
Pages with NO Base44 usage: 2 (Classes.jsx, ListeEtudiants.jsx)

---

## 1. PAGES SORTED BY BASE44 USAGE INTENSITY

### HIGH INTENSITY (15+ base44 calls each)

| Page | Base44 Methods | Call Count | Key Entities |
|------|----------------|-----------|--------------|
| [Documents.jsx](src/pages/Documents.jsx) | entities, integrations | ~15 | FichePreparation, QuestionnaireExamen, ListePresence, CalendrierAcademique, DemandeInscription, Notification |
| [PlanificationPedagogique.jsx](src/pages/PlanificationPedagogique.jsx) | entities, functions | ~20 | AssignationProfesseur, Promotion, Matiere, SequencePedagogique, RessourcePedagogique, FichePreparation, QuestionnaireExamen |
| [SaisieNotes.jsx](src/pages/SaisieNotes.jsx) | entities | ~20 | Etablissement, DemandeInscription, AssignationProfesseur, NoteEtudiant, NoteArchive |
| [RotationCours.jsx](src/pages/RotationCours.jsx) | entities, auth | ~20 | Etablissement, CalendrierAcademique, Promotion, Matiere, AssignationProfesseur, ListePresence, InstructionCours |
| [Statistiques.jsx](src/pages/Statistiques.jsx) | entities, auth | ~20 | Promotion, StatistiquePresence, ListePresence, CalendrierAcademique, AssignationProfesseur, Etudiant, DemandeInscription, User, Notification |
| [Journal.jsx](src/pages/Journal.jsx) | entities, auth, integrations | ~18 | Etablissement, DemandeInscription, DemandeInscriptionEtablissement, DemandeInscriptionParent, Publication, UploadFile |
| [Matieres.jsx](src/pages/Matieres.jsx) | entities, functions | ~18 | Etablissement, Classe, Matiere, AssignationProfesseur, EtablissementFaculte, EtablissementDepartement, EtablissementOption, EtablissementOrientation, Promotion, DemandeInscription |
| [GestionStructureAcademique.jsx](src/pages/GestionStructureAcademique.jsx) | entities | ~20 | Etablissement, EtablissementFaculte, EtablissementDepartement, EtablissementOption, EtablissementOrientation, Promotion |
| [Messagerie.jsx](src/pages/Messagerie.jsx) | entities, functions | ~20 | Conversation, Message, User function call |
| [MesDossiersAcademiques.jsx](src/pages/MesDossiersAcademiques.jsx) | entities, integrations | ~20 | DemandeInscription, CanalRenvoi, DossierInscription, UploadFile, User, Notification, Etablissement |
| [Amis.jsx](src/pages/Amis.jsx) | entities, functions | ~13 | DemandeInscription, FriendRequest, Conversation, User, listAllUsers, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend, blockUser, unblockUser |
| [BibliothequeNumerique.jsx](src/pages/BibliothequeNumerique.jsx) | entities, integrations | ~13 | Livre, UploadFile, ExtractDataFromUploadedFile |
| [GestionInscriptions.jsx](src/pages/GestionInscriptions.jsx) | entities, functions, integrations | ~13 | DemandeInscription, DemandeInscriptionEtablissement, DemandeInscriptionParent, approuverInscription, SendEmail |
| [CalendrierAcademique.jsx](src/pages/CalendrierAcademique.jsx) | entities, auth | ~12 | Etablissement, CalendrierAcademique, Classe, Matiere, AssignationProfesseur |
| [BlocNotes.jsx](src/pages/BlocNotes.jsx) | entities, auth | ~8 | Note |
| [Dashboard.jsx](src/pages/Dashboard.jsx) | entities, auth | ~12 | DemandeInscription, DemandeInscriptionParent, DemandeInscriptionEtablissement, Etablissement, updateMe, isAuthenticated |

### MEDIUM INTENSITY (8-14 base44 calls each)

| Page | Base44 Methods | Call Count | Key Entities |
|------|----------------|-----------|--------------|
| [GestionClasse.jsx](src/pages/GestionClasse.jsx) | entities, auth | ~10 | DemandeInscription, AssignationProfesseur, ObservationEleve, CalendrierAcademique |
| [AffectationProfesseurs.jsx](src/pages/AffectationProfesseurs.jsx) | entities, auth | ~8 | Etablissement, DemandeInscription, isAuthenticated |
| [Applications.jsx](src/pages/Applications.jsx) | auth | ~1 | auth.me() only |
| [Etablissements.jsx](src/pages/Etablissements.jsx) | entities, auth | ~10 | Etablissement, DemandeInscriptionEtablissement, DemandeInscription |
| [Etablissement.jsx](src/pages/Etablissement.jsx) | entities, auth | ~6 | Etablissement, DemandeInscriptionEtablissement, DemandeInscription |
| [EtudiantsEtablissement.jsx](src/pages/EtudiantsEtablissement.jsx) | entities, auth | ~8 | Etablissement, DemandeInscription |
| [EvaluationModule.jsx](src/pages/EvaluationModule.jsx) | entities, auth | ~8 | NoteEtudiant, DemandeInscription |
| [GaleriePhotos.jsx](src/pages/GaleriePhotos.jsx) | entities, integrations, auth | ~8 | Photo, UploadFile |
| [DifferenciationModule.jsx](src/pages/DifferenciationModule.jsx) | entities, auth | ~8 | ParcoursPersonnalise, DemandeInscription |
| [DocumentsEnfants.jsx](src/pages/DocumentsEnfants.jsx) | entities, auth | ~10 | DossierInscription, Etablissement, DemandeInscription, DemandeInscriptionParent |
| [EncyclopedieAI.jsx](src/pages/EncyclopedieAI.jsx) | entities, integrations, auth | ~5 | InvokeLLM (AI integration) |
| [CalendrierPersonnel.jsx](src/pages/CalendrierPersonnel.jsx) | entities, auth | ~8 | EvenementPersonnel |
| [ChatbotIA.jsx](src/pages/ChatbotIA.jsx) | functions | ~1 | deepseekChat |
| [GroupeDetails.jsx](src/pages/GroupeDetails.jsx) | entities, functions, integrations | ~15 | Group, GroupMessage, User, UploadFile, listAllUsers |
| [Groupes.jsx](src/pages/Groupes.jsx) | entities, auth | ~7 | Group |
| [Home.jsx](src/pages/Home.jsx) | entities, auth, functions | ~15 | DemandeInscription, DemandeInscriptionParent, DemandeInscriptionEtablissement, Publication, logout, redirectToLogin |
| [Inscription.jsx](src/pages/Inscription.jsx) | entities, integrations | ~12 | EtablissementAgree, EtablissementFaculte, EtablissementDepartement, EtablissementOrientation, EtablissementOption, Promotion, DemandeInscription, UploadFile |
| [InscriptionEtablissement.jsx](src/pages/InscriptionEtablissement.jsx) | entities | ~3 | EtablissementAgree, DemandeInscriptionEtablissement |
| [InscriptionParent.jsx](src/pages/InscriptionParent.jsx) | entities | ~3 | EtablissementAgree, DemandeInscriptionParent |
| [ListeEtablissements.jsx](src/pages/ListeEtablissements.jsx) | entities, auth | ~6 | EtablissementAgree |
| [ListeProfesseurs.jsx](src/pages/ListeProfesseurs.jsx) | entities, auth | ~7 | Etablissement, DemandeInscription |
| [MaPromotion.jsx](src/pages/MaPromotion.jsx) | entities, auth | ~5 | Promotion, DemandeInscription, Etudiant |
| [MesCotes.jsx](src/pages/MesCotes.jsx) | entities, auth | ~8 | DemandeInscription, Etablissement, NoteEtudiant, NoteArchive, Matiere |
| [MesMatieres.jsx](src/pages/MesMatieres.jsx) | entities, auth | ~8 | Etudiant, SalleClasse, DemandeInscription, AssignationProfesseur, Matiere |
| [MesClasses.jsx](src/pages/MesClasses.jsx) | entities, auth | ~7 | DemandeInscription, AssignationProfesseur, SequencePedagogique, ObservationEleve |
| [MesStatistiques.jsx](src/pages/MesStatistiques.jsx) | entities, auth | ~6 | DemandeInscription, StatistiquePresence, NoteEtudiant |
| [Moderation.jsx](src/pages/Moderation.jsx) | entities | ~5 | Publication, Commentaire |
| [NotesEnfants.jsx](src/pages/NotesEnfants.jsx) | entities, functions, auth | ~12 | NoteEtudiant, NoteArchive, Matiere, DemandeInscriptionParent, DemandeInscription, Etablissement, getStudentPhoto |
| [PartagesFichiers.jsx](src/pages/PartagesFichiers.jsx) | entities, integrations, auth | ~10 | FichierPartage, UploadFile |
| [PressePapier.jsx](src/pages/PressePapier.jsx) | entities, auth | ~6 | PressePapier |
| [Professeurs.jsx](src/pages/Professeurs.jsx) | entities, auth | ~5 | User, AssignationProfesseur |
| [Profil.jsx](src/pages/Profil.jsx) | entities, integrations, auth | ~10 | User, UploadFile, updateMe |
| [Users.jsx](src/pages/Users.jsx) | entities, functions, auth | ~11 | DemandeInscription, DemandeInscriptionParent, DemandeInscriptionEtablissement, listAllUsers, syncAllUsers |
| [ValidationNotes.jsx](src/pages/ValidationNotes.jsx) | entities, auth | ~10 | NoteEtudiant, NoteArchive, DemandeInscription, Etudiant |

### LOW/NO INTENSITY

| Page | Base44 Usage | Notes |
|------|------------|-------|
| [APropos.jsx](src/pages/APropos.jsx) | None except URLs | Static page, only reference to base44 URLs for images |
| [Classes.jsx](src/pages/Classes.jsx) | **NONE** | ✅ No base44 usage |
| [ListeEtudiants.jsx](src/pages/ListeEtudiants.jsx) | **NONE** | ✅ No base44 usage |

---

## 2. BASE44 METHOD GROUPINGS FOR MIGRATION

### Group A: Authentication (Priority 1 - Core)
```javascript
base44.auth.me()              // Replace with GET /api/auth/me
base44.auth.isAuthenticated() // Replace with GET /api/auth/check
base44.auth.updateMe(data)    // Replace with PUT /api/auth/me
base44.auth.logout()          // Replace with POST /api/auth/logout
base44.auth.redirectToLogin() // Replace with redirect helper
```

### Group B: User Management (Priority 2)
```javascript
base44.entities.User.list()
base44.entities.User.get(id)
base44.entities.User.filter({...})
base44.entities.User.create(data)
base44.entities.User.update(id, data)
base44.entities.User.delete(id)
```

### Group C: Inscription/Enrollment (Priority 2)
```javascript
base44.entities.DemandeInscription.list()
base44.entities.DemandeInscription.filter({...})
base44.entities.DemandeInscription.create(data)
base44.entities.DemandeInscription.update(id, data)
base44.entities.DemandeInscription.delete(id)
base44.entities.DemandeInscriptionParent.* (same pattern)
base44.entities.DemandeInscriptionEtablissement.* (same pattern)
```

### Group D: Academic Structure (Priority 3)
```javascript
base44.entities.Etablissement.*
base44.entities.Classe.*
base44.entities.Promotion.*
base44.entities.Matiere.*
base44.entities.AssignationProfesseur.*
base44.entities.CalendrierAcademique.*
```

### Group E: Grades/Notes (Priority 3)
```javascript
base44.entities.NoteEtudiant.*
base44.entities.NoteArchive.*
base44.entities.StatistiquePresence.*
```

### Group F: Communication (Priority 4)
```javascript
base44.entities.Conversation.*
base44.entities.Message.*
base44.entities.Group.*
base44.entities.GroupMessage.*
base44.entities.Publication.*
base44.entities.Commentaire.*
base44.entities.Notification.*
```

### Group G: File Management (Priority 4)
```javascript
base44.integrations.Core.UploadFile({file})
base44.integrations.Core.ExtractDataFromUploadedFile({...})
base44.entities.FichierPartage.*
base44.entities.Photo.*
```

### Group H: Special Operations (Priority 5)
```javascript
base44.functions.invoke('approuverInscription', {})
base44.functions.invoke('listAllUsers', {})
base44.functions.invoke('syncAllUsers', {})
base44.functions.invoke('sendFriendRequest', {targetUserId})
base44.functions.invoke('acceptFriendRequest', {requesterId})
base44.functions.invoke('rejectFriendRequest', {requesterId})
base44.functions.invoke('removeFriend', {friendId})
base44.functions.invoke('blockUser', {targetUserId})
base44.functions.invoke('unblockUser', {targetUserId})
base44.functions.invoke('getStudentPhoto', {email})
base44.functions.invoke('listEtablissementUsers', {role})
base44.functions.invoke('exportMatieres', {})
base44.functions.invoke('deepseekChat', {prompt})
base44.integrations.Core.InvokeLLM({})
base44.integrations.Core.SendEmail({})
```

---

## 3. ENTITY USAGE FREQUENCY ANALYSIS

### TIER 1: Core Entities (15+ pages)
- **DemandeInscription**: 35 pages - Student enrollment requests
- **Etablissement**: 20 pages - Institutions
- **User**: 15 pages - User profiles
- **Matiere**: 12 pages - Subjects/Courses

### TIER 2: Major Entities (10-14 pages)
- **Classe**: 8 pages
- **AssignationProfesseur**: 10 pages - Teacher assignments
- **CalendrierAcademique**: 8 pages - Academic calendar
- **NoteEtudiant**: 10 pages - Student grades
- **DemandeInscriptionParent**: 8 pages
- **DemandeInscriptionEtablissement**: 8 pages

### TIER 3: Medium Entities (5-9 pages)
- **Promotion**: 8 pages
- **ListePresence**: 6 pages - Attendance lists
- **Group**: 4 pages - Discussion groups
- **Conversation**: 3 pages - Direct messaging
- **Message**: 3 pages
- **Photo**: 3 pages
- **Publication**: 3 pages - Social posts
- **Notification**: 5 pages
- **FichePreparation**: 4 pages
- **QuestionnaireExamen**: 4 pages
- **StatistiquePresence**: 4 pages
- **NoteArchive**: 5 pages

### TIER 4: Specialized Entities (1-4 pages)
- **EvenementPersonnel**: 2 pages
- **RessourcePedagogique**: 2 pages
- **SequencePedagogique**: 3 pages
- **EtablissementFaculte**, **EtablissementDepartement**, **EtablissementOption**, **EtablissementOrientation**: 3-4 pages each
- **FichierPartage**, **PressePapier**, **Livre**, **Note**, **Commentaire**, **CanalRenvoi**, **DossierInscription**, **Etudiant**, **SalleClasse**, **EtablissementAgree**, **ObservationEleve**, **InstructionCours**, **ParcoursPersonnalise**, **Collective**: 1-2 pages each

---

## 4. REPLACEMENT STRATEGY BY PHASE

### Phase 1: Authentication Layer (1 week)
- Create `src/api/authService.js` with replacements for `base44.auth.*`
- Update 53 pages with new auth calls
- Test login/logout flow

### Phase 2: Core Entities (2 weeks)
- Create entity service layer for all CRUD operations
- Priority: User, Etablissement, DemandeInscription, Classe
- Update 45+ pages

### Phase 3: Academic Structure (2 weeks)
- Matiere, AssignationProfesseur, CalendrierAcademique, Promotion
- Update 20+ pages

### Phase 4: Communication Features (1.5 weeks)
- Conversation, Message, Group, Publication, Notification
- Update 15 pages

### Phase 5: Specialized Features (1.5 weeks)
- Grades, Attendance, Files, Photos
- Update 25+ pages

### Phase 6: Function Invocations (1 week)
- Replace all `base44.functions.invoke()` calls
- Replace `base44.integrations.Core.*` calls
- Create backend API endpoints for these operations

### Phase 7: Testing & Integration (1 week)
- Full end-to-end testing
- Performance testing
- Remove base44 client completely

---

## 5. CRITICAL DEPENDENCIES TO HANDLE

1. **Query Caching Pattern**: Many pages use React Query with `base44.entities.X.list()` - ensure cache invalidation strategy
2. **File Uploads**: Multiple pages use `base44.integrations.Core.UploadFile()` - create local file upload endpoint
3. **LLM Integration**: `base44.integrations.Core.InvokeLLM()` in 2 pages - proxy to backend
4. **Email Sending**: `base44.integrations.Core.SendEmail()` in GestionInscriptions
5. **Complex Functions**: `approuverInscription` has business logic - document carefully
6. **Real-time Updates**: Notification system depends on base44 - plan for socket.io or polling

---

## 6. PAGES TO SCHEDULE FOR EARLY MIGRATION

**Top Priority** (highest impact):
1. Dashboard.jsx - Landing page
2. Home.jsx - New user entry
3. Profil.jsx - User management
4. GestionInscriptions.jsx - Core business process
5. Matieres.jsx - Academic management

---

## 7. NOTES FOR MIGRATION TEAM

- **Search for "base44" references**: Use pattern `import.*base44|\.base44\.|base44\.` to find all usage
- **Entity CRUD Pattern**: Standardize all entity operations to REST/GraphQL queries
- **Function Invocation Pattern**: Each `base44.functions.invoke()` needs an equivalent backend endpoint
- **Integration Pattern**: File uploads and external service calls need middleware
- **Testing Strategy**: Create mock services that mimic base44 behavior for testing
- **Rollback Plan**: Keep base44 imports until all new APIs are tested

---

## APPENDIX: Complete Page-by-Page Listing

### All 53 Pages Using Base44

1. ✅ AffectationProfesseurs.jsx - ~8 calls
2. ✅ Amis.jsx - ~13 calls
3. ✅ Applications.jsx - 1 call
4. ✅ BibliothequeNumerique.jsx - ~13 calls
5. ✅ BlocNotes.jsx - ~8 calls
6. ✅ CalendrierAcademique.jsx - ~12 calls
7. ✅ CalendrierPersonnel.jsx - ~8 calls
8. ✅ ChatbotIA.jsx - 1 call
9. ✅ Dashboard.jsx - ~12 calls
10. ✅ DifferenciationModule.jsx - ~8 calls
11. ✅ Documents.jsx - ~15 calls
12. ✅ DocumentsEnfants.jsx - ~10 calls
13. ✅ EncyclopedieAI.jsx - ~5 calls
14. ✅ Etablissement.jsx - ~6 calls
15. ✅ Etablissements.jsx - ~10 calls
16. ✅ EtudiantsEtablissement.jsx - ~8 calls
17. ✅ EvaluationModule.jsx - ~8 calls
18. ✅ GaleriePhotos.jsx - ~8 calls
19. ✅ GestionClasse.jsx - ~10 calls
20. ✅ GestionInscriptions.jsx - ~13 calls
21. ✅ GestionStructureAcademique.jsx - ~20 calls
22. ✅ GroupeDetails.jsx - ~15 calls
23. ✅ Groupes.jsx - ~7 calls
24. ✅ Home.jsx - ~15 calls
25. ✅ Inscription.jsx - ~12 calls
26. ✅ InscriptionEtablissement.jsx - ~3 calls
27. ✅ InscriptionParent.jsx - ~3 calls
28. ✅ Journal.jsx - ~18 calls
29. ✅ ListeEtablissements.jsx - ~6 calls
30. ✅ ListeProfesseurs.jsx - ~7 calls
31. ✅ MaPromotion.jsx - ~5 calls
32. ✅ Matieres.jsx - ~18 calls
33. ✅ MesCotes.jsx - ~8 calls
34. ✅ MesClasses.jsx - ~7 calls
35. ✅ MesDossiersAcademiques.jsx - ~20 calls
36. ✅ MesMatieres.jsx - ~8 calls
37. ✅ MesStatistiques.jsx - ~6 calls
38. ✅ Messagerie.jsx - ~20 calls
39. ✅ Moderation.jsx - ~5 calls
40. ✅ NotesEnfants.jsx - ~12 calls
41. ✅ PartagesFichiers.jsx - ~10 calls
42. ✅ PlanificationPedagogique.jsx - ~20 calls
43. ✅ PressePapier.jsx - ~6 calls
44. ✅ Professeurs.jsx - ~5 calls
45. ✅ Profil.jsx - ~10 calls
46. ✅ RotationCours.jsx - ~20 calls
47. ✅ SaisieNotes.jsx - ~20 calls
48. ✅ Statistiques.jsx - ~20 calls
49. ✅ Users.jsx - ~11 calls
50. ✅ ValidationNotes.jsx - ~10 calls
51. ✅ APropos.jsx - 0 calls (only URL references)
52. ❌ Classes.jsx - NO base44 usage
53. ❌ ListeEtudiants.jsx - NO base44 usage

**Total Estimated Replacement Work**: ~500-600 API calls across all pages

