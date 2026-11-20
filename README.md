# ControVisite

Classement des centres de contrôle technique les moins chers autour de n'importe quel point de France, avec une carte, le prix de la contre-visite, le téléphone et un lien Google Maps pour chaque centre. On choisit sa zone en cherchant une adresse, avec « Autour de moi » ou en déplaçant le cercle sur la carte, on règle le rayon (1 à 50 km), puis le véhicule et l'énergie.

**Site : https://kiyonix.github.io/ControVisite/**

- Les prix viennent du [jeu de données prix-controle-technique](https://data.economie.gouv.fr/explore/dataset/prix-controle-technique/) de la DGCCRF : chaque centre déclare ses tarifs par type de véhicule et par énergie.
- La page les lit **en direct depuis le navigateur** : pas de serveur, pas de base de données. Un site statique sur GitHub Pages suffit.
- Chaque prix affiche sa date de déclaration. Au-delà d'un an, il est signalé en orange : beaucoup de centres n'ont rien mis à jour depuis 2020.
- La zone, le véhicule et l'énergie sont dans l'adresse de la page (`#vehicule=1&energie=2&lat=45.777&lon=3.087&rayon=10`), pour partager un lien direct. Le navigateur retient aussi le dernier choix.
- Un tampon limite les requêtes : cache de 30 minutes par zone et par véhicule, délais d'attente, espacement et nouveaux essais (réglages `reseau` de `js/config.js`).
- Sur mobile, on bascule entre la liste et la carte avec un bouton flottant.

Projet frère de [RadEssence](https://github.com/KiyoniX/RadEssence) (prix des carburants), dont il reprend la base.

## Structure

Pas de framework ni d'étape de build : du HTML, du CSS et des modules JavaScript.

| Fichier | Rôle |
|---|---|
| `js/config.js` | **Tous les réglages** : zone par défaut, rayon, véhicules et énergies, seuil d'ancienneté, tampon réseau |
| `js/api.js` | Lit l'API officielle (avec cache par zone) et met chaque centre au même format |
| `js/reseau.js` | Passage obligé des requêtes : espacement et nouveaux essais sur erreur 429 |
| `js/geocodage.js` | Recherche d'adresses et nom d'un point (API Adresse de l'IGN) |
| `js/zone.js` | Commandes de la zone : recherche, « Autour de moi », curseur du rayon |
| `js/selection.js` | Logique pure : trie et classe les centres (aucun accès au DOM) |
| `js/classement.js` | Affiche la liste des centres |
| `js/carte.js` | La carte Leaflet (OpenStreetMap, sans clé) |
| `js/format.js` | Petites fonctions : montants, dates relatives, distances, téléphone, création d'éléments |
| `js/main.js` | Point d'entrée : état (zone, véhicule, énergie), adresse de la page, liaison des morceaux |
| `css/style.css` | Styles ; couleurs et polices dans les variables en haut du fichier (thème sombre automatique, mobile en bas) |

## Modifier

**Changer la zone affichée à la première visite** : `zoneParDefaut` dans `js/config.js`.

**Changer l'ordre ou les noms des véhicules** : la liste `vehicules` de `js/config.js`. `id` est la catégorie du jeu de données (`cat_vehicule_id`), `energies` les énergies proposées (`cat_energie_id`).

**Changer le seuil « prix ancien »** : `prixAncienJours` dans `js/config.js`.

**Changer les polices** : le lien Bunny Fonts dans `index.html`, puis `--police` et `--police-titre` dans `css/style.css`.

## Bon à savoir sur les données

- Le jeu de données n'a pas de champ géographique : la page demande à l'API le carré qui entoure le cercle (`latitude`, `longitude`), puis garde ce qui est vraiment dans le cercle.
- Un centre est identifié par son SIRET d'établissement.
- Les promotions en ligne et les tarifs réservés sur internet ne sont pas dans les données.

## Tester en local

Les modules JavaScript ne marchent pas en ouvrant `index.html` directement : il faut un petit serveur.

```sh
python -m http.server 8000
# puis http://localhost:8000
```

## Mettre en ligne

GitHub → **Settings → Pages → Build and deployment** : *Deploy from a branch*, branche `main`, dossier `/ (root)`. Chaque push sur `main` met le site à jour en une minute environ.

## Licence

Code sous licence MIT (voir `LICENSE`). Données : DGCCRF, [Licence Ouverte](https://www.etalab.gouv.fr/licence-ouverte-open-licence/). Adresses : IGN Géoplateforme. Fond de carte : © contributeurs OpenStreetMap.
