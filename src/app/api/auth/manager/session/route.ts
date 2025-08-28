import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';

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
    const { payload } = await jose.jwtVerify(cookie.value, secret);

    // Return the session payload to the client
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    // This will catch expired tokens or invalid signatures
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }
}
