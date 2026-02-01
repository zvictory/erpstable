#!/usr/bin/env tsx
/**
 * Move service translations from crm.service to top-level service
 */

import fs from 'fs';
import path from 'path';

const languages = ['en', 'uz', 'ru', 'tr'];

for (const lang of languages) {
  const filePath = path.join(process.cwd(), 'messages', `${lang}.json`);

  console.log(`Processing ${lang}.json...`);

  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // Check if service is under crm
  if (content.crm && content.crm.service) {
    // Move service to top level
    content.service = content.crm.service;
    delete content.crm.service;

    // Write back
    fs.writeFileSync(filePath, JSON.stringify(content, null, 4) + '\n');
    console.log(`✅ Moved crm.service to service in ${lang}.json`);
  } else if (content.service) {
    console.log(`✅ Service already at top level in ${lang}.json`);
  } else {
    console.log(`❌ No service translations found in ${lang}.json`);
  }
}

console.log('\n✨ Done! Service translations are now at top level.');
