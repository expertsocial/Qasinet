import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { isAuthorizedAdminEmail } from '@/lib/auth/admin-check'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[Middleware] Missing Supabase configuration')
      return supabaseResponse
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    let user = null
    try {
      const { data } = await supabase.auth.getUser()
      user = data?.user || null
    } catch (userErr) {
      console.warn('[Middleware] auth.getUser warning:', userErr)
    }

    const isAdminPageRoute = request.nextUrl.pathname.startsWith('/admin')
    const isAdminApiRoute = request.nextUrl.pathname.startsWith('/api/admin')

    if (isAdminPageRoute || isAdminApiRoute) {
      if (!user) {
        if (isAdminApiRoute) {
          return NextResponse.json(
            { error: 'Unauthorized: Authentication required' },
            { status: 401 }
          )
        }
        const url = request.nextUrl.clone()
        url.pathname = '/auth/login'
        url.searchParams.set('redirect', request.nextUrl.pathname)
        return NextResponse.redirect(url)
      }

      // Role check: Strictly restricted to authorized qasinetltd.com email
      const isAdmin = isAuthorizedAdminEmail(user.email)

      if (!isAdmin) {
        if (isAdminApiRoute) {
          return NextResponse.json(
            { error: 'Forbidden: Admin access required' },
            { status: 403 }
          )
        }
        // User is logged in but not the authorized admin email: redirect to /dashboard
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }

      // Admin verified - access granted
    }

    return supabaseResponse
  } catch (error) {
    console.error('[Middleware updateSession Fatal Error]:', error)
    return supabaseResponse
  }
}
