// Affichage de la liste des centres.
import { estAncien } from "./selection.js";
import { couleurPrix, depuis, el, kilometres, lienGoogleMaps, montant, telephoneLisible } from "./format.js";

/** Remplit la liste <ol> du classement. `surVoir(id)` montre le centre sur la carte. */
export function afficherClassement(liste, selection, { surVoir }) {
  liste.replaceChildren(...selection.centres.map((c) => ligneCentre(c, selection, surVoir)));
}

/** « contre-visite : 10 € à 30 € », « contre-visite : 15 € » ou null. */
export function texteContreVisite({ mini, maxi }) {
  if (mini == null && maxi == null) return null;
  if (mini == null || maxi == null || mini === maxi) return `contre-visite : ${montant(mini ?? maxi)}`;
  return `contre-visite : ${montant(mini)} à ${montant(maxi)}`;
}

function ligneCentre(c, selection, surVoir) {
  const ecart = c.prix - selection.min;
  const ancien = estAncien(c.prixDepuis);
  const contreVisite = texteContreVisite(c.contreVisite);

  return el(
    "li",
    {
      class: "station",
      "data-id": c.id,
      // Toute la carte est cliquable, sauf ses boutons et liens.
      onclick: (e) => e.target.closest("a, button") || surVoir(c.id),
    },
    el("span", { class: "rang", style: `background: ${couleurPrix(c.prix, selection)}`, "aria-label": `${c.rang}e` }, c.rang),
    el(
      "div",
      { class: "infos" },
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
    ),
    el(
      "div",
      { class: "prix" },
      el("span", { class: "prix-litre" }, montant(c.prix)),
      el("span", { class: ecart > 0 ? "ecart" : "ecart meilleur" }, ecart > 0 ? `+${montant(ecart)}` : "le moins cher"),
    ),
    el(
      "div",
      { class: "actions" },
      el("button", { type: "button", onclick: () => surVoir(c.id) }, "Sur la carte"),
      el("a", { href: lienGoogleMaps(c), target: "_blank", rel: "noopener" }, "Google Maps ↗"),
      c.tel && el("a", { href: `tel:${c.tel}` }, `📞 ${telephoneLisible(c.tel)}`),
      c.site && el("a", { href: c.site, target: "_blank", rel: "noopener nofollow" }, "Site ↗"),
    ),
  );
}

/** Met en évidence un centre de la liste (clic sur la carte). */
export function surligner(liste, id) {
  for (const ligne of liste.children) ligne.classList.toggle("active", ligne.dataset.id === id);
  liste.querySelector(`[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
