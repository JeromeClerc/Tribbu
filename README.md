# 🏕️ Tribbu — Plateforme Collaborative Hiérarchique en Temps Réel (PWA)

Application web Progressive (PWA) conçue en français pour la communication interne des associations selon une hiérarchie claire et sécurisée :
- **La Grande Tribbu :** Canal d'annonces officielles descendantes (publication réservée au *Grand Manitou* et aux *Chef(fe)s* avec bouton d'**émargement** obligatoire pour les membres) + **Agora Générale** ouverte à tous.
- **Les Tribbus (Commissions/Groupes) :** Chaque commission possède son canal d'annonces et sa propre Agora.
- **Les Tippis (Sous-groupes projets) :** Créés par les Chef(fe)s de Tribbu pour travailler en sous-groupe sans parasiter l'Agora.
- **Les Feux de camp :** Petits groupes ou discussions directes que tout membre (*Pygmée*, *Chef* ou *Grand Manitou*) peut créer à tout niveau.

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

> **Mode Démonstration Interactif intégré :** Si vous n'avez pas encore renseigné de fichier `.env.local` Supabase, l'application démarre immédiatement avec un jeu de données associatif complet et un sélecteur de rôle en haut de l'écran (**Grand Manitou**, **Chef de Tribbu**, **Pygmée**) synchronisé en temps réel entre vos onglets navigateur !

---

## 📚 Documentation de Livraison (`docs/`)

1. [Configuration pas à pas de Supabase (SQL DDL, RLS, Auth, Storage, Realtime)](./docs/01-SUPABASE-SETUP.md)
2. [Initialisation du dépôt Git et premiers commits](./docs/02-GIT-SETUP.md)
3. [Déploiement continu sur Vercel au `git push`](./docs/03-VERCEL-DEPLOYMENT.md)

