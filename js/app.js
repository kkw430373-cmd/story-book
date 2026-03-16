/* ============================================
   K-Story Readers - Main App Controller (업그레이드)
   - 북마크 토글
   - 읽기 진행률 연동
   - speakWord 추가
   ============================================ */

const App = {
    state: {
        currentStep: 'all',
        currentCategory: 'all',
        searchQuery: ''
    },

    async init() {
        console.log('🚀 K-Story Readers 시작');
        UI.init();
        this.bindEvents();
        await this.loadData();
        UI.hideLoading();
    },

    async loadData() {
        try {
            await DataService.fetchFromSheet();
            UI.renderCategories(DataService.categories);
            this.applyFilters();
        } catch (error) {
            console.error('데이터 로드 실패:', error);
            UI.showError();
        }
    },

    bindEvents() {
        document.querySelectorAll('.step-btn').forEach(btn => {
            btn.addEventListener('click', () => this.filterByStep(btn.dataset.step));
        });

        UI.elements.searchToggle.addEventListener('click', () => UI.toggleSearch());

        let searchTimeout;
        UI.elements.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value;
            UI.elements.searchClear.classList.toggle('visible', query.length > 0);
            searchTimeout = setTimeout(() => this.search(query), 300);
        });

        UI.elements.searchClear.addEventListener('click', () => {
            UI.elements.searchInput.value = '';
            UI.elements.searchClear.classList.remove('visible');
            this.search('');
            UI.elements.searchInput.focus();
        });

        UI.elements.modalClose.addEventListener('click', () => UI.closeModal());

        UI.elements.modalOverlay.addEventListener('click', (e) => {
            if (e.target === UI.elements.modalOverlay) UI.closeModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') UI.closeModal();
        });

        UI.elements.resetFilter.addEventListener('click', () => this.resetFilters());

        UI.elements.retryBtn.addEventListener('click', () => {
            DataService.clearCache();
            this.loadData();
        });
    },

    filterByStep(step) {
        this.state.currentStep = step;
        UI.updateStepFilter(step);
        this.applyFilters();
    },

    filterByCategory(category) {
        this.state.currentCategory = category;
        UI.updateCategoryFilter(category);
        this.applyFilters();
    },

    search(query) {
        this.state.searchQuery = query;
        this.applyFilters();
    },

    applyFilters() {
        const filtered = DataService.getFiltered({
            step: this.state.currentStep,
            category: this.state.currentCategory,
            search: this.state.searchQuery
        });
        UI.renderStories(filtered);
        UI.updateStats(filtered.length, DataService.stories.length);
    },

    resetFilters() {
        this.state.currentStep = 'all';
        this.state.currentCategory = 'all';
        this.state.searchQuery = '';
        UI.updateStepFilter('all');
        UI.updateCategoryFilter('all');
        UI.elements.searchInput.value = '';
        UI.elements.searchClear.classList.remove('visible');
        this.applyFilters();
    },

    openModal(storyId) {
        const story = DataService.stories.find(s => s.id === storyId);
        if (story) UI.openModal(story);
    },

    openStoryLink(storyId) {
        const story = DataService.stories.find(s => s.id === storyId);
        if (story && story.link) {
            window.open(story.link, '_blank', 'noopener,noreferrer');
        }
    },

    /* ────────────────────────────────────────
       북마크 토글
    ──────────────────────────────────────── */
    toggleBookmark(storyId, btnEl) {
        const added = DataService.toggleBookmark(storyId);

        // 버튼 UI 즉시 업데이트
        if (btnEl) {
            btnEl.classList.toggle('active', added);
            btnEl.textContent = added ? '★' : '☆';
            btnEl.setAttribute('aria-label', added ? '북마크 해제' : '북마크');
        }

        // 카드 북마크 버튼도 업데이트
        const cardBookmark = document.querySelector(
            `.story-card[data-story-id="${storyId}"] .card-bookmark`
        );
        if (cardBookmark) {
            cardBookmark.classList.toggle('active', added);
            cardBookmark.textContent = added ? '★' : '☆';
        }

        // 북마크 필터 중이면 목록 갱신
        if (this.state.currentCategory === '__bookmark__') {
            this.applyFilters();
        }
    },

    /* ────────────────────────────────────────
       TTS — 제목 읽기
    ──────────────────────────────────────── */
    speakTitle(text) {
        if (!window.speechSynthesis) {
            alert('이 브라우저에서는 음성 기능을 지원하지 않습니다.');
            return;
        }
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        utterance.pitch = 1.1;
        utterance.volume = 1;

        const ttsBtn = document.querySelector('.btn-tts');
        if (ttsBtn) {
            utterance.onstart = () => ttsBtn.classList.add('playing');
            utterance.onend = () => ttsBtn.classList.remove('playing');
            utterance.onerror = () => ttsBtn.classList.remove('playing');
        }

        window.speechSynthesis.speak(utterance);
    },

    /* ────────────────────────────────────────
       TTS — 단어 읽기 (vocab 칩 클릭용)
    ──────────────────────────────────────── */
    speakWord(word) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.7;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
