begin;

update storage.buckets
set file_size_limit = 26214400
where id = 'phase1-videos';

update storage.buckets
set file_size_limit = 36700160
where id = 'phase2-videos';

commit;
