import React, { useState } from "react";
import { dataService } from "@/api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, GraduationCap, Loader2, Mail, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function ClasseElevesList({ classe }) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: etudiants = [], isLoading } = useQuery({
    queryKey: ["etudiants-classe", classe?.id, classe?.nom],
    queryFn: async () => {
      // Récupérer les utilisateurs étudiants de cette classe
      const norm = (s) => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      const dc = norm(classe.nom || classe.niveau);
      
      const users = await dataService.query('User', {
        filters: [{ 
          role_archive: 'etudiant'
        }],
        limit: 5000,
        offset: 0
      });
      
      const usersClasse = users
        .filter((u) => norm(u.classe) === dc || norm(u.classe).includes(dc) || dc.includes(norm(u.classe)));
      
      const result = usersClasse.map((u) => ({
        id: u.id,
        nom: u.nom,
        prenom: u.prenom,
        post_nom: u.post_nom,
        matricule: u.matricule,
        email: u.email,
        created_date: u.createdAt || u.created_date,
        statut: 'actif',
      }));

      return result.sort((a, b) => (a.nom || "").localeCompare(b.nom || ""));
    },
    enabled: !!classe?.id || !!classe?.nom,
  });

  const etudiantsFiltres = (etudiants || []).filter((e) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (e.nom || "").toLowerCase().includes(q) ||
      (e.prenom || "").toLowerCase().includes(q) ||
      (e.matricule || "").toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q)
    );
  });

  if (!classe) return null;

  if (isLoading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info classe */}
      <Card style={{ backgroundColor: "#3d3d3d", borderColor: "#2d2d2d" }} className="mb-2">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{classe.nom}</h2>
              <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                {classe.niveau && <span>{classe.niveau}</span>}
                {classe.faculte && <span>• {classe.faculte}</span>}
                {classe.departement && <span>• {classe.departement}</span>}
                {classe.option && <span>• {classe.option}</span>}
              </div>
            </div>
            <Badge className="bg-blue-600 text-lg px-4 py-2">
              {etudiants.length} étudiant{etudiants.length > 1 ? "s" : ""}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Barre de recherche */}
      <Card style={{ backgroundColor: "#3d3d3d", borderColor: "#2d2d2d" }} className="mb-2">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher un étudiant par nom, prénom, matricule ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Liste des étudiants */}
      <Card style={{ backgroundColor: "#3d3d3d", borderColor: "#2d2d2d" }}>
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>Liste des Étudiants</span>
            <Badge className="bg-blue-600">
              {etudiantsFiltres.length} résultat{etudiantsFiltres.length > 1 ? "s" : ""}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {etudiantsFiltres.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Aucun étudiant trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#2d2d2d]">
                  <tr>
                    <th className="px-4 py-3 text-left text-white font-semibold">Nom</th>
                    <th className="px-4 py-3 text-left text-white font-semibold">Email</th>
                    <th className="px-4 py-3 text-left text-white font-semibold">Matricule</th>
                    <th className="px-4 py-3 text-left text-white font-semibold">Date</th>
                    <th className="px-4 py-3 text-center text-white font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {etudiantsFiltres.map((e) => (
                    <tr key={e.id} className="border-t border-[#2d2d2d] hover:bg-[#474747]">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-white">
                          {e.prenom} {e.post_nom} {e.nom}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-gray-300">
                          <Mail className="w-4 h-4 text-gray-500" />
                          {e.email || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-gray-300 font-mono">{e.matricule || '-'}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                          <Calendar className="w-4 h-4" />
                          {e.created_date ? format(new Date(e.created_date), "dd/MM/yyyy", { locale: fr }) : "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Badge className={e.statut === 'actif' ? 'bg-green-600' : 'bg-gray-500'}>
                          {e.statut || '—'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}