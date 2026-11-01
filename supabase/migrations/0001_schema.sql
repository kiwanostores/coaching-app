-- 0001_schema.sql : core schema. Every business table carries organization_id (multi-tenant ready).
create extension if not exists pgcrypto;

create type member_role       as enum ('teacher','student');
create type record_status     as enum ('active','inactive');
create type class_type        as enum ('individual','group');
create type session_status    as enum ('scheduled','conducted','cancelled','rescheduled');
create type attendance_status as enum ('present','absent');          -- "not marked" = no row
create type resource_category as enum ('presentation','notes','questions','worksheet','reference','other');
create type resource_visibility as enum ('draft','shared');
create type assignment_status as enum ('draft','published');          -- Open/Overdue/etc. are derived (see 0002 view)
create type submission_status as enum ('submitted','under_review','reviewed');

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ORGANIZATION & USERS ---------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Coaching',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role member_role not null,
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index on organization_members (user_id);

create table students (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete restrict,
  user_id uuid references profiles(id) on delete set null,   -- null until the invite is accepted
  full_name text not null,
  email text not null,
  phone text,
  status record_status not null default 'active',            -- deactivate, never delete
  joined_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index students_org_email_uq on students (organization_id, lower(email));
create unique index students_user_uq on students (user_id) where user_id is not null;

-- CLASSES ----------------------------------------------------------------
create table subjects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table classes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete restrict,
  subject_id uuid references subjects(id) on delete set null,
  name text not null,
  description text,
  class_type class_type not null default 'group',
  start_date date not null default current_date,
  end_date date,
  status record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);
create index on classes (organization_id, status);

-- Enrollment history: leaving sets left_on; rows are never deleted.
create table class_enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete restrict,
  class_id uuid not null references classes(id) on delete restrict,
  student_id uuid not null references students(id) on delete restrict,
  enrolled_on date not null default current_date,
  left_on date,
  created_at timestamptz not null default now(),
  check (left_on is null or left_on >= enrolled_on)
);
create index on class_enrollments (class_id);
create index on class_enrollments (student_id);
-- at most one open enrollment per student per class
create unique index class_enrollments_open_uq on class_enrollments (class_id, student_id) where left_on is null;

-- Recurring templates only. Changing these never touches existing sessions.
create table class_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete restrict,
  class_id uuid not null references classes(id) on delete restrict,
  weekday smallint not null check (weekday between 0 and 6),   -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  valid_from date not null default current_date,
  valid_to date,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index on class_schedules (class_id);

-- Actual occurrences. Date/time are snapshotted here, independent of the schedule.
create table class_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete restrict,
  class_id uuid not null references classes(id) on delete restrict,
  schedule_id uuid references class_schedules(id) on delete set null,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  status session_status not null default 'scheduled',
  rescheduled_to uuid references class_sessions(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  unique (class_id, session_date, start_time)
);
create index on class_sessions (organization_id, session_date);
create index on class_sessions (class_id, session_date);

-- ATTENDANCE -------------------------------------------------------------
create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete restrict,
  session_id uuid not null references class_sessions(id) on delete restrict,
  student_id uuid not null references students(id) on delete restrict,
  status attendance_status not null,
  note text,
  marked_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_one_per_student_session unique (session_id, student_id)
);
create index on attendance_records (student_id);

-- LEARNING MATERIALS -----------------------------------------------------
create table chapters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete restrict,
  subject_id uuid not null references subjects(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  title text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index on chapters (subject_id);

create table resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete restrict,
  chapter_id uuid not null references chapters(id) on delete cascade,
  title text not null,
  description text,
  category resource_category not null default 'other',
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  visibility resource_visibility not null default 'draft',
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on resources (chapter_id);

create table resource_shares (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete restrict,
  resource_id uuid not null references resources(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((class_id is null) <> (student_id is null))          -- exactly one target
);
create unique index resource_shares_class_uq on resource_shares (resource_id, class_id) where class_id is not null;
create unique index resource_shares_student_uq on resource_shares (resource_id, student_id) where student_id is not null;

-- ASSIGNMENTS ------------------------------------------------------------
create table assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete restrict,
  class_id uuid not null references classes(id) on delete restrict,
  subject_id uuid references subjects(id) on delete set null,
  chapter_id uuid references chapters(id) on delete set null,
  title text not null,
  description text,
  instructions text,
  issue_date date not null default current_date,
  due_at timestamptz not null,
  max_marks numeric(6,2),
  attachment_path text,
  allow_replacement boolean not null default true,
  status assignment_status not null default 'draft',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on assignments (class_id, status);

-- Always materialised per student (whole class / selected / individual all become rows).
create table assignment_targets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete restrict,
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references students(id) on delete restrict,
  unique (assignment_id, student_id)
);
create index on assignment_targets (student_id);

create table assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete restrict,
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references students(id) on delete restrict,
  status submission_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  marks numeric(6,2),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create table submission_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete restrict,
  submission_id uuid not null references assignment_submissions(id) on delete cascade,
  version_no int not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_at timestamptz not null default now(),
  unique (submission_id, version_no)
);

create table assignment_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete restrict,
  submission_id uuid not null references assignment_submissions(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

-- TEACHER-ONLY DATA ------------------------------------------------------
create table teacher_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete restrict,
  student_id uuid not null references students(id) on delete restrict,
  author_id uuid references profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on teacher_notes (student_id);

-- updated_at triggers
do $$ declare t text; begin
  foreach t in array array['organizations','profiles','students','classes','class_sessions','attendance_records',
                           'resources','assignments','assignment_submissions','teacher_notes'] loop
    execute format('create trigger trg_%I_updated before update on %I for each row execute function set_updated_at()', t, t);
  end loop; end $$;

-- INTEGRITY TRIGGERS -----------------------------------------------------
-- Attendance only for conducted sessions, and only for students enrolled on that date.
create or replace function check_attendance_valid() returns trigger language plpgsql as $$
declare s class_sessions%rowtype;
begin
  select * into s from class_sessions where id = new.session_id;
  if s.status <> 'conducted' then
    raise exception 'Attendance can only be recorded for conducted sessions';
  end if;
  if new.organization_id <> s.organization_id then
    raise exception 'Organization mismatch';
  end if;
  if not exists (select 1 from class_enrollments e
                 where e.class_id = s.class_id and e.student_id = new.student_id
                   and e.enrolled_on <= s.session_date
                   and (e.left_on is null or e.left_on >= s.session_date)) then
    raise exception 'Student was not enrolled in this class on the session date';
  end if;
  return new;
end $$;
create trigger trg_attendance_valid before insert or update on attendance_records
  for each row execute function check_attendance_valid();

-- A conducted session that has attendance cannot silently become cancelled.
create or replace function protect_session_status() returns trigger language plpgsql as $$
begin
  if old.status = 'conducted' and new.status <> 'conducted'
     and exists (select 1 from attendance_records where session_id = old.id) then
    raise exception 'Clear attendance before changing a conducted session';
  end if;
  return new;
end $$;
create trigger trg_session_protect before update on class_sessions
  for each row execute function protect_session_status();

-- Only targeted students may have a submission.
create or replace function check_submission_valid() returns trigger language plpgsql as $$
begin
  if not exists (select 1 from assignment_targets t
                 where t.assignment_id = new.assignment_id and t.student_id = new.student_id) then
    raise exception 'This assignment is not assigned to the student';
  end if;
  return new;
end $$;
create trigger trg_submission_valid before insert on assignment_submissions
  for each row execute function check_submission_valid();
