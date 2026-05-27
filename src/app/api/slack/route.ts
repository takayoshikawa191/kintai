import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { kv } from "@vercel/kv";
import {
  AttendanceRecord,
  INITIAL_RECORDS,
  calcBreak,
  calcHours,
  getDayOfWeek,
  normalizeTime,
  timeToMinutes,
} from "@/lib/attendance";

const KV_KEY = "attendance:records";

// ── ローカル開発用インメモリストア（attendance/route.ts と同じパターン）──
let memoryStore: AttendanceRecord[] | null = null;

function getMemoryStore(): AttendanceRecord[] {
  if (memoryStore === null) {
    memoryStore = INITIAL_RECORDS.map((r) => ({ ...r }));
  }
  return memoryStore;
}

// Slack署名検証
function verifySlackSignature(req: NextRequest, body: string): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET ?? "";
  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
  const signature = req.headers.get("x-slack-signature") ?? "";

  // リプレイ攻撃防止（5分以内のリクエストのみ受け付け）
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const sigBase = `v0:${timestamp}:${body}`;
  const mySignature =
    "v0=" + crypto.createHmac("sha256", secret).update(sigBase).digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  );
}

async function getRecords(): Promise<AttendanceRecord[]> {
  try {
    const data = await kv.get<AttendanceRecord[]>(KV_KEY);
    if (data && data.length > 0) return data;
  } catch { /* KV未設定 */ }
  return getMemoryStore();
}

async function saveRecords(records: AttendanceRecord[]) {
  memoryStore = records;
  try {
    await kv.set(KV_KEY, records);
  } catch { /* KV未設定 */ }
}

// タイムスタンプ（Unix秒）→ "HH:MM" 形式
function tsToTime(ts: string): string {
  const date = new Date(Number(ts) * 1000);
  const h = date.getHours();
  const m = date.getMinutes();
  return normalizeTime(`${h}:${m}`);
}

// タイムスタンプ → "YYYY-MM-DD" 形式
function tsToDate(ts: string): string {
  const date = new Date(Number(ts) * 1000);
  return date.toLocaleDateString("sv-SE"); // sv-SE = ISO形式
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Slack URL確認チャレンジ（初回設定時）
  const parsed = JSON.parse(rawBody);
  if (parsed.type === "url_verification") {
    return NextResponse.json({ challenge: parsed.challenge });
  }

  // 署名検証
  if (!verifySlackSignature(req, rawBody)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = parsed.event;
  if (!event || event.type !== "message" || event.subtype) {
    return NextResponse.json({ ok: true });
  }

  // 対象ユーザーのみ処理
  const targetUserId = process.env.TARGET_SLACK_USER_ID ?? "";
  if (event.user !== targetUserId) {
    return NextResponse.json({ ok: true });
  }

  const text: string = event.text ?? "";
  const ts: string = event.ts ?? "";
  const date = tsToDate(ts);
  const time = tsToTime(ts);

  const records = await getRecords();

  // ── 始業時刻の登録 ──
  // #internship_contact の「おはようございます！【本日予定しているタスク】」
  if (text.includes("おはようございます") && text.includes("本日予定しているタスク")) {
    const existing = records.find((r) => r.date === date);
    if (existing) {
      const updated = records.map((r) =>
        r.date === date
          ? { ...r, start: time, source: "slack" as const }
          : r
      );
      await saveRecords(updated);
    } else {
      const newRecord: AttendanceRecord = {
        id: Date.now().toString(),
        date,
        day: getDayOfWeek(date),
        status: "出勤",
        start: time,
        end: "",
        break: "0:00",
        hours: "0:00",
        location: "オフィス",
        source: "slack",
      };
      const updated = [...records, newRecord].sort((a, b) => a.date.localeCompare(b.date));
      await saveRecords(updated);
    }
    return NextResponse.json({ ok: true, action: "start_registered", time });
  }

  // ── 終業時刻の登録 ──
  // #reflection の「【一言】」+ Notionリンク
  if (text.includes("【一言】") && text.includes("notion.so")) {
    const existing = records.find((r) => r.date === date);
    if (existing) {
      const startM = timeToMinutes(existing.start);
      const endM = timeToMinutes(time);
      const rawWork = endM - startM;
      const breakTime = calcBreak(rawWork);
      const hours = calcHours(existing.start, time, breakTime);

      const updated = records.map((r) =>
        r.date === date
          ? { ...r, end: time, break: breakTime, hours, source: "slack" as const }
          : r
      );
      await saveRecords(updated);
    }
    return NextResponse.json({ ok: true, action: "end_registered", time });
  }

  return NextResponse.json({ ok: true });
}
