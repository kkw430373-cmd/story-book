/* ============================================
   K-Story Readers — Reading Mode (reader.js)
   TTS + STT + 발음 교정 + 진행률 저장
   ============================================ */

const ReadingMode = {

    story: null,
    sentences: [],
    currentIdx: 0,
    ttsActive: false,
    recognition: null,
    isRecording: false,
    totalCorrect: 0,
    totalWords: 0,
    sessionScores: [],

    wordDict: {
        'bibimbap':    { meaning: '비빔밥 — 한국 전통 혼합밥',       phonetic: '[biː.bim.bap]' },
        'chuseok':     { meaning: '추석 — 한국 추수 감사절',          phonetic: '[tɕʰu.sʌk]' },
        'kimchi':      { meaning: '김치 — 발효 채소 요리',            phonetic: '[kɪm.tɕʰi]' },
        'hanbok':      { meaning: '한복 — 한국 전통 의상',            phonetic: '[han.bok]' },
        'seollal':     { meaning: '설날 — 한국 음력 새해',            phonetic: '[sʌl.lal]' },
        'songpyeon':   { meaning: '송편 — 반달 모양 떡',              phonetic: '[soŋ.pjʌn]' },
        'taekwondo':   { meaning: '태권도 — 한국 무술',               phonetic: '[tʰɛk.wʌn.do]' },
        'haenyeo':     { meaning: '해녀 — 제주 해녀',                 phonetic: '[hɛ.njʌ]' },
        'ondol':       { meaning: '온돌 — 한국 바닥 난방',            phonetic: '[on.dol]' },
        'bulgogi':     { meaning: '불고기 — 양념 구이 소고기',         phonetic: '[pul.ɡo.ɡi]' },
        'dokkaebi':    { meaning: '도깨비 — 한국 민간 요정',           phonetic: '[tok.kɛ.bi]' },
        'tteok':       { meaning: '떡 — 한국 전통 쌀떡',              phonetic: '[tʰʌk]' },
        'hangeul':     { meaning: '한글 — 한국 고유 문자',             phonetic: '[han.ɡɯl]' },
        'jongmyo':     { meaning: '종묘 — 조선 왕실 사당',             phonetic: '[dʑoŋ.mjo]' },
        'gyeongbok':   { meaning: '경복 — 경복궁',                   phonetic: '[kjʌŋ.bok]' },
        'gather':      { meaning: '모이다, 모으다',                   phonetic: '[ˈɡæð.ər]' },
        'celebrate':   { meaning: '축하하다, 기념하다',                phonetic: '[ˈsel.ɪ.breɪt]' },
        'traditional': { meaning: '전통적인',                        phonetic: '[trəˈdɪʃ.ən.əl]' },
        'delicious':   { meaning: '맛있는',                          phonetic: '[dɪˈlɪʃ.əs]' },
        'colorful':    { meaning: '형형색색의, 다채로운',               phonetic: '[ˈkʌl.ər.fəl]' },
        'harvest':     { meaning: '수확, 추수',                       phonetic: '[ˈhɑːr.vɪst]' },
        'ancestor':    { meaning: '조상, 선조',                       phonetic: '[ˈæn.ses.tər]' },
        'culture':     { meaning: '문화',                            phonetic: '[ˈkʌl.tʃər]' },
        'season':      { meaning: '계절, 시기',                       phonetic: '[ˈsiː.zən]' },
        'beautiful':   { meaning: '아름다운',                         phonetic: '[ˈbjuː.tɪ.fəl]' },
        'palace':      { meaning: '궁궐, 궁전',                       phonetic: '[ˈpæl.ɪs]' },
        'ancient':     { meaning: '고대의, 오래된',                    phonetic: '[ˈeɪn.ʃənt]' },
        'festival':    { meaning: '축제',                            phonetic: '[ˈfes.tɪ.vəl]' },
        'lantern':     { meaning: '등불, 제등',                       phonetic: '[ˈlæn.tərn]' },
        'ceremony':    { meaning: '의식, 예식',                       phonetic: '[ˈser.ɪ.moʊ.ni]' },
        'kingdom':     { meaning: '왕국',                            phonetic: '[ˈkɪŋ.dəm]' },
        'together':    { meaning: '함께, 같이',                       phonetic: '[təˈɡeð.ər]' },
        'mountain':    { meaning: '산',                              phonetic: '[ˈmaʊn.tɪn]' },
        'river':       { meaning: '강',                              phonetic: '[ˈrɪv.ər]' },
        'family':      { meaning: '가족',                            phonetic: '[ˈfæm.ɪ.li]' },
        'families':    { meaning: 'family의 복수형 — 여러 가족들',      phonetic: '[ˈfæm.ɪ.liz]' },
        'holiday':     { meaning: '명절, 휴일',                       phonetic: '[ˈhɒl.ɪ.deɪ]' },
        'special':     { meaning: '특별한',                          phonetic: '[ˈspeʃ.əl]' },
        'enjoy':       { meaning: '즐기다',                          phonetic: '[ɪnˈdʒɔɪ]' },
        'wear':        { meaning: '입다, 착용하다',                    phonetic: '[wer]' },
        'shine':       { meaning: '빛나다',                          phonetic: '[ʃaɪn]' },
        'bright':      { meaning: '밝은, 빛나는',                     phonetic: '[braɪt]' },
        'brightly':    { meaning: '밝게',                            phonetic: '[ˈbraɪt.li]' },
        'bow':         { meaning: '절하다, 인사하다',                  phonetic: '[baʊ]' },
    },

    /* ── 진입점 ── */
    open(story) {
        this.story = story;
        this.sentences = this._parseSentences(story);
        this.totalCorrect = 0;
        this.totalWords = 0;
        this.sessionScores = [];

        // 저장된 진행률에서 이어읽기
        const saved = DataService.getProgress(story.id);
        this.currentIdx = (saved && !saved.completed && saved.lastSentence > 0)
            ? Math.min(saved.lastSentence, this.sentences.length - 1)
            : 0;

        this._buildDOM();
        this._bindEvents();
        this._renderSentence(this.currentIdx);

        document.getElementById('reader-overlay').classList.add('open');
        document.body.style.overflow = 'hidden';
    },

    close() {
        const overlay = document.getElementById('reader-overlay');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
        this._stopTTS();
        this._stopRecording();
        // 현재 위치 저장
        if (this.story) {
            DataService.saveProgress(this.story.id, {
                lastSentence: this.currentIdx,
                totalSentences: this.sentences.length,
                completed: false,
                score: this._avgScore()
            });
        }
    },

    /* ── 문장 파싱 ── */
    _parseSentences(story) {
        if (story.sentences && story.sentences.trim()) {
            return story.sentences.split('\n')
                .map(line => {
                    const parts = line.split('|');
                    return { en: (parts[0] || '').trim(), kr: (parts[1] || '').trim() };
                })
                .filter(s => s.en.length > 0);
        }
        if (story.description) {
            return story.description
                .split(/(?<=[.!?])\s+/)
                .filter(s => s.trim().length > 0)
                .map(s => ({ en: s.trim(), kr: '' }));
        }
        return [{ en: story.title, kr: story.titleKr || '' }];
    },

    /* ── DOM 생성 ── */
    _buildDOM() {
        if (document.getElementById('reader-overlay')) {
            this._updateHeader();
            return;
        }

        const stepInfo = CONFIG.STEPS[this.story.step] || CONFIG.STEPS[1];
        const sttOk = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

        const html = `
<div class="reader-overlay" id="reader-overlay">
  <div class="reader-panel">
    <div class="reader-drag-handle"></div>

    <div class="reader-header">
      <div class="reader-header-left">
        <span class="reader-step-pill step-${this.story.step}" id="rdr-step-pill">
          ${stepInfo.icon} ${stepInfo.name}
        </span>
        <span class="reader-story-name" id="rdr-story-name">${this._esc(this.story.title)}</span>
      </div>
      <button class="reader-close-btn" id="rdr-close">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="reader-progress-track">
      <div class="reader-progress-fill step-${this.story.step}" id="rdr-prog-fill"></div>
    </div>
    <div class="reader-progress-info">
      <span class="reader-progress-label" id="rdr-prog-label">문장 1 / 1</span>
      <span class="reader-progress-score-pill" id="rdr-score-pill"></span>
    </div>

    <div class="reader-body" id="rdr-body">

      <div id="rdr-content">
        <div class="reader-sentence-wrap">
          <div class="reader-sentence" id="rdr-sentence"></div>
        </div>

        <div class="reader-translation" id="rdr-translation" style="display:none;">
          <span style="font-size:14px; flex-shrink:0;">🇰🇷</span>
          <span id="rdr-translation-text"></span>
        </div>

        <div class="reader-word-card" id="rdr-word-card">
          <div class="reader-word-card-top">
            <div class="reader-word-card-left">
              <span class="reader-word-card-word" id="rdr-wc-word"></span>
              <span class="reader-word-card-phonetic" id="rdr-wc-phonetic"></span>
            </div>
            <button class="reader-word-card-speak" id="rdr-wc-speak">
              <i class="fas fa-volume-up"></i>
            </button>
          </div>
          <div class="reader-word-card-meaning" id="rdr-wc-meaning"></div>
        </div>

        <div class="reader-transcript-box" id="rdr-transcript-box">
          <span class="reader-transcript-icon">💬</span>
          <span class="reader-transcript-text" id="rdr-transcript">
            단어를 클릭하면 뜻을 볼 수 있어요. 먼저 읽어주기로 원어민 발음을 들어보세요.
          </span>
        </div>

        <div class="reader-score-panel" id="rdr-score-panel">
          <div class="reader-score-card">
            <div class="reader-score-val v-correct" id="rdr-sc-correct">0</div>
            <div class="reader-score-lbl">정확한 단어</div>
          </div>
          <div class="reader-score-card">
            <div class="reader-score-val v-wrong" id="rdr-sc-wrong">0</div>
            <div class="reader-score-lbl">틀린 단어</div>
          </div>
          <div class="reader-score-card">
            <div class="reader-score-val v-score" id="rdr-sc-score">-</div>
            <div class="reader-score-lbl">발음 점수</div>
          </div>
        </div>

        <div class="reader-feedback" id="rdr-feedback"></div>
      </div>

      <div class="reader-complete" id="rdr-complete">
        <div class="reader-complete-emoji">🎉</div>
        <div class="reader-complete-stars" id="rdr-stars">⭐⭐⭐</div>
        <div class="reader-complete-title">대단해요!</div>
        <div class="reader-complete-sub" id="rdr-complete-sub">스토리를 끝까지 읽었어요!</div>
        <div class="reader-complete-scores">
          <div class="reader-complete-score-item">
            <div class="reader-complete-score-val" id="rdr-final-score">-</div>
            <div class="reader-complete-score-lbl">전체 점수</div>
          </div>
          <div class="reader-complete-score-item">
            <div class="reader-complete-score-val" id="rdr-final-correct" style="color:#22c55e;">-</div>
            <div class="reader-complete-score-lbl">정확한 단어</div>
          </div>
        </div>
        <button class="reader-btn-restart" id="rdr-restart">
          🔄 처음부터 다시 읽기
        </button>
      </div>

    </div>

    <div class="reader-controls">
      <button class="reader-btn reader-btn-prev" id="rdr-prev" disabled>← 이전</button>

      <button class="reader-btn reader-btn-tts" id="rdr-tts">
        <span class="tts-static"><i class="fas fa-volume-up"></i></span>
        <span class="tts-wave">
          <span class="tts-bar"></span><span class="tts-bar"></span>
          <span class="tts-bar"></span><span class="tts-bar"></span>
          <span class="tts-bar"></span>
        </span>
        읽어주기
      </button>

      ${sttOk ? `
      <button class="reader-btn reader-btn-record" id="rdr-record">
        <span class="record-dot"></span>
        <span id="rdr-record-label">녹음하기</span>
      </button>` : `<span class="reader-stt-unavailable">음성인식 미지원</span>`}

      <button class="reader-btn reader-btn-next" id="rdr-next">다음 →</button>
    </div>
  </div>
</div>`;

        document.body.insertAdjacentHTML('beforeend', html);
    },

    _updateHeader() {
        const stepInfo = CONFIG.STEPS[this.story.step] || CONFIG.STEPS[1];
        const pill = document.getElementById('rdr-step-pill');
        const name = document.getElementById('rdr-story-name');
        const fill = document.getElementById('rdr-prog-fill');
        if (pill) {
            pill.className = `reader-step-pill step-${this.story.step}`;
            pill.textContent = `${stepInfo.icon} ${stepInfo.name}`;
        }
        if (name) name.textContent = this.story.title;
        if (fill) fill.className = `reader-progress-fill step-${this.story.step}`;
        // 완료 화면 초기화
        const complete = document.getElementById('rdr-complete');
        const content = document.getElementById('rdr-content');
        if (complete) complete.classList.remove('visible');
        if (content) content.style.display = '';
    },

    /* ── 이벤트 ── */
    _bindEvents() {
        document.getElementById('rdr-close')
            ?.addEventListener('click', () => this.close());

        document.getElementById('reader-overlay')
            ?.addEventListener('click', e => {
                if (e.target.id === 'reader-overlay') this.close();
            });

        document.getElementById('rdr-tts')
            ?.addEventListener('click', () => this._toggleTTS());

        document.getElementById('rdr-record')
            ?.addEventListener('click', () => this._toggleRecording());

        document.getElementById('rdr-prev')
            ?.addEventListener('click', () => this._navigate(-1));

        document.getElementById('rdr-next')
            ?.addEventListener('click', () => this._navigate(1));

        document.getElementById('rdr-wc-speak')
            ?.addEventListener('click', () => {
                const w = document.getElementById('rdr-wc-word').textContent;
                if (w) this._speakWord(w);
            });

        document.getElementById('rdr-restart')
            ?.addEventListener('click', () => {
                this.currentIdx = 0;
                this.totalCorrect = 0;
                this.totalWords = 0;
                this.sessionScores = [];
                document.getElementById('rdr-complete').classList.remove('visible');
                document.getElementById('rdr-content').style.display = '';
                this._renderSentence(0);
            });
    },

    /* ── 문장 렌더링 ── */
    _renderSentence(idx) {
        if (!this.sentences[idx]) return;
        const { en, kr } = this.sentences[idx];

        this._stopTTS();
        this._stopRecording();

        // 진행 바
        const pct = ((idx + 1) / this.sentences.length) * 100;
        const fill = document.getElementById('rdr-prog-fill');
        if (fill) fill.style.width = pct + '%';

        const lbl = document.getElementById('rdr-prog-label');
        if (lbl) lbl.textContent = `문장 ${idx + 1} / ${this.sentences.length}`;

        // 문장
        const sentEl = document.getElementById('rdr-sentence');
        if (sentEl) sentEl.innerHTML = this._tokenize(en);

        // 번역
        const transBox = document.getElementById('rdr-translation');
        const transText = document.getElementById('rdr-translation-text');
        if (transBox && transText) {
            if (kr) {
                transText.textContent = kr;
                transBox.style.display = 'flex';
            } else {
                transBox.style.display = 'none';
            }
        }

        // 리셋
        document.getElementById('rdr-word-card')?.classList.remove('visible');
        document.getElementById('rdr-score-panel')?.classList.remove('visible');
        const fb = document.getElementById('rdr-feedback');
        if (fb) fb.innerHTML = '';
        const trans = document.getElementById('rdr-transcript');
        if (trans) trans.textContent = '단어를 클릭하면 뜻을 볼 수 있어요. 먼저 읽어주기로 원어민 발음을 들어보세요.';
        const tbox = document.getElementById('rdr-transcript-box');
        if (tbox) { tbox.classList.remove('active', 'listening'); }

        // 네비
        const prev = document.getElementById('rdr-prev');
        const next = document.getElementById('rdr-next');
        if (prev) prev.disabled = idx === 0;
        if (next) next.textContent = idx === this.sentences.length - 1 ? '완료 ✓' : '다음 →';

        // 단어 클릭
        document.querySelectorAll('.reader-word').forEach(w => {
            w.addEventListener('click', () => this._onWordClick(w));
        });
    },

    /* ── 토큰화 ── */
    _tokenize(sentence) {
        return sentence.split(/(\s+)/).map(part => {
            if (/^\s+$/.test(part)) return ' ';
            const m = part.match(/^([^\w]*)(\w[\w'-]*)([^\w]*)$/);
            if (!m) return this._esc(part);
            const [, pre, word, post] = m;
            const hasInfo = !!this.wordDict[word.toLowerCase()];
            return `${this._esc(pre)}<span class="reader-word${hasInfo ? ' has-dict' : ''}" data-word="${this._esc(word)}">${this._esc(word)}</span>${this._esc(post)}`;
        }).join('');
    },

    /* ── 단어 클릭 ── */
    _onWordClick(el) {
        const word = el.dataset.word;
        if (!word) return;
        document.querySelectorAll('.reader-word.selected').forEach(w => w.classList.remove('selected'));
        el.classList.add('selected');
        const info = this.wordDict[word.toLowerCase()];
        const card = document.getElementById('rdr-word-card');
        document.getElementById('rdr-wc-word').textContent = word;
        document.getElementById('rdr-wc-phonetic').textContent = info?.phonetic || '';
        document.getElementById('rdr-wc-meaning').textContent = info?.meaning || '사전에 등록되지 않은 단어예요.';
        card?.classList.add('visible');
        this._speakWord(word);
    },

    /* ── TTS ── */
    _toggleTTS() {
        this.ttsActive ? this._stopTTS() : this._startTTS();
    },

    _startTTS() {
        if (!window.speechSynthesis) {
            alert('이 브라우저는 TTS를 지원하지 않아요.');
            return;
        }
        const sentence = this.sentences[this.currentIdx]?.en;
        if (!sentence) return;

        const btn = document.getElementById('rdr-tts');
        btn?.classList.add('playing');
        this.ttsActive = true;

        const wordEls = Array.from(document.querySelectorAll('#rdr-sentence .reader-word'));
        let wi = 0;

        const utter = new SpeechSynthesisUtterance(sentence);
        utter.lang = 'en-US';
        utter.rate = 0.75;
        utter.pitch = 1.05;
        utter.volume = 1;

        utter.onboundary = e => {
            if (e.name !== 'word') return;
            wordEls.forEach(w => w.classList.remove('tts-highlight'));
            if (wordEls[wi]) { wordEls[wi].classList.add('tts-highlight'); wi++; }
        };
        utter.onend = () => this._stopTTS();
        utter.onerror = () => this._stopTTS();

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
    },

    _stopTTS() {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        this.ttsActive = false;
        document.getElementById('rdr-tts')?.classList.remove('playing');
        document.querySelectorAll('.reader-word.tts-highlight').forEach(w => w.classList.remove('tts-highlight'));
    },

    _speakWord(word) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(word);
        u.lang = 'en-US'; u.rate = 0.7; u.pitch = 1.1;
        window.speechSynthesis.speak(u);
    },

    /* ── STT ── */
    _toggleRecording() {
        this.isRecording ? this._stopRecording() : this._startRecording();
    },

    _startRecording() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;
        this._stopTTS();

        this.recognition = new SR();
        this.recognition.lang = 'en-US';
        this.recognition.continuous = false;
        this.recognition.interimResults = true;

        const btn = document.getElementById('rdr-record');
        const lbl = document.getElementById('rdr-record-label');
        const tbox = document.getElementById('rdr-transcript-box');
        const ttxt = document.getElementById('rdr-transcript');

        btn?.classList.add('recording');
        if (lbl) lbl.textContent = '정지';
        if (tbox) tbox.classList.add('listening');
        if (ttxt) ttxt.textContent = '🎤 듣는 중...';
        this.isRecording = true;

        this.recognition.onresult = e => {
            const t = Array.from(e.results).map(r => r[0].transcript).join('');
            if (ttxt) ttxt.textContent = `"${t}"`;
            if (tbox) { tbox.classList.remove('listening'); tbox.classList.add('active'); }
            if (e.results[e.results.length - 1].isFinal) {
                this._processSTT(t);
            }
        };
        this.recognition.onerror = e => {
            if (ttxt) ttxt.textContent = `인식 오류: ${e.error}. 다시 시도해주세요.`;
            this._stopRecording();
        };
        this.recognition.onend = () => this._stopRecording();

        try { this.recognition.start(); } catch(e) { this._stopRecording(); }
    },

    _stopRecording() {
        if (this.recognition) { try { this.recognition.stop(); } catch(e) {} this.recognition = null; }
        this.isRecording = false;
        document.getElementById('rdr-record')?.classList.remove('recording');
        const lbl = document.getElementById('rdr-record-label');
        if (lbl) lbl.textContent = '녹음하기';
        const tbox = document.getElementById('rdr-transcript-box');
        if (tbox) tbox.classList.remove('listening');
    },

    /* ── 발음 교정 ── */
    _processSTT(raw) {
        const sentence = this.sentences[this.currentIdx]?.en || '';
        const target = sentence.replace(/[^\w\s'-]/g, '').toLowerCase().split(/\s+/).filter(w => w);
        const spoken = raw.replace(/[^\w\s'-]/g, '').toLowerCase().split(/\s+/).filter(w => w);

        const results = this._alignWords(target, spoken);
        this._renderFeedback(results, target);
    },

    _alignWords(target, spoken) {
        const results = target.map(tw => ({ target: tw, status: 'missing', spoken: null }));
        let si = 0;
        for (let ti = 0; ti < target.length; ti++) {
            if (si >= spoken.length) break;
            const sim = this._similarity(target[ti], spoken[si]);
            results[ti].status = sim >= 0.72 ? 'correct' : 'wrong';
            results[ti].spoken = spoken[si];
            si++;
        }
        return results;
    },

    _similarity(a, b) {
        if (a === b) return 1;
        if (!a || !b) return 0;
        const la = a.length, lb = b.length;
        const dp = Array.from({ length: la + 1 }, (_, i) =>
            Array.from({ length: lb + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
        );
        for (let i = 1; i <= la; i++)
            for (let j = 1; j <= lb; j++)
                dp[i][j] = a[i-1] === b[j-1]
                    ? dp[i-1][j-1]
                    : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
        return 1 - dp[la][lb] / Math.max(la, lb);
    },

    _renderFeedback(results, target) {
        const wordEls = Array.from(document.querySelectorAll('#rdr-sentence .reader-word'));
        wordEls.forEach(w => w.classList.remove('result-correct', 'result-wrong', 'result-missing'));

        let correct = 0;
        const chips = [];

        results.forEach((r, i) => {
            wordEls[i]?.classList.add(`result-${r.status}`);
            if (r.status === 'correct') {
                correct++;
                chips.push(`<span class="reader-chip correct">✓ ${this._esc(r.target)}</span>`);
            } else if (r.status === 'wrong') {
                const hint = r.spoken ? ` → "${r.spoken}"` : '';
                chips.push(`<span class="reader-chip wrong">✗ ${this._esc(r.target)}${hint}</span>`);
            } else {
                chips.push(`<span class="reader-chip missing">• ${this._esc(r.target)}</span>`);
            }
        });

        const total = results.length;
        const score = total > 0 ? Math.round((correct / total) * 100) : 0;

        this.totalCorrect += correct;
        this.totalWords += total;
        this.sessionScores.push(score);

        document.getElementById('rdr-sc-correct').textContent = correct;
        document.getElementById('rdr-sc-wrong').textContent = total - correct;
        document.getElementById('rdr-sc-score').textContent = score + '%';
        document.getElementById('rdr-score-panel')?.classList.add('visible');
        document.getElementById('rdr-feedback').innerHTML = chips.join('');

        // 점수 pill 업데이트
        const pill = document.getElementById('rdr-score-pill');
        if (pill) { pill.textContent = score + '점'; pill.classList.add('visible'); }

        const ttxt = document.getElementById('rdr-transcript');
        if (ttxt) {
            ttxt.textContent = score >= 80
                ? `🎉 훌륭해요! ${score}점! 다음 문장으로 넘어가요.`
                : score >= 60
                    ? `👍 잘 했어요! ${score}점. 한 번 더 해볼까요?`
                    : `💪 ${score}점. "읽어주기"를 듣고 다시 도전해봐요!`;
        }

        // 진행률 자동 저장
        DataService.saveProgress(this.story.id, {
            lastSentence: this.currentIdx,
            totalSentences: this.sentences.length,
            completed: false,
            score: this._avgScore()
        });
    },

    /* ── 이전/다음 ── */
    _navigate(dir) {
        const next = this.currentIdx + dir;
        if (next >= this.sentences.length) {
            this._showComplete();
            return;
        }
        if (next < 0) return;
        this.currentIdx = next;
        this._renderSentence(this.currentIdx);
        document.getElementById('rdr-body')?.scrollTo({ top: 0, behavior: 'smooth' });
    },

    _showComplete() {
        // 완료 저장
        DataService.saveProgress(this.story.id, {
            lastSentence: this.sentences.length,
            totalSentences: this.sentences.length,
            completed: true,
            score: this._avgScore()
        });

        const avg = this._avgScore();
        const stars = avg >= 80 ? '⭐⭐⭐' : avg >= 60 ? '⭐⭐' : '⭐';
        const sub = avg >= 80
            ? '완벽해요! 발음이 정말 좋아졌어요! 🌟'
            : avg >= 60
                ? '잘 하고 있어요! 계속 연습해봐요! 💪'
                : '오늘도 열심히 읽었어요! 내일 또 도전해봐요! 🌱';

        document.getElementById('rdr-stars').textContent = stars;
        document.getElementById('rdr-complete-sub').textContent = sub;
        document.getElementById('rdr-final-score').textContent = avg > 0 ? avg + '%' : '✓';
        document.getElementById('rdr-final-correct').textContent = this.totalCorrect || '✓';

        document.getElementById('rdr-prog-fill').style.width = '100%';
        document.getElementById('rdr-prog-label').textContent = `완료! ${this.sentences.length} / ${this.sentences.length}`;
        document.getElementById('rdr-content').style.display = 'none';
        document.getElementById('rdr-complete').classList.add('visible');

        // 카드 그리드 새로고침 (진행률 배지 업데이트)
        App.applyFilters();
    },

    _avgScore() {
        if (!this.sessionScores.length) return 0;
        return Math.round(this.sessionScores.reduce((a, b) => a + b, 0) / this.sessionScores.length);
    },

    _esc(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }
};
