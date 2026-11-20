// Lecture des prix des contrôles techniques (DGCCRF, data.economie.gouv.fr), directement depuis le navigateur.
import { CONFIG } from "./config.js";
import { distanceKm, joliTexte } from "./commun/format.js";
import { requeteJson } from "./commun/reseau.js";

const PAR_PAGE = 100; // maximum accepté par l'API
const OFFSET_MAX = 10000; // l'API refuse au-delà

// Seulement les champs utiles : réponses bien plus légères.
const CHAMPS = [
  "cct_siret",
  "cct_denomination",
  "cct_adresse",
  "cct_code_postal",
  "cct_commune",
  "cct_tel",
  "cct_url",
  "latitude",
  "longitude",
  "prix_visite",
  "date_application_visite",
  "prix_contre_visite_mini",
  "prix_contre_visite_maxi",
].join(",");

// Zones déjà téléchargées : { centre, rayonKm, vehicule, energie, centres, lu }.
const cache = [];
const TAILLE_CACHE = 20;

/**
 * Centres du cercle (centre, rayonKm) pour un véhicule et une énergie, avec leur distance au centre.
 * Si une zone récente du cache (même véhicule, même énergie) contient tout le cercle, aucune requête n'est faite.
 * @returns {Promise<{ centres, luA: Date }>}
 */
export async function chargerCentres({ centre, rayonKm, vehicule, energie, signal, ageMaxMs = CONFIG.reseau.cacheMinutes * 60000 }) {
  const maintenant = Date.now();
  let zone = cache.find(
    (z) =>
      z.vehicule === vehicule &&
      z.energie === energie &&
      maintenant - z.lu < ageMaxMs &&
      distanceKm(z.centre, centre) + rayonKm <= z.rayonKm + 0.01,
  );

  if (!zone) {
    const centres = await telecharger(centre, rayonKm, vehicule, energie, signal);
    zone = { centre: { lat: centre.lat, lon: centre.lon }, rayonKm, vehicule, energie, centres, lu: Date.now() };
    cache.unshift(zone);
    cache.length = Math.min(cache.length, TAILLE_CACHE);
  }

  const centres = zone.centres
    .map((c) => ({ ...c, distance: distanceKm(centre, c) }))
    .filter((c) => c.distance <= rayonKm);
  return { centres, luA: new Date(zone.lu) };
}

/**
 * Le jeu de données n'a pas de champ géographique : on demande le carré qui entoure le cercle
 * (latitude/longitude), puis chargerCentres() garde ce qui est vraiment dans le cercle.
 */
function carreAutour({ lat, lon }, rayonKm) {
  const dLat = rayonKm / 111.32;
  const dLon = rayonKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const f = (x) => x.toFixed(5);
  return `latitude >= ${f(lat - dLat)} and latitude <= ${f(lat + dLat)} and longitude >= ${f(lon - dLon)} and longitude <= ${f(lon + dLon)}`;
}

async function telecharger(centre, rayonKm, vehicule, energie, signal) {
  const where = `${carreAutour(centre, rayonKm)} and cat_vehicule_id = ${Number(vehicule)} and cat_energie_id = ${Number(energie)}`;
  const brutes = [];
  for (let offset = 0; offset + PAR_PAGE <= OFFSET_MAX; offset += PAR_PAGE) {
    const url = new URL(CONFIG.api);
    url.search = new URLSearchParams({ where, select: CHAMPS, limit: PAR_PAGE, offset });
    const { results } = await requeteJson(url, { signal, ecartMs: CONFIG.reseau.ecartPrixMs });
    brutes.push(...results);
    if (results.length < PAR_PAGE) break;
  }
  return brutes
    .filter((b) => Number.isFinite(b.latitude) && Number.isFinite(b.longitude) && b.prix_visite != null)
    .map(normaliser);
}

/** Lien du site du centre, sans les paramètres de suivi (utm_…), ou null s'il n'est pas valable. */
function lienPropre(url) {
  if (!url) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    for (const cle of [...u.searchParams.keys()]) if (/^(utm_|y_source)/i.test(cle)) u.searchParams.delete(cle);
    return u.href;
  } catch {
    return null;
  }
}

/** Un centre de l'API → l'objet utilisé partout dans la page. */
function normaliser(brute) {
  return {
    id: brute.cct_siret,
    nom: joliTexte(brute.cct_denomination),
    adresse: joliTexte(brute.cct_adresse),
    cp: brute.cct_code_postal,
    ville: joliTexte(brute.cct_commune),
    tel: brute.cct_tel?.replace(/[^\d+]/g, "") || null,
    site: lienPropre(brute.cct_url),
    lat: brute.latitude,
    lon: brute.longitude,
    prix: brute.prix_visite,
    prixDepuis: brute.date_application_visite ? new Date(brute.date_application_visite) : null,
    contreVisite: { mini: brute.prix_contre_visite_mini ?? null, maxi: brute.prix_contre_visite_maxi ?? null },
  };
}
