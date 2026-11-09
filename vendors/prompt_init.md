# Rôle
En tant que prompt engineer, aide moi à rédiger un prompt destiné à Google Antigravity IDE pour créer une application web de zéro.

# Brief

## Description
Développer une application qui permettent aux membres d'une assosciation de communiquer entre eux.
- Il doit être possible de communiquer à plusieurs niveaux :
  - Messages visibles par tous les membres (Grande Tribbu)
  - Messages visibles uniquement par les membres d'une commission/groupes (Tribbu)
  - Messages visibles uniquement par quelques membres qui forment un sous-groupe (Tippi)
  - Messages visibles uniquement entre deux membres (feu de camp)
- Crée cette application dans le dossier courant : D:\Takk\App\Tribbu .
- Le nom de cette application est : Tribbu.
- L'application doit être créée en français.
- L'application doit être responsive.
- Utilise les technologies suivantes :
    - Framework: React.js
    - Language: TypeScript
    - Styling: Tailwind CSS
    - Database: Supabase
    - Déploiement: Vercel 
- Soit organisé, met les fichiers dans les dossiers appropriés
- Sois modulaire, crée des composants réutilisables
- Sois propre, utilise les meilleures pratiques de développement
- Sois moderne, utilise les dernières fonctionnalités de React.js et TypeScript
- Sois sécurisé, utilise les meilleures pratiques de sécurité
- Sois performant, optimise le code pour qu'il soit rapide
- Sois maintenable, crée un code facile à maintenir
- Sois testable, crée un code facile à tester
- Sois documenté, documente le code pour qu'il soit facile à comprendre

## Supabase
Supabase accueillera les fonctionnalités suivantes :
- Login par paire e-mail/mot de passe pour les créateurs de la Tribbu.
  - Login par invitation.
  - Envoi d'une URL avec les tokkens ad-hoc à une e-mail qui devient le login.
  - L'utilisateur clique sur l'URL et saisi un mot de passe 2x pour finaliser sont compte.
  - Il est automatiquement affilié à la Tribbu qui l'a invitée. Ses rôles et droits seront ajuster par après par les cheffes de tribbu.
- Base de données temps réel pour stocker les données utilisateurs.
- Base de données temps réel pour stocker l'organisation des Grande Tribbu, tribbu, tippi, feu de camp, etc...
- Base de données temps réel pour stocker les messages.
- Envoi de notifications sur le téléphone des utilisateurs (par le numéro de téléphone)

# Tribbu

## Rôles / niveaux
Une tribbu a un hiérarchie qui permet de gérer les différents aspects de la tribbu.

### Grand Manitou
Le créateur de la Grande Tribbu.
- Configure la Grande Tribbu.
- Crée/modifie/supprime les sous-tribbus.
- Crée/modifie/supprime des tippi.
- Crée/modifie/supprime des feu de camp.
- Invite/gère/supprime de nouveaux membres.
- Interragit avec toutes les tribbus.
- Interragit avec tous les tippis.
- Interragit avec tous les feux de camps.
- Interragit avec tous les membres.
- Interragit dans l'agora.
- Interragit dans l'agora des Tribbus.

### Chef(fe)(s)
Le(s) responsable(s) d'une Tribbu.
- Modifie sa tribbu.
- Crée/modifie/supprime des tippi.
- Crée/modifie/supprime des feu de camp.
- Invite/gère/rejette de nouveaux membres dans sa tribbu.
- Interragit avec tous les tippis de sa tribbu.
- Interragit avec tous les feux de camps de sa tribbu.
- Interragit avec tous les membres de sa tribbu.
- Interragit dans l'agora.
- Interragit dans l'agora de sa Tribbu.

### Pygmées
Les membres d'une Tribbu.
- Crée/modifie/supprime des feu de camp dans sa tribbu.
- Interragit avec les tippis de sa tribbu dans lesquels il est invité.
- Interragit avec les feux de camps de sa tribbu  dans lesquels il est invité.
- Interragit avec tous les membres de sa tribbu.
- Interragit dans l'agora.
- Interragit dans l'agora de sa Tribbu.

## Niveaux d'interractions

### La Grande Tribbu
C'est l'ensemble des membres. Un canal d'information où seul le Grand Manitou et le(s) Chef(fe)(s) peuvent poster un message qui est visible par tous les membres, qui peuvent juste valider l'avoir lu en cliquant sur un petit bouton.
La Grande Tribbu dispose d'un canal nommé "Agora" où tout le monde peut lire et poster des messages.

### La Tribbu
C'est un sous-groupe de membres (par exemple 'Commission communication'). 
Le(s) Chef(fe)(s) de Tribbu peuvent modérer et poster des messages pour les membres de la Tribbu uniquement.
Le(s) Chef(fe)(s) de Tribbu peuvent créer des "Tippi". Des groupes où on peut échanger entre membres concernés par un sous-projet ou activités spécifiques.
La Tribbu dispose d'un canal nommé "Agora" où tous les membres d'une tribbu peuvent lire et poster des messages.

### Le Tippi
C'est un espace lié à une tribbu où une partie des membres d'une tribbu peuvent échanger sans parasiter le canal général ou l'agora de la Tribbu.

### Le feu de camp
C'est un petit group que n'importe quel pygmée peu créer à n'importe quel niveau de La Grande Tribbu.

## Fonctionnalité des chats
- Taper du texte libre dans un champ textarea.
- Possibilité de mettre des retours à la ligne.
- Possibilité de mettre des liens (si on colle une URL, par exemple. Elle est converti en lien clicable).
- Possibilité d'insérer des smileys.
- Possibilité d'uploader des images .jpg, .png
- Possibilité d'uploader des .pdf
- Possibilité de répondre au message ou partie du message d'un autre utilisateur pour garder du contexte.

## UI / UX
- Le fichier Tribbu_logo.png défini le logo et les couleurs de base de l'application.
- Sur la base de ce fichier génère les logos, icônes et spashscreen pour une application PWA.
- Le design doit être moderne, épuré et facile à utiliser.
- Le design doit être responsive et s'adapter à tous les écrans (desktop, tablette, smartphone).
- Le design doit être sobre et fonctionnel, prévoi un mode sombre.
- En cliquant sur l'icône des notifications, un menu affichant :
  - Les conversations qui ont subi une mutation depuis la dernière connexion.
- Un corps d'application :
  - A gauche : 
    - Liste hiérarchique des tribbus, tippis, agora et feu de camp dans les quels l'utilisateur connecté est impliqué. 
    - Une pastille colorée indique si le canal a subi une mutation depuis la dernière connexion.
    - Le nombre de message non-lus dans le canal.
  - Reste de l'écran : 
    - Un système d'onglets type navigateur où chaque onglet est consacré à une conversation spécifique.
    - Chaque onglet affiche
      - Les utilisateurs qui ont se canal en focus.
      - Les utilisateurs en train d'écrir dans le canal.
- L'interface général doit s'adapter pour tout type d'écran avec un agencement particulier axé sur l'expérience utilisateur pour le mode smartphone.

## Données
- Les données doivent être stockées dans Supabase.
- Les données doivent être synchronisées en temps réel.

## Livraison
- Structure logiciel complète et fonctionnelle.
- Document markdown pas à pas pour la mise en place et la configuration du projet dans Supabase
- Document markdown pas à pas pour la création du dépot GIT et les 1er commit
- Document markdown pas à pas pour la création et la configuration du projet dans Vercel pour le déploiement au Git push.