# Retours, commentaires et propositions d'amélioration

Ce document recense les problèmes relevés pendant l'écriture des tests, ainsi
que les corrections déjà appliquées et les améliorations proposées.

---

## ✅ Corrections déjà appliquées

### 1. Image PostgreSQL figée (`postgres:latest` → `postgres:17`)
`docker-compose.dev.yml` et `docker-compose.prod.yml` utilisaient `postgres:latest`,
qui pointe désormais vers PostgreSQL 18. Or PG 18 a changé l'emplacement de
stockage des données (`/var/lib/postgresql` au lieu de `/var/lib/postgresql/data`),
ce qui empêchait le conteneur de démarrer avec le volume existant.
**Correction :** version figée sur `postgres:17`.
**Recommandation :** ne jamais utiliser `latest` en base de données — toute montée
de version majeure doit être maîtrisée (migration via `pg_upgrade`).

### 2. Séparation `app.js` / `server.js` (testabilité)
`server.js` créait l'app Express **et** appelait `app.listen()` sans exporter l'app,
la rendant impossible à tester avec Supertest.
**Correction :** l'app est construite et exportée dans `app.js` ; `server.js` se
contente de l'importer et de démarrer le serveur. Comportement dev/prod inchangé.

---

## 🐛 Bugs / comportements à corriger

### 3. Aucune validation des entrées dans `addCD` (→ 500 au lieu de 400)
`POST /api/cds` insère directement `title`, `artist`, `year` sans vérifier leur
présence ni leur type. Un champ manquant ou un `year` non numérique provoque une
**erreur SQL renvoyée en 500**, alors qu'il s'agit d'une faute du client.
**Proposition :** valider le corps de la requête et renvoyer **400 Bad Request**
avec un message clair si un champ est absent ou invalide (ex. via `express-validator`
ou une vérification manuelle).

### 4. `deleteCD` renvoie toujours 204, même si l'id n'existe pas
La suppression ne vérifie pas `result.rowCount`. Supprimer un id inexistant
renvoie `204 No Content` comme si l'opération avait réussi.
**Proposition :** si `rowCount === 0`, renvoyer **404 Not Found**.

### 5. Fuite d'informations dans les réponses d'erreur
Les handlers renvoient `error.message` brut au client (`res.status(500).json({ error: error.message })`).
Cela peut exposer des détails internes (structure SQL, connexion...).
**Proposition :** journaliser l'erreur côté serveur (`console.error` / logger) et
renvoyer au client un message générique (« Erreur interne du serveur »).

### 6. `try/catch` inutile dans `configs/db.js`
Le `try/catch` autour de `new Pool(...)` ne capture rien : le pool `pg` est *lazy*,
la connexion n'est établie qu'à la première requête. Une base injoignable ne
déclenchera donc jamais ce `catch`.
**Proposition :** gérer les erreurs de connexion sur les requêtes (ou via
l'événement `pool.on("error", ...)`), et retirer le `try/catch` trompeur.

---

## ⚠️ Sécurité / configuration

### 7. Fichiers `.env` versionnés
`server/.env` et `client/.env` sont présents dans le dépôt. Même si les valeurs
actuelles sont des identifiants de démo, c'est une mauvaise pratique.
**Proposition :** les ajouter au `.gitignore` et fournir des `*.env.example`
sans valeurs sensibles.

### 8. Identifiants de base de données en clair dans les `docker-compose`
`POSTGRES_USER` / `POSTGRES_PASSWORD` sont écrits en dur.
**Proposition :** les externaliser via des variables d'environnement / un fichier
`.env` non versionné référencé par Compose.

---

## 💡 Améliorations front-end

### 9. `window.location.reload()` après ajout (`Home.jsx`)
Après l'ajout d'un CD, la page entière est rechargée (`onAdd={() => window.location.reload()}`).
C'est un anti-pattern React : perte de l'état, rechargement réseau complet, UX dégradée.
**Proposition :** remonter l'état (lever le rafraîchissement de la liste via un
callback / un state partagé) plutôt que recharger la page.

### 10. Absence de gestion d'erreur dans `cdService.js`
Les appels axios ne gèrent aucune erreur : une API indisponible casse
silencieusement l'UI.
**Proposition :** encapsuler les appels (try/catch) et remonter un état d'erreur
affichable à l'utilisateur.

---

## 🧪 Couverture de tests mise en place

- **Tests unitaires backend** (`cdController`) : base mockée, cas nominaux + cas
  d'erreur (100 % de couverture du contrôleur).
- **Tests unitaires frontend** (`cdService`) : axios mocké.
- **Tests d'intégration** API ↔ DB : Supertest + Testcontainers (PostgreSQL isolé).
- **Tests d'intégration** API ↔ front : contrat du service vérifié.
- **Tests E2E** (Cypress) : ajout, affichage et suppression d'un CD.

Méthodologie : tous les tests suivent la structure **3A (Arrange / Act / Assert)**.
