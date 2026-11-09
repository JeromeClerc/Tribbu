# Guide Pas à Pas : Création du Dépôt Git et Premiers Commits

Ce guide vous accompagne pas à pas pour initialiser le dépôt Git local dans `D:\Takk\App\Tribbu`, effectuer votre premier commit propre et pousser le code vers GitHub, GitLab ou Bitbucket.

---

## Étape 1 : Vérifier le fichier `.gitignore`

Avant d'initialiser Git, assurez-vous que les fichiers sensibles et les dépendances volumineuses sont exclus (déjà configuré dans `.gitignore` à la racine) :
- `node_modules/`
- `dist/`
- `.env` et `.env.local` (ne commitez **jamais** vos clés d'environnement)
- `.vercel/`

---

## Étape 2 : Initialiser le dépôt Git local

Ouvrez un terminal PowerShell dans `D:\Takk\App\Tribbu` et exécutez :

```powershell
# 1. Se placer dans le répertoire du projet
cd D:\Takk\App\Tribbu

# 2. Initialiser le dépôt Git sur la branche principale "main"
git init -b main

# 3. Vérifier l'état des fichiers détectés
git status
```

---

## Étape 3 : Créer le premier commit structuré

Ajoutez l'ensemble des fichiers de l'architecture initiale (code source React/TypeScript, règles de sécurité Google Firebase, icônes PWA et documentation) :

```powershell
# 1. Indexer tous les fichiers du projet
git add .

# 2. Créer le commit initial
git commit -m "feat: initialisation complète de l'application PWA Tribbu (React, TS, Tailwind, Firebase)"
```

---

## Étape 4 : Créer le dépôt distant (GitHub / GitLab) et pousser le code

1. Rendez-vous sur [https://github.com/new](https://github.com/new) (ou votre forge Git préférée).
2. Nommez le dépôt **`tribbu`** (Privé ou Public selon la politique de votre association).
3. **Ne cochez pas** *"Add a README file"* ni *"Add .gitignore"* (car ils existent déjà localement).
4. Cliquez sur **Create repository**.
5. Reliez votre dépôt local au dépôt distant et poussez la branche `main` :

```powershell
# Remplacez <VOTRE-COMPTE> par votre identifiant GitHub
git remote add origin https://github.com/<VOTRE-COMPTE>/tribbu.git

# Vérifier le remote configuré
git remote -v

# Pousser la branche principale vers le serveur distant
git push -u origin main
```

---

## Étape 5 : Bonnes pratiques pour les commits suivants

Pour maintenir un historique Git propre et déclencher proprement les déploiements continus sur Vercel :

```powershell
# Créer une branche pour une évolution
git checkout -b feat/mentions-membres

# Vérifier la compilation TypeScript et le build avant de commiter
npm run build

# Commiter et pousser
git add .
git commit -m "feat(chat): ajout des mentions <@nom_personne> et filtre rapide"
git push origin feat/mentions-membres
```
