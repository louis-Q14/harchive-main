import React, { useState, useEffect } from "react";
import { dataService } from "@/api";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQueryClient } from "@tanstack/react-query";
import AdminSystemeDashboard from "../components/dashboards/AdminSystemeDashboard";
import AdminEtablissementDashboard from "../components/dashboards/AdminEtablissementDashboard";
import ProfesseurDashboard from "../components/dashboards/ProfesseurDashboard";
import EtudiantDashboard from "../components/dashboards/EtudiantDashboard";
import ParentDashboard from "../components/dashboards/ParentDashboard";

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
      setLoading(false);
    } else {
      navigate(createPageUrl("Home"));
    }
  }, [authUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--ha-bg)'}}>
        <div className="w-12 h-12 border-4 border-gray-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  switch (user?.role_archive) {
    case "admin_systeme":
      return <AdminSystemeDashboard user={user} />;
    case "admin_etablissement":
      return <AdminEtablissementDashboard user={user} />;
    case "professeur":
      return <ProfesseurDashboard user={user} />;
    case "etudiant":
      return <EtudiantDashboard user={user} />;
    case "parent":
      return <ParentDashboard user={user} />;
    default:
      return (
        <div className="min-h-screen p-8" style={{backgroundColor: 'var(--ha-bg)'}}>
          <div className="w-full px-4 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              Bienvenue sur Harchive
            </h1>
            <p className="text-gray-300">
              Veuillez contacter un administrateur pour configurer votre rôle.
            </p>
          </div>
        </div>
      );
  }
}
