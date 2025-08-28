import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { username, pin } = await req.json();

  if (!username || !pin) {
    return NextResponse.json({ error: 'Username and PIN are required.' }, { status: 400 });
  }

  try {
    // 1. Verify credentials using the database function
    const { data: manager, error: rpcError } = await supabase.rpc('get_manager_if_pin_valid', {
      p_username: username,
      p_pin: pin,
    }).single(); // .single() is important to get a single object or null

    if (rpcError || !manager) {
      return NextResponse.json({ error: 'Invalid username or PIN.' }, { status: 401 });
    }

    // 2. Create the JWT payload
    const payload = {
      id: manager.id,
      plant_id: manager.plant_id,
      role: manager.role,
      username: manager.username,
    };

    // 3. Create the JWT
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is not set.');
    }
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h') // Token expires in 24 hours
      .sign(secret);

    // 4. Set the JWT in a secure, http-only cookie
    cookies().set('manager_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return NextResponse.json({ message: 'Login successful' }, { status: 200 });

  } catch (e: any) {
    console.error('Login error:', e);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
