
CREATE OR REPLACE FUNCTION public.get_migrations_in_period(p_start text, p_end text)
RETURNS TABLE(version text, name text, statements text[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    m.version::text,
    m.name,
    m.statements
  FROM supabase_migrations.schema_migrations m
  WHERE m.version >= replace(replace(replace(p_start, '-', ''), 'T', ''), ':', '')::text
    AND m.version <= replace(replace(replace(p_end, '-', ''), 'T', ''), ':', '')::text
  ORDER BY m.version ASC;
$$;
