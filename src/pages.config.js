/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import APropos from './pages/APropos';
import AffectationProfesseurs from './pages/AffectationProfesseurs';
import Amis from './pages/Amis';
import Applications from './pages/Applications';
import BibliothequeNumerique from './pages/BibliothequeNumerique';
import BlocNotes from './pages/BlocNotes';
import CalendrierAcademique from './pages/CalendrierAcademique';
import CalendrierPersonnel from './pages/CalendrierPersonnel';
import Connexion from './pages/Connexion';
import CompteBloque from './pages/CompteBloque';
import Dashboard from './pages/Dashboard';
import DifferenciationModule from './pages/DifferenciationModule';
import Documents from './pages/Documents';
import DocumentsEnfants from './pages/DocumentsEnfants';
import EncyclopedieAI from './pages/EncyclopedieAI';
import Etablissement from './pages/Etablissement';
import Etablissements from './pages/Etablissements';
import EtablissementsMinisteriel from './pages/EtablissementsMinisteriel';
import EtudiantsEtablissement from './pages/EtudiantsEtablissement';
import EvaluationModule from './pages/EvaluationModule';
import GaleriePhotos from './pages/GaleriePhotos';
import GestionClasse from './pages/GestionClasse';
import GestionInscriptions from './pages/GestionInscriptions';
import GestionStructureAcademique from './pages/GestionStructureAcademique';
import GroupeDetails from './pages/GroupeDetails';
import Groupes from './pages/Groupes';
import Home from './pages/Home';
import Inscription from './pages/Inscription';
import InscriptionEtablissement from './pages/InscriptionEtablissement';
import InscriptionParent from './pages/InscriptionParent';
import Journal from './pages/Journal';
import ListeEtablissements from './pages/ListeEtablissements';
import ListeProfesseurs from './pages/ListeProfesseurs';
import MaPromotion from './pages/MaPromotion';
import Matieres from './pages/Matieres';
import MesClasses from './pages/MesClasses';
import MesCotes from './pages/MesCotes';
import MesDossiersAcademiques from './pages/MesDossiersAcademiques';
import MesMatieres from './pages/MesMatieres';
import MesStatistiques from './pages/MesStatistiques';
import Messagerie from './pages/Messagerie';
import Moderation from './pages/Moderation';
import NotesEnfants from './pages/NotesEnfants';
import Parametres from './pages/Parametres';
import PartagesFichiers from './pages/PartagesFichiers';
import PlanificationPedagogique from './pages/PlanificationPedagogique';
import PressePapier from './pages/PressePapier';
import Professeurs from './pages/Professeurs';
import Profil from './pages/Profil';
import RotationCours from './pages/RotationCours';
import SaisieNotes from './pages/SaisieNotes';
import Statistiques from './pages/Statistiques';
import Users from './pages/Users';
import ValidationNotes from './pages/ValidationNotes';
import __Layout from './Layout.jsx';


export const PAGES = {
    "APropos": APropos,
    "AffectationProfesseurs": AffectationProfesseurs,
    "Amis": Amis,
    "Applications": Applications,
    "BibliothequeNumerique": BibliothequeNumerique,
    "BlocNotes": BlocNotes,
    "CalendrierAcademique": CalendrierAcademique,
    "CalendrierPersonnel": CalendrierPersonnel,
    "Connexion": Connexion,
    "CompteBloque": CompteBloque,
    "Dashboard": Dashboard,
    "DifferenciationModule": DifferenciationModule,
    "Documents": Documents,
    "DocumentsEnfants": DocumentsEnfants,
    "EncyclopedieAI": EncyclopedieAI,
    "Etablissement": Etablissement,
    "Etablissements": Etablissements,
    "EtablissementsMinisteriel": EtablissementsMinisteriel,
    "EtudiantsEtablissement": EtudiantsEtablissement,
    "EvaluationModule": EvaluationModule,
    "GaleriePhotos": GaleriePhotos,
    "GestionClasse": GestionClasse,
    "GestionInscriptions": GestionInscriptions,
    "GestionStructureAcademique": GestionStructureAcademique,
    "GroupeDetails": GroupeDetails,
    "Groupes": Groupes,
    "Home": Home,
    "Inscription": Inscription,
    "InscriptionEtablissement": InscriptionEtablissement,
    "InscriptionParent": InscriptionParent,
    "Journal": Journal,
    "ListeEtablissements": ListeEtablissements,
    "ListeProfesseurs": ListeProfesseurs,
    "MaPromotion": MaPromotion,
    "Matieres": Matieres,
    "MesClasses": MesClasses,
    "MesCotes": MesCotes,
    "MesDossiersAcademiques": MesDossiersAcademiques,
    "MesMatieres": MesMatieres,
    "MesStatistiques": MesStatistiques,
    "Messagerie": Messagerie,
    "Moderation": Moderation,
    "NotesEnfants": NotesEnfants,
    "Parametres": Parametres,
    "PartagesFichiers": PartagesFichiers,
    "PlanificationPedagogique": PlanificationPedagogique,
    "PressePapier": PressePapier,
    "Professeurs": Professeurs,
    "Profil": Profil,
    "RotationCours": RotationCours,
    "SaisieNotes": SaisieNotes,
    "Statistiques": Statistiques,
    "Users": Users,
    "ValidationNotes": ValidationNotes,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};