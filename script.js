/**
 * With You - Main Logic
 */

// --- CONFIG & STATE ---
const STORAGE_KEY = 'sweet_you_data';

let state = {
    settings: {
        theme: 'theme-light',
        nickname: '지윤',
        isRemindEnabled: false,
        remindInterval: 30,
        remindMessages: [],
        sounds: {
            start: '차임',
            end: '차임',
            popup: '뽁'
        }
    },
    currentProfileIndex: 0,
    profiles: [
        {
            name: '지윤',
            image: '', 
            msgIdle: ['우리 같이 집중해 볼까요?'],
            msgStart: ['오늘도 집중해서 잘해보자!'],
            msgEnd: ['고생했어! 이제 나랑 푹 쉬자~'],
            msgClear: ['전부 다 해내다니, 역시 대단해!']
        }
    ],
    tasks: [],
    activeCategory: 'Work'
};

let previewAudio = new Audio();
const buttonAudio = new Audio('sound/버튼.mp3');

function playCustomSound(type) {
    if (!state.settings.sounds) return;
    const soundName = state.settings.sounds[type];
    if (soundName && soundName !== 'none') {
        const audio = new Audio(`sound/${soundName}.mp3`);
        audio.play().catch(e => console.warn("Audio play failed:", e));
    }
}

// Mode Constants
const MODES = {
    POMODORO: 'pomodoro',
    TIMER: 'timer',
    STOPWATCH: 'stopwatch'
};

const POMODORO_TIMES = {
    focus: 25 * 60,
    break: 5 * 60,
    longBreak: 15 * 60
};

// Global Timer Engine State
let currentMode = MODES.TIMER;
let timerInterval = null;
let isTimerRunning = false;
let isTimerPaused = false;

// 🔥 리마인드 알림용 변수
let remindCounter = 0; 
let toastTimeout = null; // 자동 닫힘 타이머를 관리할 변수

// Mode Internal States
let pomodoroState = {
    seconds: POMODORO_TIMES.focus,
    initialSeconds: POMODORO_TIMES.focus,
    phase: 'focus',
    session: 1
};

let timerState = {
    seconds: 30 * 60,
    initialSeconds: 30 * 60
};

let stopwatchState = {
    seconds: 0,
    laps: []
};

// --- INITIALIZATION ---
function init() {
    loadState();
    
    // Ensure state structure is intact
    if (!state.settings) state.settings = {};
    if (!state.profiles || state.profiles.length === 0) {
        state.profiles = [{
            name: '지윤',
            image: '', 
            msgIdle: ['우리 같이 집중해 볼까요? 💙'],
            msgStart: ['오늘도 집중해서 잘해보자!'],
            msgEnd: ['고생했어! 이제 나랑 푹 쉬자 💙'],
            msgClear: ['전부 다 해내다니, 역시 대단해!'],
            remindMessages: []
        }];
    }
    if (state.currentProfileIndex >= state.profiles.length) state.currentProfileIndex = 0;
    
    // Migration check
    state.profiles.forEach(p => {
        if (typeof p.msgIdle === 'string') p.msgIdle = [p.msgIdle];
        if (!p.msgIdle) p.msgIdle = ['우리 같이 집중해 볼까요? 💙'];
        if (typeof p.msgStart === 'string') p.msgStart = [p.msgStart];
        if (typeof p.msgEnd === 'string') p.msgEnd = [p.msgEnd];
        if (typeof p.msgClear === 'string') p.msgClear = [p.msgClear];
        if (!p.remindMessages) p.remindMessages = [];
    });

    if (state.settings.isRemindEnabled === undefined) state.settings.isRemindEnabled = false;
    if (state.settings.remindInterval === undefined) state.settings.remindInterval = 30;
    if (!state.settings.remindMessages) state.settings.remindMessages = [];
    if (!state.settings.sounds) state.settings.sounds = { start: '차임', end: '차임', popup: '뽁' };

    applyTheme(state.settings.theme);
    renderAll();
    setupEventListeners();
}

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        state = JSON.parse(saved);
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// --- NAVIGATION & THEME ---
window.showPage = function(pageId) {
    console.log('Changing page to:', pageId);
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('page--active'));
    
    const target = document.getElementById(pageId);
    if (target) {
        target.classList.add('page--active');
        window.scrollTo(0, 0);
    } else {
        console.error('Page element not found:', pageId);
    }
};

