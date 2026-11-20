// Carte Leaflet (variable globale L, chargée par index.html).
import { CONFIG } from "./config.js";
import { texteContreVisite } from "./classement.js";
import { couleurPrix, depuis, el, lienGoogleMaps, montant, telephoneLisible } from "./format.js";

const BLEU_ZONE = "#0b6bcb";

/**
 * Crée la carte dans `conteneur`.
 *   surClicCentre(id)              clic sur un centre
 *   surDeplacerCentre({lat, lon})  clic sur la carte ou point central déplacé
 * Renvoie { afficherZone, apercuRayon, afficherCentres, montrer, redimensionner }.
 */
export function creerCarte(conteneur, { surClicCentre, surDeplacerCentre }) {
  const { lat, lon } = CONFIG.zoneParDefaut;
  const carte = L.map(conteneur).setView([lat, lon], 12);
  L.tileLayer(CONFIG.tuiles.url, { attribution: CONFIG.tuiles.attribution, maxZoom: 19 }).addTo(carte);
  ajouterLegende(carte);

  // La zone : un cercle et un point central qu'on peut faire glisser.
  const cercle = L.circle([lat, lon], {
    radius: 1000,
    color: BLEU_ZONE,
    weight: 2,
    dashArray: "6 6",
    fillOpacity: 0.04,
    interactive: false,
  }).addTo(carte);
  const pointCentral = L.marker([lat, lon], {
    draggable: true,
    autoPan: true,
    zIndexOffset: 1000,
    title: "Fais-moi glisser pour déplacer la zone",
    icon: L.divIcon({ className: "centre-zone", iconSize: [22, 22] }),
  }).addTo(carte);
  pointCentral.on("drag", () => cercle.setLatLng(pointCentral.getLatLng()));
  pointCentral.on("dragend", () => {
    const { lat, lng } = pointCentral.getLatLng();
    surDeplacerCentre({ lat, lon: lng });
  });

  // Un clic sur la carte déplace la zone, sauf s'il sert juste à fermer une bulle.
  let derniereFermeture = 0;
  carte.on("popupclose", () => (derniereFermeture = Date.now()));
  carte.on("click", (e) => {
    if (Date.now() - derniereFermeture < 400) return;
    surDeplacerCentre({ lat: e.latlng.lat, lon: e.latlng.lng });
  });

  const calque = L.layerGroup().addTo(carte);
  const marqueurs = new Map();

  /** Place le cercle ; `ajuster` recadre la carte dessus. */
  function afficherZone({ lat, lon, rayonKm }, { ajuster = true } = {}) {
    cercle.setLatLng([lat, lon]).setRadius(rayonKm * 1000);
    pointCentral.setLatLng([lat, lon]);
    if (ajuster) carte.fitBounds(cercle.getBounds(), { padding: [10, 10] });
  }

  /** Change seulement la taille du cercle (pendant que le curseur bouge). */
  function apercuRayon(rayonKm) {
    cercle.setRadius(rayonKm * 1000);
  }

  function afficherCentres(selection) {
    calque.clearLayers();
    marqueurs.clear();
    // Du plus cher au moins cher : les centres les moins chers sont dessinés par-dessus.
    for (const c of [...selection.centres].reverse()) {
      const marqueur = L.circleMarker([c.lat, c.lon], {
        radius: c.rang === 1 ? 11 : 8,
        color: "#fff",
        weight: 2,
        fillColor: couleurPrix(c.prix, selection),
        fillOpacity: 1,
        bubblingMouseEvents: false,
      })
        .bindTooltip(`${montant(c.prix)} · ${c.nom}`, { direction: "top" })
        .bindPopup(() => bulle(c))
        .on("click", () => surClicCentre(c.id))
        .addTo(calque);
      marqueurs.set(c.id, marqueur);
    }
  }

  function montrer(id) {
    const marqueur = marqueurs.get(id);
    if (!marqueur) return;
    carte.flyTo(marqueur.getLatLng(), Math.max(carte.getZoom(), 15), { duration: 0.6 });
    marqueur.openPopup();
  }

  /** À appeler quand la carte change de taille ou redevient visible (bascule mobile). */
  const redimensionner = () => carte.invalidateSize();

  return { afficherZone, apercuRayon, afficherCentres, montrer, redimensionner };
}

/** Contenu de la bulle d'un centre. */
function bulle(c) {
  const contreVisite = texteContreVisite(c.contreVisite);
  return el(
    "div",
    { class: "bulle" },
    el("strong", {}, c.nom),
    el("br"),
    `${c.adresse}, ${c.cp} ${c.ville}`,
    el("br"),
    el("span", { class: "bulle-prix" }, montant(c.prix)),
    c.prixDepuis && ` · déclaré ${depuis(c.prixDepuis)}`,
    contreVisite && [el("br"), contreVisite],
    el("br"),
    el("a", { href: lienGoogleMaps(c), target: "_blank", rel: "noopener" }, "Google Maps ↗"),
    c.tel && [" · ", el("a", { href: `tel:${c.tel}` }, telephoneLisible(c.tel))],
  );
}

function ajouterLegende(carte) {
  const legende = L.control({ position: "bottomleft" });
  legende.onAdd = () =>
    el("div", { class: "legende" }, el("span", { class: "degrade" }), el("span", {}, "moins cher → plus cher"));
  legende.addTo(carte);
}
