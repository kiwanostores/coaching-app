# Phase 2 manual test plan (run after applying migrations 0001-0004)

Teacher journey (each step should work end to end):
1. Students > Add student (name, email). Appears in the list; refresh keeps it.
2. Classes > Create class (try both "group" and "individual").
3. Class page > add a weekly schedule, enroll the student.
4. Class page > Generate sessions for the next 4 weeks. Re-run: expect "0 new session(s)" (idempotent).
5. Attendance > pick a day with a session > Mark conducted. The heatmap cell for that day turns on (scheduled/cancelled days stay empty).
6. Mark Present/Absent, "Mark all present", Save attendance. Reload: values persist.
7. Cancel a session: heatmap count drops. Try cancelling a conducted session that has attendance: expect an error.
8. Reschedule a scheduled session: old one shows "rescheduled", a new one exists on the new date.
9. Reports: totals, per-student, per-class, monthly trend; Export CSV opens in a spreadsheet.
10. Student profile: attendance history, enrolment dates, private notes.
11. Deactivate a student: they vanish from new rosters; their old attendance still shows and counts in past reports.

Rules to try to break:
- Individual class: enrolling a second student must fail.
- Same student, same session twice: only one row can exist (upsert).
- Schedule change after sessions exist: old sessions keep their original time.
- A student enrolled mid-month: their % only uses sessions on/after the enrolment date.
