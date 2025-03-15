import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  // Optional: Check session and handle authentication
  // const { data: { session } } = await supabase.auth.getSession();
  
  return res;
}

// Optional: Configure which paths the middleware runs on
// export const config = {
//   matcher: ['/api/:path*'],
// }; 