function applyTheme(themeClass) {
    document.body.className = '';
    document.body.classList.add(themeClass);
}

// Helper: Get random message
function getRandomMessage(profile, type) {
    const messages = profile[type] || [];
    const validMessages = messages.filter(m => m.trim() !== '');
    if (validMessages.length === 0) {
        if (type === 'msgIdle') return '우리 같이 집중해 볼까요? 💙';
        if (type === 'msgStart') return '오늘도 집중해서 잘해보자!';
        if (type === 'msgEnd') return '고생했어! 이제 나랑 푹 쉬자 💙';
        if (type === 'msgClear') return '전부 다 해내다니, 역시 대단해!';
        return '화이팅! 💙';
    }
    const idx = Math.floor(Math.random() * validMessages.length);
    return validMessages[idx];
}

function formatMessage(nickname, message) {
    if (!nickname) nickname = '사용자';
    const hasExclamation = message.endsWith('!');
    const nickWithSymbol = hasExclamation ? `${nickname}!` : nickname;
    
    const formats = [
        hasExclamation ? `${nickWithSymbol} ${message}` : `${nickWithSymbol}, ${message}`, 
        `${message} ${nickWithSymbol}`, 
        `${message}`                    
    ];
    return formats[Math.floor(Math.random() * formats.length)];
}

// --- RENDERERS ---
function renderAll() {
    renderGreeting();
    renderProfileAvatar();
    renderTimer();
    renderChecklist();
    renderProfileGrid();
    renderSettings();
}

function renderGreeting() {
    const greetingText = document.getElementById('greeting-text');
    const nickname = state.settings.nickname || '사용자';
    const profile = state.profiles[state.currentProfileIndex] || state.profiles[0];
    const idleMsg = getRandomMessage(profile, 'msgIdle');
    greetingText.textContent = formatMessage(nickname, idleMsg);
}

function renderProfileAvatar() {
    const profile = state.profiles[state.currentProfileIndex] || state.profiles[0];
    const mainImg = document.getElementById('main-profile-img');
    mainImg.src = profile.image ? profile.image : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23eee'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%23999'%3EProfile%3C/text%3E%3C/svg%3E";
}

function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateProgressBar(percent) {
    const bar = document.getElementById('timer-bar-fill');
    if (bar) bar.style.width = `${percent}%`;
}

function renderTimer() {
    const timeDisplayMin = document.getElementById('timer-time-min');
    const timeDisplaySec = document.getElementById('timer-time-sec');
    const container = document.getElementById('timer-container');
    const lapContainer = document.getElementById('lap-container');
    const lapButton = document.getElementById('timer-lap');

    lapContainer.style.display = 'none';
    lapButton.style.display = 'none';
    container.classList.remove('timer__container--focus', 'timer__container--break', 'timer__container--long-break');

    let currentSeconds = 0;
    let percent = 0;

    if (currentMode === MODES.POMODORO) {
        currentSeconds = pomodoroState.seconds;
        percent = ((pomodoroState.initialSeconds - pomodoroState.seconds) / pomodoroState.initialSeconds) * 100;
        container.classList.add(`timer__container--${pomodoroState.phase === 'longBreak' ? 'long-break' : pomodoroState.phase}`);
    } 
    else if (currentMode === MODES.TIMER) {
        currentSeconds = timerState.seconds;
        percent = ((timerState.initialSeconds - timerState.seconds) / timerState.initialSeconds) * 100;
    } 
    else if (currentMode === MODES.STOPWATCH) {
        lapContainer.style.display = 'block';
        lapButton.style.display = (isTimerRunning && !isTimerPaused) ? 'inline-block' : 'none';
        currentSeconds = stopwatchState.seconds;
        percent = 100;
        renderLaps();
    }

    if (timeDisplayMin && timeDisplaySec) {
        const m = Math.floor(currentSeconds / 60);
        const s = currentSeconds % 60;
        timeDisplayMin.textContent = String(m).padStart(2, '0');
        timeDisplaySec.textContent = String(s).padStart(2, '0');
    }
    updateProgressBar(percent);

    const startBtn = document.getElementById('timer-start');
    const pauseBtn = document.getElementById('timer-pause');
    
    if (isTimerRunning) {
        startBtn.style.display = 'none';
        pauseBtn.style.display = 'inline-block';
        const isResume = isTimerPaused;
        pauseBtn.textContent = isResume ? '재시작' : '일시정지';
        pauseBtn.classList.toggle('timer__button--resume', isResume);
    } else {
        startBtn.style.display = 'inline-block';
        pauseBtn.style.display = 'none';
        startBtn.textContent = '시작';
        pauseBtn.classList.remove('timer__button--resume');
    }
}

