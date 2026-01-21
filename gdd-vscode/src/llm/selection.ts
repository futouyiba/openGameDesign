import * as vscode from 'vscode';
import { Session } from '../core/session';
import { ensureApiKey, ensureCodexOAuth } from './auth';
import { getDefaultModelChoice, getProviderDefinition, MODEL_CHOICES } from './registry';
import { LlmSelection, ModelChoice } from './types';

interface ModelPickItem extends vscode.QuickPickItem {
  model: ModelChoice;
}

export async function resolveLlmSelection(
  context: vscode.ExtensionContext,
  session: Session
): Promise<LlmSelection> {
  const existing = session.getState().llmSelection;
  if (existing?.providerId && existing?.modelId) {
    await ensureProviderCredentials(context, existing.providerId);
    return existing;
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
    throw new Error('需要选择模型才能继续');
  }

  let modelId = selection.model.modelId;
  if (selection.model.requiresModelId) {
    modelId = await vscode.window.showInputBox({
      prompt: '请输入模型 ID',
      ignoreFocusOut: true
    });
  }

  if (!modelId) {
    throw new Error('模型 ID 不能为空');
  }

  const chosen: LlmSelection = {
    providerId: selection.model.providerId,
    modelId
  };

  await ensureProviderCredentials(context, chosen.providerId);
  await session.setLlmSelection(chosen);

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
): Promise<void> {
  const provider = getProviderDefinition(providerId);

  if (provider.auth === 'codex-oauth') {
    await ensureCodexOAuth(context);
    return;
  }

  const prompt = provider.id.startsWith('opencode-zen')
    ? '请输入 OpenCode Zen API Key (https://opencode.ai/auth)'
    : `请输入 ${provider.label} API Key`;

  await ensureApiKey(context, provider.id, prompt);
}
