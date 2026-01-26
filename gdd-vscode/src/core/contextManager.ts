import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { AIClient } from '../utils/ai';
import { DocumentMetadata } from './types';
import { glob } from 'glob';
import { DebugService } from './debugService';
import { DependencyAnalyzer } from './dependencyAnalyzer';
import MiniSearch from 'minisearch';

export class ContextManager {
    private static instance: ContextManager;
    private index: DocumentMetadata[] = [];
    private globalGraph: Map<string, Set<string>> = new Map(); // Stores A -> B relationships defined globally
    private ai: AIClient;
    private rootDir: string;
    private analyzer: DependencyAnalyzer;
    private searchEngine: MiniSearch;

    private constructor(context: vscode.ExtensionContext, aiClient: AIClient) {
        this.ai = aiClient;
        this.rootDir = context.extensionUri.fsPath;
        this.analyzer = new DependencyAnalyzer(aiClient);

        // Initialize MiniSearch
        this.searchEngine = new MiniSearch({
            fields: ['file', 'content', 'summary'],
            storeFields: ['file', 'summary'],
            searchOptions: {
                boost: { file: 2 },
                prefix: true,
                fuzzy: 0.2
            }
        });
    }

    public static getInstance(context: vscode.ExtensionContext, aiClient: AIClient): ContextManager {
        if (!ContextManager.instance) {
            ContextManager.instance = new ContextManager(context, aiClient);
        }
        return ContextManager.instance;
    }

    public updateWorkspaceRoot(rootPath: string) {
        this.rootDir = rootPath;
    }

    /**
     * Trigger explicit analysis for a specific document
     */
    public async analyzeDocument(relativeFilePath: string): Promise<void> {
        const doc = this.findDocMetadata(relativeFilePath);
        if (!doc) {
            console.warn(`Cannot analyze ${relativeFilePath}: not in index`);
            return;
        }

        DebugService.getInstance().log('info', 'ContextManager', 'Analysis Started', { file: relativeFilePath });

        try {
            const autoDeps = await this.analyzer.analyze(doc, this.index);
            doc.autoDependencies = autoDeps;

            DebugService.getInstance().log('info', 'ContextManager', 'Analysis Completed', {
                file: relativeFilePath,
                found: autoDeps.length
            });
        } catch (e) {
            console.error('Analysis failed', e);
        }
    }

    /**
     * Scan workspace for .md/.gdd files and build/update index
     */
    public async refreshIndex(): Promise<void> {
        try {
            // Find all potential documents
            const files = await glob('**/*.{md,gdd}', {
                cwd: this.rootDir,
                ignore: ['**/node_modules/**', '**/out/**', '**/dist/**']
            });

            const newIndex: DocumentMetadata[] = [];
            this.globalGraph.clear(); // Reset global graph
            this.searchEngine.removeAll();

            for (const file of files) {
                const fullPath = path.join(this.rootDir, file);
                try {
                    const stats = await fs.stat(fullPath);
                    const content = await fs.readFile(fullPath, 'utf-8');

                    const summary = this.extractSummary(content);
                    const dependencies = this.extractDependencies(content, file);
                    const explicitDependencies = this.extractExplicitDependencies(content);

                    // Index for BM25
                    this.searchEngine.add({
                        id: file,
                        file: file,
                        content: content,
                        summary: summary
                    });

                    // Extract Mermaid graph edges
                    const edges = this.extractGraphEdges(content);
                    edges.forEach(([source, target]) => {
                        if (!this.globalGraph.has(source)) {
                            this.globalGraph.set(source, new Set());
                        }
                        this.globalGraph.get(source)!.add(target);
                    });

                    newIndex.push({
                        file: file, // Relative path
                        summary: summary,
                        dependencies: dependencies,
                        explicitDependencies: explicitDependencies,
                        lastModified: stats.mtime
                    });
                } catch (e) {
                    console.error(`Failed to index file ${file}:`, e);
                }
            }

            this.index = newIndex;
            console.log(`Context Index rebuilt. ${this.index.length} documents indexed.`);

            // Log index stats
            DebugService.getInstance().log('info', 'ContextManager', 'Index Rebuilt', {
                count: this.index.length,
                globalEdges: Array.from(this.globalGraph.entries()).flatMap(([src, tgts]) => Array.from(tgts).map(t => `${src}->${t}`))
            });

        } catch (error) {
            console.error('Error refreshing context index:', error);
            DebugService.getInstance().log('error', 'ContextManager', 'Index Refresh Failed', { error: String(error) });
        }
    }