function renderLaps() {
    const lapList = document.getElementById('lap-list');
    lapList.innerHTML = '';
    stopwatchState.laps.slice().reverse().forEach((lap, idx) => {
        const li = document.createElement('li');
        li.className = 'timer__lap-item';
        li.innerHTML = `<span class="timer__lap-rank">#${stopwatchState.laps.length - idx}</span><span class="timer__lap-time">${formatTime(lap)}</span>`;
        lapList.appendChild(li);
    });
}

// --- TIMER ENGINE ---
function handleTick() {
    if (currentMode === MODES.POMODORO) {
        pomodoroState.seconds--;
        if (pomodoroState.seconds <= 0) handlePomodoroEnd();
    } 
    else if (currentMode === MODES.TIMER) {
        timerState.seconds--;
        if (timerState.seconds <= 0) handleTimerEnd();
    } 
    else if (currentMode === MODES.STOPWATCH) {
        stopwatchState.seconds++;
    }
    
    // 🔥 리마인드 알림 로직 (모든 모드에서 작동하도록 변경)
    if (state.settings.isRemindEnabled) {
        remindCounter++;
        const intervalInSeconds = (state.settings.remindInterval || 30) * 60;
        if (remindCounter >= intervalInSeconds) {
            remindCounter = 0;
            showRemindModal();
        }
    }

    renderTimer();
}

function handlePomodoroEnd() {
    stopEngine();
    if (pomodoroState.phase === 'focus') {
        if (pomodoroState.session < 4) {
            pomodoroState.phase = 'break';
            pomodoroState.seconds = POMODORO_TIMES.break;
        } else {
            pomodoroState.phase = 'longBreak';
            pomodoroState.seconds = POMODORO_TIMES.longBreak;
        }
    } else {
        if (pomodoroState.phase === 'longBreak') pomodoroState.session = 1;
        else pomodoroState.session++;
        pomodoroState.phase = 'focus';
        pomodoroState.seconds = POMODORO_TIMES.focus;
    }
    pomodoroState.initialSeconds = pomodoroState.seconds;
    showFinishModal();
    setTimeout(() => startEngine(), 1500);
}

function handleTimerEnd() {
    stopEngine();
    showFinishModal();
}

function showFinishModal() {
    playCustomSound('end');
    const profile = state.profiles[state.currentProfileIndex] || state.profiles[0];
    const nickname = state.settings.nickname || '사용자';
    let msg = getRandomMessage(profile, 'msgEnd');
    
    if (currentMode === MODES.POMODORO) {
        if (pomodoroState.phase !== 'focus') msg = '쉬는 시간이에요! ☕';
    } else if (currentMode === MODES.TIMER) {
        msg = '타이머가 종료되었습니다! 🔔';
    }

    document.getElementById('finish-message').textContent = formatMessage(nickname, msg);
    document.getElementById('modal-overlay').style.display = 'grid';
    document.getElementById('profile-modal').style.display = 'none';
    document.getElementById('finish-modal').style.display = 'block';
}

// 🔥 최애 프로필 상단 말풍선 리마인드 모달 표시 (자동 닫힘 로직 포함)
function showRemindModal() {
    playCustomSound('popup');
    const profile = state.profiles[state.currentProfileIndex] || state.profiles[0];
    const nickname = profile.name || state.settings.nickname || '최애';
    
    let msg = '';
    const validRemindMsgs = (profile.remindMessages || []).filter(m => m.trim() !== '');
    if (validRemindMsgs.length > 0) {
        msg = validRemindMsgs[Math.floor(Math.random() * validRemindMsgs.length)];
    } else {
        msg = '우리 같이 힘내볼까요? 💙'; // 기본 메시지
    }

    document.getElementById('remind-bubble-text').textContent = `🗨️ ${nickname} : ${msg}`;
    const bubble = document.getElementById('remind-bubble');
    bubble.classList.add('remind-bubble--active');

    // 10초 뒤 자동 닫힘 및 타이머 꼬임 방지
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        closeRemindBubble();
    }, 10000);
}

