<script setup lang="ts">
import { MudTextInput } from '@egov-moldova/mud-vue';
</script>

<template>
  <!-- @negative-binding size: the one wrong binding below. `size` accepts 'medium' | 'large', not a number. -->
  <MudTextInput :size="42" />
</template>
