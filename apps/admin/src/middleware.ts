import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          request.cookies.set({ name, value })
          response = NextResponse.next({ request })
          response.cookies.set({ name, value, ...options })
        },
        remove: (name: string, options: CookieOptions) => {
          request.cookies.set({ name, value: '' })
          response = NextResponse.next({ request })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const pathname = request.nextUrl.pathname
  const isLoginPage = pathname === '/login'

  // Não autenticado → redireciona para login
  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Autenticado → verifica se é admin
  if (session && !isLoginPage) {
    const role = session.user.user_metadata?.role
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/login?erro=acesso-negado', request.url))
    }
  }

  // Autenticado + tentando ir para login → redireciona para dashboard
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
