import type { DepthStage } from '../shared/types.ts'

export const SUPPORTED_LOCALES = ['en', 'zh', 'ja', 'es', 'fr', 'de', 'ru', 'pt'] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export interface BetterClientCopy {
  readonly badge: string
  readonly stages: Readonly<Record<DepthStage, string>>
  readonly cancel: string
  readonly cancelling: string
  readonly dismiss: string
  readonly restore: string
  readonly deepening: string
  readonly readingRepo: string
  readonly starting: string
  readonly drafting: string
  readonly chars: string
  readonly done: string
  readonly restored: string
  readonly cancelledRestored: string
  readonly cancelled: string
  readonly failedPrefix: string
  readonly fallbackPrefix: string
  readonly rpcUnavailable: string
  readonly settingsTitle: string
  readonly settingsButton: string
  readonly rpcHostUnavailable: string
  readonly apply: string
  readonly customModelOption: string
  readonly modelLabel: string
  readonly modelDesc: string
  readonly inheritChat: string
  readonly reasoningEffortLabel: string
  readonly noReasoningLevels: string
  readonly defaultEffort: string
  readonly subagentCheckLabel: string
  readonly subagentCheckDesc: string
  readonly briefModelLabel: string
  readonly sameAsAbove: string
  readonly briefEffortLabel: string
  readonly resetDefaults: string
}

