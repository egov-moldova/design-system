# Framework Integration - Complete Setup Guide

This document provides step-by-step instructions for building, publishing, and using the AGE Design System wrappers for Angular, React, and Vue applications.

## Table of Contents

1. [Quick Start - General Steps](#quick-start---general-steps)
2. [Angular Build & Setup](#angular-build--setup)
3. [React Build & Setup](#react-build--setup)
4. [Vue Build & Setup](#vue-build--setup)
5. [Publishing Options](#publishing-options)
6. [Installing in Applications](#installing-in-applications)
7. [Configuration & Usage](#configuration--usage)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start - General Steps

### Step 1: Install Dependencies (First Time Only)

In the `age-design` project root:

```bash
yarn install
```

This will automatically install dependencies for the main project and all framework wrappers (`angular-design-system`, `react-design-system`, `vue-design-system`).

### Step 2: Build Stencil Components (Regular Build)

In the `age-design` project root:

```bash
yarn build
```

This command will:
- Clean and regenerate design tokens
- Build Stencil components
- Generate distribution files

---

## Angular Build & Setup

### Step 1: Build Stencil Components with Angular Output

In the `age-design` project root:

```bash
yarn build.angular
```

This command will:
- Regenerate design tokens (production CSS + JSON)
- Build Stencil components (`dist/`, `loader/`, `dist/components/` for `dist-custom-elements`)
- **Auto-generate** `angular-design-system/src/directives/proxies.ts` as standalone Angular component proxies
- Run `angular-design-system/scripts/fix-generated.js` — adds explicit `standalone: true` to every `@Component` decorator (the Stencil output target relies on Angular 19+'s implicit default; we target Angular 17+ which needs it explicit)
- Run `scripts/generate-component-shims.mjs` — emits `components/cor-*.{js,d.ts}` re-export shims at the package root (consumed by ng-packagr's ngc, which doesn't honor exports-map subpath resolution the way `tsc` does)
- Run `angular-design-system/scripts/generate-public-api.mjs` — auto-discovers every upstream enum + event-detail type and emits `angular-design-system/src/public-api.ts` so the wrapper's published surface stays in sync without manual edits

### Step 2: Copy CSS Tokens (Optional)

If tokens were not copied automatically, run:

```bash
cd angular-design-system
yarn copy:tokens
cd ..
```

### Step 3: Build the Angular Wrapper Package

```bash
cd angular-design-system
yarn build
cd ..
```

This builds the package with `ng-packagr` (`@angular/compiler-cli` 18.2 internally), producing an Angular Package Format (APF) `dist/` with:

- FESM2022 bundles + per-entry-point partial-Ivy `.d.ts`
- `ɵɵngDeclareComponent({ …, isStandalone: true })` metadata for every component (no NgModule emitted anywhere)
- Auto-generated `dist/package.json` `exports` map with `types` first
- Re-exports for all 69 enums, 36 `Cor*CustomEvent` generics, 15 named event-detail interfaces, plus `Components`/`JSX` namespaces and `ICON_NAMES`/`IconName`

The wrapper devDeps pin **Angular 18.2 / ng-packagr 18.2 / TypeScript 5.5.4** specifically: ng-packagr 19+ would emit `ɵɵStandaloneFeature` (which Angular 19 removed) and break Angular 17/18 consumers via the dev-time `portal:` resolution path.

---

## React Build & Setup

### Step 1: Build Stencil Components with React Output

In the `age-design` project root:

```bash
yarn build.react
```

This command will:
- Clean and regenerate design tokens
- Build Stencil components
- **Auto-generate** `react-design-system/src/components/stencil-generated/`
- Copy CSS tokens to `react-design-system/src/components/stencil-generated/styles/`

### Step 2: Copy CSS Tokens (Optional)

If tokens were not copied automatically, run:

```bash
cd react-design-system
yarn copy:tokens
cd ..
```

### Step 3: Build the React Wrapper Package

```bash
cd react-design-system
yarn build
cd ..
```

This command will:
- Run `prebuild` script to add `@ts-nocheck` to generated files
- Compile TypeScript files
- Run `postbuild` script to copy component files to `dist/`

The `dist/` folder will contain:
- `index.js` - Main entry point
- `index.d.ts` - TypeScript definitions
- `components/stencil-generated/` - All React wrapper components

---

## Vue Build & Setup

### Step 1: Build Stencil Components with Vue Output

In the `age-design` project root:

```bash
yarn build.vue
```

This command will:
- Clean and regenerate design tokens
- Build Stencil components
- **Auto-generate** `vue-design-system/src/components/stencil-generated/`
- Copy CSS tokens to `vue-design-system/src/components/stencil-generated/styles/`

### Step 2: Copy CSS Tokens (Optional)

If tokens were not copied automatically, run:

```bash
cd vue-design-system
yarn copy:tokens
cd ..
```

### Step 3: Build the Vue Wrapper Package

```bash
cd vue-design-system
yarn build
cd ..
```

This command will:
- Run `prebuild` script to add `@ts-nocheck` to generated files
- Compile TypeScript files
- Run `postbuild` script to copy component files to `dist/`

The `dist/` folder will contain:
- `index.js` - Main entry point
- `index.d.ts` - TypeScript definitions
- `components/stencil-generated/` - All Vue wrapper components

---

## Publishing Options

### Option A: Publish to Bitbucket Package Registry (Private)

#### 1. Create Bitbucket App Password

1. Go to your Bitbucket account → **Personal settings** → **App passwords**
2. Click **Create app password**
3. Give it a label: `npm-publish`
4. Select permissions:
   - **Repositories**: Read, Write
   - **Account**: Read
5. Copy the generated password (you won't see it again)

#### 2. Configure npm Authentication for Bitbucket

**Option A: Using Environment Variables (Recommended)**

Create a `.env` file in `angular-design-system/`:

```bash
cd angular-design-system
cp .env.example .env
```

Edit `.env` and fill in your values:

```bash
BITBUCKET_WORKSPACE=your-workspace-name
BITBUCKET_REPO=your-repo-name
BITBUCKET_USERNAME=your-bitbucket-username
BITBUCKET_EMAIL=your-email@example.com
BITBUCKET_APP_PASSWORD=your-app-password-here
```

Then run the setup script to generate `~/.npmrc`:

```bash
./setup-npmrc.sh
```

This will automatically create your `~/.npmrc` file with the correct configuration.

**Option B: Manual Configuration**

Or set environment variables and create `~/.npmrc` manually:

```bash
export BITBUCKET_WORKSPACE=your-workspace-name
export BITBUCKET_REPO=your-repo-name
export BITBUCKET_USERNAME=your-bitbucket-username
export BITBUCKET_EMAIL=your-email@example.com
export BITBUCKET_APP_PASSWORD=your-app-password-here
```

Then create `~/.npmrc`:

```bash
@${BITBUCKET_WORKSPACE}:registry=https://api.bitbucket.org/2.0/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO}/npm/
//api.bitbucket.org/2.0/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO}/npm/:_password=${BITBUCKET_APP_PASSWORD}
//api.bitbucket.org/2.0/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO}/npm/:username=${BITBUCKET_USERNAME}
//api.bitbucket.org/2.0/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO}/npm/:email=${BITBUCKET_EMAIL}
//api.bitbucket.org/2.0/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO}/npm/:always-auth=true
```

#### 3. Configure Package for Bitbucket

In `angular-design-system/package.json`, update:

```json
{
  "name": "@YOUR_WORKSPACE/angular-design-system",
  "publishConfig": {
    "registry": "https://api.bitbucket.org/2.0/repositories/YOUR_WORKSPACE/YOUR_REPO/npm/"
  }
}
```

Also update the main Stencil package in `package.json`:

```json
{
  "name": "@YOUR_WORKSPACE/design-system",
  "publishConfig": {
    "registry": "https://api.bitbucket.org/2.0/repositories/YOUR_WORKSPACE/YOUR_REPO/npm/"
  }
}
```

#### 4. Publish the Packages

```bash
# Publish Stencil package first
cd dist
yarn publish

# Then publish Angular wrapper
cd ../angular-design-system
yarn version --patch  # or --minor, --major
yarn publish

# And/or publish React wrapper
cd ../react-design-system
yarn version --patch  # or --minor, --major
yarn publish

# And/or publish Vue wrapper
cd ../vue-design-system
yarn version --patch  # or --minor, --major
yarn publish
```

#### 5. Install in Your Application

In your app's `.npmrc`:

```bash
@YOUR_WORKSPACE:registry=https://api.bitbucket.org/2.0/repositories/YOUR_WORKSPACE/YOUR_REPO/npm/
//api.bitbucket.org/2.0/repositories/YOUR_WORKSPACE/YOUR_REPO/npm/:_password=YOUR_APP_PASSWORD
//api.bitbucket.org/2.0/repositories/YOUR_WORKSPACE/YOUR_REPO/npm/:username=YOUR_BITBUCKET_USERNAME
//api.bitbucket.org/2.0/repositories/YOUR_WORKSPACE/YOUR_REPO/npm/:email=YOUR_EMAIL
//api.bitbucket.org/2.0/repositories/YOUR_WORKSPACE/YOUR_REPO/npm/:always-auth=true
```

Then install:

**For Angular:**
```bash
yarn add @YOUR_WORKSPACE/design-system @YOUR_WORKSPACE/angular-design-system
```

**For React:**
```bash
yarn add @YOUR_WORKSPACE/design-system @YOUR_WORKSPACE/react-design-system
```

**For Vue:**
```bash
yarn add @YOUR_WORKSPACE/design-system @YOUR_WORKSPACE/vue-design-system
```

### Option B: Publish to npm Registry (Private)

#### 1. Create npm Access Token

Go to [npmjs.com](https://www.npmjs.com/) and create an access token:

1. Log in to your npm account
2. Click on your profile picture → **Access Tokens**
3. Click **Generate New Token** → **Classic Token**
4. Select **Automation** (for CI/CD) or **Publish** (for manual publishing)
5. Copy the generated token (starts with `npm_...`)

#### 2. Configure npm Authentication

Create or edit `~/.npmrc` file:

```bash
# Add this line with your token
//registry.npmjs.org/:_authToken=npm_YOUR_TOKEN_HERE
```

Or set it via command:

```bash
npm config set //registry.npmjs.org/:_authToken npm_YOUR_TOKEN_HERE
```

#### 3. Publish the Package

```bash
cd angular-design-system

# Update version in package.json
yarn version --patch  # or --minor, --major

# Publish to npm (private by default for scoped packages)
yarn publish --access restricted
```

#### 4. Install in Your Angular App

First, ensure your Angular app can access the private package. In your Angular project root, create/edit `.npmrc`:

```bash
# .npmrc in your Angular app
//registry.npmjs.org/:_authToken=npm_YOUR_TOKEN_HERE
```

Then install:

```bash
yarn add @age/design-system @age/angular-design-system
```

### Option C: Publish to GitLab Package Registry (Private)

#### 1. Create GitLab Access Token

1. Go to your GitLab project → **Settings** → **Access Tokens**
2. Create a new token with:
   - **Token name**: `npm-publish` (or any name)
   - **Role**: `Maintainer` or `Owner`
   - **Scopes**: Select `api` and `write_package_registry`
3. Copy the generated token (starts with `glpat-...`)

#### 2. Find Your GitLab Project ID

- Go to your GitLab project
- The Project ID is shown under the project name on the main page
- Or find it in **Settings** → **General**

#### 3. Configure Package for GitLab

In `angular-design-system/package.json`, add:

```json
{
  "publishConfig": {
    "@age:registry": "https://gitlab.com/api/v4/projects/YOUR_PROJECT_ID/packages/npm/"
  }
}
```

#### 4. Authenticate and Publish

Set up authentication:

```bash
# Option 1: Using environment variable
export GITLAB_TOKEN=glpat-YOUR_TOKEN_HERE

# Option 2: Using npm config
npm config set //gitlab.com/api/v4/projects/YOUR_PROJECT_ID/packages/npm/:_authToken glpat-YOUR_TOKEN_HERE
```

Then publish:

```bash
cd angular-design-system
yarn publish
```

#### 5. Install in Your Angular App

In your Angular app's `.npmrc`:

```bash
@age:registry=https://gitlab.com/api/v4/projects/YOUR_PROJECT_ID/packages/npm/
//gitlab.com/api/v4/projects/YOUR_PROJECT_ID/packages/npm/:_authToken=glpat-YOUR_TOKEN_HERE
```

Then install:

```bash
yarn add @age/design-system @age/angular-design-system
```

### Option D: Local Development with yarn link (No Token Required)

For local testing without publishing:

```bash
# In age-design root
cd dist
yarn link

# In angular-design-system
yarn link @age/design-system
yarn build
yarn link

# In your Angular application
yarn link @age/design-system
yarn link @age/angular-design-system
```

### Option E: Install from Local Path (No Token Required)

```bash
# In your Angular application
yarn add file:/path/to/age-design/dist
yarn add file:/path/to/age-design/angular-design-system
```

---

## Installing in Applications

### Angular Application

### Step 1: Install Dependencies

```bash
yarn add @age/design-system @age/angular-design-system
```

### Step 2: Configure `angular.json`

Add illustration SVG assets and CSS tokens under `architect / build / options` in `angular.json`:

```json
{
  "projects": {
    "your-app": {
      "architect": {
        "build": {
          "options": {
            "assets": [
              {
                "glob": "**/*.svg",
                "input": "node_modules/@age/design-system/dist/design-system/assets/illustrations",
                "output": "/assets/illustrations"
              }
            ],
            "styles": [
              "node_modules/@age/design-system/dist/design-system/design-system.css",
              "node_modules/@age/design-system/dist/design-system/tokens/core.tokens.css",
              "src/styles.css"
            ]
          }
        }
      }
    }
  }
}
```

The `assets` entry copies the illustration SVGs from the design system package into your app's `assets/illustrations/` folder at build time, so `cor-illustration` can resolve them at runtime.

**Option B: Import tokens in `src/styles.css` instead**

```css
@import '@age/angular-design-system/styles/core.tokens.css';
@import '@age/angular-design-system/styles/age.tokens.css';

/* For dark theme support */
@import '@age/angular-design-system/styles/core.dark.tokens.css';
```

---

## Configuration in Angular

All components are **standalone** — import them directly, no shared module required. Register the custom elements once via `provideDesignSystem()`.

### Method 1: Standalone bootstrapApplication (Recommended for Angular 17+)

**In `src/main.ts`:**

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { provideDesignSystem } from '@age/angular-design-system';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideDesignSystem(),  // registers all custom elements once
  ],
}).catch(err => console.error(err));
```

**In a component that uses design system components:**

```typescript
import { Component } from '@angular/core';
import {
  CorButton,
  CorTimeline,
  ButtonVariant,
  CorTimelineVariant,
  CorTimelineScaleType,
  CorTimelineSelectorType,
} from '@age/angular-design-system';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CorButton, CorTimeline],
  template: `
    <cor-button [variant]="ButtonVariant.PRIMARY">
      <button>Click me</button>
    </cor-button>

    <cor-timeline
      [variant]="CorTimelineVariant.ON_PAGE"
      [scaleType]="CorTimelineScaleType.YEARS"
      [selectorType]="CorTimelineSelectorType.RANGE">
    </cor-timeline>
  `,
})
export class ExampleComponent {
  // Expose enums to the template — required for editor IntelliSense and
  // strictTemplates type checking on `[variant]="…"` bindings.
  readonly ButtonVariant = ButtonVariant;
  readonly CorTimelineVariant = CorTimelineVariant;
  readonly CorTimelineScaleType = CorTimelineScaleType;
  readonly CorTimelineSelectorType = CorTimelineSelectorType;
}
```

### Method 2: NgModule-based app (Angular 17+)

Standalone components can be imported directly into a legacy `NgModule`'s `imports` array — there is no longer any `DesignSystemModule`; consumers compose components per-component.

**In `app.module.ts`:**

```typescript
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideDesignSystem, CorButton, CorTimeline } from '@age/angular-design-system';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, CorButton, CorTimeline],   // standalone components
  providers: [provideDesignSystem()],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

### `provideDesignSystem(options?)` — bootstrap configuration

`provideDesignSystem()` registers a one-shot `APP_INITIALIZER` that calls `setAssetPath()` so `cor-illustration` (and any other asset-loading component) can resolve `/assets/illustrations/<name>.svg` from the correct origin. Pass an option object to override the default base URL:

```ts
import { provideDesignSystem, type DesignSystemOptions } from '@age/angular-design-system';

bootstrapApplication(AppComponent, {
  providers: [
    // Default: assets resolve from window.location.origin + '/'
    provideDesignSystem(),

    // Or override — useful when assets are served from a CDN:
    // provideDesignSystem({ assetPath: 'https://cdn.example.com/age/' }),
  ],
});
```

### `eventDetail<T>(event)` — typed custom-event handlers

Stencil dispatches `CustomEvent<TDetail>`; Angular template handlers receive the bare `Event`. The wrapper exports a one-line helper that removes the cast noise:

```ts
import {
  eventDetail,
  type CorAccordionToggleEventDetail,
} from '@age/angular-design-system';

@Component({
  template: `
    <cor-accordion (corAccordionToggle)="onToggle($event)">
      <span slot="summary">Header</span>
      <p>Body</p>
    </cor-accordion>
  `,
})
export class MyComponent {
  onToggle(event: Event): void {
    const { open } = eventDetail<CorAccordionToggleEventDetail>(event);
    // …
  }
}
```

For events whose detail is a primitive, pass the raw type — `eventDetail<boolean>(event)`, `eventDetail<string>(event)` — same idea.

### Public API surface

`@age/angular-design-system` re-exports the full Stencil public surface so consumers don't have to reach into `@age/design-system` directly:

| Category | Examples |
|---|---|
| Standalone Angular components | `CorButton`, `CorInput`, `CorTimeline`, … (one per Stencil component) |
| Bootstrap & helpers | `provideDesignSystem`, `DesignSystemOptions`, `eventDetail` |
| Runtime enums (typed `[input]` bindings) | `ButtonVariant`, `LinkState`, `textVariants`, `CorTimelineVariant`, … (69 total) |
| Component prop / JSX namespaces | `Components.CorButton`, `JSX.CorInput`, … |
| Custom-event generics | `CorAccordionCustomEvent<T>`, `CorInputCustomEvent<T>`, … (36 total) |
| Named event-detail interfaces | `CorAccordionToggleEventDetail`, `CorChipClickEventDetail`, `DateChangePayload`, … (15 total) |
| Icon names | `ICON_NAMES` constant + `IconName` literal-union type |

---

## Usage Examples

### Basic Component Usage

**In any component template:**

```html
<!-- Buttons - wrap native button element inside -->
<cor-button variant="primary">
  <button>Primary Button</button>
</cor-button>

<cor-button variant="secondary" size="large">
  <button>Large Secondary</button>
</cor-button>

<cor-button variant="danger">
  <button disabled>Disabled</button>
</cor-button>

<!-- Typography - wrap native heading/text elements -->
<cor-typography variant="h1">
  <h1>Main Heading</h1>
</cor-typography>

<cor-typography variant="body">
  <p>Body text content</p>
</cor-typography>

<!-- Icons - self-closing, no slot content needed -->
<cor-icon name="add" size="lg"></cor-icon>
<cor-icon name="settings" size="md"></cor-icon>
<cor-icon name="close" size="sm"></cor-icon>

<!-- Grid - wrap content inside -->
<cor-grid columns="3" gap="md">
  <div>Grid Item 1</div>
  <div>Grid Item 2</div>
  <div>Grid Item 3</div>
</cor-grid>

<!-- Separator - self-closing -->
<cor-separator></cor-separator>
```

### Event Binding

```typescript
// component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-example',
  template: `
    <cor-button 
      variant="primary"
      (corClick)="handleClick($event)">
      <button>Click Me</button>
    </cor-button>
    
    <cor-typography variant="body">
      <p>{{ message }}</p>
    </cor-typography>
    
    <cor-icon 
      name="settings" 
      size="md"
      (corIconClick)="handleIconClick($event)">
    </cor-icon>
  `
})
export class ExampleComponent {
  message = 'Hello from Angular!';
  
  handleClick(event: CustomEvent) {
    console.log('Button clicked:', event.detail);
  }
  
  handleIconClick(event: CustomEvent) {
    console.log('Icon clicked:', event.detail);
  }
}
```

### Property Binding

```typescript
// component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-dynamic',
  template: `
    <cor-button 
      [variant]="buttonVariant"
      [size]="buttonSize">
      <button [disabled]="isDisabled">{{ buttonText }}</button>
    </cor-button>
    
    <cor-typography [variant]="typographyVariant">
      <p>{{ dynamicText }}</p>
    </cor-typography>
    
    <cor-icon 
      [name]="iconName" 
      [size]="iconSize">
    </cor-icon>
  `
})
export class DynamicComponent {
  buttonVariant = 'primary';
  buttonSize = 'medium';
  buttonText = 'Submit';
  isDisabled = false;
  
  typographyVariant = 'body';
  dynamicText = 'Dynamic content';
  
  iconName = 'settings';
  iconSize = 'md';
  
  toggleDisabled() {
    this.isDisabled = !this.isDisabled;
  }
}
```

### Template-Driven Forms with ngModel

```typescript
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CorButton, CorInput } from '@age/angular-design-system';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [FormsModule, CorButton, CorInput],
  template: `
    <form #form="ngForm" (ngSubmit)="onSubmit()">
      <cor-input
        name="username"
        [(ngModel)]="formData.username"
        label="Username"
        required>
      </cor-input>
      
      <cor-input
        name="email"
        [(ngModel)]="formData.email"
        label="Email"
        type="email"
        required>
      </cor-input>
      
      <cor-input
        name="password"
        [(ngModel)]="formData.password"
        label="Password"
        type="password"
        required>
      </cor-input>
      
      <cor-button variant="primary">
        <button type="submit" [disabled]="!form.valid">Submit</button>
      </cor-button>
    </form>
    
    <pre>{{ formData | json }}</pre>
  `
})
export class FormComponent {
  formData = {
    username: '',
    email: '',
    password: ''
  };
  
  onSubmit() {
    console.log('Form submitted:', this.formData);
  }
}
```

### Reactive Forms with FormControl

```typescript
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { CorButton, CorInput } from '@age/angular-design-system';

@Component({
  selector: 'app-reactive-form',
  standalone: true,
  imports: [ReactiveFormsModule, CorButton, CorInput],
  template: `
    <form [formGroup]="userForm" (ngSubmit)="onSubmit()">
      <cor-input
        formControlName="firstName"
        label="First Name"
        [class.invalid]="userForm.get('firstName')?.invalid && userForm.get('firstName')?.touched">
      </cor-input>
      
      <cor-input
        formControlName="lastName"
        label="Last Name">
      </cor-input>
      
      <cor-input
        formControlName="email"
        label="Email"
        type="email">
      </cor-input>
      
      <cor-button variant="primary">
        <button type="submit" [disabled]="!userForm.valid">Save</button>
      </cor-button>
    </form>
    
    <div *ngIf="userForm.invalid && userForm.touched">
      <p>Please fix the errors above</p>
    </div>
  `
})
export class ReactiveFormComponent implements OnInit {
  userForm!: FormGroup;
  
  constructor(private fb: FormBuilder) {}
  
  ngOnInit() {
    this.userForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });
  }
  
  onSubmit() {
    if (this.userForm.valid) {
      console.log('Form data:', this.userForm.value);
    }
  }
}
```

### Using in Standalone Components

Every wrapped component is itself a standalone Angular component — import only the ones you use, no shared module to drag along.

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CorButton, CorTypography, CorGrid,
  ButtonVariant, textVariants,
} from '@age/angular-design-system';

@Component({
  selector: 'app-standalone',
  standalone: true,
  imports: [CommonModule, CorButton, CorTypography, CorGrid],
  template: `
    <cor-button [variant]="ButtonVariant.PRIMARY">
      <button>Standalone Component</button>
    </cor-button>

    <cor-typography [variant]="textVariants.HEADING_MD">
      <h2>Standalone Component Example</h2>
    </cor-typography>

    <cor-grid container>
      <cor-grid size="6"><div>Column 1</div></cor-grid>
      <cor-grid size="6"><div>Column 2</div></cor-grid>
    </cor-grid>
  `,
})
export class StandaloneComponent {
  readonly ButtonVariant = ButtonVariant;
  readonly textVariants = textVariants;
}
```

---

### React Application

#### Step 1: Install Dependencies

```bash
yarn add @age/design-system @age/react-design-system
```

#### Step 2: Copy illustration assets (Vite)

`cor-illustration` fetches SVG files at runtime. They must be served from your app's build output. Install the copy plugin:

```bash
yarn add -D vite-plugin-static-copy
```

Then add to `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@age/design-system/dist/design-system/assets/illustrations/*',
          dest: 'assets/illustrations',
        },
      ],
    }),
  ],
})
```

#### Step 3: Import CSS Tokens (Optional but Recommended)

**In `src/index.css` or `src/App.css`:**

```css
@import '@age/react-design-system/components/stencil-generated/styles/core.tokens.css';
@import '@age/react-design-system/components/stencil-generated/styles/age.tokens.css';

/* For dark theme support */
@import '@age/react-design-system/components/stencil-generated/styles/core.dark.tokens.css';
```

#### Step 4: Import Components

```tsx
// Import individual components
import { CorButton, CorTypography, CorIcon, CorGrid } from '@age/react-design-system';

// Or import all at once
import * as DesignSystem from '@age/react-design-system';
```

#### Usage Examples

**Basic Components:**

```tsx
import React from 'react';
import { CorButton, CorTypography, CorIcon, CorGrid, CorSeparator } from '@age/react-design-system';

function App() {
  return (
    <div className="App">
      {/* Button - wrap native button */}
      <CorButton variant="primary" size="medium">
        <button>Click Me</button>
      </CorButton>

      {/* Typography - wrap content */}
      <CorTypography variant="h1">
        <h1>Main Heading</h1>
      </CorTypography>

      <CorTypography variant="body">
        <p>Body text content</p>
      </CorTypography>

      {/* Icons - self-closing */}
      <CorIcon name="add" size="lg" />
      <CorIcon name="settings" size="md" />

      {/* Grid - wrap content */}
      <CorGrid columns={3} gap="md">
        <div>Grid Item 1</div>
        <div>Grid Item 2</div>
        <div>Grid Item 3</div>
      </CorGrid>

      {/* Separator - self-closing */}
      <CorSeparator />
    </div>
  );
}

export default App;
```

**Event Handling:**

```tsx
import React, { useState } from 'react';
import { CorButton, CorTypography, CorIcon } from '@age/react-design-system';

function EventExample() {
  const [message, setMessage] = useState('Hello from React!');
  const [clickCount, setClickCount] = useState(0);

  const handleClick = (event: CustomEvent) => {
    console.log('Button clicked:', event.detail);
    setClickCount(prev => prev + 1);
    setMessage(`Clicked ${clickCount + 1} times`);
  };

  const handleIconClick = (event: CustomEvent) => {
    console.log('Icon clicked:', event.detail);
  };

  return (
    <div>
      <CorButton 
        variant="primary"
        onCorClick={handleClick}>
        <button>Click Me</button>
      </CorButton>
      
      <CorTypography variant="body">
        <p>{message}</p>
      </CorTypography>
      
      <CorIcon 
        name="settings" 
        size="md"
        onCorIconClick={handleIconClick}
      />
    </div>
  );
}

export default EventExample;
```

**Dynamic Props:**

```tsx
import React, { useState } from 'react';
import { CorButton, CorTypography, CorIcon } from '@age/react-design-system';

function DynamicExample() {
  const [variant, setVariant] = useState<'primary' | 'secondary' | 'tertiary'>('primary');
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [iconName, setIconName] = useState('settings');

  return (
    <div>
      <CorButton 
        variant={variant}
        size={size}>
        <button>Dynamic Button</button>
      </CorButton>
      
      <CorIcon 
        name={iconName} 
        size="md"
      />
      
      <div>
        <button onClick={() => setVariant('primary')}>Primary</button>
        <button onClick={() => setVariant('secondary')}>Secondary</button>
        <button onClick={() => setSize('small')}>Small</button>
        <button onClick={() => setSize('large')}>Large</button>
      </div>
    </div>
  );
}

export default DynamicExample;
```

**Form Handling:**

```tsx
import React, { useState } from 'react';
import { CorInput, CorButton } from '@age/react-design-system';

function FormExample() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  const handleInputChange = (field: string) => (event: CustomEvent) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.detail.value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <CorInput
        name="username"
        label="Username"
        value={formData.username}
        onCorChange={handleInputChange('username')}
        required
      />
      
      <CorInput
        name="email"
        label="Email"
        type="email"
        value={formData.email}
        onCorChange={handleInputChange('email')}
        required
      />
      
      <CorInput
        name="password"
        label="Password"
        type="password"
        value={formData.password}
        onCorChange={handleInputChange('password')}
        required
      />
      
      <CorButton variant="primary">
        <button type="submit">Submit</button>
      </CorButton>
      
      <pre>{JSON.stringify(formData, null, 2)}</pre>
    </form>
  );
}

