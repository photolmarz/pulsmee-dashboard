export type Bracelet = {
  id: string
  user_id: string
  bracelet_id: string
  gamme: string
  nom_profil: string
  actif: boolean
  puce_programmee: boolean
  derniere_programmation: string | null
  activation_code: string | null
  created_at: string
}

export type Fiche = {
  id: string
  bracelet_id: string
  nom_complet: string
  date_naissance: string | null
  groupe_sanguin: string
  allergies: string
  traitements: string
  pathologies: string
  contact1_nom: string
  contact1_tel: string
  contact2_nom: string
  contact2_tel: string
  contact3_nom: string
  contact3_tel: string
  contact1_relation: string
  contact2_relation: string
  contact3_relation: string
  medecin: string
  medecin_tel: string
  consignes: string
  photo_url: string | null
  poste: string
  habilitations: string
  guide_autisme: string
  espece: string
  race: string
  updated_at: string
}

export type Scan = {
  id: string
  bracelet_id: string
  scanned_at: string
  user_agent: string
  latitude?: number | null
  longitude?: number | null
}
