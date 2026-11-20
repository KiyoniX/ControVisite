// Affichage de la liste des centres (la structure d'une fiche est dans js/commun/liste.js).
import { estAncien } from "./selection.js";
import { fiche } from "./commun/liste.js";
import { depuis, el, kilometres, montant, telephoneLisible } from "./commun/format.js";

/** Remplit la liste <ol> du classement. `surVoir(id)` montre le centre sur la carte. */
export function afficherClassement(liste, selection, { surVoir }) {
  liste.replaceChildren(...selection.centres.map((c) => ficheCentre(c, selection, surVoir)));
}

/** « contre-visite : 10 € à 30 € », « contre-visite : 15 € » ou null. */
export function texteContreVisite({ mini, maxi }) {
  if (mini == null && maxi == null) return null;
  if (mini == null || maxi == null || mini === maxi) return `contre-visite : ${montant(mini ?? maxi)}`;
  return `contre-visite : ${montant(mini)} à ${montant(maxi)}`;
}

function ficheCentre(c, selection, surVoir) {
  const ecart = c.prix - selection.min;
  const ancien = estAncien(c.prixDepuis);
  const contreVisite = texteContreVisite(c.contreVisite);

  return fiche({
    element: c,
    selection,
    surVoir,
    infos: [
      el("strong", { class: "nom" }, c.nom),
      el("span", { class: "lieu" }, `${c.adresse}, ${c.ville} · ${kilometres(c.distance)}`),
      el(
        "span",
        { class: "badges" },
        el(
          "span",
          { class: ancien ? "badge alerte" : "badge", title: ancien ? "Ce prix est peut-être dépassé : appelle le centre." : null },
          c.prixDepuis ? `Prix déclaré ${depuis(c.prixDepuis)}` : "Date du prix inconnue",
        ),
        contreVisite && el("span", { class: "badge" }, contreVisite),
      ),
    ],
    prix: [
      el("span", { class: "prix-principal" }, montant(c.prix)),
      el("span", { class: ecart > 0 ? "ecart" : "ecart meilleur" }, ecart > 0 ? `+${montant(ecart)}` : "le moins cher"),
    ],
    actions: [
      c.tel && el("a", { href: `tel:${c.tel}` }, `📞 ${telephoneLisible(c.tel)}`),
      c.site && el("a", { href: c.site, target: "_blank", rel: "noopener nofollow" }, "Site ↗"),
    ],
  });
}
