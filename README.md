# Pulsmee Dashboard

Application web du dashboard client Pulsmee — gestion du bracelet NFC médical.

**Stack :** Next.js 14 · Supabase · Vercel  
**Domaine :** dashboard.pulsmee.fr

---

## Installation rapide

### 1. Créer le projet Supabase

1. Allez sur [supabase.com](https://supabase.com) → New Project
2. Dans **SQL Editor**, copiez-collez le contenu de `supabase-schema.sql` et exécutez
3. Dans **Authentication → Settings** :
   - Désactivez **"Enable email confirmations"** (pour un démarrage simplifié)
   - Site URL : `https://dashboard.pulsmee.fr`
   - Redirect URLs : `https://dashboard.pulsmee.fr/**`

### 2. Configurer les variables d'environnement

```bash
cp .env.local.example .env.local
```

Remplissez `.env.local` avec vos clés Supabase (Project Settings → API) :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

### 3. Installer et lancer en local

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000)

---

## Déploiement sur Vercel

### Option A — Via GitHub (recommandé)

1. Poussez ce repo sur GitHub
2. [vercel.com](https://vercel.com) → New Project → Import depuis GitHub
3. Ajoutez les variables d'environnement dans Vercel :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

### Option B — Via CLI

```bash
npm i -g vercel
vercel
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel --prod
```

### Domaine personnalisé

Dans Vercel → Settings → Domains → Ajoutez `dashboard.pulsmee.fr`

Configurez chez votre registrar :
```
CNAME dashboard → cname.vercel-dns.com
```

---

## Pages

| URL | Description | Auth |
|-----|-------------|------|
| `/inscription` | Création de compte + connexion | Non |
| `/dashboard` | Espace personnel, stats, actions | Oui |
| `/fiche` | Fiche médicale + programmation NFC | Oui |
| `/p/[bracelet_id]` | Page d'urgence publique | Non |

---

## Fonctionnement NFC

### Android (Chrome)
Le bouton "Programmer ma puce" utilise la **Web NFC API** pour écrire l'URL `https://pulsmee.fr/p/[ID]` directement dans la puce NFC du bracelet.

**Prérequis :**
- Chrome sur Android
- NFC activé dans les paramètres
- Gestes utilisateur requis (bouton dans la page)

### iPhone
L'iPhone ne supporte pas l'écriture NFC depuis un navigateur. Le flux est :
1. Télécharger la fiche au format `.vcf`
2. Ouvrir l'app **NFC Tools** (gratuite, App Store)
3. Écrire → Importer le fichier → Approcher le bracelet

---

## Structure du projet

```
pulsmee-dashboard/
├── app/
│   ├── layout.tsx          — Layout racine (fonts, CSS)
│   ├── globals.css         — Système de design complet
│   ├── page.tsx            — Redirect vers /inscription
│   ├── inscription/
│   │   └── page.tsx        — Inscription + connexion
│   ├── dashboard/
│   │   └── page.tsx        — Dashboard utilisateur
│   ├── fiche/
│   │   └── page.tsx        — Fiche médicale + NFC
│   └── p/[bracelet_id]/
│       └── page.tsx        — Page d'urgence publique
├── components/
│   ├── Logo.tsx            — Logo SVG Pulsmee
│   └── Drawer.tsx          — Menu latéral
├── lib/
│   ├── supabase.ts         — Clients Supabase
│   └── utils.ts            — Helpers (bracelet ID, vCard...)
├── middleware.ts            — Protection des routes
├── types.ts                — Types TypeScript
└── supabase-schema.sql     — Schéma base de données
```
