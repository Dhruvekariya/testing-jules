CREATE OR REPLACE FUNCTION public.get_manager_if_pin_valid(
    p_username TEXT,
    p_pin TEXT
)
RETURNS TABLE(id uuid, username text, plant_id uuid, role public.user_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.plant_id,
    p.role
  FROM
    public.profiles AS p
  WHERE
    p.username = p_username AND p.role = 'manager' AND p.pin = crypt(p_pin, p.pin);
END;
$$;
