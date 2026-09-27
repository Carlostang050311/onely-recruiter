// GET /api/unsubscribe?t=<token> —— 退订即流失（合规硬要求）
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';
import { allLeads, saveLead, addActivity } from '../../../lib/store';
import { checkLeadToken } from '../../../lib/auth';
import { audit } from '../../../lib/audit';

export const dynamic = 'force-dynamic';

const PAGE_OK = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Unsubscribed</title>
<body style="font-family:sans-serif;background:#151012;color:#f2e8e3;display:grid;place-items:center;height:100vh">
<div style="text-align:center"><h2>You're unsubscribed</h2><p style="color:#b39e98">No further messages will be sent to you. Sorry for the noise.</p></div></body></html>`;
const PAGE_BAD = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Invalid link</title>
<body style="font-family:sans-serif;background:#151012;color:#f2e8e3;display:grid;place-items:center;height:100vh">
<div style="text-align:center"><h2>Invalid unsubscribe link</h2></div></body></html>`;

export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get('t') ?? '';
  const db = getDb();
  let lead = null;
  for (const l of allLeads(db)) {
    if (await checkLeadToken(l.id, t)) {
      lead = l;
      break;
    }
  }
  if (!lead) return new NextResponse(PAGE_BAD, { status: 404, headers: { 'content-type': 'text/html' } });
  if (lead.status !== 'lost') {
    lead.status = 'lost';
    addActivity(lead, 'Unsubscribed via link (auto)');
    saveLead(db, lead);
    audit(db, 'system', 'unsubscribe', lead.id, 'via email footer link');
  }
  return new NextResponse(PAGE_OK, { headers: { 'content-type': 'text/html' } });
}
