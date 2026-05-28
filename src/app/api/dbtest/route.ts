import { NextResponse } from "next/server";
import { Client } from "pg";

async function testConn(host: string, port: number, user: string, password: string) {
  const client = new Client({
    host, port, user, password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 6000,
  });
  try {
    await client.connect();
    const res = await client.query("SELECT 1 as ok");
    await client.end();
    return { status: "OK", rows: res.rows[0] };
  } catch (e: unknown) {
    return { status: e instanceof Error ? e.message.slice(0, 150) : String(e) };
  }
}

export async function GET() {
  const pw = "yK3EzFV1V48Pw17s";
  const proj = "fmzgvskujwiewebnbdbe";

  const tests = [
    // Old-style pgBouncer directly on project host
    testConn(`db.${proj}.supabase.co`, 6543, "postgres", pw),
    // New Supavisor pooler
    testConn(`aws-0-us-east-1.pooler.supabase.com`, 5432, `postgres.${proj}`, pw),
    testConn(`aws-0-us-east-1.pooler.supabase.com`, 6543, `postgres.${proj}`, pw),
    testConn(`aws-0-us-west-1.pooler.supabase.com`, 5432, `postgres.${proj}`, pw),
    testConn(`aws-0-eu-west-2.pooler.supabase.com`, 5432, `postgres.${proj}`, pw),
    // Direct connection (IPv6 - likely to fail)
    testConn(`db.${proj}.supabase.co`, 5432, "postgres", pw),
  ];

  const labels = [
    "direct:6543(pgBouncer)",
    "us-east-1:5432",
    "us-east-1:6543",
    "us-west-1:5432",
    "eu-west-2:5432",
    "direct:5432(IPv6)",
  ];

  const results = await Promise.all(tests);
  const out: Record<string, unknown> = {};
  labels.forEach((l, i) => { out[l] = results[i]; });
  return NextResponse.json(out, { status: 200 });
}