export default FormExample;
```

**TypeScript Support:**

```tsx
import React from 'react';
import { 
  CorButton, 
  CorTypography, 
  CorIcon,
  type CorButtonCustomEvent 
} from '@age/react-design-system';

interface Props {
  title: string;
  onAction: (data: any) => void;
}

const TypedComponent: React.FC<Props> = ({ title, onAction }) => {
  const handleClick = (event: CorButtonCustomEvent<any>) => {
    onAction(event.detail);
  };

  return (
    <div>
      <CorTypography variant="h2">
        <h2>{title}</h2>
      </CorTypography>
      
      <CorButton 
        variant="primary"
        onCorClick={handleClick}>
        <button>Action</button>
      </CorButton>
    </div>
  );
};

export default TypedComponent;
```

---

### Vue Application

#### Step 1: Install Vue dependencies

```bash
yarn add @age/design-system @age/vue-design-system
```

#### Step 2: Configure Vite to copy illustration assets

`cor-illustration` fetches SVG files at runtime. They must be served from your app's build output. Install the copy plugin:

```bash
yarn add -D vite-plugin-static-copy
```

Then add to `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@age/design-system/dist/design-system/assets/illustrations/*',
          dest: 'assets/illustrations',
        },
      ],
    }),
  ],
})
```

#### Step 3: Add CSS tokens (Optional but Recommended)

**In `src/main.css` or `src/App.vue`:**

```css
@import '@age/vue-design-system/components/stencil-generated/styles/core.tokens.css';
@import '@age/vue-design-system/components/stencil-generated/styles/age.tokens.css';

/* For dark theme support */
@import '@age/vue-design-system/components/stencil-generated/styles/core.dark.tokens.css';
```

#### Step 4: Import Vue components

```typescript
// Import individual components
import { CorButton, CorTypography, CorIcon, CorGrid } from '@age/vue-design-system';