export const CLIENT_COPY: Readonly<Record<SupportedLocale, BetterClientCopy>> = {
  en: {
    badge: '/better',
    stages: {
      explore: 'Explore',
      surface: 'Surface',
      deepen: 'Deepen',
      sharpen: 'Sharpen',
    },
    cancel: 'Cancel',
    cancelling: 'Stopping…',
    dismiss: 'Dismiss',
    restore: 'Restore original',
    deepening: 'Deepening',
    readingRepo: 'Inspecting repository and session context…',
    starting: 'Starting read-only helper…',
    drafting: 'Synthesizing',
    chars: 'chars',
    done: 'Deepened prompt placed in composer — review and press Enter to send.',
    restored: 'Restored original draft.',
    cancelledRestored: 'Prompt deepening cancelled; original draft restored.',
    cancelled: 'Prompt deepening cancelled.',
    failedPrefix: 'Deepening failed:',
    fallbackPrefix: 'Saved raw reply:',
    rpcUnavailable: 'Cannot reach /api/dsh-better on Host (restart DeepSeek Harness to reload plugin)',
    settingsTitle: 'Prompt Deepener',
    settingsButton: 'Settings',
    rpcHostUnavailable: 'Host RPC channel unavailable',
    apply: 'Apply',
    customModelOption: 'Custom model…',
    modelLabel: 'Model',
    modelDesc: 'Follows current chat by default to reuse context cache',
    inheritChat: 'Follow current chat',
    reasoningEffortLabel: 'Reasoning effort',
    noReasoningLevels: 'No adjustable levels for selected model',
    defaultEffort: 'Low (default · fast)',
    subagentCheckLabel: 'Subagent brief check',
    subagentCheckDesc: 'Verify paths and symbols in /better subagent tasks',
    briefModelLabel: 'Brief check model',
    sameAsAbove: 'Same as above',
    briefEffortLabel: 'Brief reasoning effort',
    resetDefaults: 'Reset to defaults',
  },
  zh: {
    badge: '/better',
    stages: {
      explore: '探索',
      surface: '浮现',
      deepen: '深化',
      sharpen: '打磨',
    },
    cancel: '取消',
    cancelling: '正在取消…',
    dismiss: '关闭',
    restore: '还原原稿',
    deepening: '正在深化',
    readingRepo: '正在检索代码库与上下文…',
    starting: '正在启动只读分析助手…',
    drafting: '正在生成深化内容',
    chars: '字',
    done: '提示词已深化并填入下方输入框，审阅后按 Enter 发送。',
    restored: '已还原原始草稿。',
    cancelledRestored: '已取消提示词深化，原草稿已恢复。',
    cancelled: '已取消提示词深化。',
    failedPrefix: '提示词深化失败：',
    fallbackPrefix: '已保存原始输出：',
    rpcUnavailable: '无法连接宿主 /api/dsh-better 通道（请重启 DeepSeek Harness 以加载新版插件）',
    settingsTitle: '提示词深化',
    settingsButton: '设置',
    rpcHostUnavailable: '宿主 RPC 通道不可用',
    apply: '确定',
    customModelOption: '自定义模型…',
    modelLabel: '深化模型',
    modelDesc: '默认跟随当前对话以复用上下文缓存',
    inheritChat: '跟随当前对话',
    reasoningEffortLabel: '推理强度',
    noReasoningLevels: '当前模型无可选推理档位',
    defaultEffort: '低（默认 · 快速）',
    subagentCheckLabel: '子智能体简报校验',
    subagentCheckDesc: '派发前核实以 /better 开头的子任务路径与符号',
    briefModelLabel: '简报校验模型',
    sameAsAbove: '与深化模型一致',
    briefEffortLabel: '简报校验推理强度',
    resetDefaults: '恢复默认设置',
  },
  ja: {
    badge: '/better',
    stages: {
      explore: '探索',
      surface: '抽出',
      deepen: '深化',
      sharpen: '研磨',
    },
    cancel: 'キャンセル',
    cancelling: '停止中…',
    dismiss: '閉じる',
    restore: '元に戻す',
    deepening: '深化中',
    readingRepo: 'リポジトリと会話コンテキストを確認中…',
    starting: '読み取り専用ヘルパーを起動中…',
    drafting: '生成中',
    chars: '文字',
    done: '深化されたプロンプトを入力欄に反映しました。確認後 Enter で送信できます。',
    restored: '元の下書きを復元しました。',
    cancelledRestored: 'プロンプト深化をキャンセルし、元の下書きを復元しました。',
    cancelled: 'プロンプト深化をキャンセルしました。',
    failedPrefix: '深化に失敗しました:',
    fallbackPrefix: '生の応答を保存しました:',
    rpcUnavailable: 'ホストの /api/dsh-better に接続できません（DeepSeek Harness を再起動してください）',
    settingsTitle: 'プロンプト深化',
    settingsButton: '設定',
    rpcHostUnavailable: 'ホスト RPC チャネルが利用できません',
    apply: '適用',
    customModelOption: 'カスタムモデル…',
    modelLabel: 'モデル',
    modelDesc: '既定では現在の会話モデルを使用してコンテキストキャッシュを再利用します',
    inheritChat: '現在の会話に従う',
    reasoningEffortLabel: '推論強度',
    noReasoningLevels: '選択中のモデルには調整可能な推論レベルがありません',
    defaultEffort: '低（既定・高速）',
    subagentCheckLabel: 'サブエージェント指示書チェック',
    subagentCheckDesc: '/better で始まるサブタスクのパスとシンボルを送信前に検証します',
    briefModelLabel: 'チェック用モデル',
    sameAsAbove: '上と同じ',
    briefEffortLabel: 'チェック用推論強度',
    resetDefaults: 'デフォルトに戻す',
  },
  es: {
    badge: '/better',
    stages: {
      explore: 'Explorar',
      surface: 'Detectar',
      deepen: 'Profundizar',
      sharpen: 'Pulir',
    },
    cancel: 'Cancelar',
    cancelling: 'Deteniendo…',
    dismiss: 'Cerrar',
    restore: 'Restaurar original',
    deepening: 'Profundizando',
    readingRepo: 'Inspeccionando el repositorio y el contexto de la sesión…',
    starting: 'Iniciando asistente de solo lectura…',
    drafting: 'Redactando',
    chars: 'caracteres',
    done: 'Prompt mejorado colocado en el editor; revísalo y pulsa Enter para enviar.',
    restored: 'Borrador original restaurado.',
    cancelledRestored: 'Se canceló la mejora del prompt y se restauró el borrador original.',
    cancelled: 'Se canceló la mejora del prompt.',
    failedPrefix: 'Error al profundizar:',
    fallbackPrefix: 'Respuesta sin procesar guardada:',
    rpcUnavailable: 'No se puede conectar con /api/dsh-better en el host (reinicia DeepSeek Harness para recargar el plugin)',
    settingsTitle: 'Profundizar prompt',
    settingsButton: 'Ajustes',
    rpcHostUnavailable: 'Canal RPC del host no disponible',
    apply: 'Aplicar',
    customModelOption: 'Modelo personalizado…',
    modelLabel: 'Modelo',
    modelDesc: 'Por defecto sigue al chat actual para reutilizar la caché de contexto',
    inheritChat: 'Seguir el chat actual',
    reasoningEffortLabel: 'Esfuerzo de razonamiento',
    noReasoningLevels: 'El modelo seleccionado no tiene niveles ajustables',
    defaultEffort: 'Bajo (predeterminado · rápido)',
    subagentCheckLabel: 'Verificación de subagentes',
    subagentCheckDesc: 'Verificar rutas y símbolos en tareas de subagentes con /better',
    briefModelLabel: 'Modelo de verificación',
    sameAsAbove: 'Igual que arriba',
    briefEffortLabel: 'Esfuerzo de verificación',
    resetDefaults: 'Restablecer valores',
  },
  fr: {
    badge: '/better',
    stages: {
      explore: 'Explorer',
      surface: 'Identifier',
      deepen: 'Approfondir',
      sharpen: 'Affiner',
    },
    cancel: 'Annuler',
    cancelling: 'Arrêt…',
    dismiss: 'Fermer',
    restore: 'Rétablir l’original',
    deepening: 'Approfondissement',
    readingRepo: 'Analyse du dépôt et du contexte de session…',
    starting: 'Démarrage de l’assistant en lecture seule…',
    drafting: 'Synthèse',
    chars: 'caractères',
    done: 'Prompt approfondi inséré dans l’éditeur — vérifiez puis appuyez sur Entrée.',
    restored: 'Brouillon d’origine rétabli.',
    cancelledRestored: 'Approfondissement annulé ; brouillon d’origine rétabli.',
    cancelled: 'Approfondissement du prompt annulé.',
    failedPrefix: 'Échec de l’approfondissement :',
    fallbackPrefix: 'Réponse brute enregistrée :',
    rpcUnavailable: 'Impossible de joindre /api/dsh-better sur l’hôte (redémarrez DeepSeek Harness pour recharger le plugin)',
    settingsTitle: 'Approfondir le prompt',
    settingsButton: 'Paramètres',
    rpcHostUnavailable: 'Canal RPC de l’hôte indisponible',
    apply: 'Appliquer',
    customModelOption: 'Modèle personnalisé…',
    modelLabel: 'Modèle',
    modelDesc: 'Suit la conversation actuelle par défaut pour réutiliser le cache de contexte',
    inheritChat: 'Suivre la conversation',
    reasoningEffortLabel: 'Effort de raisonnement',
    noReasoningLevels: 'Aucun niveau réglable pour le modèle sélectionné',
    defaultEffort: 'Faible (par défaut · rapide)',
    subagentCheckLabel: 'Vérification des sous-agents',
    subagentCheckDesc: 'Vérifier les chemins et symboles des tâches sous-agent commençant par /better',
    briefModelLabel: 'Modèle de vérification',
    sameAsAbove: 'Identique ci-dessus',
    briefEffortLabel: 'Effort de vérification',
    resetDefaults: 'Réinitialiser',
  },
  de: {
    badge: '/better',
    stages: {
      explore: 'Erkunden',
      surface: 'Erfassen',
      deepen: 'Vertiefen',
      sharpen: 'Schärfen',
    },
    cancel: 'Abbrechen',
    cancelling: 'Wird gestoppt…',
    dismiss: 'Schließen',
    restore: 'Original wiederherstellen',
    deepening: 'Wird vertieft',
    readingRepo: 'Repository und Sitzungskontext werden geprüft…',
    starting: 'Schreibgeschützter Helfer wird gestartet…',
    drafting: 'Formulierung',
    chars: 'Zeichen',
    done: 'Vertiefter Prompt im Eingabefeld eingefügt — prüfen und mit Enter senden.',
    restored: 'Ursprünglicher Entwurf wiederhergestellt.',
    cancelledRestored: 'Prompt-Vertiefung abgebrochen; ursprünglicher Entwurf wiederhergestellt.',
    cancelled: 'Prompt-Vertiefung abgebrochen.',
    failedPrefix: 'Vertiefung fehlgeschlagen:',
    fallbackPrefix: 'Rohantwort gespeichert:',
    rpcUnavailable: '/api/dsh-better auf dem Host nicht erreichbar (DeepSeek Harness neu starten, um das Plugin zu laden)',
    settingsTitle: 'Prompt-Vertiefung',
    settingsButton: 'Einstellungen',
    rpcHostUnavailable: 'Host-RPC-Kanal nicht verfügbar',
    apply: 'Übernehmen',
    customModelOption: 'Benutzerdefiniertes Modell…',
    modelLabel: 'Modell',
    modelDesc: 'Folgt standardmäßig dem aktuellen Chat, um den Kontext-Cache wiederzuverwenden',
    inheritChat: 'Aktuellem Chat folgen',
    reasoningEffortLabel: 'Denkaufwand',
    noReasoningLevels: 'Keine wählbaren Stufen für das ausgewählte Modell',
    defaultEffort: 'Niedrig (Standard · schnell)',
    subagentCheckLabel: 'Subagent-Briefing prüfen',
    subagentCheckDesc: 'Pfade und Symbole in Subagent-Aufgaben mit /better vorab prüfen',
    briefModelLabel: 'Prüfmodell',
    sameAsAbove: 'Wie oben',
    briefEffortLabel: 'Prüf-Denkaufwand',
    resetDefaults: 'Standardwerte wiederherstellen',
  },
  ru: {
    badge: '/better',
    stages: {
      explore: 'Поиск',
      surface: 'Анализ',
      deepen: 'Углубление',
      sharpen: 'Доводка',
    },
    cancel: 'Отмена',
    cancelling: 'Остановка…',
    dismiss: 'Закрыть',
    restore: 'Восстановить исходный',
    deepening: 'Углубление',
    readingRepo: 'Проверка репозитория и контекста сессии…',
    starting: 'Запуск помощника только для чтения…',
    drafting: 'Формирование',
    chars: 'симв.',
    done: 'Углублённый промпт помещён в поле ввода — проверьте и нажмите Enter для отправки.',
    restored: 'Исходный черновик восстановлен.',
    cancelledRestored: 'Углубление промпта отменено; исходный черновик восстановлен.',
    cancelled: 'Углубление промпта отменено.',
    failedPrefix: 'Ошибка углубления:',
    fallbackPrefix: 'Сырой ответ сохранён:',
    rpcUnavailable: 'Не удалось подключиться к /api/dsh-better на хосте (перезапустите DeepSeek Harness)',
    settingsTitle: 'Углубление промпта',
    settingsButton: 'Настройки',
    rpcHostUnavailable: 'Канал RPC хоста недоступен',
    apply: 'Применить',
    customModelOption: 'Другая модель…',
    modelLabel: 'Модель',
    modelDesc: 'По умолчанию использует модель текущего чата для переиспользования KV-кэша',
    inheritChat: 'Как в текущем чате',
    reasoningEffortLabel: 'Уровень рассуждения',
    noReasoningLevels: 'Для выбранной модели нет настраиваемых уровней',
    defaultEffort: 'Низкий (по умолчанию · быстро)',
    subagentCheckLabel: 'Проверка брифов субагентов',
    subagentCheckDesc: 'Проверять пути и символы в задачах субагентов с префиксом /better',
    briefModelLabel: 'Модель проверки брифов',
    sameAsAbove: 'Как основная модель',
    briefEffortLabel: 'Уровень рассуждения проверки',
    resetDefaults: 'Сбросить настройки',
  },
  pt: {
    badge: '/better',
    stages: {
      explore: 'Explorar',
      surface: 'Mapear',
      deepen: 'Aprofundar',
      sharpen: 'Refinar',
    },
    cancel: 'Cancelar',
    cancelling: 'Parando…',
    dismiss: 'Fechar',
    restore: 'Restaurar original',
    deepening: 'Aprofundando',
    readingRepo: 'Inspecionando o repositório e o contexto da sessão…',
    starting: 'Iniciando assistente somente leitura…',
    drafting: 'Sintetizando',
    chars: 'caracteres',
    done: 'Prompt aprofundado inserido no editor — revise e pressione Enter para enviar.',
    restored: 'Rascunho original restaurado.',
    cancelledRestored: 'Aprofundamento cancelado; rascunho original restaurado.',
    cancelled: 'Aprofundamento do prompt cancelado.',
    failedPrefix: 'Falha ao aprofundar:',
    fallbackPrefix: 'Resposta bruta salva:',
    rpcUnavailable: 'Não foi possível alcançar /api/dsh-better no host (reinicie o DeepSeek Harness para recarregar o plugin)',
    settingsTitle: 'Aprofundar prompt',
    settingsButton: 'Configurações',
    rpcHostUnavailable: 'Canal RPC do host indisponível',
    apply: 'Aplicar',
    customModelOption: 'Modelo personalizado…',
    modelLabel: 'Modelo',
    modelDesc: 'Segue o chat atual por padrão para reutilizar o cache de contexto',
    inheritChat: 'Seguir chat atual',
    reasoningEffortLabel: 'Esforço de raciocínio',
    noReasoningLevels: 'O modelo selecionado não possui níveis ajustáveis',
    defaultEffort: 'Baixo (padrão · rápido)',
    subagentCheckLabel: 'Verificar briefs de subagentes',
    subagentCheckDesc: 'Verificar caminhos e símbolos em tarefas de subagentes iniciadas com /better',
    briefModelLabel: 'Modelo de verificação',
    sameAsAbove: 'Igual ao acima',
    briefEffortLabel: 'Esforço da verificação',
    resetDefaults: 'Restaurar padrões',
  },
}

