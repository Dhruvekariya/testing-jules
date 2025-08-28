CREATE OR REPLACE FUNCTION public.update_manager(
    manager_id UUID,
    new_username TEXT,
    new_pin TEXT
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID := auth.uid();
  caller_plant_id UUID;
  manager_plant_id UUID;
  updated_profile public.profiles;
BEGIN
  -- 1. Get the plant_id of the caller (must be an owner)
  SELECT plant_id INTO caller_plant_id
  FROM public.profiles
  WHERE id = caller_id AND role = 'owner';

  IF caller_plant_id IS NULL THEN
    RAISE EXCEPTION 'Permission denied: You are not an owner or not associated with a plant.';
  END IF;

  -- 2. Get the plant_id of the manager being updated
  SELECT plant_id INTO manager_plant_id
  FROM public.profiles
  WHERE id = manager_id AND role = 'manager';

  IF manager_plant_id IS NULL THEN
    RAISE EXCEPTION 'Manager not found.';
  END IF;

  -- 3. Check if the owner and manager belong to the same plant
  IF caller_plant_id != manager_plant_id THEN
    RAISE EXCEPTION 'Permission denied: You can only edit managers in your own plant.';
  END IF;

  -- 4. Perform the update. Use COALESCE to only update non-null values.
  -- If new_pin is an empty string, we should treat it as null and not update.
  UPDATE public.profiles
  SET
    username = COALESCE(new_username, username),
    pin = COALESCE(crypt(NULLIF(new_pin, ''), gen_salt('bf')), pin)
  WHERE
    id = manager_id
  RETURNING * INTO updated_profile;

  RETURN updated_profile;
END;
$$;
