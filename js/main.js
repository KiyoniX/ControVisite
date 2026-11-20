// Point d'entrée : garde l'état (zone, véhicule, énergie), charge les données et relie les morceaux.
import { CONFIG } from "./config.js";
import { chargerCentres } from "./api.js";
import { nommerPoint } from "./geocodage.js";
import { TropDeRequetes } from "./reseau.js";
import { classer } from "./selection.js";
import { afficherClassement, surligner } from "./classement.js";
import { creerCarte } from "./carte.js";
import { creerControlesZone } from "./zone.js";
import { el, heure, montant } from "./format.js";

const $ = (id) => document.getElementById(id);
const CLE_MEMOIRE = "controvisite";

const etat = {
  ...etatInitial(), // zone {lat, lon, rayonKm, nom}, vehicule, energie
  centres: [], // centres de la zone pour ce véhicule et cette énergie
  luA: null,
};

const carte = creerCarte($("carte"), {
  surClicCentre: (id) => surligner($("classement"), id),
  surDeplacerCentre: ({ lat, lon }) => changerZone({ lat, lon, nom: null }, { ajuster: false }),
});

const controles = creerControlesZone({
  surRayonProvisoire: (km) => carte.apercuRayon(km),
  surRayon: (km) => changerZone({ rayonKm: km }),
  surLieu: (lieu) => changerZone(lieu),
  surErreur: message,
});

// ---------- État, adresse de la page et mémoire du navigateur ----------

function vehiculeDe(id) {
  return CONFIG.vehicules.find((v) => v.id === id) ?? null;
}

/** Véhicule et énergie valides ; l'énergie retombe sur la première du véhicule si elle ne lui va pas. */
function filtreValide(vehicule, energie) {
  const v = vehiculeDe(vehicule) ?? vehiculeDe(CONFIG.filtreParDefaut.vehicule);
  return { vehicule: v.id, energie: v.energies.includes(energie) ? energie : v.energies[0] };
}

function bornerRayon(km) {
  return Math.min(CONFIG.rayon.maxKm, Math.max(CONFIG.rayon.minKm, Math.round(km)));
}

function zoneValide(zone) {
  if (!zone || !Number.isFinite(zone.lat) || !Number.isFinite(zone.lon)) return null;
  return { lat: zone.lat, lon: zone.lon, rayonKm: bornerRayon(zone.rayonKm || CONFIG.zoneParDefaut.rayonKm), nom: zone.nom ?? null };
}

/** Adresse de la page : #vehicule=1&energie=2&lat=45.777&lon=3.087&rayon=10 */
function lireAdresse() {
  const p = new URLSearchParams(location.hash.slice(1));
  const zone = zoneValide({ lat: parseFloat(p.get("lat")), lon: parseFloat(p.get("lon")), rayonKm: parseFloat(p.get("rayon")) });
  const vehicule = parseInt(p.get("vehicule"), 10);
  return { zone, filtre: vehiculeDe(vehicule) ? filtreValide(vehicule, parseInt(p.get("energie"), 10)) : null };
}

/** Priorité : adresse de la page, puis dernière visite, puis réglages par défaut. */
function etatInitial() {
  let memoire = {};
  try {
    memoire = JSON.parse(localStorage.getItem(CLE_MEMOIRE)) ?? {};
  } catch {}
  const adresse = lireAdresse();
  const filtre =
    adresse.filtre ??
    (vehiculeDe(memoire.vehicule) ? filtreValide(memoire.vehicule, memoire.energie) : { ...CONFIG.filtreParDefaut });
  return { zone: adresse.zone ?? zoneValide(memoire.zone) ?? { ...CONFIG.zoneParDefaut }, ...filtre };
}

/** Écrit l'état dans l'adresse (lien partageable, précision ~100 m) et dans le navigateur. */
function memoriser() {
  const { lat, lon, rayonKm } = etat.zone;
  const parametres = new URLSearchParams({
    vehicule: etat.vehicule,
    energie: etat.energie,
    lat: lat.toFixed(3),
    lon: lon.toFixed(3),
    rayon: rayonKm,
  });
  history.replaceState(null, "", `#${parametres}`);
  try {
    localStorage.setItem(CLE_MEMOIRE, JSON.stringify({ zone: etat.zone, vehicule: etat.vehicule, energie: etat.energie }));
  } catch {}
}

// ---------- Actions ----------

function changerZone(partiel, { ajuster = true } = {}) {
  etat.zone = { ...etat.zone, ...partiel };
  memoriser();
  carte.afficherZone(etat.zone, { ajuster });
  controles.majRayon(etat.zone.rayonKm);
  chargerBientot();
}

function changerFiltre(vehicule, energie) {
  Object.assign(etat, filtreValide(vehicule, energie));
  memoriser();
  afficherFiltres();
  charger(); // le cache rend ce changement instantané si cette combinaison a déjà été vue
}