function flattenCopy(copy: BetterClientCopy): Record<string, string> {
  return {
    badge: copy.badge,
    'stage.explore': copy.stages.explore,
    'stage.surface': copy.stages.surface,
    'stage.deepen': copy.stages.deepen,
    'stage.sharpen': copy.stages.sharpen,
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
    'settings.rpcHostUnavailable': copy.rpcHostUnavailable,
    'settings.apply': copy.apply,
    'settings.customModelOption': copy.customModelOption,
    'settings.modelLabel': copy.modelLabel,
    'settings.modelDesc': copy.modelDesc,
    'settings.inheritChat': copy.inheritChat,
    'settings.reasoningEffortLabel': copy.reasoningEffortLabel,
    'settings.noReasoningLevels': copy.noReasoningLevels,
    'settings.defaultEffort': copy.defaultEffort,
    'settings.subagentCheckLabel': copy.subagentCheckLabel,
    'settings.subagentCheckDesc': copy.subagentCheckDesc,
    'settings.briefModelLabel': copy.briefModelLabel,
    'settings.sameAsAbove': copy.sameAsAbove,
    'settings.briefEffortLabel': copy.briefEffortLabel,
    'settings.resetDefaults': copy.resetDefaults,
  }
}

export const LOCALE_DICTS: Readonly<Record<SupportedLocale, Record<string, string>>> = {
  en: flattenCopy(CLIENT_COPY.en),
  zh: flattenCopy(CLIENT_COPY.zh),
  ja: flattenCopy(CLIENT_COPY.ja),
  es: flattenCopy(CLIENT_COPY.es),
  fr: flattenCopy(CLIENT_COPY.fr),
  de: flattenCopy(CLIENT_COPY.de),
  ru: flattenCopy(CLIENT_COPY.ru),
  pt: flattenCopy(CLIENT_COPY.pt),
}

export function resolveSupportedLocale(localeService: any): SupportedLocale {
  try {
    const raw = typeof localeService?.getSnapshot === 'function'
      ? localeService.getSnapshot()?.active
      : typeof localeService?.get === 'function'
        ? localeService.get()
        : typeof navigator !== 'undefined'
          ? navigator.language
          : 'en'
    if (typeof raw !== 'string') return 'en'
    const normalized = raw.trim().toLowerCase()
    if (!normalized) return 'en'
    if ((SUPPORTED_LOCALES as readonly string[]).includes(normalized)) {
      return normalized as SupportedLocale
    }
    const primary = normalized.split(/[-_]/)[0]
    if (primary && (SUPPORTED_LOCALES as readonly string[]).includes(primary)) {
      return primary as SupportedLocale
    }
    return 'en'
  } catch {
    return 'en'
  }
}

export function getClientCopy(localeService: any): BetterClientCopy {
  return CLIENT_COPY[resolveSupportedLocale(localeService)]
}
