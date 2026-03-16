/* ============================================
   K-Story Readers - 리딩 모드 연동 패치
   기존 파일에 아래 변경사항을 적용하세요.
   ============================================ */


/* ──────────────────────────────────────────
   1. index.html — <head> 안에 추가
   style.css 아래에 붙여넣기
   ────────────────────────────────────────── */

/*
<link rel="stylesheet" href="css/reader.css">
*/


/* ──────────────────────────────────────────
   2. index.html — <body> 맨 아래 스크립트 목록에 추가
   app.js 아래에 붙여넣기
   ────────────────────────────────────────── */

/*
<script src="js/reader.js"></script>
*/


/* ──────────────────────────────────────────
   3. ui.js — openModal() 메서드 안, modal-actions div를 아래로 교체
   기존 modal-actions innerHTML을 찾아 버튼 1개 추가
   ────────────────────────────────────────── */

// ▼ 기존 코드 (찾기)
/*
<div class="modal-actions">
    ${story.link ? `
        <a href="${this.sanitizeUrl(story.link)}"
           ...>
            스토리 읽기 시작!
        </a>
    ` : `...`}
    <button class="btn-tts" ...>
        제목 듣기
    </button>
</div>
*/

// ▼ 교체 코드 (붙여넣기) — btn-reading-mode 버튼 추가
/*
<div class="modal-actions">
    ${story.link ? `
        <a href="${this.sanitizeUrl(story.link)}"
           target="_blank"
           rel="noopener noreferrer"
           class="btn-read-story step-${story.step}">
            <i class="fas fa-book-open"></i>
            스토리 읽기 시작!
        </a>
    ` : `
        <button class="btn-read-story step-${story.step}" disabled style="opacity:0.5; cursor:not-allowed;">
            <i class="fas fa-book-open"></i>
            링크 준비 중...
        </button>
    `}
    <button class="btn-reading-mode step-${story.step}"
            onclick="ReadingMode.open(DataService.stories.find(s=>s.id===${story.id})); UI.closeModal();">
        <i class="fas fa-headphones"></i>
        소리 내어 읽기
    </button>
    <button class="btn-tts" onclick="App.speakTitle('${this.escapeHtml(story.title).replace(/'/g, "\\'")}')">
        <i class="fas fa-volume-up"></i>
        제목 듣기
    </button>
</div>
*/


/* ──────────────────────────────────────────
   4. style.css 끝에 추가 — 새 버튼 스타일
   ────────────────────────────────────────── */

/*
.btn-reading-mode {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 24px;
    border-radius: 16px;
    border: none;
    font-size: 15px;
    font-weight: 700;
    font-family: 'Nunito', sans-serif;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
    margin-top: 8px;
    background: #f0fdf4;
    color: #166534;
    border: 2px solid #86efac;
}

.btn-reading-mode:hover {
    background: #dcfce7;
    border-color: #4ade80;
    transform: translateY(-1px);
}

.btn-reading-mode.step-1 { background:#f0fdf4; color:#166534; border-color:#86efac; }
.btn-reading-mode.step-2 { background:#eff6ff; color:#1e40af; border-color:#93c5fd; }
.btn-reading-mode.step-3 { background:#fffbeb; color:#92400e; border-color:#fcd34d; }
.btn-reading-mode.step-4 { background:#f5f3ff; color:#5b21b6; border-color:#c4b5fd; }
.btn-reading-mode.step-5 { background:#fff1f2; color:#9f1239; border-color:#fca5a5; }
*/


/* ──────────────────────────────────────────
   5. 스프레드시트 컬럼 추가 (선택사항)
   
   현재: 단계, 제목, 제목_한글, 링크 주소, 썸네일, 카테고리, 설명
   추가: sentences
   
   sentences 컬럼 형식 (각 문장을 개행으로 구분, EN|KR 로 쌍):
   
   Korea has many beautiful seasons.|한국은 아름다운 계절이 많습니다.
   Families gather to celebrate Chuseok together.|가족들이 추석을 함께 기념하기 위해 모입니다.
   They eat delicious rice cakes called songpyeon.|그들은 송편이라 불리는 맛있는 떡을 먹습니다.
   
   ※ sentences 컬럼이 없으면 description 텍스트를 자동으로 문장 분리하여 사용합니다.
   ────────────────────────────────────────── */


/* ──────────────────────────────────────────
   6. data.js — parseCSV / parseVisualizationAPI 에 sentences 추가
   
   mapColumns() 메서드의 return 객체에 추가:
   ────────────────────────────────────────── */

/*
// mapColumns() return 객체에 추가:
sentences: find(['sentences', '문장', '본문']),
*/

/*
// stories.push() 객체에 sentences 필드 추가:
stories.push({
    id: stories.length + 1,
    step: step,
    title: title,
    titleKr: getValue(colMap.titleKr),
    link: getValue(colMap.link),
    thumbnail: getValue(colMap.thumbnail),
    category: getValue(colMap.category),
    description: getValue(colMap.description),
    sentences: getValue(colMap.sentences)   // ← 이 줄 추가
});
*/
