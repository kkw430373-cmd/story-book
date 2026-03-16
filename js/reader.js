/* ============================================
   K-Story Readers - Reading Mode (reader.js)
   TTS + STT + 발음 교정 기능
   
   사용법:
   1. index.html <head>에 reader.css 추가
   2. app.js 아래에 reader.js 추가
   3. ui.js의 openModal() 에서 ReadingMode.init() 연결
   ============================================ */

const ReadingMode = {

    /* ────────────────────────────────────────
       상태
    ──────────────────────────────────────── */
    story: null,            // 현재 스토리 객체 { id, title, step, sentences: [{en, kr}] }
    sentences: [],          // 파싱된 문장 배열
    currentIdx: 0,          // 현재 문장 인덱스
    ttsActive: false,       // TTS 재생 중 여부
    ttsWordTimer: null,     // 단어별 하이라이트 타이머
    recognition: null,      // SpeechRecognition 인스턴스
    isRecording: false,     // 녹음 중 여부
    totalCorrect: 0,        // 전체 세션 정답 단어 수
    totalWords: 0,          // 전체 세션 단어 수

    /* ────────────────────────────────────────
       단어 사전 (한국어 뜻 + 발음기호)
       필요에 따라 config.js의 WORD_DICT으로 분리 가능
    ──────────────────────────────────────── */
    wordDict: {
        'bibimbap':   { meaning: '비빔밥 — 한국 전통 혼합밥', phonetic: '[biː.bim.bap]' },
        'chuseok':    { meaning: '추석 — 한국 추수 감사절', phonetic: '[tɕʰu.sʌk]' },
        'kimchi':     { meaning: '김치 — 발효 채소 요리', phonetic: '[kɪm.tɕʰi]' },
        'hanbok':     { meaning: '한복 — 한국 전통 의상', phonetic: '[han.bok]' },
        'seollal':    { meaning: '설날 — 한국 음력 새해', phonetic: '[sʌl.lal]' },
        'songpyeon':  { meaning: '송편 — 반달 모양 떡', phonetic: '[soŋ.pjʌn]' },
        'taekwondo':  { meaning: '태권도 — 한국 무술', phonetic: '[tʰɛk.wʌn.do]' },
        'haenyeo':    { meaning: '해녀 — 제주 해녀', phonetic: '[hɛ.njʌ]' },
        'ondol':      { meaning: '온돌 — 한국 바닥 난방', phonetic: '[on.dol]' },
        'bulgogi':    { meaning: '불고기 — 양념 구이 소고기', phonetic: '[pul.ɡo.ɡi]' },
        'dokkaebi':   { meaning: '도깨비 — 한국 민간 요정', phonetic: '[tok.kɛ.bi]' },
        'jeon':       { meaning: '전 — 한국 전통 부침개', phonetic: '[dʑʌn]' },
        'tteok':      { meaning: '떡 — 한국 전통 쌀떡', phonetic: '[tʰʌk]' },
        'soju':       { meaning: '소주 — 한국 전통 증류주', phonetic: '[so.dʑu]' },
        'hangeul':    { meaning: '한글 — 한국 고유 문자', phonetic: '[han.ɡɯl]' },
        'gather':     { meaning: '모이다, 모으다', phonetic: '[ˈɡæð.ər]' },
        'celebrate':  { meaning: '축하하다, 기념하다', phonetic: '[ˈsel.ɪ.breɪt]' },
        'traditional':{ meaning: '전통적인', phonetic: '[trəˈdɪʃ.ən.əl]' },
        'delicious':  { meaning: '맛있는', phonetic: '[dɪˈlɪʃ.əs]' },
        'colorful':   { meaning: '형형색색의, 다채로운', phonetic: '[ˈkʌl.ər.fəl]' },
        'harvest':    { meaning: '수확, 추수', phonetic: '[ˈhɑːr.vɪst]' },
        'ancestor':   { meaning: '조상, 선조', phonetic: '[ˈæn.ses.tər]' },
        'culture':    { meaning: '문화', phonetic: '[ˈkʌl.tʃər]' },
        'season':     { meaning: '계절, 시기', phonetic: '[ˈsiː.zən]' },
        'beautiful':  { meaning: '아름다운', phonetic: '[ˈbjuː.tɪ.fəl]' },
        'mountain':   { meaning: '산', phonetic: '[ˈmaʊn.tɪn]' },
        'river':      { meaning: '강', phonetic: '[ˈrɪv.ər]' },
        'palace':     { meaning: '궁궐, 궁전', phonetic: '[ˈpæl.ɪs]' },
        'ancient':    { meaning: '고대의, 오래된', phonetic: '[ˈeɪn.ʃənt]' },
        'festival':   { meaning: '축제', phonetic: '[ˈfes.tɪ.vəl]' },
        'lantern':    { meaning: '등불, 제등', phonetic: '[ˈlæn.tərn]' },
        'ceremony':   { meaning: '의식, 예식', phonetic: '[ˈser.ɪ.moʊ.ni]' },
        'kingdom':    { meaning: '왕국', phonetic: '[ˈkɪŋ.dəm]' },
    },

    /* ────────────────────────────────────────
       초기화 — 스토리 오브젝트를 받아 모드 실행
    ──────────────────────────────────────── */
    open(story) {
        this.story = story;
        this.currentIdx = 0;
        this.totalCorrect = 0;
        this.totalWords = 0;

        // 스토리의 본문(sentences)을 파싱
        // 스프레드시트에 'sentences' 컬럼이 없으면 description을 1문장으로 대체
        this.sentences = this._parseSentences(story);

        this._buildDOM();
        this._bindEvents();
        this._renderSentence(0);

        document.getElementById('reader-overlay').classList.add('open');
        document.body.style.overflow = 'hidden';
    },

    close() {
        const overlay = document.getElementById('reader-overlay');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
        this._stopTTS();
        this._stopRecording();
    },

    /* ────────────────────────────────────────
       문장 파싱
       스프레드시트 'sentences' 컬럼: "EN문장|KR번역\nEN문장|KR번역" 형식
       없으면 description 단독 사용
    ──────────────────────────────────────── */
    _parseSentences(story) {
        // story.sentences 컬럼이 있으면 파싱
        if (story.sentences && story.sentences.trim()) {
            return story.sentences.split('\n')
                .map(line => {
                    const [en, kr] = line.split('|');
                    return { en: (en || '').trim(), kr: (kr || '').trim() };
                })
                .filter(s => s.en.length > 0);
        }

        // 없으면 description을 문장 분리 (마침표 기준)
        if (story.description) {
            const enSentences = story.description
                .split(/(?<=[.!?])\s+/)
                .filter(s => s.trim().length > 0);
            return enSentences.map(s => ({ en: s.trim(), kr: '' }));
        }

        // 최후 폴백: 제목만
        return [{ en: story.title, kr: story.titleKr || '' }];
    },

    /* ────────────────────────────────────────
       DOM 구성 — 최초 호출 시 1회 생성
    ──────────────────────────────────────── */
    _buildDOM() {
        // 이미 있으면 재사용
        if (document.getElementById('reader-overlay')) {
            document.getElementById('reader-body-inner').innerHTML = '';
            return;
        }

        const stepInfo = CONFIG.STEPS[this.story.step] || CONFIG.STEPS[1];
        const sttSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

        const html = `
<div class="reader-overlay" id="reader-overlay">
  <div class="reader-panel" id="reader-panel">

    <!-- 드래그 바 (모바일) -->
    <div class="reader-drag-bar"></div>

    <!-- 헤더 -->
    <div class="reader-header">
      <span class="reader-step-badge step-${this.story.step}" id="reader-step-badge">
        ${stepInfo.icon} ${stepInfo.name}
      </span>
      <span class="reader-story-title" id="reader-story-title">${this._esc(this.story.title)}</span>
      <button class="reader-close-btn" id="reader-close-btn" aria-label="닫기">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- 진행 바 -->
    <div class="reader-progress-bar">
      <div class="reader-progress-fill" id="reader-progress-fill"></div>
    </div>
    <div class="reader-progress-label" id="reader-progress-label">문장 1 / 1</div>

    <!-- 본문 스크롤 영역 -->
    <div class="reader-body" id="reader-body">

      <!-- 문장 읽기 영역 -->
      <div id="reader-body-inner">
        <!-- 문장 -->
        <div class="reader-sentence" id="reader-sentence"></div>
        <!-- 한글 번역 -->
        <div class="reader-translation" id="reader-translation"></div>
        <!-- 단어 카드 -->
        <div class="reader-word-card" id="reader-word-card">
          <div class="reader-word-card-header">
            <span class="reader-word-card-word" id="wc-word"></span>
            <span class="reader-word-card-phonetic" id="wc-phonetic"></span>
          </div>
          <div class="reader-word-card-meaning" id="wc-meaning"></div>
          <button class="reader-word-card-speak" id="wc-speak">
            <i class="fas fa-volume-up"></i> 발음 듣기
          </button>
        </div>
        <!-- 인식 텍스트 -->
        <div class="reader-transcript" id="reader-transcript">
          단어를 클릭하면 뜻을 볼 수 있어요. 먼저 "읽어주기"로 원어민 발음을 들어보세요.
        </div>
        <!-- 점수 패널 -->
        <div class="reader-score-panel" id="reader-score-panel">
          <div class="reader-score-item">
            <div class="reader-score-val correct" id="rs-correct">0</div>
            <div class="reader-score-lbl">정확한 단어</div>
          </div>
          <div class="reader-score-item">
            <div class="reader-score-val wrong" id="rs-wrong">0</div>
            <div class="reader-score-lbl">틀린 단어</div>
          </div>
          <div class="reader-score-item">
            <div class="reader-score-val score" id="rs-score">-</div>
            <div class="reader-score-lbl">발음 점수</div>
          </div>
        </div>
        <!-- 피드백 칩 -->
        <div class="reader-feedback" id="reader-feedback"></div>
      </div>

      <!-- 완료 화면 -->
      <div class="reader-complete" id="reader-complete">
        <div class="reader-complete-icon">🎉</div>
        <div class="reader-complete-title">모두 읽었어요!</div>
        <div class="reader-complete-sub">스토리를 끝까지 읽었습니다. 정말 잘했어요!</div>
        <div class="reader-final-score">
          <div class="reader-final-score-item">
            <div class="reader-final-score-val" id="final-score">-</div>
            <div class="reader-final-score-lbl">전체 점수</div>
          </div>
          <div class="reader-final-score-item">
            <div class="reader-final-score-val" id="final-correct" style="color:#22c55e;">-</div>
            <div class="reader-final-score-lbl">정확한 단어</div>
          </div>
        </div>
        <button class="reader-btn-restart" id="reader-btn-restart">처음부터 다시 읽기</button>
      </div>

    </div><!-- /reader-body -->

    <!-- 컨트롤 바 -->
    <div class="reader-controls">
      <button class="reader-btn-nav" id="reader-btn-prev" disabled>← 이전</button>

      <button class="reader-btn-tts" id="reader-btn-tts">
        <span class="tts-wave-static"><i class="fas fa-volume-up"></i></span>
        <span class="tts-wave">
          <span class="tts-wave-bar"></span>
          <span class="tts-wave-bar"></span>
          <span class="tts-wave-bar"></span>
          <span class="tts-wave-bar"></span>
          <span class="tts-wave-bar"></span>
        </span>
        읽어주기
      </button>

      ${sttSupported ? `
      <button class="reader-btn-record" id="reader-btn-record">
        <span class="record-dot"></span>
        <span id="record-label">녹음하기</span>
      </button>
      ` : `<span class="reader-stt-notice">음성인식 미지원 브라우저</span>`}

      <button class="reader-btn-nav next" id="reader-btn-next">다음 →</button>
    </div>

  </div>
</div>`;

        document.body.insertAdjacentHTML('beforeend', html);
    },

    /* ────────────────────────────────────────
       이벤트 바인딩
    ──────────────────────────────────────── */
    _bindEvents() {
        // 닫기
        document.getElementById('reader-close-btn')
            ?.addEventListener('click', () => this.close());

        // 오버레이 배경 클릭 닫기
        document.getElementById('reader-overlay')
            ?.addEventListener('click', e => {
                if (e.target.id === 'reader-overlay') this.close();
            });

        // TTS
        document.getElementById('reader-btn-tts')
            ?.addEventListener('click', () => this._toggleTTS());

        // 녹음
        document.getElementById('reader-btn-record')
            ?.addEventListener('click', () => this._toggleRecording());

        // 이전/다음
        document.getElementById('reader-btn-prev')
            ?.addEventListener('click', () => this._navigate(-1));
        document.getElementById('reader-btn-next')
            ?.addEventListener('click', () => this._navigate(1));

        // 단어 카드 발음 듣기
        document.getElementById('wc-speak')
            ?.addEventListener('click', () => {
                const word = document.getElementById('wc-word').textContent;
                if (word) this._speakWord(word);
            });

        // 처음부터 다시
        document.getElementById('reader-btn-restart')
            ?.addEventListener('click', () => {
                this.currentIdx = 0;
                this.totalCorrect = 0;
                this.totalWords = 0;
                document.getElementById('reader-complete').classList.remove('visible');
                document.getElementById('reader-body-inner').style.display = '';
                this._renderSentence(0);
            });
    },

    /* ────────────────────────────────────────
       문장 렌더링
    ──────────────────────────────────────── */
    _renderSentence(idx) {
        if (!this.sentences[idx]) return;

        const { en, kr } = this.sentences[idx];
        this._stopTTS();
        this._stopRecording();

        // 진행 바
        const pct = ((idx + 1) / this.sentences.length) * 100;
        document.getElementById('reader-progress-fill').style.width = pct + '%';
        document.getElementById('reader-progress-label').textContent =
            `문장 ${idx + 1} / ${this.sentences.length}`;

        // 문장 토큰화
        const sentenceEl = document.getElementById('reader-sentence');
        sentenceEl.innerHTML = this._tokenize(en);

        // 번역
        const transEl = document.getElementById('reader-translation');
        transEl.textContent = kr || '';
        transEl.style.display = kr ? 'block' : 'none';

        // 리셋
        document.getElementById('reader-word-card').classList.remove('visible');
        document.getElementById('reader-score-panel').classList.remove('visible');
        document.getElementById('reader-feedback').innerHTML = '';
        document.getElementById('reader-transcript').textContent =
            '단어를 클릭하면 뜻을 볼 수 있어요. "읽어주기"로 원어민 발음을 들어보세요.';
        document.getElementById('reader-transcript').classList.remove('active');

        // 네비 버튼
        const prevBtn = document.getElementById('reader-btn-prev');
        const nextBtn = document.getElementById('reader-btn-next');
        if (prevBtn) prevBtn.disabled = idx === 0;
        if (nextBtn) {
            nextBtn.textContent = idx === this.sentences.length - 1 ? '완료 ✓' : '다음 →';
        }

        // 단어 클릭 이벤트 등록
        document.querySelectorAll('.reader-word').forEach(wordEl => {
            wordEl.addEventListener('click', () => this._onWordClick(wordEl));
        });
    },

    /* ────────────────────────────────────────
       문장 → HTML 토큰
    ──────────────────────────────────────── */
    _tokenize(sentence) {
        // 구두점을 단어와 분리하되, 단어 span에는 순수 텍스트만
        const parts = sentence.split(/(\s+)/);
        return parts.map(part => {
            if (/^\s+$/.test(part)) return ' ';
            // 앞뒤 구두점 분리
            const m = part.match(/^([^\w]*)(\w[\w'-]*)([^\w]*)$/);
            if (!m) return this._esc(part); // 구두점 단독
            const [, pre, word, post] = m;
            const lw = word.toLowerCase();
            const hasInfo = !!this.wordDict[lw];
            return `${this._esc(pre)}<span class="reader-word${hasInfo ? ' has-dict' : ''}" data-word="${this._esc(word)}">${this._esc(word)}</span>${this._esc(post)}`;
        }).join('');
    },

    /* ────────────────────────────────────────
       단어 클릭 → 카드 표시
    ──────────────────────────────────────── */
    _onWordClick(wordEl) {
        const word = wordEl.dataset.word;
        if (!word) return;

        // 이전 선택 해제
        document.querySelectorAll('.reader-word.selected').forEach(w => w.classList.remove('selected'));
        wordEl.classList.add('selected');

        const lw = word.toLowerCase();
        const info = this.wordDict[lw];

        const card = document.getElementById('reader-word-card');
        document.getElementById('wc-word').textContent = word;
        document.getElementById('wc-phonetic').textContent = info?.phonetic || '';
        document.getElementById('wc-meaning').textContent = info?.meaning || '사전에 등록되지 않은 단어입니다.';
        card.classList.add('visible');

        // 단어 TTS (자동 재생)
        this._speakWord(word);
    },

    /* ────────────────────────────────────────
       TTS
    ──────────────────────────────────────── */
    _toggleTTS() {
        if (this.ttsActive) {
            this._stopTTS();
        } else {
            this._startTTS();
        }
    },

    _startTTS() {
        if (!window.speechSynthesis) {
            alert('이 브라우저에서는 TTS를 지원하지 않습니다.');
            return;
        }

        const sentence = this.sentences[this.currentIdx]?.en;
        if (!sentence) return;

        const btn = document.getElementById('reader-btn-tts');
        btn?.classList.add('playing');
        this.ttsActive = true;

        // 단어 요소 목록
        const wordEls = Array.from(document.querySelectorAll('.reader-sentence .reader-word'));
        let wordIdx = 0;

        // utterance
        const utter = new SpeechSynthesisUtterance(sentence);
        utter.lang = 'en-US';
        utter.rate = 0.75;   // 아동용 느린 속도
        utter.pitch = 1.05;
        utter.volume = 1;

        // 단어별 하이라이트 (boundary 이벤트)
        utter.onboundary = (e) => {
            if (e.name !== 'word') return;
            wordEls.forEach(w => w.classList.remove('tts-highlight'));
            if (wordEls[wordIdx]) {
                wordEls[wordIdx].classList.add('tts-highlight');
                wordIdx++;
            }
        };

        utter.onend = () => {
            this._stopTTS();
        };

        utter.onerror = () => {
            this._stopTTS();
        };

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
        this._currentUtterance = utter;
    },

    _stopTTS() {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        clearTimeout(this.ttsWordTimer);
        this.ttsActive = false;
        const btn = document.getElementById('reader-btn-tts');
        btn?.classList.remove('playing');
        document.querySelectorAll('.reader-word.tts-highlight').forEach(w => w.classList.remove('tts-highlight'));
    },

    _speakWord(word) {
        if (!window.speechSynthesis) return;
        const utter = new SpeechSynthesisUtterance(word);
        utter.lang = 'en-US';
        utter.rate = 0.7;
        utter.pitch = 1.1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
    },

    /* ────────────────────────────────────────
       STT (음성 인식)
    ──────────────────────────────────────── */
    _toggleRecording() {
        if (this.isRecording) {
            this._stopRecording();
        } else {
            this._startRecording();
        }
    },

    _startRecording() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;

        this._stopTTS();

        this.recognition = new SR();
        this.recognition.lang = 'en-US';
        this.recognition.continuous = false;
        this.recognition.interimResults = true;

        const btn = document.getElementById('reader-btn-record');
        const label = document.getElementById('record-label');
        const transcriptEl = document.getElementById('reader-transcript');

        btn?.classList.add('recording');
        if (label) label.textContent = '정지';
        if (transcriptEl) {
            transcriptEl.textContent = '🎤 듣는 중...';
            transcriptEl.classList.add('active');
        }
        this.isRecording = true;

        // 중간 결과 (interim)
        this.recognition.onresult = (e) => {
            const transcript = Array.from(e.results)
                .map(r => r[0].transcript)
                .join('');
            if (transcriptEl) transcriptEl.textContent = `"${transcript}"`;

            // 최종 결과
            if (e.results[e.results.length - 1].isFinal) {
                this._processSTTResult(transcript);
            }
        };

        this.recognition.onerror = (e) => {
            console.warn('STT 오류:', e.error);
            if (transcriptEl) transcriptEl.textContent = `인식 오류: ${e.error}. 다시 시도해 주세요.`;
            this._stopRecording();
        };

        this.recognition.onend = () => {
            this._stopRecording();
        };

        try {
            this.recognition.start();
        } catch(e) {
            console.error('STT 시작 실패:', e);
            this._stopRecording();
        }
    },

    _stopRecording() {
        if (this.recognition) {
            try { this.recognition.stop(); } catch(e) {}
            this.recognition = null;
        }
        this.isRecording = false;

        const btn = document.getElementById('reader-btn-record');
        const label = document.getElementById('record-label');
        btn?.classList.remove('recording');
        if (label) label.textContent = '녹음하기';
    },

    /* ────────────────────────────────────────
       발음 교정 알고리즘
       STT 결과 vs 원문 단어 비교
    ──────────────────────────────────────── */
    _processSTTResult(rawTranscript) {
        const sentence = this.sentences[this.currentIdx]?.en || '';

        // 원문 단어 배열 (구두점 제거, 소문자)
        const targetWords = sentence
            .replace(/[^\w\s'-]/g, '')
            .toLowerCase()
            .split(/\s+/)
            .filter(w => w.length > 0);

        // 인식 단어 배열
        const spokenWords = rawTranscript
            .replace(/[^\w\s'-]/g, '')
            .toLowerCase()
            .split(/\s+/)
            .filter(w => w.length > 0);

        // 유사도 기반 단어 매핑 (LCS + 음절 유사도)
        const result = this._alignWords(targetWords, spokenWords);

        // UI 업데이트
        this._renderFeedback(result, targetWords);
    },

    /**
     * 동적 프로그래밍으로 대상 단어와 발화 단어를 정렬
     * 결과: targetWords 순서에 맞춰 각 단어의 상태 반환
     */
    _alignWords(targetWords, spokenWords) {
        // spoken에서 target 단어 찾기 (순서 유지)
        const results = targetWords.map(tw => ({
            target: tw,
            status: 'missing', // correct | wrong | missing
            spoken: null
        }));

        let spokenIdx = 0;
        let targetIdx = 0;

        while (targetIdx < targetWords.length && spokenIdx < spokenWords.length) {
            const tw = targetWords[targetIdx];
            const sw = spokenWords[spokenIdx];

            const sim = this._similarity(tw, sw);

            if (sim >= 0.75) {
                // 정확 (75% 이상 유사)
                results[targetIdx].status = 'correct';
                results[targetIdx].spoken = sw;
                targetIdx++;
                spokenIdx++;
            } else {
                // 틀림 — 발음이 비슷하지만 다름
                results[targetIdx].status = 'wrong';
                results[targetIdx].spoken = sw;
                targetIdx++;
                spokenIdx++;
            }
        }

        return results;
    },

    /**
     * 두 단어의 유사도 계산 (0~1)
     * Levenshtein 거리 기반
     */
    _similarity(a, b) {
        if (a === b) return 1;
        if (!a || !b) return 0;

        const la = a.length, lb = b.length;
        const dp = Array.from({ length: la + 1 }, (_, i) =>
            Array.from({ length: lb + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
        );

        for (let i = 1; i <= la; i++) {
            for (let j = 1; j <= lb; j++) {
                dp[i][j] = a[i-1] === b[j-1]
                    ? dp[i-1][j-1]
                    : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
            }
        }

        const dist = dp[la][lb];
        const maxLen = Math.max(la, lb);
        return 1 - dist / maxLen;
    },

    /* ────────────────────────────────────────
       피드백 UI 렌더링
    ──────────────────────────────────────── */
    _renderFeedback(results, targetWords) {
        // 단어 색상 업데이트
        const wordEls = Array.from(document.querySelectorAll('.reader-sentence .reader-word'));
        wordEls.forEach(el => el.classList.remove('result-correct', 'result-wrong', 'result-missing'));

        let correctCount = 0;
        const chips = [];

        results.forEach((r, i) => {
            if (wordEls[i]) {
                wordEls[i].classList.add(`result-${r.status}`);
            }
            if (r.status === 'correct') {
                correctCount++;
                chips.push(`<span class="reader-chip correct">✓ ${this._esc(r.target)}</span>`);
            } else if (r.status === 'wrong') {
                const hint = r.spoken ? ` → "${r.spoken}"으로 들림` : '';
                chips.push(`<span class="reader-chip wrong">✗ ${this._esc(r.target)}${hint}</span>`);
            } else {
                chips.push(`<span class="reader-chip missing">• ${this._esc(r.target)} (미발화)</span>`);
            }
        });

        const total = results.length;
        const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

        // 세션 누적
        this.totalCorrect += correctCount;
        this.totalWords += total;

        // 점수 패널
        document.getElementById('rs-correct').textContent = correctCount;
        document.getElementById('rs-wrong').textContent = total - correctCount;
        document.getElementById('rs-score').textContent = score + '%';
        document.getElementById('reader-score-panel').classList.add('visible');

        // 칩
        document.getElementById('reader-feedback').innerHTML = chips.join('');

        // 트랜스크립트 업데이트
        const transcriptEl = document.getElementById('reader-transcript');
        if (transcriptEl) {
            transcriptEl.textContent = score >= 80
                ? `훌륭해요! ${score}점 획득! 다음 문장으로 넘어가요. 🎉`
                : score >= 60
                    ? `잘 했어요! ${score}점. 다시 한번 따라해볼까요?`
                    : `${score}점. "읽어주기"를 듣고 다시 도전해봐요!`;
            transcriptEl.classList.add('active');
        }
    },

    /* ────────────────────────────────────────
       이전/다음 네비게이션
    ──────────────────────────────────────── */
    _navigate(dir) {
        const next = this.currentIdx + dir;

        if (next >= this.sentences.length) {
            // 완료 화면
            this._showComplete();
            return;
        }

        if (next < 0) return;

        this.currentIdx = next;
        this._renderSentence(this.currentIdx);

        // 스크롤 상단
        document.getElementById('reader-body')?.scrollTo({ top: 0, behavior: 'smooth' });
    },

    _showComplete() {
        document.getElementById('reader-body-inner').style.display = 'none';
        const complete = document.getElementById('reader-complete');
        complete.classList.add('visible');

        const finalScore = this.totalWords > 0
            ? Math.round((this.totalCorrect / this.totalWords) * 100) + '%'
            : '✓';
        document.getElementById('final-score').textContent = finalScore;
        document.getElementById('final-correct').textContent = this.totalCorrect;

        // 진행 바 100%
        document.getElementById('reader-progress-fill').style.width = '100%';
        document.getElementById('reader-progress-label').textContent =
            `완료! ${this.sentences.length} / ${this.sentences.length}`;
    },

    /* ────────────────────────────────────────
       HTML 이스케이프
    ──────────────────────────────────────── */
    _esc(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }
};


/* ============================================
   기존 UI.js의 openModal() 아래에 추가할 코드:
   스토리 상세 모달에 "📖 소리 내어 읽기" 버튼 연결
   ============================================

   ui.js의 modal-actions 안에 아래 버튼을 추가하세요:

   <button class="btn-reading-mode" onclick="ReadingMode.open(App.getCurrentStory(${story.id}))">
       <i class="fas fa-book-reader"></i>
       소리 내어 읽기
   </button>

   app.js에 getCurrentStory() 헬퍼 추가:
   getCurrentStory(storyId) {
       return DataService.stories.find(s => s.id === storyId);
   }
*/
