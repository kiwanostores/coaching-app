# Architecture

## Principles
- Supabase Postgres is the source of truth; **RLS enforces security**, route guards are UX only.
- Every business row carries `organization_id` (multi-tenant ready; one org used today).
- History is never rewritten: students/classes/sessions are deactivated, not deleted (`ON DELETE RESTRICT`).
- Business logic that must be atomic lives in SQL functions (RPC); the frontend stays thin.

## Relationships
```
organizations ─┬─ organization_members ── profiles (auth.users)   role: teacher | student
               ├─ students (user_id → profiles, null until invite accepted)
               ├─ subjects ─┬─ classes ─┬─ class_enrollments (enrolled_on / left_on = history)
               │            │           ├─ class_schedules   (recurring TEMPLATE only)
               │            │           └─ class_sessions    (ACTUAL occurrences, own date/time snapshot)
               │            └─ chapters ── resources ── resource_shares (class XOR student)
               ├─ attendance_records  (session_id + student_id UNIQUE)
               ├─ assignments ── assignment_targets (per student) ── assignment_submissions ── submission_versions
               │                                                      └── assignment_feedback
               └─ teacher_notes (teacher-only, no student policy)
```

## Key rules and where they are enforced
| Rule | Enforcement |
|---|---|
| One attendance row per student per session | `UNIQUE (session_id, student_id)` |
| Attendance only on conducted sessions, only for students enrolled that date | trigger `check_attendance_valid` |
| Heatmap = conducted sessions only (cancelled/scheduled excluded) | `session_heatmap()` |
| % uses only sessions inside each enrolment window; unmarked reported separately | `attendance_summary()` |
| Schedule edits never change past sessions | sessions snapshot date/time; schedule is a separate table |
| Only targeted students submit | trigger + `submit_assignment()` |
| Teacher notes invisible to students | RLS: no student policy |
| Unshared resources inaccessible | `can_student_access_resource()` in table + storage policies |
| Private files | private buckets, org-prefixed paths, storage policies, signed URLs |

## Decisions to review
- Assignment statuses Open/Overdue/Submitted/Under Review/Reviewed are **derived** (`assignment_student_status` view); only Draft/Published are stored.
- First submission after the due date is allowed (shown late); replacement only before the due date.
- Deactivated students lose portal access but keep every record.
- Known hardening gap: cross-row `organization_id` consistency (e.g. a class from another org referenced in an assignment) is not yet enforced by composite foreign keys. Planned for Phase 6.

## Folder structure
```
supabase/migrations/   0001 schema · 0002 security+functions · 0003 storage
supabase/functions/    invite-student (service-role, server-side only)
src/app/               routes
src/components/ui|layout  reusable primitives, app shell
src/features/<area>/   hooks + data access per feature (auth, dashboard, …)
src/pages/             route-level screens
src/lib|config/        supabase client, utils, brand placeholder
```

## Plan
1 Foundation (this commit) → 2 Teacher mgmt + attendance → 3 Assignments → 4 Resources → 5 Student portal → 6 QA/security/deploy.
