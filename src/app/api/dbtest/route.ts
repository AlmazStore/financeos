import { NextResponse } from "next/server";
import { Client } from "pg";

const regions = [
  "us-east-1", "us-west-1", "sa-east-1",
  "eu-west-1", "eu-west-2", "eu-central-1",
  "ap-southeast-1", "ap-northeast-1",
];

async function testRegion(region: string, password: string) {
  const hosts = [
    { host: `aws-0-${region}.pooler.supabase.com`, port: 5432, user: "postgres.fmzgvskujwiewebnbdbe" },
    { host: `aws-0-${region}.pooler.supabase.com`, port: 6543, user: "postgres.fmzgvskujwiewebnbdbe" },
  ];
  const results = [];
  for (const h of hosts) {
    const client = new Client({
      host: h.host, port: h.port, user: h.user,
      password, database: "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });
    try {
      await client.connect();
      await client.end();
      results.push({ ...h, status: "OK" });
    } catch (e: unknown) {
      results.push({ ...h, status: e instanceof Error ? e.message.slice(0, 120) : String(e) });
    }
  }
  return results;
}

export async function GET() {
  const pw = "yK3EzFV1V48Pw17s";
  const results = await Promise.all(regions.map(r => testRegion(r, pw)));
  return NextResponse.json(
    regions.reduce((acc, r, i) => { acc[r] = results[i]; return acc; }, {} as Record<string, unknown>),
    { status: 200 }
  );
}