// 🔥 수동 닫기 버튼용 함수
function closeRemindBubble() {
    document.getElementById('remind-bubble').classList.remove('remind-bubble--active');
    if (toastTimeout) clearTimeout(toastTimeout);
}

function startEngine() {
    if (isTimerRunning && !isTimerPaused) return;
    if (currentMode === MODES.TIMER && timerState.seconds <= 0) {
        alert('시간을 먼저 설정해주세요.');
        return;
    }

    // 완전히 처음 시작할 때만 알림 카운터와 환영 대사 리셋
    if (!isTimerPaused) {
        remindCounter = 0; // 🔥 카운터 꼬임 방지
        const profile = state.profiles[state.currentProfileIndex] || state.profiles[0];
        const nickname = state.settings.nickname || '사용자';
        const msg = getRandomMessage(profile, 'msgStart');
        document.getElementById('greeting-text').textContent = formatMessage(nickname, msg);
        playCustomSound('start');
    }

    isTimerRunning = true;
    isTimerPaused = false;
    timerInterval = setInterval(handleTick, 1000);
    renderTimer();
}

function stopEngine() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    isTimerPaused = false;
    renderTimer();
}

function pauseEngine() {
    buttonAudio.currentTime = 0;
    buttonAudio.play().catch(error => console.log('Audio playback error:', error));

    if (isTimerPaused) {
        startEngine();
    } else {
        clearInterval(timerInterval);
        isTimerPaused = true;
        renderTimer();
    }
}

function resetEngine() {
    stopEngine();
    remindCounter = 0; // 🔥 카운터 꼬임 방지
    
    if (currentMode === MODES.POMODORO) {
        pomodoroState = { seconds: POMODORO_TIMES.focus, initialSeconds: POMODORO_TIMES.focus, phase: 'focus', session: 1 };
    } 
    else if (currentMode === MODES.TIMER) {
        timerState.seconds = timerState.initialSeconds;
    } 
    else if (currentMode === MODES.STOPWATCH) {
        stopwatchState.seconds = 0;
        stopwatchState.laps = [];
    }
    renderTimer();
}

function handleLap() {
    if (currentMode === MODES.STOPWATCH) {
        stopwatchState.laps.push(stopwatchState.seconds);
        renderTimer();
    }
}

function setMode(mode) {
    if (currentMode === mode) {
        return;
    }
    stopEngine();
    remindCounter = 0; // 🔥 카운터 꼬임 방지
    currentMode = mode;
    
    document.querySelectorAll('.timer__mode-button').forEach(btn => {
        btn.classList.toggle('timer__mode-button--active', btn.dataset.mode === mode);
    });
    
    if (mode === MODES.TIMER) {
        // Defaults to existing timerState, prompts removed
    }
    renderTimer();
}

// --- CHECKLIST & PROFILES ---
function renderChecklist() {
    const todoList = document.getElementById('todo-list');
    todoList.innerHTML = '';
    
    const categoryEmojiMap = {
        Work: '💻',
        Study: '✏️',
        Reading: '📖',
        Exercise: '🏋️',
        Rest: '☕',
        Game: '🕹️',
        Etc: '☑️'
    };

    const filteredTasks = state.tasks.filter(t => {
        if (state.activeCategory === 'All') return true;
        return t.category === state.activeCategory;
    });

    filteredTasks.forEach((task) => {
        const li = document.createElement('li');
        li.className = `todo__item ${task.completed ? 'todo__item--completed' : ''}`;
        
        const categoryIcon = state.activeCategory === 'All' 
            ? `<span class="todo__category-icon">${categoryEmojiMap[task.category] || ''}</span>`
            : '';

        li.innerHTML = `
            <div class="todo__item-checkbox ${task.completed ? 'todo__item-checkbox--checked' : ''}" data-id="${task.id}"></div>
            <span class="todo__item-text">${categoryIcon}${task.text}</span>
            <button class="todo__item-delete" data-id="${task.id}" style="color:red; font-size: 0.8rem; margin-left: auto; cursor:pointer;">삭제</button>
        `;
        todoList.appendChild(li);
    });
}

