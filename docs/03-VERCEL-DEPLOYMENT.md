# Guide Pas à Pas : Déploiement Automatique sur Vercel (Git Push)

Ce guide explique comment connecter votre dépôt Git **Tribbu** à **Vercel** afin que chaque `git push` sur la branche `main` déploie automatiquement une nouvelle version de la PWA en production.

---

## Étape 1 : Importer le projet Git dans Vercel

1. Connectez-vous sur [https://vercel.com/dashboard](https://vercel.com/dashboard) avec votre compte GitHub, GitLab ou Bitbucket.
2. Cliquez sur le bouton **Add New... > Project**.
3. Dans la liste **Import Git Repository**, repérez votre dépôt **`tribbu`** et cliquez sur **Import**.

---

## Étape 2 : Vérifier les paramètres de Build Vite

Vercel détecte automatiquement le framework **Vite**. Vérifiez que les paramètres affichés correspondent à :
- **Framework Preset :** `Vite`
- **Root Directory :** `./`
- **Build Command :** `npm run build` (qui exécute `tsc -b && vite build`)
- **Output Directory :** `dist`
- **Install Command :** `npm install`

> Le fichier `vercel.json` présent à la racine du projet configure déjà automatiquement les règles de réécriture SPA (`rewrites`) et les en-têtes de cache du Service Worker PWA (`sw.js` et `manifest.webmanifest`).

---

## Étape 3 : Configurer les Variables d'Environnement

Avant de cliquer sur *Deploy*, dépliez la section **Environment Variables** et ajoutez les trois variables suivantes pour les environnements *Production*, *Preview* et *Development* :

| Nom de la variable | Valeur | Description |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://votre-projet.supabase.co` | URL de votre projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1Ni...` | Clé publique `anon` Supabase |
| `VITE_APP_URL` | `https://votre-domaine.vercel.app` | URL publique utilisée pour générer les liens d'invitation |

---

## Étape 4 : Lancer le premier déploiement

1. Cliquez sur **Deploy**.
2. Vercel installe les dépendances, compile le code TypeScript en mode strict, génère le bundle Vite ainsi que le Service Worker PWA (`sw.js`), puis publie l'application sur son réseau Edge mondial.
3. Une fois terminé (environ 45 secondes), copiez l'URL de production (ex. `https://tribbu.vercel.app`).

---

## Étape 5 : Autoriser le domaine Vercel dans Supabase Auth

Pour que les liens d'invitation et l'authentification fonctionnent sur votre domaine Vercel :
1. Ouvrez votre Dashboard Supabase > **Authentication > URL Configuration**.
2. Remplacez **Site URL** par `https://tribbu.vercel.app`.
3. Dans **Redirect URLs**, ajoutez :
   - `https://tribbu.vercel.app/**`
   - `https://*-votre-equipe.vercel.app/**` (pour les déploiements de prévisualisation de branches).
4. Cliquez sur **Save**.

---

## Étape 6 : Déploiement continu au `git push`

Désormais, votre pipeline CI/CD est actif :
- Tout `git push origin main` déclenche automatiquement un déploiement en **Production** sur Vercel.
- Toute Pull Request ou branche secondaire génère une **Preview URL** dédiée pour tester vos modifications sur mobile et desktop avant mise en production.