// Or import all at once
import * as DesignSystem from '@age/vue-design-system';
```

#### Usage Examples

**Basic Components:**

```vue
<template>
  <div class="App">
    <!-- Button - wrap native button -->
    <CorButton variant="primary" size="medium">
      <button>Click Me</button>
    </CorButton>

    <!-- Typography - wrap content -->
    <CorTypography variant="h1">
      <h1>Main Heading</h1>
    </CorTypography>

    <CorTypography variant="body">
      <p>Body text content</p>
    </CorTypography>

    <!-- Icons - self-closing -->
    <CorIcon name="add" size="lg" />
    <CorIcon name="settings" size="md" />

    <!-- Grid - wrap content -->
    <CorGrid :columns="3" gap="md">
      <div>Grid Item 1</div>
      <div>Grid Item 2</div>
      <div>Grid Item 3</div>
    </CorGrid>

    <!-- Separator - self-closing -->
    <CorSeparator />
  </div>
</template>

<script setup lang="ts">
import { CorButton, CorTypography, CorIcon, CorGrid, CorSeparator } from '@age/vue-design-system';
</script>
```

**Event Handling:**

```vue
<template>
  <div>
    <CorButton 
      variant="primary"
      @corClick="handleClick">
      <button>Click Me</button>
    </CorButton>
    
    <CorTypography variant="body">
      <p>{{ message }}</p>
    </CorTypography>
    
    <CorIcon 
      name="settings" 
      size="md"
      @corIconClick="handleIconClick"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CorButton, CorTypography, CorIcon } from '@age/vue-design-system';

