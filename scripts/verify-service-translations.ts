#!/usr/bin/env tsx
/**
 * Service Module Translation Verification Script
 *
 * Verifies:
 * 1. Translation key coverage across all 4 languages
 * 2. Hardcoded strings in service components
 * 3. Missing translations
 * 4. Translation quality (not just English in all files)
 */

import fs from 'fs';
import path from 'path';
import glob from 'glob';

interface TranslationFile {
  lang: string;
  path: string;
  content: any;
}

interface VerificationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalKeys: number;
    missingKeys: { [lang: string]: string[] };
    hardcodedStrings: { file: string; line: number; match: string }[];
    duplicateEnglish: string[];
  };
}

// Suspicious patterns that might be hardcoded strings
const SUSPICIOUS_PATTERNS = [
  /\b(Installation|Repair|Maintenance|Preventive|Emergency|Warranty|Contract)\b/,
  /\b(Priority|High|Medium|Low|Critical)\b/,
  /\b(Active|Inactive|Expired|Suspended|Cancelled)\b/,
  /\b(Open|In Progress|Completed|Closed|On Hold)\b/,
  /\b(Customer|Asset|Ticket|Service|Equipment)\b/,
];

// Patterns to exclude (legitimate code patterns)
const EXCLUDE_PATTERNS = [
  /import.*from/,
  /interface\s+\w+/,
  /type\s+\w+/,
  /const\s+\w+/,
  /function\s+\w+/,
  /\/\//,  // Comments
  /t\(['"`]/,  // Translation calls
  /className=/,
  /useState</,
  /useEffect/,
  /export\s+(const|function|interface|type)/,
];

async function loadTranslationFiles(): Promise<TranslationFile[]> {
  const languages = ['en', 'uz', 'ru', 'tr'];
  const files: TranslationFile[] = [];

  for (const lang of languages) {
    const filePath = path.join(process.cwd(), 'messages', `${lang}.json`);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      files.push({ lang, path: filePath, content });
    } catch (error) {
      console.error(`❌ Failed to load ${lang}.json:`, error);
      process.exit(1);
    }
  }

  return files;
}

function extractKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];

  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...extractKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

async function checkTranslationCoverage(files: TranslationFile[]): Promise<{
  allKeys: Set<string>;
  missingKeys: { [lang: string]: string[] };
  duplicateEnglish: string[];
}> {
  const allKeys = new Set<string>();
  const serviceKeys: { [lang: string]: string[] } = {};

  // Extract all service keys from each language
  // Service translations are at top level
  for (const file of files) {
    const serviceSection = file.content.service || {};
    const keys = extractKeys(serviceSection, 'service');
    serviceKeys[file.lang] = keys;
    keys.forEach(key => allKeys.add(key));
  }

  // Find missing keys per language
  const missingKeys: { [lang: string]: string[] } = {};
  for (const file of files) {
    missingKeys[file.lang] = [];
    for (const key of allKeys) {
      if (!serviceKeys[file.lang].includes(key)) {
        missingKeys[file.lang].push(key);
      }
    }
  }

  // Check for duplicate English values (not properly translated)
  const duplicateEnglish: string[] = [];
  const enFile = files.find(f => f.lang === 'en')!;

  for (const key of allKeys) {
    const enValue = getNestedValue(enFile.content, key);
    if (typeof enValue === 'string') {
      for (const file of files) {
        if (file.lang !== 'en') {
          const value = getNestedValue(file.content, key);
          if (value === enValue && enValue.length > 2) { // Ignore short words that might be same
            duplicateEnglish.push(`${key} (${file.lang}: "${value}")`);
          }
        }
      }
    }
  }

  return { allKeys, missingKeys, duplicateEnglish };
}

