# 🏕️ Tribbu — Plateforme Collaborative Hiérarchique en Temps Réel (PWA • Google Firebase)

Application web Progressive (PWA) conçue en français pour la communication interne des associations, propulsée par **React 19, TypeScript, Tailwind CSS et Google Firebase** (Authentication, Cloud Firestore, Cloud Storage).

---

## ✨ Fonctionnalités Clés

- **Hiérarchie Associative Complète :**
  - **La Grande Tribbu :** Canal d'annonces officielles descendantes (publication réservée au *Grand Manitou* et aux *Chef(fe)s* avec bouton d'**émargement** obligatoire pour les membres) + **Agora Générale** ouverte à tous.
  - **Les Tribbus (Commissions/Groupes) :** Chaque commission possède son canal d'annonces et sa propre Agora.
  - **Les Tippis (Sous-groupes projets) :** Créés par les Chef(fe)s de Tribbu pour travailler en sous-groupe sans parasiter l'Agora.
  - **Les Feux de camp :** Petits groupes ou discussions directes que tout membre (*Pygmée*, *Chef* ou *Grand Manitou*) peut créer à tout niveau.
- **Mentions Explicites `<@nom_personne>` :**
  - Tapez `@` ou `<@` (ou cliquez sur l'icône `@` dans la zone de saisie) pour citer un membre avec autocomplétion (`<@Prénom Nom>`).
  - Les messages où vous êtes cité(e) sont mis en évidence visuellement et accessibles en un clic via le filtre **`@ Mes mentions`** dans l'en-tête ainsi que dans le tiroir de notifications.
- **Citations d'Extraits, Liens & Pièces Jointes :**
  - Surlignez une partie d'un message avant de cliquer sur *Répondre* pour citer uniquement cet extrait.
  - Conversion automatique des URLs en liens cliquables et partage de fichiers `.jpg`, `.png` et `.pdf`.

---

## 🚀 Démarrage Rapide

```powershell
# 1. Installer les dépendances
npm install

# 2. Lancer le serveur de développement (http://localhost:5173)
npm run dev

# 3. Compiler et vérifier le build de production + PWA
npm run build
```

---

## 📚 Documentation de Livraison (`docs/`)

1. [Configuration pas à pas de Google Firebase (Auth, Firestore, Storage, Security Rules)](./docs/01-FIREBASE-SETUP.md)
2. [Initialisation du dépôt Git et premiers commits](./docs/02-GIT-SETUP.md)
3. [Déploiement continu sur Vercel au `git push`](./docs/03-VERCEL-DEPLOYMENT.md)