const message = ref('Hello from Vue!');
const clickCount = ref(0);

const handleClick = (event: CustomEvent) => {
  console.log('Button clicked:', event.detail);
  clickCount.value++;
  message.value = `Clicked ${clickCount.value} times`;
};

const handleIconClick = (event: CustomEvent) => {
  console.log('Icon clicked:', event.detail);
};
</script>
```

**Dynamic Props:**

```vue
<template>
  <div>
    <CorButton 
      :variant="variant"
      :size="size">
      <button>Dynamic Button</button>
    </CorButton>
    
    <CorIcon 
      :name="iconName" 
      size="md"
    />
    
    <div>
      <button @click="variant = 'primary'">Primary</button>
      <button @click="variant = 'secondary'">Secondary</button>
      <button @click="size = 'small'">Small</button>
      <button @click="size = 'large'">Large</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CorButton, CorIcon } from '@age/vue-design-system';

const variant = ref<'primary' | 'secondary' | 'tertiary'>('primary');
const size = ref<'small' | 'medium' | 'large'>('medium');
const iconName = ref('settings');
</script>
```

**Form Handling:**

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <CorInput
      name="username"
      label="Username"
      :value="formData.username"
      @corChange="formData.username = $event.detail.value"
      required
    />
    
    <CorInput
      name="email"
      label="Email"
      type="email"
      :value="formData.email"
      @corChange="formData.email = $event.detail.value"
      required
    />
    
    <CorInput
      name="password"
      label="Password"
      type="password"
      :value="formData.password"
      @corChange="formData.password = $event.detail.value"
      required
    />
    
    <CorButton variant="primary">
      <button type="submit">Submit</button>
    </CorButton>
    
    <pre>{{ formData }}</pre>
  </form>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { CorInput, CorButton } from '@age/vue-design-system';

const formData = reactive({
  username: '',
  email: '',
  password: ''
});

const handleSubmit = () => {
  console.log('Form submitted:', formData);
};
</script>
```

