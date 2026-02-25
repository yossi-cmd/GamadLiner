(function () {
  'use strict';

  const PUZZLES = [
    { id: 1, letters: 'יו', title: 'שלב 1', question: 'לפעמים אומרים אותי בהתלהבות, כשמכפילים אותי מקבלים משחק ילדות. מי אני? (שתי אותיות)' },
    { id: 2, letters: 'סי', title: 'שלב 2', question: 'אם אומרים אותי במקומות מסויימים, זה יחשב כהסכמה. אך אם אומרים אותי על המגרש, זה אצל רונאלדו אחרי בעיטה. מי אני? (שתי אותיות)' },
    { id: 3, letters: 'בי', title: 'שלב 3', question: 'אני אות אחת, אבל כשאומרים אותי – אני שתיים. מי אני? (שתי אותיות)' },
    { id: 4, letters: 'טון', title: 'שלב 4', question: 'אני יחידת מידה למשקל, אני גם שינוי בגובה קול, ואני סוגר את השם. מי אני? (שלוש אותיות)' },
  ];

  let state = {
    currentStage: 1,
    answeredSteps: [],      // id של שלבים שפתורים
    collectedByStage: {},   // { 1: 'יו', 2: 'סי', ... } – לפי סדר ID
  };

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const welcomeScreen = $('#welcome-screen');
  const mainScreen = $('#main-screen');
  const completionScreen = $('#completion-screen');
  const progressFill = $('#progress-fill');
  const puzzleTitle = $('#puzzle-title');
  const puzzleQuestion = $('#puzzle-question');
  const answerInput = $('#answer-input');
  const btnCheck = $('#btn-check');
  const feedbackMsg = $('#feedback-msg');
  const collectedLettersEl = $('#collected-letters');
  const flyingContainer = $('#flying-letters-container');
  const inputArea = $('#input-area');
  const btnNext = $('#btn-next');

  function normalizeAnswer(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/\s/g, '').trim().toLowerCase();
  }

  function getCollectedLettersOrdered() {
    return PUZZLES
      .filter(p => state.collectedByStage[p.id])
      .map(p => state.collectedByStage[p.id]);
  }

  function renderProgress() {
    const n = state.answeredSteps.length;
    progressFill.style.width = `${(n / 4) * 100}%`;
    progressFill.setAttribute('aria-valuenow', n);
  }

  function renderStageButtons() {
    $$('.stage-btn').forEach(btn => {
      const id = parseInt(btn.dataset.stage, 10);
      const isCurrent = id === state.currentStage;
      const completed = state.answeredSteps.includes(id);
      const skipped = !completed && state.answeredSteps.length > 0;

      btn.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
      btn.classList.remove('completed', 'skipped');
      if (completed) btn.classList.add('completed');
      else if (skipped) btn.classList.add('skipped');
    });
  }

  function showPuzzle(stageId) {
    const puzzle = PUZZLES.find(p => p.id === stageId);
    if (!puzzle) return;

    state.currentStage = stageId;
    puzzleTitle.textContent = puzzle.title;
    puzzleQuestion.textContent = puzzle.question;
    answerInput.value = '';
    feedbackMsg.textContent = '';
    feedbackMsg.className = 'feedback-msg';
    const isCompleted = state.answeredSteps.includes(stageId);
    answerInput.disabled = isCompleted;
    btnCheck.disabled = isCompleted;
    inputArea.classList.toggle('state-completed', isCompleted);

    renderStageButtons();
    renderProgress();
  }

  function renderCollectedLetters(justAddedStageId = null) {
    const ordered = getCollectedLettersOrdered();
    collectedLettersEl.innerHTML = ordered
      .map((letters, i) => {
        const stageId = PUZZLES.find(p => state.collectedByStage[p.id] === letters)?.id;
        const isJustAdded = stageId === justAddedStageId;
        return `<span class="collected-letter ${isJustAdded ? 'just-added' : ''}" data-stage="${stageId || ''}">${letters}</span>`;
      })
      .join('');
  }

  function triggerFlyingAnimation(letters, fromRect) {
    const box = collectedLettersEl.getBoundingClientRect();
    const centerX = fromRect.left + fromRect.width / 2;
    const centerY = fromRect.top + fromRect.height / 2;
    const targetX = box.left + box.width / 2 - centerX;
    const targetY = box.top + box.height / 2 - centerY;

    letters.split('').forEach((char, i) => {
      const el = document.createElement('span');
      el.className = 'flying-letter';
      el.textContent = char;
      el.style.left = `${centerX}px`;
      el.style.top = `${centerY}px`;
      el.style.setProperty('--fly-x', `${targetX + (i - 0.5) * 24}px`);
      el.style.setProperty('--fly-y', `${targetY}px`);
      flyingContainer.appendChild(el);
      setTimeout(() => el.remove(), 700);
    });
  }

  function markSuccess(stageId) {
    const puzzle = PUZZLES.find(p => p.id === stageId);
    if (!puzzle || state.answeredSteps.includes(stageId)) return;

    state.answeredSteps.push(stageId);
    state.answeredSteps.sort((a, b) => a - b);
    state.collectedByStage[stageId] = puzzle.letters;

    const card = $('#puzzle-card');
    card.classList.add('success-flash');
    setTimeout(() => card.classList.remove('success-flash'), 600);

    triggerFlyingAnimation(puzzle.letters, card.getBoundingClientRect());
    renderCollectedLetters(stageId);
    renderProgress();
    renderStageButtons();

    feedbackMsg.textContent = 'כל הכבוד! האותיות נוספו.';
    feedbackMsg.className = 'feedback-msg success';
    answerInput.disabled = true;
    btnCheck.disabled = true;
    inputArea.classList.add('state-completed');

    const nextStageId = stageId < 4 ? stageId + 1 : null;
    if (nextStageId && state.answeredSteps.length < 4) {
      setTimeout(() => showPuzzle(nextStageId), 1200);
    }
  }

  function goToNextQuestion() {
    const nextId = state.currentStage < 4 ? state.currentStage + 1 : state.currentStage;
    if (nextId !== state.currentStage) showPuzzle(nextId);
    else if (state.answeredSteps.length === 4) showCompletion();
  }

  function checkAnswer() {
    const stageId = state.currentStage;
    if (state.answeredSteps.includes(stageId)) return;

    const puzzle = PUZZLES.find(p => p.id === stageId);
    if (!puzzle) return;

    const raw = answerInput.value;
    const normalized = normalizeAnswer(raw);
    const expected = normalizeAnswer(puzzle.letters);

    if (normalized === expected) {
      markSuccess(stageId);
      if (state.answeredSteps.length === 4) {
        setTimeout(() => showCompletion(), 1400);
      }
    } else {
      feedbackMsg.textContent = 'עדיין לא. נסה שוב.';
      feedbackMsg.className = 'feedback-msg error';
    }
  }

  function showCompletion() {
    mainScreen.classList.remove('active');
    completionScreen.classList.add('active');
  }

  function showMainFromWelcome() {
    welcomeScreen.classList.remove('active');
    mainScreen.classList.add('active');
    showPuzzle(state.currentStage);
    renderCollectedLetters();
  }

  function restart() {
    state = { currentStage: 1, answeredSteps: [], collectedByStage: {} };
    completionScreen.classList.remove('active');
    mainScreen.classList.add('active');
    showPuzzle(1);
    renderCollectedLetters();
  }

  function continueAfterCompletion() {
    completionScreen.classList.remove('active');
    mainScreen.classList.add('active');
    showPuzzle(state.currentStage);
    renderCollectedLetters();
  }

  // Event listeners
  $('#btn-start').addEventListener('click', showMainFromWelcome);

  $$('.stage-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.stage, 10);
      showPuzzle(id);
    });
  });

  btnCheck.addEventListener('click', checkAnswer);
  btnNext.addEventListener('click', goToNextQuestion);
  answerInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') checkAnswer();
  });

  $('#btn-restart').addEventListener('click', restart);
  $('#btn-continue').addEventListener('click', continueAfterCompletion);

  // Init – טעינה תמיד מחדש, ללא מטמון
  renderCollectedLetters();
  renderProgress();
  renderStageButtons();
})();
