![Demostración en vivo de /better en dsh-better](demo.gif)

# Optimizador de prompts (`dsh-better`)

`dsh-better` lleva a DeepSeek Harness la profundización de prompts basada en el código base (`/better`) y la verificación de instrucciones de subagentes de [`pi-better`](https://github.com/nicobailon/pi-better).

1. Ejecuta `/better <borrador>` — el editor queda libre al instante mientras un asistente de solo lectura analiza el repositorio en segundo plano.
2. Sigue `Explorar → Detectar → Profundizar → Pulir` — la barra Depth muestra herramientas en vivo y progreso en streaming reutilizando la caché KV.
3. Revisa antes de enviar — el prompt mejorado aparece en el editor con botón **Restaurar original**; nada se envía hasta pulsar `Enter`.

## Referencia de configuración (adaptada de `pi-better`)

En el `pi-better` original, los ajustes se definen bajo `"better"` con `model` y `thinking`. `dsh-better` ofrece paridad completa y añade controles para subagentes:

| Ajuste | Valor por defecto | Descripción |
| --- | --- | --- |
| `model` | `null` (heredar sesión) | Ruta de modelo (`provider/model`) o grupo de enrutamiento usado por `/better`. Heredar el modelo de la conversación activa reutiliza su caché KV de prompt; fijar otro modelo sacrifica la caché por mayor calidad o menor coste. |
| `reasoningEffort` | `null` (`low` rápido por defecto) | Equivalente a `thinking` en `pi-better` (`none`, `off`, `low`, `medium`, `high`, `max` o `inherit`). Por defecto usa `low` rápido (reutilizando la caché KV) y se ajusta a los niveles del modelo. |
| `checkSubagents` | `true` | Activa o desactiva la verificación previa de prompts de subagentes con el prefijo `/better`. |
| `briefModel` | `null` (igual que `model`) | Modelo específico opcional solo para verificar instrucciones `/better` de subagentes. |
| `briefReasoningEffort` | `null` (igual que `reasoningEffort`) | Esfuerzo de razonamiento opcional solo para verificar instrucciones `/better` de subagentes. |

## Cómo configurar en DeepSeek Harness

1. **Modal de Ajustes**: Abre **Ajustes → Profundizar prompt** en el menú inferior izquierdo (los cambios se guardan automáticamente).
2. **Página de Plugins**: Abre **Plugins → Optimizador de prompts (`@agi-fans/dsh-better`)** (o configura la fila `@agi-fans/dsh-better#dsh-better`).
3. **Comando (`/better-model`)**: Consulta o actualiza ajustes desde cualquier chat o sesión CLI:
   - `/better-model` — mostrar ajustes actuales y modelos disponibles
   - `/better-model <provider/model> [effort]` — fijar modelo y esfuerzo opcional
   - `/better-model effort <level|inherit>` — actualizar solo el esfuerzo de razonamiento
   - `/better-model brief <same|inherit|<provider/model>> [effort]` — configurar modelo para subagentes
   - `/better-model subagents <on|off>` — activar/desactivar la verificación de subagentes en vivo
   - `/better-model reset [all]` — restablecer herencia de sesión (o todos los campos)

Los cambios desde la GUI o `/better-model` se guardan de forma atómica en `dsh-better.settings.json` del perfil activo y surten efecto de inmediato sin reiniciar. Los valores base están en `cordis.patch.yml`.
