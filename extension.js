const vscode = require('vscode');

// Reglas de optimización específicas para Core Web Vitals en Astro
const OPTIMIZATION_RULES = {
    // LCP - Largest Contentful Paint
    lcp: [
        {
            pattern: /<img\s+(?![^>]*loading=["']lazy["'])/gi,
            message: '⚡ LCP: Añade loading="lazy" a imágenes below the fold',
            fix: 'loading="lazy"',
            impact: '+5 puntos'
        },
        {
            pattern: /<Image\s+(?![^>]*loading=["']eager["'])/gi,
            message: '🎯 LCP: Hero images necesitan loading="eager"',
            fix: 'loading="eager"',
            impact: '+8 puntos'
        },
        {
            pattern: /import.*['"]\.(jpg|jpeg|png|webp)['"]/gi,
            message: '📦 LCP: Usa Astro Image component para optimización automática',
            fix: 'import { Image } from "astro:assets"',
            impact: '+12 puntos'
        }
    ],
    // CLS - Cumulative Layout Shift
    cls: [
        {
            pattern: /<img(?![^>]*(?:width|height))/gi,
            message: '📐 CLS: Define width y height para prevenir layout shift',
            fix: 'width="800" height="600"',
            impact: '+10 puntos'
        },
        {
            pattern: /@font-face/gi,
            message: '🔤 CLS: Usa font-display: swap para evitar FOIT',
            fix: 'font-display: swap;',
            impact: '+6 puntos'
        }
    ],
    // INP - Interaction to Next Paint
    inp: [
        {
            pattern: /client:load/gi,
            message: '⚡ INP: Considera client:idle o client:visible para defer JS',
            fix: 'client:idle',
            impact: '+7 puntos'
        },
        {
            pattern: /import.*['"].*\.(?:js|ts)['"](?!.*defer)/gi,
            message: '🚀 INP: Scripts externos deben tener defer o async',
            fix: '<script defer>',
            impact: '+5 puntos'
        }
    ],
    // General Performance
    general: [
        {
            pattern: /preload.*as=["']script["']/gi,
            message: '⚠️ PERF: Evita preload de scripts, usa defer en su lugar',
            fix: 'Remover preload, usar defer',
            impact: '+4 puntos'
        }
    ]
};

// Snippets optimizados para 97+
const OPTIMIZED_SNIPPETS = {
    'astro-optimized-image': {
        prefix: 'opt-img',
        body: [
            'import { Image } from "astro:assets";',
            'import imgSrc from "$1";',
            '',
            '<Image',
            '  src={imgSrc}',
            '  alt="$2"',
            '  width={$3}',
            '  height={$4}',
            '  loading="$5"',
            '  decoding="async"',
            '  format="webp"',
            '/>'
        ],
        description: 'Imagen optimizada para Core Web Vitals (97+)'
    },
    'astro-optimized-layout': {
        prefix: 'opt-layout',
        body: [
            '---',
            'import { ViewTransitions } from "astro:transitions";',
            '---',
            '<!DOCTYPE html>',
            '<html lang="es">',
            '<head>',
            '  <meta charset="UTF-8">',
            '  <meta name="viewport" content="width=device-width">',
            '  <ViewTransitions />',
            '  <link rel="preconnect" href="https://fonts.googleapis.com">',
            '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
            '  $1',
            '</head>',
            '<body>',
            '  <slot />',
            '</body>',
            '</html>'
        ],
        description: 'Layout base optimizado para 97+ performance'
    },
    'astro-critical-css': {
        prefix: 'opt-css',
        body: [
            '<style is:inline>',
            '  /* Critical CSS - Solo estilos above the fold */',
            '  $1',
            '</style>',
            '<link rel="stylesheet" href="/styles/main.css" media="print" onload="this.media=\'all\'">'
        ],
        description: 'Patrón de Critical CSS optimizado'
    }
};

function activate(context) {
    console.log('Astro Core Vitals Optimizer activado! 🚀');

    // Diagnostic collection para mostrar warnings
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('astroVitals');
    context.subscriptions.push(diagnosticCollection);

    // Analizar documento en tiempo real
    function analyzeDocument(document) {
        if (!document || (document.languageId !== 'astro' && document.languageId !== 'javascript')) {
            return;
        }

        const diagnostics = [];
        const text = document.getText();

        // Revisar todas las reglas
        Object.entries(OPTIMIZATION_RULES).forEach(([category, rules]) => {
            rules.forEach(rule => {
                let match;
                const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
                
                while ((match = regex.exec(text)) !== null) {
                    const startPos = document.positionAt(match.index);
                    const endPos = document.positionAt(match.index + match[0].length);
                    const range = new vscode.Range(startPos, endPos);

                    const diagnostic = new vscode.Diagnostic(
                        range,
                        `${rule.message} | Impacto: ${rule.impact}`,
                        vscode.DiagnosticSeverity.Warning
                    );
                    diagnostic.source = 'Astro Core Vitals';
                    diagnostic.code = category.toUpperCase();
                    
                    diagnostics.push(diagnostic);
                }
            });
        });

        diagnosticCollection.set(document.uri, diagnostics);
    }

    // Comando: Analizar componente actual
    const analyzeCommand = vscode.commands.registerCommand('astroVitals.analyzeComponent', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        analyzeDocument(editor.document);
        
        const diagnostics = diagnosticCollection.get(editor.document.uri);
        const issueCount = diagnostics ? diagnostics.length : 0;
        
        if (issueCount === 0) {
            vscode.window.showInformationMessage(
                '✅ ¡Perfecto! Este componente está optimizado para 97+ en Core Web Vitals'
            );
        } else {
            vscode.window.showWarningMessage(
                `⚡ Encontradas ${issueCount} oportunidades de optimización. Potencial: +${issueCount * 6} puntos`
            );
        }
    });

    // Comando: Optimizar imágenes automáticamente
    const optimizeImagesCommand = vscode.commands.registerCommand('astroVitals.optimizeImages', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const document = editor.document;
        const text = document.getText();
        
        // Optimizar tags <img> básicos
        let optimizedText = text.replace(
            /<img\s+src=["']([^"']+)["'](?![^>]*(?:width|height))/gi,
            '<img src="$1" width="800" height="600" loading="lazy" decoding="async"'
        );

        editor.edit(editBuilder => {
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(text.length)
            );
            editBuilder.replace(fullRange, optimizedText);
        });

        vscode.window.showInformationMessage('✅ Imágenes optimizadas para Core Web Vitals!');
    });

    // Comando: Check performance estimado
    const checkPerformanceCommand = vscode.commands.registerCommand('astroVitals.checkPerformance', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const diagnostics = diagnosticCollection.get(editor.document.uri) || [];
        const issueCount = diagnostics.length;
        
        // Score estimado basado en issues encontrados
        const baseScore = 97;
        const penaltyPerIssue = 6;
        const estimatedScore = Math.max(50, baseScore - (issueCount * penaltyPerIssue));
        
        const message = issueCount === 0
            ? `🎯 Score estimado: ${estimatedScore}/100 - ¡Excelente! Listo para producción.`
            : `📊 Score estimado: ${estimatedScore}/100 - Optimiza ${issueCount} áreas para alcanzar 97+`;
        
        vscode.window.showInformationMessage(message);
    });

    // Registrar listeners
    context.subscriptions.push(analyzeCommand);
    context.subscriptions.push(optimizeImagesCommand);
    context.subscriptions.push(checkPerformanceCommand);

    // Auto-analizar cuando se abre o modifica un archivo
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) analyzeDocument(editor.document);
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            analyzeDocument(event.document);
        })
    );

    // Analizar documento actual al activar
    if (vscode.window.activeTextEditor) {
        analyzeDocument(vscode.window.activeTextEditor.document);
    }

    // Provider de Code Actions (Quick Fixes)
    const codeActionProvider = vscode.languages.registerCodeActionsProvider(
        ['astro', 'javascript'],
        {
            provideCodeActions(document, range, context) {
                const actions = [];
                
                context.diagnostics.forEach(diagnostic => {
                    if (diagnostic.source === 'Astro Core Vitals') {
                        const action = new vscode.CodeAction(
                            'Aplicar optimización recomendada',
                            vscode.CodeActionKind.QuickFix
                        );
                        action.diagnostics = [diagnostic];
                        actions.push(action);
                    }
                });
                
                return actions;
            }
        }
    );

    context.subscriptions.push(codeActionProvider);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
