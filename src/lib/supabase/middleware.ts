import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth')
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

  if (isAdminRoute) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }

    // Role check
    const { data: adminCheck } = await supabase
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!adminCheck) {
      // User is logged in but not an admin
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // MFA / AAL2 Check
    const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    
    // If not AAL2 and not already on MFA page, redirect to setup/verify
    if (mfaData?.currentLevel !== 'aal2' && !request.nextUrl.pathname.startsWith('/admin/mfa')) {
      // Check if they have enrolled factors to decide between verify or setup
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totpFactor = factors?.totp.find((f) => f.status === 'verified')

      const url = request.nextUrl.clone()
      if (totpFactor) {
        url.pathname = '/admin/mfa/verify'
      } else {
        url.pathname = '/admin/mfa/setup'
      }
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
