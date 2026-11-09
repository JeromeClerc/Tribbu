-- ============================================================================
-- TRIBBU — MIGRATION INITIALE COMPLÈTE (001_initial_schema.sql)
-- Plateforme collaborative hiérarchique en temps réel pour associations
-- PostgreSQL / Supabase (DDL, Triggers, Storage, Realtime & Row Level Security)
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TYPES ÉNUMÉRÉS
DO $$ BEGIN
  CREATE TYPE public.canal_type AS ENUM (
    'GRANDE_TRIBBU_ANNONCES',
    'AGORA_GENERALE',
    'TRIBBU_ANNONCES',
    'TRIBBU_AGORA',
    'TIPPI',
    'FEU_DE_CAMP'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.tribbu_role AS ENUM (
    'MANITOU',
    'CHEF',
    'PYGMEE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.membership_status AS ENUM (
    'INVITED',
    'ACTIVE',
    'REJECTED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 3. TABLES PRINCIPALES
-- ============================================================================

-- 3.1. PROFILES (Lié à auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  phone_number TEXT,
  sms_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 3.2. GRANDE_TRIBBU (Identité de l'association & configurations globales)
CREATE TABLE IF NOT EXISTS public.grande_tribbu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT DEFAULT '/Tribbu_logo.png',
  settings JSONB NOT NULL DEFAULT '{
    "allow_pygmee_feux_de_camp": true,
    "require_emargement_on_annonces": true,
    "sms_gateway_enabled": true
  }'::jsonb,
  manitou_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3. TRIBBUS (Groupes / Commissions rattachés à la Grande Tribbu)
CREATE TABLE IF NOT EXISTS public.tribbus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grande_tribbu_id UUID NOT NULL REFERENCES public.grande_tribbu(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#0E8A9E',
  icon TEXT NOT NULL DEFAULT 'compass',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tribbus_grande_tribbu ON public.tribbus(grande_tribbu_id);

-- 3.4. TIPPIS (Sous-groupes projets/activités rattachés à une Tribbu)
CREATE TABLE IF NOT EXISTS public.tippis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tribbu_id UUID NOT NULL REFERENCES public.tribbus(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tippis_tribbu ON public.tippis(tribbu_id);

-- 3.5. TIPPI_MEMBRES (Membres vérifiés invités dans un Tippi spécifique)
CREATE TABLE IF NOT EXISTS public.tippi_membres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tippi_id UUID NOT NULL REFERENCES public.tippis(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tippi_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tippi_membres_user ON public.tippi_membres(user_id);
CREATE INDEX IF NOT EXISTS idx_tippi_membres_tippi ON public.tippi_membres(tippi_id);

-- 3.6. FEUX_DE_CAMP (Espaces privés ou directs créés par les membres à tout niveau)
CREATE TABLE IF NOT EXISTS public.feux_de_camp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grande_tribbu_id UUID NOT NULL REFERENCES public.grande_tribbu(id) ON DELETE CASCADE,
  tribbu_id UUID REFERENCES public.tribbus(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  topic TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feux_de_camp_tribbu ON public.feux_de_camp(tribbu_id);

-- 3.7. FEU_DE_CAMP_PARTICIPANTS (Participants autorisés d'un Feu de camp)
CREATE TABLE IF NOT EXISTS public.feu_de_camp_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feu_de_camp_id UUID NOT NULL REFERENCES public.feux_de_camp(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(feu_de_camp_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_fdc_participants_user ON public.feu_de_camp_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_fdc_participants_fdc ON public.feu_de_camp_participants(feu_de_camp_id);

-- 3.8. CANAUX (Channels avec clés étrangères conditionnelles vers l'entité parente)
CREATE TABLE IF NOT EXISTS public.canaux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.canal_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  grande_tribbu_id UUID REFERENCES public.grande_tribbu(id) ON DELETE CASCADE,
  tribbu_id UUID REFERENCES public.tribbus(id) ON DELETE CASCADE,
  tippi_id UUID REFERENCES public.tippis(id) ON DELETE CASCADE,
  feu_de_camp_id UUID REFERENCES public.feux_de_camp(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_canal_parent_hierarchy CHECK (
    (type IN ('GRANDE_TRIBBU_ANNONCES', 'AGORA_GENERALE') AND grande_tribbu_id IS NOT NULL AND tribbu_id IS NULL AND tippi_id IS NULL AND feu_de_camp_id IS NULL)
    OR
    (type IN ('TRIBBU_ANNONCES', 'TRIBBU_AGORA') AND tribbu_id IS NOT NULL AND tippi_id IS NULL AND feu_de_camp_id IS NULL)
    OR
    (type = 'TIPPI' AND tippi_id IS NOT NULL AND feu_de_camp_id IS NULL)
    OR
    (type = 'FEU_DE_CAMP' AND feu_de_camp_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_canaux_type ON public.canaux(type);
CREATE INDEX IF NOT EXISTS idx_canaux_grande_tribbu ON public.canaux(grande_tribbu_id);
CREATE INDEX IF NOT EXISTS idx_canaux_tribbu ON public.canaux(tribbu_id);
CREATE INDEX IF NOT EXISTS idx_canaux_tippi ON public.canaux(tippi_id);
CREATE INDEX IF NOT EXISTS idx_canaux_feu_de_camp ON public.canaux(feu_de_camp_id);

-- 3.9. MEMBRES_ROLES (Affectation des rôles MANITOU, CHEF, PYGMEE & Invitations)
CREATE TABLE IF NOT EXISTS public.membres_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_email TEXT,
  role public.tribbu_role NOT NULL DEFAULT 'PYGMEE',
  grande_tribbu_id UUID NOT NULL REFERENCES public.grande_tribbu(id) ON DELETE CASCADE,
  tribbu_id UUID REFERENCES public.tribbus(id) ON DELETE CASCADE,
  status public.membership_status NOT NULL DEFAULT 'ACTIVE',
  invitation_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_role_scope CHECK (
    (role = 'MANITOU' AND tribbu_id IS NULL)
    OR
    (role IN ('CHEF', 'PYGMEE'))
  )
);

CREATE INDEX IF NOT EXISTS idx_membres_roles_user ON public.membres_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_membres_roles_tribbu ON public.membres_roles(tribbu_id);
CREATE INDEX IF NOT EXISTS idx_membres_roles_token ON public.membres_roles(invitation_token);

-- 3.10. MESSAGES (Messages temps réel avec citations et pièces jointes JSONB)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canal_id UUID NOT NULL REFERENCES public.canaux(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  reply_to_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  quoted_excerpt TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_canal_created ON public.messages(canal_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_author ON public.messages(author_id);

-- 3.11. EMARGEMENTS (Read receipts / validation de lecture pour annonces descendantes)
CREATE TABLE IF NOT EXISTS public.emargements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_emargements_message ON public.emargements(message_id);
CREATE INDEX IF NOT EXISTS idx_emargements_user ON public.emargements(user_id);

-- 3.12. CANAL_LECTURES (Suivi fin des messages non-lus par canal et par membre)
CREATE TABLE IF NOT EXISTS public.canal_lectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canal_id UUID NOT NULL REFERENCES public.canaux(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(canal_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_canal_lectures_user ON public.canal_lectures(user_id, canal_id);

-- ============================================================================
-- 4. FONCTIONS UTILITAIRES DE SÉCURITÉ (SECURITY DEFINER POUR RLS)
-- ============================================================================

-- Vérifie si l'utilisateur est Grand Manitou
CREATE OR REPLACE FUNCTION public.is_manitou(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.grande_tribbu gt
    WHERE gt.manitou_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.membres_roles mr
    WHERE mr.user_id = p_user_id
      AND mr.role = 'MANITOU'
      AND mr.status = 'ACTIVE'
  );
$$;

-- Vérifie si l'utilisateur est Chef d'au moins une Tribbu (ou Manitou)
CREATE OR REPLACE FUNCTION public.is_any_chef_or_manitou(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_manitou(p_user_id) OR EXISTS (
    SELECT 1 FROM public.membres_roles mr
    WHERE mr.user_id = p_user_id
      AND mr.role = 'CHEF'
      AND mr.status = 'ACTIVE'
  );
$$;

-- Vérifie si l'utilisateur est Chef d'une Tribbu spécifique (ou Manitou)
CREATE OR REPLACE FUNCTION public.is_chef_of_tribbu(p_user_id UUID, p_tribbu_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_manitou(p_user_id) OR EXISTS (
    SELECT 1 FROM public.membres_roles mr
    WHERE mr.user_id = p_user_id
      AND mr.tribbu_id = p_tribbu_id
      AND mr.role = 'CHEF'
      AND mr.status = 'ACTIVE'
  );
$$;

-- Vérifie si l'utilisateur est membre actif de la Grande Tribbu
CREATE OR REPLACE FUNCTION public.is_active_association_member(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_manitou(p_user_id) OR EXISTS (
    SELECT 1 FROM public.membres_roles mr
    WHERE mr.user_id = p_user_id
      AND mr.status = 'ACTIVE'
  );
$$;

-- Vérifie si l'utilisateur est membre vérifié d'une Tribbu spécifique
CREATE OR REPLACE FUNCTION public.is_member_of_tribbu(p_user_id UUID, p_tribbu_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_manitou(p_user_id) OR EXISTS (
    SELECT 1 FROM public.membres_roles mr
    WHERE mr.user_id = p_user_id
      AND mr.tribbu_id = p_tribbu_id
      AND mr.status = 'ACTIVE'
  );
$$;

-- Vérifie si l'utilisateur a accès à un Tippi (Manitou, Chef de la Tribbu parente, ou membre du Tippi)
CREATE OR REPLACE FUNCTION public.is_member_of_tippi(p_user_id UUID, p_tippi_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_manitou(p_user_id)
  OR EXISTS (
    SELECT 1 FROM public.tippis t
    WHERE t.id = p_tippi_id
      AND public.is_chef_of_tribbu(p_user_id, t.tribbu_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.tippi_membres tm
    WHERE tm.tippi_id = p_tippi_id
      AND tm.user_id = p_user_id
  );
$$;

-- Vérifie si l'utilisateur est participant d'un Feu de camp (ou Manitou / Chef de la Tribbu de rattachement)
CREATE OR REPLACE FUNCTION public.is_participant_of_feu_de_camp(p_user_id UUID, p_feu_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_manitou(p_user_id)
  OR EXISTS (
    SELECT 1 FROM public.feux_de_camp f
    WHERE f.id = p_feu_id
      AND (
        f.created_by = p_user_id
        OR (f.tribbu_id IS NOT NULL AND public.is_chef_of_tribbu(p_user_id, f.tribbu_id))
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.feu_de_camp_participants fp
    WHERE fp.feu_de_camp_id = p_feu_id
      AND fp.user_id = p_user_id
  );
$$;

-- Vérifie le droit de LECTURE sur un canal
CREATE OR REPLACE FUNCTION public.can_read_canal(p_user_id UUID, p_canal_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_canal RECORD;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF public.is_manitou(p_user_id) THEN
    RETURN TRUE;
  END IF;

  SELECT type, grande_tribbu_id, tribbu_id, tippi_id, feu_de_camp_id
  INTO v_canal
  FROM public.canaux
  WHERE id = p_canal_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  CASE v_canal.type
    WHEN 'GRANDE_TRIBBU_ANNONCES', 'AGORA_GENERALE' THEN
      RETURN public.is_active_association_member(p_user_id);
    WHEN 'TRIBBU_ANNONCES', 'TRIBBU_AGORA' THEN
      RETURN public.is_member_of_tribbu(p_user_id, v_canal.tribbu_id);
    WHEN 'TIPPI' THEN
      RETURN public.is_member_of_tippi(p_user_id, v_canal.tippi_id);
    WHEN 'FEU_DE_CAMP' THEN
      RETURN public.is_participant_of_feu_de_camp(p_user_id, v_canal.feu_de_camp_id);
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;

-- Vérifie le droit d'ÉCRITURE (poster un message) dans un canal
CREATE OR REPLACE FUNCTION public.can_write_canal(p_user_id UUID, p_canal_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_canal RECORD;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF public.is_manitou(p_user_id) THEN
    RETURN TRUE;
  END IF;

  SELECT type, grande_tribbu_id, tribbu_id, tippi_id, feu_de_camp_id
  INTO v_canal
  FROM public.canaux
  WHERE id = p_canal_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  CASE v_canal.type
    WHEN 'GRANDE_TRIBBU_ANNONCES' THEN
      -- Seuls le Grand Manitou et les Chefs peuvent écrire dans GRANDE_TRIBBU_ANNONCES
      RETURN public.is_any_chef_or_manitou(p_user_id);
    WHEN 'AGORA_GENERALE' THEN
      RETURN public.is_active_association_member(p_user_id);
    WHEN 'TRIBBU_ANNONCES' THEN
      -- Seuls le Grand Manitou et les Chefs de la Tribbu peuvent publier des annonces de Tribbu
      RETURN public.is_chef_of_tribbu(p_user_id, v_canal.tribbu_id);
    WHEN 'TRIBBU_AGORA' THEN
      RETURN public.is_member_of_tribbu(p_user_id, v_canal.tribbu_id);
    WHEN 'TIPPI' THEN
      RETURN public.is_member_of_tippi(p_user_id, v_canal.tippi_id);
    WHEN 'FEU_DE_CAMP' THEN
      RETURN public.is_participant_of_feu_de_camp(p_user_id, v_canal.feu_de_camp_id);
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;

-- ============================================================================
-- 5. TRIGGERS AUTOMATIQUES (PROVISIONING DES CANAUX & ONBOARDING)
-- ============================================================================

-- 5.1. Création automatique du profil et affiliation par token d'invitation lors du signup
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name TEXT;
  v_phone TEXT;
  v_invite_token TEXT;
BEGIN
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    split_part(NEW.email, '@', 1)
  );
  v_phone := NEW.raw_user_meta_data->>'phone_number';
  v_invite_token := NEW.raw_user_meta_data->>'invitation_token';

  INSERT INTO public.profiles (id, email, display_name, phone_number)
  VALUES (NEW.id, NEW.email, v_display_name, v_phone)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name);

  -- Rattachement automatique aux invitations en attente (par token ou par e-mail)
  UPDATE public.membres_roles
  SET user_id = NEW.id,
      status = 'ACTIVE',
      updated_at = NOW()
  WHERE status = 'INVITED'
    AND (
      (v_invite_token IS NOT NULL AND invitation_token = v_invite_token)
      OR lower(invited_email) = lower(NEW.email)
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 5.2. Création automatique des canaux de la Grande Tribbu (Annonces + Agora Générale)
CREATE OR REPLACE FUNCTION public.handle_new_grande_tribbu()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.canaux (type, name, description, grande_tribbu_id)
  VALUES
    ('GRANDE_TRIBBU_ANNONCES', 'La Grande Tribbu — Annonces', 'Canal officiel d''information descendante (Manitou & Chefs). Émargement requis.', NEW.id),
    ('AGORA_GENERALE', 'Agora Générale', 'Place publique ouverte à tous les membres de la Grande Tribbu.', NEW.id);

  INSERT INTO public.membres_roles (user_id, role, grande_tribbu_id, status)
  VALUES (NEW.manitou_id, 'MANITOU', NEW.id, 'ACTIVE')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_grande_tribbu_created ON public.grande_tribbu;
CREATE TRIGGER on_grande_tribbu_created
  AFTER INSERT ON public.grande_tribbu
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_grande_tribbu();

-- 5.3. Création automatique des canaux d'une Tribbu (Annonces + Agora de Tribbu)
CREATE OR REPLACE FUNCTION public.handle_new_tribbu()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.canaux (type, name, description, grande_tribbu_id, tribbu_id)
  VALUES
    ('TRIBBU_ANNONCES', NEW.name || ' — Annonces', 'Informations officielles des Chef(fe)s de la Tribbu ' || NEW.name, NEW.grande_tribbu_id, NEW.id),
    ('TRIBBU_AGORA', NEW.name || ' — Agora', 'Échanges généraux entre tous les membres de la Tribbu ' || NEW.name, NEW.grande_tribbu_id, NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_tribbu_created ON public.tribbus;
CREATE TRIGGER on_tribbu_created
  AFTER INSERT ON public.tribbus
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_tribbu();

-- 5.4. Création automatique du canal d'un Tippi
CREATE OR REPLACE FUNCTION public.handle_new_tippi()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gt_id UUID;
BEGIN
  SELECT grande_tribbu_id INTO v_gt_id FROM public.tribbus WHERE id = NEW.tribbu_id;

  INSERT INTO public.canaux (type, name, description, grande_tribbu_id, tribbu_id, tippi_id)
  VALUES ('TIPPI', NEW.name, COALESCE(NEW.description, 'Espace projet Tippi'), v_gt_id, NEW.tribbu_id, NEW.id);

  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.tippi_membres (tippi_id, user_id, added_by)
    VALUES (NEW.id, NEW.created_by, NEW.created_by)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_tippi_created ON public.tippis;
CREATE TRIGGER on_tippi_created
  AFTER INSERT ON public.tippis
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_tippi();

-- 5.5. Création automatique du canal d'un Feu de camp
CREATE OR REPLACE FUNCTION public.handle_new_feu_de_camp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.canaux (type, name, description, grande_tribbu_id, tribbu_id, feu_de_camp_id)
  VALUES ('FEU_DE_CAMP', NEW.name, COALESCE(NEW.topic, 'Feu de camp privé'), NEW.grande_tribbu_id, NEW.tribbu_id, NEW.id);

  INSERT INTO public.feu_de_camp_participants (feu_de_camp_id, user_id)
  VALUES (NEW.id, NEW.created_by)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_feu_de_camp_created ON public.feux_de_camp;
CREATE TRIGGER on_feu_de_camp_created
  AFTER INSERT ON public.feux_de_camp
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_feu_de_camp();

-- 5.6. Mise à jour horodatage d'activité du canal à chaque nouveau message
CREATE OR REPLACE FUNCTION public.handle_new_message_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.canaux
  SET last_message_at = NEW.created_at
  WHERE id = NEW.canal_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_inserted ON public.messages;
CREATE TRIGGER on_message_inserted
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_message_timestamp();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) SUR TOUTES LES TABLES SANS EXCEPTION
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grande_tribbu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tribbus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tippis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tippi_membres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feux_de_camp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feu_de_camp_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membres_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emargements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canal_lectures ENABLE ROW LEVEL SECURITY;

-- 6.1. Policies : PROFILES
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own_or_manitou"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_manitou(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_manitou(auth.uid()));

-- 6.2. Policies : GRANDE_TRIBBU
CREATE POLICY "grande_tribbu_select_members"
  ON public.grande_tribbu FOR SELECT
  TO authenticated
  USING (public.is_active_association_member(auth.uid()));

CREATE POLICY "grande_tribbu_insert_manitou"
  ON public.grande_tribbu FOR INSERT
  TO authenticated
  WITH CHECK (manitou_id = auth.uid());

CREATE POLICY "grande_tribbu_update_manitou"
  ON public.grande_tribbu FOR UPDATE
  TO authenticated
  USING (public.is_manitou(auth.uid()))
  WITH CHECK (public.is_manitou(auth.uid()));

-- 6.3. Policies : TRIBBUS
-- Les Pygmées n'accèdent qu'aux Tribbus dont ils sont membres vérifiés (Manitou voit tout)
CREATE POLICY "tribbus_select_verified_members"
  ON public.tribbus FOR SELECT
  TO authenticated
  USING (public.is_member_of_tribbu(auth.uid(), id));

CREATE POLICY "tribbus_insert_manitou"
  ON public.tribbus FOR INSERT
  TO authenticated
  WITH CHECK (public.is_manitou(auth.uid()));

CREATE POLICY "tribbus_update_manitou_or_chef"
  ON public.tribbus FOR UPDATE
  TO authenticated
  USING (public.is_chef_of_tribbu(auth.uid(), id))
  WITH CHECK (public.is_chef_of_tribbu(auth.uid(), id));

CREATE POLICY "tribbus_delete_manitou"
  ON public.tribbus FOR DELETE
  TO authenticated
  USING (public.is_manitou(auth.uid()));

-- 6.4. Policies : TIPPIS
-- Les Pygmées n'accèdent qu'aux Tippis dont ils sont membres vérifiés
CREATE POLICY "tippis_select_verified_members"
  ON public.tippis FOR SELECT
  TO authenticated
  USING (public.is_member_of_tippi(auth.uid(), id));

CREATE POLICY "tippis_insert_chef_or_manitou"
  ON public.tippis FOR INSERT
  TO authenticated
  WITH CHECK (public.is_chef_of_tribbu(auth.uid(), tribbu_id));

CREATE POLICY "tippis_update_chef_or_manitou"
  ON public.tippis FOR UPDATE
  TO authenticated
  USING (public.is_chef_of_tribbu(auth.uid(), tribbu_id))
  WITH CHECK (public.is_chef_of_tribbu(auth.uid(), tribbu_id));

CREATE POLICY "tippis_delete_chef_or_manitou"
  ON public.tippis FOR DELETE
  TO authenticated
  USING (public.is_chef_of_tribbu(auth.uid(), tribbu_id));

-- 6.5. Policies : TIPPI_MEMBRES
CREATE POLICY "tippi_membres_select"
  ON public.tippi_membres FOR SELECT
  TO authenticated
  USING (public.is_member_of_tippi(auth.uid(), tippi_id));

CREATE POLICY "tippi_membres_manage_chef_or_manitou"
  ON public.tippi_membres FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tippis t
      WHERE t.id = tippi_id
        AND public.is_chef_of_tribbu(auth.uid(), t.tribbu_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tippis t
      WHERE t.id = tippi_id
        AND public.is_chef_of_tribbu(auth.uid(), t.tribbu_id)
    )
  );

-- 6.6. Policies : FEUX_DE_CAMP
-- Les Feux de camp ne sont visibles que par leurs participants (et Manitou / Chef de la Tribbu parente)
CREATE POLICY "feux_de_camp_select_participants"
  ON public.feux_de_camp FOR SELECT
  TO authenticated
  USING (public.is_participant_of_feu_de_camp(auth.uid(), id));

CREATE POLICY "feux_de_camp_insert_members"
  ON public.feux_de_camp FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.is_active_association_member(auth.uid())
    AND (tribbu_id IS NULL OR public.is_member_of_tribbu(auth.uid(), tribbu_id))
  );

CREATE POLICY "feux_de_camp_update_creator_or_chef"
  ON public.feux_de_camp FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_manitou(auth.uid())
    OR (tribbu_id IS NOT NULL AND public.is_chef_of_tribbu(auth.uid(), tribbu_id))
  );

CREATE POLICY "feux_de_camp_delete_creator_or_chef"
  ON public.feux_de_camp FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_manitou(auth.uid())
    OR (tribbu_id IS NOT NULL AND public.is_chef_of_tribbu(auth.uid(), tribbu_id))
  );

-- 6.7. Policies : FEU_DE_CAMP_PARTICIPANTS
CREATE POLICY "fdc_participants_select"
  ON public.feu_de_camp_participants FOR SELECT
  TO authenticated
  USING (public.is_participant_of_feu_de_camp(auth.uid(), feu_de_camp_id));

CREATE POLICY "fdc_participants_insert"
  ON public.feu_de_camp_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_participant_of_feu_de_camp(auth.uid(), feu_de_camp_id)
  );

CREATE POLICY "fdc_participants_delete"
  ON public.feu_de_camp_participants FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_participant_of_feu_de_camp(auth.uid(), feu_de_camp_id)
  );

-- 6.8. Policies : CANAUX
CREATE POLICY "canaux_select_authorized"
  ON public.canaux FOR SELECT
  TO authenticated
  USING (public.can_read_canal(auth.uid(), id));

CREATE POLICY "canaux_insert_manitou_or_chef"
  ON public.canaux FOR INSERT
  TO authenticated
  WITH CHECK (public.is_any_chef_or_manitou(auth.uid()) OR type = 'FEU_DE_CAMP');

CREATE POLICY "canaux_update_authorized"
  ON public.canaux FOR UPDATE
  TO authenticated
  USING (public.can_write_canal(auth.uid(), id));

-- 6.9. Policies : MEMBRES_ROLES
CREATE POLICY "membres_roles_select_authenticated"
  ON public.membres_roles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_manitou(auth.uid())
    OR (tribbu_id IS NOT NULL AND public.is_member_of_tribbu(auth.uid(), tribbu_id))
  );

CREATE POLICY "membres_roles_insert_manitou_or_chef"
  ON public.membres_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_manitou(auth.uid())
    OR (
      tribbu_id IS NOT NULL
      AND public.is_chef_of_tribbu(auth.uid(), tribbu_id)
      AND role IN ('CHEF', 'PYGMEE')
    )
  );

CREATE POLICY "membres_roles_update_manitou_or_chef"
  ON public.membres_roles FOR UPDATE
  TO authenticated
  USING (
    public.is_manitou(auth.uid())
    OR (tribbu_id IS NOT NULL AND public.is_chef_of_tribbu(auth.uid(), tribbu_id))
  );

CREATE POLICY "membres_roles_delete_manitou_or_chef"
  ON public.membres_roles FOR DELETE
  TO authenticated
  USING (
    public.is_manitou(auth.uid())
    OR (tribbu_id IS NOT NULL AND public.is_chef_of_tribbu(auth.uid(), tribbu_id))
  );

-- 6.10. Policies : MESSAGES
-- Lecture autorisée uniquement si le membre a accès au canal parent
CREATE POLICY "messages_select_canal_readers"
  ON public.messages FOR SELECT
  TO authenticated
  USING (public.can_read_canal(auth.uid(), canal_id));

-- Écriture strictement contrôlée par can_write_canal (bloque les Pygmées sur GRANDE_TRIBBU_ANNONCES et TRIBBU_ANNONCES)
CREATE POLICY "messages_insert_canal_writers"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.can_write_canal(auth.uid(), canal_id)
  );

CREATE POLICY "messages_update_author_or_moderator"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR public.is_manitou(auth.uid())
  )
  WITH CHECK (
    author_id = auth.uid()
    OR public.is_manitou(auth.uid())
  );

CREATE POLICY "messages_delete_author_or_moderator"
  ON public.messages FOR DELETE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR public.is_manitou(auth.uid())
  );

-- 6.11. Policies : EMARGEMENTS (Read receipts sur les annonces)
-- Tous les membres ayant accès au canal peuvent lire les émargements et insérer le leur
CREATE POLICY "emargements_select_canal_readers"
  ON public.emargements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
        AND public.can_read_canal(auth.uid(), m.canal_id)
    )
  );

CREATE POLICY "emargements_insert_own"
  ON public.emargements FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
        AND public.can_read_canal(auth.uid(), m.canal_id)
    )
  );

-- 6.12. Policies : CANAL_LECTURES
CREATE POLICY "canal_lectures_select_own"
  ON public.canal_lectures FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "canal_lectures_upsert_own"
  ON public.canal_lectures FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_read_canal(auth.uid(), canal_id));

CREATE POLICY "canal_lectures_update_own"
  ON public.canal_lectures FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 7. STORAGE BUCKET : chat-attachments (.png, .jpg, .jpeg, .pdf - Max 10 Mo)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  TRUE,
  10485760, -- 10 Mo
  ARRAY['image/png', 'image/jpeg', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "chat_attachments_select_authenticated"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'chat-attachments');

CREATE POLICY "chat_attachments_insert_authenticated"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND (storage.extension(name) IN ('png', 'jpg', 'jpeg', 'pdf'))
  );

CREATE POLICY "chat_attachments_delete_owner_or_manitou"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (owner = auth.uid() OR public.is_manitou(auth.uid()))
  );

-- ============================================================================
-- 8. ACTIVATION SUPABASE REALTIME SUR LES TABLES COLLABORATIVES
-- ============================================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.emargements;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.canaux;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tribbus;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tippis;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.feux_de_camp;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.membres_roles;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

