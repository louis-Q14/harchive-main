export function compareTimeStrings(a = "", b = "") {
  return String(a || "").localeCompare(String(b || ""));
}

export function getPresenceListMatch(rotation, lists = []) {
  const rotationDate = rotation.date_debut?.split("T")[0] || rotation.date;

  return (
    lists.find((list) => list.calendrier_id && rotation.id && list.calendrier_id === rotation.id) ||
    lists.find(
      (list) =>
        list.date === rotationDate &&
        list.classe_id === rotation.classe_id &&
        list.matiere_id === rotation.matiere_id &&
        list.professeur_id === rotation.professeur_id &&
        list.heure_debut === rotation.heure_debut
    ) ||
    lists.find(
      (list) =>
        list.date === rotationDate &&
        list.classe_id === rotation.classe_id &&
        list.matiere_id === rotation.matiere_id &&
        list.professeur_id === rotation.professeur_id
    ) ||
    lists.find(
      (list) =>
        list.date === rotationDate &&
        list.classe_id === rotation.classe_id &&
        list.matiere_id === rotation.matiere_id
    ) ||
    null
  );
}

export function buildPresenceListPayload({ rotation, promotion, existingList = null, etablissementNom = "" }) {
  return {
    calendrier_id: rotation.id,
    date: rotation.date_debut?.split("T")[0] || rotation.date || existingList?.date || "",
    classe_id: rotation.classe_id || existingList?.classe_id || "",
    classe_nom: rotation.classe_nom || promotion?.nom || existingList?.classe_nom || "",
    faculte: promotion?.faculte_nom || existingList?.faculte || "",
    departement: promotion?.departement_nom || existingList?.departement || "",
    option: promotion?.option_nom || existingList?.option || "",
    orientation: promotion?.orientation_nom || existingList?.orientation || "",
    professeur_id: rotation?.professeur_id || "",
    professeur_nom: rotation?.professeur_id ? (rotation.professeur_nom || "") : "",
    matiere_id: rotation.matiere_id || existingList?.matiere_id || "",
    matiere_nom: rotation.matiere_nom || existingList?.matiere_nom || "",
    etablissement_id: rotation.etablissement_id || existingList?.etablissement_id || "",
    etablissement_nom: etablissementNom || existingList?.etablissement_nom || "",
    heure_debut: rotation.heure_debut || existingList?.heure_debut || "",
    heure_fin: rotation.heure_fin || existingList?.heure_fin || "",
    salle: rotation.salle || existingList?.salle || "",
    presences: existingList?.presences || [],
    total_etudiants: existingList?.total_etudiants || 0,
    total_presents: existingList?.total_presents || 0,
    total_absents: existingList?.total_absents || 0,
    total_retards: existingList?.total_retards || 0
  };
}