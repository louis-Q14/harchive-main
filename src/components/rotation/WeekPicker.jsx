import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Calendar } from "lucide-react";
import ReactDOM from "react-dom";

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function toWeekStr(monday) {
  const year = monday.getFullYear();
  const week = getISOWeek(monday);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function getMondayFromWeekStr(weekStr) {
  const [yearStr, weekPart] = weekStr.split('-W');
  const year = parseInt(yearStr);
  const week = parseInt(weekPart);
  const jan4 = new Date(year, 0, 4);
  const startOfYear = new Date(jan4);
  startOfYear.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const monday = new Date(startOfYear);
  monday.setDate(startOfYear.getDate() + (week - 1) * 7);
  return monday;
}

const MOIS_LONG = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const JOURS = ["L", "M", "M", "J", "V", "S", "D"];

export default function WeekPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const monday = getMondayFromWeekStr(value);
      return new Date(monday.getFullYear(), monday.getMonth(), 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const selectedMonday = value ? getMondayFromWeekStr(value) : null;

  // Positionner le dropdown sous le trigger
  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 240),
      });
    }
  }, [open]);

  // Fermer si clic dehors
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDay = new Date(firstDay);
  const dow = startDay.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  startDay.setDate(startDay.getDate() + offset);

  const weeks = [];
  let cur = new Date(startDay);
  for (let w = 0; w < 6; w++) {
    const weekDays = [];
    const monday = new Date(cur);
    for (let d = 0; d < 7; d++) {
      weekDays.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    if (monday > lastDay) break;
    weeks.push({ monday, days: weekDays });
  }

  const isSelectedWeek = (monday) => {
    if (!selectedMonday) return false;
    return monday.getTime() === selectedMonday.getTime();
  };

  const isToday = (day) => day.getTime() === today.getTime();

  const handleWeekClick = (monday) => {
    onChange(toWeekStr(monday));
    setOpen(false);
  };

  // Label affiché dans le trigger
  const triggerLabel = () => {
    if (!selectedMonday) return null;
    const dimanche = new Date(selectedMonday);
    dimanche.setDate(selectedMonday.getDate() + 6);
    const fmt = (d) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
    const weekNum = getISOWeek(selectedMonday);
    return `S${weekNum} : ${fmt(selectedMonday)} – ${fmt(dimanche)}`;
  };

  const dropdown = open ? ReactDOM.createPortal(
    <div
      ref={dropdownRef}
      className="rounded-lg border overflow-hidden shadow-xl"
      style={{
        position: 'absolute',
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
        backgroundColor: 'var(--ha-surface2)',
        borderColor: 'var(--ha-border)',
        zIndex: 9999,
      }}
    >
      {/* Header navigation mois */}
      <div className="flex items-center justify-between px-3 py-2" style={{backgroundColor: 'var(--ha-surface2)'}}>
        <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-700 transition-colors">
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>
        <span className="text-white text-sm font-semibold">
          {MOIS_LONG[month]} {year}
        </span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-700 transition-colors">
          <ChevronRight className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Entêtes jours */}
      <div className="grid grid-cols-7 px-2 pt-2 pb-1">
        {JOURS.map((j, i) => (
          <div key={i} className="text-center text-xs font-bold" style={{color: 'var(--ha-text-muted)'}}>{j}</div>
        ))}
      </div>

      {/* Semaines */}
      <div className="px-2 pb-2 space-y-0.5">
        {weeks.map(({ monday, days }, wi) => {
          const selected = isSelectedWeek(monday);
          return (
            <div
              key={wi}
              onClick={() => handleWeekClick(monday)}
              className="grid grid-cols-7 rounded cursor-pointer transition-all"
              style={{ backgroundColor: selected ? '#3b82f6' : 'transparent' }}
              onMouseEnter={e => { if (!selected) e.currentTarget.style.backgroundColor = '#3a3a3a'; }}
              onMouseLeave={e => { if (!selected) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {days.map((day, di) => {
                const inMonth = day.getMonth() === month;
                const isT = isToday(day);
                return (
                  <div
                    key={di}
                    className="text-center py-1 text-xs rounded"
                    style={{
                      color: isT && !selected ? '#60a5fa' : (inMonth ? '#ffffff' : '#555555'),
                      fontWeight: isT ? 'bold' : 'normal',
                    }}
                  >
                    {day.getDate()}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {/* Trigger — identique visuellement à un SelectTrigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-md border text-sm transition-colors"
        style={{
          backgroundColor: 'var(--ha-surface2)',
          color: triggerLabel() ? 'white' : '#b0b0b0',
          borderColor: 'var(--ha-border)',
          minHeight: '36px',
        }}
      >
        <span className="flex items-center gap-2 truncate">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{color: 'var(--ha-text-muted)'}} />
          {triggerLabel() || "Sélectionner"}
        </span>
        <ChevronDown className="w-4 h-4 flex-shrink-0" style={{color: 'var(--ha-text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s'}} />
      </button>

      {dropdown}
    </>
  );
}