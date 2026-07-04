<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { isLoggedIn } from '@/api/auth'
import AuthModal from './AuthModal.vue'

const props = withDefaults(defineProps<{
  mode?: 'optional' | 'required'
}>(), {
  mode: 'optional',
})

const emit = defineEmits<{
  guarded: []
}>()

const showModal = ref(false)
const authed = ref(false)

onMounted(() => {
  if (!isLoggedIn()) {
    showModal.value = true
  } else {
    authed.value = true
  }
})

function handleLogin() {
  authed.value = true
  showModal.value = false
  emit('guarded')
}

function handleClose() {
  showModal.value = false
  if (props.mode === 'required' && !isLoggedIn()) {
    showModal.value = true
  }
}
</script>

<template>
  <template v-if="authed || isLoggedIn()">
    <slot />
  </template>
  <template v-else>
    <template v-if="mode === 'optional'">
      <slot />
    </template>
    <AuthModal
      :open="showModal"
      :force="mode === 'required'"
      @close="handleClose"
      @login="handleLogin"
    />
  </template>
</template>
