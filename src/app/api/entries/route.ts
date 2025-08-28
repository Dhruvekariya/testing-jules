import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';

interface ManagerJWTPayload {
  id: string;
  plant_id: string;
}

export async function POST(req: NextRequest) {
  const cookie = req.cookies.get('manager_session');
  if (!cookie) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // 1. Verify session and get manager ID
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(cookie.value, secret) as { payload: ManagerJWTPayload };
    const managerId = payload.id;

    // 2. Get data from request body
    const { driver_id, bottle_count } = await req.json();

    // 3. Validate input
    if (!driver_id || !bottle_count) {
      return NextResponse.json({ error: 'Driver ID and bottle count are required.' }, { status: 400 });
    }
    const count = parseInt(bottle_count, 10);
    if (isNaN(count) || count <= 0) {
      return NextResponse.json({ error: 'Bottle count must be a positive number.' }, { status: 400 });
    }

    // 4. Insert into database
    const supabase = createClient();
    const { data, error } = await supabase
      .from('bottle_entries')
      .insert({
        driver_id: driver_id,
        manager_id: managerId,
        bottle_count: count,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating bottle entry:', error);
      return NextResponse.json({ error: 'Failed to save entry.' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    // Catches JWT errors
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }
}

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get('manager_session');
  if (!cookie) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const driverId = req.nextUrl.searchParams.get('driver_id');
  if (!driverId) return NextResponse.json({ error: 'Driver ID is required.' }, { status: 400 });

  try {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(cookie.value, secret) as { payload: ManagerJWTPayload };
    const managerId = payload.id;

    const supabase = createClient();
    // Get today's date in UTC 'YYYY-MM-DD' format, as Supabase stores dates in UTC.
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('bottle_entries')
      .select('*')
      .eq('manager_id', managerId)
      .eq('driver_id', driverId)
      .eq('entry_date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching last entry:', error);
      return NextResponse.json({ error: 'Failed to fetch last entry.' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ message: 'No entry found for today.' }, { status: 404 });
    }

    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
    const cookie = req.cookies.get('manager_session');
    if (!cookie) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    try {
        if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jose.jwtVerify(cookie.value, secret) as { payload: ManagerJWTPayload };
        const managerId = payload.id;

        const { entry_id, bottle_count } = await req.json();

        if (!entry_id || !bottle_count) {
            return NextResponse.json({ error: 'Entry ID and bottle count are required.' }, { status: 400 });
        }
        const count = parseInt(bottle_count, 10);
        if (isNaN(count) || count <= 0) {
            return NextResponse.json({ error: 'Bottle count must be a positive number.' }, { status: 400 });
        }

        const supabase = createClient();

        // Verify that the entry being updated belongs to the manager making the request
        const { data: existingEntry, error: fetchError } = await supabase
            .from('bottle_entries')
            .select('id, manager_id')
            .eq('id', entry_id)
            .single();

        if (fetchError || !existingEntry) {
            return NextResponse.json({ error: 'Entry not found.' }, { status: 404 });
        }

        if (existingEntry.manager_id !== managerId) {
            return NextResponse.json({ error: 'You are not authorized to edit this entry.' }, { status: 403 });
        }

        // Perform the update
        const { data, error } = await supabase
            .from('bottle_entries')
            .update({ bottle_count: count })
            .eq('id', entry_id)
            .select()
            .single();

        if (error) {
            console.error('Error updating bottle entry:', error);
            return NextResponse.json({ error: 'Failed to update entry.' }, { status: 500 });
        }

        return NextResponse.json(data, { status: 200 });

    } catch (error) {
        return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }
}
