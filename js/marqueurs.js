// Ce que la carte montre pour chaque centre : couleur, taille, infobulle et bulle (voir js/base/carte.js).
import { texteContreVisite } from "./classement.js";
import { couleurPrix, depuis, el, lienGoogleMaps, montant, telephoneLisible } from "./base/format.js";

/** Points de la carte, du plus cher au moins cher : les moins chers sont dessinés par-dessus. */
export function pointsCarte(selection) {
  return [...selection.centres].reverse().map((c) => ({
    id: c.id,
    lat: c.lat,
    lon: c.lon,
    couleur: couleurPrix(c.prix, selection),
    taille: c.rang === 1 ? 11 : 8,
    infobulle: `${montant(c.prix)} · ${c.nom}`,
    bulle: () => bulle(c),
  }));
}

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
