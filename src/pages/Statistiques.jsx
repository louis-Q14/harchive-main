import React, { useState } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, ChevronDown, ChevronRight, Trash2, Eye, Wand2, Calendar, Clock } from "lucide-react";
import { format, parseISO, startOfWeek, endOfWeek, getISOWeek, getISOWeekYear } from "date-fns";
import PresenceListsDialog from "@/components/statistiques/PresenceListsDialog";
import WeeklyPresenceChart from "@/components/statistiques/WeeklyPresenceChart";
import { buildPresenceListPayload, compareTimeStrings, getPresenceListMatch } from "@/lib/presenceListUtils";

const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Aoé»t", "Septembre", "Octobre", "Novembre", "Décembre"];
const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function getWeekInfoFromDate(dateString) {
  const date = parseISO(dateString);
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  const weekNumber = getISOWeek(date);
  const weekYear = getISOWeekYear(date);
  const weekKey = `${weekYear}-W${String(weekNumber).padStart(2, "0")}`;
  const monthKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}`;

  return {
    weekKey,
    weekNumber,
    monthKey,
    monthLabel: `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`,
    date_debut: format(weekStart, "yyyy-MM-dd"),
    date_fin: format(weekEnd, "yyyy-MM-dd")
  };
}

function getFrenchDateLabel(dateString) {
  const date = parseISO(dateString);
  return `${DAY_NAMES[date.getDay()]} ${format(date, "dd/MM/yyyy")}`;
}

function getMatchScore(rotation, list) {
  const rotationDate = rotation.date_debut?.split("T")[0] || rotation.date;
  if (list.date !== rotationDate || list.classe_id !== rotation.classe_id) return -1;

  let score = 0;

  if (list.calendrier_id && rotation.id && list.calendrier_id === rotation.id) score += 100;
  if ((list.matiere_id || list.matiere_nom) === (rotation.matiere_id || rotation.matiere_nom)) score += 40;
  if ((list.professeur_id || "") === (rotation.professeur_id || "")) score += 20;
  if ((list.heure_debut || "") === (rotation.heure_debut || "")) score += 20;
  if ((list.heure_fin || "") === (rotation.heure_fin || "")) score += 20;
  if ((list.presences || []).length > 0) score += 30;
  if ((list.total_presents || 0) > 0 || (list.total_absents || 0) > 0 || (list.total_retards || 0) > 0) score += 20;

  return score;
}

function findBestListMatch(rotation, lists = [], usedKeys = new Set()) {
  const ranked = lists
    .map((list, index) => ({
      list,
      key: String(list.id || list.calendrier_id || `${list.date || ""}-${list.matiere_id || ""}-${list.professeur_id || ""}-${list.heure_debut || ""}-${index}`),
      score: getMatchScore(rotation, list)
    }))
    .filter((item) => item.score >= 0 && !usedKeys.has(item.key))
    .sort((a, b) => b.score - a.score);

  return ranked[0] || null;
}

function DayListsGroup({ dayData, onOpenLists }) {
  const sortedCourses = [...dayData.courses].sort((a, b) => compareTimeStrings(a.heure_debut, b.heure_debut));

  return (
    <div className="rounded-xl border p-3 space-y-3" style={{ backgroundColor: "#262626", borderColor: "#3f3f3f" }}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-white font-semibold">{getFrenchDateLabel(dayData.date)}</p>
          <p className="text-sm text-gray-300">{sortedCourses.length} cours prévu{sortedCourses.length > 1 ? "s" : ""} pour cette journée</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => onOpenLists(dayData)}>
          <Eye className="w-4 h-4" />
          Voir les listes du jour
        </Button>
      </div>

      <div className="space-y-2">
        {sortedCourses.map((course) => (
          <div key={course.id} className="rounded-lg border p-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between" style={{ backgroundColor: "#2d2d2d", borderColor: "#4d4d4d" }}>
            <div className="flex items-start gap-3">
              <div className="rounded-md px-2 py-1 text-xs font-semibold bg-[#3d3d3d] text-white min-w-[92px] text-center">
                {course.heure_debut || "--:--"}
                {course.heure_fin ? ` - ${course.heure_fin}` : ""}
              </div>
              <div>
                <p className="text-white font-medium">{course.matiere_nom || "Cours"}</p>
                <p className="text-sm text-gray-300">
                  {course.professeur_nom || "Professeur non défini"}
                  {course.salle ? ` • Salle ${course.salle}` : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Badge className={course.isVirtual ? "bg-[#5a5a5a] text-white" : "bg-green-600 text-white"}>
                {course.isVirtual ? "Liste en attente" : "Liste créée"}
              </Badge>
              <Badge className="bg-[#3d3d3d] text-white">
                {course.list?.total_presents || 0}/{course.list?.total_etudiants || 0}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekStatCard({ weekData, onOpenDayLists, onGenerateWeek, isGenerating, deleteStatistiqueMutation }) {
  const hasStat = !!weekData.stat;
  const dayEntries = Object.values(weekData.days || {}).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const totalCourses = dayEntries.reduce((sum, day) => sum + day.courses.length, 0);

  return (
    <div className="rounded-xl border p-2 space-y-3" style={{ backgroundColor: "#2d2d2d", borderColor: "#4d4d4d" }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <Badge className="bg-[#3d3d3d] text-white h-6 px-2">Semaine {weekData.weekNumber}</Badge>
          <Badge className="bg-[#444] text-gray-200 h-6 px-2">{totalCourses} cours</Badge>
          <Badge className="bg-[#444] text-gray-200 h-6 px-2">{dayEntries.length} jours</Badge>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onOpenDayLists(weekData)}
            disabled={totalCourses === 0}
            className="h-7 w-7 text-white hover:bg-transparent"
            title="Voir les cours"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onGenerateWeek(weekData)}
            disabled={isGenerating || totalCourses === 0}
            className="h-7 w-7 text-blue-400 hover:bg-transparent"
            title={hasStat ? "Régénérer statistique" : "Générer statistique"}
          >
            <Wand2 className="w-4 h-4" />
          </Button>
          {hasStat && (
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Supprimer cette statistique ?")) {
                  deleteStatistiqueMutation.mutate(weekData.stat.id);
                }
              }}
              className="h-7 w-7 bg-transparent p-0 text-red-400 hover:bg-transparent hover:text-red-300"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-300">
        {format(parseISO(weekData.date_debut), "dd/MM")} - {format(parseISO(weekData.date_fin), "dd/MM/yyyy")}
      </p>

      {hasStat ? (
        <WeeklyPresenceChart days={weekData.days} />
      ) : (
        <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-gray-300" style={{ borderColor: "#5a5a5a" }}>
          Aucune statistique générée pour cette semaine.
        </div>
      )}
    </div>
  );
}

function PromoItem({ promoName, promoData, pKey, pExpanded, toggle, onOpenDayLists, onGenerateWeek, generatingWeekKey, deleteStatistiqueMutation }) {
  const monthEntries = Object.entries(promoData.months || {}).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "#3a3a3a" }}>
      <button onClick={() => toggle(pKey)} className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[#444] transition-colors text-left">
        {pExpanded ? <ChevronDown className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
        <span className="text-green-300 font-medium text-sm">🎓 {promoName}</span>
        <Badge className="bg-[#555] text-gray-300 text-xs ml-auto">{monthEntries.length} mois</Badge>
      </button>
      {pExpanded && (
        <div className="px-4 pb-3 space-y-3">
          {monthEntries.map(([monthKey, monthData]) => {
            const weeks = Object.values(monthData.weeks || {}).sort((a, b) => b.weekKey.localeCompare(a.weekKey));

            return (
              <div key={monthKey} className="rounded-xl border p-3" style={{ backgroundColor: "#262626", borderColor: "#3f3f3f" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <p className="text-blue-300 font-semibold text-sm">{monthData.label}</p>
                  <Badge className="bg-[#3d3d3d] text-gray-200">{weeks.length} semaine{weeks.length > 1 ? "s" : ""}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  {weeks.map((weekData) => (
                    <WeekStatCard
                      key={`${promoData.classe_id}-${weekData.weekKey}`}
                      weekData={weekData}
                      onOpenDayLists={onOpenDayLists}
                      onGenerateWeek={onGenerateWeek}
                      isGenerating={generatingWeekKey === `${promoData.classe_id}__${weekData.weekKey}`}
                      deleteStatistiqueMutation={deleteStatistiqueMutation}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PromotionsList({ promotions, expandedPromotions, toggle, onOpenDayLists, onGenerateWeek, generatingWeekKey, deleteStatistiqueMutation, prefix }) {
  return (
    <div className="pl-4 pb-2 space-y-1">
      {Object.entries(promotions)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([promoName, promoData]) => {
          const pKey = `p_${prefix}_${promoName}`;
          const pExpanded = expandedPromotions[pKey];
          return (
            <PromoItem
              key={pKey}
              promoName={promoName}
              promoData={promoData}
              pKey={pKey}
              pExpanded={pExpanded}
              toggle={toggle}
              onOpenDayLists={onOpenDayLists}
              onGenerateWeek={onGenerateWeek}
              generatingWeekKey={generatingWeekKey}
              deleteStatistiqueMutation={deleteStatistiqueMutation}
            />
          );
        })}
    </div>
  );
}

export default function Statistiques() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedPromotions, setExpandedPromotions] = useState({});
  const [presenceDialog, setPresenceDialog] = useState({ open: false, title: "", lists: [] });
  const [generatingWeekKey, setGeneratingWeekKey] = useState("");

  const queryClient = useQueryClient();

  React.useEffect(() => {
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

  const { data: classes = [] } = useQuery({
    queryKey: ["promotions-etablissement", user?.etablissement_id],
    queryFn: async () => dataService.query('Promotion', { filters: [{ etablissement_id: user.etablissement_id }] }),
    enabled: !!user?.etablissement_id
  });

  const { data: statsPresence = [] } = useQuery({
    queryKey: ["stats-presence-admin", user?.etablissement_id, user?.classe_id],
    queryFn: async () => {
      if (user?.classe_id) {
        return await dataService.query('StatistiquePresence', { filters: [{ classe_id: user.classe_id }],
  limit: 1000, offset: 0 });
      }
      if (user?.etablissement_id) {
        return await dataService.query('StatistiquePresence', { filters: [{ etablissement_id: user.etablissement_id }],
  limit: 1000, offset: 0 });
      }
      return [];
    },
    enabled: !!user?.etablissement_id
  });

  const { data: listesPresence = [] } = useQuery({
    queryKey: ["listes-presence-admin", user?.etablissement_id, user?.classe_id],
    queryFn: async () => {
      if (user?.classe_id) {
        return await dataService.query('ListePresence', { filters: [{ classe_id: user.classe_id }],
  limit: 1000, offset: 0 });
      }
      if (user?.etablissement_id) {
        return await dataService.query('ListePresence', { filters: [{ etablissement_id: user.etablissement_id }],
  limit: 1000, offset: 0 });
      }
      return [];
    },
    enabled: !!user?.etablissement_id
  });

  const { data: rotations = [] } = useQuery({
    queryKey: ["rotations-stats", user?.etablissement_id, user?.classe_id],
    queryFn: async () => {
      if (user?.classe_id) {
        return await dataService.query('CalendrierAcademique', { filters: [{ type: "cours", classe_id: user.classe_id }],
  limit: 1000, offset: 0 });
      }
      if (user?.etablissement_id) {
        return await dataService.query('CalendrierAcademique', { filters: [{ type: "cours", etablissement_id: user.etablissement_id }],
  limit: 1000, offset: 0 });
      }
      return [];
    },
    enabled: !!user?.etablissement_id
  });

  const { data: assignations = [] } = useQuery({
    queryKey: ["assignations-stats", user?.etablissement_id],
    queryFn: async () => {
      if (!user?.etablissement_id) return [];
      return await dataService.query('AssignationProfesseur', { filters: [{ etablissement_id: user.etablissement_id }],
  limit: 1000, offset: 0 });
    },
    enabled: !!user?.etablissement_id
  });

  const deleteStatistiqueMutation = useMutation({
    mutationFn: (id) => dataService.delete('StatistiquePresence', id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueriesData({ queryKey: ["stats-presence-admin"] }, (current = []) =>
        Array.isArray(current) ? current.filter((item) => item.id !== deletedId) : current
      );
      queryClient.invalidateQueries({ queryKey: ["stats-presence-admin"] });
    },
    onError: () => {
      alert("La suppression a échoué.");
    }
  });

  const statsPromotions = statsPresence.filter((stat) => stat.type === "promotion");
  const classMap = React.useMemo(() => new Map(classes.map((classe) => [classe.id, classe])), [classes]);
  const statsMap = React.useMemo(
    () => new Map(statsPromotions.map((stat) => [`${stat.classe_id}__${stat.semaine}`, stat])),
    [statsPromotions]
  );
  const listBuckets = React.useMemo(() => {
    const buckets = new Map();
    listesPresence.forEach((list) => {
      const key = `${list.classe_id}__${list.date}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(list);
    });
    return buckets;
  }, [listesPresence]);

  const ensurePromotionNode = (tree, promoSource) => {
    const faculte = promoSource.faculte || promoSource._faculte || "Sans Faculté";
    const departement = promoSource.departement || promoSource._departement || "Sans Département";
    const orientation = promoSource.orientation || promoSource._orientation || null;
    const option = promoSource.option || promoSource._option || null;
    const promoName = promoSource.classe_nom || promoSource.nom || "Promotion sans nom";

    if (!tree[faculte]) tree[faculte] = {};
    if (!tree[faculte][departement]) tree[faculte][departement] = {};

    const deptNode = tree[faculte][departement];

    const createPromoEntry = () => ({
      classe_id: promoSource.classe_id || promoSource.id,
      classe_nom: promoName,
      months: {}
    });

    if (orientation) {
      const orientationKey = `__or__${orientation}`;
      if (!deptNode[orientationKey]) deptNode[orientationKey] = { _type: "orientation", label: orientation, children: {} };
      const orientationChildren = deptNode[orientationKey].children;

      if (option) {
        const optionKey = `__op__${option}`;
        if (!orientationChildren[optionKey]) orientationChildren[optionKey] = { _type: "option", label: option, promotions: {} };
        if (!orientationChildren[optionKey].promotions[promoName]) orientationChildren[optionKey].promotions[promoName] = createPromoEntry();
        return orientationChildren[optionKey].promotions[promoName];
      }

      const promoKey = `__p__${promoName}`;
      if (!orientationChildren[promoKey]) orientationChildren[promoKey] = createPromoEntry();
      return orientationChildren[promoKey];
    }

    if (option) {
      const optionKey = `__op__${option}`;
      if (!deptNode[optionKey]) deptNode[optionKey] = { _type: "option", label: option, promotions: {} };
      if (!deptNode[optionKey].promotions[promoName]) deptNode[optionKey].promotions[promoName] = createPromoEntry();
      return deptNode[optionKey].promotions[promoName];
    }

    const promoKey = `__p__${promoName}`;
    if (!deptNode[promoKey]) deptNode[promoKey] = createPromoEntry();
    return deptNode[promoKey];
  };

  const hierarchyTree = React.useMemo(() => {
    const tree = {};
    const rawUsedKeysByDay = new Map();
    const copiedUsedKeysByDay = new Map();
    const sortedRotations = [...rotations].sort((a, b) => {
      const dateCompare = String(a.date_debut || "").localeCompare(String(b.date_debut || ""));
      if (dateCompare !== 0) return dateCompare;
      return compareTimeStrings(a.heure_debut, b.heure_debut);
    });

    sortedRotations.forEach((rotation) => {
      const promo = classMap.get(rotation.classe_id);
      const assignationForCourse = assignations.find(
        (item) => item.classe_id === rotation.classe_id && item.matiere_id === rotation.matiere_id
      );
      const normalizedRotation = {
        ...rotation,
        professeur_id: assignationForCourse?.professeur_id || "",
        professeur_nom: assignationForCourse?.professeur_nom || ""
      };
      const promoNode = ensurePromotionNode(tree, {
        classe_id: normalizedRotation.classe_id,
        classe_nom: normalizedRotation.classe_nom || promo?.nom,
        faculte: promo?.faculte_nom,
        departement: promo?.departement_nom,
        orientation: promo?.orientation_nom,
        option: promo?.option_nom
      });

      const weekInfo = getWeekInfoFromDate(normalizedRotation.date_debut.split("T")[0]);
      if (!promoNode.months[weekInfo.monthKey]) promoNode.months[weekInfo.monthKey] = { label: weekInfo.monthLabel, weeks: {} };
      if (!promoNode.months[weekInfo.monthKey].weeks[weekInfo.weekKey]) {
        promoNode.months[weekInfo.monthKey].weeks[weekInfo.weekKey] = {
          ...weekInfo,
          classe_id: normalizedRotation.classe_id,
          classe_nom: normalizedRotation.classe_nom || promo?.nom,
          stat: statsMap.get(`${normalizedRotation.classe_id}__${weekInfo.weekKey}`) || null,
          days: {}
        };
      }

      const weekNode = promoNode.months[weekInfo.monthKey].weeks[weekInfo.weekKey];
      const dayKey = normalizedRotation.date_debut.split("T")[0];
      const dayBucketKey = `${normalizedRotation.classe_id}__${dayKey}`;
      const sameDayLists = listBuckets.get(dayBucketKey) || [];
      if (!rawUsedKeysByDay.has(dayBucketKey)) rawUsedKeysByDay.set(dayBucketKey, new Set());
      if (!copiedUsedKeysByDay.has(dayBucketKey)) copiedUsedKeysByDay.set(dayBucketKey, new Set());
      const matchedRaw = findBestListMatch(normalizedRotation, sameDayLists, rawUsedKeysByDay.get(dayBucketKey));
      const matchedList = matchedRaw?.list || null;
      if (matchedRaw?.key) rawUsedKeysByDay.get(dayBucketKey).add(matchedRaw.key);

      const copiedLists = weekNode?.stat?.copies_listes || [];
      const matchedCopied = findBestListMatch(normalizedRotation, copiedLists, copiedUsedKeysByDay.get(dayBucketKey));
      const copiedMatch = matchedCopied?.list || null;
      if (matchedCopied?.key) copiedUsedKeysByDay.get(dayBucketKey).add(matchedCopied.key);

      const enrichedCopiedMatch = copiedMatch
        ? buildPresenceListPayload({
            rotation: normalizedRotation,
            promotion: promo,
            existingList: copiedMatch,
            etablissementNom: user?.etablissement_nom || ""
          })
        : null;
      const enrichedMatchedList = matchedList
        ? buildPresenceListPayload({
            rotation: normalizedRotation,
            promotion: promo,
            existingList: matchedList,
            etablissementNom: user?.etablissement_nom || ""
          })
        : null;
      const listPayload = enrichedCopiedMatch || enrichedMatchedList || buildPresenceListPayload({
        rotation: normalizedRotation,
        promotion: promo,
        etablissementNom: user?.etablissement_nom || ""
      });

      if (!weekNode.days[dayKey]) {
        weekNode.days[dayKey] = { date: dayKey, courses: [], lists: [] };
      }

      weekNode.days[dayKey].courses.push({
        id: matchedList?.id || normalizedRotation.id,
        heure_debut: normalizedRotation.heure_debut,
        heure_fin: normalizedRotation.heure_fin,
        matiere_nom: normalizedRotation.matiere_nom,
        professeur_nom: normalizedRotation.professeur_nom,
        salle: normalizedRotation.salle,
        isVirtual: !matchedList,
        list: listPayload
      });
      weekNode.days[dayKey].lists.push(listPayload);
    });

    statsPromotions.forEach((stat) => {
      const promo = classMap.get(stat.classe_id);
      const promoNode = ensurePromotionNode(tree, {
        classe_id: stat.classe_id,
        classe_nom: stat.classe_nom || promo?.nom,
        _faculte: promo?.faculte_nom || "Sans Faculté",
        _departement: promo?.departement_nom || "Sans Département",
        _orientation: promo?.orientation_nom || null,
        _option: promo?.option_nom || null
      });

      const weekInfo = getWeekInfoFromDate(stat.date_debut);
      if (!promoNode.months[weekInfo.monthKey]) promoNode.months[weekInfo.monthKey] = { label: weekInfo.monthLabel, weeks: {} };
      if (!promoNode.months[weekInfo.monthKey].weeks[stat.semaine]) {
        promoNode.months[weekInfo.monthKey].weeks[stat.semaine] = {
          ...weekInfo,
          weekKey: stat.semaine,
          classe_id: stat.classe_id,
          classe_nom: stat.classe_nom,
          stat,
          days: {}
        };
      } else {
        promoNode.months[weekInfo.monthKey].weeks[stat.semaine].stat = stat;
      }
    });

    return tree;
  }, [rotations, assignations, classMap, listBuckets, statsMap, statsPromotions, user?.etablissement_nom]);

  const generateWeekStatMutation = useMutation({
    mutationFn: async (weekData) => {
      const listsForStats = Object.values(weekData.days || {}).flatMap((day) => day.lists || []);
      if (!listsForStats.length) throw new Error("Aucune liste de présence disponible pour cette semaine.");

      const existingStats = statsPresence.filter((stat) => stat.classe_id === weekData.classe_id && stat.semaine === weekData.weekKey);
      for (const stat of existingStats) {
        await dataService.delete('StatistiquePresence', stat.id);
      }

      const selectedClasseData = classMap.get(weekData.classe_id);
      let allEtudiants = await dataService.query('Etudiant', { filters: [{ etablissement_id: user.etablissement_id, classe_id: weekData.classe_id }],
  limit: 1000, offset: 0 });
      if (allEtudiants.length === 0) {
        allEtudiants = await dataService.query('DemandeInscription', { filters: [{
          type_utilisateur: "etudiant",
          statut: "approuvee",
          etablissement_nom: user.etablissement_nom,
          classe: selectedClasseData?.nom || weekData.classe_nom
        }],
  limit: 1000, offset: 0 });
      }

      const statsParEtudiant = {};
      listsForStats.forEach((liste) => {
        (liste.presences || []).forEach((presence) => {
          if (!statsParEtudiant[presence.etudiant_id]) {
            statsParEtudiant[presence.etudiant_id] = {
              etudiant_id: presence.etudiant_id,
              etudiant_nom: presence.etudiant_nom,
              etudiant_matricule: presence.etudiant_matricule,
              total_cours: 0,
              total_presents: 0,
              total_absents: 0,
              total_retards: 0,
              details_par_jour: []
            };
          }

          const stats = statsParEtudiant[presence.etudiant_id];
          stats.total_cours += 1;
          if (presence.statut === "present") stats.total_presents += 1;
          if (presence.statut === "absent") stats.total_absents += 1;
          if (presence.statut === "retard") stats.total_retards += 1;
          stats.details_par_jour.push({ date: liste.date, statut: presence.statut });
        });
      });

      for (const etudiantId of Object.keys(statsParEtudiant)) {
        const stats = statsParEtudiant[etudiantId];
        const etudiant = allEtudiants.find((item) => item.id === etudiantId);
        const taux_presence = stats.total_cours > 0 ? (stats.total_presents / stats.total_cours) * 100 : 0;
        const taux_absence = stats.total_cours > 0 ? (stats.total_absents / stats.total_cours) * 100 : 0;
        const taux_retard = stats.total_cours > 0 ? (stats.total_retards / stats.total_cours) * 100 : 0;

        let parent_id = null;
        if (etudiant?.matricule) {
          const parents = await dataService.query('DemandeInscriptionParent', { filters: [{  matricule_enfant: etudiant.matricule, statut: "approuvee"  }],
  limit: 1000, offset: 0 });
          if (parents.length > 0) parent_id = parents[0].id;
        }

        await dataService.create('StatistiquePresence', {
          type: "etudiant",
          etudiant_id: etudiantId,
          etudiant_nom: stats.etudiant_nom,
          etudiant_matricule: stats.etudiant_matricule,
          parent_id,
          classe_id: weekData.classe_id,
          classe_nom: weekData.classe_nom,
          etablissement_id: user.etablissement_id,
          etablissement_nom: user.etablissement_nom,
          semaine: weekData.weekKey,
          date_debut: weekData.date_debut,
          date_fin: weekData.date_fin,
          total_cours: stats.total_cours,
          total_presents: stats.total_presents,
          total_absents: stats.total_absents,
          total_retards: stats.total_retards,
          taux_presence: Math.round(taux_presence * 100) / 100,
          taux_absence: Math.round(taux_absence * 100) / 100,
          taux_retard: Math.round(taux_retard * 100) / 100,
          details_par_jour: stats.details_par_jour
        });

        if (etudiant?.email) {
          const usersEtudiant = await dataService.query('User', { filters: [{  email: etudiant.email  }],
  limit: 1000, offset: 0 });
          if (usersEtudiant.length > 0) {
            await dataService.create('Notification', {
              destinataire_id: usersEtudiant[0].id,
              type: "systeme",
              titre: "Statistiques de présence",
              contenu: `Vos statistiques de présence pour la semaine ${weekData.weekKey}: ${Math.round(taux_presence)}% de présence`,
              lien: "/Dashboard"
            });
          }
        }

        if (parent_id) {
          const parentDemandes = await dataService.query('DemandeInscriptionParent', { filters: [{  id: parent_id  }],
  limit: 1000, offset: 0 });
          if (parentDemandes.length > 0) {
            const usersParent = await dataService.query('User', { filters: [{  email: parentDemandes[0].email  }] });
            if (usersParent.length > 0) {
              await dataService.create('Notification', {
                destinataire_id: usersParent[0].id,
                type: "systeme",
                titre: "Statistiques de présence de votre enfant",
                contenu: `Statistiques de ${stats.etudiant_nom} pour la semaine ${weekData.weekKey}: ${Math.round(taux_presence)}% de présence`
              });
            }
          }
        }
      }

      const totalCours = listsForStats.length;
      const totalPresents = listsForStats.reduce((sum, liste) => sum + (liste.total_presents || 0), 0);
      const totalAbsents = listsForStats.reduce((sum, liste) => sum + (liste.total_absents || 0), 0);
      const totalRetards = listsForStats.reduce((sum, liste) => sum + (liste.total_retards || 0), 0);
      const totalEtudiants = allEtudiants.length || listsForStats[0]?.total_etudiants || 0;

      const tauxPresencePromo = totalCours > 0 && totalEtudiants > 0 ? (totalPresents / (totalCours * totalEtudiants)) * 100 : 0;
      const tauxAbsencePromo = totalCours > 0 && totalEtudiants > 0 ? (totalAbsents / (totalCours * totalEtudiants)) * 100 : 0;
      const tauxRetardPromo = totalCours > 0 && totalEtudiants > 0 ? (totalRetards / (totalCours * totalEtudiants)) * 100 : 0;

      await dataService.create('StatistiquePresence', {
        type: "promotion",
        classe_id: weekData.classe_id,
        classe_nom: weekData.classe_nom,
        etablissement_id: user.etablissement_id,
        etablissement_nom: user.etablissement_nom,
        semaine: weekData.weekKey,
        date_debut: weekData.date_debut,
        date_fin: weekData.date_fin,
        total_cours: totalCours,
        total_presents: totalPresents,
        total_absents: totalAbsents,
        total_retards: totalRetards,
        taux_presence: Math.round(tauxPresencePromo * 100) / 100,
        taux_absence: Math.round(tauxAbsencePromo * 100) / 100,
        taux_retard: Math.round(tauxRetardPromo * 100) / 100
      });
    },
    onMutate: (weekData) => setGeneratingWeekKey(`${weekData.classe_id}__${weekData.weekKey}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stats-presence-admin"] });
      alert("Statistique hebdomadaire générée avec succès.");
    },
    onError: (error) => alert(error.message || "Une erreur est survenue."),
    onSettled: () => setGeneratingWeekKey("")
  });

  const toggle = (key) => setExpandedPromotions((prev) => ({ ...prev, [key]: !prev[key] }));

  const openDayListsDialog = (weekData) => {
    const copiedLists = weekData.stat?.copies_listes || [];
    const rawLists = Object.values(weekData.days || {}).flatMap((day) => day.lists || []);
    const mergedMap = new Map();

    [...rawLists, ...copiedLists].forEach((list, index) => {
      const key = String(
        list.id ||
        list.calendrier_id ||
        `${list.date || ''}-${list.matiere_id || list.matiere_nom || ''}-${list.professeur_id || ''}-${list.heure_debut || ''}-${index}`
      );
      const current = mergedMap.get(key);
      const currentScore = current ? (((current.presences || []).length * 1000) + ((current.total_presents || 0) * 100) + ((current.total_absents || 0) * 10) + (current.total_retards || 0)) : -1;
      const nextScore = (((list.presences || []).length * 1000) + ((list.total_presents || 0) * 100) + ((list.total_absents || 0) * 10) + (list.total_retards || 0));
      if (!current || nextScore >= currentScore) {
        mergedMap.set(key, list);
      }
    });

    setPresenceDialog({
      open: true,
      title: `${weekData.classe_nom} • semaine ${weekData.weekNumber}`,
      lists: Array.from(mergedMap.values())
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#4d4d4d" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-white font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: "#4d4d4d" }}>
        <div className="w-full px-4">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-10 h-10 text-blue-500" />
              <div>
                <h1 className="text-3xl font-bold text-white">Statistiques</h1>
                <p className="text-gray-300">Regroupement par jour avec les cours classés selon la rotation.</p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="presence" className="space-y-6">
            <TabsList className="bg-[#3d3d3d]">
              <TabsTrigger value="presence">Liste de présence</TabsTrigger>
              <TabsTrigger value="general">Statistiques Générales</TabsTrigger>
            </TabsList>

            <TabsContent value="presence" className="space-y-6">
              <Card style={{ backgroundColor: "#3d3d3d", borderColor: "#2d2d2d" }}>
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Présences et statistiques par promotion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(hierarchyTree).length === 0 ? (
                    <p className="text-gray-400 text-center py-8">Aucune rotation de cours disponible</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(hierarchyTree).map(([faculte, depts]) => {
                        const fKey = `f_${faculte}`;
                        const fExpanded = expandedPromotions[fKey];
                        return (
                          <div key={fKey} className="rounded-lg overflow-hidden" style={{ backgroundColor: "#232323" }}>
                            <button onClick={() => toggle(fKey)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#2d2d2d] transition-colors text-left">
                              {fExpanded ? <ChevronDown className="w-4 h-4 text-blue-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                              <span className="text-blue-300 font-bold text-base">🏛 {faculte}</span>
                            </button>
                            {fExpanded && (
                              <div className="pl-4 pb-2 space-y-1">
                                {Object.entries(depts).map(([dept, deptContent]) => {
                                  const dKey = `d_${faculte}_${dept}`;
                                  const dExpanded = expandedPromotions[dKey];
                                  return (
                                    <div key={dKey} className="rounded-lg overflow-hidden" style={{ backgroundColor: "#2a2a2a" }}>
                                      <button onClick={() => toggle(dKey)} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#343434] transition-colors text-left">
                                        {dExpanded ? <ChevronDown className="w-4 h-4 text-purple-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-purple-400 flex-shrink-0" />}
                                        <span className="text-purple-300 font-semibold text-sm">📂 {dept}</span>
                                      </button>
                                      {dExpanded && (
                                        <div className="pl-4 pb-2 space-y-1">
                                          {Object.entries(deptContent).map(([nodeKey, nodeVal]) => {
                                            if (nodeVal && nodeVal._type === "orientation") {
                                              const orKey = `or_${faculte}_${dept}_${nodeVal.label}`;
                                              const orExpanded = expandedPromotions[orKey];
                                              return (
                                                <div key={orKey} className="rounded-lg overflow-hidden" style={{ backgroundColor: "#313131" }}>
                                                  <button onClick={() => toggle(orKey)} className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[#3a3a3a] transition-colors text-left">
                                                    {orExpanded ? <ChevronDown className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />}
                                                    <span className="text-teal-300 font-medium text-sm">🔀 Orientation: {nodeVal.label}</span>
                                                  </button>
                                                  {orExpanded && (
                                                    <div className="pl-4 pb-2 space-y-1">
                                                      {Object.entries(nodeVal.children).map(([childKey, childVal]) => {
                                                        if (childVal && childVal._type === "option") {
                                                          const opKey = `op_${orKey}_${childVal.label}`;
                                                          const opExpanded = expandedPromotions[opKey];
                                                          return (
                                                            <div key={opKey} className="rounded-lg overflow-hidden" style={{ backgroundColor: "#383838" }}>
                                                              <button onClick={() => toggle(opKey)} className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[#404040] transition-colors text-left">
                                                                {opExpanded ? <ChevronDown className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />}
                                                                <span className="text-yellow-300 font-medium text-sm">⚙ Option: {childVal.label}</span>
                                                              </button>
                                                              {opExpanded && (
                                                                <PromotionsList
                                                                  promotions={childVal.promotions}
                                                                  expandedPromotions={expandedPromotions}
                                                                  toggle={toggle}
                                                                  onOpenDayLists={openDayListsDialog}
                                                                  onGenerateWeek={(weekData) => generateWeekStatMutation.mutate(weekData)}
                                                                  generatingWeekKey={generatingWeekKey}
                                                                  deleteStatistiqueMutation={deleteStatistiqueMutation}
                                                                  prefix={opKey}
                                                                />
                                                              )}
                                                            </div>
                                                          );
                                                        }

                                                        const promoName = childKey.replace("__p__", "");
                                                        const pKey = `p_${orKey}_${promoName}`;
                                                        const pExpanded = expandedPromotions[pKey];
                                                        return (
                                                          <PromoItem
                                                            key={pKey}
                                                            promoName={promoName}
                                                            promoData={childVal}
                                                            pKey={pKey}
                                                            pExpanded={pExpanded}
                                                            toggle={toggle}
                                                            onOpenDayLists={openDayListsDialog}
                                                            onGenerateWeek={(weekData) => generateWeekStatMutation.mutate(weekData)}
                                                            generatingWeekKey={generatingWeekKey}
                                                            deleteStatistiqueMutation={deleteStatistiqueMutation}
                                                          />
                                                        );
                                                      })}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            }

                                            if (nodeVal && nodeVal._type === "option") {
                                              const opKey = `op_${faculte}_${dept}_${nodeVal.label}`;
                                              const opExpanded = expandedPromotions[opKey];
                                              return (
                                                <div key={opKey} className="rounded-lg overflow-hidden" style={{ backgroundColor: "#313131" }}>
                                                  <button onClick={() => toggle(opKey)} className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[#3a3a3a] transition-colors text-left">
                                                    {opExpanded ? <ChevronDown className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />}
                                                    <span className="text-yellow-300 font-medium text-sm">⚙ Option: {nodeVal.label}</span>
                                                  </button>
                                                  {opExpanded && (
                                                    <PromotionsList
                                                      promotions={nodeVal.promotions}
                                                      expandedPromotions={expandedPromotions}
                                                      toggle={toggle}
                                                      onOpenDayLists={openDayListsDialog}
                                                      onGenerateWeek={(weekData) => generateWeekStatMutation.mutate(weekData)}
                                                      generatingWeekKey={generatingWeekKey}
                                                      deleteStatistiqueMutation={deleteStatistiqueMutation}
                                                      prefix={opKey}
                                                    />
                                                  )}
                                                </div>
                                              );
                                            }

                                            const promoName = nodeKey.replace("__p__", "");
                                            const pKey = `p_${faculte}_${dept}_${promoName}`;
                                            const pExpanded = expandedPromotions[pKey];
                                            return (
                                              <PromoItem
                                                key={pKey}
                                                promoName={promoName}
                                                promoData={nodeVal}
                                                pKey={pKey}
                                                pExpanded={pExpanded}
                                                toggle={toggle}
                                                onOpenDayLists={openDayListsDialog}
                                                onGenerateWeek={(weekData) => generateWeekStatMutation.mutate(weekData)}
                                                generatingWeekKey={generatingWeekKey}
                                                deleteStatistiqueMutation={deleteStatistiqueMutation}
                                              />
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="general" className="space-y-6">
              <Card style={{ backgroundColor: "#3d3d3d", borderColor: "#2d2d2d" }}>
                <CardContent className="py-12 text-center">
                  <BarChart3 className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">D'autres statistiques seront bientôt disponibles</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <PresenceListsDialog
        open={presenceDialog.open}
        onOpenChange={(open) => setPresenceDialog((prev) => ({ ...prev, open }))}
        title={presenceDialog.title}
        lists={presenceDialog.lists}
      />
    </>
  );
}

