<template>
  <div class="gameboy-screen" :class="{ shake: shaking, flash: flashing }">
    <!-- CRT scanline overlay -->
    <div class="scanlines"></div>
    <div class="crt-vignette"></div>

    <!-- Boot sequence: logo drops from top -->
    <div class="boot-logo" :class="{ dropped: logoDropped, hidden: bootDone }">
      <span class="logo-text">★ go.dotw.me ★</span>
    </div>

    <!-- Main content fades in after boot -->
    <div class="main-content" :class="{ visible: contentVisible }">
      <div class="title">★ go.dotw.me ★</div>

      <div class="spacer"></div>

      <div class="prompt-label">INSERT KEY TO START</div>

      <div class="input-row">
        <span class="caret">►</span>
        <div class="input-wrapper">
          <input
            ref="inputRef"
            v-model="key"
            type="password"
            autocomplete="current-password"
            class="pixel-input"
            maxlength="64"
            @keydown.enter="submit"
            spellcheck="false"
            autofocus
          />
        </div>
      </div>

      <!-- Status messages -->
      <div class="status-area">
        <div v-if="statusMsg" class="status-msg" :class="statusClass">{{ statusMsg }}</div>
        <div v-else class="press-enter blink">PRESS ENTER</div>
      </div>

      <div class="spacer"></div>

      <div class="copyright">© 2026 LOGAN</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { verifyKey } from '@/api/client';

const router = useRouter();
const key = ref('');
const loading = ref(false);
const shaking = ref(false);
const flashing = ref(false);
const statusMsg = ref('');
const statusClass = ref('');

// Boot animation state
const logoDropped = ref(false);
const bootDone = ref(false);
const contentVisible = ref(false);