**TypeScript Support:**

```vue
<template>
  <div>
    <CorTypography variant="h2">
      <h2>{{ title }}</h2>
    </CorTypography>
    
    <CorButton 
      variant="primary"
      @corClick="handleClick">
      <button>Action</button>
    </CorButton>
  </div>
</template>

<script setup lang="ts">
import { 
  CorButton, 
  CorTypography,
  type CorButtonCustomEvent 
} from '@age/vue-design-system';

interface Props {
  title: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  action: [data: any]
}>();

const handleClick = (event: CorButtonCustomEvent<any>) => {
  emit('action', event.detail);
};
</script>
```

---

## Troubleshooting

### Issue: "Custom element not defined"

**Cause:** `provideDesignSystem()` was not registered with the app.

**Solution:** Add it to the providers list of `bootstrapApplication` (standalone bootstrap) or the root `@NgModule`'s `providers`:

```typescript
import { provideDesignSystem } from '@age/angular-design-system';

bootstrapApplication(AppComponent, {
  providers: [provideDesignSystem()],
});
```

Each Angular proxy component (`CorButton`, `CorInput`, …) is responsible for defining its own custom element on first use, so the additional `provideDesignSystem()` step is what wires the asset path. Without it, illustrations 404 even though components render.

### Issue: NG0203 — `inject() must be called from an injection context`

