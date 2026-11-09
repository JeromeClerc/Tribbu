# Guide Pas à Pas : Mise en Place et Configuration de Google Firebase pour Tribbu

Ce guide détaille toutes les étapes nécessaires pour créer, configurer et sécuriser votre projet **Google Firebase** pour l'application **Tribbu** (Authentication, Cloud Firestore, Cloud Storage et Règles de sécurité hiérarchiques).

---

## Étape 1 : Créer le projet dans la Console Google Firebase

1. Rendez-vous sur [https://console.firebase.google.com/](https://console.firebase.google.com/) et connectez-vous avec votre compte Google.
2. Cliquez sur **Créer un projet** (*Add project*).
3. Nommez le projet **`tribbu`** (ou le nom de votre association) et cliquez sur **Continuer**.
4. Activez ou désactivez *Google Analytics* selon votre préférence, puis cliquez sur **Créer le projet**.
5. Une fois le projet provisionné, cliquez sur **Continuer** pour accéder au tableau de bord Firebase.

---

## Étape 2 : Enregistrer l'application Web et récupérer les clés `.env.local`

1. Sur la page d'accueil de votre projet Firebase, cliquez sur l'icône **Web (`</>`)** pour ajouter une application.
2. Saisissez le surnom de l'application : **`Tribbu PWA`** (ne cochez pas *Firebase Hosting* puisque le déploiement se fait sur Vercel).
3. Cliquez sur **Enregistrer l'application**.
4. Firebase affiche un objet `firebaseConfig`. Copiez ces valeurs dans un fichier **`.env.local`** à la racine de `D:\Takk\App\Tribbu` (en prenant modèle sur `.env.example`) :

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=votre-projet-tribbu.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre-projet-tribbu
VITE_FIREBASE_STORAGE_BUCKET=votre-projet-tribbu.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
VITE_APP_URL=http://localhost:5173
```

---

## Étape 3 : Configurer Firebase Authentication (E-mail / Mot de passe & Invitations)

1. Dans le menu latéral gauche de la console Firebase, ouvrez **Création > Authentication** puis cliquez sur **Commencer** (*Get started*).
2. Dans l'onglet **Sign-in method** (*Mode de connexion*), cliquez sur **Adresse e-mail/Mot de passe**.
3. Activez le premier bouton **Adresse e-mail/Mot de passe** (`Enabled`) et cliquez sur **Enregistrer**.
4. Allez dans l'onglet **Paramètres > Domaines autorisés** (*Authorized domains*) :
   - `localhost` est déjà présent par défaut.
   - Lorsque vous déploierez sur Vercel, ajoutez votre domaine `votre-app.vercel.app`.

### Fonctionnement SaaS Multi-Associations, Création Initiale et Invitations :
- **Création initiale d'une nouvelle association (1er membre) :** Lorsqu'une nouvelle association arrive sur Tribbu, aucune donnée la concernant n'existe encore. Depuis la page initiale SaaS (`/`), le 1er membre crée son compte (`email` / `password`) et son association (**seul le nom est obligatoire** ; descriptif, adresse postale, téléphone général et e-mail général sont optionnels). Il en devient automatiquement le **Grand Manitou** et obtient une URL dédiée `/<slug>` (tout en minuscule, sans accents ni espaces, ex. `/les-eclaireurs-des-alpes`).
- **Cloisonnement strict Multi-Associations :** Chaque entité (`grande_tribbu`, `tribbus`, `tippis`, `feux_de_camp`, `canaux`, `membres_roles`, `messages`) porte `grande_tribbu_id`. Les règles Firestore (`isMemberOfGrandeTribbu(gtId)` et `isManitouOfGrandeTribbu(gtId)`) garantissent que les membres d'une association ne peuvent jamais voir ni interagir avec les Tribbus, Tippis ou membres d'une autre association.
- **Membres existants :** Connexion directe sur `/<slug>` via `signInWithEmailAndPassword` avec leur paire e-mail / mot de passe.
- **Nouveaux membres invités :** Le Grand Manitou ou un(e) Chef(fe) de Tribbu génère une URL d'invitation incluant le slug de l'association (`/<slug>?invite_token=...&email=...&tribbu_id=...`). En cliquant sur ce lien, l'invité saisit son mot de passe **2 fois**, ce qui crée son compte Firebase Auth (`createUserWithEmailAndPassword`), génère son profil dans `profiles/{uid}` et valide automatiquement son affiliation dans `membres_roles`.

---

## Étape 4 : Créer la base de données temps réel Cloud Firestore

1. Dans le menu latéral gauche, ouvrez **Création > Firestore Database** puis cliquez sur **Créer une base de données**.
2. Choisissez l'emplacement géographique le plus proche de vos utilisateurs (ex. **`eur3 (europe-west)`** ou **`europe-west9 (Paris)`**).
3. Démarrez en **Mode Production** puis cliquez sur **Créer**.

### 4.1. Structure des Collections Firestore de Tribbu
L'application utilise automatiquement les 11 collections suivantes :
- `profiles` : Profils des membres (`id`, `email`, `display_name`, `phone_number`, `sms_notifications_enabled`, `global_role`, `tribbu_ids`, `chef_tribbu_ids`, `last_seen_at`).
- `grande_tribbu` : Identité globale de l'association et `manitou_id`.
- `tribbus` : Groupes / Commissions rattachés à la Grande Tribbu.
- `tippis` : Sous-groupes rattachés à une `tribbu_id` avec la liste `member_ids`.
- `feux_de_camp` : Discussions privées ou petits groupes avec la liste `participant_ids`.
- `canaux` : Canaux de discussion (`GRANDE_TRIBBU_ANNONCES`, `AGORA_GENERALE`, `TRIBBU_ANNONCES`, `TRIBBU_AGORA`, `TIPPI`, `FEU_DE_CAMP`).
- `membres_roles` : Rôles (`MANITOU`, `CHEF`, `PYGMEE`) et tokens d'invitation.
- `messages` : Messages en temps réel contenant `content`, `reply_to_message_id`, `quoted_excerpt`, `mentioned_user_ids` & `mentioned_names` (pour les citations `<@nom_personne>`), et `attachments`.
- `emargements` : Confirmations de lecture (*Read receipts*) sur les annonces descendantes.
- `canal_lectures` : Horodatage de lecture par canal et par membre pour le calcul des non-lus.
- `presence` : Présence en direct (qui a le canal en focus et qui est en train d'écrire).

### 4.2. Publier les Règles de Sécurité Firestore (`firestore.rules`)
1. Dans **Firestore Database**, ouvrez l'onglet **Règles** (*Rules*).
2. Copiez l'intégralité du fichier local `firebase/firestore.rules` et collez-le dans l'éditeur.
3. Cliquez sur **Publier**.

> Ces règles appliquent strictement la hiérarchie : seuls le **Grand Manitou** et les **Chef(fe)s** peuvent écrire dans `'GRANDE_TRIBBU_ANNONCES'`, les **Pygmées** ne lisent que leurs Tribbus et Tippis vérifiés, et les **Feux de camp** sont isolés pour leurs participants.

### 4.3. Créer les Index Composites (`firestore.indexes.json`)
Dans l'onglet **Index** de Firestore (ou via la CLI Firebase `firebase deploy --only firestore:indexes`), ajoutez les index composites définis dans `firebase/firestore.indexes.json` :
- Collection `messages` : `canal_id` (Croissant) + `created_at` (Croissant)
- Collection `messages` : `mentioned_user_ids` (Arrays) + `created_at` (Décroissant)

---

## Étape 5 : Configurer Firebase Cloud Storage (Images & PDF)

1. Dans le menu latéral gauche, ouvrez **Création > Storage** puis cliquez sur **Commencer**.
2. Choisissez le même emplacement européen que Firestore.
3. Ouvrez l'onglet **Règles** (*Rules*) de Storage.
4. Copiez le contenu du fichier local `firebase/storage.rules` et collez-le dans l'éditeur, puis cliquez sur **Publier**.

> Cette règle autorise uniquement l'upload de fichiers `.png`, `.jpg`, `.jpeg` et `.pdf` jusqu'à **10 Mo** dans `chat-attachments/{canalId}/{userId}/{fileName}` par des membres authentifiés.

---

## Étape 6 : (Optionnel) Déployer les règles en une commande avec Firebase CLI

Si vous préférez déployer les règles et index depuis votre terminal local :

```powershell
# 1. Installer Firebase CLI globalement
npm install -g firebase-tools

# 2. Se connecter à Google Firebase
firebase login

# 3. Associer le dossier local à votre projet Firebase
firebase use --add

# 4. Déployer les règles Firestore, les index et les règles Storage
firebase deploy --only firestore,storage
```

