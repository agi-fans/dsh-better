(() => {
  // src/shared/draft.ts
  function insertIntoDraft(improved, existingDraft) {
    const cleanImproved = improved.trim();
    if (existingDraft.trim().length === 0)
      return cleanImproved;
    return `${cleanImproved}

${existingDraft}`;
  }
  function formatElapsedClock(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  // src/client/locales.ts
  var SUPPORTED_LOCALES = ["en", "zh", "ja", "es", "fr", "de", "ru", "pt"];
  var CLIENT_COPY = {
    en: {
      badge: "/better",
      stages: {
        explore: "Explore",
        surface: "Surface",
        deepen: "Deepen",
        sharpen: "Sharpen"
      },
      cancel: "Cancel",
      cancelling: "Stopping…",
      dismiss: "Dismiss",
      restore: "Restore original",
      deepening: "Deepening",
      readingRepo: "Inspecting repository and session context…",
      starting: "Starting read-only helper…",
      drafting: "Synthesizing",
      chars: "chars",
      done: "Deepened prompt placed in composer — review and press Enter to send.",
      restored: "Restored original draft.",
      cancelledRestored: "Prompt deepening cancelled; original draft restored.",
      cancelled: "Prompt deepening cancelled.",
      failedPrefix: "Deepening failed:",
      fallbackPrefix: "Saved raw reply:",
      rpcUnavailable: "Cannot reach /api/dsh-better on Host (restart DeepSeek Harness to reload plugin)",
      settingsTitle: "Prompt Deepener",
      settingsButton: "Settings",
      rpcHostUnavailable: "Host RPC channel unavailable",
      apply: "Apply",
      customModelOption: "Custom model…",
      modelLabel: "Model",
      modelDesc: "Follows current chat by default to reuse context cache",
      inheritChat: "Follow current chat",
      reasoningEffortLabel: "Reasoning effort",
      noReasoningLevels: "No adjustable levels for selected model",
      defaultEffort: "Low (default · fast)",
      subagentCheckLabel: "Subagent brief check",
      subagentCheckDesc: "Verify paths and symbols in /better subagent tasks",
      briefModelLabel: "Brief check model",
      sameAsAbove: "Same as above",
      briefEffortLabel: "Brief reasoning effort",
      resetDefaults: "Reset to defaults"
    },
    zh: {
      badge: "/better",
      stages: {
        explore: "探索",
        surface: "浮现",
        deepen: "深化",
        sharpen: "打磨"
      },
      cancel: "取消",
      cancelling: "正在取消…",
      dismiss: "关闭",
      restore: "还原原稿",
      deepening: "正在深化",
      readingRepo: "正在检索代码库与上下文…",
      starting: "正在启动只读分析助手…",
      drafting: "正在生成深化内容",
      chars: "字",
      done: "提示词已深化并填入下方输入框，审阅后按 Enter 发送。",
      restored: "已还原原始草稿。",
      cancelledRestored: "已取消提示词深化，原草稿已恢复。",
      cancelled: "已取消提示词深化。",
      failedPrefix: "提示词深化失败：",
      fallbackPrefix: "已保存原始输出：",
      rpcUnavailable: "无法连接宿主 /api/dsh-better 通道（请重启 DeepSeek Harness 以加载新版插件）",
      settingsTitle: "提示词深化",
      settingsButton: "设置",
      rpcHostUnavailable: "宿主 RPC 通道不可用",
      apply: "确定",
      customModelOption: "自定义模型…",
      modelLabel: "深化模型",
      modelDesc: "默认跟随当前对话以复用上下文缓存",
      inheritChat: "跟随当前对话",
      reasoningEffortLabel: "推理强度",
      noReasoningLevels: "当前模型无可选推理档位",
      defaultEffort: "低（默认 · 快速）",
      subagentCheckLabel: "子智能体简报校验",
      subagentCheckDesc: "派发前核实以 /better 开头的子任务路径与符号",
      briefModelLabel: "简报校验模型",
      sameAsAbove: "与深化模型一致",
      briefEffortLabel: "简报校验推理强度",
      resetDefaults: "恢复默认设置"
    },
    ja: {
      badge: "/better",
      stages: {
        explore: "探索",
        surface: "抽出",
        deepen: "深化",
        sharpen: "研磨"
      },
      cancel: "キャンセル",
      cancelling: "停止中…",
      dismiss: "閉じる",
      restore: "元に戻す",
      deepening: "深化中",
      readingRepo: "リポジトリと会話コンテキストを確認中…",
      starting: "読み取り専用ヘルパーを起動中…",
      drafting: "生成中",
      chars: "文字",
      done: "深化されたプロンプトを入力欄に反映しました。確認後 Enter で送信できます。",
      restored: "元の下書きを復元しました。",
      cancelledRestored: "プロンプト深化をキャンセルし、元の下書きを復元しました。",
      cancelled: "プロンプト深化をキャンセルしました。",
      failedPrefix: "深化に失敗しました:",
      fallbackPrefix: "生の応答を保存しました:",
      rpcUnavailable: "ホストの /api/dsh-better に接続できません（DeepSeek Harness を再起動してください）",
      settingsTitle: "プロンプト深化",
      settingsButton: "設定",
      rpcHostUnavailable: "ホスト RPC チャネルが利用できません",
      apply: "適用",
      customModelOption: "カスタムモデル…",
      modelLabel: "モデル",
      modelDesc: "既定では現在の会話モデルを使用してコンテキストキャッシュを再利用します",
      inheritChat: "現在の会話に従う",
      reasoningEffortLabel: "推論強度",
      noReasoningLevels: "選択中のモデルには調整可能な推論レベルがありません",
      defaultEffort: "低（既定・高速）",
      subagentCheckLabel: "サブエージェント指示書チェック",
      subagentCheckDesc: "/better で始まるサブタスクのパスとシンボルを送信前に検証します",
      briefModelLabel: "チェック用モデル",
      sameAsAbove: "上と同じ",
      briefEffortLabel: "チェック用推論強度",
      resetDefaults: "デフォルトに戻す"
    },
    es: {
      badge: "/better",
      stages: {
        explore: "Explorar",
        surface: "Detectar",
        deepen: "Profundizar",
        sharpen: "Pulir"
      },
      cancel: "Cancelar",
      cancelling: "Deteniendo…",
      dismiss: "Cerrar",
      restore: "Restaurar original",
      deepening: "Profundizando",
      readingRepo: "Inspeccionando el repositorio y el contexto de la sesión…",
      starting: "Iniciando asistente de solo lectura…",
      drafting: "Redactando",
      chars: "caracteres",
      done: "Prompt mejorado colocado en el editor; revísalo y pulsa Enter para enviar.",
      restored: "Borrador original restaurado.",
      cancelledRestored: "Se canceló la mejora del prompt y se restauró el borrador original.",
      cancelled: "Se canceló la mejora del prompt.",
      failedPrefix: "Error al profundizar:",
      fallbackPrefix: "Respuesta sin procesar guardada:",
      rpcUnavailable: "No se puede conectar con /api/dsh-better en el host (reinicia DeepSeek Harness para recargar el plugin)",
      settingsTitle: "Profundizar prompt",
      settingsButton: "Ajustes",
      rpcHostUnavailable: "Canal RPC del host no disponible",
      apply: "Aplicar",
      customModelOption: "Modelo personalizado…",
      modelLabel: "Modelo",
      modelDesc: "Por defecto sigue al chat actual para reutilizar la caché de contexto",
      inheritChat: "Seguir el chat actual",
      reasoningEffortLabel: "Esfuerzo de razonamiento",
      noReasoningLevels: "El modelo seleccionado no tiene niveles ajustables",
      defaultEffort: "Bajo (predeterminado · rápido)",
      subagentCheckLabel: "Verificación de subagentes",
      subagentCheckDesc: "Verificar rutas y símbolos en tareas de subagentes con /better",
      briefModelLabel: "Modelo de verificación",
      sameAsAbove: "Igual que arriba",
      briefEffortLabel: "Esfuerzo de verificación",
      resetDefaults: "Restablecer valores"
    },
    fr: {
      badge: "/better",
      stages: {
        explore: "Explorer",
        surface: "Identifier",
        deepen: "Approfondir",
        sharpen: "Affiner"
      },
      cancel: "Annuler",
      cancelling: "Arrêt…",
      dismiss: "Fermer",
      restore: "Rétablir l’original",
      deepening: "Approfondissement",
      readingRepo: "Analyse du dépôt et du contexte de session…",
      starting: "Démarrage de l’assistant en lecture seule…",
      drafting: "Synthèse",
      chars: "caractères",
      done: "Prompt approfondi inséré dans l’éditeur — vérifiez puis appuyez sur Entrée.",
      restored: "Brouillon d’origine rétabli.",
      cancelledRestored: "Approfondissement annulé ; brouillon d’origine rétabli.",
      cancelled: "Approfondissement du prompt annulé.",
      failedPrefix: "Échec de l’approfondissement :",
      fallbackPrefix: "Réponse brute enregistrée :",
      rpcUnavailable: "Impossible de joindre /api/dsh-better sur l’hôte (redémarrez DeepSeek Harness pour recharger le plugin)",
      settingsTitle: "Approfondir le prompt",
      settingsButton: "Paramètres",
      rpcHostUnavailable: "Canal RPC de l’hôte indisponible",
      apply: "Appliquer",
      customModelOption: "Modèle personnalisé…",
      modelLabel: "Modèle",
      modelDesc: "Suit la conversation actuelle par défaut pour réutiliser le cache de contexte",
      inheritChat: "Suivre la conversation",
      reasoningEffortLabel: "Effort de raisonnement",
      noReasoningLevels: "Aucun niveau réglable pour le modèle sélectionné",
      defaultEffort: "Faible (par défaut · rapide)",
      subagentCheckLabel: "Vérification des sous-agents",
      subagentCheckDesc: "Vérifier les chemins et symboles des tâches sous-agent commençant par /better",
      briefModelLabel: "Modèle de vérification",
      sameAsAbove: "Identique ci-dessus",
      briefEffortLabel: "Effort de vérification",
      resetDefaults: "Réinitialiser"
    },
    de: {
      badge: "/better",
      stages: {
        explore: "Erkunden",
        surface: "Erfassen",
        deepen: "Vertiefen",
        sharpen: "Schärfen"
      },
      cancel: "Abbrechen",
      cancelling: "Wird gestoppt…",
      dismiss: "Schließen",
      restore: "Original wiederherstellen",
      deepening: "Wird vertieft",
      readingRepo: "Repository und Sitzungskontext werden geprüft…",
      starting: "Schreibgeschützter Helfer wird gestartet…",
      drafting: "Formulierung",
      chars: "Zeichen",
      done: "Vertiefter Prompt im Eingabefeld eingefügt — prüfen und mit Enter senden.",
      restored: "Ursprünglicher Entwurf wiederhergestellt.",
      cancelledRestored: "Prompt-Vertiefung abgebrochen; ursprünglicher Entwurf wiederhergestellt.",
      cancelled: "Prompt-Vertiefung abgebrochen.",
      failedPrefix: "Vertiefung fehlgeschlagen:",
      fallbackPrefix: "Rohantwort gespeichert:",
      rpcUnavailable: "/api/dsh-better auf dem Host nicht erreichbar (DeepSeek Harness neu starten, um das Plugin zu laden)",
      settingsTitle: "Prompt-Vertiefung",
      settingsButton: "Einstellungen",
      rpcHostUnavailable: "Host-RPC-Kanal nicht verfügbar",
      apply: "Übernehmen",
      customModelOption: "Benutzerdefiniertes Modell…",
      modelLabel: "Modell",
      modelDesc: "Folgt standardmäßig dem aktuellen Chat, um den Kontext-Cache wiederzuverwenden",
      inheritChat: "Aktuellem Chat folgen",
      reasoningEffortLabel: "Denkaufwand",
      noReasoningLevels: "Keine wählbaren Stufen für das ausgewählte Modell",
      defaultEffort: "Niedrig (Standard · schnell)",
      subagentCheckLabel: "Subagent-Briefing prüfen",
      subagentCheckDesc: "Pfade und Symbole in Subagent-Aufgaben mit /better vorab prüfen",
      briefModelLabel: "Prüfmodell",
      sameAsAbove: "Wie oben",
      briefEffortLabel: "Prüf-Denkaufwand",
      resetDefaults: "Standardwerte wiederherstellen"
    },
    ru: {
      badge: "/better",
      stages: {
        explore: "Поиск",
        surface: "Анализ",
        deepen: "Углубление",
        sharpen: "Доводка"
      },
      cancel: "Отмена",
      cancelling: "Остановка…",
      dismiss: "Закрыть",
      restore: "Восстановить исходный",
      deepening: "Углубление",
      readingRepo: "Проверка репозитория и контекста сессии…",
      starting: "Запуск помощника только для чтения…",
      drafting: "Формирование",
      chars: "симв.",
      done: "Углублённый промпт помещён в поле ввода — проверьте и нажмите Enter для отправки.",
      restored: "Исходный черновик восстановлен.",
      cancelledRestored: "Углубление промпта отменено; исходный черновик восстановлен.",
      cancelled: "Углубление промпта отменено.",
      failedPrefix: "Ошибка углубления:",
      fallbackPrefix: "Сырой ответ сохранён:",
      rpcUnavailable: "Не удалось подключиться к /api/dsh-better на хосте (перезапустите DeepSeek Harness)",
      settingsTitle: "Углубление промпта",
      settingsButton: "Настройки",
      rpcHostUnavailable: "Канал RPC хоста недоступен",
      apply: "Применить",
      customModelOption: "Другая модель…",
      modelLabel: "Модель",
      modelDesc: "По умолчанию использует модель текущего чата для переиспользования KV-кэша",
      inheritChat: "Как в текущем чате",
      reasoningEffortLabel: "Уровень рассуждения",
      noReasoningLevels: "Для выбранной модели нет настраиваемых уровней",
      defaultEffort: "Низкий (по умолчанию · быстро)",
      subagentCheckLabel: "Проверка брифов субагентов",
      subagentCheckDesc: "Проверять пути и символы в задачах субагентов с префиксом /better",
      briefModelLabel: "Модель проверки брифов",
      sameAsAbove: "Как основная модель",
      briefEffortLabel: "Уровень рассуждения проверки",
      resetDefaults: "Сбросить настройки"
    },
    pt: {
      badge: "/better",
      stages: {
        explore: "Explorar",
        surface: "Mapear",
        deepen: "Aprofundar",
        sharpen: "Refinar"
      },
      cancel: "Cancelar",
      cancelling: "Parando…",
      dismiss: "Fechar",
      restore: "Restaurar original",
      deepening: "Aprofundando",
      readingRepo: "Inspecionando o repositório e o contexto da sessão…",
      starting: "Iniciando assistente somente leitura…",
      drafting: "Sintetizando",
      chars: "caracteres",
      done: "Prompt aprofundado inserido no editor — revise e pressione Enter para enviar.",
      restored: "Rascunho original restaurado.",
      cancelledRestored: "Aprofundamento cancelado; rascunho original restaurado.",
      cancelled: "Aprofundamento do prompt cancelado.",
      failedPrefix: "Falha ao aprofundar:",
      fallbackPrefix: "Resposta bruta salva:",
      rpcUnavailable: "Não foi possível alcançar /api/dsh-better no host (reinicie o DeepSeek Harness para recarregar o plugin)",
      settingsTitle: "Aprofundar prompt",
      settingsButton: "Configurações",
      rpcHostUnavailable: "Canal RPC do host indisponível",
      apply: "Aplicar",
      customModelOption: "Modelo personalizado…",
      modelLabel: "Modelo",
      modelDesc: "Segue o chat atual por padrão para reutilizar o cache de contexto",
      inheritChat: "Seguir chat atual",
      reasoningEffortLabel: "Esforço de raciocínio",
      noReasoningLevels: "O modelo selecionado não possui níveis ajustáveis",
      defaultEffort: "Baixo (padrão · rápido)",
      subagentCheckLabel: "Verificar briefs de subagentes",
      subagentCheckDesc: "Verificar caminhos e símbolos em tarefas de subagentes iniciadas com /better",
      briefModelLabel: "Modelo de verificação",
      sameAsAbove: "Igual ao acima",
      briefEffortLabel: "Esforço da verificação",
      resetDefaults: "Restaurar padrões"
    }
  };
  function flattenCopy(copy) {
    return {
      badge: copy.badge,
      "stage.explore": copy.stages.explore,
      "stage.surface": copy.stages.surface,
      "stage.deepen": copy.stages.deepen,
      "stage.sharpen": copy.stages.sharpen,
      cancel: copy.cancel,
      cancelling: copy.cancelling,
      dismiss: copy.dismiss,
      restore: copy.restore,
      deepening: copy.deepening,
      readingRepo: copy.readingRepo,
      starting: copy.starting,
      drafting: copy.drafting,
      chars: copy.chars,
      done: copy.done,
      restored: copy.restored,
      cancelledRestored: copy.cancelledRestored,
      cancelled: copy.cancelled,
      failedPrefix: copy.failedPrefix,
      fallbackPrefix: copy.fallbackPrefix,
      rpcUnavailable: copy.rpcUnavailable,
      settingsTitle: copy.settingsTitle,
      settingsButton: copy.settingsButton,
      "settings.rpcHostUnavailable": copy.rpcHostUnavailable,
      "settings.apply": copy.apply,
      "settings.customModelOption": copy.customModelOption,
      "settings.modelLabel": copy.modelLabel,
      "settings.modelDesc": copy.modelDesc,
      "settings.inheritChat": copy.inheritChat,
      "settings.reasoningEffortLabel": copy.reasoningEffortLabel,
      "settings.noReasoningLevels": copy.noReasoningLevels,
      "settings.defaultEffort": copy.defaultEffort,
      "settings.subagentCheckLabel": copy.subagentCheckLabel,
      "settings.subagentCheckDesc": copy.subagentCheckDesc,
      "settings.briefModelLabel": copy.briefModelLabel,
      "settings.sameAsAbove": copy.sameAsAbove,
      "settings.briefEffortLabel": copy.briefEffortLabel,
      "settings.resetDefaults": copy.resetDefaults
    };
  }
  var LOCALE_DICTS = {
    en: flattenCopy(CLIENT_COPY.en),
    zh: flattenCopy(CLIENT_COPY.zh),
    ja: flattenCopy(CLIENT_COPY.ja),
    es: flattenCopy(CLIENT_COPY.es),
    fr: flattenCopy(CLIENT_COPY.fr),
    de: flattenCopy(CLIENT_COPY.de),
    ru: flattenCopy(CLIENT_COPY.ru),
    pt: flattenCopy(CLIENT_COPY.pt)
  };
  function resolveSupportedLocale(localeService) {
    try {
      const raw = typeof localeService?.getSnapshot === "function" ? localeService.getSnapshot()?.active : typeof localeService?.get === "function" ? localeService.get() : typeof navigator !== "undefined" ? navigator.language : "en";
      if (typeof raw !== "string")
        return "en";
      const normalized = raw.trim().toLowerCase();
      if (!normalized)
        return "en";
      if (SUPPORTED_LOCALES.includes(normalized)) {
        return normalized;
      }
      const primary = normalized.split(/[-_]/)[0];
      if (primary && SUPPORTED_LOCALES.includes(primary)) {
        return primary;
      }
      return "en";
    } catch {
      return "en";
    }
  }
  function getClientCopy(localeService) {
    return CLIENT_COPY[resolveSupportedLocale(localeService)];
  }

  // src/client/settings-panel.ts
  var DEFAULT_CONFIG = {
    model: null,
    reasoningEffort: null,
    briefModel: null,
    briefReasoningEffort: null,
    checkSubagents: true
  };
  var FALLBACK_EFFORTS = [
    { id: "none", name: "none" },
    { id: "low", name: "low" },
    { id: "medium", name: "medium" },
    { id: "high", name: "high" },
    { id: "max", name: "max" }
  ];
  var SETTINGS_CSS = `
.dsh-better-settings {
  display: flex;
  flex-direction: column;
  width: 100%;
  color: var(--dsw-alias-label-primary, inherit);
}
.dsh-better-plugin-heading {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: var(--dsw-alias-label-primary, inherit);
}
.dsh-better-rows {
  display: flex;
  flex-direction: column;
  width: 100%;
}
.dsh-better-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 16px 0;
  border-bottom: 0.5px solid var(--dsw-alias-border-l2, rgba(127, 127, 127, 0.16));
}
.dsh-better-rows > .dsh-better-row:last-child {
  border-bottom: none;
}
.dsh-better-row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dsh-better-row-title {
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
  color: var(--dsw-alias-label-primary, inherit);
}
.dsh-better-row-desc {
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-secondary, rgba(127, 127, 127, 0.78));
}
.dsh-better-row-control {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
.dsh-better-select-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
}
.dsh-better-select {
  appearance: none;
  -webkit-appearance: none;
  height: 36px;
  min-width: 188px;
  max-width: 260px;
  padding: 0 34px 0 14px;
  border: none;
  border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-bg-module-platform, rgba(127, 127, 127, 0.12));
  font: inherit;
  font-size: 14px;
  line-height: 22px;
  color: var(--dsw-alias-label-primary, inherit);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (hover: hover) {
  .dsh-better-select:not(:disabled):hover {
    background: var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, 0.18));
  }
}
.dsh-better-select:disabled {
  opacity: 0.5;
  cursor: default;
}
.dsh-better-select-chevron {
  position: absolute;
  right: 12px;
  pointer-events: none;
  color: var(--dsw-alias-label-secondary, inherit);
  display: flex;
  align-items: center;
}
.dsh-better-switch {
  box-sizing: border-box;
  position: relative;
  flex: 0 0 auto;
  width: 36px;
  height: 20px;
  padding: 2px;
  border: 0;
  border-radius: 999px;
  background: var(--dsw-alias-border-l3, rgba(127, 127, 127, 0.35));
  cursor: pointer;
}
.dsh-better-switch[aria-checked='true'] {
  background: var(--dsw-alias-brand-primary, #3b82f6);
}
.dsh-better-switch:disabled {
  cursor: default;
  opacity: 0.5;
}
.dsh-better-switch-thumb {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--dsw-alias-switch-thumb, var(--dsw-alias-label-primary-foreground, #ffffff));
  transition: transform 120ms ease;
}
.dsh-better-switch[aria-checked='true'] .dsh-better-switch-thumb {
  background: var(--dsw-alias-label-primary-foreground, #ffffff);
  transform: translateX(16px);
}
.dsh-better-custom-box {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}
.dsh-better-custom-input {
  height: 32px;
  width: 240px;
  max-width: 100%;
  padding: 0 10px;
  border: 0.5px solid var(--dsw-alias-border-l4, rgba(127, 127, 127, 0.3));
  border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-bg-layer-3, rgba(127, 127, 127, 0.1));
  color: var(--dsw-alias-label-primary, inherit);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  box-sizing: border-box;
}
.dsh-better-inline-btn {
  height: 32px;
  padding: 0 10px;
  border: 0.5px solid var(--dsw-alias-border-l3, rgba(127, 127, 127, 0.25));
  border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-bg-module-platform, transparent);
  color: var(--dsw-alias-label-primary, inherit);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.dsh-better-inline-btn-primary {
  border-color: var(--dsw-alias-brand-primary, #3b82f6);
  background: var(--dsw-alias-brand-primary, #3b82f6);
  color: var(--dsw-alias-label-primary-foreground, #ffffff);
}
.dsh-better-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}
.dsh-better-reset-btn {
  border: none;
  background: none;
  padding: 4px 2px;
  color: var(--dsw-alias-label-secondary, rgba(127, 127, 127, 0.8));
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.dsh-better-reset-btn:hover:not(:disabled) {
  color: var(--dsw-alias-label-primary, inherit);
}
.dsh-better-error {
  margin-top: 6px;
  color: var(--dsw-alias-state-error-primary, #ef4444);
  font-size: 12px;
  line-height: 18px;
}
`;
  function normalizeClientNullable(value) {
    if (typeof value !== "string")
      return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  function isDefaultConfig(config) {
    return config.model === null && config.reasoningEffort === null && config.briefModel === null && config.briefReasoningEffort === null && config.checkSubagents === true;
  }
  function groupModelsByProvider(models) {
    const byProvider = new Map;
    for (const model of models) {
      let group = byProvider.get(model.provider);
      if (!group) {
        group = { providerName: model.providerName, items: [] };
        byProvider.set(model.provider, group);
      }
      group.items.push(model);
    }
    return Array.from(byProvider.entries()).map(([provider, group]) => ({
      provider,
      providerName: group.providerName,
      items: group.items
    }));
  }
  function resolveEffortChoices(selectedModelValue, models, currentEffort) {
    if (selectedModelValue !== null) {
      const matched = models.find((m) => m.value === selectedModelValue || m.model === selectedModelValue);
      if (matched) {
        if (matched.reasoningEfforts.length === 0) {
          return { efforts: [], modelHasNoEfforts: true };
        }
        const list = [...matched.reasoningEfforts];
        if (currentEffort !== null && currentEffort !== "inherit" && !list.some((e) => e.id === currentEffort)) {
          list.push({ id: currentEffort, name: currentEffort });
        }
        return { efforts: list, modelHasNoEfforts: false };
      }
    }
    const merged = new Map;
    for (const opt of FALLBACK_EFFORTS)
      merged.set(opt.id, opt);
    for (const m of models) {
      for (const opt of m.reasoningEfforts) {
        if (!merged.has(opt.id))
          merged.set(opt.id, opt);
      }
    }
    if (currentEffort !== null && currentEffort !== "inherit" && !merged.has(currentEffort)) {
      merged.set(currentEffort, { id: currentEffort, name: currentEffort });
    }
    return { efforts: Array.from(merged.values()), modelHasNoEfforts: false };
  }
  function createBetterSettingsStore(ctx, getCopy) {
    let state = {
      loading: false,
      saving: false,
      loaded: false,
      config: { ...DEFAULT_CONFIG }
    };
    const listeners = new Set;
    let inFlightLoad;
    let mutationGeneration = 0;
    const emit = () => {
      for (const listener of listeners) {
        try {
          listener();
        } catch {}
      }
    };
    const rpcCall = async (endpoint, payload) => {
      if (!ctx?.connection?.rpc?.call) {
        throw new Error(getCopy().rpcHostUnavailable);
      }
      return await ctx.connection.rpc.call("/api", endpoint, payload);
    };
    const load = async (force = false) => {
      if (inFlightLoad && !force)
        return await inFlightLoad;
      const genAtStart = mutationGeneration;
      const task = (async () => {
        state = { ...state, loading: true };
        emit();
        try {
          const res = await rpcCall("dsh-better/settings-get", {});
          if (!res?.ok) {
            throw new Error(res?.error?.message ?? "Failed to load settings");
          }
          const payload = res.value;
          state = {
            ...state,
            loading: false,
            loaded: true,
            payload,
            config: genAtStart === mutationGeneration ? { ...payload.config } : state.config,
            error: undefined
          };
        } catch (err) {
          state = {
            ...state,
            loading: false,
            error: err instanceof Error ? err.message : String(err)
          };
        } finally {
          emit();
        }
      })().finally(() => {
        inFlightLoad = undefined;
      });
      inFlightLoad = task;
      return await task;
    };
    const applyPatch = async (patch) => {
      const gen = ++mutationGeneration;
      const prevConfig = state.config;
      const nextConfig = {
        model: Object.hasOwn(patch, "model") ? normalizeClientNullable(patch.model) : prevConfig.model,
        reasoningEffort: Object.hasOwn(patch, "reasoningEffort") ? normalizeClientNullable(patch.reasoningEffort) : prevConfig.reasoningEffort,
        briefModel: Object.hasOwn(patch, "briefModel") ? normalizeClientNullable(patch.briefModel) : prevConfig.briefModel,
        briefReasoningEffort: Object.hasOwn(patch, "briefReasoningEffort") ? normalizeClientNullable(patch.briefReasoningEffort) : prevConfig.briefReasoningEffort,
        checkSubagents: typeof patch.checkSubagents === "boolean" ? patch.checkSubagents : prevConfig.checkSubagents
      };
      state = {
        ...state,
        saving: true,
        config: nextConfig,
        error: undefined
      };
      emit();
      try {
        const res = await rpcCall("dsh-better/settings-set", { config: nextConfig });
        if (!res?.ok) {
          throw new Error(res?.error?.message ?? "Failed to save settings");
        }
        if (gen !== mutationGeneration)
          return;
        const payload = res.value;
        state = {
          ...state,
          saving: false,
          loaded: true,
          payload,
          config: { ...payload.config },
          error: undefined
        };
      } catch (err) {
        if (gen !== mutationGeneration)
          return;
        state = {
          ...state,
          saving: false,
          config: prevConfig,
          error: err instanceof Error ? err.message : String(err)
        };
      } finally {
        emit();
      }
    };
    const reset = async () => {
      const gen = ++mutationGeneration;
      const prevConfig = state.config;
      state = {
        ...state,
        saving: true,
        config: { ...DEFAULT_CONFIG },
        error: undefined
      };
      emit();
      try {
        const res = await rpcCall("dsh-better/settings-set", { reset: true });
        if (!res?.ok) {
          throw new Error(res?.error?.message ?? "Failed to reset settings");
        }
        if (gen !== mutationGeneration)
          return;
        const payload = res.value;
        state = {
          ...state,
          saving: false,
          loaded: true,
          payload,
          config: { ...payload.config },
          error: undefined
        };
      } catch (err) {
        if (gen !== mutationGeneration)
          return;
        state = {
          ...state,
          saving: false,
          config: prevConfig,
          error: err instanceof Error ? err.message : String(err)
        };
      } finally {
        emit();
      }
    };
    return {
      getState: () => state,
      subscribe(listener) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      load,
      applyPatch,
      reset
    };
  }
  function createChevronSvg(React) {
    const h = React.createElement;
    return h("svg", {
      viewBox: "0 0 16 16",
      width: 14,
      height: 14,
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.6,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true
    }, h("path", { d: "M4 6l4 4 4-4" }));
  }
  function createBetterSettingsPanel(React, store, getCopy, subscribeLocale) {
    const h = React.createElement;
    const { useCallback, useEffect, useState } = React;
    function BetterSettingsForm(props) {
      const copy = getCopy();
      const [tick, setTick] = useState(0);
      const [customField, setCustomField] = useState(null);
      const [customText, setCustomText] = useState("");
      useEffect(() => {
        const bump = () => {
          setTick((v) => v + 1);
        };
        const unsubscribeStore = store.subscribe(bump);
        const unsubscribeLocale = subscribeLocale?.(bump);
        store.load(true);
        return () => {
          unsubscribeStore();
          unsubscribeLocale?.();
        };
      }, []);
      const snapshot = store.getState();
      const models = snapshot.payload?.models ?? [];
      const groups = groupModelsByProvider(models);
      const config = snapshot.config;
      const promptEffortInfo = resolveEffortChoices(config.model, models, config.reasoningEffort);
      const briefEffortInfo = resolveEffortChoices(config.briefModel ?? config.model, models, config.briefReasoningEffort);
      const onReset = useCallback(() => {
        setCustomField(null);
        setCustomText("");
        store.reset();
      }, []);
      const renderSelectControl = (opts) => {
        return h("div", { className: "dsh-better-select-wrap" }, h("select", {
          className: "dsh-better-select",
          "data-dsh-better-field": opts.testId,
          "aria-label": opts.ariaLabel,
          value: opts.value,
          disabled: opts.disabled,
          onChange: (event) => {
            opts.onChange(String(event?.target?.value ?? ""));
          }
        }, opts.children), h("span", { className: "dsh-better-select-chevron" }, createChevronSvg(React)));
      };
      const renderCustomInput = (field) => {
        if (customField !== field)
          return null;
        const commitCustom = () => {
          const val = normalizeClientNullable(customText);
          setCustomField(null);
          setCustomText("");
          if (val !== null) {
            store.applyPatch(field === "model" ? { model: val } : { briefModel: val });
          }
        };
        return h("div", { className: "dsh-better-custom-box" }, h("input", {
          type: "text",
          className: "dsh-better-custom-input",
          "data-dsh-better-field": `${field}-custom`,
          placeholder: "provider/model",
          value: customText,
          onChange: (event) => {
            setCustomText(String(event?.target?.value ?? ""));
          },
          onKeyDown: (event) => {
            if (event?.key === "Enter") {
              event.preventDefault?.();
              commitCustom();
            } else if (event?.key === "Escape") {
              setCustomField(null);
              setCustomText("");
            }
          }
        }), h("button", {
          type: "button",
          className: "dsh-better-inline-btn dsh-better-inline-btn-primary",
          "data-dsh-better-custom-confirm": field,
          onClick: commitCustom
        }, copy.apply), h("button", {
          type: "button",
          className: "dsh-better-inline-btn",
          onClick: () => {
            setCustomField(null);
            setCustomText("");
          }
        }, copy.cancel));
      };
      const renderModelOptions = (inheritLabel, savedValue) => {
        const inCatalog = savedValue !== null && models.some((m) => m.value === savedValue);
        return [
          h("option", { key: "__inherit__", value: "" }, inheritLabel),
          !inCatalog && savedValue !== null ? h("option", { key: `saved:${savedValue}`, value: savedValue }, savedValue) : null,
          ...groups.map((group) => h("optgroup", { key: group.provider, label: group.providerName }, group.items.map((item) => h("option", { key: item.value, value: item.value }, `${item.modelName}${item.badge ? ` · ${item.badge}` : ""}`)))),
          h("option", { key: "__custom__", value: "__custom__" }, copy.customModelOption)
        ];
      };
      const handleModelSelect = (field, val) => {
        if (val === "__custom__") {
          const current = field === "model" ? config.model : config.briefModel;
          setCustomText(current ?? "");
          setCustomField(field);
          return;
        }
        if (customField === field) {
          setCustomField(null);
          setCustomText("");
        }
        const nextVal = val === "" ? null : val;
        store.applyPatch(field === "model" ? { model: nextVal } : { briefModel: nextVal });
      };
      return h("div", {
        className: "dsh-better-settings",
        "data-dsh-better-settings": String(tick)
      }, h("style", null, SETTINGS_CSS), props.isPluginPage ? h("h3", { className: "dsh-better-plugin-heading" }, copy.settingsTitle) : null, h("div", { className: "dsh-better-rows" }, h("div", { className: "dsh-better-row" }, h("div", { className: "dsh-better-row-text" }, h("div", { className: "dsh-better-row-title" }, copy.modelLabel), h("div", { className: "dsh-better-row-desc" }, copy.modelDesc), renderCustomInput("model")), h("div", { className: "dsh-better-row-control" }, renderSelectControl({
        testId: "model",
        value: config.model ?? "",
        ariaLabel: copy.modelLabel,
        children: renderModelOptions(copy.inheritChat, config.model),
        onChange: (val) => handleModelSelect("model", val)
      }))), h("div", { className: "dsh-better-row" }, h("div", { className: "dsh-better-row-text" }, h("div", { className: "dsh-better-row-title" }, copy.reasoningEffortLabel), promptEffortInfo.modelHasNoEfforts ? h("div", { className: "dsh-better-row-desc" }, copy.noReasoningLevels) : null), h("div", { className: "dsh-better-row-control" }, renderSelectControl({
        testId: "reasoningEffort",
        value: config.reasoningEffort ?? "",
        ariaLabel: copy.reasoningEffortLabel,
        disabled: promptEffortInfo.modelHasNoEfforts && config.reasoningEffort === null,
        children: [
          h("option", { key: "__default__", value: "" }, copy.defaultEffort),
          h("option", { key: "__inherit__", value: "inherit" }, copy.inheritChat),
          ...promptEffortInfo.efforts.map((eff) => h("option", { key: eff.id, value: eff.id }, eff.name))
        ],
        onChange: (val) => {
          store.applyPatch({ reasoningEffort: val === "" ? null : val });
        }
      }))), h("div", { className: "dsh-better-row" }, h("div", { className: "dsh-better-row-text" }, h("div", { className: "dsh-better-row-title" }, copy.subagentCheckLabel), h("div", { className: "dsh-better-row-desc" }, copy.subagentCheckDesc)), h("div", { className: "dsh-better-row-control" }, h("button", {
        type: "button",
        role: "switch",
        "aria-checked": config.checkSubagents,
        "aria-label": copy.subagentCheckLabel,
        "data-dsh-better-field": "checkSubagents",
        className: "dsh-better-switch",
        onClick: () => {
          store.applyPatch({ checkSubagents: !config.checkSubagents });
        }
      }, h("span", { className: "dsh-better-switch-thumb" })))), config.checkSubagents ? h("div", { className: "dsh-better-row" }, h("div", { className: "dsh-better-row-text" }, h("div", { className: "dsh-better-row-title" }, copy.briefModelLabel), renderCustomInput("briefModel")), h("div", { className: "dsh-better-row-control" }, renderSelectControl({
        testId: "briefModel",
        value: config.briefModel ?? "",
        ariaLabel: copy.briefModelLabel,
        children: renderModelOptions(copy.sameAsAbove, config.briefModel),
        onChange: (val) => handleModelSelect("briefModel", val)
      }))) : null, config.checkSubagents ? h("div", { className: "dsh-better-row" }, h("div", { className: "dsh-better-row-text" }, h("div", { className: "dsh-better-row-title" }, copy.briefEffortLabel)), h("div", { className: "dsh-better-row-control" }, renderSelectControl({
        testId: "briefReasoningEffort",
        value: config.briefReasoningEffort ?? "",
        ariaLabel: copy.briefEffortLabel,
        disabled: briefEffortInfo.modelHasNoEfforts && config.briefReasoningEffort === null,
        children: [
          h("option", { key: "__same__", value: "" }, copy.sameAsAbove),
          h("option", { key: "__inherit__", value: "inherit" }, copy.inheritChat),
          ...briefEffortInfo.efforts.map((eff) => h("option", { key: eff.id, value: eff.id }, eff.name))
        ],
        onChange: (val) => {
          store.applyPatch({ briefReasoningEffort: val === "" ? null : val });
        }
      }))) : null), snapshot.error ? h("div", { className: "dsh-better-error", role: "alert" }, snapshot.error) : null, !isDefaultConfig(config) ? h("div", { className: "dsh-better-footer" }, h("button", {
        type: "button",
        className: "dsh-better-reset-btn",
        "data-dsh-better-reset": "true",
        onClick: onReset
      }, copy.resetDefaults)) : null);
    }
    return function BetterSettingsPanel(props) {
      if (props?.view === "summary") {
        const copy = getCopy();
        const config = store.getState().config;
        return config.model ?? copy.inheritChat;
      }
      return h(BetterSettingsForm, { isPluginPage: props?.view === "page" });
    };
  }

  // src/client/index.ts
  var PACKAGE_NAME = "@agi-fans/dsh-better";
  var RPC_CHANNEL = "/api";
  var STAGE_ORDER = ["explore", "surface", "deepen", "sharpen"];
  function filledMeterCells(snapshot) {
    switch (snapshot.stage) {
      case "explore":
        return snapshot.doneTools > 0 ? 2 : 1;
      case "surface":
        return 3;
      case "deepen":
        return snapshot.streamingChars >= 160 ? 5 : 4;
      case "sharpen":
        return 6;
    }
  }
  function truncateLine(text, maxChars = 110) {
    const single = text.replace(/\s+/g, " ").trim();
    if (single.length <= maxChars)
      return single;
    return `${single.slice(0, maxChars - 1)}…`;
  }
  function hasOpenOverlay() {
    if (typeof document === "undefined")
      return false;
    return document.querySelector('[role="dialog"], [role="menu"], [role="listbox"], [data-modal], [data-approval-key]') !== null;
  }
  function resolveSessionId(props) {
    return props?.sessionId ?? props?.session?.sessionId ?? props?.session?.id;
  }
  function extractBetterCommandDraft(rawDraft) {
    if (typeof rawDraft !== "string")
      return;
    const match = /^\s*\/better\s+([\s\S]+)$/i.exec(rawDraft);
    if (!match)
      return;
    const trimmed = match[1].trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  function createSpinnerSvg(React, size, color = "currentColor") {
    const h = React.createElement;
    return h("svg", {
      viewBox: "0 0 16 16",
      width: size,
      height: size,
      "aria-hidden": true,
      style: {
        display: "block",
        flexShrink: 0,
        animation: "dsh-better-spin 0.9s linear infinite"
      }
    }, h("circle", {
      cx: 8,
      cy: 8,
      r: 5.5,
      fill: "none",
      stroke: color,
      strokeOpacity: 0.25,
      strokeWidth: 2
    }), h("path", {
      d: "M8 2.5A5.5 5.5 0 0 1 13.5 8",
      fill: "none",
      stroke: color,
      strokeWidth: 2,
      strokeLinecap: "round"
    }));
  }
  if (typeof window !== "undefined" && window.__ModuleLoader__) {
    window.__ModuleLoader__.load({
      id: PACKAGE_NAME,
      factory(require2) {
        const React = require2("react");
        const h = React.createElement;
        const { useCallback, useEffect, useRef, useState } = React;
        return {
          inject: ["slots", "connection", "locale"],
          apply(ctx) {
            if (typeof ctx.locale?.register === "function") {
              ctx.effect?.(() => ctx.locale.register("dsh-better", LOCALE_DICTS));
            }
            const subscribeLocaleChange = (listener) => {
              const unsubs = [];
              if (typeof ctx.locale?.subscribe === "function") {
                const u = ctx.locale.subscribe(listener);
                if (typeof u === "function")
                  unsubs.push(u);
              }
              if (typeof ctx.on === "function") {
                const u = ctx.on("locale/change", listener);
                if (typeof u === "function")
                  unsubs.push(u);
              }
              return () => {
                for (const u of unsubs)
                  u();
              };
            };
            function useLocaleCopy() {
              const [, setLocaleTick] = useState(0);
              useEffect(() => subscribeLocaleChange(() => {
                setLocaleTick((v) => v + 1);
              }), []);
              return getClientCopy(ctx.locale);
            }
            const trackers = new Map;
            let disposed = false;
            const pendingRestores = new Map;
            const restoreListeners = new Set;
            const noticeSinks = new Map;
            function notifyRestore() {
              for (const listener of restoreListeners) {
                try {
                  listener();
                } catch {}
              }
            }
            function clearPendingRestore(sessionId) {
              const pending = pendingRestores.get(sessionId);
              if (!pending)
                return;
              clearTimeout(pending.timer);
              pendingRestores.delete(sessionId);
              notifyRestore();
            }
            function setPendingRestore(sessionId, text) {
              clearPendingRestore(sessionId);
              const timer = setTimeout(() => {
                clearPendingRestore(sessionId);
              }, 120000);
              pendingRestores.set(sessionId, { text, timer });
              notifyRestore();
            }
            function usePendingRestore(sessionId) {
              const [, setVersion] = useState(0);
              useEffect(() => {
                if (!sessionId)
                  return;
                const listener = () => setVersion((v) => v + 1);
                restoreListeners.add(listener);
                return () => {
                  restoreListeners.delete(listener);
                };
              }, [sessionId]);
              if (!sessionId)
                return;
              return pendingRestores.get(sessionId)?.text;
            }
            const getOrCreateEntry = (sessionId) => {
              let entry = trackers.get(sessionId);
              if (!entry) {
                entry = {
                  state: { snapshot: null, fetchedAt: 0, cancelling: false, fastSignal: false },
                  listeners: new Set,
                  ackedRunIds: new Set,
                  consecutiveErrors: 0,
                  lastSubmittedDraft: ""
                };
                trackers.set(sessionId, entry);
              }
              return entry;
            };
            const notify = (entry) => {
              for (const listener of entry.listeners) {
                try {
                  listener();
                } catch {}
              }
            };
            const schedulePoll = (sessionId, entry) => {
              if (entry.timer !== undefined) {
                clearTimeout(entry.timer);
                entry.timer = undefined;
              }
              if (disposed || entry.listeners.size === 0)
                return;
              const isFast = entry.state.snapshot?.status === "running" || entry.state.fastSignal;
              const delay = isFast ? 160 : 1500;
              entry.timer = setTimeout(async () => {
                entry.timer = undefined;
                if (disposed || entry.listeners.size === 0)
                  return;
                if (typeof document === "undefined" || document.visibilityState !== "hidden") {
                  await fetchStatus(sessionId);
                }
                schedulePoll(sessionId, entry);
              }, delay);
            };
            const fetchStatus = async (sessionId) => {
              if (disposed || !ctx.connection?.rpc?.call)
                return null;
              const entry = getOrCreateEntry(sessionId);
              if (entry.inFlight)
                return await entry.inFlight;
              const req = (async () => {
                let rawError;
                try {
                  const res = await ctx.connection.rpc.call(RPC_CHANNEL, "dsh-better/status", { sessionId });
                  if (res && res.ok) {
                    entry.consecutiveErrors = 0;
                    const rawSnapshot = res.value ?? null;
                    const serverSnapshot = rawSnapshot !== null && entry.ackedRunIds.has(rawSnapshot.runId) ? null : rawSnapshot;
                    const tick2 = Date.now();
                    const current2 = entry.state.snapshot;
                    const keepOptimistic = serverSnapshot === null && current2?.optimistic === true && tick2 - current2.startedAt < 2000;
                    const nextSnapshot = keepOptimistic ? current2 : serverSnapshot;
                    entry.state = {
                      ...entry.state,
                      snapshot: nextSnapshot,
                      fetchedAt: tick2,
                      cancelling: nextSnapshot?.status === "running" ? entry.state.cancelling : false
                    };
                    notify(entry);
                    return nextSnapshot;
                  }
                  rawError = res?.error?.message ?? "Host RPC returned an error.";
                } catch (err) {
                  rawError = err instanceof Error ? err.message : String(err);
                }
                entry.consecutiveErrors += 1;
                const tick = Date.now();
                const current = entry.state.snapshot;
                if (rawError !== undefined && current?.optimistic === true && entry.consecutiveErrors >= 4 && tick - current.startedAt >= 1500) {
                  const activeCopy = getClientCopy(ctx.locale);
                  const formattedError = /HTTP (404|405)\b/.test(rawError) ? `${activeCopy.rpcUnavailable} (${rawError})` : rawError;
                  const failedSnapshot = {
                    ...current,
                    optimistic: false,
                    status: "failed",
                    updatedAt: tick,
                    elapsedMs: Math.max(0, tick - current.startedAt),
                    error: formattedError
                  };
                  entry.state = {
                    ...entry.state,
                    snapshot: failedSnapshot,
                    fetchedAt: tick,
                    cancelling: false,
                    fastSignal: false
                  };
                  notify(entry);
                  return failedSnapshot;
                }
                return entry.state.snapshot;
              })().finally(() => {
                entry.inFlight = undefined;
              });
              entry.inFlight = req;
              return await req;
            };
            const ackRun = async (sessionId, runId) => {
              const entry = getOrCreateEntry(sessionId);
              entry.ackedRunIds.add(runId);
              if (entry.state.snapshot?.runId === runId) {
                entry.state = { ...entry.state, snapshot: null, fastSignal: false };
                notify(entry);
              }
              if (!ctx.connection?.rpc?.call)
                return;
              try {
                await ctx.connection.rpc.call(RPC_CHANNEL, "dsh-better/ack", { sessionId, runId });
              } catch {}
            };
            const cancelRun = async (sessionId) => {
              const entry = trackers.get(sessionId);
              const snapshot = entry?.state.snapshot;
              if (!entry || !snapshot || snapshot.status !== "running" || !ctx.connection?.rpc?.call)
                return;
              entry.state = { ...entry.state, cancelling: true };
              notify(entry);
              try {
                await ctx.connection.rpc.call(RPC_CHANNEL, "dsh-better/cancel", {
                  sessionId,
                  ...snapshot.optimistic ? {} : { runId: snapshot.runId }
                });
                await fetchStatus(sessionId);
              } finally {
                entry.state = { ...entry.state, cancelling: false };
                notify(entry);
              }
            };
            const setFastSignal = (sessionId, fast) => {
              const entry = getOrCreateEntry(sessionId);
              if (entry.state.fastSignal === fast)
                return;
              entry.state = { ...entry.state, fastSignal: fast };
              if (fast)
                fetchStatus(sessionId);
              schedulePoll(sessionId, entry);
            };
            const subscribeSession = (sessionId, listener) => {
              const entry = getOrCreateEntry(sessionId);
              const first = entry.listeners.size === 0;
              entry.listeners.add(listener);
              if (first) {
                fetchStatus(sessionId);
                schedulePoll(sessionId, entry);
              }
              return () => {
                entry.listeners.delete(listener);
                if (entry.listeners.size === 0 && entry.timer !== undefined) {
                  clearTimeout(entry.timer);
                  entry.timer = undefined;
                }
              };
            };
            if (typeof ctx.on === "function") {
              ctx.effect?.(() => ctx.on("command/executed", (execSessionId, name, result) => {
                if (!execSessionId)
                  return;
                if (name === "better" && result?.kind === "success") {
                  const entry = getOrCreateEntry(execSessionId);
                  clearPendingRestore(execSessionId);
                  const now = Date.now();
                  const capturedDraft = entry.lastSubmittedDraft;
                  entry.lastSubmittedDraft = "";
                  entry.consecutiveErrors = 0;
                  if (entry.state.snapshot?.status !== "running") {
                    entry.state = {
                      snapshot: {
                        runId: `pending-${now}`,
                        sessionId: execSessionId,
                        sourceDraft: capturedDraft,
                        status: "running",
                        stage: "explore",
                        startedAt: now,
                        updatedAt: now,
                        elapsedMs: 0,
                        turn: 0,
                        tools: [],
                        activeTools: 0,
                        doneTools: 0,
                        streamingChars: 0,
                        optimistic: true
                      },
                      fetchedAt: now,
                      cancelling: false,
                      fastSignal: true
                    };
                    notify(entry);
                  }
                  fetchStatus(execSessionId);
                  schedulePoll(execSessionId, entry);
                } else if (name === "better-cancel") {
                  fetchStatus(execSessionId);
                }
              }), "dsh-better:command-executed");
            }
            ctx.effect?.(() => () => {
              disposed = true;
              for (const entry of trackers.values()) {
                if (entry.timer !== undefined)
                  clearTimeout(entry.timer);
                entry.listeners.clear();
              }
              trackers.clear();
            }, "dsh-better:trackers");
            function useSessionTracker(sessionId) {
              const [, setVersion] = useState(0);
              useEffect(() => {
                if (!sessionId)
                  return;
                return subscribeSession(sessionId, () => {
                  setVersion((v) => v + 1);
                });
              }, [sessionId]);
              if (!sessionId) {
                return { snapshot: null, fetchedAt: 0, cancelling: false, fastSignal: false };
              }
              return getOrCreateEntry(sessionId).state;
            }
            function BetterComposerDock(props) {
              const liveInput = typeof props.useInput === "function" ? props.useInput((s) => s) : props.input;
              const sessionId = resolveSessionId(props);
              const inputActions = props.inputActions;
              const trackerState = useSessionTracker(sessionId);
              const { snapshot, fetchedAt, cancelling } = trackerState;
              const [nowMs, setNowMs] = useState(() => Date.now());
              const [notice, setNotice] = useState(null);
              const handledRunIdRef = useRef(null);
              const prevPhaseRef = useRef(liveInput?.phase);
              const copy = useLocaleCopy();
              useEffect(() => {
                if (!sessionId)
                  return;
                const extracted = extractBetterCommandDraft(liveInput?.draft);
                if (extracted !== undefined) {
                  getOrCreateEntry(sessionId).lastSubmittedDraft = extracted;
                }
              }, [sessionId, liveInput?.draft]);
              useEffect(() => {
                if (!sessionId)
                  return;
                const prev = prevPhaseRef.current;
                const current = liveInput?.phase;
                prevPhaseRef.current = current;
                const fast = current === "submitting" || current === "adjudicating";
                setFastSignal(sessionId, fast);
                if (prev === "submitting" && current === "plain") {
                  fetchStatus(sessionId);
                }
              }, [sessionId, liveInput?.phase]);
              useEffect(() => {
                if (snapshot?.status !== "running")
                  return;
                setNowMs(Date.now());
                const timer = setInterval(() => {
                  setNowMs(Date.now());
                }, 250);
                return () => clearInterval(timer);
              }, [snapshot?.status, snapshot?.runId]);
              useEffect(() => {
                if (!sessionId)
                  return;
                noticeSinks.set(sessionId, setNotice);
                return () => {
                  if (noticeSinks.get(sessionId) === setNotice)
                    noticeSinks.delete(sessionId);
                };
              }, [sessionId]);
              useEffect(() => {
                if (!notice)
                  return;
                const timer = setTimeout(() => {
                  setNotice(null);
                }, 4000);
                return () => clearTimeout(timer);
              }, [notice]);
              useEffect(() => {
                if (!sessionId || !snapshot || snapshot.optimistic)
                  return;
                if (handledRunIdRef.current === snapshot.runId)
                  return;
                if (snapshot.status === "completed" && snapshot.improvedPrompt) {
                  if (liveInput?.phase !== "plain")
                    return;
                  handledRunIdRef.current = snapshot.runId;
                  const existingDraft = liveInput?.draft ?? "";
                  const merged = insertIntoDraft(snapshot.improvedPrompt, existingDraft);
                  inputActions?.setDraft?.(merged);
                  inputActions?.persistDraft?.();
                  if (snapshot.sourceDraft) {
                    setPendingRestore(sessionId, insertIntoDraft(snapshot.sourceDraft, existingDraft));
                  }
                  setNotice({ kind: "success", text: copy.done });
                  ackRun(sessionId, snapshot.runId);
                  return;
                }
                if (snapshot.status === "cancelled") {
                  if (liveInput?.phase !== "plain")
                    return;
                  handledRunIdRef.current = snapshot.runId;
                  const existingDraft = liveInput?.draft ?? "";
                  let text = copy.cancelled;
                  if (existingDraft.trim().length === 0 && snapshot.sourceDraft.trim().length > 0) {
                    inputActions?.setDraft?.(snapshot.sourceDraft);
                    inputActions?.persistDraft?.();
                    text = copy.cancelledRestored;
                  }
                  setNotice({ kind: "info", text });
                  ackRun(sessionId, snapshot.runId);
                  return;
                }
                if (snapshot.status === "failed" && liveInput?.phase === "plain") {
                  handledRunIdRef.current = snapshot.runId;
                  const existingDraft = liveInput?.draft ?? "";
                  if (existingDraft.trim().length === 0 && snapshot.sourceDraft.trim().length > 0) {
                    inputActions?.setDraft?.(snapshot.sourceDraft);
                    inputActions?.persistDraft?.();
                  }
                }
              }, [
                sessionId,
                snapshot,
                liveInput?.phase,
                liveInput?.draft,
                inputActions,
                copy.done,
                copy.cancelled,
                copy.cancelledRestored
              ]);
              useEffect(() => {
                if (!sessionId || snapshot?.status !== "running" || typeof window === "undefined")
                  return;
                const onKeyDown = (event) => {
                  if (event.key !== "Escape" || event.repeat || event.isComposing || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || hasOpenOverlay()) {
                    return;
                  }
                  event.preventDefault();
                  event.stopPropagation();
                  cancelRun(sessionId);
                };
                window.addEventListener("keydown", onKeyDown, true);
                return () => window.removeEventListener("keydown", onKeyDown, true);
              }, [sessionId, snapshot?.status]);
              const onCancelClick = useCallback(() => {
                if (sessionId)
                  cancelRun(sessionId);
              }, [sessionId]);
              if (!snapshot && !notice)
                return null;
              const outerStyle = {
                width: "min(100%, var(--dsh-composer-card-max-width, 760px))",
                margin: "0 auto",
                padding: "0 var(--dsh-composer-side-clearance, 0px) 8px",
                boxSizing: "border-box"
              };
              const keyframesStyle = h("style", null, `
              @keyframes dsh-better-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              @keyframes dsh-better-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
            `);
              if (!snapshot && notice) {
                return h("div", { style: outerStyle, "data-dsh-better-dock": "notice", role: "status" }, keyframesStyle, h("div", {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    padding: "7px 12px",
                    borderRadius: "10px",
                    border: "1px solid var(--dsw-alias-border-subtle, rgba(127, 127, 127, 0.25))",
                    backgroundColor: "var(--dsw-alias-surface-secondary, rgba(127, 127, 127, 0.08))",
                    color: "var(--dsw-alias-text-primary, inherit)",
                    fontSize: "12px"
                  }
                }, h("span", { style: { display: "flex", alignItems: "center", gap: "8px", minWidth: 0 } }, h("span", {
                  style: {
                    width: "7px",
                    height: "7px",
                    borderRadius: "999px",
                    flexShrink: 0,
                    backgroundColor: notice.kind === "success" ? "var(--dsw-alias-status-success, #22c55e)" : "var(--dsw-alias-text-secondary, #888)"
                  }
                }), h("span", null, notice.text)), h("div", { style: { display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 } }, h("button", {
                  type: "button",
                  onClick: () => setNotice(null),
                  style: {
                    border: "none",
                    background: "transparent",
                    color: "var(--dsw-alias-text-secondary, inherit)",
                    cursor: "pointer",
                    fontSize: "11px",
                    padding: "2px 6px"
                  }
                }, copy.dismiss))));
              }
              const openSettingsPage = () => {
                const pluginNav = ctx.get?.("pluginNavigation");
                if (typeof pluginNav?.openBundle === "function") {
                  pluginNav.openBundle(PACKAGE_NAME);
                }
              };
              const canOpenSettings = typeof ctx.get?.("pluginNavigation")?.openBundle === "function";
              if (snapshot && snapshot.status === "failed") {
                return h("div", { style: outerStyle, "data-dsh-better-dock": "failed", role: "alert" }, keyframesStyle, h("div", {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    padding: "9px 12px",
                    borderRadius: "12px",
                    border: "1px solid var(--dsw-alias-status-danger, rgba(239, 68, 68, 0.5))",
                    backgroundColor: "var(--dsw-alias-surface-secondary, rgba(239, 68, 68, 0.08))",
                    color: "var(--dsw-alias-text-primary, inherit)",
                    fontSize: "12px"
                  }
                }, h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" } }, h("span", { style: { fontWeight: 600, color: "var(--dsw-alias-status-danger, #ef4444)" } }, `${copy.failedPrefix} ${snapshot.error ?? ""}`), h("div", { style: { display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 } }, canOpenSettings ? h("button", {
                  type: "button",
                  onClick: openSettingsPage,
                  style: {
                    border: "1px solid var(--dsw-alias-border-subtle, rgba(127, 127, 127, 0.3))",
                    borderRadius: "6px",
                    background: "transparent",
                    color: "var(--dsw-alias-text-primary, inherit)",
                    cursor: "pointer",
                    fontSize: "11px",
                    padding: "2px 8px"
                  }
                }, copy.settingsButton) : null, h("button", {
                  type: "button",
                  onClick: () => {
                    if (sessionId) {
                      handledRunIdRef.current = snapshot.runId;
                      ackRun(sessionId, snapshot.runId);
                    }
                  },
                  style: {
                    border: "1px solid var(--dsw-alias-border-subtle, rgba(127, 127, 127, 0.3))",
                    borderRadius: "6px",
                    background: "transparent",
                    color: "var(--dsw-alias-text-primary, inherit)",
                    cursor: "pointer",
                    fontSize: "11px",
                    padding: "2px 8px"
                  }
                }, copy.dismiss))), snapshot.fallbackPath ? h("div", {
                  style: {
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: "11px",
                    color: "var(--dsw-alias-text-secondary, inherit)",
                    wordBreak: "break-all"
                  }
                }, `${copy.fallbackPrefix} ${snapshot.fallbackPath}`) : null));
              }
              if (!snapshot)
                return null;
              const liveElapsedMs = snapshot.status === "running" ? snapshot.elapsedMs + Math.max(0, nowMs - fetchedAt) : snapshot.elapsedMs;
              const filled = filledMeterCells(snapshot);
              const activeStageIdx = STAGE_ORDER.indexOf(snapshot.stage);
              const visibleTools = snapshot.tools.slice(-6);
              return h("div", { style: outerStyle, "data-dsh-better-dock": "running", role: "status", "aria-live": "polite" }, keyframesStyle, h("div", {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  gap: "7px",
                  padding: "9px 12px",
                  borderRadius: "12px",
                  border: "1px solid var(--dsw-alias-accent-primary, rgba(59, 130, 246, 0.5))",
                  backgroundColor: "var(--dsw-alias-surface-secondary, rgba(59, 130, 246, 0.06))",
                  color: "var(--dsw-alias-text-primary, inherit)",
                  fontSize: "12px"
                }
              }, h("div", {
                style: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  flexWrap: "wrap"
                }
              }, h("div", { style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" } }, h("span", {
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontWeight: 600,
                  fontSize: "11px",
                  padding: "2px 7px",
                  borderRadius: "6px",
                  backgroundColor: "var(--dsw-alias-accent-primary, #2563eb)",
                  color: "#ffffff"
                }
              }, createSpinnerSvg(React, 11, "#ffffff"), h("span", null, copy.badge)), h("span", {
                "aria-label": `progress ${filled}/6`,
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px"
                }
              }, Array.from({ length: 6 }, (_, idx) => h("span", {
                key: idx,
                style: {
                  width: "8px",
                  height: "8px",
                  borderRadius: "2px",
                  backgroundColor: idx < filled ? "var(--dsw-alias-accent-primary, #3b82f6)" : "var(--dsw-alias-border-subtle, rgba(127, 127, 127, 0.28))",
                  animation: idx === filled - 1 ? "dsh-better-pulse 1.2s ease-in-out infinite" : undefined
                }
              }))), h("div", { style: { display: "inline-flex", alignItems: "center", gap: "4px" } }, STAGE_ORDER.map((stage, idx) => {
                const isActive = idx === activeStageIdx;
                const isPast = idx < activeStageIdx;
                return h("span", {
                  key: stage,
                  style: {
                    fontSize: "11px",
                    fontWeight: isActive ? 600 : 400,
                    padding: "1px 7px",
                    borderRadius: "999px",
                    color: isActive ? "var(--dsw-alias-text-primary, inherit)" : "var(--dsw-alias-text-secondary, rgba(127, 127, 127, 0.85))",
                    backgroundColor: isActive ? "var(--dsw-alias-surface-primary, rgba(127, 127, 127, 0.16))" : "transparent",
                    opacity: isPast || isActive ? 1 : 0.65
                  }
                }, copy.stages[stage]);
              }))), h("div", { style: { display: "flex", alignItems: "center", gap: "8px" } }, snapshot.modelLabel ? h("span", {
                "data-dsh-better-model": snapshot.modelLabel,
                style: {
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: "11px",
                  padding: "1px 7px",
                  borderRadius: "999px",
                  border: "1px solid var(--dsw-alias-border-subtle, rgba(127, 127, 127, 0.25))",
                  color: "var(--dsw-alias-text-secondary, inherit)",
                  maxWidth: "220px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                },
                title: snapshot.modelLabel
              }, snapshot.modelLabel) : null, canOpenSettings ? h("button", {
                type: "button",
                onClick: openSettingsPage,
                style: {
                  border: "1px solid var(--dsw-alias-border-subtle, rgba(127, 127, 127, 0.35))",
                  borderRadius: "6px",
                  backgroundColor: "var(--dsw-alias-surface-primary, transparent)",
                  color: "var(--dsw-alias-text-secondary, inherit)",
                  cursor: "pointer",
                  fontSize: "11px",
                  padding: "2px 7px"
                }
              }, copy.settingsButton) : null, h("span", {
                style: {
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: "11px",
                  color: "var(--dsw-alias-text-secondary, inherit)"
                }
              }, formatElapsedClock(liveElapsedMs)), h("button", {
                type: "button",
                disabled: cancelling,
                onClick: onCancelClick,
                style: {
                  border: "1px solid var(--dsw-alias-border-subtle, rgba(127, 127, 127, 0.35))",
                  borderRadius: "6px",
                  backgroundColor: "var(--dsw-alias-surface-primary, transparent)",
                  color: "var(--dsw-alias-text-primary, inherit)",
                  cursor: cancelling ? "default" : "pointer",
                  fontSize: "11px",
                  padding: "2px 8px"
                }
              }, cancelling ? copy.cancelling : `Esc · ${copy.cancel}`))), snapshot.sourceDraft ? h("div", {
                style: {
                  fontSize: "11px",
                  color: "var(--dsw-alias-text-secondary, inherit)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }
              }, `${copy.deepening}: “${truncateLine(snapshot.sourceDraft, 96)}”`) : null, h("div", {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flexWrap: "wrap",
                  minHeight: "20px",
                  color: "var(--dsw-alias-text-secondary, inherit)",
                  fontSize: "11px"
                }
              }, visibleTools.length > 0 ? visibleTools.map((tool) => h("span", {
                key: tool.id,
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "1px 7px",
                  borderRadius: "999px",
                  border: "1px solid var(--dsw-alias-border-subtle, rgba(127, 127, 127, 0.22))",
                  backgroundColor: "var(--dsw-alias-surface-primary, rgba(127, 127, 127, 0.08))",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: "11px"
                }
              }, h("span", {
                style: {
                  width: "6px",
                  height: "6px",
                  borderRadius: "999px",
                  backgroundColor: tool.state === "error" ? "var(--dsw-alias-status-danger, #ef4444)" : tool.state === "done" ? "var(--dsw-alias-status-success, #22c55e)" : "var(--dsw-alias-accent-primary, #3b82f6)"
                }
              }), h("span", null, tool.label))) : h("span", null, snapshot.optimistic ? copy.starting : copy.readingRepo), snapshot.streamingChars > 0 ? h("span", {
                style: {
                  marginLeft: "auto",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: "11px",
                  color: "var(--dsw-alias-text-primary, inherit)"
                }
              }, `${copy.drafting} (${snapshot.streamingChars} ${copy.chars})`) : null), snapshot.streamingPreview ? h("div", {
                style: {
                  padding: "5px 8px",
                  borderRadius: "8px",
                  backgroundColor: "var(--dsw-alias-surface-primary, rgba(127, 127, 127, 0.1))",
                  color: "var(--dsw-alias-text-secondary, inherit)",
                  fontSize: "11px",
                  lineHeight: "1.4",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }
              }, snapshot.streamingPreview) : null));
            }
            function BetterToolbarPill(props) {
              const sessionId = resolveSessionId(props);
              const trackerState = useSessionTracker(sessionId);
              const { snapshot, fetchedAt, cancelling } = trackerState;
              const pendingRestore = usePendingRestore(sessionId);
              const inputActions = props.inputActions;
              const [nowMs, setNowMs] = useState(() => Date.now());
              const copy = useLocaleCopy();
              useEffect(() => {
                if (snapshot?.status !== "running")
                  return;
                setNowMs(Date.now());
                const timer = setInterval(() => {
                  setNowMs(Date.now());
                }, 500);
                return () => clearInterval(timer);
              }, [snapshot?.status, snapshot?.runId]);
              if (snapshot && snapshot.status === "running") {
                const liveElapsedMs = snapshot.elapsedMs + Math.max(0, nowMs - fetchedAt);
                return h("button", {
                  type: "button",
                  disabled: cancelling,
                  onClick: () => {
                    if (sessionId)
                      cancelRun(sessionId);
                  },
                  title: `${copy.badge} · ${copy.stages[snapshot.stage]} (${copy.cancel})`,
                  "data-dsh-better-pill": "running",
                  style: {
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    border: "1px solid var(--dsw-alias-accent-primary, rgba(59, 130, 246, 0.45))",
                    backgroundColor: "var(--dsw-alias-surface-secondary, rgba(59, 130, 246, 0.1))",
                    color: "var(--dsw-alias-text-primary, inherit)",
                    fontSize: "11px",
                    lineHeight: "1.4",
                    cursor: cancelling ? "default" : "pointer"
                  }
                }, createSpinnerSvg(React, 10, "var(--dsw-alias-accent-primary, #3b82f6)"), h("span", { style: { fontWeight: 600 } }, copy.stages[snapshot.stage]), h("span", {
                  style: {
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    color: "var(--dsw-alias-text-secondary, inherit)"
                  }
                }, formatElapsedClock(liveElapsedMs)));
              }
              if (pendingRestore === undefined || !sessionId)
                return null;
              return h("button", {
                type: "button",
                title: copy.restore,
                "data-dsh-better-pill": "restore",
                onClick: () => {
                  inputActions?.setDraft?.(pendingRestore);
                  inputActions?.persistDraft?.();
                  clearPendingRestore(sessionId);
                  noticeSinks.get(sessionId)?.({ kind: "info", text: copy.restored });
                },
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  border: "1px solid var(--dsw-alias-border-subtle, rgba(127, 127, 127, 0.32))",
                  backgroundColor: "var(--dsw-alias-surface-primary, transparent)",
                  color: "var(--dsw-alias-text-secondary, inherit)",
                  fontSize: "11px",
                  lineHeight: "1.4",
                  cursor: "pointer"
                }
              }, copy.restore);
            }
            const settingsStore = createBetterSettingsStore(ctx, () => getClientCopy(ctx.locale));
            const BetterSettingsPanel = createBetterSettingsPanel(React, settingsStore, () => getClientCopy(ctx.locale), subscribeLocaleChange);
            function BetterSectionIcon(iconProps) {
              const size = typeof iconProps?.size === "number" ? iconProps.size : 16;
              return h("svg", {
                viewBox: "0 0 16 16",
                width: size,
                height: size,
                fill: "none",
                stroke: "currentColor",
                strokeWidth: 1.5,
                strokeLinecap: "round",
                strokeLinejoin: "round",
                "aria-hidden": true
              }, h("path", { d: "M8 2.2 9.4 6l3.8 1.4-3.8 1.4L8 12.6 6.6 8.8 2.8 7.4 6.6 6 8 2.2Z" }));
            }
            ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
              name: "conversation.input.dock",
              id: "dsh-better",
              order: 15,
              locale: "dsh-better"
            }, BetterComposerDock));
            ctx.slots.inject("conversation.input.left", () => ctx.slots.register({
              name: "conversation.input.left",
              id: "dsh-better-pill",
              order: 50,
              locale: "dsh-better"
            }, BetterToolbarPill));
            ctx.slots.inject("settings.section", () => ctx.slots.register({
              name: "settings.section",
              id: "dsh-better",
              order: 55,
              label: () => getClientCopy(ctx.locale).settingsTitle,
              locale: "dsh-better"
            }, BetterSettingsPanel));
            ctx.slots.inject("settings.section.icon", () => ctx.slots.register({
              name: "settings.section.icon",
              id: "dsh-better",
              locale: "dsh-better"
            }, BetterSectionIcon));
            ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({
              name: "plugins.bundle.config",
              key: PACKAGE_NAME,
              locale: "dsh-better"
            }, BetterSettingsPanel));
            ctx.slots.inject("plugins.row.config", () => ctx.slots.register({
              name: "plugins.row.config",
              key: `${PACKAGE_NAME}#dsh-better`,
              locale: "dsh-better"
            }, BetterSettingsPanel));
          }
        };
      }
    });
  }
})();
