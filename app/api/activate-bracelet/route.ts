import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { code, nom_profil } = await req.json()

  if (!code) {
    return NextResponse.json({ error: 'Code requis' }, { status: 400 })
  }

  const supabaseUser = await createServerSupabaseClient()
  const { data: { user } } = await supabaseUser.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const normalizedCode = code.toUpperCase().trim()

  const { data: activationCode } = await supabase
    .from('activation_codes')
    .select('*')
    .eq('code', normalizedCode)
    .is('used_at', null)
    .maybeSingle()

  if (!activationCode) {
    return NextResponse.json({ error: 'Code incorrect ou déjà utilisé' }, { status: 400 })
  }

  const { error: braceletError } = await supabase.from('bracelets').insert({
    user_id: user.id,
    bracelet_id: activationCode.bracelet_id,
    gamme: activationCode.gamme,
    nom_profil: nom_profil?.trim() || `Pulsmee ${activationCode.gamme}`,
    actif: true,
    activation_code: normalizedCode,
  })

  if (braceletError) {
    console.error('[activate-bracelet] erreur bracelet:', braceletError)
    return NextResponse.json({ error: 'Erreur lors de la création du bracelet' }, { status: 500 })
  }

  const isKids = activationCode.gamme === 'Kids'
  await supabase.from('fiches').insert({
    bracelet_id: activationCode.bracelet_id,
    nom_complet: '', groupe_sanguin: '', allergies: '', traitements: '',
    pathologies: '', contact1_nom: '', contact1_tel: '', contact2_nom: '',
    contact2_tel: '', contact3_nom: '', contact3_tel: '',
    medecin: '', medecin_tel: '', consignes: '',
    date_naissance: null,
    poste: '',
    habilitations: '[]',
    guide_autisme: isKids ? "Cet enfant est autiste. Approchez-vous calmement, parlez doucement, évitez les gestes brusques. Ne le forcez pas à vous regarder dans les yeux. Appelez immédiatement ses parents." : '',
    espece: '',
    race: '',
  })

  await supabase
    .from('activation_codes')
    .update({ used_at: new Date().toISOString(), used_by_user_id: user.id })
    .eq('code', normalizedCode)

  return NextResponse.json({
    success: true,
    bracelet_id: activationCode.bracelet_id,
    gamme: activationCode.gamme,
  })
}
