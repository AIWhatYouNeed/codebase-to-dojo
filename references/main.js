/**
 * CODEBASE-TO-COURSE — COMPLETE JS ENGINE
 * Copy this file verbatim into the course output directory.
 * Never regenerate it. It handles all interactivity generically.
 *
 * Engines included:
 *  - Navigation & progress bar
 *  - Scroll-triggered reveal animations
 *  - Keyboard navigation
 *  - Glossary tooltips
 *  - Quiz (multiple-choice & scenario)
 *  - Drag-and-drop matching
 *  - Group chat animation
 *  - Data flow / message flow animation
 *  - Architecture diagram
 *  - "Spot the bug" challenge
 *  - Layer toggle
 *  - AI assistant sidebar (chat with LLM, context-aware)
 *  - Course outline sidebar (collapsible TOC)
 *  - Notes sidebar (learner's personal notes, selection-anchored)
 */
(function () {
  'use strict';

  /* ── HELPERS ──────────────────────────────────────────────── */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  /* ── PER-COURSE LOCALIZATION KEY ──────────────────────────── */
  // WHY: localStorage is NOT reliably isolated per file:// path (Chrome
  // isolates, Firefox shares, http://localhost shares). To keep each
  // course's notes/sessions separate we suffix every storage key with a
  // slug derived from the page title, which is unique per course.
  // config/models are deliberately NOT suffixed — API settings are
  // shared across courses (you don't want to re-enter keys per course).
  var COURSE_SLUG = (function () {
    var t = (document.title || 'course').trim().toLowerCase();
    var s = t.replace(/[^\w一-鿿]+/g, '_').replace(/^_+|_+$/g, '');
    return s || 'course';
  })();
  function c2cKey(base) { return base + '__' + COURSE_SLUG; }

  /* ── SIDEBAR OPEN-STATE SYNC ──────────────────────────────── */
  // The body.sidebar-open class drives the main-content push (margin-right).
  // It must be present when EITHER panel is open, and absent only when BOTH
  // are closed. Previously each closePanel() removed the class unconditionally,
  // so switching panels (open one → its openPanel closes the other → the
  // other's closePanel stripped the class) left the content un-pushed and the
  // new panel overlapping the text. This single source of truth fixes that.
  function updateSidebarState() {
    var aiPanel = document.getElementById('ai-panel');
    var notesPanel = document.getElementById('notes-panel');
    var anyOpen = (aiPanel && !aiPanel.hidden) || (notesPanel && !notesPanel.hidden);
    document.body.classList.toggle('sidebar-open', !!anyOpen);
  }

  /* ── NAVIGATION & PROGRESS BAR ────────────────────────────── */
  const progressBar = $('#progress-bar');
  const navDots     = $$('.nav-dot');
  const modules     = $$('.module');

  function updateProgress() {
    if (!progressBar) return;
    const scrollTop    = window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct          = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    progressBar.style.width = pct + '%';
    progressBar.setAttribute('aria-valuenow', Math.round(pct));
    updateNavDots();
  }

  function updateNavDots() {
    const scrollMid = window.scrollY + window.innerHeight / 2;
    modules.forEach((mod, i) => {
      const dot = navDots[i];
      if (!dot) return;
      const top    = mod.offsetTop;
      const bottom = top + mod.offsetHeight;
      if (scrollMid >= top && scrollMid < bottom) {
        dot.classList.add('active');
        dot.classList.remove('visited');
      } else if (window.scrollY + window.innerHeight > top) {
        dot.classList.remove('active');
        dot.classList.add('visited');
      } else {
        dot.classList.remove('active', 'visited');
      }
    });
  }

  window.addEventListener('scroll', () => requestAnimationFrame(updateProgress), { passive: true });
  updateProgress();

  // Nav dot click → scroll to module
  navDots.forEach(dot => {
    dot.addEventListener('click', () => {
      const target = $('#' + dot.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ── KEYBOARD NAVIGATION ───────────────────────────────────── */
  function currentModuleIndex() {
    const scrollMid = window.scrollY + window.innerHeight / 2;
    for (let i = 0; i < modules.length; i++) {
      const top    = modules[i].offsetTop;
      const bottom = top + modules[i].offsetHeight;
      if (scrollMid >= top && scrollMid < bottom) return i;
    }
    return 0;
  }

  document.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      const next = modules[currentModuleIndex() + 1];
      if (next) { next.scrollIntoView({ behavior: 'smooth' }); e.preventDefault(); }
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      const prev = modules[currentModuleIndex() - 1];
      if (prev) { prev.scrollIntoView({ behavior: 'smooth' }); e.preventDefault(); }
    }
  });

  /* ── SCROLL-TRIGGERED REVEAL ───────────────────────────────── */
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  $$('.animate-in').forEach(el => revealObserver.observe(el));

  // Stagger children
  $$('.stagger-children').forEach(parent => {
    Array.from(parent.children).forEach((child, i) => {
      child.style.setProperty('--stagger-index', i);
    });
  });

  /* ── GLOSSARY TOOLTIPS ─────────────────────────────────────── */
  let activeTooltip = null;

  function positionTooltip(term, tip) {
    const rect     = term.getBoundingClientRect();
    const tipWidth = Math.min(320, Math.max(200, window.innerWidth * 0.8));
    let left = rect.left + rect.width / 2 - tipWidth / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tipWidth - 8));
    tip.style.left  = left + 'px';
    tip.style.width = tipWidth + 'px';
    document.body.appendChild(tip);
    const tipHeight = tip.offsetHeight;
    if (rect.top - tipHeight - 12 < 0) {
      tip.style.top = (rect.bottom + 8) + 'px';
      tip.classList.add('flip');
    } else {
      tip.style.top = (rect.top - tipHeight - 8) + 'px';
      tip.classList.remove('flip');
    }
  }

  function showTooltip(term, tip) {
    if (activeTooltip && activeTooltip !== tip) {
      activeTooltip.classList.remove('visible');
      activeTooltip.remove();
    }
    positionTooltip(term, tip);
    requestAnimationFrame(() => tip.classList.add('visible'));
    activeTooltip = tip;
  }

  function hideTooltip(tip) {
    tip.classList.remove('visible');
    setTimeout(() => { if (!tip.classList.contains('visible')) tip.remove(); }, 150);
    if (activeTooltip === tip) activeTooltip = null;
  }

  $$('.term').forEach(term => {
    const tip = document.createElement('span');
    tip.className = 'term-tooltip';
    tip.textContent = term.dataset.definition;

    // A small grace period so moving the pointer from the term onto the
    // tooltip itself doesn't dismiss it — the tooltip must stay open to
    // let the user select & copy its text.
    let hideTimer = null;
    function scheduleHide() {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => hideTooltip(tip), 200);
    }
    function cancelHide() {
      clearTimeout(hideTimer);
    }

    term.addEventListener('mouseenter', () => { cancelHide(); showTooltip(term, tip); });
    term.addEventListener('mouseleave', scheduleHide);
    // Keep the tooltip open while the pointer is over it (so the user can
    // select the definition text) and dismiss when they leave it.
    tip.addEventListener('mouseenter', cancelHide);
    tip.addEventListener('mouseleave', scheduleHide);
    // Stop clicks on the tooltip from triggering the document-wide dismiss.
    tip.addEventListener('click', e => e.stopPropagation());
    // Clicking the term toggles it (pinned until dismissed elsewhere).
    term.addEventListener('click', e => {
      e.stopPropagation();
      cancelHide();
      tip.classList.contains('visible') ? hideTooltip(tip) : showTooltip(term, tip);
    });
  });

  document.addEventListener('click', () => {
    if (activeTooltip) { activeTooltip.classList.remove('visible'); activeTooltip.remove(); activeTooltip = null; }
  });

  /* ── QUIZ ENGINE ───────────────────────────────────────────── */
  window.selectOption = function (btn) {
    const block = btn.closest('.quiz-question-block');
    $$('.quiz-option', block).forEach(o => o.classList.remove('selected'));
    btn.classList.add('selected');
  };

  window.checkQuiz = function (containerId) {
    const container = $('#' + containerId);
    if (!container) return;
    $$('.quiz-question-block', container).forEach(q => {
      const selected  = $('.quiz-option.selected', q);
      const feedback  = $('.quiz-feedback', q);
      const correct   = q.dataset.correct;
      const rightExp  = q.dataset.explanationRight  || '';
      const wrongExp  = q.dataset.explanationWrong  || '';

      if (!selected) {
        feedback.textContent = 'Pick an answer first!';
        feedback.className = 'quiz-feedback show warning';
        return;
      }
      $$('.quiz-option', q).forEach(o => o.disabled = true);

      if (selected.dataset.value === correct) {
        selected.classList.add('correct');
        feedback.innerHTML = '<strong>Exactly!</strong> ' + rightExp;
        feedback.className = 'quiz-feedback show success';
      } else {
        selected.classList.add('incorrect');
        const correctBtn = $(`.quiz-option[data-value="${correct}"]`, q);
        if (correctBtn) correctBtn.classList.add('correct');
        feedback.innerHTML = '<strong>Not quite.</strong> ' + wrongExp;
        feedback.className = 'quiz-feedback show error';
      }
    });
  };

  window.resetQuiz = function (containerId) {
    const container = $('#' + containerId);
    if (!container) return;
    $$('.quiz-option', container).forEach(o => {
      o.classList.remove('selected', 'correct', 'incorrect');
      o.disabled = false;
    });
    $$('.quiz-feedback', container).forEach(f => { f.className = 'quiz-feedback'; f.textContent = ''; });
  };

  /* ── DRAG-AND-DROP ENGINE ──────────────────────────────────── */
  function initDnD(containerEl) {
    if (!containerEl) return;
    const chips = $$('.dnd-chip', containerEl);
    const zones = $$('.dnd-zone', containerEl);

    // Mouse (HTML5 Drag API)
    chips.forEach(chip => {
      chip.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', chip.dataset.answer);
        chip.classList.add('dragging');
      });
      chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
    });

    zones.forEach(zone => {
      const target = $('.dnd-zone-target', zone);
      if (!target) return;
      target.addEventListener('dragover',  e => { e.preventDefault(); target.classList.add('drag-over'); });
      target.addEventListener('dragleave', ()  => target.classList.remove('drag-over'));
      target.addEventListener('drop', e => {
        e.preventDefault();
        target.classList.remove('drag-over');
        const answer = e.dataTransfer.getData('text/plain');
        const chip   = $(`.dnd-chip[data-answer="${answer}"]`, containerEl);
        if (!chip) return;
        target.textContent    = chip.textContent;
        target.dataset.placed = answer;
        chip.classList.add('placed');
      });
    });

    // Touch
    chips.forEach(chip => {
      chip.addEventListener('touchstart', e => {
        e.preventDefault();
        const touch = e.touches[0];
        const ghost = chip.cloneNode(true);
        ghost.classList.add('touch-ghost');
        ghost.style.cssText = `position:fixed;z-index:9999;pointer-events:none;left:${touch.clientX - 40}px;top:${touch.clientY - 20}px;`;
        document.body.appendChild(ghost);
        chip._ghost  = ghost;
        chip._answer = chip.dataset.answer;
      }, { passive: false });

      chip.addEventListener('touchmove', e => {
        e.preventDefault();
        const touch = e.touches[0];
        if (chip._ghost) {
          chip._ghost.style.left = (touch.clientX - 40) + 'px';
          chip._ghost.style.top  = (touch.clientY - 20) + 'px';
        }
        zones.forEach(z => { const t = $('.dnd-zone-target', z); if (t) t.classList.remove('drag-over'); });
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        const zt = el && el.closest('.dnd-zone-target');
        if (zt) zt.classList.add('drag-over');
      }, { passive: false });

      chip.addEventListener('touchend', e => {
        if (chip._ghost) { chip._ghost.remove(); chip._ghost = null; }
        const touch = e.changedTouches[0];
        const el    = document.elementFromPoint(touch.clientX, touch.clientY);
        const zt    = el && el.closest('.dnd-zone-target');
        if (zt) {
          zt.textContent    = chip.textContent;
          zt.dataset.placed = chip._answer;
          chip.classList.add('placed');
        }
        zones.forEach(z => { const t = $('.dnd-zone-target', z); if (t) t.classList.remove('drag-over'); });
      });
    });
  }

  window.checkDnD = function (containerId) {
    const container = $('#' + containerId);
    if (!container) return;
    $$('.dnd-zone', container).forEach(zone => {
      const target  = $('.dnd-zone-target', zone);
      if (!target || !target.dataset.placed) return;
      if (target.dataset.placed === zone.dataset.correct) {
        target.classList.add('correct-placed');
      } else {
        target.classList.add('incorrect-placed');
      }
    });
  };

  window.resetDnD = function (containerId) {
    const container = $('#' + containerId);
    if (!container) return;
    $$('.dnd-zone-target', container).forEach(t => {
      t.textContent = 'Drop here';
      delete t.dataset.placed;
      t.classList.remove('correct-placed', 'incorrect-placed');
    });
    $$('.dnd-chip', container).forEach(c => c.classList.remove('placed', 'dragging'));
  };

  // Auto-init all dnd containers
  $$('.dnd-container').forEach(el => initDnD(el));

  /* ── GROUP CHAT ENGINE ─────────────────────────────────────── */
  function initChat(containerEl) {
    if (!containerEl) return;
    const messages    = $$('.chat-message', containerEl);
    const typingEl    = $('.chat-typing', containerEl);
    const typingAvEl  = $('#' + containerEl.id + '-typing-avatar') || $('.chat-avatar', typingEl);
    const progressEl  = $('.chat-progress', containerEl);
    let index = 0;

    // Build actor map from messages
    const actors = {};
    messages.forEach(msg => {
      const sender = msg.dataset.sender;
      const avatar = $('.chat-avatar', msg);
      if (avatar && !actors[sender]) {
        actors[sender] = { initial: avatar.textContent.trim(), style: avatar.style.background };
      }
    });

    function updateProgress() {
      if (progressEl) progressEl.textContent = index + ' / ' + messages.length + ' messages';
    }

    function showNext() {
      if (index >= messages.length) return;
      const msg    = messages[index];
      const sender = msg.dataset.sender;

      if (typingEl && actors[sender]) {
        if (typingAvEl) {
          typingAvEl.textContent       = actors[sender].initial;
          typingAvEl.style.background  = actors[sender].style;
        }
        typingEl.style.display = 'flex';
      }

      setTimeout(() => {
        if (typingEl) typingEl.style.display = 'none';
        msg.style.display = 'flex';
        msg.style.animation = 'fadeSlideUp 0.3s var(--ease-out)';
        index++;
        updateProgress();
      }, 800);
    }

    function showAll() {
      const iv = setInterval(() => {
        if (index >= messages.length) { clearInterval(iv); return; }
        showNext();
      }, 1200);
    }

    function reset() {
      index = 0;
      messages.forEach(m => { m.style.display = 'none'; m.style.animation = ''; });
      if (typingEl) typingEl.style.display = 'none';
      updateProgress();
    }

    // Bind controls
    const nextBtn  = $('.chat-next-btn',  containerEl);
    const allBtn   = $('.chat-all-btn',   containerEl);
    const resetBtn = $('.chat-reset-btn', containerEl);
    if (nextBtn)  nextBtn.addEventListener('click',  showNext);
    if (allBtn)   allBtn.addEventListener('click',   showAll);
    if (resetBtn) resetBtn.addEventListener('click', reset);

    updateProgress();
  }

  $$('.chat-window').forEach(el => initChat(el));

  /* ── FLOW ANIMATION ENGINE ─────────────────────────────────── */
  function initFlow(containerEl) {
    if (!containerEl) return;
    const stepsData  = JSON.parse(containerEl.dataset.steps || '[]');
    const labelEl    = $('.flow-step-label', containerEl);
    const progressEl = $('.flow-progress',   containerEl);
    const packet     = $('.flow-packet',     containerEl);
    let step = 0;

    function updateProgress() {
      if (progressEl) progressEl.textContent = 'Step ' + step + ' / ' + stepsData.length;
    }

    function animatePacket(fromId, toId) {
      if (!packet) return;
      const fromEl = $('#' + fromId);
      const toEl   = $('#' + toId);
      if (!fromEl || !toEl) return;
      const fromR = fromEl.getBoundingClientRect();
      const toR   = toEl.getBoundingClientRect();
      const contR = containerEl.getBoundingClientRect();
      const fx = fromR.left + fromR.width / 2  - contR.left;
      const fy = fromR.top  + fromR.height / 2 - contR.top;
      const tx = toR.left   + toR.width / 2    - contR.left;
      const ty = toR.top    + toR.height / 2   - contR.top;
      packet.style.setProperty('--packet-from-x', fx + 'px');
      packet.style.setProperty('--packet-from-y', fy + 'px');
      packet.style.setProperty('--packet-to-x',   tx + 'px');
      packet.style.setProperty('--packet-to-y',   ty + 'px');
      packet.style.display    = 'block';
      packet.style.animation  = 'none';
      packet.offsetHeight; // reflow
      packet.style.animation  = 'packetMove 0.8s var(--ease-in-out) forwards';
      setTimeout(() => { packet.style.display = 'none'; }, 850);
    }

    function next() {
      if (step >= stepsData.length) return;
      const s = stepsData[step];
      $$('.flow-actor', containerEl).forEach(a => a.classList.remove('active'));
      if (s.highlight) {
        const hEl = $('#' + s.highlight, containerEl) || $('#flow-' + s.highlight);
        if (hEl) hEl.classList.add('active');
      }
      if (s.packet && s.from && s.to) animatePacket('flow-' + s.from, 'flow-' + s.to);
      if (labelEl) labelEl.textContent = s.label || '';
      step++;
      updateProgress();
    }

    function reset() {
      step = 0;
      $$('.flow-actor', containerEl).forEach(a => a.classList.remove('active'));
      if (labelEl) labelEl.textContent = 'Click "Next Step" to begin';
      if (packet)  packet.style.display = 'none';
      updateProgress();
    }

    const nextBtn  = $('.flow-next-btn',  containerEl);
    const resetBtn = $('.flow-reset-btn', containerEl);
    if (nextBtn)  nextBtn.addEventListener('click',  next);
    if (resetBtn) resetBtn.addEventListener('click', reset);

    updateProgress();
  }

  $$('.flow-animation').forEach(el => initFlow(el));

  /* ── ARCHITECTURE DIAGRAM ──────────────────────────────────── */
  $$('.arch-component').forEach(comp => {
    comp.addEventListener('click', function () {
      const diagram = this.closest('.arch-diagram');
      $$('.arch-component', diagram).forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      const descEl = $('.arch-description', diagram);
      if (descEl) descEl.textContent = this.dataset.desc || '';
    });
  });

  /* ── BUG CHALLENGE ─────────────────────────────────────────── */
  window.checkBugLine = function (el, isCorrect) {
    const challenge = el.closest('.bug-challenge');
    const feedback  = $('.bug-feedback', challenge);
    if (isCorrect) {
      el.classList.add('correct');
      feedback.innerHTML  = '<strong>Found it!</strong> ' + (el.dataset.explanation || '');
      feedback.className  = 'bug-feedback show success';
      $$('.bug-line', challenge).forEach(l => l.style.pointerEvents = 'none');
    } else {
      el.classList.add('incorrect');
      feedback.innerHTML  = (el.dataset.hint || 'Not this line — keep looking...');
      feedback.className  = 'bug-feedback show error';
      setTimeout(() => {
        el.classList.remove('incorrect');
        feedback.className = 'bug-feedback';
      }, 1800);
    }
  };

  /* ── LAYER TOGGLE ──────────────────────────────────────────── */
  window.showLayer = function (layerId, btn) {
    const demo = btn ? btn.closest('.layer-demo') : null;
    if (!demo) return;
    $$('.layer', demo).forEach(l => l.style.display = 'none');
    $$('.layer-tab', demo).forEach(t => t.classList.remove('active'));
    const layer = $('#' + layerId);
    if (layer) layer.style.display = 'block';
    btn.classList.add('active');
  };

  /* ============================================================
     AI ASSISTANT SIDEBAR
     An optional, self-contained chat panel that lets the learner
     ask an LLM about the content they're reading. Configured in-
     page (API URL + key + model + format), stored in localStorage.

     Context awareness:
       - Auto-captures the module currently in view (title + body text)
       - Captures any text the user selected on the page
       - Keeps a running conversation history for follow-ups

     API support: OpenAI-compatible (/v1/chat/completions, SSE stream)
                  and Anthropic Messages API (/v1/messages, SSE stream)

     Mounts only if #ai-sidebar exists (gated by _base.html AI_SIDEBAR).
     ============================================================ */
  (function initAIAssistant() {
    const mount = document.getElementById('ai-sidebar');
    if (!mount) return; // sidebar disabled for this course

    /* ── CONFIG STATE (persisted in localStorage) ─────────────── */
    // config + models are SHARED across courses (you don't want to re-enter
    // API keys per course). sessions + active are PER-COURSE (suffixed with
    // the course slug) so Q&A history doesn't bleed between courses.
    var STORE_KEY    = 'c2c_ai_config';                    // shared
    var MODELS_KEY   = 'c2c_ai_models';                   // shared
    var SESSIONS_KEY = c2cKey('c2c_ai_sessions');          // per-course
    var ACTIVE_KEY   = c2cKey('c2c_ai_active');            // per-course

    // Some upstream proxies (e.g. litellm) reject strings containing lone
    // UTF-16 surrogates with a "'utf-8' codec can't encode character" 500.
    // These creep in when we slice text mid-emoji (slice(0, 3000) can split
    // a surrogate pair 🚗 = 🚗, leaving a dangling \uD83D). This
    // walks the string code-unit by code-unit and drops any unpaired
    // surrogate so the payload is always clean UTF-8.
    function stripLoneSurrogates(s) {
      if (!s) return s;
      s = String(s);
      var out = '';
      for (var i = 0; i < s.length; i++) {
        var code = s.charCodeAt(i);
        var hi = code >= 0xD800 && code <= 0xDBFF;
        var lo = code >= 0xDC00 && code <= 0xDFFF;
        if (hi) {
          // Keep only if followed by a low surrogate.
          var next = s.charCodeAt(i + 1);
          if (next >= 0xDC00 && next <= 0xDFFF) { out += s[i] + s[i + 1]; i++; }
          // else: lone high surrogate → drop.
        } else if (lo) {
          // Lone low surrogate (not preceded by a high — high case already
          // consumed its pair above) → drop.
        } else {
          out += s[i];
        }
      }
      return out;
    }

    // endpoint is the FULL chat-completions / messages URL, sisyphus-style.
    // Users paste exactly what the provider documents — no base/path splitting.
    var defaultConfig = {
      format:   'openai',    // 'openai' | 'claude'
      endpoint: '',          // e.g. http://llm-proxy.intra.xiaojukeji.com/v1/chat/completions
      apiKey:   '',
      model:    '',          // chosen model id, populated via "获取模型" or typed
      systemPrompt: ''       // optional override; empty = built-in default
    };

    function loadConfig() {
      var raw = {};
      try { raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) {}
      var cfg = {};
      Object.keys(defaultConfig).forEach(function (k) {
        cfg[k] = raw[k] !== undefined ? raw[k] : defaultConfig[k];
      });
      // Migrate legacy baseUrl → endpoint if present.
      if (!cfg.endpoint && raw.baseUrl) {
        cfg.endpoint = raw.format === 'claude'
          ? raw.baseUrl.replace(/\/+$/, '') + '/v1/messages'
          : raw.baseUrl.replace(/\/+$/, '') + '/v1/chat/completions';
      }
      return cfg;
    }
    function saveConfig(cfg) {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(cfg)); } catch (e) {}
    }
    function loadCachedModels() {
      try { return JSON.parse(localStorage.getItem(MODELS_KEY) || '[]'); } catch (e) { return []; }
    }
    function saveCachedModels(list) {
      try { localStorage.setItem(MODELS_KEY, JSON.stringify(list)); } catch (e) {}
    }

    /* ── MULTI-SESSION STORE ──────────────────────────────────── */
    // Sessions: [{id, title, msgs:[{role,content}], createdAt}].
    // Replaces the old single flat history. Migrates legacy history on first load.
    function loadSessions() {
      try {
        var arr = JSON.parse(localStorage.getItem(SESSIONS_KEY) || 'null');
        if (arr && Array.isArray(arr)) return arr;
      } catch (e) {}
      // Legacy migration: old flat history → one session.
      try {
        var old = JSON.parse(localStorage.getItem(c2cKey('c2c_ai_history')) || '[]');
        if (old.length) {
          var s = newSession(old);
          var arr2 = [s];
          saveSessions(arr2);
          localStorage.setItem(ACTIVE_KEY, s.id);
          return arr2;
        }
      } catch (e) {}
      return [];
    }
    function saveSessions(arr) {
      // Cap total messages across sessions to stay under quota.
      var total = 0;
      arr.forEach(function (s) { total += s.msgs.length; });
      if (total > 200) {
        // Drop oldest sessions' tail until under budget.
        arr.forEach(function (s) {
          if (total > 200 && s.msgs.length > 20) {
            var cut = Math.min(s.msgs.length - 10, total - 200);
            s.msgs = s.msgs.slice(cut);
            total -= cut;
          }
        });
      }
      try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(arr)); } catch (e) {}
    }
    function newSession(msgs) {
      return {
        id: 's' + Date.now() + Math.floor(Math.random() * 1000),
        title: deriveTitle(msgs),
        msgs: msgs || [],
        createdAt: Date.now()
      };
    }
    function deriveTitle(msgs) {
      if (!msgs || !msgs.length) return '新对话';
      var firstUser = null;
      for (var i = 0; i < msgs.length; i++) {
        if (msgs[i].role === 'user') { firstUser = msgs[i].content; break; }
      }
      if (!firstUser) return '新对话';
      var t = firstUser.replace(/\s+/g, ' ').trim();
      return t.length > 18 ? t.slice(0, 18) + '…' : t;
    }
    function getActiveSessionId() {
      return localStorage.getItem(ACTIVE_KEY) || null;
    }
    function setActiveSessionId(id) {
      localStorage.setItem(ACTIVE_KEY, id);
    }
    function getActiveSession() {
      var arr = loadSessions();
      var id = getActiveSessionId();
      if (id) {
        for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
      }
      return arr[0] || null;
    }

    /* ── ENDPOINT HELPERS ─────────────────────────────────────── */
    // Derive the /models list URL from a chat endpoint, sisyphus-style.
    // OpenAI:  …/v1/chat/completions  →  …/v1/models
    // Claude:  …/v1/messages          →  …/v1/models
    function modelsUrlFrom(endpoint, format) {
      var u = endpoint.replace(/\/+$/, '');
      if (format === 'claude') {
        u = u.replace(/\/messages$/, '/models');
      } else {
        u = u.replace(/\/chat\/completions$/, '/models');
      }
      // If the user gave a bare base (no /chat/completions), append /models.
      if (!/\/models$/.test(u)) u = u + '/models';
      return u;
    }

    // Whether the endpoint is local (key optional), sisyphus-style.
    function isLocalEndpoint(endpoint) {
      return /\/\/(localhost|127\.0\.0\.1)([:\/]|$)/.test(endpoint);
    }

    /* ── DOM CONSTRUCTION ─────────────────────────────────────── */
    // Built in JS so the sidebar is fully self-contained — _base.html only
    // needs the empty <aside id="ai-sidebar">. All structure lives here.
    mount.innerHTML =
      '<button class="ai-fab" id="ai-fab" aria-label="Ask AI" title="Ask AI">' +
        '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>' +
        '</svg>' +
      '</button>' +
      '<div class="ai-panel" id="ai-panel" hidden>' +
        '<header class="ai-header">' +
          '<button class="ai-sessions-btn" id="ai-sessions-btn" title="历史会话" aria-label="历史会话">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>' +
            '<span class="ai-sessions-label" id="ai-sessions-label">新对话</span>' +
          '</button>' +
          '<div class="ai-header-actions">' +
            '<button class="ai-icon-btn" id="ai-open-notes-btn" title="打开笔记" aria-label="打开笔记">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>' +
            '</button>' +
            '<button class="ai-icon-btn" id="ai-new-chat-btn" title="新建对话" aria-label="新建对话">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>' +
            '</button>' +
            '<button class="ai-icon-btn" id="ai-settings-btn" title="设置" aria-label="设置">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' +
            '</button>' +
            '<button class="ai-icon-btn" id="ai-close-btn" title="收起" aria-label="收起">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>' +
            '</button>' +
          '</div>' +
        '</header>' +

        '<div class="ai-context-pill" id="ai-context-pill" hidden>' +
          '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' +
          '<span id="ai-context-label">当前模块</span>' +
        '</div>' +

        '<div class="ai-qa-nav" id="ai-qa-nav" hidden>' +
          '<button class="ai-qa-prev" id="ai-qa-prev" title="上一个问题" aria-label="上一个问题">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>' +
          '</button>' +
          '<select class="ai-qa-select" id="ai-qa-select" title="跳转到问题"></select>' +
          '<button class="ai-qa-next" id="ai-qa-next" title="下一个问题" aria-label="下一个问题">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>' +
          '</button>' +
        '</div>' +

        '<div class="ai-messages" id="ai-messages"></div>' +

        '<div class="ai-input-area">' +
          '<textarea id="ai-input" class="ai-input" rows="1" placeholder="问点什么… (Enter 发送, Shift+Enter 换行)"></textarea>' +
          '<button class="ai-send-btn" id="ai-send-btn" title="发送" aria-label="发送">' +
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +

      '<div class="ai-sessions-drawer" id="ai-sessions-drawer" hidden>' +
        '<header class="ai-drawer-header">' +
          '<span>历史会话</span>' +
          '<button class="ai-icon-btn" id="ai-drawer-close" aria-label="关闭">' +
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</header>' +
        '<div class="ai-sessions-list" id="ai-sessions-list"></div>' +
      '</div>' +

      '<section class="ai-settings" id="ai-settings" hidden>' +
        '<header class="ai-settings-header">' +
          '<span>API 配置</span>' +
          '<button class="ai-icon-btn" id="ai-settings-close" aria-label="关闭设置">' +
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</header>' +
        '<div class="ai-settings-body">' +
          '<label class="ai-field">' +
            '<span>API 格式</span>' +
            '<select id="ai-cfg-format">' +
              '<option value="openai">OpenAI 兼容 (DeepSeek/Kimi/通义/vLLM/Ollama/内网网关)</option>' +
              '<option value="claude">Claude (Anthropic Messages API)</option>' +
            '</select>' +
          '</label>' +
          '<label class="ai-field">' +
            '<span>API Endpoint</span>' +
            '<input type="url" id="ai-cfg-endpoint" placeholder="http://llm-proxy.intra.xiaojukeji.com/v1/chat/completions" autocomplete="off">' +
            '<small class="ai-field-hint">完整的请求地址。localhost / 127.0.0.1 可不填 Key。</small>' +
          '</label>' +
          '<label class="ai-field">' +
            '<span>API Key</span>' +
            '<input type="password" id="ai-cfg-apikey" placeholder="sk-..." autocomplete="off">' +
            '<small class="ai-field-hint">仅存在本机浏览器，不上传任何地方</small>' +
          '</label>' +
          '<label class="ai-field">' +
            '<span>模型</span>' +
            '<div class="ai-model-row">' +
              '<input type="text" id="ai-cfg-model" list="ai-cfg-model-list" placeholder="点右侧获取，或直接输入模型名" autocomplete="off">' +
              '<button class="ai-fetch-btn" id="ai-fetch-btn" type="button">获取模型</button>' +
            '</div>' +
            '<datalist id="ai-cfg-model-list"></datalist>' +
            '<small class="ai-field-hint" id="ai-model-count">先点「获取模型」拉取可用列表</small>' +
          '</label>' +
          '<label class="ai-field">' +
            '<span>System Prompt（可选）</span>' +
            '<textarea id="ai-cfg-sysprompt" rows="3" placeholder="留空使用内置默认（会用当前模块内容作为上下文）"></textarea>' +
          '</label>' +
          '<div class="ai-settings-actions">' +
            '<button class="ai-btn-primary" id="ai-save-btn">保存</button>' +
          '</div>' +
          '<div class="ai-settings-msg" id="ai-settings-msg"></div>' +
        '</div>' +
      '</section>';

    /* ── ELEMENT REFS ─────────────────────────────────────────── */
    var fab       = document.getElementById('ai-fab');
    var panel     = document.getElementById('ai-panel');
    var settings  = document.getElementById('ai-settings');
    var drawer    = document.getElementById('ai-sessions-drawer');
    var messagesEl = document.getElementById('ai-messages');
    var inputEl   = document.getElementById('ai-input');
    var sendBtn   = document.getElementById('ai-send-btn');
    var ctxPill   = document.getElementById('ai-context-pill');
    var ctxLabel  = document.getElementById('ai-context-label');
    var fetchBtn  = document.getElementById('ai-fetch-btn');
    var modelInput = document.getElementById('ai-cfg-model');
    var modelList = document.getElementById('ai-cfg-model-list');
    var modelCount = document.getElementById('ai-model-count');
    var settingsMsg = document.getElementById('ai-settings-msg');
    var sessionsLabel = document.getElementById('ai-sessions-label');
    var sessionsList  = document.getElementById('ai-sessions-list');
    var qaNav    = document.getElementById('ai-qa-nav');
    var qaSelect = document.getElementById('ai-qa-select');

    /* ── MODEL LIST POPULATION ────────────────────────────────── */
    function populateModelDropdown(models) {
      modelList.innerHTML = '';
      models.forEach(function (id) {
        var opt = document.createElement('option');
        opt.value = id;
        opt.textContent = id;
        modelList.appendChild(opt);
      });
      if (models.length) {
        modelCount.textContent = '找到 ' + models.length + ' 个模型';
      }
    }

    // Fetch available models from the endpoint (sisyphus-style GET /models).
    function fetchModels(endpoint, apiKey, format, onDone, onError) {
      var url = modelsUrlFrom(endpoint, format);
      var headers = {};
      if (format === 'claude') {
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
      } else {
        headers['Authorization'] = 'Bearer ' + apiKey;
      }
      fetch(url, { method: 'GET', headers: headers })
        .then(function (res) {
          if (!res.ok) {
            return res.text().then(function (t) {
              throw new Error('HTTP ' + res.status + ' — ' + (t.slice(0, 200) || res.statusText));
            });
          }
          return res.json();
        })
        .then(function (data) {
          // OpenAI: { data: [{id}, ...] }; Anthropic: { data: [{id}, ...] }
          var models = ((data && data.data) || []).map(function (m) {
            return m.id || m.name || m;
          }).filter(Boolean).sort();
          onDone(models);
        })
        .catch(function (e) { onError(e.message || '请求失败'); });
    }

    function doFetchModels() {
      var endpoint = document.getElementById('ai-cfg-endpoint').value.trim();
      var apiKey = document.getElementById('ai-cfg-apikey').value.trim();
      var format = document.getElementById('ai-cfg-format').value;
      if (!endpoint) {
        settingsMsg.textContent = '请先填写 API Endpoint';
        settingsMsg.className = 'ai-settings-msg error';
        return;
      }
      if (!apiKey && !isLocalEndpoint(endpoint)) {
        settingsMsg.textContent = '请填写 API Key（或用 localhost 地址免 Key）';
        settingsMsg.className = 'ai-settings-msg error';
        return;
      }
      fetchBtn.disabled = true;
      fetchBtn.textContent = '获取中…';
      settingsMsg.textContent = '正在拉取模型列表…';
      settingsMsg.className = 'ai-settings-msg info';
      fetchModels(endpoint, apiKey, format,
        function (models) {
          fetchBtn.disabled = false;
          fetchBtn.textContent = '获取模型';
          if (!models.length) {
            settingsMsg.textContent = '未找到可用模型';
            settingsMsg.className = 'ai-settings-msg error';
            return;
          }
          saveCachedModels(models);
          populateModelDropdown(models);
          settingsMsg.textContent = '✓ 找到 ' + models.length + ' 个模型';
          settingsMsg.className = 'ai-settings-msg success';
        },
        function (err) {
          fetchBtn.disabled = false;
          fetchBtn.textContent = '获取模型';
          settingsMsg.textContent = '✗ ' + err;
          settingsMsg.className = 'ai-settings-msg error';
        }
      );
    }

    fetchBtn.addEventListener('click', doFetchModels);

    /* ── OPEN / CLOSE ─────────────────────────────────────────── */
    function openPanel() {
      panel.hidden = false;
      // Close the notes panel FIRST (mutual exclusion), through its own
      // close path so FAB state stays in sync. Must happen before we set
      // our own FAB classes — notes.closePanel() clears ai-fab-active, so
      // adding it afterwards would be undone.
      if (typeof window.c2cCloseNotesPanel === 'function') window.c2cCloseNotesPanel();
      // Now hide our own FAB (panel is open) and the notes FAB (don't let
      // it float over the AI panel).
      fab.classList.add('ai-fab-active');
      var notesFab = document.getElementById('notes-fab');
      if (notesFab) notesFab.classList.add('notes-fab-active');
      // Sync the sidebar-open push AFTER the mutual-exclusion close, so the
      // class reflects whichever panel is actually open now.
      updateSidebarState();
      renderActiveSession();
      messagesEl.scrollTop = messagesEl.scrollHeight;
      var cfg = loadConfig();
      if (!cfg.endpoint) renderWelcome();
      setTimeout(function () { inputEl.focus(); }, 50);
    }
    function closePanel() {
      panel.hidden = true;
      fab.classList.remove('ai-fab-active');
      // Restore the notes FAB.
      var notesFab = document.getElementById('notes-fab');
      if (notesFab) notesFab.classList.remove('notes-fab-active');
      drawer.hidden = true;
      settings.hidden = true;
      // Re-evaluate sidebar-open: the notes panel may still be open, in which
      // case the push must remain. Only clears when BOTH panels are closed.
      updateSidebarState();
    }
    function togglePanel() { panel.hidden ? openPanel() : closePanel(); }

    // Expose a hook so other engines (e.g. the notes selection bar) can
    // "ask AI about this text": opens the panel and fills the input with a
    // quote block, just as if the user had selected the text while the panel
    // was open. Also closes the notes panel so the two sidebars don't overlap.
    // Returns true if the AI sidebar exists and handled it.
    window.c2cAskAIWithQuote = function (text) {
      if (!text || !panel) return false;
      // openPanel() closes the notes panel via its own mutual-exclusion
      // hook (c2cCloseNotesPanel), so FAB state stays in sync.
      if (panel.hidden) openPanel();
      setQuoteInInput(text);
      // Focus the input so the learner can type their question right away —
      // even when the panel was already open (openPanel only focuses on a
      // fresh open). Deferred one frame so the quote pill has rendered.
      setTimeout(function () { inputEl.focus(); }, 50);
      return true;
    };

    fab.addEventListener('click', togglePanel);
    document.getElementById('ai-close-btn').addEventListener('click', closePanel);
    // Cross-panel: open the notes sidebar from the AI header. The notes module
    // exposes c2cOpenNotesPanel; if it isn't ready yet, this is a no-op.
    var aiOpenNotesBtn = document.getElementById('ai-open-notes-btn');
    if (aiOpenNotesBtn) {
      aiOpenNotesBtn.addEventListener('click', function () {
        if (typeof window.c2cOpenNotesPanel === 'function') window.c2cOpenNotesPanel();
      });
    }

    // Let the notes module close the AI panel through its own close path so
    // FAB visibility stays in sync (mutual exclusion, no stuck states).
    window.c2cCloseAIPanel = function () {
      if (panel && !panel.hidden) closePanel();
    };
    // Let the notes module open the AI panel (cross-panel navigation from the
    // notes header's 💬 button). Opens even if currently closed.
    window.c2cOpenAIPanel = function () {
      if (panel && panel.hidden) openPanel();
    };

    /* ── WHEEL SCROLL ISOLATION ───────────────────────────────── */
    // When the pointer is over the AI sidebar (panel / settings / drawer),
    // wheel scrolling should only affect that sidebar's scrollable area, not
    // bleed through to the content page behind it.
    //
    // HOW: we let the browser scroll the container natively (so momentum /
    // trackpad smoothing stays intact — manual scrollTop += would feel jerky).
    // We only call preventDefault() when the container has reached a
    // boundary, which is the only case where the browser would otherwise
    // start scrolling the parent (content page). This is the standard
    // "scroll containment" technique and keeps scrolling silky.
    function lockWheelTo(container) {
      container.addEventListener('wheel', function (e) {
        // Only lock when an AI surface is actually open. When just the FAB
        // is visible (panel/settings/drawer all closed), let the page scroll
        // normally — the FAB is tiny and users don't scroll while hovering it.
        var anyOpen = !panel.hidden || !settings.hidden || !drawer.hidden;
        if (!anyOpen) return;

        // Find the nearest ancestor (incl. the target) that can scroll.
        var node = e.target;
        var scroller = null;
        while (node && node !== container) {
          if (node.scrollHeight > node.clientHeight + 1) {
            var style = getComputedStyle(node);
            if (/auto|scroll/.test(style.overflowY)) { scroller = node; break; }
          }
          node = node.parentElement;
        }
        if (!scroller) {
          // Over a non-scrollable part of the sidebar (header, buttons) —
          // block page scroll so the content page doesn't jump.
          e.preventDefault();
          return;
        }
        // Only block propagation (preventDefault) when at a boundary in the
        // direction of the wheel. Otherwise let the browser scroll natively.
        var atTop = scroller.scrollTop <= 0;
        var atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
        var goingUp = e.deltaY < 0;
        var goingDown = e.deltaY > 0;
        if ((goingUp && atTop) || (goingDown && atBottom)) {
          e.preventDefault();
        }
        // Otherwise: do nothing — browser scrolls the container natively.
      }, { passive: false });
    }
    lockWheelTo(mount);

    /* ── SETTINGS ─────────────────────────────────────────────── */
    function openSettings() {
      var cfg = loadConfig();
      document.getElementById('ai-cfg-format').value = cfg.format;
      document.getElementById('ai-cfg-endpoint').value = cfg.endpoint;
      document.getElementById('ai-cfg-apikey').value = cfg.apiKey;
      modelInput.value = cfg.model;
      document.getElementById('ai-cfg-sysprompt').value = cfg.systemPrompt;
      // Restore cached model list so the datalist isn't empty on reopen.
      var cached = loadCachedModels();
      if (cached.length) {
        populateModelDropdown(cached);
        modelCount.textContent = '找到 ' + cached.length + ' 个模型（缓存）';
      }
      settings.hidden = false;
    }
    function closeSettings() { settings.hidden = true; }

    document.getElementById('ai-settings-btn').addEventListener('click', openSettings);
    document.getElementById('ai-settings-close').addEventListener('click', closeSettings);
    document.getElementById('ai-save-btn').addEventListener('click', function () {
      var cfg = {
        format:      document.getElementById('ai-cfg-format').value,
        endpoint:    document.getElementById('ai-cfg-endpoint').value.trim().replace(/\/+$/, ''),
        apiKey:      document.getElementById('ai-cfg-apikey').value.trim(),
        model:       modelInput.value.trim(),
        systemPrompt: document.getElementById('ai-cfg-sysprompt').value.trim()
      };
      if (!cfg.endpoint) {
        settingsMsg.textContent = '请填写 API Endpoint';
        settingsMsg.className = 'ai-settings-msg error';
        return;
      }
      if (!cfg.apiKey && !isLocalEndpoint(cfg.endpoint)) {
        settingsMsg.textContent = '请填写 API Key（或用 localhost 地址免 Key）';
        settingsMsg.className = 'ai-settings-msg error';
        return;
      }
      if (!cfg.model) {
        settingsMsg.textContent = '请选择或输入模型名';
        settingsMsg.className = 'ai-settings-msg error';
        return;
      }
      saveConfig(cfg);
      closeSettings();
      renderWelcome();
      inputEl.focus();
    });

    /* ── MULTI-SESSION UI ─────────────────────────────────────── */
    // Renders the active session's messages (or welcome) and updates the
    // header label with the session title.
    function renderActiveSession() {
      var s = getActiveSession();
      if (!s) {
        // Auto-create a first session if none exists.
        s = newSession([]);
        var arr = loadSessions();
        arr.unshift(s);
        saveSessions(arr);
        setActiveSessionId(s.id);
      }
      sessionsLabel.textContent = s.title;
      messagesEl.innerHTML = '';
      // Reset ↑/↓ recall history for the newly active session.
      syncHistoryFromSession();
      qaCounter = 0; // reset Q-numbers for the new session
      if (!s.msgs.length) {
        renderWelcome();
      } else {
        s.msgs.forEach(function (m) {
          addMessage(m.role, m.content, m.quote ? { quote: m.quote } : undefined);
        });
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
      refreshQANav();
    }

    // Builds the session list inside the drawer.
    function renderSessionsList() {
      var arr = loadSessions();
      var activeId = getActiveSessionId();
      sessionsList.innerHTML = '';
      if (!arr.length) {
        sessionsList.innerHTML = '<div class="ai-sessions-empty">暂无历史会话</div>';
        return;
      }
      arr.forEach(function (s) {
        var row = document.createElement('div');
        row.className = 'ai-session-row';
        if (s.id === activeId) row.classList.add('active');
        var meta = document.createElement('div');
        meta.className = 'ai-session-meta';
        var title = document.createElement('div');
        title.className = 'ai-session-title';
        title.textContent = s.title;
        var sub = document.createElement('div');
        sub.className = 'ai-session-sub';
        sub.textContent = s.msgs.length + ' 条 · ' + new Date(s.createdAt).toLocaleDateString();
        meta.appendChild(title);
        meta.appendChild(sub);
        row.appendChild(meta);
        var del = document.createElement('button');
        del.className = 'ai-session-del';
        del.title = '删除';
        del.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>';
        del.addEventListener('click', function (e) {
          e.stopPropagation();
          var list = loadSessions();
          list = list.filter(function (x) { return x.id !== s.id; });
          saveSessions(list);
          if (s.id === activeId) {
            if (list.length) {
              setActiveSessionId(list[0].id);
            } else {
              var ns = newSession([]);
              list.unshift(ns);
              saveSessions(list);
              setActiveSessionId(ns.id);
            }
            renderActiveSession();
          }
          renderSessionsList();
        });
        row.appendChild(del);
        row.addEventListener('click', function () {
          setActiveSessionId(s.id);
          drawer.hidden = true;
          renderActiveSession();
        });
        sessionsList.appendChild(row);
      });
    }

    document.getElementById('ai-sessions-btn').addEventListener('click', function () {
      if (drawer.hidden) {
        renderSessionsList();
        drawer.hidden = false;
      } else {
        drawer.hidden = true;
      }
    });
    document.getElementById('ai-drawer-close').addEventListener('click', function () {
      drawer.hidden = true;
    });

    document.getElementById('ai-new-chat-btn').addEventListener('click', function () {
      var s = newSession([]);
      var arr = loadSessions();
      arr.unshift(s);
      saveSessions(arr);
      setActiveSessionId(s.id);
      renderActiveSession();
      inputEl.focus();
    });

    /* ── INPUT AUTO-RESIZE + ENTER TO SEND + ↑/↓ HISTORY ─────── */
    function autoresize() {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + 'px';
    }
    // Shell-style recall of previously sent questions. `histQs` holds the
    // questions from the current session (most-recent last). `histIdx` is
    // the recall cursor; -1 means "not recalling" (showing the live draft).
    var histQs = [];
    var histIdx = -1;
    var histDraft = '';   // remembers the in-progress draft before recall
    function syncHistoryFromSession() {
      var s = getActiveSession();
      histQs = s ? s.msgs.filter(function (m) { return m.role === 'user'; })
                       .map(function (m) { return m.content; }) : [];
      histIdx = -1;
    }
    function pushHistory(q) {
      if (!q) return;
      // Avoid consecutive duplicates.
      if (histQs.length && histQs[histQs.length - 1] === q) { histIdx = -1; return; }
      histQs.push(q);
      histIdx = -1;
    }
    inputEl.addEventListener('input', autoresize);
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
        return;
      }
      // ↑ recalls older questions (when caret at top / input single-line);
      // ↓ recalls newer ones (or returns to the live draft at the bottom).
      if (e.key === 'ArrowUp' && !e.shiftKey && !e.altKey && !e.metaKey) {
        // Only recall when the caret is at the very start, or the textarea is
        // single-line — otherwise ↑ should move the caret in a multiline edit.
        var multiline = inputEl.value.indexOf('\n') !== -1;
        var caretAtStart = inputEl.selectionStart === 0 && inputEl.selectionEnd === 0;
        if (multiline && !caretAtStart) return;
        if (!histQs.length) return;
        e.preventDefault();
        if (histIdx === -1) { histDraft = inputEl.value; histIdx = histQs.length; }
        if (histIdx > 0) histIdx--;
        inputEl.value = histQs[histIdx] || '';
        inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
        autoresize();
      } else if (e.key === 'ArrowDown' && !e.shiftKey && !e.altKey && !e.metaKey) {
        var ml = inputEl.value.indexOf('\n') !== -1;
        var caretAtEnd = inputEl.selectionStart === inputEl.value.length &&
                         inputEl.selectionEnd === inputEl.value.length;
        if (ml && !caretAtEnd) return;
        if (histIdx === -1) return;  // not recalling — ↓ is a no-op
        e.preventDefault();
        histIdx++;
        if (histIdx >= histQs.length) {
          histIdx = -1;
          inputEl.value = histDraft;
        } else {
          inputEl.value = histQs[histIdx] || '';
        }
        inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
        autoresize();
      }
    });
    // Single click dispatcher on the send button: while an answer is
    // streaming the button acts as Stop (abort), otherwise as Send. This
    // replaces a naive dual-listener setup where clicking Stop ALSO fired
    // sendMessage and resent whatever was in the input box mid-generation.
    var isStreaming = false;
    var currentAbort = null;
    sendBtn.addEventListener('click', function () {
      if (isStreaming && currentAbort) {
        try { currentAbort.abort(); } catch (e) {}
        // exitStreamingMode() is called by the onDone/onError abort path.
        return;
      }
      sendMessage();
    });

    /* ── CONTEXT CAPTURE ──────────────────────────────────────── */
    // Finds the module whose vertical midpoint sits in the viewport.
    function getCurrentModule() {
      var scrollMid = window.scrollY + window.innerHeight / 2;
      var mods = $$('.module');
      for (var i = 0; i < mods.length; i++) {
        var top = mods[i].offsetTop;
        var bottom = top + mods[i].offsetHeight;
        if (scrollMid >= top && scrollMid < bottom) return mods[i];
      }
      return null;
    }

    function moduleContextText(mod) {
      if (!mod) return '';
      var header = mod.querySelector('.module-title, .module-header h2, h2');
      var title = header ? header.textContent.trim() : ('Module ' + (mod.id || ''));
      var body = mod.innerText || mod.textContent || '';
      // Trim to ~3000 chars so we don't blow the context window. Then strip
      // any lone surrogate left by slicing mid-emoji — upstream proxies
      // (litellm) reject those with a UTF-8 encode 500.
      if (body.length > 3000) body = body.slice(0, 3000) + '\n…(已截断)';
      return stripLoneSurrogates('【当前正在学习的章节】\n标题：' + title + '\n\n' + body);
    }

    // Track selection to show a "quoted selection" context pill.
    function getSelectionText() {
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.toString().trim().length < 2) return '';
      var node = sel.anchorNode;
      if (node && document.getElementById('main').contains(node)) {
        return sel.toString().trim();
      }
      return '';
    }

    function refreshContextPill() {
      var sel = getSelectionText();
      var mod = getCurrentModule();
      if (sel) {
        ctxPill.hidden = false;
        ctxLabel.textContent = '引用选中文字 (' + (sel.length > 30 ? sel.slice(0, 30) + '…' : sel) + ')';
      } else if (mod) {
        var header = mod.querySelector('.module-title, .module-header h2, h2');
        ctxPill.hidden = false;
        ctxLabel.textContent = '上下文: ' + (header ? header.textContent.trim() : mod.id);
      } else {
        ctxPill.hidden = true;
      }
    }
    document.addEventListener('selectionchange', refreshContextPill);
    window.addEventListener('scroll', function () {
      requestAnimationFrame(refreshContextPill);
    }, { passive: true });

    // ── SELECTION → AUTO-FILL INPUT ─────────────────────────────
    // When the learner selects text in the course, it auto-fills the input
    // box as a markdown blockquote ("> 引用…") so they can ask about it
    // without copy-pasting. When the selection is cleared, the quote is
    // auto-removed — unless the user has typed their own question after it.
    var QUOTE_PREFIX = '> 引用：';
    // Returns the input value with any auto-inserted quote stripped, so we
    // can tell whether the user typed anything beyond the quote.
    function inputWithoutQuote() {
      var v = inputEl.value;
      if (v.indexOf(QUOTE_PREFIX) === 0) {
        // Strip the quote block (prefix + lines starting with ">") up to the
        // first blank line or non-">" line.
        var lines = v.split('\n');
        var i = 0;
        while (i < lines.length && (lines[i].indexOf('>') === 0 || lines[i].trim() === '')) i++;
        return lines.slice(i).join('\n').trim();
      }
      return v.trim();
    }
    function setQuoteInInput(sel) {
      // Truncate very long selections so the input stays usable.
      var short = sel.length > 200 ? sel.slice(0, 200) + '…' : sel;
      var quoteBlock = QUOTE_PREFIX + short.split('\n').join('\n> ');
      var userPart = inputWithoutQuote();
      inputEl.value = userPart ? quoteBlock + '\n\n' + userPart : quoteBlock + '\n\n';
      autoresize();
      // Place cursor at the end so the learner can type their question.
      inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
    }
    function clearQuoteFromInput() {
      var v = inputEl.value;
      if (v.indexOf(QUOTE_PREFIX) !== 0) return;
      var lines = v.split('\n');
      var i = 0;
      while (i < lines.length && (lines[i].indexOf('>') === 0 || lines[i].trim() === '')) i++;
      inputEl.value = lines.slice(i).join('\n');
      autoresize();
    }
    function syncSelectionToInput() {
      var sel = getSelectionText();
      if (sel) {
        setQuoteInInput(sel);
      } else {
        // Only clear the quote when the selection genuinely disappears from
        // the course content — NOT when the user clicks into the input box
        // (that collapses the text selection but should keep the quote).
        // If focus is already in the input, the user is typing; leave it.
        if (document.activeElement === inputEl) return;
        clearQuoteFromInput();
      }
    }
    // WHY mouseup + keyup: selection is finalized on mouseup in the document;
    // we delay slightly so the browser has registered the final selection range.
    // Skip if the mouseup happened inside the AI panel (clicking the input or
    // a button shouldn't trigger a sync that wipes the quote). Also skip the
    // notes selection bar (问 AI / 加笔记) — clicking those buttons inserts a
    // quote into the input, and a trailing sync would read the now-collapsed
    // selection as empty and clear the quote we just set.
    document.addEventListener('mouseup', function (e) {
      if (panel.hidden) return;
      if (panel.contains(e.target) || fab.contains(e.target)) return;
      var selectBar = document.getElementById('notes-select-bar');
      if (selectBar && selectBar.contains(e.target)) return;
      setTimeout(syncSelectionToInput, 10);
    });
    // Also respond to keyboard-driven selection (Shift+arrow) when panel is open.
    document.addEventListener('keyup', function () {
      if (panel.hidden) return;
      if (document.activeElement === inputEl) return; // typing a question
      syncSelectionToInput();
    });

    /* ── MESSAGE RENDERING ────────────────────────────────────── */
    function esc(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    // Tiny markdown-ish renderer: code fences, inline code, bold, line breaks.
    // WHY hand-rolled: avoids any external dependency (skill is zero-CDN).
    function renderMarkdown(text) {
      var html = '';
      var lines = text.split('\n');
      var inCode = false;
      var codeBuf = [];
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.match(/^```/)) {
          if (inCode) {
            html += '<pre class="ai-md-code"><code>' + esc(codeBuf.join('\n')) + '</code></pre>';
            codeBuf = [];
            inCode = false;
          } else {
            inCode = true;
          }
          continue;
        }
        if (inCode) { codeBuf.push(line); continue; }
        var escLine = esc(line)
          .replace(/`([^`]+)`/g, '<code class="ai-md-inline">$1</code>')
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html += escLine.length ? '<p>' + escLine + '</p>' : '<br>';
      }
      if (inCode && codeBuf.length) {
        html += '<pre class="ai-md-code"><code>' + esc(codeBuf.join('\n')) + '</code></pre>';
      }
      return html;
    }

    // Monotonic counter for Q&A pairs, so each user question gets a stable
    // number (Q1, Q2, …) used by the QA nav and for scroll-tracking.
    var qaCounter = 0;

    // Shared toolbar builder for assistant answers (copy + 加入笔记).
    // Used both by addMessage (when re-rendering persisted messages) and by
    // the streaming onDone callback — previously only onDone attached the
    // 加入笔记 button, so any re-render (reopen panel, switch session)
    // silently dropped it, making the button "work sometimes".
    function attachAnswerToolbar(body, fullText, assistantEl) {
      if (!body || body.querySelector('.ai-msg-toolbar')) return;
      var toolbar = document.createElement('div');
      toolbar.className = 'ai-msg-toolbar';
      // Copy button.
      var copyBtn = document.createElement('button');
      copyBtn.className = 'ai-copy-btn';
      copyBtn.title = '复制答案';
      copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>复制</span>';
      copyBtn.addEventListener('click', function () {
        copyToClipboard(fullText, copyBtn);
      });
      toolbar.appendChild(copyBtn);
      // 加入笔记 button — saves this answer as a learner note.
      var noteBtn = document.createElement('button');
      noteBtn.className = 'ai-copy-btn';
      noteBtn.title = '把这条回答存成笔记';
      var NOTE_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg><span>加入笔记</span>';
      noteBtn.innerHTML = NOTE_ICON;
      noteBtn.addEventListener('click', function () {
        // Title = the preceding user bubble's text; fall back to a default.
        var msgWrap = (assistantEl || contentEl).closest('.ai-msg');
        var qTitle = '';
        if (msgWrap && msgWrap.previousElementSibling) {
          var ub = msgWrap.previousElementSibling.querySelector('.ai-msg-user');
          if (ub) qTitle = ub.textContent.trim();
        }
        var noteId = null;
        if (typeof window.c2cAddNote === 'function') {
          noteId = window.c2cAddNote(qTitle || '(AI 回答)', fullText, '', '');
        }
        if (noteId) {
          // c2cAddNote already opened the notes panel. Show a confirmation
          // that doubles as a "view note" link — clicking scrolls to it.
          noteBtn.innerHTML = '<span>✓ 已加入 · 查看笔记</span>';
          if (typeof window.c2cScrollToNote === 'function') {
            window.c2cScrollToNote(noteId);
          }
        } else {
          noteBtn.innerHTML = '<span>笔记模块未就绪</span>';
        }
        setTimeout(function () { noteBtn.innerHTML = NOTE_ICON; }, 2600);
      });
      toolbar.appendChild(noteBtn);
      body.appendChild(toolbar);
    }

    function addMessage(role, content, opts) {
      opts = opts || {};
      var bubble = document.createElement('div');
      bubble.className = 'ai-msg ai-msg-' + role;
      if (opts.streaming) bubble.classList.add('ai-msg-streaming');

      var avatar = document.createElement('div');
      avatar.className = 'ai-msg-avatar';
      avatar.textContent = role === 'user' ? '你' : 'AI';

      var body = document.createElement('div');
      body.className = 'ai-msg-body';

      var contentEl = document.createElement('div');
      contentEl.className = 'ai-msg-content';
      if (role === 'user') {
        // If a quote is attached, render it as a styled blockquote above
        // the question so the user sees what they referenced — mirroring
        // what they saw in the input box.
        var html = '';
        if (opts.quote) {
          var shortQ = opts.quote.length > 200 ? opts.quote.slice(0, 200) + '…' : opts.quote;
          html += '<blockquote class="ai-msg-quote">' + esc(shortQ).replace(/\n/g, '<br>') + '</blockquote>';
        }
        html += esc(content).replace(/\n/g, '<br>');
        contentEl.innerHTML = html;
        // Tag user bubbles with a qa-num for scroll tracking + nav.
        qaCounter++;
        bubble.setAttribute('data-qa-num', qaCounter);
        bubble.setAttribute('data-qa-text', content.slice(0, 60));
      } else {
        contentEl.innerHTML = renderMarkdown(content);
      }
      body.appendChild(contentEl);

      // Toolbar (copy + 加入笔记) on assistant messages, not while streaming.
      // Uses the shared builder so re-rendered persisted messages keep the
      // 加入笔记 button too.
      if (role === 'assistant' && !opts.streaming) {
        attachAnswerToolbar(body, content, contentEl);
      }

      bubble.appendChild(avatar);
      bubble.appendChild(body);
      messagesEl.appendChild(bubble);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return contentEl;
    }

    // Copy text to clipboard with a fallback for non-secure contexts (file://).
    function copyToClipboard(text, btn) {
      var done = function () {
        var label = btn.querySelector('span');
        var prev = label.textContent;
        label.textContent = '已复制 ✓';
        btn.classList.add('ai-copy-done');
        setTimeout(function () {
          label.textContent = prev;
          btn.classList.remove('ai-copy-done');
        }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {
          fallbackCopy(text); done();
        });
      } else {
        fallbackCopy(text); done();
      }
    }
    function fallbackCopy(text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
    }

    function renderWelcome() {
      // Only show welcome if the active session has no real messages.
      var s = getActiveSession();
      if (s && s.msgs.length) return;
      if (messagesEl.children.length > 0) return;
      var cfg = loadConfig();
      if (!cfg.endpoint) {
        addMessage('assistant', '👋 你好！我是这门课的 AI 助手。\n\n你可以问我任何关于课程内容的问题，我会**结合你当前正在看的章节**来回答。\n\n**先点右上角 ⚙️ 配置 API**：填入 Endpoint、Key，点「获取模型」选模型，就能开始对话了。');
      } else {
        addMessage('assistant', '👋 随时问我关于课程内容的问题。我会自动参考你**当前正在学习的章节**和**你选中的文字**。');
      }
    }

    /* ── HISTORY COMPRESSION ─────────────────────────────────── */
    // Keeps the conversation bounded for the API so long sessions don't
    // explode the token count. Strategy: keep the most recent turns verbatim
    // (RECENT_PAIRS user+assistant rounds), and fold every older turn into a
    // single compact "summary" system-role message. The summary preserves the
    // gist (who asked what, the answer's gist) so the model still has thread.
    var RECENT_PAIRS = 4; // keep last 4 user→assistant rounds verbatim

    function compressHistory(msgs) {
      // Strip non-API fields (e.g. quote) first.
      var clean = msgs.map(function (m) {
        return { role: m.role, content: m.content };
      });
      // Split into "old" (to summarize) and "recent" (to keep verbatim).
      // A "pair" is a user turn + its assistant reply = up to 2 messages.
      var recentCount = RECENT_PAIRS * 2;
      if (clean.length <= recentCount) return clean;

      var oldMsgs = clean.slice(0, clean.length - recentCount);
      var recentMsgs = clean.slice(clean.length - recentCount);

      // Build a one-line-per-turn summary of the old messages.
      var summaryLines = oldMsgs.map(function (m) {
        var role = m.role === 'user' ? '用户' : '助手';
        // Truncate each turn's content to ~120 chars in the summary, then
        // strip lone surrogates left by the slice (litellm UTF-8 500 fix).
        var c = m.content.replace(/\s+/g, ' ').trim();
        if (c.length > 120) c = c.slice(0, 120) + '…';
        c = stripLoneSurrogates(c);
        return role + '：' + c;
      });
      var summary =
        '【较早的对话摘要，仅供你了解上下文，无需重新回答】\n' +
        summaryLines.join('\n');

      return [{ role: 'user', content: summary }].concat(recentMsgs);
    }

    /* ── STREAMING CHAT REQUEST ───────────────────────────────── */
    // cfg: config. history: prior turns. contextParts: extra context strings.
    // onDone(fullText), onError(msg). Returns { setChunkSink }.
    // Uses cfg.endpoint directly (full URL) — no base/path concatenation.
    function streamChat(cfg, history, contextParts, onDone, onError, abortSignal) {
      var sysPrompt = cfg.systemPrompt ||
        '你是一位耐心的编程导师，正在帮助一位学习者理解一份交互式课程的内容。' +
        '请用清晰、通俗的中文回答，必要时用代码示例。' +
        '如果学习者引用了选中文字，请优先基于引用内容回答问题，当前章节上下文仅作补充参考。';
      var ctxText = stripLoneSurrogates(contextParts.filter(Boolean).join('\n\n---\n\n'));
      // Sanitize history content too — old stored turns may carry lone
      // surrogates from earlier slices.
      history = history.map(function (m) {
        return { role: m.role, content: stripLoneSurrogates(m.content) };
      });
      var fullText = '';
      var onChunk = null;

      function fail(msg) { if (onError) onError(msg); }
      // Distinguish a user-initiated abort from a real error so we don't
      // show a scary "请求失败" message when the learner just hit Stop.
      function isAbortErr(e) { return e && (e.name === 'AbortError' || /aborted/i.test(e.message || '')); }

      if (cfg.format === 'claude') {
        /* ── Anthropic Messages API (/v1/messages, SSE) ─────── */
        var sysFull = sysPrompt + (ctxText ? '\n\n' + ctxText : '');
        var url = cfg.endpoint.replace(/\/+$/, '');
        var payload = {
          model: cfg.model,
          max_tokens: 2048,
          system: sysFull,
          messages: history,
          stream: true
        };
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': cfg.apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify(payload),
          signal: abortSignal
        }).then(function (res) {
          if (!res.ok) {
            return res.text().then(function (t) {
              throw new Error('HTTP ' + res.status + ' — ' + (t.slice(0, 200) || res.statusText));
            });
          }
          var reader = res.body.getReader();
          var decoder = new TextDecoder();
          var buffer = '';
          function pump() {
            return reader.read().then(function (r) {
              if (r.done) { if (onDone) onDone(fullText); return; }
              buffer += decoder.decode(r.value, { stream: true });
              var parts = buffer.split('\n\n');
              buffer = parts.pop();
              for (var i = 0; i < parts.length; i++) {
                var dataLines = parts[i].split('\n').filter(function (l) {
                  return l.indexOf('data:') === 0;
                });
                for (var j = 0; j < dataLines.length; j++) {
                  var jsonStr = dataLines[j].replace(/^data:\s*/, '');
                  if (!jsonStr || jsonStr === '[DONE]') continue;
                  try {
                    var evt = JSON.parse(jsonStr);
                    if (evt.type === 'content_block_delta' && evt.delta && evt.delta.text) {
                      fullText += evt.delta.text;
                      if (onChunk) onChunk(fullText);
                    }
                  } catch (e) { /* ignore malformed */ }
                }
              }
              return pump();
            });
          }
          pump().catch(function (e) {
            if (isAbortErr(e)) { if (onDone) onDone(fullText); return; }
            fail(e.message || '请求失败');
          });
        }).catch(function (e) {
          if (isAbortErr(e)) { if (onDone) onDone(fullText); return; }
          fail(e.message || '网络错误');
        });

      } else {
        /* ── OpenAI-compatible (/v1/chat/completions, SSE) ───── */
        var url2 = cfg.endpoint.replace(/\/+$/, '');
        var messages = [];
        var sysWithCtx = sysPrompt + (ctxText ? '\n\n' + ctxText : '');
        messages.push({ role: 'system', content: sysWithCtx });
        for (var k = 0; k < history.length; k++) messages.push(history[k]);

        var payload2 = {
          model: cfg.model,
          messages: messages,
          stream: true,
          temperature: 0.7
        };
        fetch(url2, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + cfg.apiKey
          },
          body: JSON.stringify(payload2),
          signal: abortSignal
        }).then(function (res) {
          if (!res.ok) {
            return res.text().then(function (t) {
              throw new Error('HTTP ' + res.status + ' — ' + (t.slice(0, 200) || res.statusText));
            });
          }
          var reader = res.body.getReader();
          var decoder = new TextDecoder();
          var buffer = '';
          function pump() {
            return reader.read().then(function (r) {
              if (r.done) { if (onDone) onDone(fullText); return; }
              buffer += decoder.decode(r.value, { stream: true });
              var lines = buffer.split('\n');
              buffer = lines.pop();
              for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (line.indexOf('data:') !== 0) continue;
                var jsonStr = line.replace(/^data:\s*/, '');
                if (jsonStr === '[DONE]') { if (onDone) onDone(fullText); return; }
                try {
                  var chunk = JSON.parse(jsonStr);
                  var delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta;
                  if (delta && delta.content) {
                    fullText += delta.content;
                    if (onChunk) onChunk(fullText);
                  }
                } catch (e) { /* ignore */ }
              }
              return pump();
            });
          }
          pump().catch(function (e) {
            if (isAbortErr(e)) { if (onDone) onDone(fullText); return; }
            fail(e.message || '请求失败');
          });
        }).catch(function (e) {
          if (isAbortErr(e)) { if (onDone) onDone(fullText); return; }
          fail(e.message || '网络错误');
        });
      }

      return { setChunkSink: function (fn) { onChunk = fn; } };
    }

    /* ── SEND MESSAGE ─────────────────────────────────────────── */
    function sendMessage() {
      // Don't start a new request while one is streaming — the send button
      // is a Stop button in that state, and Enter shouldn't double-send.
      if (isStreaming) return;
      var raw = inputEl.value.trim();
      if (!raw) return;
      var cfg = loadConfig();
      if (!cfg.endpoint || !cfg.model || (!cfg.apiKey && !isLocalEndpoint(cfg.endpoint))) {
        addMessage('assistant', '⚠️ 还没配置好 API。请点右上角 **⚙️** 填写 Endpoint、Key，并点「获取模型」选择模型。');
        openSettings();
        return;
      }

      // Split the input into the auto-quoted reference (if any) and the
      // actual question. The quote is sent as context, not as the question.
      var quoteText = '';
      var question = raw;
      if (raw.indexOf(QUOTE_PREFIX) === 0) {
        var lines = raw.split('\n');
        var qLines = [];
        var restLines = [];
        var inQuote = true;
        for (var li = 0; li < lines.length; li++) {
          if (inQuote && (lines[li].indexOf('>') === 0 || lines[li].trim() === '')) {
            if (lines[li].indexOf('>') === 0) {
              // Strip the leading "> " or "> 引用：" from the first line.
              var stripped = lines[li].replace(/^>\s*/, '');
              if (stripped.indexOf('引用：') === 0) stripped = stripped.slice(3);
              qLines.push(stripped);
            }
          } else {
            inQuote = false;
            restLines.push(lines[li]);
          }
        }
        quoteText = stripLoneSurrogates(qLines.join('\n').trim());
        question = stripLoneSurrogates(restLines.join('\n').trim());
      }
      if (!question) {
        // User only quoted text without asking anything — nudge them.
        addMessage('assistant', '你引用了一段文字，但还没写问题。在引用下面输入你的问题再发送吧～');
        return;
      }

      // Quote text goes FIRST so the model prioritizes it over the
      // (much longer) module context. The system prompt also instructs
      // the model to treat the quote as primary and the module context
      // as supplementary background.
      var ctxParts = [];
      if (quoteText) {
        ctxParts.push('【学习者引用的选中文字（请优先基于这段文字回答）】\n' + quoteText);
      }
      var mod = getCurrentModule();
      if (mod) ctxParts.push(moduleContextText(mod));

      // Ensure there's an active session.
      var s = getActiveSession();
      if (!s) {
        s = newSession([]);
        var arr = loadSessions();
        arr.unshift(s);
        saveSessions(arr);
        setActiveSessionId(s.id);
      }

      // Clear any welcome message before adding real turns.
      if (!s.msgs.length) messagesEl.innerHTML = '';

      // Display: show the quote + question together so the user sees what
      // they referenced. API: send only the question (quote is in context).
      addMessage('user', question, { quote: quoteText || undefined });
      inputEl.value = '';
      autoresize();
      // Record this question into the recall history (for ↑/↓ in the input).
      pushHistory(question);
      var assistantEl = addMessage('assistant', '', { streaming: true });
      // Show animated bouncing dots while waiting for the first chunk.
      // The first setChunkSink callback overwrites innerHTML with
      // renderMarkdown(full), so the loading indicator disappears
      // naturally once text starts arriving.
      assistantEl.innerHTML = '<span class="ai-typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></span>';

      // ── Streaming lifecycle: send button becomes a Stop button until the
      //    answer finishes (normally or by abort). AbortController lets the
      //    learner interrupt a long/streaming answer mid-flight. The single
      //    click dispatcher (registered once above) reads the isStreaming /
      //    currentAbort flags, so we never attach a second click listener
      //    here (that was the bug: Stop clicks also fired sendMessage).
      var abortCtrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var SEND_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
      var STOP_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>';
      function enterStreamingMode() {
        isStreaming = true;
        currentAbort = abortCtrl;
        sendBtn.disabled = false;
        sendBtn.classList.remove('ai-send-disabled');
        sendBtn.classList.add('ai-send-stop');
        sendBtn.title = '停止生成';
        sendBtn.setAttribute('aria-label', '停止生成');
        sendBtn.innerHTML = STOP_SVG;
      }
      function exitStreamingMode() {
        isStreaming = false;
        currentAbort = null;
        sendBtn.classList.remove('ai-send-stop');
        sendBtn.title = '发送';
        sendBtn.setAttribute('aria-label', '发送');
        sendBtn.innerHTML = SEND_SVG;
      }
      enterStreamingMode();

      // Jump to the start of the just-created answer bubble so the user
      // lands on the answer's opening position right away. We then keep it
      // pinned during streaming unless the user scrolls away manually.
      var assistantBubble = assistantEl.closest('.ai-msg');
      function scrollIntoAnswer() {
        if (!assistantBubble) return;
        var top = assistantBubble.offsetTop - messagesEl.offsetTop - 8;
        messagesEl.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }
      // Defer one frame so layout has settled.
      requestAnimationFrame(scrollIntoAnswer);
      // During streaming we only auto-follow the answer if it's still in
      // view — if the user scrolls away (e.g. to read an earlier answer),
      // we don't yank the view back down.
      function isAnswerInView() {
        if (!assistantBubble) return false;
        var aTop = assistantBubble.offsetTop;
        var aBot = aTop + assistantBubble.offsetHeight;
        var vTop = messagesEl.scrollTop;
        var vBot = vTop + messagesEl.clientHeight;
        return aTop < vBot && aBot > vTop;
      }

      // History stores the quote so it survives a page reload / session switch.
      var userMsg = { role: 'user', content: question };
      if (quoteText) userMsg.quote = quoteText;

      // Compress history before sending so long sessions don't blow the
      // context window. We keep the most recent turns verbatim and fold
      // older turns into a single summary message — this caps the token
      // count while preserving the thread of the conversation.
      var apiHistory = compressHistory(s.msgs.concat([userMsg]));

      streamChat(cfg, apiHistory, ctxParts,
        function (fullText) {
          exitStreamingMode();
          // If aborted with no text yet, show a gentle "stopped" hint instead
          // of an empty bubble.
          if (!fullText || !fullText.trim()) {
            assistantEl.innerHTML = '<span class="ai-msg-stopped">⏹ 已停止生成。</span>';
            assistantEl.classList.remove('ai-msg-streaming');
            refreshQANav();
            return;
          }
          s.msgs.push(userMsg);
          s.msgs.push({ role: 'assistant', content: fullText });
          // Update title if it was still the default.
          if (s.title === '新对话') {
            s.title = deriveTitle(s.msgs);
            sessionsLabel.textContent = s.title;
          }
          // Persist sessions array.
          var all = loadSessions();
          for (var i = 0; i < all.length; i++) {
            if (all[i].id === s.id) { all[i] = s; break; }
          }
          saveSessions(all);
          assistantEl.classList.remove('ai-msg-streaming');
          // Streaming finished → render final + attach toolbar (copy + 加入笔记).
          assistantEl.innerHTML = renderMarkdown(fullText);
          var body = assistantEl.closest('.ai-msg-body');
          attachAnswerToolbar(body, fullText, assistantEl);
          refreshQANav();
        },
        function (errMsg) {
          exitStreamingMode();
          assistantEl.innerHTML = '<span class="ai-msg-error">⚠️ ' + esc(errMsg) + '</span><br><span class="ai-msg-error-hint">请检查 API 配置（⚙️）或网络。若为 CORS 错误，可能需要代理。</span>';
          assistantEl.classList.remove('ai-msg-streaming');
        },
        abortCtrl ? abortCtrl.signal : undefined
      ).setChunkSink(function (full) {
        assistantEl.innerHTML = renderMarkdown(full);
        // Only auto-follow if the answer is still in view. If the user has
        // scrolled away (e.g. reading an earlier answer), don't yank the
        // view back down — respect their scroll position.
        if (isAnswerInView()) {
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }
      });
    }

    /* ── QA NAVIGATION (scroll-tracked question list) ─────────── */
    // Populates the select with all user questions (Q1, Q2, …), highlights
    // the one whose answer is currently in view, and jumps to an answer
    // when a question is picked from the dropdown or the prev/next buttons.
    function refreshQANav() {
      var userBubbles = $$('.ai-msg-user', messagesEl);
      if (!userBubbles.length) {
        qaNav.hidden = true;
        return;
      }
      qaNav.hidden = false;
      // Rebuild the select options.
      qaSelect.innerHTML = '';
      userBubbles.forEach(function (b, i) {
        var num = b.getAttribute('data-qa-num') || (i + 1);
        var preview = b.getAttribute('data-qa-text') || ('问题 ' + num);
        var opt = document.createElement('option');
        opt.value = num;
        opt.textContent = 'Q' + num + ' · ' + preview;
        qaSelect.appendChild(opt);
      });
      updateActiveQA();
    }

    // Returns the scroll position (within messagesEl) at which `el`'s top sits.
    // Uses getBoundingClientRect so it works regardless of offsetParent nesting.
    function elTopInMessages(el) {
      return el.getBoundingClientRect().top
        - messagesEl.getBoundingClientRect().top
        + messagesEl.scrollTop;
    }

    // Highlights the question whose answer is currently in view.
    function updateActiveQA() {
      var userBubbles = $$('.ai-msg-user', messagesEl);
      if (!userBubbles.length) return;
      // The answer for question N is the next sibling bubble (assistant).
      // Find the last user bubble whose answer top is at or above the
      // messages viewport midpoint.
      var viewMid = messagesEl.scrollTop + messagesEl.clientHeight / 2;
      var activeNum = userBubbles[0].getAttribute('data-qa-num');
      for (var i = 0; i < userBubbles.length; i++) {
        var answer = userBubbles[i].nextElementSibling;
        if (answer) {
          var aTop = elTopInMessages(answer);
          if (aTop <= viewMid) {
            activeNum = userBubbles[i].getAttribute('data-qa-num');
          }
        }
      }
      if (qaSelect.value !== activeNum) qaSelect.value = activeNum;
    }

    // Jump to the answer for a given question number.
    function jumpToQA(num) {
      var target = messagesEl.querySelector('.ai-msg-user[data-qa-num="' + num + '"]');
      if (!target) return;
      var answer = target.nextElementSibling;
      var el = answer || target;
      messagesEl.scrollTo({
        top: elTopInMessages(el) - 8,
        behavior: 'smooth'
      });
    }

    qaSelect.addEventListener('change', function () {
      jumpToQA(qaSelect.value);
    });
    document.getElementById('ai-qa-prev').addEventListener('click', function () {
      var cur = parseInt(qaSelect.value, 10) || 1;
      if (cur > 1) { qaSelect.value = String(cur - 1); jumpToQA(String(cur - 1)); }
    });
    document.getElementById('ai-qa-next').addEventListener('click', function () {
      var cur = parseInt(qaSelect.value, 10) || 1;
      var max = qaSelect.options.length;
      if (cur < max) { qaSelect.value = String(cur + 1); jumpToQA(String(cur + 1)); }
    });

    // Track scroll inside the messages panel to update the active question.
    messagesEl.addEventListener('scroll', function () {
      requestAnimationFrame(updateActiveQA);
    }, { passive: true });

    /* ── INITIALIZE ON LOAD ───────────────────────────────────── */
    renderActiveSession();
    refreshContextPill();
    refreshQANav();
  })();

  /* ============================================================
     COURSE OUTLINE (left sidebar)
     Builds a collapsible table-of-contents from the .module sections
     on the page. Two-level: module title → subsection titles (h3).
     Tracks scroll to highlight + auto-expand the active module.
     Collapses to a thin rail of dots so it stays out of the way.

     Mounts only if #course-outline exists (gated by _base.html).
     ============================================================ */
  (function initOutline() {
    var mount = document.getElementById('course-outline');
    if (!mount) return;

    var mods = $$('.module');
    if (!mods.length) { mount.style.display = 'none'; return; }

    function esc(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Build a two-level tree: each module → its .screen-heading subsections.
    // WHY screen-heading only: h4.pattern-title is too granular for navigation,
    // and h3.quiz-question is quiz content, not a navigable section.
    var entries = mods.map(function (m, i) {
      var numEl = m.querySelector('.module-number');
      var titleEl = m.querySelector('.module-title, .module-header h2, h2');
      var subs = $$('.screen-heading', m).map(function (h, j) {
        // Assign a generated id for anchor jumping (headings have none by default).
        var sid = (m.id || 'mod-' + (i + 1)) + '-s' + (j + 1);
        h.id = sid;
        return { id: sid, title: h.textContent.trim() };
      });
      return {
        el: m,
        id: m.id,
        index: i,
        num: numEl ? numEl.textContent.trim() : String(i + 1),
        title: titleEl ? titleEl.textContent.trim() : ('Module ' + (i + 1)),
        subs: subs
      };
    });

    // Expanded list: module rows with collapsible subsection groups.
    var listHTML = '<div class="outline-inner">' +
      '<div class="outline-heading">课程大纲</div>';
    entries.forEach(function (e) {
      listHTML +=
        '<div class="outline-group" data-outline-index="' + e.index + '">' +
          '<div class="outline-item outline-module" data-target="' + e.id + '">' +
            (e.subs.length ? '<button class="outline-caret" aria-label="展开/折叠" tabindex="-1">' +
              '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>' +
            '</button>' : '<span class="outline-caret-placeholder"></span>') +
            '<span class="outline-num">' + esc(e.num) + '</span>' +
            '<span class="outline-title">' + esc(e.title) + '</span>' +
          '</div>';
      if (e.subs.length) {
        listHTML += '<div class="outline-subs">';
        e.subs.forEach(function (s) {
          listHTML +=
            '<div class="outline-subitem" data-target="' + s.id + '">' +
              '<span class="outline-sub-bullet">·</span>' +
              '<span class="outline-sub-title">' + esc(s.title) + '</span>' +
            '</div>';
        });
        listHTML += '</div>';
      }
      listHTML += '</div>';
    });
    listHTML += '</div>';

    // Collapsed rail (just module dots)
    var railHTML = '<div class="outline-inner-rail">';
    entries.forEach(function (e) {
      railHTML += '<div class="outline-rail-dot" data-outline-index="' + e.index + '" data-target="' + e.id + '" title="' + esc(e.title) + '"></div>';
    });
    railHTML += '</div>';

    mount.innerHTML =
      '<button class="outline-toggle" id="outline-toggle" title="折叠/展开大纲" aria-label="折叠/展开大纲">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>' +
      '</button>' +
      listHTML +
      railHTML;

    /* ── OUTLINE COLLAPSE STATE (persisted, per-course) ────────── */
    var COLLAPSE_KEY = c2cKey('c2c_outline_collapsed');
    function isCollapsed() {
      try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch (e) { return false; }
    }
    function setCollapsed(v) {
      try { localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0'); } catch (e) {}
    }
    function applyCollapsed() {
      mount.classList.toggle('outline-collapsed', isCollapsed());
    }
    applyCollapsed();
    document.getElementById('outline-toggle').addEventListener('click', function () {
      setCollapsed(!isCollapsed());
      applyCollapsed();
    });

    /* ── MODULE ACCORDION (expand/collapse subsections) ───────── */
    var groups = $$('.outline-group', mount);
    function expandGroup(idx) {
      groups.forEach(function (g, i) {
        g.classList.toggle('expanded', i === idx);
      });
    }
    // Click on caret toggles that group only (no jump).
    mount.addEventListener('click', function (e) {
      var caret = e.target.closest('.outline-caret');
      if (!caret) return;
      e.stopPropagation();
      var group = caret.closest('.outline-group');
      var idx = parseInt(group.getAttribute('data-outline-index'), 10);
      group.classList.toggle('expanded');
    });

    /* ── CLICK → JUMP ──────────────────────────────────────────── */
    // WHY getBoundingClientRect instead of offsetTop: offsetTop is relative
    // to the offsetParent, which varies when nested interactive elements
    // (flow animations, arch diagrams) set position:relative. rect.top +
    // scrollY always gives the true document-absolute position.
    function docTop(el) {
      var r = el.getBoundingClientRect();
      return r.top + window.scrollY;
    }
    function jumpTo(targetId) {
      var target = document.getElementById(targetId);
      if (!target) return;
      var navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 50;
      var offset = docTop(target) - navH - 16;
      window.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
    }
    mount.addEventListener('click', function (e) {
      // Ignore clicks on the caret (handled above) and the toggle button.
      if (e.target.closest('.outline-caret') || e.target.closest('.outline-toggle')) return;
      var item = e.target.closest('[data-target]');
      if (!item) return;
      jumpTo(item.getAttribute('data-target'));
      if (isCollapsed()) { setCollapsed(false); applyCollapsed(); }
    });

    /* ── SCROLL → HIGHLIGHT + AUTO-EXPAND ─────────────────────── */
    var subitems = $$('.outline-subitem', mount);
    var dots = $$('.outline-rail-dot', mount);

    function updateActive() {
      var scrollMid = window.scrollY + window.innerHeight / 2;
      var activeModIdx = 0;
      var activeSub = null;

      // Find active module using absolute document positions.
      for (var i = 0; i < mods.length; i++) {
        var top = docTop(mods[i]);
        var bottom = top + mods[i].offsetHeight;
        if (scrollMid >= top && scrollMid < bottom) { activeModIdx = i; break; }
        if (scrollMid >= bottom) activeModIdx = i;
      }

      // Within the active module, find the subsection whose top is closest
      // to (but at or above) the scroll midpoint.
      var activeEntry = entries[activeModIdx];
      if (activeEntry) {
        var subs = $$('.screen-heading', activeEntry.el);
        var bestOffset = -Infinity;
        for (var j = 0; j < subs.length; j++) {
          var off = docTop(subs[j]) - scrollMid;
          if (off <= 80 && off > bestOffset) {
            bestOffset = off;
            activeSub = subs[j].id;
          }
        }
      }

      // Highlight module rows + dots.
      groups.forEach(function (g, i) {
        g.classList.toggle('active', i === activeModIdx);
      });
      dots.forEach(function (el, i) {
        el.classList.toggle('active', i === activeModIdx);
      });

      // Auto-expand the active module, collapse others.
      expandGroup(activeModIdx);

      // Highlight active subsection.
      subitems.forEach(function (el) {
        el.classList.toggle('active', el.getAttribute('data-target') === activeSub);
      });
    }
    window.addEventListener('scroll', function () {
      requestAnimationFrame(updateActive);
    }, { passive: true });
    updateActive();
  })();

  /* ============================================================
     NOTES SIDEBAR — learner's personal notes
     Mounts only if #notes-sidebar exists (gated by _base.html NOTES_SIDEBAR).
     - Floating 📒 button (bottom-right, above the AI FAB) toggles a panel.
     - Add notes two ways:
       (a) Select text on the page → a floating bar appears with two
           buttons: "📝 加笔记" (opens the notes editor with the selection
           as the title + anchor) and "💬 问 AI" (opens the AI panel with
           the selection as a quoted question).
       (b) "＋ 新建" button inside the panel → blank editor.
     - Each note stores: id, title, content, moduleId, moduleTitle,
       anchorText (the selected text snippet, for re-locating), createdAt.
     - Clicking a note jumps to its module and highlights the anchor text.
     - All notes persist in localStorage (per-course, never uploaded).
     ============================================================ */
  (function initNotes() {
    const mount = document.getElementById('notes-sidebar');
    if (!mount) return;

    var NOTES_KEY = c2cKey('c2c_notes');   // per-course
    var MAX_ANCHOR = 80;   // snippet length stored for re-location

    function esc(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function loadNotes() {
      try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '[]'); }
      catch (e) { return []; }
    }
    function saveNotes(arr) {
      try { localStorage.setItem(NOTES_KEY, JSON.stringify(arr)); }
      catch (e) {}
    }

    // ── current module detection (self-contained; can't reuse the AI
    //    helper because it lives in a separate IIFE) ──────────────
    function getCurrentModule() {
      var mid = window.scrollY + window.innerHeight / 2;
      var mods = $$('.module');
      for (var i = 0; i < mods.length; i++) {
        var top = mods[i].offsetTop;
        var bot = top + mods[i].offsetHeight;
        if (mid >= top && mid < bot) return mods[i];
      }
      return mods[0] || null;
    }
    function moduleTitleOf(mod) {
      if (!mod) return '';
      var h = mod.querySelector('.module-title, .module-header h2, h2');
      return h ? h.textContent.trim() : ('Module ' + (mod.id || ''));
    }

    function docTop(el) {
      var r = el.getBoundingClientRect();
      return r.top + window.scrollY;
    }

    // ── DOM construction ─────────────────────────────────────────
    mount.innerHTML =
      '<button class="notes-fab" id="notes-fab" aria-label="笔记" title="我的笔记">' +
        '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
          '<polyline points="14 2 14 8 20 8"/>' +
          '<line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>' +
        '</svg>' +
        '<span class="notes-fab-badge" id="notes-fab-badge" hidden></span>' +
      '</button>' +
      '<div class="notes-panel" id="notes-panel" hidden>' +
        '<header class="notes-header">' +
          '<span class="notes-title">📒 我的笔记</span>' +
          '<div class="notes-header-actions">' +
            '<button class="notes-icon-btn" id="notes-open-ai-btn" title="打开 AI 助手" aria-label="打开 AI 助手">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
            '</button>' +
            '<button class="notes-icon-btn" id="notes-new-btn" title="新建笔记" aria-label="新建笔记">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>' +
            '</button>' +
            '<button class="notes-icon-btn" id="notes-export-btn" title="导出笔记到文件" aria-label="导出笔记">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
            '</button>' +
            '<button class="notes-icon-btn" id="notes-export-md-btn" title="批量导出为 Markdown" aria-label="批量导出MD">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13l2 2 4-4"/></svg>' +
            '</button>' +
            '<button class="notes-icon-btn" id="notes-import-btn" title="从文件导入笔记" aria-label="导入笔记">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
            '</button>' +
            '<button class="notes-icon-btn" id="notes-close-btn" title="收起" aria-label="收起">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>' +
            '</button>' +
          '</div>' +
        '</header>' +
        '<div class="notes-list" id="notes-list"></div>' +
        '<div class="notes-editor" id="notes-editor" hidden>' +
          '<input class="notes-editor-title" id="notes-editor-title" type="text" placeholder="笔记标题（如：action_flow）" />' +
          '<textarea class="notes-editor-body" id="notes-editor-body" placeholder="写点什么…（支持换行）" rows="4"></textarea>' +
          '<div class="notes-editor-actions">' +
            '<button class="notes-btn-secondary" id="notes-editor-cancel">取消</button>' +
            '<button class="notes-btn-primary" id="notes-editor-save">保存</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    // ── selection bar (加笔记 / 问 AI) ───────────────────────────
    // Appears near the selection whenever the learner selects text in the
    // course content. Offers two actions side by side:
    //   📝 加笔记 → open the notes editor with the selection as anchor
    //   💬 问 AI  → open the AI panel and fill the input with a quote block
    var selectBar = document.createElement('div');
    selectBar.className = 'notes-select-bar';
    selectBar.id = 'notes-select-bar';
    selectBar.hidden = true;
    selectBar.innerHTML =
      '<button class="notes-select-btn notes-select-note" data-act="note">' +
        '📝 加笔记' +
      '</button>' +
      '<button class="notes-select-btn notes-select-ai" data-act="ai">' +
        '💬 问 AI' +
      '</button>';
    document.body.appendChild(selectBar);

    function selectionInContent() {
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed) return null;
      var text = sel.toString().trim();
      if (text.length < 2) return null;
      var node = sel.anchorNode;
      if (!node) return null;
      // Selections in the main content OR inside the AI assistant's message
      // area both count — the learner may select text from an AI answer to
      // turn it into a note. (The notes panel itself is excluded by the
      // mouseup guard so panel clicks don't trigger the bar.)
      var main = document.getElementById('main');
      if (main && main.contains(node)) return { text: text, sel: sel };
      var aiPanel = document.getElementById('ai-panel');
      if (aiPanel && !aiPanel.hidden && aiPanel.contains(node)) {
        return { text: text, sel: sel, fromAI: true };
      }
      return null;
    }

    function positionBar(sel) {
      var range = sel.getRangeAt(0);
      var rect = range.getBoundingClientRect();
      // Center the bar above the selection, clamped to the viewport.
      var barW = 200; // approximate; the bar is ~200px wide with two buttons
      var left = rect.left + rect.width / 2 - barW / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - barW - 8));
      selectBar.style.left = left + 'px';
      selectBar.style.top = (rect.top + window.scrollY - 44) + 'px';
    }

    document.addEventListener('mouseup', function (e) {
      // Don't show the bar if the mouseup was inside the notes panel or on
      // the bar itself — those are clicks, not content selections.
      if (panel && !panel.hidden && panel.contains(e.target)) return;
      if (selectBar.contains(e.target)) return;
      setTimeout(function () {
        var info = selectionInContent();
        if (info) {
          positionBar(info.sel);
          selectBar.hidden = false;
        } else {
          selectBar.hidden = true;
        }
      }, 10);
    });
    document.addEventListener('mousedown', function (e) {
      // Clicking the bar itself: preventDefault so the browser doesn't
      // collapse the text selection before the click event fires (which
      // would make selectionInContent() return null and the handlers bail).
      if (selectBar.contains(e.target)) { e.preventDefault(); return; }
      selectBar.hidden = true;
    });

    // ── element refs ─────────────────────────────────────────────
    var fab        = document.getElementById('notes-fab');
    var badge      = document.getElementById('notes-fab-badge');
    var panel      = document.getElementById('notes-panel');
    var listEl     = document.getElementById('notes-list');
    var editor     = document.getElementById('notes-editor');
    var edTitle    = document.getElementById('notes-editor-title');
    var edBody     = document.getElementById('notes-editor-body');
    var edSave     = document.getElementById('notes-editor-save');
    var edCancel   = document.getElementById('notes-editor-cancel');
    var newBtn     = document.getElementById('notes-new-btn');
    var openAiBtn  = document.getElementById('notes-open-ai-btn');
    var closeBtn   = document.getElementById('notes-close-btn');
    var exportBtn  = document.getElementById('notes-export-btn');
    var exportMdBtn = document.getElementById('notes-export-md-btn');
    var importBtn  = document.getElementById('notes-import-btn');

    // ── editor state ─────────────────────────────────────────────
    var editingId = null;
    var pendingAnchor = null;   // {text, moduleId, moduleTitle} from selection

    function openPanel() {
      panel.hidden = false;
      // Close the AI panel FIRST (mutual exclusion), through its own close
      // path so the AI FAB stays in sync. Must happen before we set our own
      // FAB classes — AI.closePanel() clears notes-fab-active, so adding it
      // afterwards would be undone.
      if (typeof window.c2cCloseAIPanel === 'function') window.c2cCloseAIPanel();
      // Now hide our own FAB (panel is open) and the AI FAB (don't let it
      // float over the notes panel).
      fab.classList.add('notes-fab-active');
      var aiFab = document.getElementById('ai-fab');
      if (aiFab) aiFab.classList.add('ai-fab-active');
      // Sync the sidebar-open push AFTER the mutual-exclusion close.
      updateSidebarState();
      renderList();
    }
    function closePanel() {
      panel.hidden = true;
      fab.classList.remove('notes-fab-active');
      // Restore the AI FAB.
      var aiFab = document.getElementById('ai-fab');
      if (aiFab) aiFab.classList.remove('ai-fab-active');
      editor.hidden = true;
      selectBar.hidden = true;
      // Re-evaluate sidebar-open: the AI panel may still be open, in which
      // case the push must remain. Only clears when BOTH panels are closed.
      updateSidebarState();
    }
    // Let the AI module close the notes panel through this path (sync FAB).
    window.c2cCloseNotesPanel = function () {
      if (panel && !panel.hidden) closePanel();
    };
    // Let the AI module open the notes panel (cross-panel navigation from the
    // AI header's 📒 button). Opens even if currently closed.
    window.c2cOpenNotesPanel = function () {
      if (panel && panel.hidden) openPanel();
    };
    function togglePanel() { panel.hidden ? openPanel() : closePanel(); }

    fab.addEventListener('click', togglePanel);
    closeBtn.addEventListener('click', closePanel);
    // Cross-panel: open the AI sidebar from the notes header.
    if (openAiBtn) {
      openAiBtn.addEventListener('click', function () {
        if (typeof window.c2cOpenAIPanel === 'function') window.c2cOpenAIPanel();
      });
    }

    // Wheel isolation for the notes panel — same scroll-containment idea as
    // the AI sidebar: let the list scroll natively, only preventDefault at a
    // boundary so the wheel never bleeds through to the content page behind.
    mount.addEventListener('wheel', function (e) {
      if (panel.hidden) return; // panel closed → let the page scroll normally
      var node = e.target;
      var scroller = null;
      while (node && node !== mount) {
        if (node.scrollHeight > node.clientHeight + 1) {
          var st = getComputedStyle(node);
          if (/auto|scroll/.test(st.overflowY)) { scroller = node; break; }
        }
        node = node.parentElement;
      }
      if (!scroller) { e.preventDefault(); return; }
      var atTop = scroller.scrollTop <= 0;
      var atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
      var goingUp = e.deltaY < 0;
      var goingDown = e.deltaY > 0;
      if ((goingUp && atTop) || (goingDown && atBottom)) e.preventDefault();
    }, { passive: false });

    /* ── EXPORT / IMPORT (backup to the course directory) ──────── */
    // Export: download a JSON file (notes + AI sessions for this course)
    // the user can place next to the course HTML.
    // Import: pick a previously exported file → merge into localStorage.
    // NOTE: a sandboxed web page can't read/write the local filesystem
    // directly, so we use a download link + a file picker — the closest
    // browser-native equivalent to "save to the course directory".

    // Export a single note as a standalone Markdown file.
    function exportNoteAsMarkdown(n) {
      var lines = [];
      lines.push('# ' + (n.title || '(无标题)'));
      lines.push('');
      if (n.moduleTitle) {
        lines.push('> 来源：' + n.moduleTitle);
        lines.push('');
      }
      if (n.anchorText) {
        lines.push('> 引用：' + n.anchorText);
        lines.push('');
      }
      lines.push(n.content || '');
      var md = lines.join('\n');
      var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      // Slugify the title for a clean filename.
      var fname = (n.title || 'note').replace(/[^\w一-鿿]+/g, '_').replace(/^_+|_+$/g, '') || 'note';
      a.download = fname + '.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    // Shared builder so single + batch exports stay in sync.
    function noteToMarkdown(n) {
      var lines = [];
      lines.push('# ' + (n.title || '(无标题)'));
      lines.push('');
      if (n.moduleTitle) { lines.push('> 来源：' + n.moduleTitle); lines.push(''); }
      if (n.anchorText) { lines.push('> 引用：' + n.anchorText); lines.push(''); }
      lines.push(n.content || '');
      return lines.join('\n');
    }

    // Batch export: all notes as a single combined Markdown file, separated
    // by horizontal rules. Falls back to an empty-state message if none.
    function exportAllNotesAsMarkdown() {
      var arr = loadNotes();
      if (!arr.length) { alert('还没有笔记可以导出。'); return; }
      var parts = arr.map(function (n, i) {
        return noteToMarkdown(n) + '\n\n---\n';
      });
      var md = '# ' + (document.title || '课程笔记') + ' — 全部笔记 (' + arr.length + ' 条)\n\n' + parts.join('\n');
      var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'notes-' + COURSE_SLUG + '-' + arr.length + '.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function exportCourseData() {
      var data = {
        course: document.title,
        slug: COURSE_SLUG,
        exportedAt: new Date().toISOString(),
        notes: loadNotes(),
        aiSessions: JSON.parse(localStorage.getItem(c2cKey('c2c_ai_sessions')) || '[]'),
        aiActive: localStorage.getItem(c2cKey('c2c_ai_active'))
      };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'course-notes-' + COURSE_SLUG + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function importCourseData(file, onDone) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          if (data.notes && Array.isArray(data.notes)) {
            saveNotes(data.notes);
          }
          if (data.aiSessions && Array.isArray(data.aiSessions)) {
            localStorage.setItem(c2cKey('c2c_ai_sessions'), JSON.stringify(data.aiSessions));
          }
          if (data.aiActive) {
            localStorage.setItem(c2cKey('c2c_ai_active'), data.aiActive);
          }
          onDone && onDone(true);
        } catch (e) {
          onDone && onDone(false, e.message);
        }
      };
      reader.readAsText(file);
    }

    exportBtn.addEventListener('click', exportCourseData);
    if (exportMdBtn) exportMdBtn.addEventListener('click', exportAllNotesAsMarkdown);

    // Hidden file input reused for import.
    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    importBtn.addEventListener('click', function () { fileInput.value = ''; fileInput.click(); });
    fileInput.addEventListener('change', function () {
      if (!fileInput.files || !fileInput.files[0]) return;
      importCourseData(fileInput.files[0], function (ok, err) {
        if (ok) {
          renderList();
          updateBadge();
          alert('导入成功。笔记已更新。');
        } else {
          alert('导入失败：' + (err || '文件格式不正确'));
        }
      });
    });

    function updateBadge() {
      var n = loadNotes().length;
      if (n > 0) { badge.textContent = n; badge.hidden = false; }
      else { badge.hidden = true; }
    }

    // ── editor open/close ────────────────────────────────────────
    function openEditor(opts) {
      opts = opts || {};
      editingId = opts.id || null;
      edTitle.value = opts.title || '';
      edBody.value = opts.content || '';
      pendingAnchor = opts.anchor || null;
      editor.hidden = false;
      edTitle.focus();
    }
    function closeEditor() {
      editor.hidden = true;
      editingId = null;
      pendingAnchor = null;
    }

    newBtn.addEventListener('click', function () {
      // Capture current module for a blank note too.
      var mod = getCurrentModule();
      openEditor({
        anchor: mod ? {
          text: '',
          moduleId: mod.id || '',
          moduleTitle: moduleTitleOf(mod)
        } : null
      });
    });

    edCancel.addEventListener('click', closeEditor);

    edSave.addEventListener('click', function () {
      var title = edTitle.value.trim();
      var content = edBody.value.trim();
      if (!title && !content) { closeEditor(); return; }
      // Use title as anchorText fallback if no selection anchor was captured.
      var anchorText = (pendingAnchor && pendingAnchor.text) || title || '';
      if (anchorText.length > MAX_ANCHOR) anchorText = anchorText.slice(0, MAX_ANCHOR);
      var mid = (pendingAnchor && pendingAnchor.moduleId) || '';
      var mTitle = (pendingAnchor && pendingAnchor.moduleTitle) || '';
      // If no module was captured (rare), try to grab the current one.
      if (!mid) { var m = getCurrentModule(); if (m) { mid = m.id || ''; mTitle = moduleTitleOf(m); } }

      var arr = loadNotes();
      if (editingId) {
        for (var i = 0; i < arr.length; i++) {
          if (arr[i].id === editingId) {
            arr[i].title = title;
            arr[i].content = content;
            arr[i].anchorText = anchorText;
            arr[i].moduleId = mid;
            arr[i].moduleTitle = mTitle;
            arr[i].updatedAt = Date.now();
            break;
          }
        }
      } else {
        arr.unshift({
          id: 'n' + Date.now() + Math.random().toString(36).slice(2, 6),
          title: title,
          content: content,
          anchorText: anchorText,
          moduleId: mid,
          moduleTitle: mTitle,
          createdAt: Date.now()
        });
      }
      saveNotes(arr);
      closeEditor();
      renderList();
      updateBadge();
    });

    // ── selection bar click → note or AI ─────────────────────────
    selectBar.addEventListener('click', function (e) {
      e.stopPropagation();
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var info = selectionInContent();
      if (!info) { selectBar.hidden = true; return; }
      var act = btn.getAttribute('data-act');

      if (act === 'note') {
        // The selected text goes into the CONTENT body (not the title) so
        // the learner can annotate around it. The title is auto-derived
        // from the first line of the selection; the user can edit either.
        var selText = info.text;
        var autoTitle = selText.split('\n')[0].slice(0, 40);
        // Anchor/source: only capture a module when the selection came from
        // the main content. Selections from the AI panel have no source
        // module; tag them so the note records their origin.
        var anchorObj = null;
        if (info.fromAI) {
          anchorObj = { text: selText.slice(0, MAX_ANCHOR), moduleId: '', moduleTitle: 'AI 助手' };
        } else {
          var mod = getCurrentModule();
          anchorObj = mod ? {
            text: selText.slice(0, MAX_ANCHOR),
            moduleId: mod.id || '',
            moduleTitle: moduleTitleOf(mod)
          } : { text: selText.slice(0, MAX_ANCHOR), moduleId: '', moduleTitle: '' };
        }
        // Open the notes panel (which closes the AI panel via its own
        // mutual-exclusion hook, keeping FAB state in sync) and the editor.
        openEditor({
          title: autoTitle,
          content: selText,
          anchor: anchorObj
        });
        // Clear the selection so it doesn't linger.
        try { window.getSelection().removeAllRanges(); } catch (err) {}
        selectBar.hidden = true;
        if (panel.hidden) openPanel();
      } else if (act === 'ai') {
        // Ask AI: open the AI panel and fill the input with a quote.
        if (typeof window.c2cAskAIWithQuote === 'function') {
          window.c2cAskAIWithQuote(info.text);
        }
        // Clear the selection — the AI panel now holds the quote.
        try { window.getSelection().removeAllRanges(); } catch (err) {}
        selectBar.hidden = true;
      }
    });

    // ── render the notes list ────────────────────────────────────
    function renderList() {
      var arr = loadNotes();
      if (!arr.length) {
        listEl.innerHTML =
          '<div class="notes-empty">还没有笔记。<br>选中正文里的词，点「📝 加笔记」，<br>或点右上角＋新建。</div>';
        return;
      }
      var html = '';
      arr.forEach(function (n) {
        var date = new Date(n.createdAt || Date.now());
        var dateStr = (date.getMonth() + 1) + '/' + date.getDate();
        var hasContent = n.content && n.content.trim();
        html +=
          '<div class="note-card" data-id="' + n.id + '">' +
            '<div class="note-card-head">' +
              '<button class="note-caret" data-act="toggle" aria-label="展开/折叠">' +
                '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>' +
              '</button>' +
              '<div class="note-card-title">' + esc(n.title || '(无标题)') + '</div>' +
              // Action icons live next to the title so they're reachable
              // without expanding the card. They fade in on hover.
              '<div class="note-card-icons">' +
                (n.moduleTitle ? '<button class="note-ico" data-act="jump" title="跳转到 ' + esc(n.moduleTitle) + '"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></button>' : '') +
                '<button class="note-ico" data-act="edit" title="编辑"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg></button>' +
                '<button class="note-ico" data-act="export-md" title="导出 Markdown"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></button>' +
                '<button class="note-ico note-ico-danger" data-act="del" title="删除"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>' +
              '</div>' +
            '</div>' +
            // Collapsible detail: only visible when expanded (toggle).
            '<div class="note-card-detail" hidden>' +
              (hasContent ? '<div class="note-card-body">' + esc(n.content).replace(/\n/g, '<br>') + '</div>' : '<div class="note-card-body notes-muted">（无内容）</div>') +
              '<div class="note-card-meta">' +
                '<span class="note-card-date">' + dateStr + (n.moduleTitle ? ' · ' + esc(n.moduleTitle) : '') + '</span>' +
                '<button class="note-act note-act-collapse" data-act="toggle" title="折叠">▲ 折叠</button>' +
              '</div>' +
            '</div>' +
          '</div>';
      });
      listEl.innerHTML = html;
    }

    // ── list interactions (jump / edit / delete) ─────────────────
    listEl.addEventListener('click', function (e) {
      var card = e.target.closest('.note-card');
      if (!card) return;
      var id = card.getAttribute('data-id');
      var actEl = e.target.closest('[data-act]');
      var act = actEl ? actEl.getAttribute('data-act') : '';

      // Toggle expand/collapse — triggered ONLY by the caret button or a
      // click on the title text. Clicks inside the expanded content (body,
      // meta, jump link) must NOT collapse the card, and clicks on action
      // icons (edit/del/export/jump) are handled by their own branches below.
      var onHead = e.target.closest('.note-card-head');
      if (act === 'toggle' || (onHead && !act)) {
        var detail = card.querySelector('.note-card-detail');
        if (detail) {
          detail.hidden = !detail.hidden;
          var caret = card.querySelector('.note-caret');
          if (caret) caret.classList.toggle('expanded', !detail.hidden);
        }
        return;
      }

      // A click on the title row that had no action button — already handled
      // above. Any other click without a data-act (e.g. inside the body) is a
      // no-op: do nothing, let the user read the content.
      if (!act) return;

      if (act === 'edit') {
        var n = loadNotes().filter(function (x) { return x.id === id; })[0];
        if (!n) return;
        openEditor({
          id: id,
          title: n.title,
          content: n.content,
          anchor: { text: n.anchorText, moduleId: n.moduleId, moduleTitle: n.moduleTitle }
        });
        return;
      }
      if (act === 'del') {
        if (!confirm('删除这条笔记？')) return;
        var arr2 = loadNotes().filter(function (x) { return x.id !== id; });
        saveNotes(arr2);
        renderList();
        updateBadge();
        return;
      }
      if (act === 'export-md') {
        var nm = loadNotes().filter(function (x) { return x.id === id; })[0];
        if (nm) exportNoteAsMarkdown(nm);
        return;
      }
      // 'jump': locate the source
      var note = loadNotes().filter(function (x) { return x.id === id; })[0];
      if (!note) return;
      jumpToNote(note);
      closePanel();
    });

    // ── jump to the note's source & highlight ────────────────────
    function jumpToNote(note) {
      var mod = note.moduleId ? document.getElementById(note.moduleId) : null;
      if (!mod) {
        // Module gone? just scroll to top.
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      // Scroll to module top first.
      var navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 50;
      var offset = docTop(mod) - navH - 16;
      window.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });

      // Then try to find the anchor text inside the module and flash it.
      var anchor = (note.anchorText || '').trim();
      if (!anchor) return;
      // Search text nodes in the module for the anchor snippet.
      var found = findAndHighlight(mod, anchor);
      if (!found) {
        // If the exact snippet isn't found (content may have changed),
        // silently leave the user at the module top — that's still useful.
      }
    }

    // Highlights the first occurrence of `text` inside `root` by wrapping it
    // in a <mark> with a flash animation, then removes the mark after a while.
    function findAndHighlight(root, text) {
      if (!text) return false;
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: function (node) {
          // Skip script/style/code/pre content — we want readable prose.
          var p = node.parentElement;
          if (!p) return NodeFilter.FILTER_REJECT;
          var tag = p.tagName.toLowerCase();
          if (tag === 'script' || tag === 'style' || tag === 'code' || tag === 'pre') {
            return NodeFilter.FILTER_REJECT;
          }
          return node.nodeValue.indexOf(text) !== -1
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
        }
      });
      var node = walker.nextNode();
      if (!node) return false;
      var value = node.nodeValue;
      var idx = value.indexOf(text);
      if (idx === -1) return false;
      var range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + text.length);
      var mark = document.createElement('mark');
      mark.className = 'notes-flash';
      try {
        range.surroundContents(mark);
      } catch (err) {
        // surroundContents fails if the range crosses element boundaries;
        // fall back to extract + insert.
        range.deleteContents();
        mark.appendChild(document.createTextNode(text));
        range.insertNode(mark);
      }
      // Re-scroll to the mark (more precise than module top).
      var navH2 = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 50;
      window.scrollTo({ top: Math.max(0, docTop(mark) - navH2 - 24), behavior: 'smooth' });
      // Remove the mark after 2.5s.
      setTimeout(function () {
        var parent = mark.parentNode;
        if (parent) {
          while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
          parent.removeChild(mark);
        }
      }, 2500);
      return true;
    }

    // ── global hook: let the AI module save an answer as a note ──
    // Returns true on success. Opens the notes panel so the learner sees it.
    window.c2cAddNote = function (title, content, moduleId, moduleTitle) {
      var t = (title || '').trim();
      var c = (content || '').trim();
      if (!t && !c) return false;
      var anchorText = t.slice(0, MAX_ANCHOR);
      var mid = moduleId || '';
      var mTitle = moduleTitle || '';
      if (!mid) { var m = getCurrentModule(); if (m) { mid = m.id || ''; mTitle = moduleTitleOf(m); } }
      var arr = loadNotes();
      arr.unshift({
        id: 'n' + Date.now() + Math.random().toString(36).slice(2, 6),
        title: t || '(AI 回答)',
        content: c,
        anchorText: anchorText,
        moduleId: mid,
        moduleTitle: mTitle,
        source: 'ai',
        createdAt: Date.now()
      });
      saveNotes(arr);
      renderList();
      updateBadge();
      // Jump to the notes panel so the learner sees the new note. The
      // sidebar-open push now stays correct across panel switches (see
      // updateSidebarState), so opening the notes panel from the AI chat no
      // longer leaves the content un-pushed. Returns the new note id so the
      // caller can highlight/scroll to it.
      openPanel();
      return arr[0].id;
    };

    // Let the AI module scroll to / highlight a freshly added note so the
    // learner sees where it landed. Safe to call right after c2cAddNote.
    window.c2cScrollToNote = function (id) {
      if (!id) return;
      // renderList() in c2cAddNote is synchronous, so the card exists now.
      // Defer the scroll one frame so the panel's slide-in animation has
      // started and the card has a measurable position.
      requestAnimationFrame(function () {
        var card = listEl.querySelector('.note-card[data-id="' + id + '"]');
        if (!card) return;
        // Briefly expand so the content is visible, then flash a highlight.
        var detail = card.querySelector('.note-card-detail');
        if (detail && detail.hidden) {
          detail.hidden = false;
          var caret = card.querySelector('.note-caret');
          if (caret) caret.classList.add('expanded');
        }
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('note-card-flash');
        setTimeout(function () { card.classList.remove('note-card-flash'); }, 1600);
      });
    };

    // Initial render + badge.
    updateBadge();
    // Re-render the list when the panel is reopened (notes may have changed
    // elsewhere — though in practice they only change here).
    renderList();
  })();

})();
