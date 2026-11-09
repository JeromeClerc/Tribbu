# Guide Pas à Pas : Déploiement Automatique sur Vercel (Git Push)

Ce guide explique comment connecter votre dépôt Git **Tribbu** à **Vercel** afin que chaque `git push` sur la branche `main` déploie automatiquement une nouvelle version de la PWA en production connectée à **Google Firebase**.

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

## Étape 3 : Configurer les Variables d'Environnement Firebase

Avant de cliquer sur *Deploy*, dépliez la section **Environment Variables** et ajoutez les variables suivantes pour les environnements *Production*, *Preview* et *Development* :

| Nom de la variable | Exemple de valeur | Description |
| :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | `AIzaSy...` | Clé API Web Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | `votre-projet.firebaseapp.com` | Domaine d'authentification Firebase |
| `VITE_FIREBASE_PROJECT_ID` | `votre-projet` | Identifiant du projet Firebase |
| `VITE_FIREBASE_STORAGE_BUCKET` | `votre-projet.firebasestorage.app` | Bucket Firebase Cloud Storage |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456789012` | Identifiant d'expéditeur Firebase |
| `VITE_FIREBASE_APP_ID` | `1:123456789012:web:abcdef...` | Identifiant de l'application Web |
| `VITE_APP_URL` | `https://votre-domaine.vercel.app` | URL publique utilisée pour générer les liens d'invitation |

---

## Étape 4 : Lancer le premier déploiement

1. Cliquez sur **Deploy**.
2. Vercel installe les dépendances, compile le code TypeScript en mode strict, génère le bundle Vite ainsi que le Service Worker PWA (`sw.js`), puis publie l'application sur son réseau Edge mondial.
3. Une fois terminé (environ 45 secondes), copiez l'URL de production (ex. `https://tribbu.vercel.app`).

---

## Étape 5 : Autoriser le domaine Vercel dans Google Firebase

Pour que l'authentification Firebase et les liens d'invitation fonctionnent sur votre domaine Vercel :
1. Ouvrez la [Console Firebase](https://console.firebase.google.com/) > **Authentication > Paramètres > Domaines autorisés**.
2. Cliquez sur **Ajouter un domaine** et saisissez `tribbu.vercel.app` (ainsi que votre domaine personnalisé si vous en utilisez un).
3. Cliquez sur **Ajouter**.

---

## Étape 6 : Déploiement continu au `git push`

Désormais, votre pipeline CI/CD est actif :
- Tout `git push origin main` déclenche automatiquement un déploiement en **Production** sur Vercel.
- Toute Pull Request ou branche secondaire génère une **Preview URL** dédiée pour tester vos modifications sur mobile et desktop avant mise en production.
