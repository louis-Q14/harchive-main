// @ts-nocheck
import React, { useState, useRef, useCallback } from "react";
import { dataService } from "@/api";
import { useQuery } from "@tanstack/react-query";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, Phone, MapPin, GraduationCap, Briefcase, Globe, BookOpen, Users, ExternalLink, Calendar, Heart, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };

const roleLabels = {
  super_admin: "Super Administrateur",
  admin_systeme: "Administrateur Système",
  admin_ministeriel: "Administrateur Ministériel",
  admin_etablissement: "Admin Établissement",
  professeur: "Professeur",
  etudiant: "Étudiant",
  parent: "Parent",
};

const roleColors = {
  super_admin: "#ca8a04",
  admin_systeme: "#7c3aed",
  admin_ministeriel: "#4f46e5",
  admin_etablissement: "#2563eb",
  professeur: "#16a34a",
  etudiant: "#ea580c",
  parent: "#db2777",
};

function parseJson(val) {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function ProfilModal({ open, onClose, userId, auteurNom, auteurPhotoUrl, auteurRole }) {
  const navigate = useNavigate();

  const { data: userProfile, isLoading } = useQuery({
    queryKey: ["profil-modal-user", userId],
    queryFn: async () => {
      const res = await dataService.query("User", {
        filters: [{ field: "id", operator: "=", value: userId }],
        limit: 1,
      });
      return res[0] || null;
    },
    enabled: open && !!userId,
    staleTime: 60000,
  });

  const { data: pubCount = 0 } = useQuery({
    queryKey: ["profil-modal-pubs-count", userId],
    queryFn: async () => {
      const pubs = await dataService.query("Publication", {
        filters: [{ field: "auteur_id", operator: "=", value: userId }],
        limit: 1000,
      });
      return pubs.filter(p => !p.cible_profil_id).length;
    },
    enabled: open && !!userId,
    staleTime: 60000,
  });

  const displayName = userProfile
    ? [userProfile.prenom, userProfile.nom, userProfile.post_nom].filter(Boolean).join(" ").trim() ||
      userProfile.full_name ||
      auteurNom
    : auteurNom || "Utilisateur";

  const photoUrl = userProfile?.photo_url || auteurPhotoUrl || null;
  const role = userProfile?.role_archive || auteurRole;
  const competences = parseJson(userProfile?.competences);
  const amis = parseJson(userProfile?.amis);

  // Parse info_privacy settings
  const defaultPrivacy = { email: true, telephone: true, adresse: true, etablissement: true, bio: true, reseaux: true, famille: false, urgence: false };
  const infoPrivacy = React.useMemo(() => {
    if (!userProfile?.info_privacy) return defaultPrivacy;
    try {
      const parsed = typeof userProfile.info_privacy === 'string' ? JSON.parse(userProfile.info_privacy) : userProfile.info_privacy;
      return { ...defaultPrivacy, ...parsed };
    } catch { return defaultPrivacy; }
  }, [userProfile?.info_privacy]);

  const [isExpanded, setIsExpanded] = useState(false);
  const initialHeightRef = useRef(null);

  const handleResize = useCallback((h) => {
    if (initialHeightRef.current === null) initialHeightRef.current = h;
    setIsExpanded(h > (initialHeightRef.current || 0) + 40);
  }, []);

  // Reset expanded state when dialog reopens
  React.useEffect(() => {
    if (open) {
      setIsExpanded(false);
      initialHeightRef.current = null;
    }
  }, [open]);

  const handleOpenFullProfile = () => {
    onClose();
    navigate(`/profil?userId=${userId}`);
  };

  return (
    <DraggableDialog
      open={open}
      onOpenChange={onClose}
      title={
        <span style={{ color: "#fff", fontSize: "1rem", fontWeight: 600, ...CG }}>
          Profil de l'utilisateur
        </span>
      }
      maxWidth="max-w-md"
      onResize={handleResize}
    >
      <DraggableDialogBody className="flex-1 flex flex-col min-h-0">
        <div style={{ ...CG, minWidth: 320, display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
              <Loader2 style={{ width: 32, height: 32, color: "#888", animation: "spin 1s linear infinite" }} />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1, minHeight: 0, overflowY: "auto" }}>

              {/* En-tête : photo + nom + rôle */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "2px solid rgba(255,255,255,0.2)" }}>
                  {photoUrl ? (
                    <img src={photoUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#3a3a3a", color: "#fff", fontSize: 24, fontWeight: "bold" }}>
                      {getInitials(displayName)}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem", marginBottom: 4 }}>{displayName}</p>
                  {role && (
                    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: "0.72rem", fontWeight: 600, background: roleColors[role] || "#555", color: "#fff" }}>
                      {roleLabels[role] || role}
                    </span>
                  )}
                  {userProfile?.titre_professionnel && (
                    <p style={{ color: "#b0b0b0", fontSize: "0.8rem", marginTop: 4 }}>{userProfile.titre_professionnel}</p>
                  )}
                </div>
              </div>

              {/* Bio / headline */}
              {userProfile?.bio && infoPrivacy.bio && (
                <p style={{ color: "#d0d0d0", fontSize: "0.85rem", lineHeight: 1.5, padding: "10px 14px", background: "rgba(255,255,255,0.05)", borderRadius: 8, flexShrink: 0 }}>
                  {userProfile.bio}
                </p>
              )}
              {!userProfile?.bio && userProfile?.headline && infoPrivacy.bio && (
                <p style={{ color: "#999", fontSize: "0.85rem", fontStyle: "italic", flexShrink: 0 }}>"{userProfile.headline}"</p>
              )}

              {/* Statistiques */}
              <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                <div style={{ flex: 1, textAlign: "center", padding: "10px 8px", background: "rgba(255,255,255,0.05)", borderRadius: 8 }}>
                  <p style={{ color: "#fff", fontWeight: 700, fontSize: "1.2rem" }}>{pubCount}</p>
                  <p style={{ color: "#888", fontSize: "0.7rem" }}>Publications</p>
                </div>
                <div style={{ flex: 1, textAlign: "center", padding: "10px 8px", background: "rgba(255,255,255,0.05)", borderRadius: 8 }}>
                  <p style={{ color: "#fff", fontWeight: 700, fontSize: "1.2rem" }}>{amis.length}</p>
                  <p style={{ color: "#888", fontSize: "0.7rem" }}>Amis</p>
                </div>
                {competences.length > 0 && (
                  <div style={{ flex: 1, textAlign: "center", padding: "10px 8px", background: "rgba(255,255,255,0.05)", borderRadius: 8 }}>
                    <p style={{ color: "#fff", fontWeight: 700, fontSize: "1.2rem" }}>{competences.length}</p>
                    <p style={{ color: "#888", fontSize: "0.7rem" }}>Compétences</p>
                  </div>
                )}
              </div>

              {/* Infos de contact */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                {userProfile?.email && infoPrivacy.email && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Mail style={{ width: 14, height: 14, color: "#888", flexShrink: 0 }} />
                    <span style={{ color: "#d0d0d0", fontSize: "0.82rem" }}>{userProfile.email}</span>
                  </div>
                )}
                {userProfile?.telephone && infoPrivacy.telephone && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Phone style={{ width: 14, height: 14, color: "#888", flexShrink: 0 }} />
                    <span style={{ color: "#d0d0d0", fontSize: "0.82rem" }}>{userProfile.telephone}</span>
                  </div>
                )}
                {(userProfile?.ville || userProfile?.pays) && infoPrivacy.adresse && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <MapPin style={{ width: 14, height: 14, color: "#888", flexShrink: 0 }} />
                    <span style={{ color: "#d0d0d0", fontSize: "0.82rem" }}>
                      {[userProfile.ville, userProfile.pays].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
                {userProfile?.etablissement_nom && infoPrivacy.etablissement && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <GraduationCap style={{ width: 14, height: 14, color: "#888", flexShrink: 0 }} />
                    <span style={{ color: "#d0d0d0", fontSize: "0.82rem" }}>{userProfile.etablissement_nom}</span>
                  </div>
                )}
                {userProfile?.faculte && infoPrivacy.etablissement && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <BookOpen style={{ width: 14, height: 14, color: "#888", flexShrink: 0 }} />
                    <span style={{ color: "#d0d0d0", fontSize: "0.82rem" }}>{userProfile.faculte}</span>
                  </div>
                )}
              </div>

              {/* Compétences (aperçu) */}
              {competences.length > 0 && (
                <div style={{ flexShrink: 0 }}>
                  <p style={{ color: "#888", fontSize: "0.72rem", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Compétences</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {competences.slice(0, 6).map((c, i) => (
                      <span key={i} style={{ padding: "2px 10px", borderRadius: 12, fontSize: "0.72rem", background: "rgba(255,255,255,0.08)", color: "#e0e0e0", border: "1px solid rgba(255,255,255,0.12)" }}>
                        {c}
                      </span>
                    ))}
                    {competences.length > 6 && (
                      <span style={{ padding: "2px 10px", borderRadius: 12, fontSize: "0.72rem", background: "rgba(255,255,255,0.05)", color: "#888" }}>
                        +{competences.length - 6}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* === Infos supplémentaires (visibles quand on étend) === */}
              {isExpanded && userProfile?.departement && infoPrivacy.etablissement && (
                <div style={{ flexShrink: 0 }}>
                  <p style={{ color: "#888", fontSize: "0.72rem", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Département</p>
                  <p style={{ color: "#d0d0d0", fontSize: "0.82rem" }}>{userProfile.departement}</p>
                </div>
              )}

              {isExpanded && userProfile?.classe && infoPrivacy.etablissement && (
                <div style={{ flexShrink: 0 }}>
                  <p style={{ color: "#888", fontSize: "0.72rem", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Classe / Promotion</p>
                  <p style={{ color: "#d0d0d0", fontSize: "0.82rem" }}>{userProfile.classe}</p>
                </div>
              )}

              {isExpanded && userProfile?.matricule && (
                <div style={{ flexShrink: 0 }}>
                  <p style={{ color: "#888", fontSize: "0.72rem", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Matricule</p>
                  <p style={{ color: "#d0d0d0", fontSize: "0.82rem" }}>{userProfile.matricule}</p>
                </div>
              )}

              {isExpanded && userProfile?.date_naissance && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <Calendar style={{ width: 14, height: 14, color: "#888", flexShrink: 0 }} />
                  <span style={{ color: "#d0d0d0", fontSize: "0.82rem" }}>Né(e) le {new Date(userProfile.date_naissance).toLocaleDateString('fr-FR')}</span>
                </div>
              )}

              {isExpanded && userProfile?.sexe && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <Users style={{ width: 14, height: 14, color: "#888", flexShrink: 0 }} />
                  <span style={{ color: "#d0d0d0", fontSize: "0.82rem" }}>Sexe : {userProfile.sexe === 'M' ? 'Masculin' : userProfile.sexe === 'F' ? 'Féminin' : userProfile.sexe}</span>
                </div>
              )}

              {isExpanded && userProfile?.etat_civil && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <Heart style={{ width: 14, height: 14, color: "#888", flexShrink: 0 }} />
                  <span style={{ color: "#d0d0d0", fontSize: "0.82rem" }}>État civil : {userProfile.etat_civil}</span>
                </div>
              )}

              {isExpanded && userProfile?.nationalite && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <Globe style={{ width: 14, height: 14, color: "#888", flexShrink: 0 }} />
                  <span style={{ color: "#d0d0d0", fontSize: "0.82rem" }}>Nationalité : {userProfile.nationalite}</span>
                </div>
              )}

              {isExpanded && userProfile?.createdAt && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <Star style={{ width: 14, height: 14, color: "#888", flexShrink: 0 }} />
                  <span style={{ color: "#d0d0d0", fontSize: "0.82rem" }}>Membre depuis le {new Date(userProfile.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
              )}

            </div>
          )}
        </div>
      </DraggableDialogBody>
      <DraggableDialogFooter>
        <Button
          onClick={onClose}
          style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.18)", color: "#e0e0e0", ...CG }}
        >
          Fermer
        </Button>
        {userId && (
          <Button
            onClick={handleOpenFullProfile}
            style={{ background: "#2563eb", color: "#fff", ...CG }}
          >
            <ExternalLink style={{ width: 14, height: 14, marginRight: 6 }} />
            Voir le profil complet
          </Button>
        )}
      </DraggableDialogFooter>
    </DraggableDialog>
  );
}
