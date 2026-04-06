(function(){
  const screens = {
    start: document.getElementById('screen-start'),
    brief: document.getElementById('screen-brief'),
    game: document.getElementById('screen-game'),
    reveal: document.getElementById('screen-reveal'),
    compare: document.getElementById('screen-compare'),
    next: document.getElementById('screen-next'),
  };

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('screen--active'));
    if (screens[name]) screens[name].classList.add('screen--active');
  }

  const btnStart = document.getElementById('btn-start');
  const btnBriefBack = document.getElementById('btn-brief-back');
  const btnBeginPlay = document.getElementById('btn-begin-play');
  const btnFinishEarly = document.getElementById('btn-finish-early');
  const btnShowCompare = document.getElementById('btn-show-compare');
  const btnReplay = document.getElementById('btn-replay');
  const btnNext = document.getElementById('btn-next');
  const btnPlayAgain = document.getElementById('btn-play-again');

  const roomUser = document.getElementById('room-user');
  const roomUserFinal = document.getElementById('room-user-final');
  const roomSkapa = document.getElementById('room-skapa');
  const timerValue = document.getElementById('timer-value');
  const furnitureListEl = document.getElementById('furniture-list');

  const scoreEls = {
    space: document.getElementById('score-space'),
    function: document.getElementById('score-function'),
    comfort: document.getElementById('score-comfort'),
    time: document.getElementById('score-time'),
    total: document.getElementById('score-total'),
    skapa: document.getElementById('score-skapa'),
  };

  const insightsList = document.getElementById('skapa-insights');

  const feedbackText = document.getElementById('feedback-text');

  const GRID_COLS = 10;
  const GRID_ROWS = 8;

  const DOOR_AREA = { x: 4, y: 7, w: 2, h: 1 };
  const WINDOW_AREA = { x: 0, y: 2, w: 1, h: 3 };
  const CORRIDOR_COL_START = 4;
  const CORRIDOR_COL_END = 5;

  const furnitureConfig = [
    { id: 'sofaBed', name: 'Sofa bed', type: 'bed', w: 3, h: 2, label: 'Sleep + seating' },
    { id: 'desk', name: 'Compact desk', type: 'desk', w: 2, h: 1, label: 'Work' },
    { id: 'storage', name: 'Tall storage', type: 'storage', w: 1, h: 3, label: 'Storage' },
    { id: 'table', name: 'Foldable table', type: 'table', w: 2, h: 2, label: 'Dining + work' },
    { id: 'chair', name: 'Side chair', type: 'chair', w: 1, h: 1, label: 'Extra seating' },
    { id: 'lamp', name: 'Floor lamp', type: 'lamp', w: 1, h: 1, label: 'Light' },
  ];

  // Intentionally awkward starting layout: blocked window, table in centre, tight circulation
  const initialLayout = {
    sofaBed: { x: 2, y: 4 },     // partly in the middle of the room
    desk: { x: 6, y: 1 },        // away from window
    storage: { x: 0, y: 2 },     // blocking window
    table: { x: 4, y: 3 },       // in the centre, on main path
    chair: { x: 6, y: 4 },       // floating
    lamp: { x: 1, y: 6 },        // in a random corner
  };

  // SKAPA layout: clear central corridor from door, desk by window, storage on wall, table + chair zone, lamp near sofa
  const skapaLayout = {
    sofaBed: { x: 0, y: 4 },     // against left wall, sleep zone
    desk: { x: 1, y: 1 },        // near window for light
    storage: { x: 8, y: 1 },     // on right wall, not blocking anything
    table: { x: 5, y: 4 },       // compact dining/work zone off the main path
    chair: { x: 7, y: 4 },       // close to table for extra seating
    lamp: { x: 3, y: 4 },        // between sofa and table to light shared area
  };

  const state = {
    layout: {},
    timeRemaining: 60,
    timerId: null,
    startedAt: null,
  };

  function cloneLayout(layout) {
    const copy = {};
    Object.keys(layout).forEach(id => {
      copy[id] = { x: layout[id].x, y: layout[id].y };
    });
    return copy;
  }

  function resetGameState() {
    state.layout = cloneLayout(initialLayout);
    state.timeRemaining = 60;
    timerValue.textContent = String(state.timeRemaining);
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null;
    state.startedAt = null;
    btnFinishEarly.disabled = true;
  }

  function renderRoomBase(container) {
    container.innerHTML = '';
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      requestAnimationFrame(() => renderRoomBase(container));
      return;
    }

    const door = document.createElement('div');
    door.className = 'room-door';
    door.dataset.label = 'Door';
    const windowEl = document.createElement('div');
    windowEl.className = 'room-window';
    windowEl.dataset.label = 'Window';

    const cellW = rect.width / GRID_COLS;
    const cellH = rect.height / GRID_ROWS;

    door.style.left = DOOR_AREA.x * cellW + 'px';
    door.style.top = DOOR_AREA.y * cellH + 'px';
    door.style.width = DOOR_AREA.w * cellW + 'px';
    door.style.height = DOOR_AREA.h * cellH + 'px';

    windowEl.style.left = WINDOW_AREA.x * cellW + 'px';
    windowEl.style.top = WINDOW_AREA.y * cellH + 'px';
    windowEl.style.width = WINDOW_AREA.w * cellW + 'px';
    windowEl.style.height = WINDOW_AREA.h * cellH + 'px';

    container.appendChild(door);
    container.appendChild(windowEl);
  }

  function renderZonesForSkapa(container, cellW, cellH) {
    // Sleep zone (sofa bed area)
    const sleep = document.createElement('div');
    sleep.className = 'room-zone room-zone--sleep';
    sleep.style.left = (0 * cellW) + 'px';
    sleep.style.top = (4 * cellH) + 'px';
    sleep.style.width = (4 * cellW) + 'px';
    sleep.style.height = (4 * cellH) + 'px';
    sleep.innerHTML = '<span class="room-zone-label">Sleep</span>';
    container.appendChild(sleep);

    // Work zone (desk by window)
    const work = document.createElement('div');
    work.className = 'room-zone room-zone--work';
    work.style.left = (0 * cellW) + 'px';
    work.style.top = (0 * cellH) + 'px';
    work.style.width = (4 * cellW) + 'px';
    work.style.height = (3 * cellH) + 'px';
    work.innerHTML = '<span class="room-zone-label">Work</span>';
    container.appendChild(work);

    // Dine / multi-use zone
    const dine = document.createElement('div');
    dine.className = 'room-zone room-zone--dine';
    dine.style.left = (4 * cellW) + 'px';
    dine.style.top = (3 * cellH) + 'px';
    dine.style.width = (6 * cellW) + 'px';
    dine.style.height = (3 * cellH) + 'px';
    dine.innerHTML = '<span class="room-zone-label">Dine / work</span>';
    container.appendChild(dine);
  }

  function layoutToMap(layout) {
    const map = {};
    furnitureConfig.forEach(item => {
      const pos = layout[item.id];
      if (!pos) return;
      for (let dx = 0; dx < item.w; dx++) {
        for (let dy = 0; dy < item.h; dy++) {
          const key = `${pos.x + dx},${pos.y + dy}`;
          map[key] = item.id;
        }
      }
    });
    return map;
  }

  function isCellFree(layout, id, x, y) {
    const item = furnitureConfig.find(f => f.id === id);
    if (!item) return false;
    if (x < 0 || y < 0 || x + item.w > GRID_COLS || y + item.h > GRID_ROWS) return false;

    const map = layoutToMap(layout);
    for (let dx = 0; dx < item.w; dx++) {
      for (let dy = 0; dy < item.h; dy++) {
        const key = `${x + dx},${y + dy}`;
        if (map[key] && map[key] !== id) return false;
      }
    }
    return true;
  }

  function renderFurniture(container, layout, draggable) {
    renderRoomBase(container);
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      requestAnimationFrame(() => renderFurniture(container, layout, draggable));
      return;
    }

    const cellW = rect.width / GRID_COLS;
    const cellH = rect.height / GRID_ROWS;

    furnitureConfig.forEach(item => {
      const pos = layout[item.id];
      if (!pos) return;
      const el = document.createElement('div');
      el.className = `furniture-piece furniture-piece--${item.type}`;
      el.dataset.id = item.id;
      el.style.width = item.w * cellW + 'px';
      el.style.height = item.h * cellH + 'px';
      el.style.left = pos.x * cellW + 'px';
      el.style.top = pos.y * cellH + 'px';
      el.textContent = item.name;
      if (draggable) attachDragHandlers(el, container, item);
      container.appendChild(el);
    });
  }

  function renderFurnitureList() {
    furnitureListEl.innerHTML = '';
    furnitureConfig.forEach(item => {
      const li = document.createElement('li');
      li.className = 'furniture-list-item';
      const nameSpan = document.createElement('span');
      nameSpan.textContent = item.name;
      const tagSpan = document.createElement('span');
      tagSpan.className = 'furniture-list-tag';
      tagSpan.textContent = item.label;
      li.appendChild(nameSpan);
      li.appendChild(tagSpan);
      furnitureListEl.appendChild(li);
    });
  }

  function attachDragHandlers(el, container, itemConfig) {
    let startX = 0, startY = 0;
    let startOffsetX = 0, startOffsetY = 0;
    let isDragging = false;

    function onPointerDown(e) {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startOffsetX = elRect.left - rect.left;
      startOffsetY = elRect.top - rect.top;
      isDragging = true;
      el.classList.add('is-dragging');
      el.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      const rect = container.getBoundingClientRect();
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const xWithin = startOffsetX + dx;
      const yWithin = startOffsetY + dy;
      el.style.left = xWithin + 'px';
      el.style.top = yWithin + 'px';
    }

    function onPointerUp(e) {
      if (!isDragging) return;
      isDragging = false;
      el.classList.remove('is-dragging');
      el.releasePointerCapture(e.pointerId);

      const rect = container.getBoundingClientRect();
      const cellW = rect.width / GRID_COLS;
      const cellH = rect.height / GRID_ROWS;
      const elRect = el.getBoundingClientRect();
      const leftWithin = elRect.left - rect.left;
      const topWithin = elRect.top - rect.top;
      let gridX = Math.round(leftWithin / cellW);
      let gridY = Math.round(topWithin / cellH);

      if (isCellFree(state.layout, itemConfig.id, gridX, gridY)) {
        state.layout[itemConfig.id] = { x: gridX, y: gridY };
        el.style.left = gridX * cellW + 'px';
        el.style.top = gridY * cellH + 'px';
        el.classList.remove('is-invalid');
      } else {
        const prev = state.layout[itemConfig.id];
        el.style.left = prev.x * cellW + 'px';
        el.style.top = prev.y * cellH + 'px';
        el.classList.add('is-invalid');
        setTimeout(() => el.classList.remove('is-invalid'), 250);
      }
    }

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
  }

  function distanceBetweenLayouts(userLayout, targetLayout) {
    let distance = 0;
    furnitureConfig.forEach(item => {
      const u = userLayout[item.id];
      const t = targetLayout[item.id];
      if (!u || !t) return;
      distance += Math.abs(u.x - t.x) + Math.abs(u.y - t.y);
    });
    return distance;
  }

  function isDoorBlocked(layout) {
    const map = layoutToMap(layout);
    for (let x = DOOR_AREA.x; x < DOOR_AREA.x + DOOR_AREA.w; x++) {
      for (let y = DOOR_AREA.y; y < DOOR_AREA.y + DOOR_AREA.h; y++) {
        if (map[`${x},${y}`]) return true;
      }
    }
    return false;
  }

  function isWindowBlocked(layout) {
    const map = layoutToMap(layout);
    for (let x = WINDOW_AREA.x; x < WINDOW_AREA.x + WINDOW_AREA.w; x++) {
      for (let y = WINDOW_AREA.y; y < WINDOW_AREA.y + WINDOW_AREA.h; y++) {
        if (map[`${x},${y}`]) return true;
      }
    }
    return false;
  }

  function corridorBlockCount(layout) {
    const map = layoutToMap(layout);
    let count = 0;
    for (let x = CORRIDOR_COL_START; x <= CORRIDOR_COL_END; x++) {
      for (let y = 0; y < GRID_ROWS; y++) {
        const key = `${x},${y}`;
        if (map[key]) count++;
      }
    }
    return count;
  }

  function deskNearWindow(layout) {
    const deskPos = layout['desk'];
    if (!deskPos) return false;
    return deskPos.x <= 2 && deskPos.y >= 0 && deskPos.y <= 3;
  }

  function storageOnWall(layout) {
    const st = layout['storage'];
    if (!st) return false;
    return st.x === 0 || st.x + 1 === GRID_COLS; // width is 1
  }

  function chairNearTable(layout) {
    const tablePos = layout['table'];
    const chairPos = layout['chair'];
    if (!tablePos || !chairPos) return false;
    const dx = Math.abs(chairPos.x - tablePos.x);
    const dy = Math.abs(chairPos.y - tablePos.y);
    return dx <= 2 && dy <= 1;
  }

  function lampNearSofa(layout) {
    const lampPos = layout['lamp'];
    const sofaPos = layout['sofaBed'];
    if (!lampPos || !sofaPos) return false;
    const dx = Math.abs(lampPos.x - sofaPos.x);
    const dy = Math.abs(lampPos.y - sofaPos.y);
    return dx <= 2 && dy <= 1;
  }

  function evaluateLayout(layout, timeUsed) {
    const baseDistance = distanceBetweenLayouts(layout, skapaLayout);
    const maxDistance = 40;
    const closeness = Math.max(0, Math.min(1, 1 - baseDistance / maxDistance));

    const doorBlocked = isDoorBlocked(layout);
    const windowBlocked = isWindowBlocked(layout);
    const corridorBlocks = corridorBlockCount(layout);
    const maxCorridorCells = (CORRIDOR_COL_END - CORRIDOR_COL_START + 1) * GRID_ROWS;
    const corridorClearFactor = 1 - Math.min(1, corridorBlocks / maxCorridorCells);

    const deskByWindow = deskNearWindow(layout) ? 1 : 0;
    const storageWall = storageOnWall(layout) ? 1 : 0;
    const chairAtTable = chairNearTable(layout) ? 1 : 0;
    const lampAtSofa = lampNearSofa(layout) ? 1 : 0;

    // Space efficiency: free corridor + overall closeness to SKAPA
    let spaceScore = 10 + Math.round(corridorClearFactor * 12) + Math.round(closeness * 8);
    if (doorBlocked) spaceScore -= 5;
    spaceScore = Math.max(0, Math.min(30, spaceScore));

    // Functionality: smart relationships and not blocking key elements
    let functionScore = 10
      + (deskByWindow + storageWall + chairAtTable + lampAtSofa) * 3
      + Math.round(closeness * 10);
    if (doorBlocked) functionScore -= 8;
    if (windowBlocked) functionScore -= 4;
    functionScore = Math.max(0, Math.min(30, functionScore));

    // Comfort & flow: walking paths + light
    let comfortScore = 8 + Math.round(corridorClearFactor * 8);
    if (!doorBlocked) comfortScore += 4;
    if (!windowBlocked) comfortScore += 2;
    comfortScore = Math.max(0, Math.min(20, comfortScore));

    const t = Math.min(60, Math.max(1, timeUsed));
    const timeScore = Math.round((1 - t / 60) * 20);

    const total = Math.max(0, Math.min(100, spaceScore + functionScore + comfortScore + timeScore));

    return {
      spaceScore,
      functionScore,
      comfortScore,
      timeScore,
      total,
      doorBlocked,
      windowBlocked,
      corridorBlocks,
      deskByWindow,
      storageWall,
      chairAtTable,
      lampAtSofa,
    };
  }

  function evaluateSkapa() {
    const ideal = evaluateLayout(skapaLayout, 10);
    const bump = 95 - ideal.total;
    ideal.total = Math.min(100, ideal.total + bump);
    ideal.spaceScore = Math.min(30, ideal.spaceScore + Math.round(bump * 0.4));
    ideal.functionScore = Math.min(30, ideal.functionScore + Math.round(bump * 0.35));
    ideal.comfortScore = Math.min(20, ideal.comfortScore + Math.round(bump * 0.25));
    return ideal;
  }

  function describeImprovements(userMetrics, skapaMetrics) {
    const improvements = [];

    if (userMetrics.doorBlocked && !skapaMetrics.doorBlocked) {
      improvements.push('kept the entry path clear so you can move in and out easily');
    }
    if (userMetrics.windowBlocked && !skapaMetrics.windowBlocked) {
      improvements.push('freed up the window to bring more natural light into the room');
    }
    if (userMetrics.corridorBlocks > skapaMetrics.corridorBlocks) {
      improvements.push('opened a central walkway through the room');
    }
    if (!userMetrics.deskByWindow && skapaMetrics.deskByWindow) {
      improvements.push('moved the desk closer to the window for a brighter workspace');
    }
    if (!userMetrics.storageWall && skapaMetrics.storageWall) {
      improvements.push('pushed storage onto the wall to reduce visual clutter');
    }
    if (!userMetrics.chairAtTable && skapaMetrics.chairAtTable) {
      improvements.push('grouped the chair with the table to create a clearer dining/work zone');
    }
    if (!userMetrics.lampAtSofa && skapaMetrics.lampAtSofa) {
      improvements.push('placed lighting near the sofa so the main seating area feels more inviting');
    }

    if (!improvements.length) {
      if (insightsList) insightsList.innerHTML = '';
      return '';
    }

    if (insightsList) {
      insightsList.innerHTML = '';
      improvements.forEach(text => {
        const li = document.createElement('li');
        li.textContent = 'SKAPA ' + text;
        insightsList.appendChild(li);
      });
    }

    const top = improvements.slice(0, 2);
    if (top.length === 1) {
      return ` SKAPA also ${top[0]}.`;
    }
    return ` SKAPA also ${top[0]} and ${top[1]}.`;
  }

  function updateScores(userMetrics, skapaMetrics) {
    scoreEls.space.textContent = `${userMetrics.spaceScore} / 30`;
    scoreEls.function.textContent = `${userMetrics.functionScore} / 30`;
    scoreEls.comfort.textContent = `${userMetrics.comfortScore} / 20`;
    scoreEls.time.textContent = `${userMetrics.timeScore} / 20`;
    scoreEls.total.textContent = `${userMetrics.total} / 100`;
    scoreEls.skapa.textContent = `${skapaMetrics.total} / 100`;

    let msg;
    if (userMetrics.total >= skapaMetrics.total - 5) {
      msg = "Great job — you’re very close to SKAPA’s layout. SKAPA still squeezes a bit more out of the room by sharpening circulation and storage.";
    } else if (userMetrics.total >= 60) {
      msg = "You made strong improvements to the room, but SKAPA unlocked more usable floor space and a clearer separation between sleeping, working and dining.";
    } else if (userMetrics.total >= 40) {
      msg = "You improved on the initial layout, but SKAPA creates a noticeably more open room with better walking flow and light.";
    } else {
      msg = "Small spaces are tough. SKAPA significantly opens up the room while still keeping all key functions in place.";
    }

    msg += ` Your design scored ${userMetrics.total}. SKAPA scored ${skapaMetrics.total}.`;
    msg += describeImprovements(userMetrics, skapaMetrics);

    feedbackText.textContent = msg;
  }

  function startTimer() {
    state.startedAt = Date.now();
    state.timeRemaining = 60;
    timerValue.textContent = String(state.timeRemaining);
    btnFinishEarly.disabled = true;
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
      const remaining = Math.max(0, 60 - elapsed);
      state.timeRemaining = remaining;
      timerValue.textContent = String(remaining);
      if (elapsed > 5) btnFinishEarly.disabled = false;
      if (remaining <= 0) {
        clearInterval(state.timerId);
        state.timerId = null;
        onTimerEnd();
      }
    }, 250);
  }

  function onTimerEnd() {
    showScreen('reveal');
  }

  btnStart?.addEventListener('click', () => {
    resetGameState();
    showScreen('brief');
    const previewGrid = screens.brief.querySelector('.room-grid--preview');
    if (previewGrid) {
      requestAnimationFrame(() => renderFurniture(previewGrid, initialLayout, false));
    }
  });

  btnBriefBack?.addEventListener('click', () => {
    showScreen('start');
  });

  btnBeginPlay?.addEventListener('click', () => {
    resetGameState();
    renderFurnitureList();
    showScreen('game');
    requestAnimationFrame(() => {
      renderFurniture(roomUser, state.layout, true);
    });
    window.addEventListener('resize', () => renderFurniture(roomUser, state.layout, true));
    startTimer();
  });

  btnFinishEarly?.addEventListener('click', () => {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
    showScreen('reveal');
  });

  btnShowCompare?.addEventListener('click', () => {
    showScreen('compare');
    requestAnimationFrame(() => {
      renderFurniture(roomUserFinal, state.layout, false);
      renderFurniture(roomSkapa, skapaLayout, false);
    });

    const timeUsed = state.startedAt ? Math.max(1, Math.floor((Date.now() - state.startedAt) / 1000)) : 60;
    const userMetrics = evaluateLayout(state.layout, timeUsed);
    const skapaMetrics = evaluateSkapa();

    updateScores(userMetrics, skapaMetrics);
  });

  btnReplay?.addEventListener('click', () => {
    resetGameState();
    renderFurnitureList();
    showScreen('game');
    requestAnimationFrame(() => {
      renderFurniture(roomUser, state.layout, true);
    });
    startTimer();
  });

  btnNext?.addEventListener('click', () => {
    showScreen('next');
  });

  btnPlayAgain?.addEventListener('click', () => {
    resetGameState();
    showScreen('start');
  });

  const themeToggle = document.querySelector('[data-theme-toggle]');
  const rootEl = document.documentElement;
  let theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  rootEl.setAttribute('data-theme', theme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      rootEl.setAttribute('data-theme', theme);
      themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
  }
})();
