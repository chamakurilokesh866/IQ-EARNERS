-- Run this in Supabase SQL Editor to increase upload limit for 100+ page mock exam PDFs.
-- Default was 50MB; this sets 200MB.
UPDATE storage.buckets
SET file_size_limit = 209715200
WHERE id = 'uploads';