    private extractSummary(content: string): string {
        const maxLen = 300;
        let clean = content.replace(/!\[.*?\]\(.*?\)/g, '')
            .replace(/\[\[.*?\]\]/g, '')
            .replace(/#+\s/g, '')
            .replace(/\n/g, ' ');
        let summary = clean.slice(0, maxLen);
        return summary + (content.length > maxLen ? '...' : '');
    }

    private extractDependencies(content: string, currentFile: string): string[] {
        const dependencies: Set<string> = new Set();

        // 1. Explicit WikiLinks: [[Filename]] or [[Filename|Label]]
        const wikiLinkRegex = /\[\[(.*?)(?:\|.*?)?\]\]/g;
        let match;
        while ((match = wikiLinkRegex.exec(content)) !== null) {
            const linkedFile = match[1].trim();
            dependencies.add(linkedFile);
        }

        return Array.from(dependencies);
    }

    // Extract A --> B from Mermaid blocks
    private extractGraphEdges(content: string): [string, string][] {
        const edges: [string, string][] = [];
        // Match mermaid blocks
        const mermaidBlockRegex = /```mermaid([\s\S]*?)```/g;
        let blockMatch;

        while ((blockMatch = mermaidBlockRegex.exec(content)) !== null) {
            const blockContent = blockMatch[1];
            // Simple regex for A --> B, A-.->B, A==>B
            // Captures: (NodeA) (arrow) (NodeB)
            // Note: This is a basic parser. Complex node names with spaces ["Node Name"] need handling.
            const edgeRegex = /([a-zA-Z0-9_\u4e00-\u9fa5]+)\s*[-=.]{1,3}[->]{1,2}\s*([a-zA-Z0-9_\u4e00-\u9fa5]+)/g;

            let edgeMatch;
            while ((edgeMatch = edgeRegex.exec(blockContent)) !== null) {
                const source = edgeMatch[1].trim();
                const target = edgeMatch[2].trim();
                if (source && target) {
                    edges.push([source, target]);
                }
            }
        }
        return edges;
    }

    // [NEW] Retrieval-Augmented Generation (RAG) using BM25
    public retrieveRelevantContext(query: string, limit: number = 3, threshold: number = 5): DocumentMetadata[] {
        if (!query.trim()) return [];

        const results = this.searchEngine.search(query, {
            filter: (result) => result.score > threshold
        });

        DebugService.getInstance().log('info', 'ContextManager', 'BM25 Search', {
            query,
            results: results.slice(0, limit).map(r => `${r.id} (${r.score})`)
        });

        return results
            .slice(0, limit)
            .map(r => this.findDocMetadata(r.id))
            .filter((d): d is DocumentMetadata => !!d);
    }

    // [NEW] Gradient Memory: Rank-based Token Budgeting
    public async retrieveGradientContext(query: string, tokenBudget: number = 1000): Promise<{ file: string, content: string }[]> {
        if (!query.trim()) return [];

        const charBudget = tokenBudget * 3; // Approx 3 chars per token
        // Use a lower threshold to gather enough candidates before filtering by budget
        const results = this.searchEngine.search(query, {
            filter: (result) => result.score > 2
        });

        const context: { file: string, content: string }[] = [];
        let usedChars = 0;

        for (let i = 0; i < results.length; i++) {
            if (usedChars >= charBudget) break;

            const res = results[i];
            const doc = this.findDocMetadata(res.id);
            if (!doc) continue;

            // Allocation Strategy (Explicit)
            let allowedChars = 0;
            let type = 'snippet';

            if (i === 0) {
                // Rank 1: High focus (~30%)
                allowedChars = Math.floor(charBudget * 0.30);
                type = 'focus';
            } else if (i === 1) {
                // Rank 2: Medium focus (~15%)
                allowedChars = Math.floor(charBudget * 0.15);
                type = 'secondary';
            } else if (i === 2) {
                // Rank 3: Low focus (~10%)
                allowedChars = Math.floor(charBudget * 0.10);
                type = 'tertiary';
            } else {
                // Rank N: Peripheral memory (~100 chars / ~30 tokens)
                allowedChars = 100;
                type = 'peripheral';
            }

            // Cap allowedChars by remaining total budget
            if (usedChars + allowedChars > charBudget) {
                allowedChars = charBudget - usedChars;
            }

            if (allowedChars < 50) break; // Drop if budget is too fragmented

            let content = "";

            // For Focus items, we try to fetch actual content. 
            // For Peripheral, summary is usually enough.
            if (type === 'focus' || type === 'secondary') {
                try {
                    const fullPath = path.join(this.rootDir, doc.file);
                    const fileContent = await fs.readFile(fullPath, 'utf-8');
                    // In a perfect world, we extract the "matching paragraph" using MiniSearch's match positions.
                    // For now, we take Introduction + Summary + start of body.
                    // We simulate "smart truncation" by taking the allowed length.
                    content = `[Focus: ${type}]\nMetadata: ${doc.summary}\nContent: ${fileContent.slice(0, allowedChars)}`;
                } catch (e) {
                    content = `[Summary Only]: ${doc.summary}`;
                }
            } else {
                // Snippet/Summary Only
                content = `[Peripheral]: ${doc.summary.slice(0, allowedChars)}`;
            }

            // Ensure we don't exceed precise allocation in the final string
            if (content.length > allowedChars) {
                content = content.slice(0, allowedChars) + "...";
            }

            context.push({ file: doc.file, content });
            usedChars += content.length;
        }

        DebugService.getInstance().log('context', 'ContextManager', 'Gradient Retrieval', {
            query,
            docs: context.length,
            usedChars,
            budget: charBudget
        });

        return context;
    }

    /**
     * AI-driven selection of relevant documents + Dependency Resolution
     */
    public async selectContextForTask(taskDescription: string): Promise<string[]> {
        if (this.index.length === 0) {
            await this.refreshIndex();
        }

        const candidates = this.index.map(doc => `- ${doc.file} (Deps: ${doc.dependencies?.join(', ') || 'none'}): ${doc.summary}`).join('\n');

        const prompt = `
I am an AI assistant helping a user write game design documents.
Current Task: "${taskDescription}"

Available Documents:
${candidates}

Identify which of the above documents are critically relevant dependencies for this task. 
Note: If a document A is selected, and it depends on B, you generally don't need to explicitly select B unless B is also DIRECTLY relevant to the task description. The system will handle dependencies.
Return strictly a JSON array of file paths (strings). If no documents are relevant, return [].
        `.trim();

        try {
            const response = await this.ai.chat([{ role: 'user', content: prompt }]);

            DebugService.getInstance().log('context', 'ContextManager', 'Context Selection', {
                task: taskDescription,
                prompt: prompt,
                rawResponse: response
            });

            const cleanResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const selectedFiles = JSON.parse(cleanResponse);

            let finalSelection: string[] = [];
            if (Array.isArray(selectedFiles)) {
                finalSelection = await this.resolveDependencies(selectedFiles);
            }

            DebugService.getInstance().log('context', 'ContextManager', 'Dependencies Resolved', {
                initial: selectedFiles,
                final: finalSelection
            });

            return finalSelection;
        } catch (error) {
            console.error('Error selecting context:', error);
            DebugService.getInstance().log('error', 'ContextManager', 'Selection Failed', { error: String(error) });
            return [];
        }
    }

    private async resolveDependencies(selectedFiles: string[]): Promise<string[]> {
        const resolved = new Set<string>(selectedFiles);
        const queue = [...selectedFiles];
        const visited = new Set<string>();

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (visited.has(current)) continue;
            visited.add(current);

            // 1. Resolve metadata-based dependencies
            const doc = this.findDocMetadata(current);
            if (doc && doc.dependencies) {
                for (const dep of doc.dependencies) {
                    this.tryAddDependency(dep, resolved, queue, `Link in ${doc.file}`);
                }
            }

            // 2. Resolve Global Graph dependencies
            const basename = path.basename(current, path.extname(current));

            if (this.globalGraph.has(current)) {
                for (const target of this.globalGraph.get(current)!) {
                    this.tryAddDependency(target, resolved, queue, `Graph: ${current}->${target}`);
                }
            }
            if (this.globalGraph.has(basename)) {
                for (const target of this.globalGraph.get(basename)!) {
                    this.tryAddDependency(target, resolved, queue, `Graph: ${basename}->${target}`);
                }
            }

            // 3. Resolve Explicit Dependencies (Inheritance & Reference)
            if (doc) {
                // Manual
                if (doc.explicitDependencies) {
                    for (const dep of doc.explicitDependencies) {
                        const reason = dep.type === 'INHERITANCE' ?
                            `Inherits from ${doc.file} (Manual)` : `Referenced by ${doc.file} (Manual)`;
                        this.tryAddDependency(dep.file, resolved, queue, reason);
                    }
                }
                // Auto
                if (doc.autoDependencies) {
                    for (const dep of doc.autoDependencies) {
                        const reason = dep.type === 'INHERITANCE' ?
                            `Inherits from ${doc.file} (AI)` : `Referenced by ${doc.file} (AI)`;
                        this.tryAddDependency(dep.file, resolved, queue, reason);
                    }
                }
            }
        }

        return Array.from(resolved);
    }

