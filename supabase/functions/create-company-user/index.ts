import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== CREATE COMPANY USER FUNCTION STARTED ===')
    
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader)
    
    if (!authHeader) {
      console.error('Missing authorization header')
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar cliente Supabase com service role para operações admin
    console.log('Creating admin client...')
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Extrair o token JWT do header Authorization
    const token = authHeader.replace('Bearer ', '')
    console.log('Token extracted, length:', token.length)

    // Criar cliente normal para verificar o usuário atual
    console.log('Creating user client...')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Verificar se o usuário atual é admin usando o token
    console.log('Getting current user from JWT...')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError) {
      console.error('Error getting user:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized: ' + userError.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!user) {
      console.error('No user found')
      return new Response(
        JSON.stringify({ error: 'Unauthorized: No user found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Current user ID:', user.id)

    // Verificar se o usuário tem role de admin usando o admin client
    console.log('Checking user role...')
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    console.log('Role data:', roleData)
    console.log('Role error:', roleError)

    if (roleError) {
      console.error('Error fetching role:', roleError)
      return new Response(
        JSON.stringify({ error: 'Error checking permissions: ' + roleError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (roleData?.role !== 'admin') {
      console.error('User is not admin:', { userId: user.id, role: roleData?.role })
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required. Current role: ' + (roleData?.role || 'none') }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User is admin, proceeding...')

    // Obter dados da requisição
    const { email, password, companyId } = await req.json()

    if (!email || !password || !companyId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, companyId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Creating user:', { email, companyId })

    // Criar usuário usando admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User created successfully:', newUser.user.id)

    // Inserir role de company_partner
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'company_partner',
        company_id: companyId,
      })

    if (roleInsertError) {
      console.error('Error inserting role:', roleInsertError)
      // Tentar deletar o usuário se falhar ao criar o role
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return new Response(
        JSON.stringify({ error: 'Failed to assign role to user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Role assigned successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: newUser.user.id, 
          email: newUser.user.email 
        } 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})