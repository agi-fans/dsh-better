// src/host/index.ts
import { randomUUID as randomUUID2 } from "node:crypto";
import { existsSync, mkdirSync as mkdirSync2, readFileSync, renameSync, rmSync, writeFileSync as writeFileSync2 } from "node:fs";
import path2 from "node:path";

// src/core/better.ts
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
var IMPROVED_OPEN = "<improved-prompt>";
var IMPROVED_CLOSE = "</improved-prompt>";
var BRIEF_OPEN = "<checked-brief>";
var BRIEF_CLOSE = "</checked-brief>";
var HELPER_READ_ONLY_TOOLS = new Set([
  "read",
  "read_image",
  "grep",
  "glob",
  "lsp",
  "run_code",
  "web_search",
  "web_fetch",
  "list_mcp_resources",
  "list_mcp_resource_templates",
  "read_mcp_resource",
  "session_search",
  "session_event_search",
  "session_trace",
  "session_event_trace",
  "session_event_read",
  "get_goal",
  "job_list",
  "job_output",
  "list_agents",
  "list_subagent_models",
  "schedule_list",
  "schedule_view",
  "team_task_list",
  "team_task_get",
  "terminal_list",
  "terminal_read",
  "user_terminal_list",
  "user_terminal_read",
  "cordis_inspect_list",
  "cordis_inspect_query",
  "timeline_tree",
  "timeline_tasks",
  "timeline_read",
  "skill"
]);
function extractTaggedBlock(raw, openTag, closeTag) {
  const start = raw.lastIndexOf(openTag);
  if (start === -1)
    return;
  const contentStart = start + openTag.length;
  const end = raw.indexOf(closeTag, contentStart);
  if (end === -1)
    return;
  const body = raw.slice(contentStart, end).trim();
  return body.length > 0 ? body : undefined;
}
function parseImproved(raw) {
  return extractTaggedBlock(raw, IMPROVED_OPEN, IMPROVED_CLOSE);
}
function parseCheckedBrief(raw) {
  return extractTaggedBlock(raw, BRIEF_OPEN, BRIEF_CLOSE);
}
function extractStreamingPreview(raw, maxChars = 220) {
  const withoutTags = raw.replace(/<\/?improved-prompt>/gi, "").replace(/\s+/g, " ").trim();
  if (withoutTags.length <= maxChars)
    return withoutTags;
  return `…${withoutTags.slice(-(maxChars - 1))}`;
}
function matchBriefMark(task) {
  const match = /^\s*\/better(?=$|\s)([\s\S]*)$/i.exec(task);
  if (!match)
    return { matched: false, brief: task };
  return { matched: true, brief: (match[1] ?? "").trim() };
}
function shortPath(value, maxLen = 28) {
  const normalized = value.replace(/\\/g, "/").replace(/\/+$/, "");
  if (normalized.length <= maxLen)
    return normalized;
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length >= 2) {
    const tail = parts.slice(-2).join("/");
    if (tail.length <= maxLen)
      return tail;
  }
  if (parts.length >= 1) {
    const base = parts[parts.length - 1];
    if (base.length <= maxLen)
      return base;
  }
  return `…${normalized.slice(-(maxLen - 1))}`;
}
function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : undefined;
}
function stringProp(obj, ...keys) {
  if (!obj)
    return;
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim().length > 0)
      return v.trim();
  }
  return;
}
function toolLabel(name, args) {
  const rec = asRecord(args);
  switch (name) {
    case "read":
    case "read_image": {
      const target = stringProp(rec, "file_path", "path");
      return target ? `${name} ${shortPath(target)}` : name;
    }
    case "grep": {
      const pattern = stringProp(rec, "pattern");
      const target = stringProp(rec, "path");
      if (pattern && target)
        return `grep ${shortPath(pattern, 16)} ${shortPath(target, 16)}`;
      if (pattern)
        return `grep ${shortPath(pattern, 24)}`;
      return "grep";
    }
    case "glob": {
      const pattern = stringProp(rec, "pattern");
      return pattern ? `glob ${shortPath(pattern, 24)}` : "glob";
    }
    case "lsp": {
      const op = stringProp(rec, "operation") ?? "query";
      const target = stringProp(rec, "file_path", "path");
      return target ? `lsp:${op} ${shortPath(target, 20)}` : `lsp:${op}`;
    }
    case "web_search": {
      const queries = rec?.["queries"];
      const first = Array.isArray(queries) && typeof queries[0] === "string" ? queries[0].trim() : stringProp(rec, "query");
      return first ? `search ${shortPath(first, 22)}` : "web_search";
    }
    case "web_fetch": {
      const url = stringProp(rec, "url");
      if (!url)
        return "web_fetch";
      const stripped = url.replace(/^https?:\/\//i, "");
      return `fetch ${shortPath(stripped, 24)}`;
    }
    case "working_directory":
      return "cwd";
    case "run_code":
      return "run_code";
    default: {
      const fallbackArg = stringProp(rec, "file_path", "path", "pattern", "uri", "name");
      return fallbackArg ? `${name} ${shortPath(fallbackArg, 20)}` : name;
    }
  }
}
function computeDepthStage(input) {
  if (input.streamingChars >= 320)
    return "sharpen";
  if (input.streamingChars >= 100)
    return "deepen";
  if (input.streamingChars > 0)
    return "deepen";
  if (input.doneTools >= 3 || input.completedTurnCount >= 2)
    return "surface";
  if (input.doneTools > 0 || input.activeTools > 0)
    return "explore";
  return "explore";
}
function helperToolGuard(toolName) {
  if (HELPER_READ_ONLY_TOOLS.has(toolName))
    return;
  return `Tool "${toolName}" is disabled inside the read-only /better helper. Use read, grep, glob, lsp, or read-only inspection tools only.`;
}
var INHERIT_SENTINELS = new Set(["inherit", "default", "auto"]);
function isInheritSentinel(value) {
  return INHERIT_SENTINELS.has(value.trim().toLowerCase());
}
function resolveModelSelection(spec) {
  if (typeof spec !== "string")
    return;
  const trimmed = spec.trim();
  if (trimmed.length === 0 || isInheritSentinel(trimmed))
    return;
  const slash = trimmed.indexOf("/");
  if (slash > 0 && slash < trimmed.length - 1) {
    return {
      provider: trimmed.slice(0, slash).trim(),
      model: trimmed.slice(slash + 1).trim()
    };
  }
  return { model: trimmed };
}
var DEFAULT_HELPER_REASONING_EFFORT = "low";
function parseReasoningEffortSetting(spec) {
  if (typeof spec !== "string")
    return { mode: "default" };
  const trimmed = spec.trim();
  if (trimmed.length === 0)
    return { mode: "default" };
  const lower = trimmed.toLowerCase();
  if (lower === "default" || lower === "auto")
    return { mode: "default" };
  if (lower === "inherit")
    return { mode: "inherit" };
  return { mode: "explicit", effort: trimmed };
}
var EFFORT_RANK = new Map([
  ["none", 0],
  ["off", 0],
  ["minimal", 1],
  ["low", 2],
  ["medium", 3],
  ["high", 4],
  ["xhigh", 5],
  ["max", 6]
]);
function clampReasoningEffort(effort, maxEffort = DEFAULT_HELPER_REASONING_EFFORT) {
  if (effort === undefined)
    return;
  const rank = EFFORT_RANK.get(effort.trim().toLowerCase());
  const maxRank = EFFORT_RANK.get(maxEffort.trim().toLowerCase());
  if (rank === undefined || maxRank === undefined)
    return effort;
  return rank <= maxRank ? effort : maxEffort;
}
function matchSupportedReasoningEffort(requested, reasoning) {
  if (requested === undefined)
    return;
  if (reasoning === undefined || reasoning.efforts.length === 0)
    return;
  const supported = reasoning.efforts.map((e) => e.id);
  if (supported.includes(requested))
    return requested;
  const lower = requested.toLowerCase();
  const caseMatch = supported.find((id) => id.toLowerCase() === lower);
  if (caseMatch !== undefined)
    return caseMatch;
  if (lower === "off" || lower === "none") {
    const alias = lower === "off" ? "none" : "off";
    const aliasMatch = supported.find((id) => id.toLowerCase() === alias);
    if (aliasMatch !== undefined)
      return aliasMatch;
  }
  const targetRank = EFFORT_RANK.get(lower);
  if (targetRank !== undefined) {
    const ranked = supported.map((id) => ({ id, rank: EFFORT_RANK.get(id.toLowerCase()) })).filter((item) => item.rank !== undefined);
    if (ranked.length > 0) {
      let bestUnderOrEqual;
      let lowestOverall = ranked[0];
      for (const item of ranked) {
        if (item.rank < lowestOverall.rank)
          lowestOverall = item;
        if (item.rank <= targetRank && (!bestUnderOrEqual || item.rank > bestUnderOrEqual.rank)) {
          bestUnderOrEqual = item;
        }
      }
      return (bestUnderOrEqual ?? lowestOverall).id;
    }
  }
  return reasoning.defaultEffort ?? supported[0];
}
function buildHelperUserPrompt(helperInstructions, draft, hasInheritedHistory) {
  const contextNote = hasInheritedHistory ? "The conversation history above is from the parent session where the user is about to send this draft. Resolve references and constraints against both that history and the repository." : "This session has no prior turns yet. Ground everything by inspecting the repository directly.";
  return [
    helperInstructions.trim(),
    "",
    "## Session Context",
    contextNote,
    "",
    "## Raw Prompt Draft",
    draft.trim(),
    "",
    `Output ONLY ${IMPROVED_OPEN}...${IMPROVED_CLOSE} with no text before or after the tags.`
  ].join(`
`);
}
function buildBriefUserPrompt(briefInstructions, rawBrief, hasInheritedHistory) {
  const contextNote = hasInheritedHistory ? "The conversation history above is the parent session delegating this brief to a subagent. Carry forward relevant verified facts, paths, and constraints from that history when the brief omits them." : "No prior parent turns exist yet. Verify every file, symbol, and test convention directly against the repository.";
  return [
    briefInstructions.trim(),
    "",
    "## Delegation Context",
    contextNote,
    "",
    "## Subagent Brief to Check",
    rawBrief.trim(),
    "",
    `Output ONLY ${BRIEF_OPEN}...${BRIEF_CLOSE} with no text before or after the tags.`
  ].join(`
`);
}
function writeFallbackReply(rawReply, kind, baseDir = path.join(os.tmpdir(), "dsh-better")) {
  mkdirSync(baseDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const suffix = Math.random().toString(36).slice(2, 8);
  const filePath = path.join(baseDir, `${kind}-reply-${stamp}-${suffix}.md`);
  writeFileSync(filePath, rawReply, "utf8");
  return filePath;
}

// src/host/helper-runner.ts
import { randomUUID } from "node:crypto";
var MAX_TOOL_BADGES = 24;
var MODEL_INFO_CACHE_TTL_MS = 5 * 60000;
var modelInfoCacheByLlm = new WeakMap;
async function resolveModelInfoCached(llm, provider, model, signal) {
  if (typeof llm?.resolveModelInfo !== "function")
    return;
  let perModel = modelInfoCacheByLlm.get(llm);
  if (!perModel) {
    perModel = new Map;
    modelInfoCacheByLlm.set(llm, perModel);
  }
  const cacheKey = `${provider}\x00${model}`;
  const now = Date.now();
  const cached = perModel.get(cacheKey);
  if (cached !== undefined && cached.expiresAt > now) {
    return cached.info;
  }
  const resolved = await llm.resolveModelInfo(provider, model, signal);
  if (resolved) {
    perModel.set(cacheKey, { info: resolved, expiresAt: Date.now() + MODEL_INFO_CACHE_TTL_MS });
  }
  return resolved;
}
function deepFreeze(value) {
  if (typeof value === "object" && value !== null) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze(value[key]);
    }
  }
  return value;
}
function createFrozenUserMessage(text) {
  return deepFreeze({
    id: randomUUID(),
    role: "user",
    source: { kind: "user" },
    content: [{ type: "text", text }]
  });
}
function completedTurnPrefix(parent) {
  const events = parent.session.snapshotEvents();
  let lastEndIndex = -1;
  for (let i = events.length - 1;i >= 0; i--) {
    if (events[i]?.type === "turn/end") {
      lastEndIndex = i;
      break;
    }
  }
  if (lastEndIndex === -1)
    return [];
  return events.slice(0, lastEndIndex + 1);
}
function resolveRoute(parent, modelSpec, reasoningEffortSpec) {
  const liveModel = parent.model?.current?.();
  const requestConfig = parent.session.requestHeader?.()?.config;
  const legacySelected = parent.ctx?.get?.("modelSelection")?.getSnapshot?.();
  let parentProvider = liveModel?.provider ?? requestConfig?.provider ?? legacySelected?.provider ?? parent.options?.provider;
  let parentModel = liveModel?.model ?? requestConfig?.model ?? legacySelected?.model ?? parent.options?.model;
  let parentReasoningEffort = liveModel?.reasoningEffort ?? requestConfig?.reasoningEffort ?? parent.options?.reasoningEffort;
  if (parentProvider === undefined || parentModel === undefined) {
    const events = parent.session.snapshotEvents();
    for (let i = events.length - 1;i >= 0; i--) {
      const ev = events[i];
      if ((ev?.type === "model/selection" || ev?.type === "model/selected") && ev.data) {
        parentProvider ??= typeof ev.data["provider"] === "string" ? ev.data["provider"] : undefined;
        parentModel ??= typeof ev.data["model"] === "string" ? ev.data["model"] : undefined;
        parentReasoningEffort ??= typeof ev.data["reasoningEffort"] === "string" ? ev.data["reasoningEffort"] : undefined;
        if (parentProvider !== undefined && parentModel !== undefined)
          break;
      }
    }
  }
  const effortSelection = parseReasoningEffortSetting(reasoningEffortSpec);
  const override = resolveModelSelection(modelSpec);
  const nextProvider = override ? override.provider ?? parentProvider : parentProvider;
  const nextModel = override ? override.model : parentModel;
  const routeChanged = override !== undefined && (nextProvider !== parentProvider || nextModel !== parentModel);
  let nextEffort;
  if (effortSelection.mode === "explicit") {
    nextEffort = effortSelection.effort;
  } else if (effortSelection.mode === "inherit") {
    nextEffort = !routeChanged ? parentReasoningEffort : undefined;
  } else if (!routeChanged && parentReasoningEffort !== undefined) {
    nextEffort = clampReasoningEffort(parentReasoningEffort, DEFAULT_HELPER_REASONING_EFFORT);
  }
  return {
    ...nextProvider !== undefined ? { provider: nextProvider } : {},
    ...nextModel !== undefined ? { model: nextModel } : {},
    ...nextEffort !== undefined ? { reasoningEffort: nextEffort } : {},
    effortMode: effortSelection.mode,
    routeChanged,
    ...parentReasoningEffort !== undefined ? { parentReasoningEffort } : {}
  };
}
function parseToolArgs(raw) {
  if (typeof raw !== "string")
    return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return;
  }
}
function extractTextFromBlocks(content) {
  if (!Array.isArray(content))
    return "";
  const parts = [];
  for (const block of content) {
    if (block && typeof block === "object" && block.type === "text" && typeof block.text === "string") {
      parts.push(block.text);
    }
  }
  return parts.join("");
}
function formatTurnEndError(reason) {
  if (typeof reason === "string")
    return reason;
  if (reason && typeof reason === "object") {
    const rec = reason;
    if (typeof rec["message"] === "string" && rec["message"].trim().length > 0)
      return rec["message"];
    if (rec["error"] && typeof rec["error"] === "object" && typeof rec["error"].message === "string") {
      return rec["error"].message;
    }
    if (typeof rec["kind"] === "string")
      return `Helper stopped: ${rec["kind"]}`;
  }
  return "Helper stopped unexpectedly.";
}
async function runForkedHelper(params) {
  if (params.signal?.aborted) {
    return { status: "cancelled" };
  }
  const seed = completedTurnPrefix(params.parentAgent);
  const inheritedEventCount = seed.length;
  const parentSessionId = params.parentAgent.session.id;
  const route = resolveRoute(params.parentAgent, params.modelSpec, params.reasoningEffort);
  const ensureCwdPromise = typeof params.workingDirectory?.ensure === "function" ? params.workingDirectory.ensure(params.parentAgent, params.signal).catch(() => {
    return;
  }) : Promise.resolve(undefined);
  const resolveModelPromise = route.provider !== undefined && route.model !== undefined && typeof params.llm?.resolveModelInfo === "function" ? resolveModelInfoCached(params.llm, route.provider, route.model, params.signal).catch(() => {
    return;
  }) : Promise.resolve(undefined);
  const [ensuredCwd, resolvedInfo] = await Promise.all([ensureCwdPromise, resolveModelPromise]);
  const cwd = ensuredCwd ?? (typeof params.workingDirectory?.get === "function" ? params.workingDirectory.get(params.parentAgent.session) : undefined) ?? params.parentAgent.session.header?.cwd;
  if (resolvedInfo) {
    if (route.effortMode === "default") {
      const targetDefault = !route.routeChanged && route.parentReasoningEffort !== undefined ? clampReasoningEffort(route.parentReasoningEffort, DEFAULT_HELPER_REASONING_EFFORT) ?? DEFAULT_HELPER_REASONING_EFFORT : DEFAULT_HELPER_REASONING_EFFORT;
      const matched = matchSupportedReasoningEffort(targetDefault, resolvedInfo.reasoning);
      if (matched !== undefined) {
        route.reasoningEffort = matched;
      } else {
        delete route.reasoningEffort;
      }
    } else if (route.reasoningEffort !== undefined) {
      const matched = matchSupportedReasoningEffort(route.reasoningEffort, resolvedInfo.reasoning);
      if (matched !== undefined) {
        route.reasoningEffort = matched;
      } else {
        delete route.reasoningEffort;
      }
    }
  }
  if (route.model !== undefined) {
    const modelBase = route.provider !== undefined ? `${route.provider}/${route.model}` : route.model;
    const label = route.reasoningEffort !== undefined ? `${modelBase} · ${route.reasoningEffort}` : modelBase;
    params.onRouteResolved?.(label);
  }
  const parentDepth = typeof params.parentAgent.session.header?.delegationDepth === "number" ? params.parentAgent.session.header.delegationDepth : typeof params.parentAgent.options?.subagentDepth === "number" ? params.parentAgent.options.subagentDepth : 0;
  const childDepth = parentDepth + 1;
  const parentPreset = params.parentAgent.ctx?.get?.("agentPresets")?.composedPreset?.(params.parentAgent.ctx);
  let handle;
  const listeners = [];
  const badges = [];
  let activeTools = 0;
  let doneTools = 0;
  let completedTurnCount = 0;
  let streamingChars = 0;
  let streamedText = "";
  let lastStage = "explore";
  const emitProgress = () => {
    lastStage = computeDepthStage({
      activeTools,
      doneTools,
      completedTurnCount,
      streamingChars
    });
    params.onProgress?.({
      stage: lastStage,
      tools: badges.slice(-MAX_TOOL_BADGES),
      activeTools,
      doneTools,
      streamingChars,
      streamingPreview: extractStreamingPreview(streamedText)
    });
  };
  try {
    handle = await params.agents.create({
      sessionId: randomUUID(),
      meta: {
        origin: "subagent",
        parentSession: parentSessionId,
        isSeeded: inheritedEventCount > 0,
        delegationDepth: childDepth,
        ...cwd !== undefined ? { cwd } : {},
        ...typeof parentPreset === "string" ? { agentPreset: parentPreset } : {}
      },
      inheritedEventCount,
      ...inheritedEventCount > 0 ? {
        seed,
        parentSource: { sessionId: parentSessionId, endSeq: inheritedEventCount }
      } : {},
      agentOptions: {
        ...route.provider !== undefined ? { provider: route.provider } : {},
        ...route.model !== undefined ? { model: route.model } : {},
        ...route.reasoningEffort !== undefined ? { reasoningEffort: route.reasoningEffort } : {},
        ...typeof params.parentAgent.options?.maxTokens === "number" ? { maxTokens: params.parentAgent.options.maxTokens } : {},
        subagentDepth: childDepth
      },
      ...params.signal !== undefined ? { signal: params.signal } : {},
      setup: async (childCtx, child) => {
        if (typeof child?.session?.append === "function") {
          if (childCtx?.get?.("approval") !== undefined) {
            child.session.append("approval/policy", { policy: "never", source: "delegation" });
          }
          if (childCtx?.get?.("sandboxPolicy") !== undefined) {
            child.session.append("sandbox/mode", { mode: "read-only", source: "delegation" });
          }
        }
        const wd = childCtx?.get?.("workingDirectory");
        if (typeof wd?.set === "function" && cwd !== undefined) {
          await wd.set(child, cwd, params.signal);
        }
        if (params.parentAgent.ctx !== undefined) {
          await childCtx?.get?.("agentPresets")?.composeFrom?.(childCtx, params.parentAgent.ctx);
        }
        const toolsSvc = childCtx?.get?.("tools");
        toolsSvc?.guard?.((exec) => helperToolGuard(exec.name));
        if (route.provider !== undefined && route.model !== undefined && typeof child?.model?.select === "function") {
          child.model.select({
            provider: route.provider,
            model: route.model,
            ...route.reasoningEffort !== undefined ? { reasoningEffort: route.reasoningEffort } : {}
          });
        }
      }
    });
    if (params.signal?.aborted) {
      return { status: "cancelled" };
    }
    const agent = handle.agent;
    const outputStart = agent.session.seq;
    if (typeof agent.ctx?.on === "function") {
      listeners.push(agent.ctx.on("agent/assistant-stream", (payload) => {
        if (payload?.agent && payload.agent !== agent)
          return;
        const frame = payload?.frame;
        if (frame?.type !== "chunk")
          return;
        const chunk = frame.chunk;
        if (chunk?.type === "text-delta") {
          const delta = typeof chunk.text === "string" ? chunk.text : typeof chunk.delta === "string" ? chunk.delta : "";
          if (delta.length > 0) {
            streamingChars += delta.length;
            streamedText += delta;
            emitProgress();
          }
        }
      }));
      listeners.push(agent.ctx.on("session/event", (session, event) => {
        if (session && session !== agent.session)
          return;
        if (!event)
          return;
        if (event.type === "tool/call" && event.data) {
          const callId = String(event.data["callId"] ?? randomUUID());
          const name = String(event.data["name"] ?? "tool");
          const args = parseToolArgs(event.data["arguments"]);
          activeTools += 1;
          badges.push({
            id: callId,
            name,
            label: toolLabel(name, args),
            state: "running"
          });
          emitProgress();
        } else if (event.type === "tool/result" && event.data) {
          const msg = event.data["message"];
          const callId = typeof msg?.["toolCallId"] === "string" ? msg["toolCallId"] : undefined;
          const isError = Boolean(msg?.["isError"]);
          if (callId !== undefined) {
            const idx = badges.findIndex((b) => b.id === callId);
            if (idx !== -1 && badges[idx]?.state === "running") {
              activeTools = Math.max(0, activeTools - 1);
              doneTools += 1;
              badges[idx] = { ...badges[idx], state: isError ? "error" : "done" };
            }
          }
          emitProgress();
        } else if (event.type === "tool/ptc-dispatch-start" && event.data) {
          const callId = String(event.data["subCallId"] ?? randomUUID());
          const name = String(event.data["name"] ?? "tool");
          const args = parseToolArgs(event.data["arguments"]);
          activeTools += 1;
          badges.push({
            id: callId,
            name,
            label: toolLabel(name, args),
            state: "running"
          });
          emitProgress();
        } else if (event.type === "tool/ptc-dispatch" && event.data) {
          const callId = typeof event.data["subCallId"] === "string" ? event.data["subCallId"] : undefined;
          const isError = Boolean(event.data["isError"]);
          if (callId !== undefined) {
            const idx = badges.findIndex((b) => b.id === callId);
            if (idx !== -1 && badges[idx]?.state === "running") {
              activeTools = Math.max(0, activeTools - 1);
              doneTools += 1;
              badges[idx] = { ...badges[idx], state: isError ? "error" : "done" };
            }
          }
          emitProgress();
        } else if (event.type === "turn/end") {
          completedTurnCount += 1;
          emitProgress();
        }
      }));
    }
    const onAbort = () => {
      try {
        agent.cancel({ kind: "user" });
      } catch {}
    };
    if (params.signal) {
      params.signal.addEventListener("abort", onAbort, { once: true });
      listeners.push(() => params.signal?.removeEventListener("abort", onAbort));
    }
    const promptText = params.mode === "prompt" ? buildHelperUserPrompt(params.instructions, params.inputText, seed.length > 0) : buildBriefUserPrompt(params.instructions, params.inputText, seed.length > 0);
    emitProgress();
    agent.followup(createFrozenUserMessage(promptText));
    await agent.whenIdle();
    if (params.signal?.aborted) {
      return { status: "cancelled" };
    }
    const newEvents = agent.session.snapshotEvents(outputStart);
    let lastAssistantText = "";
    let lastTurnEnd;
    for (const ev of newEvents) {
      if (ev.type === "assistant/message") {
        const text = extractTextFromBlocks(ev.data?.["message"]?.content);
        if (text.trim().length > 0)
          lastAssistantText = text;
      } else if (ev.type === "turn/end") {
        lastTurnEnd = ev;
      }
    }
    const endReason = lastTurnEnd?.data?.["reason"];
    if (endReason?.["kind"] === "aborted" || endReason?.["kind"] === "canceled") {
      return { status: "cancelled" };
    }
    if (endReason?.["kind"] === "error") {
      return {
        status: "failed",
        error: formatTurnEndError(endReason)
      };
    }
    if (lastAssistantText.trim().length === 0) {
      return {
        status: "failed",
        error: "Helper finished without producing assistant output."
      };
    }
    const parsed = params.mode === "prompt" ? parseImproved(lastAssistantText) : parseCheckedBrief(lastAssistantText);
    if (parsed !== undefined) {
      return {
        status: "completed",
        output: parsed,
        rawReply: lastAssistantText
      };
    }
    const fallbackPath = writeFallbackReply(lastAssistantText, params.mode);
    return {
      status: "failed",
      error: params.mode === "prompt" ? "Helper reply omitted <improved-prompt>...</improved-prompt> tags." : "Brief checker omitted <checked-brief>...</checked-brief> tags.",
      fallbackPath
    };
  } catch (error) {
    if (params.signal?.aborted || error instanceof Error && error.name === "AbortError") {
      return { status: "cancelled" };
    }
    return {
      status: "failed",
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    for (const off of listeners) {
      try {
        off();
      } catch {}
    }
    if (handle !== undefined) {
      await handle.dispose().catch(() => {});
    }
  }
}

// src/host/index.ts
var name = "dsh-better";
var inject = ["commands", "agents"];
function loadPromptFile(filename) {
  const candidates = [
    new URL(`../../prompts/${filename}`, import.meta.url),
    new URL(`../prompts/${filename}`, import.meta.url)
  ];
  for (const url of candidates) {
    if (existsSync(url)) {
      return readFileSync(url, "utf8");
    }
  }
  throw new Error(`dsh-better: missing prompt asset "${filename}"`);
}
function normalizeNullableModelSetting(value) {
  if (typeof value !== "string")
    return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || isInheritSentinel(trimmed))
    return null;
  return trimmed;
}
function normalizeNullableEffortSetting(value) {
  if (typeof value !== "string")
    return null;
  const trimmed = value.trim();
  if (trimmed.length === 0)
    return null;
  const lower = trimmed.toLowerCase();
  if (lower === "default" || lower === "auto")
    return null;
  if (lower === "inherit")
    return "inherit";
  return trimmed;
}
function normalizeConfig(raw) {
  const rec = typeof raw === "object" && raw !== null ? raw : {};
  return {
    model: normalizeNullableModelSetting(rec["model"]),
    reasoningEffort: normalizeNullableEffortSetting(rec["reasoningEffort"]),
    briefModel: normalizeNullableModelSetting(rec["briefModel"]),
    briefReasoningEffort: normalizeNullableEffortSetting(rec["briefReasoningEffort"]),
    checkSubagents: rec["checkSubagents"] !== false
  };
}
function resolveSettingsPath(ctx) {
  const profileDir = ctx?.get?.("profileContext")?.dir;
  if (typeof profileDir === "string" && profileDir.trim().length > 0) {
    return path2.join(profileDir, "dsh-better.settings.json");
  }
  return;
}
function readPersistedConfig(settingsPath) {
  if (!settingsPath || !existsSync(settingsPath))
    return {};
  try {
    const parsed = JSON.parse(readFileSync(settingsPath, "utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
      return {};
    const rec = parsed;
    return {
      ...Object.hasOwn(rec, "model") ? { model: normalizeNullableModelSetting(rec["model"]) } : {},
      ...Object.hasOwn(rec, "reasoningEffort") ? { reasoningEffort: normalizeNullableEffortSetting(rec["reasoningEffort"]) } : {},
      ...Object.hasOwn(rec, "briefModel") ? { briefModel: normalizeNullableModelSetting(rec["briefModel"]) } : {},
      ...Object.hasOwn(rec, "briefReasoningEffort") ? { briefReasoningEffort: normalizeNullableEffortSetting(rec["briefReasoningEffort"]) } : {},
      ...typeof rec["checkSubagents"] === "boolean" ? { checkSubagents: rec["checkSubagents"] } : {}
    };
  } catch {
    return {};
  }
}
function writePersistedConfig(settingsPath, config) {
  const dir = path2.dirname(settingsPath);
  mkdirSync2(dir, { recursive: true });
  const tmpPath = path2.join(dir, `.dsh-better.settings.${process.pid}.${randomUUID2()}.tmp`);
  writeFileSync2(tmpPath, `${JSON.stringify(config, null, 2)}
`, { encoding: "utf8", mode: 384 });
  renameSync(tmpPath, settingsPath);
}
async function readModelCatalog(ctx) {
  const llm = ctx?.get?.("llm");
  if (!llm || typeof llm.listProviders !== "function" || typeof llm.listModels !== "function") {
    return { models: [], providerFailures: [] };
  }
  let providers;
  try {
    providers = llm.listProviders();
  } catch (error) {
    return {
      models: [],
      providerFailures: [{
        id: "llm",
        name: "LLM Registry",
        message: error instanceof Error ? error.message : String(error)
      }]
    };
  }
  const results = await Promise.all(providers.map(async (provider) => {
    try {
      const models = await llm.listModels(provider.id);
      const entries = await Promise.all(models.map(async (model) => {
        let resolved;
        if (typeof llm.resolveModelInfo === "function") {
          try {
            resolved = await llm.resolveModelInfo(provider.id, model.id);
          } catch {
            resolved = undefined;
          }
        }
        const reasoningEfforts = resolved?.reasoning?.efforts.map((e) => ({
          id: e.id,
          name: e.name,
          ...e.description !== undefined ? { description: e.description } : {}
        })) ?? [];
        const defaultReasoningEffort = resolved?.reasoning?.defaultEffort;
        return {
          provider: provider.id,
          providerName: provider.name,
          model: model.id,
          modelName: model.name,
          value: `${provider.id}/${model.id}`,
          ...model.description !== undefined ? { description: model.description } : {},
          ...model.badge !== undefined ? { badge: model.badge } : {},
          reasoningEfforts,
          ...defaultReasoningEffort !== undefined ? { defaultReasoningEffort } : {}
        };
      }));
      return { kind: "ok", entries };
    } catch (error) {
      return {
        kind: "err",
        failure: {
          id: provider.id,
          name: provider.name,
          message: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }));
  return {
    models: results.flatMap((r) => r.kind === "ok" ? r.entries : []),
    providerFailures: results.flatMap((r) => r.kind === "err" ? [r.failure] : [])
  };
}
function formatEffortLabel(effort, fallbackLabel) {
  if (effort === "inherit")
    return "inherit (follow current session)";
  return effort ?? fallbackLabel;
}
function formatSettingsSummary(config, models) {
  const lines = [
    "dsh-better settings:",
    `  model: ${config.model ?? "inherit (follow current session · reuses KV cache)"}`,
    `  reasoningEffort: ${formatEffortLabel(config.reasoningEffort, "low (default · fast)")}`,
    `  checkSubagents: ${config.checkSubagents ? "enabled" : "disabled"}`,
    `  briefModel: ${config.briefModel ?? (config.model ? `same as model (${config.model})` : "inherit")}`,
    `  briefReasoningEffort: ${formatEffortLabel(config.briefReasoningEffort, config.reasoningEffort ? `same as reasoningEffort (${config.reasoningEffort})` : "low (default · fast)")}`
  ];
  if (models.length > 0) {
    lines.push("", "Available models:");
    for (const m of models.slice(0, 16)) {
      const efforts = m.reasoningEfforts.length > 0 ? ` [efforts: ${m.reasoningEfforts.map((e) => e.id).join(", ")}]` : "";
      lines.push(`  - ${m.value} (${m.modelName})${efforts}`);
    }
    if (models.length > 16) {
      lines.push(`  ... and ${models.length - 16} more (open Settings -> Prompt Deepener to browse all)`);
    }
  }
  lines.push("", "Usage:", "  /better-model <provider/model> [effort]", "  /better-model effort <off|none|low|medium|high|max|default|inherit>", "  /better-model brief <same|inherit|<provider/model>> [effort]", "  /better-model subagents <on|off>", "  /better-model reset [all]");
  return lines.join(`
`);
}
function rpcOk(value) {
  return { ok: true, value };
}
function rpcError(code, message) {
  return { ok: false, error: { code, message, details: {} } };
}
function snapshotWithLiveElapsed(snapshot, now = Date.now()) {
  if (snapshot.status !== "running")
    return snapshot;
  return {
    ...snapshot,
    elapsedMs: Math.max(0, now - snapshot.startedAt)
  };
}
function apply(ctx, rawConfig) {
  const baselineConfig = normalizeConfig(rawConfig);
  const settingsPath = resolveSettingsPath(ctx);
  let currentConfig = normalizeConfig({
    ...baselineConfig,
    ...readPersistedConfig(settingsPath)
  });
  const helperInstructions = loadPromptFile("helper.md");
  const briefInstructions = loadPromptFile("brief.md");
  const runsBySession = new Map;
  let rpcMounted = false;
  const getActiveRecord = (sessionId) => {
    const rec = runsBySession.get(sessionId);
    return rec?.snapshot.status === "running" ? rec : undefined;
  };
  const saveConfig = (patch) => {
    const next = normalizeConfig({
      model: Object.hasOwn(patch, "model") ? patch.model : currentConfig.model,
      reasoningEffort: Object.hasOwn(patch, "reasoningEffort") ? patch.reasoningEffort : currentConfig.reasoningEffort,
      briefModel: Object.hasOwn(patch, "briefModel") ? patch.briefModel : currentConfig.briefModel,
      briefReasoningEffort: Object.hasOwn(patch, "briefReasoningEffort") ? patch.briefReasoningEffort : currentConfig.briefReasoningEffort,
      checkSubagents: typeof patch.checkSubagents === "boolean" ? patch.checkSubagents : currentConfig.checkSubagents
    });
    currentConfig = next;
    if (settingsPath !== undefined) {
      writePersistedConfig(settingsPath, next);
    }
    return next;
  };
  const resetConfig = () => {
    currentConfig = { ...baselineConfig };
    if (settingsPath !== undefined && existsSync(settingsPath)) {
      rmSync(settingsPath, { force: true });
    }
    return currentConfig;
  };
  const buildSettingsPayload = async () => {
    const catalog = await readModelCatalog(ctx);
    return {
      config: { ...currentConfig },
      models: catalog.models,
      providerFailures: catalog.providerFailures,
      ...settingsPath !== undefined ? { persistedPath: settingsPath } : {},
      writable: true
    };
  };
  const startPromptRun = (agent, draft, parentSignal) => {
    const sessionId = agent.session.id;
    const now = Date.now();
    const controller = new AbortController;
    if (parentSignal) {
      if (parentSignal.aborted) {
        controller.abort(parentSignal.reason);
      } else {
        const forwardAbort = () => {
          controller.abort(parentSignal.reason);
        };
        parentSignal.addEventListener("abort", forwardAbort, { once: true });
      }
    }
    const initial = {
      runId: randomUUID2(),
      sessionId,
      sourceDraft: draft,
      status: "running",
      stage: "explore",
      startedAt: now,
      updatedAt: now,
      elapsedMs: 0,
      turn: 0,
      tools: [],
      activeTools: 0,
      doneTools: 0,
      streamingChars: 0
    };
    const record = { snapshot: initial, controller };
    runsBySession.set(sessionId, record);
    const agents = ctx.agents;
    const promise = runForkedHelper({
      agents,
      workingDirectory: ctx.get?.("workingDirectory"),
      llm: ctx.get?.("llm"),
      parentAgent: agent,
      mode: "prompt",
      instructions: helperInstructions,
      inputText: draft,
      modelSpec: currentConfig.model,
      reasoningEffort: currentConfig.reasoningEffort,
      signal: controller.signal,
      onRouteResolved: (modelLabel) => {
        if (runsBySession.get(sessionId) !== record || record.snapshot.status !== "running")
          return;
        record.snapshot = { ...record.snapshot, modelLabel };
      },
      onProgress: (progress) => {
        if (runsBySession.get(sessionId) !== record || record.snapshot.status !== "running")
          return;
        const tick = Date.now();
        record.snapshot = {
          ...record.snapshot,
          stage: progress.stage,
          tools: progress.tools,
          activeTools: progress.activeTools,
          doneTools: progress.doneTools,
          streamingChars: progress.streamingChars,
          ...progress.streamingPreview.length > 0 ? { streamingPreview: progress.streamingPreview } : {},
          updatedAt: tick,
          elapsedMs: Math.max(0, tick - record.snapshot.startedAt)
        };
      }
    }).then((outcome) => {
      const doneAt = Date.now();
      const elapsedMs = Math.max(0, doneAt - record.snapshot.startedAt);
      if (outcome.status === "completed") {
        record.snapshot = {
          ...record.snapshot,
          status: "completed",
          stage: "sharpen",
          updatedAt: doneAt,
          elapsedMs,
          improvedPrompt: outcome.output
        };
      } else if (outcome.status === "cancelled") {
        record.snapshot = {
          ...record.snapshot,
          status: "cancelled",
          updatedAt: doneAt,
          elapsedMs
        };
      } else {
        record.snapshot = {
          ...record.snapshot,
          status: "failed",
          updatedAt: doneAt,
          elapsedMs,
          error: outcome.error,
          ...outcome.fallbackPath !== undefined ? { fallbackPath: outcome.fallbackPath } : {}
        };
      }
      return record.snapshot;
    });
    return { record, promise };
  };
  ctx.effect(() => () => {
    rpcMounted = false;
    for (const rec of runsBySession.values()) {
      if (rec.snapshot.status === "running") {
        rec.controller.abort();
      }
    }
    runsBySession.clear();
  }, "dsh-better:abort-active-runs");
  ctx.effect(() => ctx.commands.register({
    definitionId: "dsh-better:better",
    name: "better",
    description: "Deepen a prompt draft against the repository and current session before sending",
    input: { hint: "<draft prompt>", attachments: false },
    recordInput: false,
    handler: async (invocation) => {
      const draft = invocation.rawInput.trim();
      if (draft.length === 0) {
        return { kind: "error", text: "Usage: /better <draft prompt>" };
      }
      const sessionId = invocation.agent.session.id;
      if (getActiveRecord(sessionId) !== undefined) {
        return {
          kind: "error",
          text: "A /better run is already active in this session. Press Esc or run /better-cancel first."
        };
      }
      if (rpcMounted) {
        startPromptRun(invocation.agent, draft).promise.catch(() => {
          return;
        });
        return { kind: "success", text: "Deepening prompt in background…" };
      }
      const { promise } = startPromptRun(invocation.agent, draft, invocation.signal);
      const finalSnapshot = await promise;
      if (finalSnapshot.status === "completed" && finalSnapshot.improvedPrompt !== undefined) {
        return { kind: "success", text: finalSnapshot.improvedPrompt };
      }
      if (finalSnapshot.status === "cancelled") {
        return { kind: "error", text: "/better cancelled." };
      }
      const fallbackNote = finalSnapshot.fallbackPath ? ` Raw reply saved to: ${finalSnapshot.fallbackPath}` : "";
      return {
        kind: "error",
        text: `${finalSnapshot.error ?? "Failed to deepen prompt."}${fallbackNote}`
      };
    }
  }), "dsh-better:command-better");
  ctx.effect(() => ctx.commands.register({
    definitionId: "dsh-better:cancel",
    name: "better-cancel",
    description: "Cancel the active /better prompt-deepening run in this session",
    recordInput: false,
    handler: (invocation) => {
      const active = getActiveRecord(invocation.agent.session.id);
      if (active === undefined) {
        return { kind: "success", text: "No active /better run in this session." };
      }
      active.controller.abort();
      return { kind: "success", text: "Cancelled /better prompt deepening." };
    }
  }), "dsh-better:command-cancel");
  ctx.effect(() => ctx.commands.register({
    definitionId: "dsh-better:model",
    name: "better-model",
    description: "View or configure the model, reasoning effort, and subagent brief settings for /better",
    input: { hint: "[inherit | <provider/model> [effort] | effort <level> | brief <model> | subagents <on|off> | reset]", attachments: false },
    recordInput: false,
    handler: async (invocation) => {
      const raw = (invocation.rawInput ?? "").trim();
      if (raw.length === 0) {
        const catalog = await readModelCatalog(ctx);
        return { kind: "success", text: formatSettingsSummary(currentConfig, catalog.models) };
      }
      const tokens = raw.split(/\s+/).filter(Boolean);
      const head = tokens[0].toLowerCase();
      if (head === "reset" && tokens[1]?.toLowerCase() === "all") {
        const next2 = resetConfig();
        return {
          kind: "success",
          text: `Reset all dsh-better settings to defaults (model=${next2.model ?? "inherit"}, reasoningEffort=${next2.reasoningEffort ?? "low (default · fast)"}, checkSubagents=${next2.checkSubagents}).`
        };
      }
      if (head === "reset" || isInheritSentinel(head)) {
        saveConfig({ model: null, reasoningEffort: null });
        return {
          kind: "success",
          text: "Updated /better to inherit current session model with fast low reasoning effort (KV prompt cache enabled)."
        };
      }
      if (head === "effort" || head === "thinking") {
        const effortArg2 = tokens[1];
        if (!effortArg2) {
          return { kind: "error", text: "Usage: /better-model effort <off|none|low|medium|high|max|default|inherit>" };
        }
        const next2 = saveConfig({ reasoningEffort: normalizeNullableEffortSetting(effortArg2) });
        return {
          kind: "success",
          text: `Updated /better reasoningEffort to ${formatEffortLabel(next2.reasoningEffort, "low (default · fast)")}.`
        };
      }
      if (head === "subagents" || head === "check-subagents") {
        const flag = tokens[1]?.toLowerCase();
        if (flag === "on" || flag === "true" || flag === "enable" || flag === "enabled") {
          saveConfig({ checkSubagents: true });
          return { kind: "success", text: "Enabled subagent /better brief checking." };
        }
        if (flag === "off" || flag === "false" || flag === "disable" || flag === "disabled") {
          saveConfig({ checkSubagents: false });
          return { kind: "success", text: "Disabled subagent /better brief checking." };
        }
        return { kind: "error", text: "Usage: /better-model subagents <on|off>" };
      }
      if (head === "brief") {
        const briefArg = tokens[1];
        if (!briefArg) {
          return { kind: "error", text: "Usage: /better-model brief <same|inherit|<provider/model>> [effort]" };
        }
        const briefLower = briefArg.toLowerCase();
        const nextBriefModel = briefLower === "same" ? null : normalizeNullableModelSetting(briefArg);
        const effortArg2 = tokens[2];
        const patch = {
          briefModel: nextBriefModel,
          ...effortArg2 !== undefined ? { briefReasoningEffort: normalizeNullableEffortSetting(effortArg2) } : {},
          ...briefLower === "same" && effortArg2 === undefined ? { briefReasoningEffort: null } : {}
        };
        const next2 = saveConfig(patch);
        return {
          kind: "success",
          text: `Updated subagent /better brief model to ${next2.briefModel ?? "same as /better model"}${next2.briefReasoningEffort ? ` (effort=${next2.briefReasoningEffort})` : ""}.`
        };
      }
      const nextModel = normalizeNullableModelSetting(tokens[0]);
      const effortArg = tokens[1];
      const next = saveConfig({
        model: nextModel,
        ...effortArg !== undefined ? { reasoningEffort: normalizeNullableEffortSetting(effortArg) } : {}
      });
      return {
        kind: "success",
        text: `Updated /better model to ${next.model ?? "inherit"}${next.reasoningEffort ? ` · ${next.reasoningEffort}` : ""}.`
      };
    }
  }), "dsh-better:command-model");
  const dispatchBetterRpc = async (action, payload) => {
    const body = typeof payload === "object" && payload !== null ? payload : {};
    if (action === "settings-get") {
      return rpcOk(await buildSettingsPayload());
    }
    if (action === "settings-set") {
      if (body["reset"] === true) {
        resetConfig();
        return rpcOk(await buildSettingsPayload());
      }
      const rawPatch = body["config"];
      if (typeof rawPatch !== "object" || rawPatch === null || Array.isArray(rawPatch)) {
        return rpcError("INVALID_REQUEST", "config object is required");
      }
      const patchObj = rawPatch;
      const patch = {
        ...Object.hasOwn(patchObj, "model") ? { model: normalizeNullableModelSetting(patchObj["model"]) } : {},
        ...Object.hasOwn(patchObj, "reasoningEffort") ? { reasoningEffort: normalizeNullableEffortSetting(patchObj["reasoningEffort"]) } : {},
        ...Object.hasOwn(patchObj, "briefModel") ? { briefModel: normalizeNullableModelSetting(patchObj["briefModel"]) } : {},
        ...Object.hasOwn(patchObj, "briefReasoningEffort") ? { briefReasoningEffort: normalizeNullableEffortSetting(patchObj["briefReasoningEffort"]) } : {},
        ...typeof patchObj["checkSubagents"] === "boolean" ? { checkSubagents: patchObj["checkSubagents"] } : {}
      };
      saveConfig(patch);
      return rpcOk(await buildSettingsPayload());
    }
    const sessionId = typeof body["sessionId"] === "string" ? body["sessionId"] : "";
    if (sessionId.length === 0) {
      return rpcError("INVALID_REQUEST", "sessionId is required");
    }
    if (action === "status") {
      const rec = runsBySession.get(sessionId);
      return rpcOk(rec === undefined ? null : snapshotWithLiveElapsed(rec.snapshot));
    }
    if (action === "cancel") {
      const active = getActiveRecord(sessionId);
      if (active === undefined)
        return rpcOk({ cancelled: false });
      const runId = typeof body["runId"] === "string" ? body["runId"] : undefined;
      if (runId !== undefined && active.snapshot.runId !== runId) {
        return rpcOk({ cancelled: false });
      }
      active.controller.abort();
      return rpcOk({ cancelled: true });
    }
    if (action === "ack") {
      const rec = runsBySession.get(sessionId);
      const runId = typeof body["runId"] === "string" ? body["runId"] : undefined;
      if (rec !== undefined && rec.snapshot.status !== "running" && (runId === undefined || rec.snapshot.runId === runId)) {
        runsBySession.delete(sessionId);
        return rpcOk({ cleared: true });
      }
      return rpcOk({ cleared: false });
    }
    return rpcError("UNKNOWN_ENDPOINT", `Unknown dsh-better endpoint "${String(action)}"`);
  };
  const handleBetterFetchRequest = async (action, request) => {
    if (request.method !== "POST") {
      return new Response("not found", { status: 404 });
    }
    const mediaType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (mediaType !== "application/json") {
      return new Response("content type must be application/json", { status: 415 });
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response("body is not JSON", { status: 400 });
    }
    const isPlainObj = typeof body === "object" && body !== null && !Array.isArray(body);
    const rec = isPlainObj ? body : undefined;
    const rawId = typeof rec?.["rpcId"] === "string" && rec["rpcId"].length > 0 ? rec["rpcId"] : "invalid-request";
    if (!rec || rec["type"] !== "client-request" || typeof rec["rpcId"] !== "string" || rec["rpcId"].length === 0 || typeof rec["method"] !== "string") {
      return Response.json({
        type: "server-response",
        rpcId: rawId,
        result: rpcError("gateway/bad-request", "invalid client-request message")
      });
    }
    const expectedMethod = `dsh-better/${action}`;
    if (rec["method"] !== expectedMethod) {
      return Response.json({
        type: "server-response",
        rpcId: rec["rpcId"],
        result: rpcError("gateway/bad-request", `method ${JSON.stringify(rec["method"])} does not match endpoint ${JSON.stringify(expectedMethod)}`)
      });
    }
    return Response.json({
      type: "server-response",
      rpcId: rec["rpcId"],
      result: await dispatchBetterRpc(action, rec["payload"])
    });
  };
  ctx.inject?.(["connection", "webServer"], (connCtx) => {
    const actions = ["status", "cancel", "ack", "settings-get", "settings-set"];
    for (const action of actions) {
      connCtx.connection.fetch.register({
        path: `/api/dsh-better/${action}`,
        methods: ["POST"],
        requestBody: "buffered",
        fetch: (request) => handleBetterFetchRequest(action, request)
      });
    }
    if (typeof connCtx.effect === "function") {
      connCtx.effect(() => {
        rpcMounted = true;
        return () => {
          rpcMounted = false;
        };
      }, "dsh-better:rpc-mounted");
    } else {
      rpcMounted = true;
    }
  });
  ctx.inject?.(["subagents"], (subCtx) => {
    subCtx.effect(() => {
      const subagents = subCtx.subagents;
      if (!subagents || typeof subagents.startActivation !== "function")
        return () => {};
      const originalStart = subagents.startActivation.bind(subagents);
      const wrappedStart = async (spec) => {
        if (!currentConfig.checkSubagents)
          return originalStart(spec);
        const prompt = Array.isArray(spec?.["prompt"]) ? spec["prompt"] : undefined;
        if (!prompt)
          return originalStart(spec);
        const firstTextIndex = prompt.findIndex((block) => block && block["type"] === "text" && typeof block["text"] === "string");
        if (firstTextIndex === -1)
          return originalStart(spec);
        const targetBlock = prompt[firstTextIndex];
        const { matched, brief } = matchBriefMark(String(targetBlock["text"]));
        if (!matched)
          return originalStart(spec);
        if (brief.length === 0) {
          throw new Error("Subagent brief prefixed with /better cannot be empty.");
        }
        const parentAgent = spec["parent"];
        if (!parentAgent) {
          throw new Error("Subagent /better brief checking requires a live parent agent.");
        }
        const outcome = await runForkedHelper({
          agents: ctx.agents,
          workingDirectory: ctx.get?.("workingDirectory"),
          llm: ctx.get?.("llm"),
          parentAgent,
          mode: "brief",
          instructions: briefInstructions,
          inputText: brief,
          modelSpec: currentConfig.briefModel ?? currentConfig.model,
          reasoningEffort: currentConfig.briefReasoningEffort ?? currentConfig.reasoningEffort,
          signal: spec["signal"]
        });
        if (outcome.status === "cancelled") {
          throw new Error("Subagent brief check cancelled before dispatch.");
        }
        if (outcome.status === "failed") {
          const extra = outcome.fallbackPath ? ` (raw output: ${outcome.fallbackPath})` : "";
          throw new Error(`Subagent brief check failed: ${outcome.error}${extra}`);
        }
        const nextPrompt = prompt.map((block, index) => index === firstTextIndex ? { ...block, text: outcome.output } : block);
        return originalStart({ ...spec, prompt: nextPrompt });
      };
      subagents.startActivation = wrappedStart;
      return () => {
        if (subagents.startActivation === wrappedStart) {
          subagents.startActivation = originalStart;
        }
      };
    }, "dsh-better:subagent-brief-check");
  });
}
export {
  name,
  inject,
  apply
};
