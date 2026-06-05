import React from "react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DraggableDialog, DraggableDialogBody } from "@/components/ui/DraggableDialog";
import { compareTimeStrings } from "@/lib/presenceListUtils";

function getListKey(list, index = 0) {
  return String(
    list.id ||
      list.calendrier_id ||
      `${list.date || ""}-${list.matiere_id || list.matiere_nom || ""}-${list.professeur_id || ""}-${list.heure_debut || ""}-${index}`
  );
}

function canMergeLists(previous, current) {
  return (
    previous.date === current.date &&
    (previous.matiere_id || previous.matiere_nom) === (current.matiere_id || current.matiere_nom) &&
    (previous.professeur_id || previous.professeur_nom || "") === (current.professeur_id || current.professeur_nom || "")
  );
}

function getEntryStrength(list) {
  return (
    ((list.presences || []).length * 1000) +
    ((list.total_presents || 0) * 100) +
    ((list.total_absents || 0) * 10) +
    (list.total_retards || 0) +
    (list.heure_debut ? 1 : 0) +
    (list.heure_fin ? 1 : 0)
  );
}

function groupLists(sortedLists) {
  return sortedLists.reduce((groups, list, index) => {
    const lastGroup = groups[groups.length - 1];
    const listKey = getListKey(list, index);

    if (lastGroup && canMergeLists(lastGroup.rawEntries[lastGroup.rawEntries.length - 1], list)) {
      lastGroup.rawEntries.push(list);
      lastGroup.heure_debut = lastGroup.heure_debut || list.heure_debut || "";
      lastGroup.heure_fin = list.heure_fin || lastGroup.heure_fin || "";

      const existingIndex = lastGroup.entries.findIndex((entry, entryIndex) => getListKey(entry, entryIndex) === listKey);
      if (existingIndex === -1) {
        lastGroup.entries.push(list);
      } else if (getEntryStrength(list) > getEntryStrength(lastGroup.entries[existingIndex])) {
        lastGroup.entries[existingIndex] = list;
      }

      return groups;
    }

    groups.push({
      id: String(list.id || list.calendrier_id || `course-${index}`),
      matiere_nom: list.matiere_nom || "Cours sans nom",
      heure_debut: list.heure_debut || "",
      heure_fin: list.heure_fin || "",
      rawEntries: [list],
      entries: [list]
    });

    return groups;
  }, []);
}

function dedupePresences(entries) {
  const seen = new Map();

  entries.forEach((entry) => {
    (entry.presences || []).forEach((presence, index) => {
      const key = presence.etudiant_id || `${presence.etudiant_matricule || ""}-${presence.etudiant_nom || ""}-${index}`;
      if (!seen.has(key)) {
        seen.set(key, presence);
      }
    });
  });

  return Array.from(seen.values());
}

const CG = { fontFamily: '"Century Gothic", CenturyGothic, AppleGothic, sans-serif' };

export default function PresenceListsDialog({ open, onOpenChange, title, lists = [] }) {
  const sortedLists = [...lists].sort((a, b) => {
    const dateCompare = String(a.date || "").localeCompare(String(b.date || ""));
    if (dateCompare !== 0) return dateCompare;
    return compareTimeStrings(a.heure_debut, b.heure_debut);
  });

  const groupedLists = groupLists(sortedLists);
  const defaultTab = groupedLists[0]?.id || "course-0";

  return (
    <DraggableDialog
      open={open}
      onOpenChange={onOpenChange}
      title={<h2 className="text-white font-semibold" style={{ ...CG, fontSize: 13 }}>{title}</h2>}
      maxWidth="max-w-6xl"
    >
      <DraggableDialogBody>
        {groupedLists.length === 0 ? (
          <div className="py-10 text-center text-gray-300">Aucune liste de présence disponible.</div>
        ) : (
          <Tabs defaultValue={defaultTab} className="space-y-4">
            <div className="overflow-x-auto pb-2">
              <TabsList className="inline-flex h-auto bg-[#2d2d2d] p-1 gap-1">
                {groupedLists.map((group) => (
                  <TabsTrigger key={group.id} value={group.id} className="min-w-fit whitespace-nowrap px-3 py-2" style={{ ...CG, fontSize: 12, fontWeight: 700 }}>
                    {group.matiere_nom}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {groupedLists.map((group) => {
              const firstEntry = group.entries[0];
              const totalEtudiants = Math.max(...group.entries.map((entry) => entry.total_etudiants || 0), 0);
              const totalPresents = group.entries.reduce((sum, entry) => sum + (entry.total_presents || 0), 0);
              const totalAbsents = group.entries.reduce((sum, entry) => sum + (entry.total_absents || 0), 0);
              const totalRetards = group.entries.reduce((sum, entry) => sum + (entry.total_retards || 0), 0);
              const allPresences = dedupePresences(group.entries);

              return (
                <TabsContent key={group.id} value={group.id} className="mt-0">
                  <div className="rounded-xl border p-4" style={{ backgroundColor: "rgba(45,45,45,0.65)", borderColor: "rgba(255,255,255,0.08)" }}>
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4">
                      <div>
                        <p style={{ ...CG, fontSize: 12, color: '#d1d5db' }}>
                          {firstEntry?.date ? format(parseISO(firstEntry.date), "dd/MM/yyyy") : "Date non renseignée"}
                          {group.heure_debut ? ` • ${group.heure_debut}` : ""}
                          {group.heure_fin ? ` - ${group.heure_fin}` : ""}
                          {` • Prof : ${firstEntry?.professeur_nom || '--'}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-[#3d3d3d] text-white" style={{ ...CG, fontSize: 11 }}>{totalEtudiants} étudiants</Badge>
                        <Badge className="bg-green-600 text-white" style={{ ...CG, fontSize: 11 }}>{totalPresents} présents</Badge>
                        <Badge className="bg-red-600 text-white" style={{ ...CG, fontSize: 11 }}>{totalAbsents} absents</Badge>
                        <Badge className="bg-orange-600 text-white" style={{ ...CG, fontSize: 11 }}>{totalRetards} retards</Badge>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "#4d4d4d" }}>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead style={{ ...CG, fontSize: 11, fontWeight: 700 }}>Étudiant</TableHead>
                             <TableHead style={{ ...CG, fontSize: 11, fontWeight: 700 }}>Matricule</TableHead>
                             <TableHead style={{ ...CG, fontSize: 11, fontWeight: 700 }}>Statut</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allPresences.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-gray-400 py-6">
                                Aucun étudiant enregistré dans cette liste.
                              </TableCell>
                            </TableRow>
                          ) : (
                            allPresences.map((presence, rowIndex) => (
                              <TableRow key={`${group.id}-${presence.etudiant_id || rowIndex}-${rowIndex}`}>
                                <TableCell style={{ ...CG, fontSize: 11, fontWeight: 600, color: 'var(--ha-text)' }}>{presence.etudiant_nom || "—"}</TableCell>
                                 <TableCell style={{ ...CG, fontSize: 10, color: '#9ca3af' }}>{presence.etudiant_matricule || "—"}</TableCell>
                                <TableCell>
                                  <Badge
                                    className={
                                      presence.statut === "present"
                                        ? "bg-green-600 text-white"
                                        : presence.statut === "absent"
                                        ? "bg-red-600 text-white"
                                        : presence.statut === "retard"
                                        ? "bg-orange-600 text-white"
                                        : "bg-[#4d4d4d] text-white"
                                    }
                                    style={{ ...CG, fontSize: 10 }}
                                  >
                                    {presence.statut || "non défini"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </DraggableDialogBody>
    </DraggableDialog>
  );
}