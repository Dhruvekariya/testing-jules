import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Clear the session cookie by setting its expiration date to the past
    cookies().set('manager_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      expires: new Date(0),
      path: '/',
    });

    return NextResponse.json({ message: 'Logout successful' }, { status: 200 });

  } catch (e: any)
   {
    console.error('Logout error:', e);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
