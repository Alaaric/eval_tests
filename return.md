# Retours et propositions d'amélioration

Problèmes relevés pendant l'écriture des tests, corrections appliquées et pistes d'amélioration.

## Corrections appliquées

1. **Séparation `app.js` / `server.js`.** Avant, `server.js` construisait l'app Express et appelait immédiatement `app.listen()` sans exporter l'app. C'est bloquant pour les tests : Supertest a besoin de l'objet `app` seul (il ouvre lui-même un port éphémère). Sans séparation : (a) l'app n'est pas récupérable faute de `module.exports` ; (b) chaque `require` dans un test ouvrirait le port 5005, provoquant `EADDRINUSE` entre fichiers de test ; (c) le handle réseau resté ouvert empêche Jest de se terminer proprement. `app.js` exporte donc l'app nue, `server.js` se limite au `listen`. Comportement dev/prod inchangé.

## Bugs à corriger

2. **Pas de validation dans `addCD`.** Un champ manquant/invalide provoque une erreur SQL renvoyée en 500. On ne doit pas renvoyer de 500 ici : il faut ajouter une validation et renvoyer 400 à la place.
3. **`deleteCD` renvoie 204 même si l'id n'existe pas** (`rowCount` non vérifié). Proposition : renvoyer 404 si `rowCount === 0`.

4. **Identifiants DB en clair dans les docker-compose.** Proposition : externaliser via variables d'environnement non versionnées.
5. **En-têtes de sécurité HTTP absents** (voir ZAP). Proposition : ajouter `helmet` côté Express et/ou les définir dans nginx.
6. **Dockerfile backend.** `FROM node:lts` (image complète, root), `COPY . .` (embarque `.env`/`node_modules`), `EXPOSE 5000` alors que l'app écoute sur 5005. Propositions : `node:lts-slim` + `USER node`, ajouter un `.dockerignore`, `npm ci --omit=dev`, corriger `EXPOSE 5005`.
7. **Dockerfile frontend.** `nginx:latest` non figé. Proposition : figer (ex. `nginx:1.27-alpine`).

8. **Pas de gestion d'erreur dans `cdService.js` / `AddCD.jsx`.** Une API en échec casse l'UI (rejet de promesse non géré, confirmé en E2E). Proposition : try/catch et remontée d'un état d'erreur.

