#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const componentsFile = path.join(__dirname, '../src/components/stencil-generated/components.ts');

if (fs.existsSync(componentsFile)) {
  let content = fs.readFileSync(componentsFile, 'utf8');

  // Add @ts-nocheck at the beginning if not already present
  if (!content.startsWith('// @ts-nocheck')) {
    content = '// @ts-nocheck\n' + content;
    fs.writeFileSync(componentsFile, content, 'utf8');
    console.log('✅ Added @ts-nocheck to components.ts');
  } else {
    console.log('✅ components.ts already has @ts-nocheck');
  }
} else {
  console.log('⚠️  components.ts not found');
}
