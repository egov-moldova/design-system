#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const componentsFile = path.join(__dirname, '../src/components/stencil-generated/components.ts');

if (fs.existsSync(componentsFile)) {
  let content = fs.readFileSync(componentsFile, 'utf8');

  // Add @ts-nocheck before 'use client' if not already present
  if (!content.includes('// @ts-nocheck')) {
    // Check if file starts with 'use client'
    if (content.startsWith("'use client';")) {
      content = "// @ts-nocheck\n'use client';\n" + content.substring("'use client';\n".length);
    } else {
      content = '// @ts-nocheck\n' + content;
    }
    fs.writeFileSync(componentsFile, content, 'utf8');
    console.log('✅ Added @ts-nocheck to components.ts');
  } else {
    console.log('✅ components.ts already has @ts-nocheck');
  }
} else {
  console.log('⚠️  components.ts not found');
}
