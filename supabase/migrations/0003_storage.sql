-- 0003_storage.sql : private buckets, type/size limits, and access policies.
-- Path conventions (first segment is always the organization id):
--   assignment-attachments : {org}/{assignment_id}/{file}
--   submissions            : {org}/{student_id}/{assignment_id}/{file}
--   resources              : {org}/{resource_id}/{file}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
 ('assignment-attachments','assignment-attachments', false, 26214400, array[
   'application/pdf','application/msword',
   'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
   'application/vnd.ms-powerpoint',
   'application/vnd.openxmlformats-officedocument.presentationml.presentation',
   'image/jpeg','image/png','application/zip','application/x-zip-compressed']),
 ('submissions','submissions', false, 26214400, array[
   'application/pdf','application/msword',
   'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
   'application/vnd.ms-powerpoint',
   'application/vnd.openxmlformats-officedocument.presentationml.presentation',
   'image/jpeg','image/png','application/zip','application/x-zip-compressed']),
 ('resources','resources', false, 52428800, array[
   'application/pdf','application/msword',
   'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
   'application/vnd.ms-powerpoint',
   'application/vnd.openxmlformats-officedocument.presentationml.presentation',
   'image/jpeg','image/png','application/zip','application/x-zip-compressed'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit,
                               allowed_mime_types = excluded.allowed_mime_types, public = false;

-- Teachers: full control of files under their own org prefix, in all three buckets.
create policy teacher_files_all on storage.objects for all to authenticated
  using (bucket_id in ('assignment-attachments','submissions','resources')
         and is_org_teacher(safe_uuid(split_part(name, '/', 1))))
  with check (bucket_id in ('assignment-attachments','submissions','resources')
         and is_org_teacher(safe_uuid(split_part(name, '/', 1))));

-- Students upload only into their own submission folder...
create policy student_submission_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'submissions'
    and safe_uuid(split_part(name, '/', 2)) in (select my_student_ids())
    and exists (select 1 from assignment_targets t
                where t.assignment_id = safe_uuid(split_part(name, '/', 3))
                  and t.student_id = safe_uuid(split_part(name, '/', 2))));
-- ...and read only their own files.
create policy student_submission_read on storage.objects for select to authenticated
  using (bucket_id = 'submissions' and safe_uuid(split_part(name, '/', 2)) in (select my_student_ids()));

-- Students read assignment attachments only for published assignments targeted at them.
create policy student_attachment_read on storage.objects for select to authenticated
  using (bucket_id = 'assignment-attachments'
    and exists (select 1 from assignments a join assignment_targets t on t.assignment_id = a.id
                where a.id = safe_uuid(split_part(name, '/', 2)) and a.status = 'published'
                  and t.student_id in (select my_student_ids())));

-- Students read a resource file only if it has been shared with them.
create policy student_resource_read on storage.objects for select to authenticated
  using (bucket_id = 'resources'
    and can_student_access_resource(safe_uuid(split_part(name, '/', 2))));