function renderProfileGrid() {
    const grid = document.getElementById('profile-grid');
    grid.innerHTML = '';
    
    state.profiles.forEach((profile, idx) => {
        const card = document.createElement('div');
        card.className = `profile__card ${state.currentProfileIndex === idx ? 'profile__card--active' : ''}`;
        const imgUrl = profile.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23eee'/%3E%3C/svg%3E";
        card.innerHTML = `
            <div class="profile__card-img"><img src="${imgUrl}"></div>
            <div class="profile__card-name">${profile.name}</div>
            <div class="profile__card-actions">
                <button class="profile__card-edit-button" data-index="${idx}">수정하기</button>
                <button class="profile__card-delete-button" data-index="${idx}">삭제하기</button>
            </div>
        `;
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('profile__card-edit-button') || e.target.classList.contains('profile__card-delete-button')) return;
            state.currentProfileIndex = idx;
            saveState();
            renderAll();
        });
        grid.appendChild(card);
    });

    const addCard = document.createElement('div');
    addCard.className = 'profile__card profile__card--add';
    addCard.innerHTML = `<div class="profile__card-add-icon">+</div><div class="profile__card-name">새 프로필 추가하기</div>`;
    addCard.onclick = () => openProfileModal(-1);
    grid.appendChild(addCard);
    document.getElementById('profile-count').textContent = state.profiles.length;
}

// --- SETTINGS ---
function renderSettings() {
    document.getElementById('settings-nickname').value = state.settings.nickname;
    const radio = document.querySelector(`input[name="theme"][value="${state.settings.theme}"]`);
    if (radio) radio.checked = true;

    // Reminder settings
    const remindToggle = document.getElementById('settings-remind-toggle');
    remindToggle.checked = !!state.settings.isRemindEnabled;
    document.getElementById('remind-interval-area').style.display = remindToggle.checked ? 'block' : 'none';
    
    const interval = state.settings.remindInterval || 30;
    const intervalRadio = document.querySelector(`input[name="remind-interval"][value="${interval}"]`);
    if (intervalRadio) {
        intervalRadio.checked = true;
        document.getElementById('custom-interval-input-area').style.display = 'none';
    } else {
        document.querySelector('input[name="remind-interval"][value="custom"]').checked = true;
        document.getElementById('custom-interval-input-area').style.display = 'block';
        document.getElementById('settings-remind-custom').value = interval;
    }

    // Reminder messages are now per-profile
}

// --- MODALS ---
function openProfileModal(index) {
    document.getElementById('modal-overlay').style.display = 'grid';
    document.getElementById('profile-modal').style.display = 'block';
    document.getElementById('finish-modal').style.display = 'none';

    const isNew = index === -1;
    const profile = isNew ? { name: '', image: '', msgIdle: [], msgStart: [], msgEnd: [], msgClear: [], remindMessages: [] } : state.profiles[index];
    
    document.getElementById('profile-edit-name').value = profile.name;
    document.getElementById('profile-edit-preview').src = profile.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23eee'/%3E%3C/svg%3E";
    
    renderMessageSlots('idle', profile.msgIdle || []);
    renderMessageSlots('start', profile.msgStart || []);
    renderMessageSlots('end', profile.msgEnd || []);
    renderMessageSlots('clear', profile.msgClear || []);
    renderMessageSlots('remind', profile.remindMessages || []);
    
    document.getElementById('profile-save').onclick = () => saveProfile(index);
}

function renderMessageSlots(category, messages) {
    const container = document.getElementById(`msg-${category}-list`);
    container.innerHTML = '';
    const list = messages.length > 0 ? messages : [''];
    list.forEach(msg => createMessageBox(container, msg));
}

