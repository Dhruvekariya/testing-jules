-- This policy allows a newly authenticated user to insert a plant record for themselves.
-- The `WITH CHECK (auth.uid() = owner_id)` clause ensures that a user can only
-- create a plant where they are the owner, preventing them from creating plants for other users.

CREATE POLICY "Authenticated users can create their own plant" ON public.plants
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);
