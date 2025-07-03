#!/usr/bin/env node

/**
 * Module Interference Test
 * Verifies that modules don't conflict with each other
 */

const fs = require('fs');
const path = require('path');

class ModuleInterferenceTest {
    constructor() {
        this.conflicts = [];
        this.warnings = [];
        this.passes = [];
    }

    log(type, test, message) {
        const result = { type, test, message, timestamp: new Date() };
        
        if (type === 'CONFLICT') this.conflicts.push(result);
        else if (type === 'WARNING') this.warnings.push(result);
        else this.passes.push(result);
        
        const colors = {
            'CONFLICT': '\x1b[31m',
            'WARNING': '\x1b[33m',
            'PASS': '\x1b[32m',
            'INFO': '\x1b[36m'
        };
        
        const color = colors[type] || '';
        console.log(`${color}[${type}] ${test}: ${message}\x1b[0m`);
    }

    extractFunctionNames(fileContent) {
        const functions = [];
        
        // Extract function declarations
        const functionRegex = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
        let match;
        while ((match = functionRegex.exec(fileContent)) !== null) {
            functions.push(match[1]);
        }
        
        // Extract arrow functions assigned to variables
        const arrowFunctionRegex = /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g;
        while ((match = arrowFunctionRegex.exec(fileContent)) !== null) {
            functions.push(match[1]);
        }
        
        // Extract export functions
        const exportRegex = /export\s+(?:function\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        while ((match = exportRegex.exec(fileContent)) !== null) {
            functions.push(match[1]);
        }
        
        return functions;
    }

    extractGlobalVariables(fileContent) {
        const variables = [];
        
        // Extract global variable declarations
        const globalVarRegex = /(?:window\.|global\.)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g;
        let match;
        while ((match = globalVarRegex.exec(fileContent)) !== null) {
            variables.push(match[1]);
        }
        
        // Extract class declarations
        const classRegex = /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        while ((match = classRegex.exec(fileContent)) !== null) {
            variables.push(match[1]);
        }
        
        return variables;
    }

    extractEventListeners(fileContent) {
        const listeners = [];
        
        // Extract addEventListener calls
        const listenerRegex = /addEventListener\s*\(\s*['"]([^'"]+)['"]/g;
        let match;
        while ((match = listenerRegex.exec(fileContent)) !== null) {
            listeners.push(match[1]);
        }
        
        // Extract element ID queries
        const idRegex = /getElementById\s*\(\s*['"]([^'"]+)['"]/g;
        while ((match = idRegex.exec(fileContent)) !== null) {
            listeners.push(`#${match[1]}`);
        }
        
        return listeners;
    }

    analyzeModule(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const moduleName = path.basename(filePath, '.js');
        
        return {
            name: moduleName,
            path: filePath,
            functions: this.extractFunctionNames(content),
            variables: this.extractGlobalVariables(content),
            eventListeners: this.extractEventListeners(content),
            content: content
        };
    }

    checkFunctionConflicts(modules) {
        this.log('INFO', 'Function Conflicts', 'Checking for function name conflicts...');
        
        const functionMap = new Map();
        
        for (const module of modules) {
            for (const func of module.functions) {
                if (functionMap.has(func)) {
                    const existingModule = functionMap.get(func);
                    if (existingModule !== module.name) {
                        this.log('CONFLICT', 'Function Conflict', 
                            `Function '${func}' defined in both ${existingModule} and ${module.name}`);
                    }
                } else {
                    functionMap.set(func, module.name);
                }
            }
        }
        
        if (this.conflicts.length === 0) {
            this.log('PASS', 'Function Names', 'No function name conflicts detected');
        }
    }

    checkGlobalVariableConflicts(modules) {
        this.log('INFO', 'Global Variables', 'Checking for global variable conflicts...');
        
        const varMap = new Map();
        
        for (const module of modules) {
            for (const variable of module.variables) {
                if (varMap.has(variable)) {
                    const existingModule = varMap.get(variable);
                    if (existingModule !== module.name) {
                        this.log('CONFLICT', 'Variable Conflict', 
                            `Global variable '${variable}' defined in both ${existingModule} and ${module.name}`);
                    }
                } else {
                    varMap.set(variable, module.name);
                }
            }
        }
        
        if (this.conflicts.filter(c => c.test === 'Variable Conflict').length === 0) {
            this.log('PASS', 'Global Variables', 'No global variable conflicts detected');
        }
    }

    checkDOMElementConflicts(modules) {
        this.log('INFO', 'DOM Elements', 'Checking for DOM element ID conflicts...');
        
        const elementMap = new Map();
        
        for (const module of modules) {
            for (const element of module.eventListeners) {
                if (element.startsWith('#')) {
                    const elementId = element.substring(1);
                    if (elementMap.has(elementId)) {
                        const existingModules = elementMap.get(elementId);
                        if (!existingModules.includes(module.name)) {
                            existingModules.push(module.name);
                            if (existingModules.length > 1) {
                                this.log('WARNING', 'DOM Element Sharing', 
                                    `Element '${elementId}' accessed by multiple modules: ${existingModules.join(', ')}`);
                            }
                        }
                    } else {
                        elementMap.set(elementId, [module.name]);
                    }
                }
            }
        }
        
        if (this.warnings.filter(w => w.test === 'DOM Element Sharing').length === 0) {
            this.log('PASS', 'DOM Elements', 'No concerning DOM element conflicts detected');
        }
    }

    checkImportExportConsistency(modules) {
        this.log('INFO', 'Import/Export', 'Checking import/export consistency...');
        
        for (const module of modules) {
            const importRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
            let match;
            
            while ((match = importRegex.exec(module.content)) !== null) {
                const imports = match[1].split(',').map(i => i.trim());
                const fromModule = match[2];
                
                // Check if imported module exists
                const targetModulePath = path.resolve(path.dirname(module.path), fromModule);
                const jsPath = targetModulePath.endsWith('.js') ? targetModulePath : `${targetModulePath}.js`;
                
                if (!fs.existsSync(jsPath)) {
                    this.log('CONFLICT', 'Import Error', 
                        `${module.name} imports from non-existent module: ${fromModule}`);
                }
            }
        }
        
        if (this.conflicts.filter(c => c.test === 'Import Error').length === 0) {
            this.log('PASS', 'Import/Export', 'All imports appear to be valid');
        }
    }

    checkIntervalAndTimeoutConflicts(modules) {
        this.log('INFO', 'Timers', 'Checking for timer conflicts...');
        
        let intervalCount = 0;
        let timeoutCount = 0;
        
        for (const module of modules) {
            const intervalMatches = module.content.match(/setInterval/g) || [];
            const timeoutMatches = module.content.match(/setTimeout/g) || [];
            
            intervalCount += intervalMatches.length;
            timeoutCount += timeoutMatches.length;
            
            if (intervalMatches.length > 2) {
                this.log('WARNING', 'Timer Usage', 
                    `${module.name} uses ${intervalMatches.length} intervals - consider consolidation`);
            }
        }
        
        this.log('PASS', 'Timer Summary', 
            `Found ${intervalCount} intervals and ${timeoutCount} timeouts across all modules`);
    }

    async runTests() {
        console.log('\x1b[36m🔍 Module Interference Test Suite\x1b[0m\n');
        
        const moduleDir = path.join(__dirname, 'frontend', 'js', 'modules');
        
        if (!fs.existsSync(moduleDir)) {
            console.log('\x1b[31m❌ Module directory not found\x1b[0m');
            return;
        }
        
        const moduleFiles = fs.readdirSync(moduleDir)
            .filter(file => file.endsWith('.js'))
            .map(file => path.join(moduleDir, file));
        
        this.log('INFO', 'Module Discovery', `Found ${moduleFiles.length} modules to analyze`);
        
        const modules = moduleFiles.map(file => this.analyzeModule(file));
        
        // Run all interference tests
        this.checkFunctionConflicts(modules);
        this.checkGlobalVariableConflicts(modules);
        this.checkDOMElementConflicts(modules);
        this.checkImportExportConsistency(modules);
        this.checkIntervalAndTimeoutConflicts(modules);
        
        // Generate report
        console.log('\n' + '='.repeat(60));
        console.log('MODULE INTERFERENCE TEST REPORT');
        console.log('='.repeat(60));
        console.log(`Modules Analyzed: ${modules.length}`);
        console.log(`Conflicts Found: ${this.conflicts.length}`);
        console.log(`Warnings: ${this.warnings.length}`);
        console.log(`Checks Passed: ${this.passes.length}`);
        console.log('='.repeat(60));
        
        if (this.conflicts.length === 0) {
            console.log('\x1b[32mOVERALL RESULT: NO CONFLICTS ✅\x1b[0m');
        } else {
            console.log('\x1b[31mOVERALL RESULT: CONFLICTS DETECTED ❌\x1b[0m');
        }
        
        return {
            conflicts: this.conflicts.length,
            warnings: this.warnings.length,
            passes: this.passes.length
        };
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new ModuleInterferenceTest();
    tester.runTests().then(result => {
        process.exit(result.conflicts === 0 ? 0 : 1);
    }).catch(error => {
        console.error('\x1b[31mTest suite failed:', error.message, '\x1b[0m');
        process.exit(1);
    });
}

module.exports = ModuleInterferenceTest;