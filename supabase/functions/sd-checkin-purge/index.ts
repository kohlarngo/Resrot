// ลบทะเบียนผู้เข้าพักที่เก็บครบ 45 วัน (แถวในตาราง sd_checkins + ไฟล์รูปใน bucket sd-checkin)
// เรียกโดย pg_cron ทุกคืน — ยืนยันตัวด้วยหัว x-cron-secret (ตรวจกับ Vault ผ่านฟังก์ชัน sd_cron_ok)
import { createClient } from 'npm:@supabase/supabase-js@2';

const KEEP_DAYS = 45;
const BATCH = 200;

Deno.serve(async (req: Request) => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const ok = await sb.rpc('sd_cron_ok', { p: req.headers.get('x-cron-secret') ?? '' });
  if (ok.error || ok.data !== true) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const cutoff = new Date(Date.now() - KEEP_DAYS * 86400_000).toISOString();
  const { data: rows, error } = await sb.from('sd_checkins').select('id, data').lt('created_at', cutoff).order('created_at').limit(BATCH);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  let deleted = 0, failed = 0, files = 0;
  for (const r of rows ?? []) {
    const paths: string[] = [...(r.data?.guests ?? []).map((g: { photo?: string }) => g.photo), r.data?.signature].filter(Boolean);
    // ลบไฟล์ก่อน — ถ้าลบไฟล์ไม่สำเร็จจะคงแถวไว้ให้ลองใหม่คืนถัดไป (ไม่ทิ้งไฟล์กำพร้า)
    if (paths.length) {
      const rm = await sb.storage.from('sd-checkin').remove(paths);
      if (rm.error) { failed++; continue; }
      files += paths.length;
    }
    const del = await sb.from('sd_checkins').delete().eq('id', r.id);
    if (del.error) failed++; else deleted++;
  }
  return new Response(JSON.stringify({ keepDays: KEEP_DAYS, deleted, files, failed, more: (rows?.length ?? 0) === BATCH }), { headers: { 'Content-Type': 'application/json' } });
});
