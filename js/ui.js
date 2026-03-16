/* ============================================
   K-Story Readers - UI Rendering (업그레이드)
   - 리딩 모드 버튼 연동
   - 진행률 배지
   - 북마크 버튼
   - 단어/숙어 학습 패널
   ============================================ */

const UI = {
    elements: {},

    init() {
        this.elements = {
            loadingScreen: document.getElementById('loading-screen'),
            storyGrid: document.getElementById('story-grid'),
            emptyState: document.getElementById('empty-state'),
            errorState: document.getElementById('error-state'),
            statsText: document.getElementById('stats-text'),
            categoryScroll: document.getElementById('category-filter-scroll'),
            categorySection: document.getElementById('category-filter-section'),
            modalOverlay: document.getElementById('modal-overlay'),
            modalBody: document.getElementById('modal-body'),
            modalClose: document.getElementById('modal-close'),
            searchBar: document.getElementById('search-bar'),
            searchInput: document.getElementById('search-input'),
            searchToggle: document.getElementById('btn-search-toggle'),
            searchClear: document.getElementById('btn-search-clear'),
            resetFilter: document.getElementById('btn-reset-filter'),
            retryBtn: document.getElementById('btn-retry')
        };
    },

    hideLoading() {
        setTimeout(() => {
            this.elements.loadingScreen.classList.add('hidden');
        }, 800);
    },

    renderStories(stories) {
        const grid = this.elements.storyGrid;
        grid.innerHTML = '';

        if (stories.length === 0) {
            grid.style.display = 'none';
            this.elements.emptyState.style.display = 'block';
            this.elements.errorState.style.display = 'none';
            return;
        }

        grid.style.display = 'grid';
        this.elements.emptyState.style.display = 'none';
        this.elements.errorState.style.display = 'none';

        stories.forEach((story, index) => {
            const card = this.createStoryCard(story, index);
            grid.appendChild(card);
        });
    },

    createStoryCard(story, index) {
        const card = document.createElement('div');
        card.className = 'story-card';
        card.style.animationDelay = `${index * 0.05}s`;
        card.setAttribute('data-story-id', story.id);

        const stepInfo = CONFIG.STEPS[story.step] || CONFIG.STEPS[1];
        const catInfo = CONFIG.CATEGORIES[story.category] || { emoji: '📚', color: '#999' };

        // 진행률 불러오기
        const progress = DataService.getProgress(story.id);
        const isBookmarked = DataService.isBookmarked(story.id);

        // 진행률 배지
        let progressBadge = '';
        if (progress.completed) {
            progressBadge = `<span class="card-progress-badge completed">✓ 완료</span>`;
        } else if (progress.lastSentence > 0) {
            const pct = Math.round((progress.lastSentence / (progress.totalSentences || 1)) * 100);
            progressBadge = `<span class="card-progress-badge in-progress">${pct}%</span>`;
        }

        // 북마크 아이콘
        const bookmarkIcon = isBookmarked
            ? `<button class="card-bookmark active" onclick="event.stopPropagation(); App.toggleBookmark(${story.id}, this);" aria-label="북마크 해제">★</button>`
            : `<button class="card-bookmark" onclick="event.stopPropagation(); App.toggleBookmark(${story.id}, this);" aria-label="북마크">☆</button>`;

        let thumbnailHTML;
        if (story.thumbnail) {
            thumbnailHTML = `
                <div class="card-thumbnail">
                    <img src="${this.sanitizeUrl(story.thumbnail)}"
                         alt="${this.escapeHtml(story.title)}"
                         loading="lazy"
                         onerror="this.parentElement.innerHTML = '<div class=\\'card-thumbnail-default\\' style=\\'background: ${CONFIG.DEFAULT_BG[story.step]}\\'>${CONFIG.DEFAULT_THUMBNAILS[story.step]}</div>'">
                    <span class="card-step-badge step-${story.step}">${stepInfo.name}</span>
                    ${story.category ? `<span class="card-cat-badge">${catInfo.emoji} ${this.escapeHtml(story.category)}</span>` : ''}
                    ${progressBadge}
                    ${bookmarkIcon}
                </div>`;
        } else {
            thumbnailHTML = `
                <div class="card-thumbnail">
                    <div class="card-thumbnail-default" style="background: ${CONFIG.DEFAULT_BG[story.step]}">
                        ${CONFIG.DEFAULT_THUMBNAILS[story.step]}
                    </div>
                    <span class="card-step-badge step-${story.step}">${stepInfo.name}</span>
                    ${story.category ? `<span class="card-cat-badge">${catInfo.emoji} ${this.escapeHtml(story.category)}</span>` : ''}
                    ${progressBadge}
                    ${bookmarkIcon}
                </div>`;
        }

        card.innerHTML = `
            ${thumbnailHTML}
            <div class="card-body">
                <div class="card-title">${this.escapeHtml(story.title)}</div>
                ${story.titleKr ? `<div class="card-title-kr">${this.escapeHtml(story.titleKr)}</div>` : ''}
                ${story.description ? `<div class="card-desc">${this.escapeHtml(story.description)}</div>` : ''}
            </div>
            <div class="card-footer">
                <span class="card-step-label step-${story.step}">
                    ${stepInfo.icon} ${stepInfo.subtitle}
                </span>
                <button class="card-read-btn step-${story.step}" onclick="event.stopPropagation(); App.openStoryLink(${story.id});">
                    읽기 <i class="fas fa-arrow-right" style="font-size:10px;"></i>
                </button>
            </div>`;

        card.addEventListener('click', () => App.openModal(story.id));
        return card;
    },

    renderCategories(categories) {
        const scroll = this.elements.categoryScroll;
        scroll.innerHTML = '';

        if (categories.size === 0) {
            this.elements.categorySection.style.display = 'none';
            return;
        }

        this.elements.categorySection.style.display = 'block';

        const allBtn = document.createElement('button');
        allBtn.className = 'cat-btn active';
        allBtn.dataset.category = 'all';
        allBtn.innerHTML = '<span class="cat-emoji">📚</span> 전체';
        allBtn.addEventListener('click', () => App.filterByCategory('all'));
        scroll.appendChild(allBtn);

        // 북마크 필터 버튼
        const bookmarkBtn = document.createElement('button');
        bookmarkBtn.className = 'cat-btn';
        bookmarkBtn.dataset.category = '__bookmark__';
        bookmarkBtn.innerHTML = '<span class="cat-emoji">★</span> 북마크';
        bookmarkBtn.addEventListener('click', () => App.filterByCategory('__bookmark__'));
        scroll.appendChild(bookmarkBtn);

        categories.forEach(cat => {
            const info = CONFIG.CATEGORIES[cat] || { emoji: '📚', color: '#999' };
            const btn = document.createElement('button');
            btn.className = 'cat-btn';
            btn.dataset.category = cat;
            btn.innerHTML = `<span class="cat-emoji">${info.emoji}</span> ${this.escapeHtml(cat)}`;
            btn.addEventListener('click', () => App.filterByCategory(cat));
            scroll.appendChild(btn);
        });
    },

    updateStats(count, total) {
        if (count === total) {
            this.elements.statsText.innerHTML = `전체 스토리 <strong>${total}</strong>편`;
        } else {
            this.elements.statsText.innerHTML = `<strong>${count}</strong>편 / 전체 ${total}편`;
        }
    },

    updateStepFilter(activeStep) {
        document.querySelectorAll('.step-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.step === activeStep);
        });
    },

    updateCategoryFilter(activeCategory) {
        document.querySelectorAll('.cat-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === activeCategory);
        });
    },

    showError() {
        this.elements.storyGrid.style.display = 'none';
        this.elements.emptyState.style.display = 'none';
        this.elements.errorState.style.display = 'block';
    },

    /* ────────────────────────────────────────
       스토리 상세 모달 (업그레이드)
       - 소리 내어 읽기 버튼
       - 진행률 표시
       - 북마크 버튼
       - 단어 학습 패널
    ──────────────────────────────────────── */
    openModal(story) {
        const stepInfo = CONFIG.STEPS[story.step] || CONFIG.STEPS[1];
        const catInfo = CONFIG.CATEGORIES[story.category] || { emoji: '📚', color: '#999' };
        const progress = DataService.getProgress(story.id);
        const isBookmarked = DataService.isBookmarked(story.id);

        // 썸네일
        let thumbHTML;
        if (story.thumbnail) {
            thumbHTML = `
                <div class="modal-thumbnail">
                    <img src="${this.sanitizeUrl(story.thumbnail)}"
                         alt="${this.escapeHtml(story.title)}"
                         onerror="this.parentElement.innerHTML = '<div class=\\'modal-thumbnail-default\\' style=\\'background: ${CONFIG.DEFAULT_BG[story.step]}; border-radius: var(--radius-md);\\'>${CONFIG.DEFAULT_THUMBNAILS[story.step]}</div>'">
                </div>`;
        } else {
            thumbHTML = `
                <div class="modal-thumbnail">
                    <div class="modal-thumbnail-default" style="background: ${CONFIG.DEFAULT_BG[story.step]}; border-radius: var(--radius-md);">
                        ${CONFIG.DEFAULT_THUMBNAILS[story.step]}
                    </div>
                </div>`;
        }

        // 진행률 바
        let progressHTML = '';
        if (progress.lastSentence > 0 || progress.completed) {
            const pct = progress.completed ? 100 : Math.round((progress.lastSentence / (progress.totalSentences || 1)) * 100);
            progressHTML = `
                <div class="modal-progress">
                    <div class="modal-progress-header">
                        <span>읽기 진행률</span>
                        <span>${pct}%${progress.completed ? ' · 완료 ✓' : ''}</span>
                    </div>
                    <div class="modal-progress-bar">
                        <div class="modal-progress-fill step-${story.step}" style="width:${pct}%"></div>
                    </div>
                    ${progress.score ? `<div class="modal-progress-score">최고 발음 점수: <strong>${progress.score}%</strong></div>` : ''}
                </div>`;
        }

        // 단어 학습 패널 (vocab 있을 때)
        let vocabHTML = '';
        if (story.vocab && story.vocab.trim()) {
            const words = story.vocab.split(',').map(w => w.trim()).filter(w => w);
            if (words.length > 0) {
                const chips = words.map(w => {
                    const info = ReadingMode.wordDict[w.toLowerCase()];
                    return info
                        ? `<span class="vocab-chip" onclick="App.speakWord('${this.escapeHtml(w)}')" title="${info.meaning}">${w}</span>`
                        : `<span class="vocab-chip" onclick="App.speakWord('${this.escapeHtml(w)}')">${w}</span>`;
                }).join('');
                vocabHTML = `
                    <div class="modal-vocab">
                        <div class="modal-vocab-title">📝 핵심 단어 (클릭하면 발음 들어요)</div>
                        <div class="modal-vocab-chips">${chips}</div>
                    </div>`;
            }
        }

        this.elements.modalBody.innerHTML = `
            ${thumbHTML}
            <div class="modal-top-row">
                <span class="modal-step-badge step-${story.step}">
                    ${stepInfo.icon} ${stepInfo.name} · ${stepInfo.subtitle}
                </span>
                <button class="modal-bookmark-btn ${isBookmarked ? 'active' : ''}"
                        id="modal-bookmark-btn"
                        onclick="App.toggleBookmark(${story.id}, this)"
                        aria-label="${isBookmarked ? '북마크 해제' : '북마크'}">
                    ${isBookmarked ? '★' : '☆'}
                </button>
            </div>
            <h2 class="modal-title">${this.escapeHtml(story.title)}</h2>
            ${story.titleKr ? `<p class="modal-title-kr">${this.escapeHtml(story.titleKr)}</p>` : ''}
            ${story.category ? `<span class="modal-cat">${catInfo.emoji} ${this.escapeHtml(story.category)}</span>` : ''}
            ${story.description ? `<p class="modal-desc">${this.escapeHtml(story.description)}</p>` : ''}
            ${progressHTML}
            ${vocabHTML}
            <div class="modal-step-info">
                <div class="modal-step-info-title">📖 ${stepInfo.name}: ${stepInfo.subtitle}</div>
                <div class="modal-step-info-text">
                    ${stepInfo.description}<br>
                    <strong>대상:</strong> ${stepInfo.target}
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn-reading-mode step-${story.step}"
                        onclick="ReadingMode.open(DataService.stories.find(s=>s.id===${story.id})); UI.closeModal();">
                    <i class="fas fa-headphones"></i>
                    ${progress.lastSentence > 0 && !progress.completed ? '이어서 읽기 🎯' : '소리 내어 읽기'}
                </button>
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
                <button class="btn-tts" onclick="App.speakTitle('${this.escapeHtml(story.title).replace(/'/g, "\\'")}')">
                    <i class="fas fa-volume-up"></i>
                    제목 듣기
                </button>
            </div>`;

        this.elements.modalOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    },

    closeModal() {
        this.elements.modalOverlay.classList.remove('open');
        document.body.style.overflow = '';
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    },

    toggleSearch() {
        const isOpen = this.elements.searchBar.classList.toggle('open');
        this.elements.searchToggle.classList.toggle('active', isOpen);
        if (isOpen) {
            this.elements.searchInput.focus();
        } else {
            this.elements.searchInput.value = '';
            this.elements.searchClear.classList.remove('visible');
            App.search('');
        }
    },

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    sanitizeUrl(url) {
        if (!url) return '';
        const trimmed = url.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return trimmed;
        }
        return '';
    }
};
