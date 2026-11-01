-- 0004_phase2_functions.sql : session generation, rescheduling, enrolment, student (de)activation.
-- Authored without a live Postgres: run on a fresh project and verify before relying on it.

-- Create 'scheduled' sessions from a class's recurring schedules. Idempotent; never touches existing rows.
create or replace function generate_sessions(p_class uuid, p_from date, p_to date) returns int
language plpgsql security invoker set search_path = public as $$
declare org uuid; n int;
begin
  select organization_id into org from classes where id = p_class;
  if org is null then raise exception 'Class not found'; end if;
  if p_to < p_from or p_to - p_from > 366 then raise exception 'Choose a range of at most one year'; end if;
  insert into class_sessions (organization_id, class_id, schedule_id, session_date, start_time, end_time)
  select org, p_class, sc.id, d::date, sc.start_time, sc.end_time
    from class_schedules sc
    join classes c on c.id = sc.class_id
    cross join generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') d
   where sc.class_id = p_class
     and extract(dow from d)::int = sc.weekday
     and d::date >= sc.valid_from and (sc.valid_to is null or d::date <= sc.valid_to)
     and d::date >= c.start_date and (c.end_date is null or d::date <= c.end_date)
  on conflict (class_id, session_date, start_time) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- Move a scheduled session: the old row becomes 'rescheduled' (kept for history) and points at the new one.
create or replace function reschedule_session(p_session uuid, p_date date, p_start time, p_end time) returns uuid
language plpgsql security invoker set search_path = public as $$
declare s class_sessions%rowtype; nid uuid;
begin
  select * into s from class_sessions where id = p_session for update;
  if not found then raise exception 'Session not found'; end if;
  if s.status <> 'scheduled' then raise exception 'Only scheduled sessions can be rescheduled'; end if;
  insert into class_sessions (organization_id, class_id, schedule_id, session_date, start_time, end_time, notes)
  values (s.organization_id, s.class_id, s.schedule_id, p_date, p_start, p_end, s.notes)
  returning id into nid;
  update class_sessions set status = 'rescheduled', rescheduled_to = nid where id = p_session;
  return nid;
end $$;

create or replace function enroll_student(p_class uuid, p_student uuid, p_on date default current_date) returns uuid
language plpgsql security invoker set search_path = public as $$
declare c classes%rowtype; s students%rowtype; eid uuid;
begin
  select * into c from classes where id = p_class;
  select * into s from students where id = p_student;
  if c.id is null or s.id is null or c.organization_id <> s.organization_id then
    raise exception 'Class or student not found';
  end if;
  if s.status <> 'active' then raise exception 'Student is deactivated'; end if;
  insert into class_enrollments (organization_id, class_id, student_id, enrolled_on)
  values (c.organization_id, c.id, s.id, p_on) returning id into eid;
  return eid;
end $$;

create or replace function leave_class(p_class uuid, p_student uuid, p_on date default current_date) returns void
language plpgsql security invoker set search_path = public as $$
begin
  update class_enrollments set left_on = greatest(p_on, enrolled_on)
   where class_id = p_class and student_id = p_student and left_on is null;
  if not found then raise exception 'Student is not currently enrolled'; end if;
end $$;

-- Deactivation closes open enrolments (so new sessions stop listing the student) but deletes nothing.
create or replace function set_student_active(p_student uuid, p_active boolean) returns void
language plpgsql security invoker set search_path = public as $$
begin
  update students set status = case when p_active then 'active' else 'inactive' end::record_status where id = p_student;
  if not found then raise exception 'Student not found'; end if;
  if not p_active then
    update class_enrollments set left_on = greatest(current_date, enrolled_on)
     where student_id = p_student and left_on is null;
  end if;
end $$;

-- Individual classes hold one student at a time.
create or replace function check_individual_class() returns trigger language plpgsql as $$
begin
  if new.left_on is null
     and (select class_type from classes where id = new.class_id) = 'individual'
     and exists (select 1 from class_enrollments
                  where class_id = new.class_id and left_on is null and id <> new.id) then
    raise exception 'An individual class can have only one enrolled student';
  end if;
  return new;
end $$;
create trigger trg_individual_class before insert on class_enrollments
  for each row execute function check_individual_class();

revoke execute on function generate_sessions(uuid, date, date), reschedule_session(uuid, date, time, time),
  enroll_student(uuid, uuid, date), leave_class(uuid, uuid, date), set_student_active(uuid, boolean)
  from public, anon;
grant execute on function generate_sessions(uuid, date, date), reschedule_session(uuid, date, time, time),
  enroll_student(uuid, uuid, date), leave_class(uuid, uuid, date), set_student_active(uuid, boolean)
  to authenticated;
