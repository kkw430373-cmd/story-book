/* ============================================
   K-Story Readers - UI Rendering
   ============================================ */

const UI = {
    // DOM 요소 캐싱
    elements: {},

    /**
     * DOM 요소 초기화
     */
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

    /**
     * 로딩 화면 숨기기
     */
    hideLoading() {
        setTimeout(() => {
            this.elements.loadingScreen.classList.add('hidden');
        }, 800);
    },

    /**
     * 스토리 카드 그리드 렌더링
     */
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

    /**
     * 개별 스토리 카드 생성
     */
    createStoryCard(story, index) {
        const card = document.createElement('div');
        card.className = 'story-card';
        card.style.animationDelay = `${index * 0.05}s`;
        card.setAttribute('data-story-id', story.id);

        const stepInfo = CONFIG.STEPS[story.step] || CONFIG.STEPS[1];
        const catInfo = CONFIG.CATEGORIES[story.category] || { emoji: '📚', color: '#999' };

        // 썸네일 HTML
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
                </div>`;
        } else {
            thumbnailHTML = `
                <div class="card-thumbnail">
                    <div class="card-thumbnail-default" style="background: ${CONFIG.DEFAULT_BG[story.step]}">
                        ${CONFIG.DEFAULT_THUMBNAILS[story.step]}
                    </div>
                    <span class="card-step-badge step-${story.step}">${stepInfo.name}</span>
                    ${story.category ? `<span class="card-cat-badge">${catInfo.emoji} ${this.escapeHtml(story.category)}</span>` : ''}
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

    /**
     * 카테고리 필터 렌더링
     */
    renderCategories(categories) {
        const scroll = this.elements.categoryScroll;
        scroll.innerHTML = '';

        if (categories.size === 0) {
            this.elements.categorySection.style.display = 'none';
            return;
        }

        this.elements.categorySection.style.display = 'block';

        // '전체' 버튼
        const allBtn = document.createElement('button');
        allBtn.className = 'cat-btn active';
        allBtn.dataset.category = 'all';
        allBtn.innerHTML = '<span class="cat-emoji">📚</span> 전체';
        allBtn.addEventListener('click', () => App.filterByCategory('all'));
        scroll.appendChild(allBtn);

        // 각 카테고리 버튼
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

    /**
     * 통계 텍스트 업데이트
     */
    updateStats(count, total) {
        if (count === total) {
            this.elements.statsText.innerHTML = `전체 스토리 <strong>${total}</strong>편`;
        } else {
            this.elements.statsText.innerHTML = `<strong>${count}</strong>편 / 전체 ${total}편`;
        }
    },

    /**
     * 단계 필터 활성화 상태 업데이트
     */
    updateStepFilter(activeStep) {
        document.querySelectorAll('.step-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.step === activeStep);
        });
    },

    /**
     * 카테고리 필터 활성화 상태 업데이트
     */
    updateCategoryFilter(activeCategory) {
        document.querySelectorAll('.cat-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === activeCategory);
        });
    },

    /**
     * 에러 상태 표시
     */
    showError() {
        this.elements.storyGrid.style.display = 'none';
        this.elements.emptyState.style.display = 'none';
        this.elements.errorState.style.display = 'block';
    },

    /**
     * 스토리 상세 모달 열기
     */
    openModal(story) {
        const stepInfo = CONFIG.STEPS[story.step] || CONFIG.STEPS[1];
        const catInfo = CONFIG.CATEGORIES[story.category] || { emoji: '📚', color: '#999' };

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

        this.elements.modalBody.innerHTML = `
            ${thumbHTML}
            <span class="modal-step-badge step-${story.step}">
                ${stepInfo.icon} ${stepInfo.name} · ${stepInfo.subtitle}
            </span>
            <h2 class="modal-title">${this.escapeHtml(story.title)}</h2>
            ${story.titleKr ? `<p class="modal-title-kr">${this.escapeHtml(story.titleKr)}</p>` : ''}
            ${story.category ? `<span class="modal-cat">${catInfo.emoji} ${this.escapeHtml(story.category)}</span>` : ''}
            ${story.description ? `<p class="modal-desc">${this.escapeHtml(story.description)}</p>` : ''}
            <div class="modal-step-info">
                <div class="modal-step-info-title">📖 ${stepInfo.name}: ${stepInfo.subtitle}</div>
                <div class="modal-step-info-text">
                    ${stepInfo.description}<br>
                    <strong>대상:</strong> ${stepInfo.target}
                </div>
            </div>
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
                <button class="btn-tts" onclick="App.speakTitle('${this.escapeHtml(story.title).replace(/'/g, "\\'")}')">
                    <i class="fas fa-volume-up"></i>
                    제목 듣기
                </button>
            </div>`;

        this.elements.modalOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    },

    /**
     * 모달 닫기
     */
    closeModal() {
        this.elements.modalOverlay.classList.remove('open');
        document.body.style.overflow = '';
        // TTS 중지
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    },

    /**
     * 검색바 토글
     */
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

    // ---- 유틸리티 ----
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