const inputRef = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  // Step 1: drop logo after a short delay
  await delay(300);
  logoDropped.value = true;

  // Step 2: hold logo for a beat
  await delay(1200);

  // Step 3: hide logo, reveal content
  bootDone.value = true;
  await nextTick();
  await delay(100);
  contentVisible.value = true;

  // Step 4: focus input
  await delay(400);
  inputRef.value?.focus();
});

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function submit() {
  if (loading.value || !key.value.trim()) return;

  statusMsg.value = '';
  statusClass.value = '';
  loading.value = true;

  try {
    const ok = await verifyKey(key.value);
    if (ok) {
      localStorage.setItem('api_key', key.value);

      // Success: show READY! GO! + flash
      statusMsg.value = 'READY! GO!';
      statusClass.value = 'success';
      flashing.value = true;
      await delay(200);
      flashing.value = false;
      await delay(200);
      flashing.value = true;
      await delay(200);
      flashing.value = false;
      await delay(300);

      router.push('/overview');
    } else {
      // Fail: shake + ACCESS DENIED
      statusMsg.value = 'ACCESS DENIED';
      statusClass.value = 'denied';
      shaking.value = true;
      await delay(600);
      shaking.value = false;
      await delay(400);
      statusMsg.value = '';
      statusClass.value = '';
    }
  } catch {
    statusMsg.value = 'CONNECTION ERROR';
    statusClass.value = 'denied';
    shaking.value = true;
    await delay(600);
    shaking.value = false;
    await delay(400);
    statusMsg.value = '';
    statusClass.value = '';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

/* ── Base screen ── */
.gameboy-screen {
  position: fixed;
  inset: 0;
  background-color: #0f380f;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: 'Press Start 2P', monospace;
  color: #9bbc0f;
  overflow: hidden;
  /* subtle screen curvature */
  box-shadow: inset 0 0 120px rgba(0, 0, 0, 0.6);
}

/* ── CRT scanlines ── */
.scanlines {
  pointer-events: none;
  position: fixed;
  inset: 0;
  z-index: 10;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 2px,
    rgba(0, 0, 0, 0.18) 2px,
    rgba(0, 0, 0, 0.18) 4px
  );
}

/* ── CRT vignette ── */
.crt-vignette {
  pointer-events: none;
  position: fixed;
  inset: 0;
  z-index: 9;
  background: radial-gradient(ellipse at center, transparent 60%, rgba(0, 0, 0, 0.55) 100%);
}

/* ── Boot logo ── */
.boot-logo {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-100%);
  transition: transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.boot-logo.dropped {
  transform: translateY(40vh);
}

.boot-logo.hidden {
  display: none;
}

.logo-text {
  font-family: 'Press Start 2P', monospace;
  font-size: clamp(10px, 3vw, 18px);
  color: #9bbc0f;
  text-shadow: 0 0 16px #8bac0f, 0 0 32px #306230;
  white-space: nowrap;
}

/* ── Main content ── */
.main-content {
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  width: 100%;
  max-width: 420px;
  padding: 0 24px;
  box-sizing: border-box;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.main-content.visible {
  opacity: 1;
  transform: translateY(0);
}

/* ── Title ── */
.title {
  font-size: clamp(9px, 2.8vw, 16px);
  color: #9bbc0f;
  text-shadow: 0 0 10px #8bac0f;
  text-align: center;
  margin-bottom: 32px;
  white-space: nowrap;
}

/* ── Spacer ── */
.spacer {
  height: 16px;
}

/* ── Prompt label ── */
.prompt-label {
  font-size: clamp(6px, 1.8vw, 10px);
  color: #8bac0f;
  margin-bottom: 20px;
  letter-spacing: 0.05em;
  text-align: center;
}

/* ── Input row ── */
.input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-bottom: 24px;
}

.caret {
  font-size: clamp(8px, 2vw, 12px);
  color: #9bbc0f;
  flex-shrink: 0;
}

.input-wrapper {
  flex: 1;
  border: 2px solid #306230;
  background: #0f380f;
  box-shadow: inset 2px 2px 0 #000, 1px 1px 0 #8bac0f;
  padding: 2px 4px;
}

.pixel-input {
  width: 100%;
  box-sizing: border-box;
  background: transparent;
  border: none;
  outline: none;
  font-family: 'Press Start 2P', monospace;
  font-size: clamp(7px, 1.8vw, 11px);
  color: #9bbc0f;
  caret-color: #9bbc0f;
  padding: 6px 4px;
  letter-spacing: 0.1em;
  /* Custom blinking text cursor via animation fallback */
}

.pixel-input::placeholder {
  color: #306230;
}

/* ── Status area ── */
.status-area {
  min-height: 20px;
  text-align: center;
}

.press-enter {
  font-size: clamp(6px, 1.5vw, 9px);
  color: #306230;
}

.status-msg {
  font-size: clamp(7px, 2vw, 11px);
}

.status-msg.success {
  color: #9bbc0f;
  text-shadow: 0 0 8px #8bac0f;
}

.status-msg.denied {
  color: #ff0000;
  text-shadow: 0 0 8px #ff000088;
}

/* ── Copyright ── */
.copyright {
  font-size: clamp(5px, 1.3vw, 8px);
  color: #306230;
  margin-top: 32px;
  text-align: center;
}

/* ── Blink animation ── */
.blink {
  animation: blink-anim 1.1s step-start infinite;
}

@keyframes blink-anim {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* ── Screen shake ── */
.shake {
  animation: shake-anim 0.55s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

@keyframes shake-anim {
  10%, 90%  { transform: translate3d(-3px, 0, 0); }
  20%, 80%  { transform: translate3d( 5px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-5px, 0, 0); }
  40%, 60%  { transform: translate3d( 5px, 0, 0); }
}

/* ── Flash effect ── */
.flash {
  animation: flash-anim 0.15s ease-out;
}

@keyframes flash-anim {
  0%   { background-color: #0f380f; }
  50%  { background-color: #9bbc0f; }
  100% { background-color: #0f380f; }
}

/* ── Mobile tweaks ── */
@media (max-width: 480px) {
  .main-content {
    padding: 0 16px;
  }
  .title {
    margin-bottom: 24px;
  }
}
</style>
