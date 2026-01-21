import * as vscode from 'vscode';
import { Session } from '../core/session';
import { ensureApiKey, ensureCodexOAuth } from './auth';
import { getDefaultModelChoice, getProviderDefinition, MODEL_CHOICES } from './registry';
import { LlmSelection, ModelChoice } from './types';

interface ModelPickItem extends vscode.QuickPickItem {
  model: ModelChoice;
}

const LLM_SELECTION_GLOBAL_KEY = 'gdd.llm.selection';

export async function getGlobalLlmSelection(
  context: vscode.ExtensionContext
): Promise<LlmSelection | undefined> {
  return context.globalState.get<LlmSelection>(LLM_SELECTION_GLOBAL_KEY);
}

export async function setGlobalLlmSelection(
  context: vscode.ExtensionContext,
  selection: LlmSelection | undefined
): Promise<void> {
  await context.globalState.update(LLM_SELECTION_GLOBAL_KEY, selection);
}

export async function resolveLlmSelection(
  context: vscode.ExtensionContext,
  session?: Session
): Promise<LlmSelection | undefined> {
  const existing = session
    ? session.getState().llmSelection
    : await getGlobalLlmSelection(context);

  if (existing?.providerId && existing?.modelId) {
    if (await ensureProviderCredentials(context, existing.providerId)) {
      return existing;
    }
  }

  const items: ModelPickItem[] = MODEL_CHOICES.map(choice => ({
    label: choice.label,
    description: choice.description,
    detail: choice.detail,
    model: choice
  }));

  const selection = await vscode.window.showQuickPick(items, {
    placeHolder: '选择访谈使用的 LLM 模型',
    ignoreFocusOut: true
  });

  if (!selection) {
    return undefined;
  }

  let finalModelId = selection.model.modelId;
  if (selection.model.requiresModelId) {
    const inputId = await vscode.window.showInputBox({
      prompt: '请输入模型 ID',
      ignoreFocusOut: true
    });
    if (!inputId) {
      return undefined;
    }
    finalModelId = inputId;
  }

  const chosen: LlmSelection = {
    providerId: selection.model.providerId,
    modelId: finalModelId!
  };

  if (!(await ensureProviderCredentials(context, chosen.providerId))) {
    return undefined;
  }

  if (session) {
    await session.setLlmSelection(chosen);
  }
  await setGlobalLlmSelection(context, chosen);

  return chosen;
}

export function getDefaultSelection(): LlmSelection {
  const defaultChoice = getDefaultModelChoice();
  return {
    providerId: defaultChoice.providerId,
    modelId: defaultChoice.modelId || defaultChoice.id
  };
}

async function ensureProviderCredentials(
  context: vscode.ExtensionContext,
  providerId: string
): Promise<boolean> {
  const provider = getProviderDefinition(providerId);

  try {
    if (provider.auth === 'codex-oauth') {
      await ensureCodexOAuth(context);
      return true;
    }

    const prompt = provider.id.startsWith('opencode-zen')
      ? '请输入 OpenCode Zen API Key (https://opencode.ai/auth)'
      : `请输入 ${provider.label} API Key`;

    await ensureApiKey(context, provider.id, prompt);
    return true;
  } catch (err) {
    return false;
  }
}
