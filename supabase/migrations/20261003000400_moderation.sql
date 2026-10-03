-- Contribution & moderation: submissions, change history, reports.

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in (
    'new_fragrance', 'correction', 'new_concentration', 'perfumer_attribution',
    'official_notes', 'image', 'new_brand', 'merge_duplicate'
  )),
  target_fragrance_id uuid references public.fragrances (id) on delete set null,
  payload jsonb not null,                -- the proposed values
  source_url text,                       -- required for official claims (enforced in app)
  evidence_url text,
  attestation boolean not null default false,  -- "not copied from another database"
  status text not null default 'pending'
    check (status in ('pending', 'needs_info', 'approved', 'rejected', 'merged')),
  duplicate_of uuid references public.fragrances (id) on delete set null,
  reviewer_id uuid references public.profiles (id),
  reviewer_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index submissions_status on public.submissions (status, created_at);

alter table public.fragrance_source_records
  add constraint fsr_submission_fk foreign key (submission_id) references public.submissions (id) on delete set null;

-- Append-only history of catalogue edits. Public: transparency is a feature.
create table public.change_log (
  id bigint generated always as identity primary key,
  entity_type text not null check (entity_type in ('fragrance', 'brand', 'perfumer', 'note', 'asset', 'review')),
  entity_id uuid not null,
  field text not null,
  old_value jsonb,
  new_value jsonb,
  changed_by uuid references public.profiles (id),
  submission_id uuid references public.submissions (id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);
create index change_log_entity on public.change_log (entity_type, entity_id, created_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type text not null check (target_type in ('review', 'comment', 'profile', 'list', 'asset', 'fragrance')),
  target_id uuid not null,
  reason text not null check (reason in ('spam', 'abuse', 'off_topic', 'undisclosed_promotion', 'copied_content', 'wrong_data', 'other')),
  details text,
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  handled_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
create index reports_open on public.reports (status, created_at);

create table public.moderation_actions (
  id bigint generated always as identity primary key,
  moderator_id uuid not null references public.profiles (id),
  action text not null check (action in ('hide', 'restore', 'delete', 'approve', 'reject', 'merge', 'warn', 'suspend')),
  target_type text not null,
  target_id uuid not null,
  reason text,
  report_id uuid references public.reports (id) on delete set null,
  submission_id uuid references public.submissions (id) on delete set null,
  is_public boolean not null default true,   -- appears in the public moderation log
  created_at timestamptz not null default now()
);
