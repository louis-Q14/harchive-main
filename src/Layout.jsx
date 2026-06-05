import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { dataService } from "@/api/dataService";
import { authService } from "@/api/authService";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Users, 
  FileText,
  LogOut,
  School,
  ClipboardList,
  BarChart3,
  User,
  Newspaper,
  MessageCircle,
  UserPlus,
  Shield,
  Building2,
  Zap,
  Info,
  Settings,
  Video
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { formatUserName } from "@/components/utils/nameUtils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const roleNavigation = {
  super_admin: [
    { title: "Journal", url: "Journal", icon: "/assets/icons/eb36099c9_news-paper.png", isCustomIcon: true },
    { title: "Profil", url: "Profil", icon: "/assets/icons/d92f9c844_user-avatar.png", isCustomIcon: true },
    { title: "Galerie Photos", url: "GaleriePhotos", icon: "/assets/icons/6db68e5c5_photos.png", isCustomIcon: true },
    { title: "Galerie Vidéo", url: "GalerieVideo", icon: Video },
    { title: "Amis", url: "Amis", icon: "/assets/icons/0f08956b7_people.png", isCustomIcon: true },
    { title: "Groupes", url: "Groupes", icon: "/assets/icons/273813ec5_group1.png", isCustomIcon: true },
    { title: "Messagerie", url: "Messagerie", icon: "/assets/icons/e5073e7f6_chat.png", isCustomIcon: true },
    { title: "Tableau de Bord", url: "Dashboard", icon: "/assets/icons/b30618a5e_menu.png", isCustomIcon: true },
    { title: "Applications", url: "Applications", icon: "/assets/icons/3453b132d_menu1.png", isCustomIcon: true },
    { title: "Modération", url: "Moderation", icon: "/assets/icons/1cad146b6_shield.png", isCustomIcon: true },
    { title: "Inscriptions", url: "GestionInscriptions", icon: "/assets/icons/58206507a_open-enrollment.png", isCustomIcon: true },
    { title: "Établissements", url: "Etablissements", icon: "/assets/icons/0e7785a54_university.png", isCustomIcon: true },
    { title: "Liste des Établissements", url: "ListeEtablissements", icon: "/assets/icons/b527bb6dc_university1.png", isCustomIcon: true },
    { title: "Utilisateurs", url: "Users", icon: "/assets/icons/6961e1dfa_user1.png", isCustomIcon: true },
    { title: "Paramètres", url: "Parametres", icon: Settings },
  ],
  admin_systeme: [
    { title: "Journal", url: "Journal", icon: "/assets/icons/eb36099c9_news-paper.png", isCustomIcon: true },
    { title: "Profil", url: "Profil", icon: "/assets/icons/d92f9c844_user-avatar.png", isCustomIcon: true },
    { title: "Galerie Photos", url: "GaleriePhotos", icon: "/assets/icons/6db68e5c5_photos.png", isCustomIcon: true },
    { title: "Galerie Vidéo", url: "GalerieVideo", icon: Video },
    { title: "Amis", url: "Amis", icon: "/assets/icons/0f08956b7_people.png", isCustomIcon: true },
    { title: "Groupes", url: "Groupes", icon: "/assets/icons/273813ec5_group1.png", isCustomIcon: true },
    { title: "Messagerie", url: "Messagerie", icon: "/assets/icons/e5073e7f6_chat.png", isCustomIcon: true },
    { title: "Tableau de Bord", url: "Dashboard", icon: "/assets/icons/b30618a5e_menu.png", isCustomIcon: true },
    { title: "Applications", url: "Applications", icon: "/assets/icons/3453b132d_menu1.png", isCustomIcon: true },
    { title: "Modération", url: "Moderation", icon: "/assets/icons/1cad146b6_shield.png", isCustomIcon: true },
    { title: "Inscriptions", url: "GestionInscriptions", icon: "/assets/icons/58206507a_open-enrollment.png", isCustomIcon: true },
    { title: "Établissements", url: "Etablissements", icon: "/assets/icons/0e7785a54_university.png", isCustomIcon: true },
    { title: "Liste des Établissements", url: "ListeEtablissements", icon: "/assets/icons/b527bb6dc_university1.png", isCustomIcon: true },
    { title: "Utilisateurs", url: "Users", icon: "/assets/icons/6961e1dfa_user1.png", isCustomIcon: true },
    { title: "Paramètres", url: "Parametres", icon: Settings },
  ],
  admin_etablissement: [
    { title: "Journal", url: "Journal", icon: "/assets/icons/eb36099c9_news-paper.png", isCustomIcon: true },
    { title: "Profil", url: "Profil", icon: "/assets/icons/d92f9c844_user-avatar.png", isCustomIcon: true },
    { title: "Galerie Photos", url: "GaleriePhotos", icon: "/assets/icons/6db68e5c5_photos.png", isCustomIcon: true },
    { title: "Galerie Vidéo", url: "GalerieVideo", icon: Video },
    { title: "Amis", url: "Amis", icon: "/assets/icons/0f08956b7_people.png", isCustomIcon: true },
    { title: "Groupes", url: "Groupes", icon: "/assets/icons/273813ec5_group1.png", isCustomIcon: true },
    { title: "Messagerie", url: "Messagerie", icon: "/assets/icons/e5073e7f6_chat.png", isCustomIcon: true },
    { title: "Tableau de Bord", url: "Dashboard", icon: "/assets/icons/b30618a5e_menu.png", isCustomIcon: true },
    { title: "Applications", url: "Applications", icon: "/assets/icons/3453b132d_menu1.png", isCustomIcon: true },
    { title: "Documents", url: "Documents", icon: "/assets/icons/ad4da6cb2_book2.png", isCustomIcon: true },
    { title: "Etablissement", url: "Etablissement", icon: "/assets/icons/c768a51e8_class.png", isCustomIcon: true },
    { title: "Étudiants Inscrits", url: "EtudiantsEtablissement", icon: "/assets/icons/16eacbed7_student-avatar.png", isCustomIcon: true },
    { title: "Affectation Profs", url: "AffectationProfesseurs", icon: "/assets/icons/67f530ac3_employeeadd.png", isCustomIcon: true },
    { title: "Structure Académique", url: "GestionStructureAcademique", icon: "/assets/icons/c768a51e8_class.png", isCustomIcon: true },
    { title: "Matières", url: "Matieres", icon: "/assets/icons/ad4da6cb2_book2.png", isCustomIcon: true },
    { title: "Professeurs", url: "ListeProfesseurs", icon: "/assets/icons/67f530ac3_employeeadd.png", isCustomIcon: true },
    { title: "Notes à Valider", url: "ValidationNotes", icon: "/assets/icons/d8275f6b3_ok.png", isCustomIcon: true },
    { title: "Rotation des Cours", url: "RotationCours", icon: "/assets/icons/ad4da6cb2_book2.png", isCustomIcon: true },
    { title: "Liste des Établissements", url: "ListeEtablissements", icon: "/assets/icons/b527bb6dc_university1.png", isCustomIcon: true },
    { title: "Statistiques", url: "Statistiques", icon: "/assets/icons/c10161d4e_analytics.png", isCustomIcon: true },    { title: "Paramètres", url: "Parametres", icon: Settings },
  ],
  professeur: [
    { title: "Journal", url: "Journal", icon: "/assets/icons/eb36099c9_news-paper.png", isCustomIcon: true },
    { title: "Profil", url: "Profil", icon: "/assets/icons/d92f9c844_user-avatar.png", isCustomIcon: true },
    { title: "Galerie Photos", url: "GaleriePhotos", icon: "/assets/icons/6db68e5c5_photos.png", isCustomIcon: true },
    { title: "Galerie Vidéo", url: "GalerieVideo", icon: Video },
    { title: "Amis", url: "Amis", icon: "/assets/icons/0f08956b7_people.png", isCustomIcon: true },
    { title: "Groupes", url: "Groupes", icon: "/assets/icons/273813ec5_group1.png", isCustomIcon: true },
    { title: "Messagerie", url: "Messagerie", icon: "/assets/icons/e5073e7f6_chat.png", isCustomIcon: true },
    { title: "Tableau de Bord", url: "Dashboard", icon: "/assets/icons/b30618a5e_menu.png", isCustomIcon: true },
    { title: "Applications", url: "Applications", icon: "/assets/icons/3453b132d_menu1.png", isCustomIcon: true },
    { title: "Mes Matières", url: "MesMatieres", icon: "/assets/icons/ad4da6cb2_book2.png", isCustomIcon: true },
    { title: "Mes Classes", url: "MesClasses", icon: "/assets/icons/984a1d72f_class.png", isCustomIcon: true },
    { title: "Saisie des Notes", url: "SaisieNotes", icon: "/assets/icons/e03aa2fb5_note1.png", isCustomIcon: true },
    { title: "Rotation des Cours", url: "RotationCours", icon: "/assets/icons/ad4da6cb2_book2.png", isCustomIcon: true },
    { title: "Liste des Établissements", url: "ListeEtablissements", icon: "/assets/icons/b527bb6dc_university1.png", isCustomIcon: true },    { title: "Paramètres", url: "Parametres", icon: Settings },
  ],
  etudiant: [
    { title: "Journal", url: "Journal", icon: "/assets/icons/eb36099c9_news-paper.png", isCustomIcon: true },
    { title: "Profil", url: "Profil", icon: "/assets/icons/d92f9c844_user-avatar.png", isCustomIcon: true },
    { title: "Galerie Photos", url: "GaleriePhotos", icon: "/assets/icons/6db68e5c5_photos.png", isCustomIcon: true },
    { title: "Galerie Vidéo", url: "GalerieVideo", icon: Video },
    { title: "Amis", url: "Amis", icon: "/assets/icons/0f08956b7_people.png", isCustomIcon: true },
    { title: "Groupes", url: "Groupes", icon: "/assets/icons/273813ec5_group1.png", isCustomIcon: true },
    { title: "Messagerie", url: "Messagerie", icon: "/assets/icons/e5073e7f6_chat.png", isCustomIcon: true },
    { title: "Tableau de Bord", url: "Dashboard", icon: "/assets/icons/b30618a5e_menu.png", isCustomIcon: true },
    { title: "Applications", url: "Applications", icon: "/assets/icons/3453b132d_menu1.png", isCustomIcon: true },
    { title: "Ma Promotion", url: "MaPromotion", icon: "/assets/icons/0f08956b7_people.png", isCustomIcon: true },
    { title: "Mes Statistiques", url: "MesStatistiques", icon: "/assets/icons/c10161d4e_analytics.png", isCustomIcon: true },
    { title: "Rotation des Cours", url: "RotationCours", icon: "/assets/icons/ad4da6cb2_book2.png", isCustomIcon: true },
    { title: "Mes Cotes", url: "MesCotes", icon: "/assets/icons/8d37e796f_note.png", isCustomIcon: true },
    { title: "Mes Dossiers Académiques", url: "MesDossiersAcademiques", icon: "/assets/icons/ad4da6cb2_book2.png", isCustomIcon: true },    { title: "Paramètres", url: "Parametres", icon: Settings },
  ],
  admin_ministeriel: [
    { title: "Journal", url: "Journal", icon: "/assets/icons/eb36099c9_news-paper.png", isCustomIcon: true },
    { title: "Profil", url: "Profil", icon: "/assets/icons/d92f9c844_user-avatar.png", isCustomIcon: true },
    { title: "Galerie Photos", url: "GaleriePhotos", icon: "/assets/icons/6db68e5c5_photos.png", isCustomIcon: true },
    { title: "Galerie Vidéo", url: "GalerieVideo", icon: Video },
    { title: "Amis", url: "Amis", icon: "/assets/icons/0f08956b7_people.png", isCustomIcon: true },
    { title: "Groupes", url: "Groupes", icon: "/assets/icons/273813ec5_group1.png", isCustomIcon: true },
    { title: "Messagerie", url: "Messagerie", icon: "/assets/icons/e5073e7f6_chat.png", isCustomIcon: true },
    { title: "Tableau de Bord", url: "Dashboard", icon: "/assets/icons/b30618a5e_menu.png", isCustomIcon: true },
    { title: "Établissements", url: "EtablissementsMinisteriel", icon: "/assets/icons/0e7785a54_university.png", isCustomIcon: true },    { title: "Paramètres", url: "Parametres", icon: Settings },
  ],
  parent: [
    { title: "Journal", url: "Journal", icon: "/assets/icons/eb36099c9_news-paper.png", isCustomIcon: true },
    { title: "Profil", url: "Profil", icon: "/assets/icons/d92f9c844_user-avatar.png", isCustomIcon: true },
    { title: "Galerie Photos", url: "GaleriePhotos", icon: "/assets/icons/6db68e5c5_photos.png", isCustomIcon: true },
    { title: "Galerie Vidéo", url: "GalerieVideo", icon: Video },
    { title: "Amis", url: "Amis", icon: "/assets/icons/0f08956b7_people.png", isCustomIcon: true },
    { title: "Groupes", url: "Groupes", icon: "/assets/icons/273813ec5_group1.png", isCustomIcon: true },
    { title: "Messagerie", url: "Messagerie", icon: "/assets/icons/e5073e7f6_chat.png", isCustomIcon: true },
    { title: "Tableau de Bord", url: "Dashboard", icon: "/assets/icons/b30618a5e_menu.png", isCustomIcon: true },
    { title: "Applications", url: "Applications", icon: "/assets/icons/3453b132d_menu1.png", isCustomIcon: true },
    { title: "Notes de mes Enfants", url: "NotesEnfants", icon: "/assets/icons/d069c7fd8_sticky-notes.png", isCustomIcon: true },
    { title: "Documents de mes Enfants", url: "DocumentsEnfants", icon: "/assets/icons/ad4da6cb2_book2.png", isCustomIcon: true },
    { title: "Rotation des Cours", url: "RotationCours", icon: "/assets/icons/ad4da6cb2_book2.png", isCustomIcon: true },
    { title: "Liste des Établissements", url: "ListeEtablissements", icon: "/assets/icons/b527bb6dc_university1.png", isCustomIcon: true },    { title: "Paramètres", url: "Parametres", icon: Settings },
  ],
};

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, isLoadingAuth: loading, logout } = useAuth();
  const { themeDef } = useTheme();

  // Derive page name from URL path if not passed as prop
  const derivedPageName = currentPageName || (() => {
    const path = location.pathname.replace(/^\//, '').toLowerCase();
    if (!path) return "Home"; // "/" → Home (mainPage)
    const pagesMap = {
      home: "Home", connexion: "Connexion", inscription: "Inscription",
      inscriptionparent: "InscriptionParent",
      inscriptionetablissement: "InscriptionEtablissement",
    };
    return pagesMap[path] || path;
  })();

  const pagesWithoutSidebar = ["Home", "Connexion", "Inscription", "InscriptionParent", "InscriptionEtablissement", "CompteBloque", "comptebloque"];
  const shouldHideSidebar = pagesWithoutSidebar.includes(derivedPageName);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-messages', user?.id],
    queryFn: async () => {
      try {
        const allConvs = await dataService.query('Conversation');
        const userConvs = allConvs.filter(conv => conv.participants?.includes(user.id));
        return userConvs.reduce((sum, conv) => sum + (conv.non_lu?.[user.id] || 0), 0);
      } catch { return 0; }
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  const { data: friendRequestsCount = 0 } = useQuery({
    queryKey: ['friend-requests-count', user?.id],
    queryFn: async () => {
      try {
        const users = await dataService.query('User', { filters: [{ id: user.id }] });
        const currentUserDetails = users[0];
        return currentUserDetails?.demandes_amis_recues?.length || 0;
      } catch { return 0; }
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  const handleLogout = () => {
    logout(true);
  };

  const navigationItems = user?.role_archive 
    ? roleNavigation[user.role_archive] || []
    : [];

  const getRoleLabel = (role) => {
    const labels = {
      super_admin: "Super Administrateur",
      admin_systeme: "Administrateur Système",
      admin_ministeriel: "Admin Ministériel",
      admin_etablissement: "Admin Établissement",
      professeur: "Professeur",
      etudiant: "Étudiant",
      parent: "Parent"
    };
    return labels[role] || role;
  };

  const displayName = formatUserName(user);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--ha-bg)'}}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-white font-medium">Chargement...</p>
        </div>
      </div>
    );
  };

  // Si l'utilisateur n'a pas de role_archive, il n'est pas enregistré
  if (!shouldHideSidebar && user && !user.role_archive) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--ha-bg)'}}>
        <div className="max-w-md text-center bg-[#3d3d3d] p-8 rounded-lg border border-[#4d4d4d] shadow-xl">
          <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{color: 'var(--ha-text)'}}>
            Bienvenue sur Harchive
          </h2>
          <p className="mb-6" style={{color: 'var(--ha-text-muted)'}}>
            Utilisateur non enregistré. Veuillez contacter un admin pour votre accès à l'app.
          </p>
          <div className="space-y-3 text-sm" style={{color: 'var(--ha-text-muted)'}}>
            <p>Vous devez être inscrit via l'un des formulaires suivants :</p>
            <ul className="list-disc list-inside text-left space-y-2">
              <li>Étudiant / Professeur</li>
              <li>Parent</li>
              <li>Établissement</li>
            </ul>
            <p className="mt-4">Votre demande doit être approuvée par un administrateur.</p>
          </div>
          <div className="mt-8 flex gap-3 justify-center">
            <button
              onClick={() => window.location.href = createPageUrl("Inscription")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              S'inscrire
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white rounded-lg transition-colors border border-[#4d4d4d]"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (shouldHideSidebar) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <style>{`
        /* Couleurs principales selon l'image de référence */
        body {
          background-color: var(--ha-bg) !important;
          color: var(--ha-text) !important;
        }

        /* LIGHT THEME GLOBAL: tout blanc, tout noir */
        [data-theme*="light"] * {
          color: inherit;
        }
        [data-theme*="light"] {
          background-color: var(--ha-bg);
          color: var(--ha-text);
        }
        [data-theme*="light"] p,
        [data-theme*="light"] span,
        [data-theme*="light"] h1,
        [data-theme*="light"] h2,
        [data-theme*="light"] h3,
        [data-theme*="light"] h4,
        [data-theme*="light"] h5,
        [data-theme*="light"] h6,
        [data-theme*="light"] label,
        [data-theme*="light"] li,
        [data-theme*="light"] td,
        [data-theme*="light"] th,
        [data-theme*="light"] div,
        [data-theme*="light"] button,
        [data-theme*="light"] a {
          color: var(--ha-text) !important;
        }
        /* Exceptions : textes accentués/colorés gardent leur couleur */
        [data-theme*="light"] .text-red-500,
        [data-theme*="light"] .text-red-600,
        [data-theme*="light"] .text-red-700 { color: #dc2626 !important; }
        [data-theme*="light"] .text-blue-400,
        [data-theme*="light"] .text-blue-500,
        [data-theme*="light"] .text-blue-600 { color: #2563eb !important; }
        [data-theme*="light"] .text-green-400,
        [data-theme*="light"] .text-green-500,
        [data-theme*="light"] .text-green-600 { color: #16a34a !important; }
        [data-theme*="light"] .text-yellow-400,
        [data-theme*="light"] .text-yellow-500 { color: #ca8a04 !important; }
        [data-theme*="light"] .text-purple-400,
        [data-theme*="light"] .text-purple-500,
        [data-theme*="light"] .text-purple-600 { color: #9333ea !important; }
        [data-theme*="light"] .text-gray-400,
        [data-theme*="light"] .text-gray-500 { color: var(--ha-text-faint) !important; }
        [data-theme*="light"] .text-gray-600,
        [data-theme*="light"] .text-gray-700 { color: var(--ha-text-muted) !important; }

        /* Tous les fonds → blanc */
        [data-theme*="light"] div,
        [data-theme*="light"] section,
        [data-theme*="light"] aside,
        [data-theme*="light"] main,
        [data-theme*="light"] header,
        [data-theme*="light"] footer,
        [data-theme*="light"] nav,
        [data-theme*="light"] article {
          background-color: var(--ha-bg) !important;
          border-color: var(--ha-border) !important;
        }
        /* Cards et inputs légèrement distincts */
        [data-theme*="light"] .rounded-lg,
        [data-theme*="light"] .rounded-xl,
        [data-theme*="light"] .rounded-2xl,
        [data-theme*="light"] [class*="Card"],
        [data-theme*="light"] input,
        [data-theme*="light"] textarea,
        [data-theme*="light"] select {
          background-color: #ffffff !important;
          border-color: var(--ha-border) !important;
          color: #000000 !important;
        }
        [data-theme*="light"] input::placeholder,
        [data-theme*="light"] textarea::placeholder {
          color: var(--ha-text-faint) !important;
        }

        /* Backgrounds sombres Tailwind → blanc */
        .bg-gray-950, .bg-gray-900, .bg-gray-800, .bg-gray-700,
        .bg-zinc-950, .bg-zinc-900, .bg-zinc-800, .bg-zinc-700,
        .bg-neutral-950, .bg-neutral-900, .bg-neutral-800, .bg-neutral-700,
        .bg-slate-950, .bg-slate-900, .bg-slate-800, .bg-slate-700,
        [class*="bg-gray-9"], [class*="bg-gray-8"], [class*="bg-gray-7"],
        [class*="bg-zinc-9"], [class*="bg-zinc-8"], [class*="bg-zinc-7"] {
          background-color: var(--ha-surface) !important;
          color: var(--ha-text) !important;
        }
          background-color: var(--ha-bg) !important;
          color: var(--ha-text) !important;
        }
        
        /* Remplacer tous les fonds gris */
        .bg-gray-50,
        [class*="bg-gray-50"] {
          background-color: var(--ha-bg) !important;
        }
        
        .bg-gray-100,
        [class*="bg-gray-100"] {
          background-color: var(--ha-surface) !important;
        }
        
        .bg-gray-200,
        [class*="bg-gray-200"] {
          background-color: var(--ha-surface2) !important;
        }
        
        .bg-white,
        [class*="bg-white"] {
          background-color: var(--ha-surface2) !important;
          color: var(--ha-text) !important;
        }

        /* Textes blancs forcés → texte selon thème */
        .text-white,
        [class*="text-white"] {
          color: var(--ha-text) !important;
        }

        /* Textes clairs Tailwind → thème */
        .text-gray-100, .text-gray-200, .text-gray-300,
        [class*="text-gray-1"], [class*="text-gray-2"], [class*="text-gray-3"] {
          color: var(--ha-text-muted) !important;
        }
        
        /* Textes */
        .text-gray-800,
        .text-gray-900,
        .text-gray-700,
        [class*="text-gray-8"],
        [class*="text-gray-9"],
        [class*="text-gray-7"] {
          color: var(--ha-text) !important;
        }
        
        .text-gray-600,
        .text-gray-500,
        [class*="text-gray-6"],
        [class*="text-gray-5"] {
          color: var(--ha-text-muted) !important;
        }
        
        .text-gray-400,
        [class*="text-gray-4"] {
          color: var(--ha-text-faint) !important;
        }
        
        /* Bordures */
        .border-gray-200,
        .border-gray-300,
        [class*="border-gray-2"],
        [class*="border-gray-3"] {
          border-color: var(--ha-border) !important;
        }
        
        /* Hover states */
        .hover\\:bg-gray-100:hover,
        .hover\\:bg-gray-50:hover,
        [class*="hover:bg-gray"]:hover {
          background-color: var(--ha-hover) !important;
        }
        
        /* Cards et conteneurs */
        [role="dialog"],
        [role="menu"],
        [role="listbox"] {
          background-color: var(--ha-surface2) !important;
          color: var(--ha-text) !important;
          border-color: var(--ha-border) !important;
        }
        
        /* Inputs et selects */
        input,
        textarea,
        select,
        [role="combobox"] {
          background-color: var(--ha-surface) !important;
          color: var(--ha-text) !important;
          border-color: var(--ha-border) !important;
        }
        
        input::placeholder,
        textarea::placeholder {
          color: var(--ha-text-faint) !important;
        }
        
        /* Buttons */
        button[class*="bg-white"],
        button[class*="bg-gray"] {
          background-color: var(--ha-surface2) !important;
          color: var(--ha-text) !important;
          border-color: var(--ha-border) !important;
        }
        
        /* Tables */
        table {
          background-color: var(--ha-surface2) !important;
        }
        
        thead {
          background-color: var(--ha-surface) !important;
        }
        
        tbody tr {
          border-color: var(--ha-border) !important;
        }
        
        tbody tr:hover {
          background-color: var(--ha-hover) !important;
        }
        
        /* Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: var(--ha-surface);
        }
        
        ::-webkit-scrollbar-thumb {
          background: var(--ha-surface3);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: var(--ha-surface2);
        }

        /* =============================================
           LIGHT THEME: Override dark inline backgrounds
           Browsers convert hex to rgb() in style attr
           !important in stylesheet overrides inline styles
           ============================================= */

        /* Dark backgrounds: #000 → #555 */
        [data-theme*="light"] [style*="background-color: rgb(0, 0, 0)"],
        [data-theme*="light"] [style*="background-color: rgb(26, 26, 26)"],
        [data-theme*="light"] [style*="background-color: rgb(28, 28, 28)"],
        [data-theme*="light"] [style*="background-color: rgb(30, 30, 30)"],
        [data-theme*="light"] [style*="background-color: rgb(36, 36, 36)"],
        [data-theme*="light"] [style*="background-color: rgb(38, 38, 38)"],
        [data-theme*="light"] [style*="background-color: rgb(42, 42, 42)"],
        [data-theme*="light"] [style*="background-color: rgb(44, 44, 44)"],
        [data-theme*="light"] [style*="background-color: rgb(45, 45, 45)"],
        [data-theme*="light"] [style*="background-color: rgb(51, 51, 51)"],
        [data-theme*="light"] [style*="background-color: rgb(58, 58, 58)"],
        [data-theme*="light"] [style*="background-color: rgb(61, 61, 61)"],
        [data-theme*="light"] [style*="background-color: rgb(63, 63, 63)"],
        [data-theme*="light"] [style*="background-color: rgb(64, 64, 64)"],
        [data-theme*="light"] [style*="background-color: rgb(68, 68, 68)"],
        [data-theme*="light"] [style*="background-color: rgb(71, 71, 71)"],
        [data-theme*="light"] [style*="background-color: rgb(77, 77, 77)"],
        [data-theme*="light"] [style*="background-color: rgb(85, 85, 85)"],
        [data-theme*="light"] [style*="background-color: rgb(90, 90, 90)"] {
          background-color: var(--ha-surface) !important;
          border-color: var(--ha-border) !important;
          color: var(--ha-text) !important;
        }

        /* Force borders dark */
        [data-theme*="light"] [style*="border-color: rgb(45, 45, 45)"],
        [data-theme*="light"] [style*="border-color: rgb(61, 61, 61)"],
        [data-theme*="light"] [style*="border-color: rgb(64, 64, 64)"],
        [data-theme*="light"] [style*="border-color: rgb(77, 77, 77)"],
        [data-theme*="light"] [style*="border-color: rgb(85, 85, 85)"] {
          border-color: var(--ha-border) !important;
        }

        /* White/light text → dark */
        [data-theme*="light"] [style*="color: rgb(255, 255, 255)"],
        [data-theme*="light"] [style*="color: rgb(250, 250, 250)"],
        [data-theme*="light"] [style*="color: rgb(224, 224, 224)"],
        [data-theme*="light"] [style*="color: rgb(176, 176, 176)"],
        [data-theme*="light"] [style*="color: rgb(192, 192, 192)"] {
          color: var(--ha-text-muted) !important;
        }

        /* Tailwind arbitrary dark bg classes in light mode */
        [data-theme*="light"] .bg-\\[\\#000\\],
        [data-theme*="light"] .bg-\\[\\#000000\\],
        [data-theme*="light"] .bg-\\[\\#1a1a1a\\],
        [data-theme*="light"] .bg-\\[\\#262626\\],
        [data-theme*="light"] .bg-\\[\\#2a2a2a\\],
        [data-theme*="light"] .bg-\\[\\#2d2d2d\\],
        [data-theme*="light"] .bg-\\[\\#333\\],
        [data-theme*="light"] .bg-\\[\\#333333\\],
        [data-theme*="light"] .bg-\\[\\#3a3a3a\\],
        [data-theme*="light"] .bg-\\[\\#3d3d3d\\],
        [data-theme*="light"] .bg-\\[\\#404040\\],
        [data-theme*="light"] .bg-\\[\\#444\\],
        [data-theme*="light"] .bg-\\[\\#444444\\],
        [data-theme*="light"] .bg-\\[\\#474747\\],
        [data-theme*="light"] .bg-\\[\\#4d4d4d\\] {
          background-color: var(--ha-surface) !important;
          color: var(--ha-text) !important;
        }

        /* Tailwind dark text classes → light mode text */
        [data-theme*="light"] .text-white { color: var(--ha-text) !important; }
      `}</style>
      <div className="min-h-screen flex w-full" style={{backgroundColor: 'var(--ha-bg)'}}>
        <Sidebar style={{backgroundColor: 'var(--ha-sidebar-bg)', borderColor: 'var(--ha-border)'}}>
            <SidebarHeader style={{backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)'}} className="p-3">
              <Link to={createPageUrl("Journal")} className="flex flex-col items-center justify-center hover:opacity-80 transition-opacity">
                <img 
                  src="/assets/icons/6153a57fe_logoHARCHIVEF2.png"
                  alt="Harchive Logo"
                  className="w-full h-auto max-h-20 object-contain"
                  style={themeDef?.group === 'light' ? {filter: 'brightness(0)'} : {}}
                />
              </Link>
            </SidebarHeader>
          
          <SidebarContent className="px-2 py-2" style={{backgroundColor: 'var(--ha-sidebar-bg)'}}>
            {user && (
              <div className="mb-3 p-2 rounded-lg" style={{backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)'}}>
                <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{color: 'var(--ha-text-muted)'}}>
                  Connecté en tant que
                </p>
                <p className="text-xs font-semibold" style={{color: 'var(--ha-text)'}}>
                  {getRoleLabel(user.role_archive)}
                </p>
              </div>
            )}

            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-bold uppercase tracking-wider px-2 py-1.5" style={{color: 'var(--ha-text-muted)'}}>
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`transition-all duration-200 rounded-lg mb-0.5 ${
                          location.pathname === createPageUrl(item.url)
                            ? 'shadow-sm' 
                            : ''
                        }`}
                        style={location.pathname === createPageUrl(item.url) 
                          ? {backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)'} 
                          : {color: 'var(--ha-text-muted)'}}
                      >
                        <Link to={createPageUrl(item.url)} className="flex items-center gap-2.5 px-3 py-2 hover:opacity-80 w-full">
                          {item.isCustomIcon ? (
                            <img src={item.icon} alt={item.title} className="w-4 h-4 flex-shrink-0" />
                          ) : (
                            <item.icon className="w-4 h-4 flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium flex-1">{item.title}</span>
                          {item.title === "Messagerie" && unreadCount > 0 && (
                            <Badge className="ml-auto text-xs flex-shrink-0" style={{backgroundColor: '#ff4444', color: 'var(--ha-text)'}}>
                              {unreadCount}
                            </Badge>
                          )}
                          {item.title === "Amis" && friendRequestsCount > 0 && (
                            <Badge className="ml-auto text-xs flex-shrink-0" style={{backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)'}}>
                              {friendRequestsCount}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            
            <div className="px-2 mt-auto mb-2">
              <Link 
                to={createPageUrl("APropos")} 
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 font-medium text-xs hover:opacity-80"
                style={{backgroundColor: 'var(--ha-surface)', color: 'var(--ha-text)', border: '1px solid #4d4d4d'}}
              >
                <Info className="w-3.5 h-3.5" />
                À propos
              </Link>
            </div>
          </SidebarContent>

          <SidebarFooter style={{backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)'}} className="p-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 rounded-lg" style={{backgroundColor: 'var(--ha-surface3)'}}>
                {user?.photo_url ? (
                  <img 
                    src={user.photo_url} 
                    alt={user.full_name} 
                    className="w-8 h-8 rounded-full object-cover shadow-sm"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm text-xs font-semibold" style={{backgroundColor: 'var(--ha-accent)', color: 'var(--ha-text)'}}>
                    {(displayName || '').split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs truncate" style={{color: 'var(--ha-text)'}}>
                    {displayName || "Utilisateur"}
                  </p>
                  <p className="text-xs truncate" style={{color: 'var(--ha-text-muted)'}}>{getRoleLabel(user.role_archive)}</p>
                </div>
                <NotificationCenter userId={user?.id} />
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 font-medium text-xs"
                style={{backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', border: '1px solid var(--ha-border)'}}
              >
                <LogOut className="w-3.5 h-3.5" />
                Déconnexion
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col" style={{backgroundColor: 'var(--ha-bg)'}}>
          <header style={{backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)'}} className="px-6 py-4 lg:hidden border-b">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="p-2 rounded-lg transition-colors" style={{color: 'var(--ha-text)'}} />
              <Link to={createPageUrl("Journal")}>
                <h1 className="text-xl font-bold hover:opacity-80 transition-opacity" style={{color: 'var(--ha-text)'}}>Harchive</h1>
              </Link>
              <div className="ml-auto">
                <NotificationCenter userId={user?.id} />
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}