function createMessageBox(container, value = '') {
    const div = document.createElement('div');
    div.className = 'form__input-container';
    div.style.marginBottom = '4px';
    div.innerHTML = `
        <div class="form__input-item">
            <input type="text" class="form__input" value="${value}" maxlength="30" placeholder="(최대 30자 작성)" oninput="checkInputLimit(this)">
            <button type="button" class="button--remove-msg" onclick="this.closest('.form__input-container').remove()">×</button>
        </div>
        <div class="form__input-limit-text" style="display:none;">더 이상 입력할 수 없습니다. (30자 제한)</div>
    `;
    container.appendChild(div);
    if (value.length >= 30) checkInputLimit(div.querySelector('.form__input'));
}

function checkInputLimit(el) {
    const warning = el.closest('.form__input-container').querySelector('.form__input-limit-text');
    if (el.value.length >= 30) {
        el.classList.add('form__input--limit');
        warning.style.display = 'block';
    } else {
        el.classList.remove('form__input--limit');
        warning.style.display = 'none';
    }
}

function addMessageSlot(category) {
    const container = document.getElementById(`msg-${category}-list`);
    if (container.children.length >= 10) return alert('최대 10개까지 등록 가능합니다.');
    createMessageBox(container);
}

function saveProfile(index) {
    const name = document.getElementById('profile-edit-name').value;
    const img = document.getElementById('profile-edit-preview').src;
    if (!name) return alert('이름을 입력해주세요!');

    const getMessages = (cat) => {
        const inputs = document.querySelectorAll(`#msg-${cat}-list .form__input`);
        const arr = [];
        inputs.forEach(input => { if (input.value.trim()) arr.push(input.value.trim()); });
        return arr;
    };

    const profileData = { 
        name, 
        image: img.startsWith('data:') ? img : '', 
        msgIdle: getMessages('idle'),
        msgStart: getMessages('start'),
        msgEnd: getMessages('end'),
        msgClear: getMessages('clear'),
        remindMessages: getMessages('remind')
    };

    if (index === -1) state.profiles.push(profileData);
    else state.profiles[index] = profileData;

    saveState();
    renderAll();
    closeModals();
}

