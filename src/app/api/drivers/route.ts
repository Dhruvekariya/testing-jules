import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';

// Define the expected payload structure from our JWT
interface ManagerJWTPayload {
  id: string;
  plant_id: string;
  role: 'manager';
  username: string;
}

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get('manager_session');
  if (!cookie) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not set');
    }
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(cookie.value, secret) as { payload: ManagerJWTPayload };

    if (!payload.plant_id) {
        return NextResponse.json({ error: 'Invalid session: plant_id missing.' }, { status: 401 });
    }

    const supabase = createClient();
    const { data: drivers, error } = await supabase
      .from('drivers')
      .select('id, name')
      .eq('plant_id', payload.plant_id)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching drivers:', error);
      return NextResponse.json({ error: 'Failed to fetch drivers.' }, { status: 500 });
    }

    return NextResponse.json(drivers, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }
}
