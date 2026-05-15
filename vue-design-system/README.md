# Vue Design System

Vue wrapper for AGE Design System components built with StencilJS.

## Installation

```bash
npm install @age/design-system @age/vue-design-system
# or
yarn add @age/design-system @age/vue-design-system
```

## Setup

### 1. Import CSS Tokens (Optional but Recommended)

In your main CSS file (e.g., `src/main.css` or `src/App.vue`):

```css
@import '@age/vue-design-system/components/stencil-generated/styles/core.tokens.css';
@import '@age/vue-design-system/components/stencil-generated/styles/age.tokens.css';

/* For dark theme support */
@import '@age/vue-design-system/components/stencil-generated/styles/core.dark.tokens.css';
```

### 2. Import Components

```typescript
// Import individual components
import { CorButton, CorTypography, CorIcon } from '@age/vue-design-system';

// Or import all at once
import * as DesignSystem from '@age/vue-design-system';
```

## Usage

### Basic Components

```vue
<template>
  <div>
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

### Event Handling

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

### Dynamic Props

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

### Form Handling with v-model

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

### TypeScript Support

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

## Available Scripts

- `yarn build` - Compile TypeScript to dist/
- `yarn copy:tokens` - Copy CSS design tokens from parent project

## Features

- ✅ Full TypeScript support
- ✅ Vue 3 Composition API compatible
- ✅ Tree-shakeable imports
- ✅ Design tokens included
- ✅ Dark theme support
- ✅ All Stencil components wrapped

## License

MIT
