# Guide Pas à Pas : Mise en Place et Configuration de Supabase pour Tribbu

Ce guide détaille toutes les étapes nécessaires pour créer, configurer et sécuriser votre backend **Supabase** pour l'application **Tribbu**.

---

## Étape 1 : Créer le projet Supabase

1. Rendez-vous sur [https://supabase.com/dashboard](https://supabase.com/dashboard) et connectez-vous.
2. Cliquez sur **New project** et sélectionnez votre organisation.
3. Renseignez les informations du projet :
   - **Name :** `Tribbu`
   - **Database Password :** Générez un mot de passe robuste et conservez-le précieusement.
   - **Region :** Choisissez la région la plus proche de vos membres (ex. `West EU (Paris)` ou `Central EU (Frankfurt)`).
4. Cliquez sur **Create new project** et patientez environ 1 à 2 minutes pendant le provisionnement PostgreSQL.

---

## Étape 2 : Exécuter le schéma SQL initial et activer les politiques RLS

L'application Tribbu repose sur une hiérarchie stricte (**Grande Tribbu > Tribbu > Tippi > Feu de camp**) sécurisée par **Row Level Security (RLS)**.

1. Dans le menu latéral gauche de Supabase, cliquez sur **SQL Editor**.
2. Cliquez sur **+ New query**.
3. Ouvrez le fichier local `supabase/migrations/001_initial_schema.sql` de ce dépôt et copiez l'intégralité de son contenu.
4. Collez le script dans l'éditeur SQL Supabase puis cliquez sur **Run** (ou `Ctrl + Entrée`).
5. Vérifiez que le message `Success. No rows returned` s'affiche.

### Ce que ce script configure automatiquement :
- **Tables créées :** `profiles`, `grande_tribbu`, `tribbus`, `tippis`, `tippi_membres`, `feux_de_camp`, `feu_de_camp_participants`, `canaux`, `membres_roles`, `messages`, `emargements`, `canal_lectures`.
- **Triggers automatiques :**
  - Création automatique du profil `profiles` et affiliation automatique à la Tribbu invitante lors de l'inscription via un lien d'invitation (`on_auth_user_created`).
  - Provisionnement automatique des canaux `Annonces` et `Agora` à chaque création de Grande Tribbu ou de Tribbu.
- **Row Level Security (RLS) :** Activée sur **100 % des tables**.
  - Seuls le **Grand Manitou** et les **Chef(fe)s** peuvent publier dans `GRANDE_TRIBBU_ANNONCES`.
  - Les **Pygmées** peuvent uniquement lire les annonces et insérer leur confirmation de lecture dans `emargements`.
  - Les **Tippis** et **Feux de camp** sont strictement isolés pour leurs participants vérifiés.
- **Storage Bucket :** Création automatique du bucket `chat-attachments` limité aux fichiers `.png`, `.jpg`, `.jpeg` et `.pdf` (max 10 Mo).
- **Publication Realtime :** Activation de `supabase_realtime` sur les tables collaboratives.

---

## Étape 3 : Configurer l'Authentification (Email & Liens d'invitation)

1. Dans le menu latéral Supabase, allez dans **Authentication > Providers**.
2. Vérifiez que le fournisseur **Email** est activé (`Enabled`).
3. Pour permettre aux membres invités (qui saisissent leur mot de passe 2x via l'URL d'invitation) d'accéder immédiatement à leur Tribbu :
   - Vous pouvez désactiver *Confirm email* pendant vos tests initiaux, ou personnaliser le modèle d'e-mail dans **Authentication > Email Templates**.
4. Allez dans **Authentication > URL Configuration** :
   - **Site URL :** `http://localhost:5173` (en développement) puis l'URL de production Vercel (`https://votre-app.vercel.app`).
   - **Redirect URLs :** Ajoutez `http://localhost:5173/**` et `https://*.vercel.app/**`.

---

## Étape 4 : Vérifier Supabase Realtime (Présence & Frappe en direct)

1. Allez dans **Project Settings > API** ou **Database > Publications**.
2. Vérifiez que la publication `supabase_realtime` inclut bien :
   - `messages`
   - `emargements`
   - `canaux`
   - `tribbus`
   - `tippis`
   - `feux_de_camp`
   - `membres_roles`
3. La fonctionnalité **Supabase Presence** (qui affiche les membres ayant le canal en focus et l'indicateur *« est en train d'écrire... »*) fonctionne nativement via les WebSockets Realtime sans table supplémentaire.

---

## Étape 5 : Récupérer les clés d'API et configurer `.env.local`

1. Dans le Dashboard Supabase, ouvrez **Project Settings > API**.
2. Copiez :
   - **Project URL** (ex. `https://xyzcompany.supabase.co`)
   - **Project API Keys > `anon` `public`**
3. À la racine du projet `D:\Takk\App\Tribbu`, dupliquez le fichier `.env.example` en `.env.local` :

```env
VITE_SUPABASE_URL=https://votre-projet-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_URL=http://localhost:5173
```

4. Redémarrez le serveur de développement (`npm run dev`). L'application basculera automatiquement du mode démonstration local vers votre instance Supabase en temps réel !

---

## Étape 6 : (Optionnel) Notifications SMS sur le téléphone des utilisateurs

Les numéros de téléphone sont stockés dans `profiles.phone_number` avec l'indicateur `sms_notifications_enabled`. Pour expédier des SMS réels lors d'une annonce dans `GRANDE_TRIBBU_ANNONCES` :
1. Créez un Database Webhook dans **Database > Webhooks** déclenché sur `INSERT` dans la table `public.messages`.
2. Pointez ce Webhook vers une **Supabase Edge Function** connectée à Twilio, Brevo ou Vonage qui filtre les messages postés sur un canal de type `'GRANDE_TRIBBU_ANNONCES'` et envoie le SMS aux numéros actifs de `public.profiles`.

