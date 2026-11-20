// Tout ce qu'on peut vouloir changer se trouve ici.
export const CONFIG = {
  // Zone affichée à la première visite (ensuite : celle de l'adresse de la page, ou la dernière utilisée).
  zoneParDefaut: { lat: 45.7772, lon: 3.087, rayonKm: 10, nom: "la place de Jaude, Clermont-Ferrand" },
  rayon: { minKm: 1, maxKm: 50 },

  // Catégories de véhicules du jeu de données (cat_vehicule_id) et énergies proposées pour chacune.
  vehicules: [
    { id: 1, nom: "Voiture", energies: [1, 2, 4, 5, 3] },
    { id: 2, nom: "4x4", energies: [1, 2, 4, 5, 3] },
    { id: 4, nom: "Camionnette", energies: [1, 2, 4, 5, 3] },
    { id: 5, nom: "Camping-car (< 3,5 t)", energies: [1, 2, 4, 5, 3] },
    { id: 3, nom: "Voiture de collection", energies: [1, 2, 4, 5, 3] },
    { id: 7, nom: "Moto", energies: [6] },
    { id: 6, nom: "Cyclomoteur", energies: [6] },
    { id: 9, nom: "Quad", energies: [6] },
    { id: 8, nom: "Tricycle, side-car", energies: [6] },
    { id: 10, nom: "Voiturette", energies: [6] },
  ],
  // Énergies du jeu de données (cat_energie_id). L'id 6 = « toutes énergies » des 2-roues, quads…
  energies: { 1: "Essence", 2: "Diesel", 4: "Hybride", 5: "Électrique", 3: "Gaz", 6: "Toutes énergies" },
  filtreParDefaut: { vehicule: 1, energie: 1 },

  prixAncienJours: 365, // au-delà, le prix est signalé comme ancien (beaucoup datent de 2020)

  // Tampon contre les limites des API (prix : 50 000 requêtes/jour par visiteur ; adresses : 50/s).
  reseau: {
    cacheMinutes: 30, // les prix changent rarement : une zone chargée est réutilisée pendant ce temps
    actualiserApresSecondes: 60, // « Actualiser » réutilise les prix s'ils ont moins de 60 s
    attenteDeplacementMs: 500, // délai après le dernier déplacement de la zone avant de charger
    attenteSaisieMs: 350, // délai après la dernière frappe avant de chercher une adresse
    ecartPrixMs: 200, // écart minimal entre deux requêtes à l'API des prix
    ecartAdresseMs: 150, // écart minimal entre deux requêtes à l'API des adresses
    tentatives: 3, // essais en cas de réponse 429 (trop de requêtes)
  },

  depot: "https://github.com/KiyoniX/ControVisite",

  api: "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-controle-technique/records",
  geocodage: "https://data.geopf.fr/geocodage", // API Adresse de l'IGN (Géoplateforme)
  tuiles: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
};
