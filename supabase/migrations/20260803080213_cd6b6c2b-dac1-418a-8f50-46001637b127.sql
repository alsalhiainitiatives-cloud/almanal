UPDATE public.site_content 
SET data = jsonb_set(
  jsonb_set(data, '{brand,name}', '"\n"'),
  '{brand,organization}', '"\n"'
)
WHERE key = 'site';