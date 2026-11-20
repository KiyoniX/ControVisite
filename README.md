# ControVisite

Classement des centres de contrôle technique les moins chers autour de n'importe quel point de France, avec une carte, le prix de la contre-visite, le téléphone et un lien Google Maps pour chaque centre. On choisit sa zone en cherchant une adresse, avec « Autour de moi » ou en déplaçant le cercle sur la carte, on règle le rayon (1 à 50 km), puis le véhicule et l'énergie.

**Site : https://kiyonix.github.io/ControVisite/**

- Les prix viennent du [jeu de données prix-controle-technique](https://data.economie.gouv.fr/explore/dataset/prix-controle-technique/) de la DGCCRF : chaque centre déclare ses tarifs par type de véhicule et par énergie.
- La page les lit **en direct depuis le navigateur** : pas de serveur, pas de base de données. Un site statique sur GitHub Pages suffit.
- Chaque prix affiche sa date de déclaration. Au-delà d'un an, il est signalé en orange : beaucoup de centres n'ont rien mis à jour depuis 2020.
- La zone, le véhicule et l'énergie sont dans l'adresse de la page (`#vehicule=1&energie=2&lat=45.777&lon=3.087&rayon=10`), pour partager un lien direct. Le navigateur retient aussi le dernier choix.
- Un tampon limite les requêtes : cache de 30 minutes par zone et par véhicule, délais d'attente, espacement et nouveaux essais (réglages `reseau` de `js/config.js`).
- Sur mobile, on bascule entre la liste et la carte avec un bouton flottant.

Construit à partir de [RadEssence](https://github.com/KiyoniX/RadEssence) (prix des carburants), mais indépendant.

## Structure

Pas de framework ni d'étape de build : du HTML, du CSS et des modules JavaScript.

| Fichier | Rôle |
|---|---|
| `js/config.js` | **Tous les réglages** : identité, zone par défaut, rayon, véhicules et énergies, seuil d'ancienneté, tampon réseau |
| `js/api.js` | Lit l'API officielle (avec cache par zone) et met chaque centre au même format |
| `js/selection.js` | Logique pure : trie et classe les centres (aucun accès au DOM) |
| `js/classement.js` | Contenu des fiches du classement |
| `js/marqueurs.js` | Ce que la carte montre pour chaque centre (couleur, bulle) |
| `js/main.js` | Point d'entrée : état (zone, véhicule, énergie), adresse de la page, liaison des morceaux |
| `js/base/` | Briques génériques : carte, zone, chargement, mémoire, vue mobile, réseau, formats, structure des fiches |
| `css/base.css` | Styles de base : mise en page, thème sombre automatique, mobile en bas du fichier |
| `css/site.css` | **Identité du site** : couleur d'accent et couleur de la zone |
| `logo.svg` | Logo, aussi utilisé comme icône d'onglet |
| `tests/` | Tests de la logique (`npm test`) |

## Modifier

**Changer la zone affichée à la première visite** : `zoneParDefaut` dans `js/config.js`.

**Changer l'ordre ou les noms des véhicules** : la liste `vehicules` de `js/config.js`. `id` est la catégorie du jeu de données (`cat_vehicule_id`), `energies` les énergies proposées (`cat_energie_id`).

**Changer le seuil « prix ancien »** : `prixAncienJours` dans `js/config.js`.

**Changer les polices** : le lien Bunny Fonts dans `index.html`, puis `--police` et `--police-titre` dans `css/base.css`.

## Bon à savoir sur les données

- Le jeu de données n'a pas de champ géographique : la page demande à l'API le carré qui entoure le cercle (`latitude`, `longitude`), puis garde ce qui est vraiment dans le cercle.
- Un centre est identifié par son SIRET d'établissement.
- Les promotions en ligne et les tarifs réservés sur internet ne sont pas dans les données.

## Développer

Aucune dépendance à installer : il suffit de Node.js 20 ou plus récent (pour les tests) et de Python (pour le serveur local).

```sh
npm run local      # serveur local sur http://localhost:8000 (les modules JS ne marchent pas en ouvrant index.html directement)
npm test           # tests de la logique (tri, rangs, formats, zone), aussi lancés par GitHub Actions à chaque push
```

### Organisation du code

`js/base/` contient les briques génériques : carte, zone, chargement, mémoire du navigateur, vue mobile, réseau, formats et structure des fiches. Le reste est propre au site : `config.js`, `api.js` (lecture des données), `selection.js` (tri), `classement.js` (contenu des fiches), `marqueurs.js` (contenu de la carte) et `main.js` (état et liaison).
Les modules de `js/base/` lisent dans `config.js` les clés `zoneParDefaut`, `rayon`, `reseau`, `geocodage` et `tuiles`.

## Mettre en ligne

GitHub → **Settings → Pages → Build and deployment** : *Deploy from a branch*, branche `main`, dossier `/ (root)`. Chaque push sur `main` met le site à jour en une minute environ.

## Forker

Un fork marche tel quel : active GitHub Pages sur ton dépôt (voir « Mettre en ligne ») et le site sera sur `https://<ton-pseudo>.github.io/<nom-du-dépôt>/`. Tous les chemins sont relatifs.

**Te l'approprier** (nom, couleurs, logo) :

| Quoi | Où |
|---|---|
| Nom, slogan, description, couleur de la barre du navigateur | `index.html` : `<title>`, `<meta name="description">`, `<meta name="theme-color">`, `<h1>` et le `<p>` qui le suit |
| Couleurs | `css/site.css` |
| Logo et icône d'onglet | `logo.svg` |
| Lien « Code source » et clé de stockage du navigateur | `site` dans `js/config.js` (change `cleMemoire` pour ne pas mélanger tes réglages avec ceux du site d'origine) |
| Zone de la première visite | `zoneParDefaut` dans `js/config.js` |

**Brancher une autre source de données** (autre type de prix, autre pays…) : réécris `js/api.js` pour qu'il renvoie des objets `{ id, lat, lon, distance, … }`, puis adapte `selection.js`, `classement.js` et `marqueurs.js`. La carte, la zone, le tampon réseau, la mémoire et la vue mobile (`js/base/`) n'ont pas à changer.

## Licence

Code sous licence MIT (voir `LICENSE`). Données : DGCCRF, [Licence Ouverte](https://www.etalab.gouv.fr/licence-ouverte-open-licence/). Adresses : IGN Géoplateforme. Fond de carte : © contributeurs OpenStreetMap.
