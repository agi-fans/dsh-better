![Démonstration en direct de /better dans dsh-better](demo.gif)

# Approfondissement de prompt (`dsh-better`)

`dsh-better` apporte à DeepSeek Harness l’approfondissement de prompts ancré dans le dépôt (`/better`) et la vérification des briefs de sous-agents inspirés de [`pi-better`](https://github.com/nicobailon/pi-better).

1. Lancez `/better <brouillon>` — l’éditeur reste disponible immédiatement pendant qu’un assistant en lecture seule inspecte le dépôt en arrière-plan.
2. Suivez `Explorer → Identifier → Approfondir → Affiner` — le panneau Depth affiche les outils et le flux en temps réel tout en réutilisant le cache KV.
3. Relisez avant d’envoyer — le prompt approfondi remplit la zone de saisie avec **Rétablir l’original** en un clic ; rien n’est envoyé avant `Entrée`.

## Référence des paramètres (adaptée de `pi-better`)

Dans le `pi-better` d’origine, la configuration utilise `"better"` avec `model` et `thinking`. `dsh-better` assure la parité complète et ajoute la gestion des sous-agents :

| Paramètre | Défaut | Description |
| --- | --- | --- |
| `model` | `null` (hériter de la session) | Route de modèle (`provider/model`) ou groupe de routage utilisé par `/better`. Hériter du modèle actif réutilise le cache KV du prompt ; forcer un autre modèle privilégie la qualité dédiée ou le coût. |
| `reasoningEffort` | `null` (`low` rapide par défaut) | Équivalent du paramètre `thinking` de `pi-better` (`none`, `off`, `low`, `medium`, `high`, `max` ou `inherit`). Utilise `low` rapide par défaut (tout en conservant le cache KV) et s’aligne sur le modèle. |
| `checkSubagents` | `true` | Active ou désactive la vérification préalable des tâches de sous-agents préfixées par `/better`. |
| `briefModel` | `null` (identique à `model`) | Modèle dédié optionnel uniquement pour la vérification `/better` des sous-agents. |
| `briefReasoningEffort` | `null` (identique à `reasoningEffort`) | Effort de raisonnement dédié optionnel pour la vérification `/better` des sous-agents. |

## Comment configurer dans DeepSeek Harness

1. **Fenêtre Paramètres** : Ouvrez **Paramètres → Approfondir le prompt** en bas à gauche (enregistrement automatique).
2. **Page Plugins** : Ouvrez **Plugins → Approfondissement de prompt (`@agi-fans/dsh-better`)** (ou configurez la ligne `@agi-fans/dsh-better#dsh-better`).
3. **Commande slash (`/better-model`)** : Consultez ou modifiez la configuration depuis n’importe quel chat ou CLI :
   - `/better-model` — afficher les paramètres actuels et les modèles disponibles
   - `/better-model <provider/model> [effort]` — définir le modèle et l’effort optionnel
   - `/better-model effort <level|inherit>` — modifier uniquement l’effort de raisonnement
   - `/better-model brief <same|inherit|<provider/model>> [effort]` — configurer le modèle de vérification des sous-agents
   - `/better-model subagents <on|off>` — activer/désactiver la vérification des sous-agents à chaud
   - `/better-model reset [all]` — réinitialiser l’héritage de session (ou tous les champs)

Les modifications GUI et `/better-model` sont persistées atomiquement dans `dsh-better.settings.json` du profil actif et s’appliquent immédiatement sans redémarrage. Les valeurs par défaut sont définies dans `cordis.patch.yml`.
