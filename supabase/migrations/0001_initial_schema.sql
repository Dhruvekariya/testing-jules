-- Enable the pgcrypto extension for hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create a custom type for user roles
CREATE TYPE public.user_role AS ENUM ('superadmin', 'owner', 'manager');

-- Create the plants table
CREATE TABLE public.plants (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text NOT NULL,
    address text NULL,
    gst_number text NULL,
    bottle_rate numeric NOT NULL DEFAULT 6,
    owner_id uuid NOT NULL,
    CONSTRAINT plants_pkey PRIMARY KEY (id),
    CONSTRAINT plants_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;

-- Create the profiles table to store user data
CREATE TABLE public.profiles (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    full_name text NULL,
    phone_number text NULL,
    plant_id uuid NULL,
    role public.user_role NOT NULL,
    username text NULL,
    pin text NULL, -- Storing hashed PIN for managers
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT profiles_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON DELETE SET NULL,
    CONSTRAINT profiles_username_key UNIQUE (username)
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create the drivers table
CREATE TABLE public.drivers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text NOT NULL,
    plant_id uuid NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    CONSTRAINT drivers_pkey PRIMARY KEY (id),
    CONSTRAINT drivers_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON DELETE CASCADE
);
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Create the bottle_entries table
CREATE TABLE public.bottle_entries (
    id bigserial NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    driver_id uuid NOT NULL,
    manager_id uuid NOT NULL,
    bottle_count integer NOT NULL,
    entry_date date NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT bottle_entries_pkey PRIMARY KEY (id),
    CONSTRAINT bottle_entries_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE RESTRICT,
    CONSTRAINT bottle_entries_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE RESTRICT
);
ALTER TABLE public.bottle_entries ENABLE ROW LEVEL SECURITY;

-- Create the collection_sheets table
CREATE TABLE public.collection_sheets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    plant_id uuid NOT NULL,
    month date NOT NULL,
    is_locked boolean NOT NULL DEFAULT false,
    CONSTRAINT collection_sheets_pkey PRIMARY KEY (id),
    CONSTRAINT collection_sheets_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON DELETE CASCADE,
    CONSTRAINT collection_sheets_plant_id_month_key UNIQUE (plant_id, month)
);
ALTER TABLE public.collection_sheets ENABLE ROW LEVEL SECURITY;

-- Create the collection_entries table
CREATE TABLE public.collection_entries (
    id bigserial NOT NULL,
    sheet_id uuid NOT NULL,
    driver_id uuid NOT NULL,
    previous_month_pending numeric NOT NULL DEFAULT 0,
    total_bottles_delivered integer NOT NULL DEFAULT 0,
    total_amount_due numeric NOT NULL DEFAULT 0,
    amount_paid_cash numeric NOT NULL DEFAULT 0,
    amount_paid_cheque numeric NOT NULL DEFAULT 0,
    amount_paid_upi numeric NOT NULL DEFAULT 0,
    current_month_pending numeric NOT NULL DEFAULT 0,
    CONSTRAINT collection_entries_pkey PRIMARY KEY (id),
    CONSTRAINT collection_entries_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE CASCADE,
    CONSTRAINT collection_entries_sheet_id_fkey FOREIGN KEY (sheet_id) REFERENCES public.collection_sheets(id) ON DELETE CASCADE
);
ALTER TABLE public.collection_entries ENABLE ROW LEVEL SECURITY;

-- Create the subscriptions table
CREATE TABLE public.subscriptions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    plant_id uuid NOT NULL,
    plan_type text NOT NULL,
    start_date timestamp with time zone NOT NULL DEFAULT now(),
    end_date timestamp with time zone NOT NULL,
    status text NOT NULL,
    CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
    CONSTRAINT subscriptions_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id) ON DELETE CASCADE,
    CONSTRAINT subscriptions_plant_id_key UNIQUE (plant_id)
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Function to create a new profile for a new user.
-- The user's full name is passed from the client during sign up in the `options.data` field.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'owner');
  RETURN new;
END;
$$;

-- Trigger to call the function when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RLS POLICIES --

-- Plants Table
CREATE POLICY "Owners can see their own plant" ON public.plants
    FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can update their own plant" ON public.plants
    FOR UPDATE USING (auth.uid() = owner_id);

-- Profiles Table
CREATE POLICY "Users can see their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Owners can see profiles of their plant's managers" ON public.profiles
    FOR SELECT USING (
        (SELECT plant_id FROM public.profiles WHERE id = auth.uid()) = plant_id
    );
CREATE POLICY "Owners can manage managers for their plant" ON public.profiles
    FOR ALL USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' AND
        (SELECT plant_id FROM public.profiles WHERE id = auth.uid()) = plant_id
    );

-- Drivers Table
CREATE POLICY "Users can see drivers of their plant" ON public.drivers
    FOR SELECT USING (
        (SELECT plant_id FROM public.profiles WHERE id = auth.uid()) = plant_id
    );
CREATE POLICY "Owners can manage drivers of their plant" ON public.drivers
    FOR ALL USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner' AND
        (SELECT plant_id FROM public.profiles WHERE id = auth.uid()) = plant_id
    );

-- Note: More specific RLS policies for other tables will be added as features are implemented.
