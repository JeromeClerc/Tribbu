# MISSION
Tu agis en tant qu'Architecte Logiciel et Développeur Full-Stack Senior. Tu dois générer et initialiser de zéro l'application web PWA "Tribbu" dans le répertoire local : `D:\Takk\App\Tribbu`.

L'application est une plateforme collaborative hiérarchique en temps réel pour associations, conçue en français, responsive-first, modulaire, sécurisée et optimisée pour Vercel.

---

## 1. STACK TECHNIQUE & CONTRAINTES
- **Runtime / Framework :** React 19 (ou dernière version stable), Vite, TypeScript (mode strict).
- **Styling :** Tailwind CSS avec support complet Dark/Light mode (`class` strategy), variables CSS pour la palette extraite de `Tribbu_logo.png`.
- **Backend & Base de données :** Supabase (PostgreSQL, Realtime, Row Level Security, Auth, Storage).
- **Gestion d'état & Cache :** TanStack Query (React Query) + Zustand (état de l'interface & onglets).
- **Icônes & UI :** Lucide React.
- **PWA :** `vite-plugin-pwa` configuré avec service worker, webmanifest, et splashscreens.

---

## 2. MODÈLE DE DONNÉES & SÉCURITÉ SUPABASE (SQL DDL & RLS)
Génère le script SQL initial complet (`supabase/migrations/001_initial_schema.sql`) respectant scrupuleusement la hiérarchie :

1. **`profiles`** : `id` (FK `auth.users`), `email`, `display_name`, `avatar_url`, `phone_number`, `last_seen_at`, `created_at`.
2. **`grande_tribbu`** : Identité de l'association, configurations globales, `manitou_id` (FK `profiles`).
3. **`tribbus`** : Groupes/commissions (ex. Comm, Event), `grande_tribbu_id`.
4. **`tippis`** : Sous-groupes rattachés à une `tribbu_id`.
5. **`feux_de_camp`** : Espaces privés/directs créés par les membres.
6. **`canaux` (Channels) :**
   - Type : `'GRANDE_TRIBBU_ANNONCES'`, `'AGORA_GENERALE'`, `'TRIBBU_ANNONCES'`, `'TRIBBU_AGORA'`, `'TIPPI'`, `'FEU_DE_CAMP'`.
   - Clés étrangères conditionnelles vers l'entité parente.
7. **`membres_roles`** :
   - Rôles : `'MANITOU'`, `'CHEF'`, `'PYGMEE'`.
   - Périmètres : Grande Tribbu ou Tribbu spécifique.
8. **`messages`** :
   - `id`, `canal_id`, `author_id`, `content` (texte), `reply_to_message_id` (citations/thread), `attachments` (JSONB pour URL/type image/pdf), `created_at`, `updated_at`.
9. **`emargements` (Read receipts)** :
   - `message_id`, `user_id`, `confirmed_at` (utilisé pour les messages descendants de la Grande Tribbu).
10. **Storage Buckets Supabase :**
   - `chat-attachments` (fichiers autorisés : `.png`, `.jpg`, `.jpeg`, `.pdf` avec limitation de taille).

> **RLS (Row Level Security) :**
> - Active la RLS sur chaque table sans exception.
> - Seuls le Grand Manitou et les Chefs peuvent écrire dans `'GRANDE_TRIBBU_ANNONCES'`. Les Pygmées ont uniquement accès en lecture et insertion dans `emargements`.
> - Les Pygmées n'accèdent qu'aux Tribbus et Tippis dont ils sont membres vérifiés.
> - Les Feux de camp ne sont visibles que par leurs participants.

---

## 3. EXPÉRIENCE UTILISATEUR & INTERFACE (DESKTOP & MOBILE PWA)
- **Palette & Thème :**
  - Adapte les teintes principales à partir de `Tribbu_logo.png`.
  - Mode sombre par défaut ou synchronisé avec le système (toggle manuel disponible).
- **Disposition Écran Large (Desktop) :**
  - **Sidebar latérale gauche (Collapsible) :**
    - Arborescence hiérarchique : Grande Tribbu > Agora Générale > Tribbus rattachées > Tippis rattachés > Feux de camp.
    - Badges dynamiques : pastille colorée de mutation récente depuis `last_seen_at`, compteur numérique de messages non-lus.
    - Accès au tiroir de notifications résumant les canaux modifiés.
  - **Zone Principale :**
    - Système d'onglets persistants façon navigateur pour basculer rapidement entre plusieurs canaux ouverts.
    - En-tête de canal actif : Présence en direct via Supabase Presence (qui consulte ce canal + indicateur de frappe `is typing...`).
    - Liste des messages virtualisée ou fluide avec auto-scroll intelligent.
    - Zone de saisie riche : champ auto-extensible, sauts de ligne (`Shift+Enter`), détection regex automatique des liens pour conversion en balises `<a>`, sélecteur d'emojis, upload d'images/PDF avec prévisualisation, action "Répondre au message".
- **Disposition Mobile PWA :**
  - Vue principale épurée avec tiroir de navigation ergonomique (drawer tactile).
  - Bascule fluide entre la liste des conversations et le chat actif.
  - Safe-area inset support pour encoches et barres de navigation iOS/Android.

---

## 4. ARCHITECTURE DES DOSSIERS ATTENDUE
Organise le code sous `D:\Takk\App\Tribbu` avec une séparation nette des responsabilités :
```text
D:\Takk\App\Tribbu/
├── public/
│   ├── favicon.ico
│   ├── Tribbu_logo.png
│   └── icons/              # Icônes PWA générées
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── common/         # Boutons, Modales, Inputs, Tabs
│   │   ├── layout/         # Header, Sidebar, TabBar, MobileNav
│   │   ├── chat/           # MessageList, MessageItem, ChatInput, TypingIndicator, Attachments
│   │   └── modals/         # InviteModal, CreateTippiModal, RoleManager
│   ├── contexts/           # AuthContext, PresenceContext, ThemeContext
│   ├── hooks/              # useChat, useRealtimeChannel, useUnreadCount, useTyping
│   ├── lib/                # supabaseClient.ts, utils.ts, storage.ts
│   ├── services/           # authService.ts, chatService.ts, notificationService.ts
│   ├── types/              # database.types.ts, tribbu.types.ts
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   └── migrations/         # Schémas DDL et politiques RLS
├── docs/                   # Guides de déploiement et configuration
├── tailwind.config.ts
├── vite.config.ts
└── package.json