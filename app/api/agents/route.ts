import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('[GET /api/agents]', err)
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('agents')
      .insert({
        name: body.name,
        geography: 'UAE',
        instructions: body.instructions,
        criteria: body.criteria,
        data_sources: body.data_sources,
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[POST /api/agents]', err)
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 })
  }
}