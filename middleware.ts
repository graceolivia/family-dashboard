import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD
  if (!password) return NextResponse.next()

  const auth = request.headers.get('authorization') ?? ''
  if (auth.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6))
      const colonIdx = decoded.indexOf(':')
      const pass = colonIdx >= 0 ? decoded.slice(colonIdx + 1) : decoded
      if (pass === password) return NextResponse.next()
    } catch {
      // malformed credentials — fall through to 401
    }
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Family Dashboard"' },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
