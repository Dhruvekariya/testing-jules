CREATE OR REPLACE FUNCTION public.create_manager(
    manager_username TEXT,
    manager_pin TEXT
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID := auth.uid();
  caller_role public.user_role;
  owner_plant_id UUID;
  new_manager_profile public.profiles;
BEGIN
  -- 1. Check if the caller is an owner and has a plant
  SELECT role, plant_id INTO caller_role, owner_plant_id
  FROM public.profiles
  WHERE id = caller_id;

  IF caller_role IS NULL OR caller_role != 'owner' THEN
    RAISE EXCEPTION 'Permission denied: You must be an owner to create a manager.';
  END IF;

  IF owner_plant_id IS NULL THEN
    RAISE EXCEPTION 'Action failed: You must be associated with a plant to create a manager.';
  END IF;

  -- 2. Insert the new manager with a hashed PIN
  INSERT INTO public.profiles (username, pin, role, plant_id)
  VALUES (
    manager_username,
    crypt(manager_pin, gen_salt('bf')), -- Hash the PIN using bcrypt
    'manager',
    owner_plant_id
  ) RETURNING * INTO new_manager_profile;

  RETURN new_manager_profile;
END;
$$;