    private extractExplicitDependencies(content: string): import('./types').Dependency[] {
        const deps: import('./types').Dependency[] = [];
        const frontmatterMatch = content.match(/^---\s*([\s\S]*?)\s*---/);
        if (!frontmatterMatch) return deps;

        const fm = frontmatterMatch[1];
        const lines = fm.split('\n');
        let inReferences = false;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith('extends:')) {
                const match = trimmed.match(/extends:\s*(?:\[\[)?(.*?)(?:\|.*?)?(?:\]\])?$/);
                if (match && match[1]) {
                    deps.push({ file: match[1].trim(), type: 'INHERITANCE' });
                }
                inReferences = false;
            } else if (trimmed.startsWith('references:')) {
                inReferences = true;
            } else if (inReferences && trimmed.startsWith('-')) {
                const match = trimmed.match(/-\s*(?:\[\[)?(.*?)(?:\|.*?)?(?:\]\])?$/);
                if (match && match[1]) {
                    deps.push({ file: match[1].trim(), type: 'REFERENCE' });
                }
            } else if (trimmed.includes(':') && !trimmed.startsWith('-')) {
                if (trimmed !== 'references:') inReferences = false;
            }
        }
        return deps;
    }

    private tryAddDependency(targetName: string, resolved: Set<string>, queue: string[], reason: string) {
        const depDoc = this.findDocMetadata(targetName);
        if (depDoc && !resolved.has(depDoc.file)) {
            resolved.add(depDoc.file);
            queue.push(depDoc.file);

            DebugService.getInstance().log('info', 'ContextManager', 'Auto-include Dependency', {
                dependant: targetName,
                resolvedFile: depDoc.file,
                reason: reason
            });
        }
    }

    private findDocMetadata(nameOrPath: string): DocumentMetadata | undefined {
        // Exact match
        let found = this.index.find(d => d.file === nameOrPath);
        if (found) return found;

        // Basename match (ignoring extension)
        found = this.index.find(d => {
            const basename = path.basename(d.file, path.extname(d.file));
            return basename.toLowerCase() === nameOrPath.toLowerCase();
        });
        if (found) return found;

        // Loose path match
        return this.index.find(d => d.file.endsWith(nameOrPath) || d.file.includes(nameOrPath));
    }

    /**
     * Load full content of selected files
     */
    public async loadContextContent(filePaths: string[]): Promise<string> {
        let contextText = "";
        for (const file of filePaths) {
            try {
                // If it's a relative path from index, join with rootDir
                // But selections might be just names if LLM returned bad paths.
                // Re-resolve to be safe
                const doc = this.findDocMetadata(file);
                if (!doc) continue;

                const fullPath = path.join(this.rootDir, doc.file);
                const content = await fs.readFile(fullPath, 'utf-8');
                contextText += `\n\n=== FILE: ${doc.file} ===\n${content}`;
            } catch (e) {
                console.warn(`Could not read context file ${file}`, e);
            }
        }
        return contextText;
    }
}
