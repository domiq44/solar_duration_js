# Consignes pour les tests unitaires

## Structure AAA

- Écrire un `test()` distinct pour chaque règle ou comportement vérifié.
- Organiser chaque test dans cet ordre, avec les marqueurs exacts :
  - `// Given` : préparer les données et l'état initial.
  - `// When` : exécuter le comportement testé.
  - `// Then` : regrouper les assertions sur le résultat.
- Garder un seul sujet par test. Plusieurs assertions sont acceptables si elles vérifient le même résultat.
- Décrire brièvement en français le comportement vérifié dans le nom passé à `test()`.
- Déclarer dans `Given` des constantes nommées pour les entrées et les résultats attendus ; dans `Then`, comparer les résultats à ces constantes plutôt qu'à des valeurs littérales.
- Placer au début du fichier les constantes générales réutilisées par plusieurs tests. Garder dans `Given` les constantes propres à un seul scénario.

## Commentaires et helpers

- Ajouter un commentaire français concis avant chaque fonction ou méthode de test, y compris les helpers et les méthodes des fixtures.
- Définir les helpers, fixtures et classes simulées hors des fonctions de test, de préférence avant les tests qui les utilisent.
- Donner aux helpers un nom qui décrit leur rôle ; ne pas y placer d'assertions propres à un cas de test.
- Conserver les noms `Given`, `When` et `Then` en anglais pour identifier les étapes AAA.

## Vérification

- Exécuter `npm test` après toute modification des tests.
- Exécuter `npm run test:coverage` pour consulter la couverture.
- Interpréter le rapport selon les modules chargés par les tests : le point d'entrée navigateur `src/main.js` n'est pas couvert par le rapport Node et nécessite une vérification dans un navigateur.
- Tester les comportements observables plutôt que d'ajouter des cas uniquement pour augmenter un pourcentage.
