import { Injectable, Logger } from '@nestjs/common';

import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { type CurrencyMetadata } from 'twenty-shared/types';

import {
  type RiskFlagOutcome,
  type RiskFlagReason,
} from 'src/modules/opportunity/query-hooks/opportunity-risk-flag-suggestion.service';

// v1 prototype: calls a local Ollama server directly (via its
// OpenAI-compatible endpoint) rather than going through the full
// ai-chat/agent framework (chat-execution.service.ts, built for
// interactive multi-turn tool-using chat) or a paid provider - keeps this
// feature demo-able at zero API cost. Requires `ollama serve` running
// locally with RATIONALE_MODEL_ID pulled (`ollama pull llama3.1`).
// Revisit if this becomes a real shipped feature - a local open model is
// noticeably weaker than Claude/GPT at precise, figure-grounded text.
const OLLAMA_BASE_URL = 'http://localhost:11434/v1';
const RATIONALE_MODEL_ID = 'llama3.1';

const OUTCOME_LABEL: Record<RiskFlagOutcome, string> = {
  APPROVE: 'Approve',
  MANUALREVIEW: 'Manual Review',
  DECLINE: 'Decline',
};

export type RiskFlagRationaleInputs = {
  outcome: RiskFlagOutcome;
  reasons: RiskFlagReason[];
  loanAmount: CurrencyMetadata | null | undefined;
  currentLoanToValueRatio: number | null | undefined;
  worstCaseLoanToValueRatio: number | null | undefined;
  yearEndCashBalance: CurrencyMetadata | null | undefined;
};

@Injectable()
export class OpportunityRiskFlagRationaleService {
  private readonly logger = new Logger(OpportunityRiskFlagRationaleService.name);

  async generateRationale(inputs: RiskFlagRationaleInputs): Promise<string> {
    try {
      // Ollama ignores the API key value but the SDK requires a non-empty
      // string to construct the client.
      const ollama = createOpenAI({
        baseURL: OLLAMA_BASE_URL,
        apiKey: 'ollama',
      });

      const { text } = await generateText({
        model: ollama(RATIONALE_MODEL_ID),
        prompt: this.buildPrompt(inputs),
      });

      const rationale = text.trim();

      return rationale.length > 0
        ? rationale
        : this.buildTemplatedFallbackRationale(inputs);
    } catch (error) {
      this.logger.warn(
        `Falling back to templated risk-flag rationale after LLM call failed (is 'ollama serve' running with ${RATIONALE_MODEL_ID} pulled?): ${error}`,
      );

      return this.buildTemplatedFallbackRationale(inputs);
    }
  }

  private buildPrompt(inputs: RiskFlagRationaleInputs): string {
    const { outcome, reasons } = inputs;

    return [
      'You are writing a compliance rationale for a farm loan officer.',
      `The deterministic rules engine has already decided the outcome: ${OUTCOME_LABEL[outcome]}.`,
      'Do not suggest a different outcome and do not second-guess this decision - your only job is to explain it.',
      'The triggering factors below are the ONLY facts you may cite. Do not invent, estimate, or reference any figure not listed here.',
      '',
      'Triggering factors:',
      ...reasons.map((reason) => `- ${reason.message}`),
      '',
      'Write a short bulleted rationale (one bullet per triggering factor, using "•") explaining the decision to the loan officer.',
      'Be direct and specific. Do not add a summary sentence, a greeting, or any text besides the bullets.',
    ].join('\n');
  }

  // No AI - this is the same information as the AI Suggested Triggering
  // Factors field, just formatted as prose bullets. Used when Ollama isn't
  // running or the call otherwise fails, so a save never fails outright.
  private buildTemplatedFallbackRationale(
    inputs: RiskFlagRationaleInputs,
  ): string {
    return inputs.reasons.map((reason) => `• ${reason.message}`).join('\n');
  }
}
