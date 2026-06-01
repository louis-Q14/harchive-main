import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function getWeekInfo(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const day = (date.getDay() + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - day);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);
  const year = thursday.getFullYear();
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - jan4Day);
  const diffInDays = Math.round((monday.getTime() - firstMonday.getTime()) / 86400000);
  const weekNumber = Math.floor(diffInDays / 7) + 1;

  return {
    semaine: `${year}-W${String(weekNumber).padStart(2, '0')}`,
    date_debut: monday.toISOString().split('T')[0],
    date_fin: sunday.toISOString().split('T')[0]
  };
}

function normalizeCopy(list) {
  return {
    id: list.id || '',
    calendrier_id: list.calendrier_id || '',
    date: list.date || '',
    heure_debut: list.heure_debut || '',
    heure_fin: list.heure_fin || '',
    salle: list.salle || '',
    classe_id: list.classe_id || '',
    classe_nom: list.classe_nom || '',
    professeur_id: list.professeur_id || '',
    professeur_nom: list.professeur_nom || '',
    matiere_id: list.matiere_id || '',
    matiere_nom: list.matiere_nom || '',
    etablissement_id: list.etablissement_id || '',
    etablissement_nom: list.etablissement_nom || '',
    total_etudiants: list.total_etudiants || 0,
    total_presents: list.total_presents || 0,
    total_absents: list.total_absents || 0,
    total_retards: list.total_retards || 0,
    presences: list.presences || []
  };
}

function findRotationMatch(list, rotations = []) {
  return (
    rotations.find((rotation) => list.calendrier_id && rotation.id === list.calendrier_id) ||
    rotations.find(
      (rotation) =>
        rotation.matiere_id === list.matiere_id &&
        rotation.professeur_id === list.professeur_id &&
        rotation.heure_debut === list.heure_debut
    ) ||
    rotations.find(
      (rotation) =>
        rotation.matiere_id === list.matiere_id &&
        rotation.professeur_id === list.professeur_id
    ) ||
    rotations.find((rotation) => rotation.matiere_id === list.matiere_id) ||
    null
  );
}

function enrichCopyWithRotation(list, rotation) {
  if (!rotation) return normalizeCopy(list);

  const hasAssignedProfessor = !!rotation.professeur_id;

  return normalizeCopy({
    ...rotation,
    ...list,
    calendrier_id: list.calendrier_id || rotation.id,
    date: list.date || rotation.date_debut?.split('T')[0] || '',
    heure_debut: list.heure_debut || rotation.heure_debut || '',
    heure_fin: list.heure_fin || rotation.heure_fin || '',
    salle: list.salle || rotation.salle || '',
    classe_nom: rotation.classe_nom || list.classe_nom || '',
    professeur_id: hasAssignedProfessor ? rotation.professeur_id : '',
    professeur_nom: hasAssignedProfessor ? (rotation.professeur_nom || '') : '',
    matiere_nom: rotation.matiere_nom || list.matiere_nom || ''
  });
}

function isSameCopy(a, b) {
  if (a.id && b.id) return a.id === b.id;
  if (a.calendrier_id && b.calendrier_id) return a.calendrier_id === b.calendrier_id;
  return a.date === b.date && a.heure_debut === b.heure_debut && a.matiere_id === b.matiere_id && a.professeur_id === b.professeur_id;
}

function buildSummary(copies) {
  const total_cours = copies.length;
  const total_presents = copies.reduce((sum, item) => sum + (item.total_presents || 0), 0);
  const total_absents = copies.reduce((sum, item) => sum + (item.total_absents || 0), 0);
  const total_retards = copies.reduce((sum, item) => sum + (item.total_retards || 0), 0);
  const total_etudiants = copies.reduce((max, item) => Math.max(max, item.total_etudiants || 0), 0);

  const taux_presence = total_cours > 0 && total_etudiants > 0 ? (total_presents / (total_cours * total_etudiants)) * 100 : 0;
  const taux_absence = total_cours > 0 && total_etudiants > 0 ? (total_absents / (total_cours * total_etudiants)) * 100 : 0;
  const taux_retard = total_cours > 0 && total_etudiants > 0 ? (total_retards / (total_cours * total_etudiants)) * 100 : 0;

  return {
    total_cours,
    total_presents,
    total_absents,
    total_retards,
    taux_presence: Math.round(taux_presence * 100) / 100,
    taux_absence: Math.round(taux_absence * 100) / 100,
    taux_retard: Math.round(taux_retard * 100) / 100
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const listData = payload?.data || payload?.old_data;

    if (!listData?.classe_id || !listData?.date || !listData?.etablissement_id) {
      return Response.json({ success: true, skipped: true, reason: 'Missing required list fields' });
    }

    const allRotations = await base44.asServiceRole.entities.CalendrierAcademique.filter({
      type: 'cours',
      classe_id: listData.classe_id
    }, '-date_debut', 300);
    const assignations = await base44.asServiceRole.entities.AssignationProfesseur.filter({
      classe_id: listData.classe_id,
      matiere_id: listData.matiere_id
    }, '-created_date', 50);
    const rotationsForDate = allRotations.filter((rotation) => rotation.date_debut?.split('T')[0] === listData.date);
    const matchedRotation = findRotationMatch(listData, rotationsForDate);
    const assignationForCourse = assignations[0] || null;
    const normalizedRotation = matchedRotation
      ? {
          ...matchedRotation,
          professeur_id: assignationForCourse?.professeur_id || '',
          professeur_nom: assignationForCourse?.professeur_nom || ''
        }
      : {
          ...listData,
          professeur_id: assignationForCourse?.professeur_id || '',
          professeur_nom: assignationForCourse?.professeur_nom || ''
        };
    const copy = enrichCopyWithRotation(listData, normalizedRotation);
    const weekInfo = getWeekInfo(copy.date);
    const matches = await base44.asServiceRole.entities.StatistiquePresence.filter({
      type: 'promotion',
      classe_id: copy.classe_id,
      semaine: weekInfo.semaine
    }, '-created_date', 20);

    const existingStat = matches[0] || null;
    const currentCopies = existingStat?.copies_listes || [];
    const mergedCopies = [...currentCopies.filter((item) => !isSameCopy(item, copy)), copy].sort((a, b) => {
      const dateCompare = String(a.date || '').localeCompare(String(b.date || ''));
      if (dateCompare !== 0) return dateCompare;
      return String(a.heure_debut || '').localeCompare(String(b.heure_debut || ''));
    });
    const summary = buildSummary(mergedCopies);

    const statPayload = {
      type: 'promotion',
      classe_id: copy.classe_id,
      classe_nom: copy.classe_nom,
      etablissement_id: copy.etablissement_id,
      etablissement_nom: copy.etablissement_nom,
      semaine: weekInfo.semaine,
      date_debut: weekInfo.date_debut,
      date_fin: weekInfo.date_fin,
      total_cours: summary.total_cours,
      total_presents: summary.total_presents,
      total_absents: summary.total_absents,
      total_retards: summary.total_retards,
      taux_presence: summary.taux_presence,
      taux_absence: summary.taux_absence,
      taux_retard: summary.taux_retard,
      copies_listes: mergedCopies
    };

    if (existingStat?.id) {
      const updated = await base44.asServiceRole.entities.StatistiquePresence.update(existingStat.id, statPayload);
      return Response.json({ success: true, action: 'updated', stat_id: updated.id });
    }

    const created = await base44.asServiceRole.entities.StatistiquePresence.create(statPayload);
    return Response.json({ success: true, action: 'created', stat_id: created.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});