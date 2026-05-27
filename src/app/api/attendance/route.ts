import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import {
  AttendanceRecord,
  INITIAL_RECORDS,
  calcBreak,
  calcHours,
  getDayOfWeek,
  timeToMinutes,
} from "@/lib/attendance";

const KV_KEY = "attendance:records";

// ── ローカル開発用インメモリストア ──
// KV未設定（ローカル開発）の場合に、サーバープロセスが生きている間は
// 変更内容をメモリで保持する。KVが設定されている場合はKVを優先する。
let memoryStore: AttendanceRecord[] | null = null;

function getMemoryStore(): AttendanceRecord[] {
  if (memoryStore === null) {
    // INITIAL_RECORDSのディープコピーで初期化（元データを変更しない）
    memoryStore = INITIAL_RECORDS.map((r) => ({ ...r }));
  }
  return memoryStore;
}

async function getRecords(): Promise<AttendanceRecord[]> {
  try {
    const data = await kv.get<AttendanceRecord[]>(KV_KEY);
    if (data && data.length > 0) return data;
  } catch {
    // KV未設定の場合はメモリストアにフォールバック
  }
  return getMemoryStore();
}

async function saveRecords(records: AttendanceRecord[]) {
  // 常にメモリストアを更新（KV失敗時のフォールバック）
  memoryStore = records;
  try {
    await kv.set(KV_KEY, records);
  } catch {
    // KV未設定時はメモリのみで保存（ローカル開発用）
  }
}

// GET: 全レコード取得
export async function GET() {
  try {
    const records = await getRecords();
    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: "レコードの取得に失敗しました" }, { status: 500 });
  }
}

// POST: 新規登録
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const records = await getRecords();

    const startM = timeToMinutes(body.start);
    const endM = timeToMinutes(body.end);
    const rawWork = endM - startM;
    const breakTime = calcBreak(rawWork);
    const hours = calcHours(body.start, body.end, breakTime);

    const newRecord: AttendanceRecord = {
      id: Date.now().toString(),
      date: body.date,
      day: getDayOfWeek(body.date),
      status: body.status ?? "出勤",
      start: body.start,
      end: body.end,
      break: breakTime,
      hours,
      location: body.location ?? "オフィス",
      source: body.source ?? "manual",
    };

    const updated = [...records, newRecord].sort((a, b) => a.date.localeCompare(b.date));
    await saveRecords(updated);
    return NextResponse.json(newRecord, { status: 201 });
  } catch {
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
}

// PUT: 更新
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const records = await getRecords();

    const startM = timeToMinutes(body.start);
    const endM = timeToMinutes(body.end);
    const rawWork = endM - startM;
    const breakTime = calcBreak(rawWork);
    const hours = calcHours(body.start, body.end, breakTime);

    const updated = records.map((r) =>
      r.id === body.id
        ? { ...r, ...body, break: breakTime, hours, day: getDayOfWeek(body.date) }
        : r
    );
    await saveRecords(updated);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

// DELETE: 削除
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    const records = await getRecords();
    await saveRecords(records.filter((r) => r.id !== id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
