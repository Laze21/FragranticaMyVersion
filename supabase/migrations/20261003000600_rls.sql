-- Row level security.
--
-- The Next.js server talks to Postgres with a privileged connection and enforces
-- authorisation in its data layer. These policies are defence in depth for any direct
-- client access through Supabase (anon / authenticated roles via PostgREST).

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('moderator', 'admin'))
$$;

-- Catalogue & reference data: world-readable, staff-writable.
do $$
declare t text;
begin
  foreach t in array array[
    'brands', 'perfumers', 'notes', 'accords', 'fragrances', 'fragrance_variants',
    'fragrance_perfumers', 'fragrance_notes', 'fragrance_accords', 'fragrance_assets',
    'data_sources', 'wear_contexts', 'fragrance_stats', 'fragrance_search',
    'community_baselines', 'retailer_offers', 'change_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select using (true)', t || '_read', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_moderator()) with check (public.is_moderator())', t || '_staff_write', t);
  end loop;
end
$$;

-- Provenance: public claims are readable; internal ones only by staff.
alter table public.fragrance_source_records enable row level security;
create policy fsr_read on public.fragrance_source_records for select
  using (display_scope = 'public' or public.is_moderator());
create policy fsr_staff on public.fragrance_source_records for all to authenticated
  using (public.is_moderator()) with check (public.is_moderator());

-- Profiles: public unless private; owner can update their own.
alter table public.profiles enable row level security;
create policy profiles_read on public.profiles for select
  using (deleted_at is null and (not is_private or id = auth.uid() or public.is_moderator()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

-- Votes and ratings: aggregate-only reads go through fragrance_stats; individual rows are
-- visible to their owner. Owners manage their own rows.
do $$
declare t text;
begin
  foreach t in array array[
    'ratings', 'perceived_note_votes', 'accord_votes', 'performance_votes',
    'wearability_votes', 'similarity_votes', 'review_votes', 'wear_logs', 'follows'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end
$$;

create policy ratings_own on public.ratings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy pnv_own on public.perceived_note_votes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy av_own on public.accord_votes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy pv_own on public.performance_votes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy wv_own on public.wearability_votes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sv_own on public.similarity_votes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy rv_own on public.review_votes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy wear_logs_own on public.wear_logs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy follows_read on public.follows for select using (true);
create policy follows_own on public.follows for all to authenticated using (follower_id = auth.uid()) with check (follower_id = auth.uid());

alter table public.wear_log_items enable row level security;
create policy wli_own on public.wear_log_items for all to authenticated
  using (exists (select 1 from public.wear_logs w where w.id = wear_log_id and w.user_id = auth.uid()))
  with check (exists (select 1 from public.wear_logs w where w.id = wear_log_id and w.user_id = auth.uid()));

-- Reviews: published ones are public; authors manage their own; staff moderate.
alter table public.reviews enable row level security;
create policy reviews_read on public.reviews for select
  using (status = 'published' or user_id = auth.uid() or public.is_moderator());
create policy reviews_insert on public.reviews for insert to authenticated with check (user_id = auth.uid() and status in ('published', 'pending'));
create policy reviews_update_own on public.reviews for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy reviews_staff on public.reviews for all to authenticated using (public.is_moderator()) with check (public.is_moderator());

alter table public.review_comments enable row level security;
create policy rc_read on public.review_comments for select using (status = 'published' or user_id = auth.uid() or public.is_moderator());
create policy rc_insert on public.review_comments for insert to authenticated with check (user_id = auth.uid());
create policy rc_update_own on public.review_comments for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Collections and lists: public ones readable; owners manage.
alter table public.collections enable row level security;
create policy collections_read on public.collections for select
  using (user_id = auth.uid() or (is_public and exists (select 1 from public.profiles p where p.id = user_id and not p.is_private)));
create policy collections_own on public.collections for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.collection_items enable row level security;
create policy collection_items_read on public.collection_items for select
  using (exists (select 1 from public.collections c join public.profiles p on p.id = c.user_id
                  where c.id = collection_id and (c.user_id = auth.uid() or (c.is_public and not p.is_private))));
create policy collection_items_own on public.collection_items for all to authenticated
  using (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid()));

alter table public.lists enable row level security;
create policy lists_read on public.lists for select using (is_public or user_id = auth.uid());
create policy lists_own on public.lists for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.list_items enable row level security;
create policy list_items_read on public.list_items for select
  using (exists (select 1 from public.lists l where l.id = list_id and (l.is_public or l.user_id = auth.uid())));
create policy list_items_own on public.list_items for all to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()));

-- Contribution & moderation.
alter table public.submissions enable row level security;
create policy submissions_read on public.submissions for select using (user_id = auth.uid() or public.is_moderator());
create policy submissions_insert on public.submissions for insert to authenticated with check (user_id = auth.uid() and status = 'pending');
create policy submissions_staff on public.submissions for update to authenticated using (public.is_moderator()) with check (public.is_moderator());

alter table public.reports enable row level security;
create policy reports_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_staff on public.reports for all to authenticated using (public.is_moderator()) with check (public.is_moderator());

alter table public.moderation_actions enable row level security;
create policy moderation_public_log on public.moderation_actions for select using (is_public or public.is_moderator());
create policy moderation_staff on public.moderation_actions for insert to authenticated with check (public.is_moderator() and moderator_id = auth.uid());