// Tampon : on attend que la zone ne bouge plus avant de charger.
let minuterie = null;
function chargerBientot() {
  clearTimeout(minuterie);
  message("Chargement des prix…");
  minuterie = setTimeout(() => {
    charger();
    if (etat.zone.nom == null) nommerZone();
  }, CONFIG.reseau.attenteDeplacementMs);
}

let controleur = null;
async function charger({ ageMaxMs } = {}) {
  controleur?.abort();
  controleur = new AbortController();
  const { signal } = controleur;
  const { zone, vehicule, energie } = etat;
  document.body.classList.add("chargement");
  message("Chargement des prix…");
  try {
    const { centres, luA } = await chargerCentres({ centre: zone, rayonKm: zone.rayonKm, vehicule, energie, signal, ageMaxMs });
    etat.centres = centres;
    etat.luA = luA;
    afficher();
  } catch (erreur) {
    if (signal.aborted) return;
    console.error(erreur);
    message(
      erreur instanceof TropDeRequetes
        ? "Trop de demandes en peu de temps : réessaie dans une minute."
        : "Impossible de lire les prix pour le moment. Réessaie dans quelques minutes.",
    );
  } finally {
    if (!signal.aborted) document.body.classList.remove("chargement");
  }
}

/** Donne un nom lisible à une zone placée à la main (« rue Blatin, Clermont-Ferrand »). */
async function nommerZone() {
  const zone = etat.zone;
  let nom = null;
  try {
    nom = await nommerPoint(zone);
  } catch {}
  if (etat.zone !== zone) return; // la zone a encore bougé entre-temps
  zone.nom = nom ?? "ce point";
  memoriser();
  if (etat.luA) afficher();
}

// ---------- Affichage ----------

function message(texte) {
  $("resume").textContent = texte;
}

function afficher() {
  const selection = classer(etat.centres);
  afficherResume(selection);
  afficherClassement($("classement"), selection, { surVoir: voirSurCarte });
  carte.afficherCentres(selection);
}

/** Liste des véhicules et boutons des énergies du véhicule choisi. */
function afficherFiltres() {
  const liste = $("vehicule");
  if (!liste.options.length) {
    liste.replaceChildren(...CONFIG.vehicules.map((v) => el("option", { value: v.id }, v.nom)));
    liste.addEventListener("change", () => changerFiltre(Number(liste.value), etat.energie));
  }
  liste.value = etat.vehicule;

  const energies = vehiculeDe(etat.vehicule).energies;
  $("energies").hidden = energies.length < 2; // 2-roues, quads… : une seule énergie, rien à choisir
  $("energies").replaceChildren(
    ...energies.map((id) =>
      el(
        "button",
        { type: "button", class: "onglet", "aria-pressed": String(id === etat.energie), onclick: () => changerFiltre(etat.vehicule, id) },
        CONFIG.energies[id],
      ),
    ),
  );
}

function afficherResume({ centres, min, max }) {
  const { rayonKm, nom } = etat.zone;
  const contexte = `${rayonKm} km autour de ${nom ?? "ce point"} · prix lus à ${heure(etat.luA)}`;

  if (centres.length === 0) {
    $("resume").replaceChildren(
      el("span", { class: "chiffres" }, "Aucun centre ne déclare de prix pour ce véhicule ici."),
      el("span", { class: "contexte" }, contexte),
    );
    return;
  }
  $("resume").replaceChildren(
    el(
      "span",
      { class: "chiffres" },
      el("strong", {}, centres.length > 1 ? `${centres.length} centres` : "1 centre"),
      ` · de ${montant(min)} à ${montant(max)}`,
      max > min && ` · jusqu'à ${montant(max - min)} d'écart`,
    ),
    el("span", { class: "contexte" }, contexte),
  );
}

// ---------- Vue mobile : liste ou carte ----------

function changerVue(vue, { recadrer = true } = {}) {
  document.body.dataset.vue = vue;
  $("bascule").textContent = vue === "carte" ? "☰ Liste" : "🗺️ Carte";
  carte.redimensionner(); // la carte était masquée : elle doit recalculer sa taille
  if (vue === "carte" && recadrer) carte.afficherZone(etat.zone);
}

function voirSurCarte(id) {
  changerVue("carte", { recadrer: false });
  carte.montrer(id);
}

// ---------- Démarrage ----------

function demarrer() {
  $("lien-depot").href = CONFIG.depot;
  $("bascule").addEventListener("click", () => changerVue(document.body.dataset.vue === "carte" ? "liste" : "carte"));
  $("actualiser").addEventListener("click", () => charger({ ageMaxMs: CONFIG.reseau.actualiserApresSecondes * 1000 }));
  window.addEventListener("hashchange", () => {
    const { zone, filtre } = lireAdresse();
    if (filtre) Object.assign(etat, filtre);
    afficherFiltres();
    if (zone) changerZone(zone);
    else charger();
  });

  afficherFiltres();
  carte.afficherZone(etat.zone);
  controles.majRayon(etat.zone.rayonKm);
  memoriser();
  charger();
  if (etat.zone.nom == null) nommerZone();
}

demarrer();
