#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const proxiesFile = path.join(__dirname, '../src/directives/proxies.ts');

if (fs.existsSync(proxiesFile)) {
  let content = fs.readFileSync(proxiesFile, 'utf8');

  // @stencil/angular-output-target v1.x emits no `standalone` property when
  // outputType is 'standalone', relying on Angular 19+ defaults. Explicitly
  // add standalone: true so the components work under Angular 17/18 as well.
  if (!content.includes('standalone: true')) {
    content = content.replace(
      /(@Component\({[\s\S]*?template: '<ng-content><\/ng-content>',\n)/g,
      '$1  standalone: true,\n',
    );
    fs.writeFileSync(proxiesFile, content, 'utf8');
    console.log('✅ Added standalone: true to all @Component decorators in proxies.ts');
  } else {
    console.log('✅ proxies.ts already has standalone: true');
  }
} else {
  console.log('⚠️  proxies.ts not found — run yarn build.angular first');
}
