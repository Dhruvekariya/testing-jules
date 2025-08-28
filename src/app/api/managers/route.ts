import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = createClient();

  // 1. Check if the user is authenticated.
  // The RLS policies and DB function will do the fine-grained role checks.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in to create a manager.' }, { status: 401 });
  }

  // 2. Parse the request body
  const { username, pin } = await req.json();

  // 3. Validate the input
  if (!username || !pin) {
    return NextResponse.json({ error: 'Username and PIN are required.' }, { status: 400 });
  }
  if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be a 6-digit string.' }, { status: 400 });
  }

  try {
    // 4. Call the secure database function
    const { data, error } = await supabase.rpc('create_manager', {
      manager_username: username,
      manager_pin: pin,
    });

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') { // unique_violation
        return NextResponse.json({ error: 'This username is already taken.' }, { status: 409 }); // 409 Conflict
      }
      // The error from the DB function will be passed here (e.g., permission denied).
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 5. Return the newly created manager's profile (without the PIN)
    return NextResponse.json(data, { status: 201 });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Manager ID is required.' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase.rpc('delete_manager', {
      manager_id: id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Manager deleted successfully', id: data }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  }

  const { id, username, pin } = await req.json();

  if (!id) {
    return NextResponse.json({ error: 'Manager ID is required.' }, { status: 400 });
  }

  if (pin && (typeof pin !== 'string' || !/^\d{6}$/.test(pin))) {
      return NextResponse.json({ error: 'If provided, PIN must be a 6-digit string.' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase.rpc('update_manager', {
      manager_id: id,
      new_username: username || null,
      new_pin: pin || null,
    });

    if (error) {
       if (error.code === '23505') { // unique_violation
        return NextResponse.json({ error: 'This username is already taken.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 200 });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
