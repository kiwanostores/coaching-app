-- 0002_security_and_functions.sql : helpers, signup hooks, RLS, RPCs, views.
-- NOTE: written without a live Postgres in the authoring sandbox. Run it on a fresh Supabase
-- project and run supabase/tests/rls.sql (Phase 6) before trusting it.

-- HELPERS (SECURITY DEFINER so policies can use them without recursive RLS) -------------
create or replace function is_org_teacher(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from organization_members m
                 where m.organization_id = org and m.user_id = auth.uid()
                   and m.role = 'teacher' and m.status = 'active');
$$;

create or replace function my_student_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from students where user_id = auth.uid() and status = 'active';
$$;

create or replace function my_class_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select e.class_id from class_enrollments e where e.student_id in (select my_student_ids());
$$;

create or replace function shares_org_as_teacher(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from organization_members t
                 join organization_members m on m.organization_id = t.organization_id
                 where t.user_id = auth.uid() and t.role = 'teacher' and t.status = 'active'
                   and m.user_id = uid);
$$;

create or replace function safe_uuid(v text) returns uuid language plpgsql immutable as $$
begin return v::uuid; exception when others then return null; end $$;

-- Student may read a resource only if it is shared AND targeted at them or an active enrolment.
create or replace function can_student_access_resource(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from resources r
    join resource_shares s on s.resource_id = r.id
    where r.id = rid and r.visibility = 'shared'
      and ( s.student_id in (select my_student_ids())
         or s.class_id in (select e.class_id from class_enrollments e
                           where e.student_id in (select my_student_ids()) and e.left_on is null))
  );
$$;

-- SIGNUP HOOK: profile + link invited student record by email -----------------------------
-- Requires: public sign-ups DISABLED and email confirmation ON (see docs/SUPABASE_SETUP.md).
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));

  with claimed as (
    update students set user_id = new.id
    where lower(email) = lower(new.email) and user_id is null
    returning organization_id)
  insert into organization_members (organization_id, user_id, role)
  select distinct organization_id, new.id, 'student' from claimed
  on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- First-run: a signed-in user with no memberships creates their organisation and becomes teacher.
create or replace function bootstrap_teacher_org(org_name text default 'My Coaching') returns uuid
language plpgsql security definer set search_path = public as $$
declare oid uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from organization_members where user_id = auth.uid()) then
    raise exception 'User already belongs to an organization';
  end if;
  insert into organizations (name) values (coalesce(nullif(trim(org_name), ''), 'My Coaching')) returning id into oid;
  insert into organization_members (organization_id, user_id, role) values (oid, auth.uid(), 'teacher');
  return oid;
end $$;

