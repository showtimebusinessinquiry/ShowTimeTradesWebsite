import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function DELETE(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: userErr } = await adminClient.auth.getUser(token)
  if (userErr || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await adminClient.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('[account/delete]', error)
    return Response.json({ error: 'Failed to delete account. Please contact support.' }, { status: 500 })
  }

  return Response.json({ success: true })
}
