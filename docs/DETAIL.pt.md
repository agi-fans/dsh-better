![Demonstração ao vivo do /better no dsh-better](demo.gif)

# Aprofundador de prompts (`dsh-better`)

`dsh-better` traz para o DeepSeek Harness o aprofundamento de prompts ancorado no repositório (`/better`) e a verificação de briefs de subagentes do [`pi-better`](https://github.com/nicobailon/pi-better).

1. Envie `/better <rascunho>` — o editor é liberado na hora enquanto um assistente somente leitura analisa o repositório em segundo plano.
2. Acompanhe `Explorar → Mapear → Aprofundar → Refinar` — a barra Depth exibe badges de ferramentas e streaming ao vivo reaproveitando o cache KV.
3. Revise antes de enviar — o prompt aprofundado preenche a caixa de texto com o botão **Restaurar original** e só é enviado ao pressionar `Enter`.

## Referência de configurações (adaptada de `pi-better`)

No `pi-better` original, as opções ficam em `"better"` com `model` e `thinking`. O `dsh-better` mantém paridade completa e adiciona controles para subagentes:

| Opção | Padrão | Descrição |
| --- | --- | --- |
| `model` | `null` (herdar sessão) | Rota de modelo (`provider/model`) ou grupo de roteamento usado por `/better`. Herdar o modelo ativo da conversa reutiliza o cache KV de prompt; fixar outro modelo prioriza qualidade ou menor custo. |
| `reasoningEffort` | `null` (`low` rápido por padrão) | Equivalente ao ajuste `thinking` do `pi-better` (`none`, `off`, `low`, `medium`, `high`, `max` ou `inherit`). Usa `low` rápido por padrão (mantendo o cache KV) e alinha-se aos níveis do modelo. |
| `checkSubagents` | `true` | Ativa ou desativa a verificação prévia de tarefas de subagentes iniciadas com `/better`. |
| `briefModel` | `null` (mesmo que `model`) | Modelo dedicado opcional apenas para verificação de briefs `/better` de subagentes. |
| `briefReasoningEffort` | `null` (mesmo que `reasoningEffort`) | Esforço de raciocínio dedicado opcional apenas para verificação de briefs `/better` de subagentes. |

## Como configurar no DeepSeek Harness

1. **Janela de Configurações**: Abra **Configurações → Aprofundar prompt** no menu inferior esquerdo (salvamento automático).
2. **Página de Plugins**: Abra **Plugins → Aprofundador de prompts (`@agi-fans/dsh-better`)** (ou configure a linha `@agi-fans/dsh-better#dsh-better`).
3. **Comando (`/better-model`)**: Consulte ou altere diretamente em qualquer chat ou CLI:
   - `/better-model` — exibir configurações atuais e modelos disponíveis
   - `/better-model <provider/model> [effort]` — definir modelo e esforço opcional
   - `/better-model effort <level|inherit>` — alterar apenas o esforço de raciocínio
   - `/better-model brief <same|inherit|<provider/model>> [effort]` — configurar modelo de verificação de subagentes
   - `/better-model subagents <on|off>` — alternar a verificação de subagentes em tempo real
   - `/better-model reset [all]` — voltar para herança da sessão (ou redefinir tudo)

As alterações pela interface ou `/better-model` são salvas de forma atômica no `dsh-better.settings.json` do perfil ativo e entram em vigor imediatamente sem reiniciar. Os padrões iniciais ficam em `cordis.patch.yml`.