**Cause:** **Two copies of `@angular/core` loaded simultaneously.** Happens during local dev when the wrapper is consumed via Yarn `portal:` linking and the bundler follows the link to the wrapper's own `node_modules/@angular/core` instead of the consumer's. Production installs are not affected.

**Solution:** Tell the toolchain to preserve symlinks so it resolves `@angular/core` from the consumer's root:

```jsonc
// angular.json
{
  "architect": {
    "build": {
      "options": {
        "preserveSymlinks": true
      }
    }
  }
}
```

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "preserveSymlinks": true
  }
}
```

### Issue: TypeScript errors for component properties

**Cause:** Angular wrapper not properly installed.

**Solution:**
```bash
yarn add @age/angular-design-system
```

### Issue: ngModel not working

**Cause:** Component doesn't implement `ControlValueAccessor` or `FormsModule` not imported.

**Solution:** Import `FormsModule` and the specific design-system component(s) you use into the consuming standalone component's `imports`:

```typescript
import { FormsModule } from '@angular/forms';
import { CorInput } from '@age/angular-design-system';

@Component({
  standalone: true,
  imports: [FormsModule, CorInput],
  // …
})
```

### Issue: Styles not applied

**Cause:** CSS tokens not imported.

**Solution:** Import tokens in `angular.json` or `styles.css`:
```css
@import '@age/angular-design-system/styles/core.tokens.css';
@import '@age/angular-design-system/styles/age.tokens.css';
```

### Issue: Build errors after updating components

**Cause:** Angular wrapper not regenerated.

**Solution:**
```bash
# In age-design root
yarn build.angular