-- ROW LEVEL SECURITY ------------------------------------------------------------------------
do $$ declare t text; begin
  foreach t in array array['organizations','profiles','organization_members','students','subjects','classes',
    'class_enrollments','class_schedules','class_sessions','attendance_records','chapters','resources',
    'resource_shares','assignments','assignment_targets','assignment_submissions','submission_versions',
    'assignment_feedback','teacher_notes'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
  -- Teacher: full access inside their own organisation, on every org-scoped table.
  foreach t in array array['students','subjects','classes','class_enrollments','class_schedules','class_sessions',
    'attendance_records','chapters','resources','resource_shares','assignments','assignment_targets',
    'assignment_submissions','submission_versions','assignment_feedback','teacher_notes'] loop
    execute format('create policy teacher_all on %I for all to authenticated
                    using (is_org_teacher(organization_id)) with check (is_org_teacher(organization_id))', t);
  end loop;
end $$;

-- identity tables
create policy org_member_read on organizations for select to authenticated
  using (exists (select 1 from organization_members m where m.organization_id = id and m.user_id = auth.uid()));
create policy org_teacher_update on organizations for update to authenticated
  using (is_org_teacher(id)) with check (is_org_teacher(id));
create policy profile_self_read on profiles for select to authenticated
  using (id = auth.uid() or shares_org_as_teacher(id));
create policy profile_self_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy member_self_read on organization_members for select to authenticated
  using (user_id = auth.uid() or is_org_teacher(organization_id));
create policy member_teacher_write on organization_members for all to authenticated
  using (is_org_teacher(organization_id)) with check (is_org_teacher(organization_id));

-- student read policies (students never get write access except via submit_assignment())
create policy student_read_self on students for select to authenticated
  using (id in (select my_student_ids()));
create policy student_read_classes on classes for select to authenticated
  using (id in (select my_class_ids()));
create policy student_read_subjects on subjects for select to authenticated
  using (id in (select subject_id from classes where id in (select my_class_ids())));
create policy student_read_enrollments on class_enrollments for select to authenticated
  using (student_id in (select my_student_ids()));
create policy student_read_schedules on class_schedules for select to authenticated
  using (class_id in (select my_class_ids()));
create policy student_read_sessions on class_sessions for select to authenticated
  using (class_id in (select my_class_ids()));
create policy student_read_attendance on attendance_records for select to authenticated
  using (student_id in (select my_student_ids()));
create policy student_read_resources on resources for select to authenticated
  using (can_student_access_resource(id));
create policy student_read_chapters on chapters for select to authenticated
  using (exists (select 1 from resources r where r.chapter_id = chapters.id and can_student_access_resource(r.id)));
create policy student_read_assignments on assignments for select to authenticated
  using (status = 'published' and exists (select 1 from assignment_targets t
         where t.assignment_id = assignments.id and t.student_id in (select my_student_ids())));
create policy student_read_targets on assignment_targets for select to authenticated
  using (student_id in (select my_student_ids()));
create policy student_read_submissions on assignment_submissions for select to authenticated
  using (student_id in (select my_student_ids()));
create policy student_read_versions on submission_versions for select to authenticated
  using (submission_id in (select id from assignment_submissions where student_id in (select my_student_ids())));
create policy student_read_feedback on assignment_feedback for select to authenticated
  using (submission_id in (select id from assignment_submissions where student_id in (select my_student_ids())));
-- teacher_notes: deliberately NO student policy => invisible to students.

-- RPCs --------------------------------------------------------------------------------------

-- Student submit / replace: one transaction, all rules in one place.
-- Decision: first submission is allowed after the due date (shown as late); replacement is only
-- allowed before the due date, when the assignment allows it, and before review starts.
create or replace function submit_assignment(p_assignment uuid, p_path text, p_file_name text,
                                             p_mime text, p_size bigint) returns uuid
language plpgsql security definer set search_path = public as $$
declare a assignments%rowtype; sid uuid; stu uuid; sub assignment_submissions%rowtype; v int;
begin
  select id into stu from students s
   where s.user_id = auth.uid() and s.status = 'active'
     and exists (select 1 from assignment_targets t where t.assignment_id = p_assignment and t.student_id = s.id);
  if stu is null then raise exception 'This assignment is not assigned to you'; end if;

  select * into a from assignments where id = p_assignment and status = 'published';
  if not found then raise exception 'Assignment is not available'; end if;
  if p_path not like a.organization_id || '/' || stu || '/' || a.id || '/%' then
    raise exception 'Invalid file path';
  end if;

  select * into sub from assignment_submissions where assignment_id = a.id and student_id = stu for update;
  if found then
    if not a.allow_replacement or now() >= a.due_at or sub.status <> 'submitted' then
      raise exception 'This submission can no longer be replaced';
    end if;
    sid := sub.id;
    update assignment_submissions set submitted_at = now() where id = sid;
  else
    insert into assignment_submissions (organization_id, assignment_id, student_id)
    values (a.organization_id, a.id, stu) returning id into sid;
  end if;

  select coalesce(max(version_no), 0) + 1 into v from submission_versions where submission_id = sid;
  insert into submission_versions (organization_id, submission_id, version_no, storage_path, file_name, mime_type, size_bytes)
  values (a.organization_id, sid, v, p_path, p_file_name, p_mime, p_size);
  return sid;
end $$;

-- Publish: expands "whole class" / "selected students" into assignment_targets atomically.
-- p_student_ids = null  -> every student currently enrolled in the assignment's class.
create or replace function publish_assignment(p_assignment uuid, p_student_ids uuid[] default null) returns void
language plpgsql security invoker set search_path = public as $$
declare a assignments%rowtype;
begin
  select * into a from assignments where id = p_assignment;
  if not found then raise exception 'Assignment not found'; end if;
  insert into assignment_targets (organization_id, assignment_id, student_id)
  select a.organization_id, a.id, e.student_id
    from class_enrollments e join students s on s.id = e.student_id
   where e.class_id = a.class_id and e.left_on is null and s.status = 'active'
     and (p_student_ids is null or e.student_id = any (p_student_ids))
  on conflict do nothing;
  update assignments set status = 'published' where id = p_assignment;
end $$;

-- Bulk attendance save (invoker: RLS + attendance trigger apply). Row = {student_id, status, note}
create or replace function save_attendance(p_session uuid, p_records jsonb) returns int
language plpgsql security invoker set search_path = public as $$
declare org uuid; n int;
begin
  select organization_id into org from class_sessions where id = p_session;
  if org is null then raise exception 'Session not found'; end if;
  insert into attendance_records (organization_id, session_id, student_id, status, note, marked_by)
  select org, p_session, (r->>'student_id')::uuid, (r->>'status')::attendance_status, r->>'note', auth.uid()
    from jsonb_array_elements(p_records) r
  on conflict (session_id, student_id)
  do update set status = excluded.status, note = excluded.note, marked_by = excluded.marked_by;
  get diagnostics n = row_count;
  return n;
end $$;

-- Teaching-activity heatmap: conducted sessions per day. Cancelled/scheduled never count.
-- Invoker: teachers see the org, students only their own classes (RLS).
create or replace function session_heatmap(p_year int, p_class uuid default null)
returns table (day date, conducted bigint)
language sql stable security invoker set search_path = public as $$
  select s.session_date, count(*)
    from class_sessions s
   where s.status = 'conducted'
     and s.session_date >= make_date(p_year, 1, 1) and s.session_date < make_date(p_year + 1, 1, 1)
     and (p_class is null or s.class_id = p_class)
   group by s.session_date order by s.session_date;
$$;

-- Attendance per student per class, counting ONLY conducted sessions inside each enrolment window.
-- pct = present / (present + absent); unmarked is reported separately, never silently counted.
create or replace function attendance_summary(p_from date, p_to date,
                                              p_student uuid default null, p_class uuid default null)
returns table (student_id uuid, class_id uuid, conducted bigint, present bigint, absent bigint,
               unmarked bigint, pct numeric)
language sql stable security invoker set search_path = public as $$
  select e.student_id, e.class_id,
         count(s.id),
         count(a.id) filter (where a.status = 'present'),
         count(a.id) filter (where a.status = 'absent'),
         count(s.id) filter (where a.id is null),
         round(100.0 * count(a.id) filter (where a.status = 'present')
               / nullif(count(a.id), 0), 1)
    from class_enrollments e
    join class_sessions s
      on s.class_id = e.class_id and s.status = 'conducted'
     and s.session_date between greatest(e.enrolled_on, p_from) and least(coalesce(e.left_on, p_to), p_to)
    left join attendance_records a on a.session_id = s.id and a.student_id = e.student_id
   where (p_student is null or e.student_id = p_student)
     and (p_class is null or e.class_id = p_class)
   group by e.student_id, e.class_id;
$$;

create or replace function teacher_dashboard_stats() returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'active_students',   (select count(*) from students where status = 'active'),
    'upcoming_classes',  (select count(*) from class_sessions
                           where status = 'scheduled' and session_date >= current_date
                             and session_date < current_date + 7),
    'conducted_month',   (select count(*) from class_sessions
                           where status = 'conducted' and date_trunc('month', session_date) = date_trunc('month', current_date)),
    'pending_reviews',   (select count(*) from assignment_submissions where status in ('submitted','under_review')),
    'attendance_rate',   (select round(100.0 * sum(present) / nullif(sum(present + absent), 0), 1)
                            from attendance_summary(date_trunc('month', current_date)::date, current_date))
  );
$$;

-- Derived assignment status per student (Open / Submitted / Under Review / Reviewed / Overdue)
create view assignment_student_status with (security_invoker = true) as
select t.assignment_id, t.student_id, a.title, a.class_id, a.due_at,
       case
         when s.status = 'reviewed'     then 'reviewed'
         when s.status = 'under_review' then 'under_review'
         when s.id is not null          then 'submitted'
         when now() > a.due_at          then 'overdue'
         else 'open'
       end as derived_status
  from assignment_targets t
  join assignments a on a.id = t.assignment_id and a.status = 'published'
  left join assignment_submissions s on s.assignment_id = t.assignment_id and s.student_id = t.student_id;

-- Lock down RPCs: only signed-in users may call them.
revoke execute on function bootstrap_teacher_org(text), submit_assignment(uuid, text, text, text, bigint),
  publish_assignment(uuid, uuid[]), save_attendance(uuid, jsonb), session_heatmap(int, uuid),
  attendance_summary(date, date, uuid, uuid), teacher_dashboard_stats() from public, anon;
grant execute on function bootstrap_teacher_org(text), submit_assignment(uuid, text, text, text, bigint),
  publish_assignment(uuid, uuid[]), save_attendance(uuid, jsonb), session_heatmap(int, uuid),
  attendance_summary(date, date, uuid, uuid), teacher_dashboard_stats() to authenticated;
