<script setup lang="ts">
import {
  MudCheckbox,
  MudDateInput,
  MudFileInput,
  MudIcon,
  MudInputChip,
  MudLogo,
  MudNumericInput,
  MudPhoneInput,
  MudSelect,
  MudTextInput,
} from '@egov-moldova/mud-vue';
import { computed, ref } from 'vue';

// One component per model shape of the form-control model map. Every control is bound with
// `v-model` and shows its model in an `<output>`, so the spec reads both directions: the
// element to the model, and a model write back onto the element.
const text = ref('');
const date = ref('');
const num = ref<number | null | undefined>(undefined);
// Counts the `update:modelValue` emissions of `num`: one commit must reach the app once.
const numEmits = ref(0);
// Seeded with a value at mount, so the wrapper's write after mount is what puts it on the element.
const numSeeded = ref<number | null>(7);
const checked = ref(false);
const fruit = ref('');
// Starts as `null`, like `files`: the component treats a `null` `chips` as an empty list.
const chips = ref(null as unknown as string[]);
const phone = ref('');
// Starts as `null`, the cleared-form state the acceptance bar names: the component treats a
// `null` `files` as an empty list. The cast is only for vue-tsc, whose wrapper type is `File[]`.
const files = ref(null as unknown as File[]);

const fileNames = computed(() => (files.value ?? []).map(file => file.name));
</script>

<template>
  <main>
    <h1>mud-vue consumer fixture</h1>

    <section>
      <h2>string on mudInput (text-input)</h2>
      <MudTextInput v-model="text" data-testid="text" aria-label="Text" />
      <output data-testid="text-model">{{ JSON.stringify(text) }}</output>
      <button type="button" data-testid="text-set" @click="text = 'from model'">set model</button>
    </section>

    <section>
      <h2>string on mudChange (date-input)</h2>
      <MudDateInput v-model="date" data-testid="date" aria-label="Date" />
      <output data-testid="date-model">{{ JSON.stringify(date) }}</output>
      <button type="button" data-testid="date-set" @click="date = '01/02/2024'">set model</button>
    </section>

    <section>
      <h2>number (numeric-input)</h2>
      <MudNumericInput
        v-model="num"
        data-testid="numeric"
        aria-label="Number"
        :max="10"
        @update:model-value="numEmits += 1"
      />
      <output data-testid="numeric-model">{{ JSON.stringify(num ?? null) }}</output>
      <output data-testid="numeric-emits">{{ numEmits }}</output>
      <button type="button" data-testid="numeric-set" @click="num = 7">set model</button>
      <!-- A numeric string, as a form library or a query string hands it over: it must read as 5. -->
      <button type="button" data-testid="numeric-string" @click="num = '5' as unknown as number">set '5'</button>
      <button type="button" data-testid="numeric-null" @click="num = null">set null</button>
      <button type="button" data-testid="numeric-undefined" @click="num = undefined">set undefined</button>
    </section>

    <section>
      <h2>number seeded at mount (numeric-input)</h2>
      <MudNumericInput v-model="numSeeded" data-testid="numeric-seeded" aria-label="Seeded number" />
      <output data-testid="numeric-seeded-model">{{ JSON.stringify(numSeeded) }}</output>
      <button type="button" data-testid="numeric-seeded-null" @click="numSeeded = null">set null</button>
    </section>

    <section>
      <h2>boolean (checkbox)</h2>
      <MudCheckbox v-model="checked" data-testid="checkbox" aria-label="Checkbox" />
      <output data-testid="checkbox-model">{{ JSON.stringify(checked) }}</output>
      <button type="button" data-testid="checkbox-set" @click="checked = true">set model</button>
    </section>

    <section>
      <h2>select (select)</h2>
      <MudSelect v-model="fruit" data-testid="select" aria-label="Fruit">
        <option value="apple">Apple</option>
        <option value="pear">Pear</option>
      </MudSelect>
      <output data-testid="select-model">{{ JSON.stringify(fruit) }}</output>
      <button type="button" data-testid="select-set" @click="fruit = 'pear'">set model</button>
    </section>

    <section>
      <h2>string array (input-chip)</h2>
      <MudInputChip v-model="chips" data-testid="chips" aria-label="Chips" />
      <output data-testid="chips-model">{{ JSON.stringify(chips) }}</output>
      <button type="button" data-testid="chips-set" @click="chips = ['x', 'y']">set model</button>
    </section>

    <section>
      <h2>file array (file-input)</h2>
      <MudFileInput v-model="files" data-testid="files" multiple />
      <output data-testid="files-model">{{ JSON.stringify(fileNames) }}</output>
    </section>

    <section>
      <h2>phone-input country switch</h2>
      <MudPhoneInput v-model="phone" data-testid="phone" type="international" aria-label="Phone" />
      <output data-testid="phone-model">{{ JSON.stringify(phone) }}</output>
      <button type="button" data-testid="phone-set" @click="phone = '+37360654321'">set model</button>
    </section>

    <section>
      <h2>assets (icon, logo)</h2>
      <MudIcon data-testid="icon" name="alarm" :size="24" />
      <MudLogo data-testid="logo" />
    </section>
  </main>
</template>