# In angular-design-system
yarn build
```

### Issue: Module not found errors

**Cause:** Packages not linked properly in local development.

**Solution:**
```bash
# Re-link packages
cd age-design/dist
yarn link

cd ../angular-design-system
yarn link @age/design-system
yarn build
yarn link

cd /path/to/your/angular-app
yarn link @age/design-system
yarn link @age/angular-design-system
```

---

## Development Workflow

### For Component Development

1. Make changes to Stencil components in `age-design/src/`
2. Rebuild with Angular output:
   ```bash
   yarn build.angular
   ```
3. Rebuild Angular wrapper:
   ```bash
   cd angular-design-system
   yarn build
   ```
4. Test in your Angular app (if using yarn link, changes are immediate)

### Watch Mode for Development

**Terminal 1 - Watch Stencil:**
```bash
cd age-design
yarn build.watch
```

**Terminal 2 - Rebuild Angular wrapper when needed:**
```bash
cd angular-design-system
yarn build
```

---

## Summary Checklist

- [ ] Install dependencies: `yarn install` (in both root and angular-design-system)
- [ ] Build Stencil components: `yarn build`
- [ ] Build Stencil with Angular output: `yarn build.angular`
- [ ] Copy CSS tokens (if needed): `cd angular-design-system && yarn copy:tokens`
- [ ] Build Angular wrapper: `cd angular-design-system && yarn build`
- [ ] Publish or link packages (choose one option from Publishing Options)
- [ ] Install in Angular app: `yarn add @age/design-system @age/angular-design-system`
- [ ] Register `provideDesignSystem()` in `bootstrapApplication`'s providers (or root `NgModule`'s `providers`)
- [ ] Import the standalone components you use into each consuming component's `imports` array (e.g. `imports: [CorButton, CorInput]`)
- [ ] Import CSS tokens in `angular.json` or `styles.css`
- [ ] Add the illustration asset-copy entry to `angular.json` (see "Step 2: Configure `angular.json`")
- [ ] Import `FormsModule` or `ReactiveFormsModule` alongside the components you use, when needed
- [ ] For local dev via Yarn `portal:` — set `preserveSymlinks: true` in `angular.json` and `tsconfig.json` (see Troubleshooting → NG0203)

---

## Storybook — development, production build, and preview

### Development (hot-reload)

Starts Stencil in watch mode and Storybook dev server together. Waits for `dist/` to be ready before launching Storybook.

```bash
yarn dev
```

Storybook is available at `http://localhost:6007`.