function closeModals() {
    document.getElementById('modal-overlay').style.display = 'none';
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    // Standard listeners are maintained for redundancy, 
    // but index.html now uses global showPage directly for GNB to avoid any capture issue.
    const navProfiles = document.getElementById('nav-profiles');
    if (navProfiles) navProfiles.onclick = () => window.showPage('page-profiles');
    
    const navSettings = document.getElementById('nav-settings');
    if (navSettings) {
        navSettings.onclick = () => {
            window.showPage('page-settings');
            if (state.settings.sounds) {
                const sStart = document.querySelector(`input[name="sound-start"][value="${state.settings.sounds.start}"]`);
                if (sStart) sStart.checked = true;
                const sEnd = document.querySelector(`input[name="sound-end"][value="${state.settings.sounds.end}"]`);
                if (sEnd) sEnd.checked = true;
                const sPopup = document.querySelector(`input[name="sound-popup"][value="${state.settings.sounds.popup}"]`);
                if (sPopup) sPopup.checked = true;
            }
        };
    }
    
    const navMain = document.getElementById('nav-main');
    if (navMain) navMain.onclick = () => window.showPage('page-timer');
    
    document.getElementById('timer-start').onclick = startEngine;
    document.getElementById('timer-pause').onclick = pauseEngine;
    document.getElementById('timer-reset').onclick = resetEngine;
    document.getElementById('timer-lap').onclick = handleLap;

    document.querySelectorAll('.timer__mode-button').forEach(btn => {
        btn.onclick = () => setMode(btn.dataset.mode);
    });

    document.querySelectorAll('.category__button').forEach(btn => {
        btn.onclick = () => {
            state.activeCategory = btn.dataset.category;
            document.querySelectorAll('.category__button').forEach(b => b.classList.remove('category__button--active'));
            btn.classList.add('category__button--active');
            renderChecklist();
        };
    });

    document.getElementById('todo-add').onclick = () => {
        const input = document.getElementById('todo-input');
        if (!input.value.trim()) return;
        state.tasks.push({ id: Date.now(), text: input.value.trim(), category: state.activeCategory, completed: false });
        input.value = '';
        saveState();
        renderChecklist();
    };

    document.getElementById('todo-list').onclick = (e) => {
        const id = e.target.dataset.id;
        if (!id) return;
        if (e.target.classList.contains('todo__item-checkbox')) {
            const task = state.tasks.find(t => t.id == id);
            if (task) {
                task.completed = !task.completed;
                const filtered = state.tasks.filter(t => t.category === state.activeCategory);
                if (filtered.length > 0 && filtered.every(t => t.completed)) {
                    const profile = state.profiles[state.currentProfileIndex] || state.profiles[0];
                    const nickname = state.settings.nickname || '사용자';
                    document.getElementById('greeting-text').textContent = formatMessage(nickname, getRandomMessage(profile, 'msgClear'));
                }
            }
        } else if (e.target.classList.contains('todo__item-delete')) {
            state.tasks = state.tasks.filter(t => t.id != id);
        }
        saveState();
        renderChecklist();
    };

    document.getElementById('profile-grid').onclick = (e) => {
        const index = parseInt(e.target.dataset.index);
        if (e.target.classList.contains('profile__card-edit-button')) {
            openProfileModal(index);
        } else if (e.target.classList.contains('profile__card-delete-button')) {
            if (state.profiles.length <= 1) return alert('최소 1개의 프로필은 있어야 합니다.');
            if (confirm('정말로 이 프로필을 삭제하시겠습니까?')) {
                state.profiles.splice(index, 1);
                state.currentProfileIndex = Math.min(state.currentProfileIndex, state.profiles.length - 1);
                saveState();
                renderAll();
            }
        }
    };
    
    document.getElementById('profile-modal-close').onclick = closeModals;
    document.getElementById('finish-modal-close').onclick = closeModals;

    document.getElementById('profile-img-input').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (rev) => { document.getElementById('profile-edit-preview').src = rev.target.result; };
            reader.readAsDataURL(file);
        }
    };

    document.getElementById('settings-save').onclick = () => {
        const nickname = document.getElementById('settings-nickname').value;
        const theme = document.querySelector('input[name="theme"]:checked').value;
        const isRemindEnabled = document.getElementById('settings-remind-toggle').checked;
        
        // 🔥 예외 처리 로직 추가 (빈칸이거나 문자를 입력했을 때)
        let remindInterval = 30;
        const intervalTypeElement = document.querySelector('input[name="remind-interval"]:checked');
        const intervalType = intervalTypeElement ? intervalTypeElement.value : '30';
        if (intervalType === 'custom') {
            const customVal = parseInt(document.getElementById('settings-remind-custom').value);
            remindInterval = (isNaN(customVal) || customVal <= 0) ? 30 : customVal;
            if (remindInterval > 180) remindInterval = 180;
        } else {
            remindInterval = parseInt(intervalType);
        }

        const sStart = document.querySelector('input[name="sound-start"]:checked');
        const sEnd = document.querySelector('input[name="sound-end"]:checked');
        const sPopup = document.querySelector('input[name="sound-popup"]:checked');
        if (!state.settings.sounds) state.settings.sounds = {};
        if (sStart) state.settings.sounds.start = sStart.value;
        if (sEnd) state.settings.sounds.end = sEnd.value;
        if (sPopup) state.settings.sounds.popup = sPopup.value;

        if (nickname) state.settings.nickname = nickname;
        state.settings.theme = theme;
        state.settings.isRemindEnabled = isRemindEnabled;
        state.settings.remindInterval = remindInterval;

        applyTheme(theme);
        saveState();
        renderAll();
        alert('설정이 저장되었습니다.');
        showPage('page-timer');
    };

    document.getElementById('settings-remind-toggle').onchange = (e) => {
        const isChecked = e.target.checked;
        document.getElementById('remind-interval-area').style.display = isChecked ? 'block' : 'none';
    };

    document.querySelectorAll('input[name="remind-interval"]').forEach(radio => {
        radio.onchange = (e) => {
            document.getElementById('custom-interval-input-area').style.display = (e.target.value === 'custom') ? 'block' : 'none';
        }
    });

    // Settings Navigation Tabs
    document.querySelectorAll('[data-settings-tab]').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('[data-settings-tab]').forEach(b => b.classList.remove('settings__tab-btn--active'));
            btn.classList.add('settings__tab-btn--active');
            document.querySelectorAll('.settings__panel').forEach(p => p.style.display = 'none');
            const panel = document.getElementById(`settings-panel-${btn.dataset.settingsTab}`);
            if (panel) panel.style.display = 'block';
        };
    });

    // Sound Setup Tabs
    document.querySelectorAll('[data-sound-tab]').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('[data-sound-tab]').forEach(b => b.classList.remove('sound__tab-btn--active'));
            btn.classList.add('sound__tab-btn--active');
            document.querySelectorAll('.sound__options-panel').forEach(p => p.style.display = 'none');
            const panel = document.getElementById(`sound-options-${btn.dataset.soundTab}`);
            if (panel) panel.style.display = 'block';
        };
    });

    // Audio Preview Logic
    document.querySelectorAll('.interval__options--sound input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const val = e.target.value;
            previewAudio.pause();
            previewAudio.currentTime = 0;
            if (val !== 'none') {
                previewAudio.src = `sound/${val}.mp3`;
                previewAudio.play().catch(err => console.warn('Preview failed:', err));
            }
        });
    });

    document.getElementById('remind-bubble-close').onclick = closeRemindBubble;

    // Inline Timer Editing Logic (Split Min/Sec)
    const partMin = document.getElementById('timer-part-min');
    const partSec = document.getElementById('timer-part-sec');
    const displayMin = document.getElementById('timer-time-min');
    const displaySec = document.getElementById('timer-time-sec');
    const inputMin = document.getElementById('timer-input-min');
    const inputSec = document.getElementById('timer-input-sec');

    const updateTimerFromInputs = () => {
        let m = parseInt(inputMin.value) || 0;
        let s = parseInt(inputSec.value) || 0;
        if (s > 59) s = 59;
        let totalSecs = (m * 60) + s;
        if (totalSecs > 180 * 60) totalSecs = 180 * 60;
        
        timerState.seconds = totalSecs;
        timerState.initialSeconds = totalSecs;
        resetEngine();
    };

    if (partMin && inputMin) {
        partMin.onclick = () => {
            if (currentMode !== MODES.TIMER || (isTimerRunning && !isTimerPaused)) return;
            displayMin.style.display = 'none';
            inputMin.style.display = 'inline-block';
            inputMin.value = Math.floor(timerState.initialSeconds / 60);
            inputMin.focus();
            inputMin.select();
        };
        inputMin.onblur = () => {
            inputMin.style.display = 'none';
            displayMin.style.display = 'inline';
            updateTimerFromInputs();
        };
        inputMin.onkeydown = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); inputMin.blur(); }
        };
    }

    if (partSec && inputSec) {
        partSec.onclick = () => {
            if (currentMode !== MODES.TIMER || (isTimerRunning && !isTimerPaused)) return;
            displaySec.style.display = 'none';
            inputSec.style.display = 'inline-block';
            inputSec.value = timerState.initialSeconds % 60;
            inputSec.focus();
            inputSec.select();
        };
        inputSec.onblur = () => {
            inputSec.style.display = 'none';
            displaySec.style.display = 'inline';
            updateTimerFromInputs();
        };
        inputSec.onkeydown = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); inputSec.blur(); }
        };
    }

    // Quick Settings Panel Logic
    const quickSettingBtn = document.getElementById('timer-quick-setting-btn');
    const quickSettingPanel = document.getElementById('timer-quick-settings-panel');
    if (quickSettingBtn && quickSettingPanel) {
        quickSettingBtn.onclick = () => {
            if (currentMode !== MODES.TIMER || (isTimerRunning && !isTimerPaused)) {
                alert('타이머가 정지된 상태에서만 설정할 수 있습니다.');
                return;
            }
            const isVisible = quickSettingPanel.style.display === 'block';
            quickSettingPanel.style.display = isVisible ? 'none' : 'block';
        };

        const presetRadios = document.querySelectorAll('input[name="quick-timer-preset"]');
        presetRadios.forEach(radio => {
            radio.onchange = (e) => {
                if (e.target.checked) {
                    const mins = parseInt(e.target.value);
                    const totalSecs = mins * 60;
                    timerState.seconds = totalSecs;
                    timerState.initialSeconds = totalSecs;
                    resetEngine();
                    quickSettingPanel.style.display = 'none';
                    e.target.checked = false; // reset selection
                }
            };
        });
    }
}

init();