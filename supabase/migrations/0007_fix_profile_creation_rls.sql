-- Drop the old, incorrect policy that was blocking new user profile creation.
-- The original "FOR ALL" policy was too restrictive for the signup trigger.
DROP POLICY IF EXISTS "Owners can manage managers for their plant" ON public.profiles;

-- Add a new policy to allow users to insert their own profile.
-- This is required for the `handle_new_user` trigger to function correctly after signup.
-- Note: The `handle_new_user` function runs as SECURITY DEFINER, which should bypass RLS.
-- However, adding this explicit policy is safer and clearer.
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Add a policy to allow owners to create manager profiles for their plant.
-- This is more specific and secure than the previous "FOR ALL" policy.
CREATE POLICY "Owners can create managers for their plant"
  ON public.profiles FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' AND
    (SELECT plant_id FROM public.profiles WHERE id = auth.uid()) = plant_id AND
    role = 'manager'
  );

-- Add a policy that allows owners to view, update, and delete managers in their plant.
-- This is separate from the insert policy for clarity and correctness.
CREATE POLICY "Owners can manage managers in their plant"
  ON public.profiles FOR SELECT, UPDATE, DELETE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' AND
    (SELECT plant_id FROM public.profiles WHERE id = auth.uid()) = plant_id
  );