### Production build

Compiles the full component library (`dist/`) then builds the static Storybook site (`storybook-static/`). Use this to verify the production output before deploying.

```bash
yarn sp.prod
```

> `sp.build` is an alias for the same task — both are equivalent.

### Preview the production build locally

After `sp.prod` completes, serve `storybook-static/` locally to inspect it exactly as it will appear in production:

```bash
yarn sp.serve
# or the combined alias:
yarn serve
```

Opens at `http://localhost:6008` (port 6008 is intentionally one above the dev server so both can run side-by-side).

### Script reference

| Script | Output | Purpose |
| --- | --- | --- |
| `yarn dev` | — | Dev server with hot-reload (Stencil + Storybook) |
| `yarn sp.prod` | `storybook-static/` | Full production build |
| `yarn sp.serve` | — | Serve `storybook-static/` at port 6008 |
| `yarn serve` | — | Alias for `sp.serve` |

---

## Tokens — sync, audit, lint, and developer DX

This project uses Style Dictionary tokens stored under `tokens/` and a Tokenhaus Figma export workflow. Follow these guidelines for syncing, testing, auditing, and consuming tokens.

- Recommended Figma plugin: "Tokenhaus — Variable Import/Export (with links)" (search the Figma Community). Use that plugin to export a Tokenhaus JSON file (the repo expects `tokens-tokenhaus.json` by default).

- Sync workflow (safe, review-first):
  1. In Figma install and run the Tokenhaus plugin and export variables to a JSON file (eg. `tokens-tokenhaus.json`).
  2. Run the built-in sync helper which converts the Tokenhaus export into the repo's Style Dictionary token files:
      ```bash
      yarn sync:tokens
      # or, directly:
      node scripts/sync-tokens-from-tokenhaus.mjs --input tokens-tokenhaus.json --output tokens/figma-export
      ```

  3. Generated files land in `tokens/figma-export/` (this script never overwrites `tokens/core/` or `tokens/core.dark/`). Review and diff the generated output carefully.
  4. Manually copy approved files from `tokens/figma-export/` into `tokens/core/` and `tokens/core.dark/` as appropriate, commit, then run the token build step.

- Sync script CLI (useful flags):
  --input <file>        Path to Tokenhaus JSON (default: `tokens-tokenhaus.json`)
  -o, --output <dir>    Output directory (default: `tokens/figma-export`)
  --brand <mode>        Optional brand/variant selector used by the script
  --dry-run             Validate and print actions without writing files
  --report <file>       Write a JSON report of mapping/warnings
  --strict              Fail on unresolved references or unexpected shapes

- Token build & watch
  - Rebuild tokens (dev): `yarn tokens.build`
  - Production token build (CSS + JSON used by dist): `yarn tokens.build.prod`
  - AGE-specific tokens: `yarn tokens.build.age`
  - Watch tokens during development: `yarn tokens.watch`

- Audit & lint commands (run before committing changes):
  - `yarn tokens.audit` — run a missing-reference audit for the light token config
  - `yarn tokens.audit.dark` — run the missing-reference audit for dark tokens
  - `yarn tokens.lint` — lint tokens under `tokens/core` (naming, references, schema)
  - `yarn tokens.lint.dark` — lint tokens under `tokens/core.dark`
  - `yarn tokens.lint.all` — lint both `tokens/core` and `tokens/core.dark`

What each does briefly:
  - audit (debug-missing-token-references.mjs): scans Style Dictionary configs for references that can't be resolved and prints human-friendly context and file/line locations to help you fix missing or broken token links.
  - lint (scripts/tokens-lint.mjs): validates token filename conventions, key naming, required fields, and other repo-specific rules; it returns non-zero on errors.

- Typical developer DX flow
  1. Export from Figma (Tokenhaus) → `tokens-tokenhaus.json`.
  2. Run `yarn sync:tokens` (or with `--dry-run`) → inspect `tokens/figma-export/`.
  3. Copy approved files into `tokens/core/` and/or `tokens/core.dark/`.
  4. Run `yarn tokens.lint` and `yarn tokens.audit` and fix issues.
  5. Run `yarn tokens.build` (or `yarn build` to run full product build).
  6. Verify generated CSS appears under `tokens/generated/` and that Storybook/previews pick up updated tokens.

- Where files land and what consumes them
  - Source token JSON: `tokens/core/**/*.tokens.json` and `tokens/core.dark/**/*.tokens.json`
  - Generated build outputs: `tokens/generated/` and `dist/design-system/tokens/` (used by Storybook and package consumers)
  - Storybook assets: `.storybook/stories/assets/core.tokens.json` and `core.dark.tokens.json`

- Helpful tips
  - Always run lint & audit before opening a PR that modifies tokens.
  - Use `--dry-run` when experimenting with the sync tool so you don't accidentally overwrite generated staging files.
  - When in doubt, keep token changes small and submit a separate PR for tokens only — tokens affect the entire design system and are easier to review when isolated.


## Additional Resources

- [Stencil Angular Output Target Documentation](https://stenciljs.com/docs/angular)
- [Angular Custom Elements Guide](https://angular.io/guide/elements)
- [Angular Forms Documentation](https://angular.io/guide/forms-overview)
