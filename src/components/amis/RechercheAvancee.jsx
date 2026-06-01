import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

export default function RechercheAvancee({ onSearch, onReset, etablissements, classes }) {
  const [filters, setFilters] = useState({
    nom: "",
    email: "",
    etablissement_id: "",
    classe_id: "",
    role: ""
  });

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleReset = () => {
    setFilters({
      nom: "",
      email: "",
      etablissement_id: "",
      classe_id: "",
      role: ""
    });
    onReset();
  };

  return (
    <Card className="border-gray-200">
      <CardHeader className="bg-[#242424] p-6 flex flex-col space-y-1.5">
        <CardTitle className="text-gray-800 flex items-center gap-2">
          <Search className="w-5 h-5" />
          Recherche Avancée
        </CardTitle>
      </CardHeader>
      <CardContent className="bg-[#333333] pt-0 p-6 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-700">Nom</Label>
            <Input
              placeholder="Rechercher par nom..."
              value={filters.nom}
              onChange={(e) => setFilters({ ...filters, nom: e.target.value })}
              className="border-gray-300" />

          </div>
          <div>
            <Label className="text-gray-700">Email</Label>
            <Input
              placeholder="Rechercher par email..."
              value={filters.email}
              onChange={(e) => setFilters({ ...filters, email: e.target.value })}
              className="border-gray-300" />

          </div>
          <div>
            <Label className="text-gray-700">Établissement</Label>
            <Select
              value={filters.etablissement_id}
              onValueChange={(value) => setFilters({ ...filters, etablissement_id: value === "all" ? "" : value })}>

              <SelectTrigger className="border-gray-300">
                <SelectValue placeholder="Tous les établissements" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {etablissements.map((etab) =>
                <SelectItem key={etab.id} value={etab.id}>
                    {etab.nom}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-700">Classe</Label>
            <Select
              value={filters.classe_id}
              onValueChange={(value) => setFilters({ ...filters, classe_id: value === "all" ? "" : value })}>

              <SelectTrigger className="border-gray-300">
                <SelectValue placeholder="Toutes les classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {classes.map((classe) =>
                <SelectItem key={classe.id} value={classe.id}>
                    {classe.nom}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-700">Rôle</Label>
            <Select
              value={filters.role}
              onValueChange={(value) => setFilters({ ...filters, role: value === "all" ? "" : value })}>

              <SelectTrigger className="border-gray-300">
                <SelectValue placeholder="Tous les rôles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="etudiant">Étudiant</SelectItem>
                <SelectItem value="professeur">Professeur</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSearch} className="bg-[#333333] text-white px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-9 flex-1 hover:bg-blue-700">


            <Search className="w-4 h-4 mr-2" />
            Rechercher
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            className="border-gray-300">

            <X className="w-4 h-4 mr-2" />
            Réinitialiser
          </Button>
        </div>
      </CardContent>
    </Card>);

}