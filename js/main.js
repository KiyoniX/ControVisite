// Point d'entrée de ControVisite : état (zone, véhicule, énergie), chargement et affichage.
// Les briques génériques (carte, zone, chargement, mémoire, vue mobile) sont dans js/base/.
import { CONFIG } from "./config.js";
import { chargerCentres } from "./api.js";
import { classer } from "./selection.js";
import { afficherClassement } from "./classement.js";
import { pointsCarte } from "./marqueurs.js";
import { creerCarte } from "./base/carte.js";
import { creerChargeur } from "./base/chargeur.js";
import { creerControlesZone } from "./base/controles-zone.js";
import { el, heure, montant } from "./base/format.js";
import { nommerPoint } from "./base/geocodage.js";
import { surligner } from "./base/liste.js";
import { creerMemoire, ecrireParametresPage, lireParametresPage } from "./base/memoire.js";
import { creerVueMobile } from "./base/vue-mobile.js";
import { parametresDeZone, zoneDepuisParametres, zoneValide } from "./base/zone.js";

const $ = (id) => document.getElementById(id);
const memoire = creerMemoire(CONFIG.site.cleMemoire);

const etat = {
  ...etatInitial(), // zone {lat, lon, rayonKm, nom}, vehicule, energie
  centres: [], // centres de la zone pour ce véhicule et cette énergie
  luA: null, // heure de lecture des prix
};

const carte = creerCarte($("carte"), {
  surClicPoint: (id) => surligner($("classement"), id),
  surDeplacerCentre: ({ lat, lon }) => changerZone({ lat, lon, nom: null }, { ajuster: false }),
});

const controles = creerControlesZone({
  surRayonProvisoire: (km) => carte.apercuRayon(km),
  surRayon: (km) => changerZone({ rayonKm: km }),
  surLieu: (lieu) => changerZone(lieu),
  surErreur: message,
});

const chargeur = creerChargeur({
  charger: (signal, { ageMaxMs } = {}) =>
    chargerCentres({ centre: etat.zone, rayonKm: etat.zone.rayonKm, vehicule: etat.vehicule, energie: etat.energie, signal, ageMaxMs }),
  surResultat: ({ centres, luA }) => {
    etat.centres = centres;
    etat.luA = luA;
    afficher();
    if (etat.zone.nom == null) nommerZone();
  },
  surMessage: message,
});

const vue = creerVueMobile({ bouton: $("bascule"), carte, surCarteAffichee: () => carte.afficherZone(etat.zone) });

// ---------- État : adresse de la page et mémoire du navigateur ----------

function vehiculeDe(id) {
  return CONFIG.vehicules.find((v) => v.id === id) ?? null;
}

/** Véhicule et énergie valides ; l'énergie retombe sur la première du véhicule si elle ne lui va pas. */
function filtreValide(vehicule, energie) {
  const v = vehiculeDe(vehicule) ?? vehiculeDe(CONFIG.filtreParDefaut.vehicule);
  return { vehicule: v.id, energie: v.energies.includes(energie) ? energie : v.energies[0] };
}

/** Filtre lu dans l'adresse de la page (#vehicule=1&energie=2&…), ou null. */
function filtreDepuisParametres(p) {
  const vehicule = parseInt(p.get("vehicule"), 10);
  return vehiculeDe(vehicule) ? filtreValide(vehicule, parseInt(p.get("energie"), 10)) : null;
}

/** Priorité : adresse de la page, puis dernière visite, puis réglages par défaut. */
function etatInitial() {
  const p = lireParametresPage();
  const m = memoire.lire();
  const filtre =
    filtreDepuisParametres(p) ?? (vehiculeDe(m.vehicule) ? filtreValide(m.vehicule, m.energie) : { ...CONFIG.filtreParDefaut });
  return { zone: zoneDepuisParametres(p) ?? zoneValide(m.zone) ?? { ...CONFIG.zoneParDefaut }, ...filtre };
}

function memoriser() {
  ecrireParametresPage({ vehicule: etat.vehicule, energie: etat.energie, ...parametresDeZone(etat.zone) });
  memoire.ecrire({ zone: etat.zone, vehicule: etat.vehicule, energie: etat.energie });
}

// ---------- Actions ----------

function changerZone(partiel, { ajuster = true } = {}) {
  etat.zone = { ...etat.zone, ...partiel };
  memoriser();
  carte.afficherZone(etat.zone, { ajuster });
  controles.majRayon(etat.zone.rayonKm);
  chargeur.lancerBientot(); // tampon : on attend que la zone ne bouge plus
}

function changerFiltre(vehicule, energie) {
  Object.assign(etat, filtreValide(vehicule, energie));
  memoriser();
  afficherFiltres();
  chargeur.lancer(); // instantané si cette combinaison est déjà en cache
}

/** Donne un nom lisible à une zone placée à la main (« rue Blatin, Clermont-Ferrand »). */
async function nommerZone() {
  const zone = etat.zone;
  const nom = await nommerPoint(zone).catch(() => null);
  if (etat.zone !== zone) return; // la zone a encore bougé entre-temps
  zone.nom = nom ?? "ce point";
  memoriser();
  afficher();
}

// ---------- Affichage ----------

function message(texte) {
  $("resume").textContent = texte;
}

function afficher() {
  const selection = classer(etat.centres);
  afficherResume(selection);
  afficherClassement($("classement"), selection, { surVoir: vue.montrerSurCarte });
  carte.afficherPoints(pointsCarte(selection));
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

  const chiffres =
    centres.length === 0
      ? ["Aucun centre ne déclare de prix pour ce véhicule ici."]
      : [
          el("strong", {}, centres.length > 1 ? `${centres.length} centres` : "1 centre"),
          ` · de ${montant(min)} à ${montant(max)}`,
          max > min && ` · jusqu'à ${montant(max - min)} d'écart`,
        ];
  $("resume").replaceChildren(el("span", { class: "chiffres" }, chiffres), el("span", { class: "contexte" }, contexte));
}

// ---------- Démarrage ----------

function demarrer() {
  $("lien-depot").href = CONFIG.site.depot;
  $("actualiser").addEventListener("click", () => chargeur.lancer({ ageMaxMs: CONFIG.reseau.actualiserApresSecondes * 1000 }));
  window.addEventListener("hashchange", () => {
    const p = lireParametresPage();
    Object.assign(etat, filtreDepuisParametres(p) ?? {});
    afficherFiltres();
    const zone = zoneDepuisParametres(p);
    if (zone) changerZone(zone);
    else chargeur.lancer();
  });

  afficherFiltres();
  carte.afficherZone(etat.zone);
  controles.majRayon(etat.zone.rayonKm);
  memoriser();
  chargeur.lancer();
}

demarrer();
