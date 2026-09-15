import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

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

    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

    if (isAdminRoute) {
      if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = '/auth/login'
        url.searchParams.set('redirect', request.nextUrl.pathname)
        return NextResponse.redirect(url)
      }

      // Role check: Check JWT app_metadata, user_metadata, known admin emails, or admin ID
      const isAdmin =
        user.app_metadata?.role === 'ADMIN' ||
        user.app_metadata?.is_admin === true ||
        user.user_metadata?.role === 'ADMIN' ||
        user.user_metadata?.is_admin === true ||
        user.email === 'qasinetltd@gmail.com' ||
        user.email === 'sanaregeorge08@gmail.com' ||
        user.id === '7f4de59c-5754-4ae3-8dfd-3c9f4a4a1f2d'

      if (!isAdmin) {
        let isDbAdmin = false
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (serviceKey) {
          try {
            const adminClient = createSupabaseClient(supabaseUrl, serviceKey, {
              auth: { persistSession: false },
            })
            const { data: adminRecord } = await adminClient
              .from('admins')
              .select('id')
              .eq('id', user.id)
              .maybeSingle()
            if (adminRecord) {
              isDbAdmin = true
            }
          } catch (dbErr) {
            console.warn('[Middleware] DB admin check warning:', dbErr)
          }
        }

        if (!isDbAdmin) {
          // User is logged in but not an admin
          const url = request.nextUrl.clone()
          url.pathname = '/dashboard'
          return NextResponse.redirect(url)
        }
      }

      // Admin verified - access granted
    }

    return supabaseResponse
  } catch (error) {
    console.error('[Middleware updateSession Fatal Error]:', error)
    return supabaseResponse
  }
}
