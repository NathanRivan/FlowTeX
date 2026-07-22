-- Personal reference library: one row per source, reusable across every
-- document a user writes (Zotero-style — not embedded per-document).
--
-- No join table linking documents to the references they cite: that set is
-- derived by scanning a document's own content for citation nodes (each
-- stores the reference ids it cites), the same way this app already derives
-- comment threads and \cite/\label validity from document content instead of
-- a side table — see CiteRefValidationPlugin.js. Keeps one fewer table to
-- keep in sync; add a join table later only if querying "which documents
-- cite reference X" server-side becomes a real need.
--
-- Named reference_library, not "references" — REFERENCES is a reserved SQL
-- keyword and would need quoting in every hand-written query.

create table if not exists public.reference_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  authors text,
  year text,
  source text,
  url_doi text,
  type text not null default 'article',
  created_at timestamptz not null default now()
);

create index if not exists reference_library_user_id_idx on public.reference_library(user_id);

alter table public.reference_library enable row level security;

create policy "Users manage their own references"
  on public.reference_library
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
