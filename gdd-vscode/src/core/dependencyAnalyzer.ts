import { AIClient } from '../utils/ai';
import { DocumentMetadata, Dependency } from './types';
import * as path from 'path';

export class DependencyAnalyzer {
    constructor(private ai: AIClient) { }

    public async analyze(targetDoc: DocumentMetadata, allDocs: DocumentMetadata[]): Promise<Dependency[]> {
        // Filter out self
        const candidates = allDocs.filter(d => d.file !== targetDoc.file);
        if (candidates.length === 0) return [];

        const candidatesText = candidates
            .map((d, i) => `${i + 1}. [${d.file}]: ${d.summary}`)
            .join('\n');

        const prompt = `
You are a Game Design Document Dependency Analyzer.
Your task is to identify dependencies between the Target Document and a list of Candidate Documents.

Target Document: "${targetDoc.file}"
Summary: "${targetDoc.summary}"

Candidate Documents:
${candidatesText}

Identify two types of dependencies:
1. INHERITANCE (extends): The Target Document implies a need to follow the high-level vision, core rules, or constraints defined in the Candidate. (e.g., "Combat System" inherits "Game Vision").
2. REFERENCE (references): The Target Document mentions specific data, systems, or tables that are detailed in the Candidate. (e.g., "Skill List" references "Damage Formula").

Return a JSON array of dependencies. Example:
[
  { "file": "game_vision.md", "type": "INHERITANCE", "reason": "Target follows high-level vision" },
  { "file": "damage_formula.md", "type": "REFERENCE", "reason": "Target mentions damage calculations" }
]

If no dependencies are found, return [].
Only return the JSON array.
`;

        try {
            const response = await this.ai.chat([{ role: 'user', content: prompt }]);
            const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(cleanJson);

            // Validate result structure
            if (!Array.isArray(result)) return [];

            return result.filter((item: any) =>
                item.file &&
                (item.type === 'INHERITANCE' || item.type === 'REFERENCE')
            ).map((item: any) => ({
                file: item.file,
                type: item.type as 'INHERITANCE' | 'REFERENCE'
            }));

        } catch (error) {
            console.error('Dependency analysis failed:', error);
            return [];
        }
    }
}
