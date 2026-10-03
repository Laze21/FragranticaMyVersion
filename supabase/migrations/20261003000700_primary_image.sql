-- Stage layers for an image: where the nozzle is, and optionally separate shadow / body / cap
-- renders so the page can lift the cap and spray in 2D. JSON: { nozzle: {x,y}, cap: {x,y,w,h}, shadow, body, capUrl }.
alter table public.fragrance_assets add column if not exists layers jsonb;

-- The one image a fragrance is shown with: a licensed photograph when we have one, otherwise
-- our own labelled illustration. Every page reads this view so the preference lives in one place.
create or replace view public.fragrance_primary_image as
select distinct on (a.fragrance_id)
  a.fragrance_id,
  a.url,
  a.alt,
  a.kind,
  a.credit,
  a.license,
  coalesce(r.source_url, (select r2.source_url from public.fragrance_source_records r2
                           where r2.fragrance_id = a.fragrance_id and r2.field = 'image' and r2.data_source_id = a.data_source_id
                           order by r2.verified_at desc nulls last limit 1)) as source_url,
  a.layers
from public.fragrance_assets a
left join public.fragrance_source_records r on r.id = a.source_record_id
where a.kind in ('photo', 'poster') and a.is_primary and a.status = 'approved'
order by a.fragrance_id, case a.kind when 'photo' then 0 else 1 end;

grant select on public.fragrance_primary_image to anon, authenticated;
