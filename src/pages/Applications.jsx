import React, { useState, useEffect } from "react";
import { authService, dataService, functionService } from "@/api";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  FileText,
  Clipboard,
  Loader2,
  Search,
  Star,
  TrendingUp,
  Zap,
  BookMarked,
  FolderOpen } from
"lucide-react";

// Liste des mini-applications disponibles
const MINI_APPS = [
{
  id: "bibliotheque",
  nom: "Bibliothèque",
  description: "Explorez notre collection de livres numériques",
  icon: "/assets/icons/87da5cabd_book.png",
  color: "bg-blue-500",
  categorie: "Éducation",
  populaire: true,
  url: "BibliothequeNumerique",
  isCustomIcon: true
},
{
  id: "calendrier-academique",
  nom: "Calendrier Académique",
  description: "Consultez les cours, examens et événements de votre établissement",
  icon: "/assets/icons/346bbc18d_calendrier.png",
  color: "bg-green-500",
  categorie: "Gestion",
  populaire: true,
  url: "CalendrierAcademique",
  isCustomIcon: true
},
{
  id: "rotation-cours",
  nom: "Rotation des Cours",
  description: "Gérez les programmes et emplois du temps par jour et horaire",
  icon: "/assets/icons/a8103d6d4_list1.png",
  color: "bg-purple-600",
  categorie: "Gestion",
  populaire: true,
  url: "RotationCours",
  isCustomIcon: true
},
{
  id: "calendrier",
  nom: "Calendrier Personnel",
  description: "Gérez vos événements et rendez-vous personnels",
  icon: "/assets/icons/8757acc9d_calendar.png",
  color: "bg-teal-500",
  categorie: "Productivité",
  populaire: false,
  url: "CalendrierPersonnel",
  isCustomIcon: true
},
{
 id: "bloc-notes",
 nom: "Bloc-notes",
 description: "Prenez des notes rapidement",
 icon: "/assets/icons/e9df37227_agenda2.png",
 color: "bg-purple-500",
 categorie: "Productivité",
 populaire: true,
 url: "BlocNotes",
 isCustomIcon: true
},
{
  id: "presse-papier",
  nom: "Presse-papier",
  description: "Gérez votre historique de copier-coller",
  icon: "/assets/icons/a40a38617_clipboard.png",
  color: "bg-orange-500",
  categorie: "Outils",
  populaire: false,
  url: "PressePapier",
  isCustomIcon: true
},
{
    id: "partage-fichiers",
    nom: "Partage Fichiers",
    description: "Partagez vos fichiers via des codes uniques",
    icon: "/assets/icons/fc25762eb_data-sharing.png",
    color: "bg-gray-700",
    categorie: "Outils",
    populaire: true,
    url: "PartagesFichiers",
    isCustomIcon: true
  },
  {
    id: "encyclopedie-ai",
    nom: "Encyclopédie Universelle AI",
    description: "Synthèse précise et complète de tout sujet avec l'IA",
    icon: "/assets/icons/cc402b8da_ai-innovation.png",
    color: "bg-[#800020]",
    categorie: "Éducation",
    populaire: true,
    url: "EncyclopedieAI",
    isCustomIcon: true,
    iconSize: "w-12 h-12",
    disabled: true
  }];


const CATEGORIES = ["Toutes", "Éducation", "Gestion", "Productivité", "Outils"];

export default function Applications() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toutes");
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenApp = (app) => {
    if (app.disabled) return;
    if (app.url) {
      navigate(createPageUrl(app.url));
    } else {
      setSelectedApp(app);
    }
  };

  const filteredApps = MINI_APPS.filter((app) => {
    const matchesSearch = app.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "Toutes" || app.categorie === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const popularApps = MINI_APPS.filter((app) => app.populaire);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#4d4d4d' }}>
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>);

  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#4d4d4d' }}>
      <div className="w-full px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <img 
              src="/assets/icons/3453b132d_menu1.png"
              alt="Applications"
              className="w-12 h-12"
            />
            <div>
              <h1 className="text-3xl font-bold text-white">Applications</h1>
              <p className="text-gray-300">Des outils pratiques intégrés é  la plateforme</p>
            </div>
          </div>
        </div>

        {/* Applications populaires */}
        {selectedCategory === "Toutes" && !searchQuery &&
        <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-500" />
              <h2 className="text-xl font-semibold text-white">Applications populaires</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {popularApps.map((app) => {
              const Icon = app.icon;
              return (
                <div
                  key={app.id}
                  title={app.disabled ? "Temporairement indisponible" : undefined}
                  className={`group flex flex-col items-center ${app.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  onClick={() => handleOpenApp(app)}>
                    <div className={`w-20 h-20 ${app.color} rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
                                                {app.isCustomIcon ? (
                                                  <img src={Icon} alt={app.nom} className={app.iconSize || "w-10 h-10"} />
                                                ) : (
                                                  <Icon className="w-10 h-10 text-white" />
                                                )}
                                              </div>
                    <h3 className="font-medium text-white text-center text-sm">{app.nom}</h3>
                  </div>);

            })}
            </div>
          </div>
        }

        {/* Recherche et filtres */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher une application..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10" />

            </div>
            <div className="flex gap-2 overflow-x-auto">
              {CATEGORIES.map((cat) =>
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat)}
                size="sm" className="bg-[#333333] px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-8 whitespace-nowrap">

                  {cat}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Grille de toutes les applications */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-gray-400" />
            <h2 className="text-xl font-semibold text-white">
              {selectedCategory === "Toutes" ? "Toutes les applications" : selectedCategory}
            </h2>
            <Badge variant="secondary">{filteredApps.length}</Badge>
          </div>
        </div>

        {filteredApps.length === 0 ?
        <div className="py-12 text-center">
            <Search className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">Aucune application trouvée</p>
            <p className="text-sm text-gray-500">Essayez un autre terme de recherche</p>
          </div> :

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {filteredApps.map((app) => {
            const Icon = app.icon;
            return (
              <div
                key={app.id}
                title={app.disabled ? "Temporairement indisponible" : undefined}
                className={`group flex flex-col items-center ${app.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => handleOpenApp(app)}>
                  <div className={`w-20 h-20 ${app.color} rounded-2xl flex items-center justify-center mb-3 ${app.disabled ? '' : 'group-hover:scale-110'} transition-transform shadow-lg`}>
                                            {app.isCustomIcon ? (
                                              <img src={Icon} alt={app.nom} className={app.iconSize || "w-10 h-10"} />
                                            ) : (
                                              <Icon className="w-10 h-10 text-white" />
                                            )}
                                          </div>
                  <h3 className="font-medium text-white text-center text-sm">{app.nom}</h3>
                </div>);

          })}
          </div>
        }

        {/* Zone d'affichage de l'application sélectionnée */}
        {selectedApp &&
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${selectedApp.color} rounded-lg flex items-center justify-center`}>
                      {React.createElement(selectedApp.icon, { className: "w-5 h-5 text-white" })}
                    </div>
                    <div>
                      <CardTitle>{selectedApp.nom}</CardTitle>
                      <CardDescription>{selectedApp.description}</CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedApp(null)}>
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center min-h-[400px] bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className={`w-20 h-20 ${selectedApp.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                      {React.createElement(selectedApp.icon, { className: "w-10 h-10 text-white" })}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      {selectedApp.nom}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Cette application sera bientôt disponible
                    </p>
                    <Badge>{selectedApp.categorie}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        }
      </div>
    </div>);

}
