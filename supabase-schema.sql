-- ══════════════════════════════════════════
-- PULSMEE — Schéma multi-bracelets
-- Exécutez dans Supabase → SQL Editor
-- ══════════════════════════════════════════

-- 1. Codes d'activation (générés par le webhook Shopify)
CREATE TABLE IF NOT EXISTS activation_codes (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code           TEXT UNIQUE NOT NULL,       -- ex: PULM3H2X (8 chars)
  bracelet_id    TEXT NOT NULL,              -- pré-généré
  gamme          TEXT DEFAULT 'Care',
  shopify_order_id TEXT,
  customer_email TEXT,
  used_at        TIMESTAMPTZ,               -- NULL = disponible
  used_by_user_id UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bracelets (créé quand un code est activé)
CREATE TABLE IF NOT EXISTS bracelets (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bracelet_id            TEXT UNIQUE NOT NULL,
  gamme                  TEXT DEFAULT 'Care',
  nom_profil             TEXT DEFAULT 'Mon bracelet',
  actif                  BOOLEAN DEFAULT true,
  puce_programmee        BOOLEAN DEFAULT false,
  derniere_programmation TIMESTAMPTZ,
  activation_code        TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Fiches médicales (une par bracelet)
CREATE TABLE IF NOT EXISTS fiches (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bracelet_id     TEXT UNIQUE REFERENCES bracelets(bracelet_id) ON DELETE CASCADE NOT NULL,
  nom_complet     TEXT DEFAULT '',
  age             INT,
  groupe_sanguin  TEXT DEFAULT '',
  allergies       TEXT DEFAULT '',
  traitements     TEXT DEFAULT '',
  pathologies     TEXT DEFAULT '',
  contact1_nom    TEXT DEFAULT '',
  contact1_tel    TEXT DEFAULT '',
  contact2_nom    TEXT DEFAULT '',
  contact2_tel    TEXT DEFAULT '',
  contact3_nom    TEXT DEFAULT '',
  contact3_tel    TEXT DEFAULT '',
  medecin         TEXT DEFAULT '',
  medecin_tel     TEXT DEFAULT '',
  consignes       TEXT DEFAULT '',
  photo_url       TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Scans (inchangé)
CREATE TABLE IF NOT EXISTS scans (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bracelet_id TEXT,
  scanned_at  TIMESTAMPTZ DEFAULT NOW(),
  user_agent  TEXT DEFAULT ''
);

-- Index
CREATE INDEX IF NOT EXISTS idx_bracelets_user_id ON bracelets(user_id);
CREATE INDEX IF NOT EXISTS idx_bracelets_bracelet_id ON bracelets(bracelet_id);
CREATE INDEX IF NOT EXISTS idx_fiches_bracelet_id ON fiches(bracelet_id);
CREATE INDEX IF NOT EXISTS idx_scans_bracelet_id ON scans(bracelet_id);
CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON activation_codes(code);

-- ══════════════════════════════════════════
-- RLS — Row Level Security
-- ══════════════════════════════════════════

ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bracelets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiches ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- activation_codes : géré uniquement via service_role (webhook + API serveur)
CREATE POLICY "Service role gère les codes" ON activation_codes
  USING (true) WITH CHECK (true);

-- bracelets : lecture/écriture par le propriétaire uniquement
CREATE POLICY "Lecture bracelets proprio" ON bracelets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insertion bracelets proprio" ON bracelets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Modification bracelets proprio" ON bracelets FOR UPDATE USING (auth.uid() = user_id);

-- fiches : lecture publique (page urgence), écriture par le propriétaire
CREATE POLICY "Lecture publique fiches" ON fiches FOR SELECT USING (true);
CREATE POLICY "Insertion fiche proprio" ON fiches FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM bracelets WHERE bracelet_id = fiches.bracelet_id AND user_id = auth.uid())
);
CREATE POLICY "Modification fiche proprio" ON fiches FOR UPDATE USING (
  EXISTS (SELECT 1 FROM bracelets WHERE bracelet_id = fiches.bracelet_id AND user_id = auth.uid())
);

-- scans : insertion publique, lecture par le propriétaire
CREATE POLICY "Insertion publique scans" ON scans FOR INSERT WITH CHECK (true);
CREATE POLICY "Lecture scans proprio" ON scans FOR SELECT USING (
  EXISTS (SELECT 1 FROM bracelets WHERE bracelet_id = scans.bracelet_id AND user_id = auth.uid())
);

-- ══════════════════════════════════════════
-- MIGRATION — Champs gamme-spécifiques
-- ══════════════════════════════════════════
ALTER TABLE fiches ADD COLUMN IF NOT EXISTS date_naissance TEXT DEFAULT '';
ALTER TABLE fiches ADD COLUMN IF NOT EXISTS poste TEXT DEFAULT '';
ALTER TABLE fiches ADD COLUMN IF NOT EXISTS habilitations TEXT DEFAULT '[]';
ALTER TABLE fiches ADD COLUMN IF NOT EXISTS guide_autisme TEXT DEFAULT '';
ALTER TABLE fiches ADD COLUMN IF NOT EXISTS espece TEXT DEFAULT '';
ALTER TABLE fiches ADD COLUMN IF NOT EXISTS race TEXT DEFAULT '';

-- Storage bucket pour photos de profil
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "Upload photos own" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Read photos public" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');

CREATE POLICY IF NOT EXISTS "Update photos own" ON storage.objects
  FOR UPDATE USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Migration scans géolocalisation
ALTER TABLE scans ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS longitude FLOAT;
