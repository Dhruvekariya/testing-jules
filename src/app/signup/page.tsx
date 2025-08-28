"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [plantName, setPlantName] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    // 1. Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("An unexpected error occurred during sign up.");
      setLoading(false);
      return;
    }

    // 2. Create the plant record
    const { data: plantData, error: plantError } = await supabase
      .from('plants')
      .insert({
        name: plantName,
        address: address,
        gst_number: gstNumber || null,
        owner_id: authData.user.id,
      })
      .select('id')
      .single();

    if (plantError) {
      setError(`Error creating plant: ${plantError.message}`);
      // Note: In a real app, you might want to handle this more gracefully,
      // perhaps by deleting the created user or having a cleanup process.
      setLoading(false);
      return;
    }

    // 3. Update the user's profile with the new plant_id
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ plant_id: plantData.id })
      .eq('id', authData.user.id);

    if (profileError) {
      setError(`Error updating profile: ${profileError.message}`);
      setLoading(false);
      return;
    }

    setMessage("Signup successful! Please check your email to verify your account.");
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Create your owner account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSignup}>
            <InputField id="fullName" label="Full Name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <InputField id="plantName" label="Plant Name" type="text" value={plantName} onChange={(e) => setPlantName(e.target.value)} required />
            <InputField id="email" label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <InputField id="password" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <InputField id="address" label="Address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} required />
            <InputField id="gstNumber" label="GST Number (Optional)" type="text" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </form>

          {message && <p className="mt-4 text-center text-sm text-green-600">{message}</p>}
          {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">
                  Already have an account?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link href="/login" className="flex w-full justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple InputField component to reduce repetition
function InputField({ id, label, type, value, onChange, required = false }: { id: string, label: string, type: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, required?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium leading-6 text-gray-900">
        {label}
      </label>
      <div className="mt-2">
        <input
          id={id}
          name={id}
          type={type}
          autoComplete={id}
          required={required}
          value={value}
          onChange={onChange}
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        />
      </div>
    </div>
  );
}
