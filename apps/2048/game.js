(() => {
  const SIZE = 4;
  const BEST_SCORE_KEY = "2048-best-score";

  const boardEl = document.getElementById("board");
  const scoreEl = document.getElementById("score");
  const bestScoreEl = document.getElementById("best-score");
  const restartBtn = document.getElementById("restart");
  const messageEl = document.getElementById("game-message");
  const messageTextEl = document.getElementById("game-message-text");
  const keepPlayingBtn = document.getElementById("keep-playing");
  const tryAgainBtn = document.getElementById("try-again");

  // localStorage 접근이 예외를 던지는 환경(일부 브라우저의 file:// 실행, 프라이빗 모드 등)에서도
  // 게임 자체는 계속 동작해야 하므로 읽기/쓰기를 안전하게 감싼다.
  function loadBestScore() {
    try {
      return Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
    } catch {
      return 0;
    }
  }

  function saveBestScore(value) {
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(value));
    } catch {
      // 저장 실패 시에도 게임 진행에는 영향 없음
    }
  }

  let board = createEmptyBoard();
  let score = 0;
  let bestScore = loadBestScore();
  let won = false;

  function createEmptyBoard() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  }

  function addRandomTile(b) {
    const empty = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (b[r][c] === 0) empty.push([r, c]);
      }
    }
    if (empty.length === 0) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    b[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  // 왼쪽으로 밀기 기준: 0 제거 → 인접 동일값 병합(1회) → 다시 0으로 채워 길이 4 유지
  function slideAndMergeLine(line) {
    let values = line.filter((v) => v !== 0);
    let gained = 0;
    for (let i = 0; i < values.length - 1; i++) {
      if (values[i] === values[i + 1]) {
        values[i] *= 2;
        gained += values[i];
        values.splice(i + 1, 1);
      }
    }
    while (values.length < SIZE) values.push(0);
    return { line: values, gained };
  }

  function boardsEqual(a, b) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (a[r][c] !== b[r][c]) return false;
      }
    }
    return true;
  }

  function cloneBoard(b) {
    return b.map((row) => row.slice());
  }

  // 행렬을 시계방향 90도 회전
  function rotateBoard(b) {
    const result = createEmptyBoard();
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        result[c][SIZE - 1 - r] = b[r][c];
      }
    }
    return result;
  }

  function move(direction) {
    const before = cloneBoard(board);
    // 모든 방향을 "왼쪽 이동"으로 정규화: up=3회, right=2회, down=1회 시계방향 회전 후 처리, 역회전
    const rotations = { left: 0, up: 3, right: 2, down: 1 }[direction];

    let working = board;
    for (let i = 0; i < rotations; i++) working = rotateBoard(working);

    let gainedTotal = 0;
    working = working.map((row) => {
      const { line, gained } = slideAndMergeLine(row);
      gainedTotal += gained;
      return line;
    });

    // 원래 방향으로 되돌리기 (반대 방향으로 회전)
    for (let i = 0; i < (4 - rotations) % 4; i++) working = rotateBoard(working);

    board = working;
    const moved = !boardsEqual(before, board);
    return { moved, gained: gainedTotal };
  }

  function isGameOver(b) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (b[r][c] === 0) return false;
        if (c < SIZE - 1 && b[r][c] === b[r][c + 1]) return false;
        if (r < SIZE - 1 && b[r][c] === b[r + 1][c]) return false;
      }
    }
    return true;
  }

  function hasWon(b) {
    return b.some((row) => row.some((v) => v >= 2048));
  }

  function restart() {
    board = createEmptyBoard();
    score = 0;
    won = false;
    addRandomTile(board);
    addRandomTile(board);
    hideMessage();
    render();
  }

  function updateBestScore() {
    if (score > bestScore) {
      bestScore = score;
      saveBestScore(bestScore);
    }
  }

  function showMessage(text, { showKeepPlaying }) {
    messageTextEl.textContent = text;
    keepPlayingBtn.hidden = !showKeepPlaying;
    messageEl.hidden = false;
  }

  function hideMessage() {
    messageEl.hidden = true;
  }

  function render() {
    boardEl.querySelectorAll(".tile").forEach((el) => el.remove());

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const value = board[r][c];
        if (value === 0) continue;
        const tile = document.createElement("div");
        tile.className = "tile";
        tile.dataset.value = String(value);
        tile.textContent = String(value);
        tile.style.gridColumn = String(c + 1);
        tile.style.gridRow = String(r + 1);
        boardEl.appendChild(tile);
      }
    }

    scoreEl.textContent = String(score);
    bestScoreEl.textContent = String(bestScore);
  }

  function handleMove(direction) {
    const { moved, gained } = move(direction);
    if (!moved) return;

    score += gained;
    updateBestScore();
    addRandomTile(board);
    render();

    if (!won && hasWon(board)) {
      won = true;
      showMessage("2048 달성!", { showKeepPlaying: true });
      return;
    }

    if (isGameOver(board)) {
      showMessage("게임 오버", { showKeepPlaying: false });
    }
  }

  const KEY_DIRECTIONS = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
  };

  document.addEventListener("keydown", (e) => {
    const direction = KEY_DIRECTIONS[e.key];
    if (!direction) return;
    e.preventDefault();
    if (!messageEl.hidden && keepPlayingBtn.hidden) return; // 게임 오버 시 입력 무시
    handleMove(direction);
  });

  let touchStartX = 0;
  let touchStartY = 0;
  const SWIPE_THRESHOLD = 24;

  boardEl.addEventListener("touchstart", (e) => {
    const touch = e.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });

  boardEl.addEventListener("touchend", (e) => {
    if (!messageEl.hidden && keepPlayingBtn.hidden) return; // 게임 오버 시 입력 무시
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;

    const direction = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? "right" : "left")
      : (dy > 0 ? "down" : "up");
    handleMove(direction);
  });

  restartBtn.addEventListener("click", restart);
  tryAgainBtn.addEventListener("click", restart);
  keepPlayingBtn.addEventListener("click", hideMessage);

  restart();
})();
