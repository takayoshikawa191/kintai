"use client";

import { useEffect, useState, useMemo } from "react";
import { AttendanceRecord, timeToMinutes, minutesToTime, getDayOfWeek, calcBreak, calcHours } from "@/lib/attendance";

const EMPTY: Partial<AttendanceRecord> = {
  date: "", status: "出勤", start: "", end: "", location: "オフィス",
};

export default function Page() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<AttendanceRecord>>({});
  const [showModal, setShowModal] = useState(false);
  const [newRecord, setNewRecord] = useState<Partial<AttendanceRecord>>(EMPTY);
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  async function load() {
    try {
      const res = await fetch("/api/attendance");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRecords(data);
    } catch (e) {
      console.error("勤怠データの読み込みに失敗しました:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() =>
    records.filter(r => r.date.startsWith(filterMonth)).sort((a, b) => a.date.localeCompare(b.date)),
    [records, filterMonth]
  );

  const totalMins = useMemo(() => filtered.reduce((s, r) => s + timeToMinutes(r.hours), 0), [filtered]);
  const workDays = filtered.filter(r => r.status === "出勤").length;

  async function handleAdd() {
    if (!newRecord.date || !newRecord.start || !newRecord.end) return;
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecord),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNewRecord(EMPTY);
      setShowModal(false);
      await load();
    } catch (e) {
      console.error("登録に失敗しました:", e);
      alert("登録に失敗しました。もう一度お試しください。");
    }
  }

  async function handleSave(id: string) {
    try {
      const res = await fetch("/api/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editData, id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEditingId(null);
      await load();
    } catch (e) {
      console.error("更新に失敗しました:", e);
      alert("更新に失敗しました。もう一度お試しください。");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("この記録を削除しますか？")) return;
    try {
      const res = await fetch("/api/attendance", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e) {
      console.error("削除に失敗しました:", e);
      alert("削除に失敗しました。もう一度お試しください。");
    }
  }

  function handleNewChange(field: string, value: string) {
    setNewRecord(prev => {
      const updated = { ...prev, [field]: value };
      if (field === "date") updated.day = getDayOfWeek(value);
      if (field === "start" || field === "end") {
        const sM = timeToMinutes(updated.start ?? "");
        const eM = timeToMinutes(updated.end ?? "");
        if (sM && eM && eM > sM) {
          const brk = calcBreak(eM - sM);
          updated.break = brk;
          updated.hours = calcHours(updated.start!, updated.end!, brk);
        }
      }
      return updated;
    });
  }

  const s: Record<string, React.CSSProperties> = {
    header: { background: "#0d1117", borderBottom: "1px solid #2d3448", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" },
    cards: { padding: "20px 32px 0", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 },
    card: { background: "#1a1f2e", border: "1px solid #2d3448", borderRadius: 12, padding: "16px 20px" },
    table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
    th: { padding: "12px 14px", textAlign: "left", fontSize: 11, letterSpacing: 1, color: "#64748b", fontWeight: 600 },
    td: { padding: "10px 14px", borderBottom: "1px solid #1e2436" },
    btn: { border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 },
    addBtn: { background: "linear-gradient(135deg,#3b82f6,#2563eb)", border: "none", borderRadius: 8, padding: "8px 18px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" },
    input: { background: "#0d1117", border: "1px solid #2d3448", borderRadius: 6, padding: "4px 8px", color: "#e2e8f0", fontSize: 12, fontFamily: "inherit" },
    select: { background: "#0d1117", border: "1px solid #2d3448", borderRadius: 6, padding: "4px 8px", color: "#e2e8f0", fontSize: 12, fontFamily: "inherit" },
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#60a5fa", marginBottom: 4 }}>ATTENDANCE MANAGEMENT</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>勤怠管理システム</h1>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>吉川 貴之</div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            style={{ background: "#1a1f2e", border: "1px solid #2d3448", borderRadius: 8, padding: "6px 12px", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit" }} />
          <button onClick={() => setShowModal(true)} style={s.addBtn}>＋ 新規登録</button>
        </div>
      </div>

      {/* Summary */}
      <div style={s.cards}>
        {[
          { label: "出勤日数", value: `${workDays}日`, color: "#60a5fa", icon: "📅" },
          { label: "総勤務時間", value: minutesToTime(totalMins), color: "#34d399", icon: "⏱" },
          { label: "休日出勤", value: "0日", color: "#f59e0b", icon: "📋" },
          { label: "有給休暇", value: "0日", color: "#a78bfa", icon: "🌿" },
        ].map(c => (
          <div key={c.label} style={s.card}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{c.icon}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Slack連携ステータス */}
      <div style={{ padding: "16px 32px 0" }}>
        <div style={{ background: "#1a1f2e", border: "1px solid #2d3448", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "#94a3b8" }}>
            <span style={{ color: "#34d399", fontWeight: 600 }}>Slack連携 有効</span>
            &nbsp;—&nbsp;
            <span style={{ color: "#60a5fa" }}>#internship_contact</span> で始業・
            <span style={{ color: "#60a5fa" }}>#reflection</span> で終業を自動記録
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ padding: "20px 32px 40px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>読み込み中...</div>
        ) : (
          <div style={{ background: "#1a1f2e", border: "1px solid #2d3448", borderRadius: 12, overflow: "hidden" }}>
            <table style={s.table}>
              <thead>
                <tr style={{ background: "#151b27", borderBottom: "1px solid #2d3448" }}>
                  {["日付", "曜日", "勤怠", "始業", "終業", "休憩", "勤務時間", "場所", "ソース", "操作"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((rec, i) => {
                  const isEditing = editingId === rec.id;
                  return (
                    <tr key={rec.id} style={{ background: isEditing ? "#1e2d40" : i % 2 === 0 ? "transparent" : "#161c28" }}>
                      {isEditing ? (
                        <>
                          <td style={s.td}><input type="date" value={editData.date} onChange={e => setEditData(p => ({ ...p, date: e.target.value, day: getDayOfWeek(e.target.value) }))} style={s.input} /></td>
                          <td style={{ ...s.td, color: "#94a3b8" }}>{editData.day}</td>
                          <td style={s.td}><select value={editData.status} onChange={e => setEditData(p => ({ ...p, status: e.target.value as AttendanceRecord["status"] }))} style={s.select}><option>出勤</option><option>欠勤</option><option>有給</option></select></td>
                          <td style={s.td}><input type="time" value={editData.start} onChange={e => setEditData(p => ({ ...p, start: e.target.value }))} style={s.input} /></td>
                          <td style={s.td}><input type="time" value={editData.end} onChange={e => setEditData(p => ({ ...p, end: e.target.value }))} style={s.input} /></td>
                          <td style={{ ...s.td, color: "#64748b" }}>{calcBreak(timeToMinutes(editData.end ?? "") - timeToMinutes(editData.start ?? ""))}</td>
                          <td style={{ ...s.td, color: "#34d399", fontWeight: 700 }}>{calcHours(editData.start ?? "", editData.end ?? "", calcBreak(timeToMinutes(editData.end ?? "") - timeToMinutes(editData.start ?? "")))}</td>
                          <td style={s.td}><select value={editData.location} onChange={e => setEditData(p => ({ ...p, location: e.target.value as AttendanceRecord["location"] }))} style={s.select}><option>オフィス</option><option>オンライン</option></select></td>
                          <td style={s.td} />
                          <td style={s.td}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => handleSave(rec.id)} style={{ ...s.btn, background: "#16a34a", color: "#fff" }}>保存</button>
                              <button onClick={() => setEditingId(null)} style={{ ...s.btn, background: "#374151", color: "#9ca3af" }}>戻る</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ ...s.td, color: "#e2e8f0" }}>{rec.date.replace("2026-", "").replace("-", "/")}</td>
                          <td style={s.td}><span style={{ color: rec.day === "土" ? "#60a5fa" : rec.day === "日" ? "#f87171" : "#94a3b8", fontWeight: 600 }}>{rec.day}</span></td>
                          <td style={s.td}><span style={{ background: rec.status === "出勤" ? "#0f2d1a" : "#2d1a1a", color: rec.status === "出勤" ? "#34d399" : "#f87171", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{rec.status}</span></td>
                          <td style={{ ...s.td, fontVariantNumeric: "tabular-nums" }}>{rec.start}</td>
                          <td style={{ ...s.td, fontVariantNumeric: "tabular-nums" }}>{rec.end}</td>
                          <td style={{ ...s.td, color: "#64748b", fontVariantNumeric: "tabular-nums" }}>{rec.break}</td>
                          <td style={{ ...s.td, color: "#34d399", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{rec.hours}</td>
                          <td style={{ ...s.td, color: rec.location === "オンライン" ? "#a78bfa" : "#60a5fa", fontSize: 12 }}>{rec.location}</td>
                          <td style={s.td}><span style={{ fontSize: 10, color: rec.source === "slack" ? "#f59e0b" : "#475569", background: rec.source === "slack" ? "#2d2000" : "#1e2436", borderRadius: 4, padding: "2px 6px" }}>{rec.source === "slack" ? "Slack" : "手動"}</span></td>
                          <td style={s.td}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => { setEditingId(rec.id); setEditData({ ...rec }); }} style={{ ...s.btn, background: "#1e3a5f", color: "#60a5fa" }}>編集</button>
                              <button onClick={() => handleDelete(rec.id)} style={{ ...s.btn, background: "#2d1a1a", color: "#f87171" }}>削除</button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "#151b27", borderTop: "2px solid #2d3448" }}>
                  <td colSpan={6} style={{ ...s.td, fontSize: 12, color: "#64748b", fontWeight: 600 }}>月合計 — 出勤 {workDays}日</td>
                  <td style={{ ...s.td, color: "#34d399", fontWeight: 700, fontSize: 15 }}>{minutesToTime(totalMins)}</td>
                  <td colSpan={3} style={s.td} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#1a1f2e", border: "1px solid #2d3448", borderRadius: 16, padding: 32, width: 440, boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>新規勤怠登録</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[{ label: "日付", field: "date", type: "date" }, { label: "始業時刻", field: "start", type: "time" }, { label: "終業時刻", field: "end", type: "time" }].map(({ label, field, type }) => (
                <div key={field} style={field === "date" ? { gridColumn: "1/-1" } : {}}>
                  <label style={{ display: "block", fontSize: 11, color: "#64748b", marginBottom: 6 }}>{label}</label>
                  <input type={type} value={(newRecord as Record<string, string>)[field] ?? ""} onChange={e => handleNewChange(field, e.target.value)}
                    style={{ width: "100%", background: "#0d1117", border: "1px solid #2d3448", borderRadius: 8, padding: "8px 12px", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit" }} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#64748b", marginBottom: 6 }}>休憩（自動）</label>
                <div style={{ background: "#0d1117", border: "1px solid #2d3448", borderRadius: 8, padding: "8px 12px", color: "#64748b", fontSize: 13 }}>{newRecord.break ?? "0:00"}</div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#64748b", marginBottom: 6 }}>勤務時間（自動）</label>
                <div style={{ background: "#0d1117", border: "1px solid #2d3448", borderRadius: 8, padding: "8px 12px", color: "#34d399", fontSize: 13, fontWeight: 700 }}>{newRecord.hours ?? "0:00"}</div>
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={{ display: "block", fontSize: 11, color: "#64748b", marginBottom: 6 }}>勤務場所</label>
                <select value={newRecord.location} onChange={e => setNewRecord(p => ({ ...p, location: e.target.value as AttendanceRecord["location"] }))}
                  style={{ width: "100%", background: "#0d1117", border: "1px solid #2d3448", borderRadius: 8, padding: "8px 12px", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit" }}>
                  <option>オフィス</option><option>オンライン</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
              <button onClick={() => setShowModal(false)} style={{ background: "#374151", border: "none", borderRadius: 8, padding: "10px 20px", color: "#9ca3af", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>キャンセル</button>
              <button onClick={handleAdd} style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)", border: "none", borderRadius: 8, padding: "10px 20px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>登録する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
