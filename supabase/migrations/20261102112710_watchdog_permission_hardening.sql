-- Remove only destructive table privileges from browser-facing roles.
-- Existing SELECT/INSERT/UPDATE/DELETE grants and every business row are retained.
revoke truncate on all tables in schema public from anon, authenticated, public;
alter default privileges in schema public revoke truncate on tables from anon, authenticated, public;