async function checkHardcodedStrings(): Promise<{ file: string; line: number; match: string }[]> {
  const hardcoded: { file: string; line: number; match: string }[] = [];

  // Find all service component files
  const componentFiles = glob.sync('src/components/service/**/*.tsx', {
    cwd: process.cwd(),
  });

  for (const file of componentFiles) {
    const filePath = path.join(process.cwd(), file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Skip lines that match exclude patterns
      if (EXCLUDE_PATTERNS.some(pattern => pattern.test(line))) {
        return;
      }

      // Check for suspicious patterns
      for (const pattern of SUSPICIOUS_PATTERNS) {
        const matches = line.match(pattern);
        if (matches) {
          // Additional check: make sure it's in a string context
          const stringMatch = line.match(/["'`]([^"'`]*(?:Installation|Repair|Maintenance|Preventive|Emergency|Warranty|Contract|Priority|High|Medium|Low|Critical|Active|Inactive|Expired|Suspended|Cancelled|Open|In Progress|Completed|Closed|On Hold|Customer|Asset|Ticket|Service|Equipment)[^"'`]*)["'`]/);
          if (stringMatch && !line.includes('t(')) {
            hardcoded.push({
              file: file,
              line: index + 1,
              match: stringMatch[1],
            });
          }
        }
      }
    });
  }

  return hardcoded;
}

