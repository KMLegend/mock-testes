import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function findModuleCssFiles(dir: string): string[] {
  const results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results.push(...findModuleCssFiles(filePath));
    } else if (filePath.endsWith('.module.css')) {
      results.push(filePath);
    }
  }
  return results;
}

describe('C-02 Guarda: Nenhuma cor HEX hardcoded nos CSS modules da UI', () => {
  it('não deve conter nenhuma ocorrência de HEX (ex: #FFF, #123456) nos arquivos *.module.css em src/ui', () => {
    const uiDir = path.resolve(__dirname, '../../src/ui');
    const cssFiles = findModuleCssFiles(uiDir);
    const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;

    const violations: { file: string; matches: string[] }[] = [];

    for (const file of cssFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const matches = content.match(hexPattern);
      if (matches && matches.length > 0) {
        violations.push({
          file: path.relative(uiDir, file),
          matches
        });
      }
    }

    expect(violations).toEqual([]);
  });
});
