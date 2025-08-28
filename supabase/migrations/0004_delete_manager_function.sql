CREATE OR REPLACE FUNCTION public.delete_manager(
    manager_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID := auth.uid();
  caller_plant_id UUID;
  manager_plant_id UUID;
  deleted_id UUID;
BEGIN
  -- 1. Verify the caller is an owner of a plant
  SELECT plant_id INTO caller_plant_id
  FROM public.profiles
  WHERE id = caller_id AND role = 'owner';

  IF caller_plant_id IS NULL THEN
    RAISE EXCEPTION 'Permission denied: You are not an owner.';
  END IF;

  -- 2. Verify the manager belongs to the owner's plant
  SELECT plant_id INTO manager_plant_id
  FROM public.profiles
  WHERE id = manager_id AND role = 'manager';

  IF manager_plant_id IS NULL THEN
    RAISE EXCEPTION 'Manager not found.';
  END IF;

  IF caller_plant_id != manager_plant_id THEN
    RAISE EXCEPTION 'Permission denied: You can only delete managers in your own plant.';
  END IF;

  -- 3. Perform the delete
  DELETE FROM public.profiles
  WHERE id = manager_id
  RETURNING id INTO deleted_id;

  RETURN deleted_id;
END;
$$;
