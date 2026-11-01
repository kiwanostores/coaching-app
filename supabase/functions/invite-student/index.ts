// Edge Function: invite-student. Needs the service-role key, which only exists server-side.
// Deploy: supabase functions deploy invite-student
// Body: { student_id: string }  — the teacher must already have created the students row.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    // Caller-scoped client: RLS decides whether this teacher can see the student row.
    const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { student_id } = await req.json()
    const { data: student, error } = await caller
      .from('students').select('id, email, full_name, organization_id').eq('id', student_id).single()
    if (error || !student) return json({ error: 'Student not found' }, 404)

    const { data: isTeacher } = await caller.from('organization_members')
      .select('id').eq('organization_id', student.organization_id).eq('role', 'teacher').limit(1)
    if (!isTeacher?.length) return json({ error: 'Forbidden' }, 403)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(student.email, {
      data: { full_name: student.full_name },
      redirectTo: `${Deno.env.get('SITE_URL')}/reset-password`,
    })
    if (inviteError) return json({ error: inviteError.message }, 400)
    return json({ ok: true })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
