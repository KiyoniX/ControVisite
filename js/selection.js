// Logique pure : ordre et rang des centres. Aucun accès au DOM (testée dans tests/selection.test.js).
import { CONFIG } from "./config.js";
import { classerParPrix } from "./base/liste.js";

const JOUR = 24 * 3600 * 1000;

/**
 * @returns {{ centres, min, max }}
 *   centres : du moins cher au plus cher (à prix égal, le plus proche d'abord), avec `rang`
 */
export function classer(centres) {
  const classes = classerParPrix(centres, (c) => c.prix);
  return {
    centres: classes,
    min: classes.length ? classes[0].prix : null,
    max: classes.length ? classes.at(-1).prix : null,
  };
}

/** Vrai si le prix a été déclaré il y a plus de CONFIG.prixAncienJours jours (ou à une date inconnue). */
export const estAncien = (date, maintenant = new Date()) => !date || maintenant - date > CONFIG.prixAncienJours * JOUR;
