import React from "react";
import { format, parseISO } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from "recharts";

function getListKey(list, index) {
  return String(
    list.id ||
      list.calendrier_id ||
      `${list.date || ""}-${list.matiere_id || ""}-${list.professeur_id || ""}-${list.heure_debut || ""}-${index}`
  );
}

function buildChartData(days = {}) {
  return Object.values(days)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((day) => {
      const uniqueLists = [];
      const seen = new Set();

      (day.lists || []).forEach((list, index) => {
        const key = getListKey(list, index);
        if (!seen.has(key)) {
          seen.add(key);
          uniqueLists.push(list);
        }
      });

      const totalPossible = uniqueLists.reduce(
        (sum, list) => sum + ((list.total_etudiants || 0) || 0),
        0
      );
      const totalPresents = uniqueLists.reduce(
        (sum, list) => sum + ((list.total_presents || 0) || 0),
        0
      );
      const totalAbsents = uniqueLists.reduce(
        (sum, list) => sum + ((list.total_absents || 0) || 0),
        0
      );
      const totalRetards = uniqueLists.reduce(
        (sum, list) => sum + ((list.total_retards || 0) || 0),
        0
      );

      const present = totalPossible > 0 ? Math.round((totalPresents / totalPossible) * 100) : 0;
      const absent = totalPossible > 0 ? Math.round((totalAbsents / totalPossible) * 100) : 0;
      const retard = totalPossible > 0 ? Math.round((totalRetards / totalPossible) * 100) : 0;

      return {
        date: day.date,
        label: format(parseISO(day.date), "dd/MM/yyyy"),
        present,
        absent,
        retard,
      };
    });
}

export default function WeeklyPresenceChart({ days = {} }) {
  const data = buildChartData(days);

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border p-2 w-full" style={{ backgroundColor: "#262626", borderColor: "#3f3f3f" }}>
      <div className="h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4} barCategoryGap={8} margin={{ top: 6, right: 6, left: -10, bottom: 4 }}>
            <CartesianGrid stroke="#4d4d4d" vertical={true} horizontal={true} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#ffffff", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide domain={[0, 100]} />
            <Bar dataKey="present" fill="#22c55e" maxBarSize={30}>
              <LabelList dataKey="present" position="insideBottom" fill="#ffffff" fontSize={9} formatter={(value) => `${value || 0}% P`} />
            </Bar>
            <Bar dataKey="absent" fill="#ef4444" maxBarSize={30}>
              <LabelList dataKey="absent" position="insideBottom" fill="#ffffff" fontSize={9} formatter={(value) => `${value || 0}% A`} />
            </Bar>
            <Bar dataKey="retard" fill="#f59e0b" maxBarSize={30}>
              <LabelList dataKey="retard" position="insideBottom" fill="#ffffff" fontSize={9} formatter={(value) => `${value || 0}% R`} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}