async function main() {
  console.log('🔍 Service Module Translation Verification\n');
  console.log('=' .repeat(60));

  const result: VerificationResult = {
    success: true,
    errors: [],
    warnings: [],
    stats: {
      totalKeys: 0,
      missingKeys: {},
      hardcodedStrings: [],
      duplicateEnglish: [],
    },
  };

  // 1. Load translation files
  console.log('\n📁 Loading translation files...');
  const translationFiles = await loadTranslationFiles();
  console.log(`✅ Loaded ${translationFiles.length} language files`);

  // 2. Check translation coverage
  console.log('\n📊 Checking translation coverage...');
  const coverage = await checkTranslationCoverage(translationFiles);
  result.stats.totalKeys = coverage.allKeys.size;
  result.stats.missingKeys = coverage.missingKeys;
  result.stats.duplicateEnglish = coverage.duplicateEnglish;

  console.log(`   Total service keys: ${coverage.allKeys.size}`);

  let hasMissingKeys = false;
  for (const [lang, keys] of Object.entries(coverage.missingKeys)) {
    if (keys.length > 0) {
      hasMissingKeys = true;
      console.log(`   ❌ ${lang}: Missing ${keys.length} keys`);
      result.errors.push(`Missing ${keys.length} translation keys in ${lang}.json`);
    } else {
      console.log(`   ✅ ${lang}: All keys present`);
    }
  }

  if (coverage.duplicateEnglish.length > 0) {
    console.log(`   ⚠️  Found ${coverage.duplicateEnglish.length} potentially untranslated values`);
    result.warnings.push(`Found ${coverage.duplicateEnglish.length} values that appear to be English in non-English files`);
  }

  // 3. Check for hardcoded strings
  console.log('\n🔎 Checking for hardcoded strings...');
  const hardcodedStrings = await checkHardcodedStrings();
  result.stats.hardcodedStrings = hardcodedStrings;

  if (hardcodedStrings.length > 0) {
    console.log(`   ❌ Found ${hardcodedStrings.length} potential hardcoded strings`);
    result.errors.push(`Found ${hardcodedStrings.length} potential hardcoded strings`);
    result.success = false;
  } else {
    console.log(`   ✅ No hardcoded strings found`);
  }

  // 4. Print detailed results
  console.log('\n' + '='.repeat(60));
  console.log('📋 DETAILED RESULTS\n');

  if (Object.keys(result.stats.missingKeys).some(lang => result.stats.missingKeys[lang].length > 0)) {
    console.log('❌ MISSING TRANSLATION KEYS:\n');
    for (const [lang, keys] of Object.entries(result.stats.missingKeys)) {
      if (keys.length > 0) {
        console.log(`${lang.toUpperCase()}:`);
        keys.slice(0, 10).forEach(key => console.log(`  - ${key}`));
        if (keys.length > 10) {
          console.log(`  ... and ${keys.length - 10} more`);
        }
        console.log('');
      }
    }
  }

  if (result.stats.duplicateEnglish.length > 0) {
    console.log('⚠️  POTENTIALLY UNTRANSLATED VALUES:\n');
    result.stats.duplicateEnglish.slice(0, 10).forEach(item => {
      console.log(`  - ${item}`);
    });
    if (result.stats.duplicateEnglish.length > 10) {
      console.log(`  ... and ${result.stats.duplicateEnglish.length - 10} more`);
    }
    console.log('');
  }

  if (result.stats.hardcodedStrings.length > 0) {
    console.log('❌ HARDCODED STRINGS:\n');
    result.stats.hardcodedStrings.slice(0, 10).forEach(item => {
      console.log(`  ${item.file}:${item.line}`);
      console.log(`    "${item.match}"`);
    });
    if (result.stats.hardcodedStrings.length > 10) {
      console.log(`  ... and ${result.stats.hardcodedStrings.length - 10} more`);
    }
    console.log('');
  }

  // 5. Summary
  console.log('='.repeat(60));
  console.log('\n📈 SUMMARY\n');
  console.log(`Total service translation keys: ${result.stats.totalKeys}`);
  console.log(`Languages checked: en, uz, ru, tr`);
  console.log(`Errors found: ${result.errors.length}`);
  console.log(`Warnings: ${result.warnings.length}`);

  if (result.success && result.errors.length === 0) {
    console.log('\n✅ All translation checks PASSED!');
    console.log('\n📋 MANUAL TESTING CHECKLIST:\n');
    console.log('For each language (en, uz, ru, tr):');
    console.log('  1. Switch locale in UI');
    console.log('  2. Navigate to /service/dashboard');
    console.log('     - Verify KPI cards display with translated labels');
    console.log('     - Verify recent tickets list shows translated statuses');
    console.log('  3. Navigate to /service/contracts');
    console.log('     - Verify contract type labels translated');
    console.log('     - Verify status badges translated');
    console.log('     - Create new contract, verify form labels translated');
    console.log('  4. Navigate to /service/tickets');
    console.log('     - Verify ticket type labels translated');
    console.log('     - Verify priority labels translated');
    console.log('     - Create new ticket, verify form translated');
    console.log('     - Complete a ticket, verify completion form translated');
    console.log('  5. Navigate to /service/assets');
    console.log('     - Verify asset status labels translated');
    console.log('     - Verify warranty status translated');
  } else {
    console.log('\n❌ Translation verification FAILED!');
    console.log('\nErrors:');
    result.errors.forEach(error => console.log(`  - ${error}`));

    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    process.exit(1);
  }

  // Save detailed report
  const reportPath = path.join(process.cwd(), 'SERVICE_TRANSLATION_VERIFICATION.md');
  const report = generateMarkdownReport(result, coverage);
  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

function generateMarkdownReport(result: VerificationResult, coverage: any): string {
  const timestamp = new Date().toISOString();

  let report = `# Service Module Translation Verification Report\n\n`;
  report += `**Generated:** ${timestamp}\n\n`;
  report += `---\n\n`;

  report += `## Summary\n\n`;
  report += `- **Total Service Keys:** ${result.stats.totalKeys}\n`;
  report += `- **Languages:** en, uz, ru, tr\n`;
  report += `- **Status:** ${result.success ? '✅ PASSED' : '❌ FAILED'}\n`;
  report += `- **Errors:** ${result.errors.length}\n`;
  report += `- **Warnings:** ${result.warnings.length}\n\n`;

  report += `---\n\n`;

  report += `## Translation Coverage\n\n`;
  for (const [lang, keys] of Object.entries(result.stats.missingKeys)) {
    report += `### ${lang.toUpperCase()}\n\n`;
    if (keys.length === 0) {
      report += `✅ All ${result.stats.totalKeys} keys present\n\n`;
    } else {
      report += `❌ Missing ${keys.length} keys:\n\n`;
      keys.forEach(key => {
        report += `- \`${key}\`\n`;
      });
      report += `\n`;
    }
  }

  if (result.stats.duplicateEnglish.length > 0) {
    report += `## ⚠️ Potentially Untranslated Values\n\n`;
    report += `The following keys have identical values to English in non-English files:\n\n`;
    result.stats.duplicateEnglish.forEach(item => {
      report += `- ${item}\n`;
    });
    report += `\n`;
  }

  if (result.stats.hardcodedStrings.length > 0) {
    report += `## ❌ Hardcoded Strings Found\n\n`;
    report += `The following files contain potential hardcoded strings:\n\n`;
    result.stats.hardcodedStrings.forEach(item => {
      report += `**${item.file}:${item.line}**\n`;
      report += `\`\`\`\n"${item.match}"\n\`\`\`\n\n`;
    });
  }

  report += `---\n\n`;
  report += `## Manual Testing Checklist\n\n`;
  report += `### For Each Language (en, uz, ru, tr):\n\n`;
  report += `#### 1. Service Dashboard (/service/dashboard)\n`;
  report += `- [ ] Switch to language in UI\n`;
  report += `- [ ] KPI cards display translated labels\n`;
  report += `- [ ] Recent tickets show translated statuses\n`;
  report += `- [ ] All headers and labels translated\n\n`;

  report += `#### 2. Service Contracts (/service/contracts)\n`;
  report += `- [ ] Contract type labels translated\n`;
  report += `- [ ] Status badges translated\n`;
  report += `- [ ] Table headers translated\n`;
  report += `- [ ] Filter options translated\n`;
  report += `- [ ] Create new contract button translated\n`;
  report += `- [ ] Contract form labels translated\n`;
  report += `- [ ] Validation messages translated\n\n`;

  report += `#### 3. Service Tickets (/service/tickets)\n`;
  report += `- [ ] Ticket type labels translated\n`;
  report += `- [ ] Priority labels translated (Critical, High, Medium, Low)\n`;
  report += `- [ ] Status labels translated\n`;
  report += `- [ ] Create new ticket form translated\n`;
  report += `- [ ] Ticket detail view translated\n`;
  report += `- [ ] Complete ticket form translated\n`;
  report += `- [ ] Time tracking labels translated\n\n`;

  report += `#### 4. Customer Assets (/service/assets)\n`;
  report += `- [ ] Asset status labels translated\n`;
  report += `- [ ] Warranty status translated\n`;
  report += `- [ ] Installation date labels translated\n`;
  report += `- [ ] Contract coverage info translated\n`;
  report += `- [ ] Asset detail view translated\n\n`;

  report += `#### 5. Service Contract Detail\n`;
  report += `- [ ] Contract type badge translated\n`;
  report += `- [ ] Status badge translated\n`;
  report += `- [ ] Billing cycle label translated\n`;
  report += `- [ ] Contract actions translated\n`;
  report += `- [ ] Refill items section translated\n\n`;

  report += `---\n\n`;
  report += `## Testing Notes\n\n`;
  report += `- Use the language switcher in the header to change locales\n`;
  report += `- Verify no English text appears when using other languages\n`;
  report += `- Check for layout issues with longer translations\n`;
  report += `- Verify date/number formatting is locale-appropriate\n`;
  report += `- Test form validation messages in all languages\n`;
  report += `- Test toast notifications in all languages\n\n`;

  if (result.success) {
    report += `---\n\n`;
    report += `## ✅ Conclusion\n\n`;
    report += `All automated translation checks have passed. Please complete the manual testing checklist above to verify the UI in all 4 languages.\n`;
  } else {
    report += `---\n\n`;
    report += `## ❌ Issues to Address\n\n`;
    result.errors.forEach(error => {
      report += `- ${error}\n`;
    });
    report += `\nPlease fix these issues before proceeding with manual testing.\n`;
  }

  return report;
}

main().catch(console.error);
