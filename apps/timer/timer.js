(() => {
  "use strict";

  const tabCountdown = document.getElementById("tab-countdown");
  const tabStopwatch = document.getElementById("tab-stopwatch");
  const countdownPanel = document.getElementById("countdown-panel");
  const stopwatchPanel = document.getElementById("stopwatch-panel");
  const cdMinutesInput = document.getElementById("cd-minutes");
  const cdSecondsInput = document.getElementById("cd-seconds");
  const cdDisplay = document.getElementById("cd-display");
  const cdStatus = document.getElementById("cd-status");
  const swDisplay = document.getElementById("sw-display");
  const btnToggle = document.getElementById("btn-toggle");
  const btnReset = document.getElementById("btn-reset");

  let mode = "countdown";

  const countdown = {
    totalMs: 0,
    remainingMs: 0,
    endTimestamp: null,
    running: false,
    finished: false,
  };

  const stopwatch = {
    elapsedMs: 0,
    startTimestamp: null,
    running: false,
  };

  let intervalId = null;
  let audioCtx = null;

  function readCountdownInputMs() {
    const minutes = Math.max(0, parseInt(cdMinutesInput.value, 10) || 0);
    const seconds = Math.max(0, parseInt(cdSecondsInput.value, 10) || 0);
    return (minutes * 60 + seconds) * 1000;
  }

  function getCountdownRemaining() {
    if (countdown.running) {
      return Math.max(0, countdown.endTimestamp - Date.now());
    }
    return countdown.remainingMs;
  }

  function getStopwatchElapsed() {
    if (stopwatch.running) {
      return stopwatch.elapsedMs + (Date.now() - stopwatch.startTimestamp);
    }
    return stopwatch.elapsedMs;
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function formatCountdown(ms) {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${pad(minutes)}:${pad(seconds)}`;
  }

  function formatStopwatch(ms) {
    const totalTenths = Math.floor(ms / 100);
    const tenths = totalTenths % 10;
    const totalSeconds = Math.floor(totalTenths / 10);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${pad(minutes)}:${pad(seconds)}.${tenths}`;
  }

  function startTick() {
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
    intervalId = setInterval(renderActive, 100);
  }

  function stopTick() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function renderActive() {
    if (mode === "countdown") {
      const remaining = getCountdownRemaining();
      cdDisplay.textContent = formatCountdown(remaining);
      if (remaining <= 0 && !countdown.finished) {
        onCountdownFinished();
      }
    } else {
      swDisplay.textContent = formatStopwatch(getStopwatchElapsed());
    }
  }

  function playBeep() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.4);
  }

  function setCountdownInputsDisabled(disabled) {
    cdMinutesInput.disabled = disabled;
    cdSecondsInput.disabled = disabled;
  }

  function onCountdownFinished() {
    countdown.finished = true;
    countdown.running = false;
    countdown.remainingMs = 0;
    countdown.endTimestamp = null;
    stopTick();
    setCountdownInputsDisabled(false);
    cdDisplay.textContent = formatCountdown(0);
    cdStatus.hidden = false;
    cdDisplay.classList.add("finished");
    playBeep();
    updateToggleButton();
  }

  function startCountdown() {
    if (countdown.finished) {
      // 완료 직후에는 "시작"을 눌러도 재시작하지 않는다. 먼저 리셋이 필요하다(사용법 안내 참고).
      return;
    }
    if (countdown.remainingMs <= 0) {
      countdown.totalMs = readCountdownInputMs();
      countdown.remainingMs = countdown.totalMs;
    }
    if (countdown.remainingMs <= 0) {
      return;
    }
    countdown.endTimestamp = Date.now() + countdown.remainingMs;
    countdown.running = true;
    countdown.finished = false;
    cdStatus.hidden = true;
    cdDisplay.classList.remove("finished");
    setCountdownInputsDisabled(true);
    startTick();
    renderActive();
  }

  function pauseCountdown() {
    countdown.remainingMs = getCountdownRemaining();
    countdown.running = false;
    countdown.endTimestamp = null;
    stopTick();
    // 입력 필드는 여기서 다시 활성화하지 않는다: 일시정지 중에도 remainingMs > 0인
    // 진행 중 세션이 남아 있는데, 여기서 활성화하면 사용자가 분/초를 바꿔도
    // (handleCountdownInputChange가 화면 미리보기만 갱신할 뿐 remainingMs/totalMs는
    // 그대로이므로) "다시 시작"을 누르는 순간 편집 이전의 남은 시간으로 되돌아가는
    // 표시-상태 불일치가 발생한다. 입력을 다시 여는 시점은 resetCountdown()/
    // onCountdownFinished()로 remainingMs가 실제로 0이 되는 때로 한정한다.
  }

  function resetCountdown() {
    countdown.running = false;
    countdown.endTimestamp = null;
    countdown.finished = false;
    countdown.remainingMs = 0;
    countdown.totalMs = 0;
    setCountdownInputsDisabled(false);
    cdStatus.hidden = true;
    cdDisplay.classList.remove("finished");
    stopTick();
    cdDisplay.textContent = formatCountdown(readCountdownInputMs());
  }

  function startStopwatch() {
    stopwatch.startTimestamp = Date.now();
    stopwatch.running = true;
    startTick();
    renderActive();
  }

  function pauseStopwatch() {
    stopwatch.elapsedMs = getStopwatchElapsed();
    stopwatch.running = false;
    stopwatch.startTimestamp = null;
    stopTick();
  }

  function resetStopwatch() {
    stopwatch.running = false;
    stopwatch.startTimestamp = null;
    stopwatch.elapsedMs = 0;
    stopTick();
    swDisplay.textContent = formatStopwatch(0);
  }

  function isRunning() {
    return mode === "countdown" ? countdown.running : stopwatch.running;
  }

  function updateToggleButton() {
    btnToggle.textContent = isRunning() ? "일시정지" : "시작";
  }

  function handleToggle() {
    if (mode === "countdown") {
      if (countdown.running) {
        pauseCountdown();
      } else {
        startCountdown();
      }
    } else {
      if (stopwatch.running) {
        pauseStopwatch();
      } else {
        startStopwatch();
      }
    }
    updateToggleButton();
  }

  function handleReset() {
    if (mode === "countdown") {
      resetCountdown();
    } else {
      resetStopwatch();
    }
    updateToggleButton();
  }

  function switchMode(newMode) {
    if (newMode === mode) {
      return;
    }
    if (mode === "countdown" && countdown.running) {
      pauseCountdown();
    } else if (mode === "stopwatch" && stopwatch.running) {
      pauseStopwatch();
    }

    mode = newMode;

    const isCountdown = mode === "countdown";
    tabCountdown.classList.toggle("active", isCountdown);
    tabCountdown.setAttribute("aria-selected", String(isCountdown));
    tabStopwatch.classList.toggle("active", !isCountdown);
    tabStopwatch.setAttribute("aria-selected", String(!isCountdown));
    countdownPanel.hidden = !isCountdown;
    stopwatchPanel.hidden = isCountdown;

    renderActive();
    updateToggleButton();
  }

  function handleCountdownInputChange() {
    if (!countdown.running) {
      cdDisplay.textContent = formatCountdown(readCountdownInputMs());
    }
  }

  tabCountdown.addEventListener("click", () => switchMode("countdown"));
  tabStopwatch.addEventListener("click", () => switchMode("stopwatch"));
  btnToggle.addEventListener("click", handleToggle);
  btnReset.addEventListener("click", handleReset);
  cdMinutesInput.addEventListener("input", handleCountdownInputChange);
  cdSecondsInput.addEventListener("input", handleCountdownInputChange);

  cdDisplay.textContent = formatCountdown(readCountdownInputMs());
  swDisplay.textContent = formatStopwatch(0);
  updateToggleButton();
})();
