/* ============================================
   K-Story Readers - Main App Controller
   ============================================ */

const App = {
    // 현재 필터 상태
    state: {
        currentStep: 'all',
        currentCategory: 'all',
        searchQuery: ''
    },

    /**
     * 앱 초기화
     */
    async init() {
        console.log('🚀 K-Story Readers 시작');
        
        // UI 초기화
        UI.init();
        
        // 이벤트 리스너 등록
        this.bindEvents();
        
        // 데이터 로드
        await this.loadData();
        
        // 로딩 화면 숨기기
        UI.hideLoading();
    },

    /**
     * 데이터 로드 및 초기 렌더링
     */
    async loadData() {
        try {
            await DataService.fetchFromSheet();
            
            // 카테고리 필터 렌더링
            UI.renderCategories(DataService.categories);
            
            // 스토리 렌더링
            this.applyFilters();
            
        } catch (error) {
            console.error('데이터 로드 실패:', error);
            UI.showError();
        }
    },

    /**
     * 이벤트 리스너 바인딩
     */
    bindEvents() {
        // 단계 필터 버튼
        document.querySelectorAll('.step-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterByStep(btn.dataset.step);
            });
        });

        // 검색 토글
        UI.elements.searchToggle.addEventListener('click', () => {
            UI.toggleSearch();
        });

        // 검색 입력
        let searchTimeout;
        UI.elements.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value;
            
            // Clear 버튼 표시/숨기기
            UI.elements.searchClear.classList.toggle('visible', query.length > 0);
            
            // 디바운스 검색
            searchTimeout = setTimeout(() => {
                this.search(query);
            }, 300);
        });

        // 검색 초기화
        UI.elements.searchClear.addEventListener('click', () => {
            UI.elements.searchInput.value = '';
            UI.elements.searchClear.classList.remove('visible');
            this.search('');
            UI.elements.searchInput.focus();
        });

        // 모달 닫기
        UI.elements.modalClose.addEventListener('click', () => {
            UI.closeModal();
        });

        UI.elements.modalOverlay.addEventListener('click', (e) => {
            if (e.target === UI.elements.modalOverlay) {
                UI.closeModal();
            }
        });

        // ESC 키로 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                UI.closeModal();
            }
        });

        // 필터 초기화
        UI.elements.resetFilter.addEventListener('click', () => {
            this.resetFilters();
        });

        // 다시 시도
        UI.elements.retryBtn.addEventListener('click', () => {
            DataService.clearCache();
            this.loadData();
        });
    },

    /**
     * 단계 필터
     */
    filterByStep(step) {
        this.state.currentStep = step;
        UI.updateStepFilter(step);
        this.applyFilters();
    },

    /**
     * 카테고리 필터
     */
    filterByCategory(category) {
        this.state.currentCategory = category;
        UI.updateCategoryFilter(category);
        this.applyFilters();
    },

    /**
     * 검색
     */
    search(query) {
        this.state.searchQuery = query;
        this.applyFilters();
    },

    /**
     * 필터 적용 및 렌더링
     */
    applyFilters() {
        const filtered = DataService.getFiltered({
            step: this.state.currentStep,
            category: this.state.currentCategory,
            search: this.state.searchQuery
        });

        UI.renderStories(filtered);
        UI.updateStats(filtered.length, DataService.stories.length);
    },

    /**
     * 필터 초기화
     */
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

    /**
     * 스토리 모달 열기
     */
    openModal(storyId) {
        const story = DataService.stories.find(s => s.id === storyId);
        if (story) {
            UI.openModal(story);
        }
    },

    /**
     * 스토리 링크 열기 (새 탭)
     */
    openStoryLink(storyId) {
        const story = DataService.stories.find(s => s.id === storyId);
        if (story && story.link) {
            window.open(story.link, '_blank', 'noopener,noreferrer');
        }
    },

    /**
     * TTS - 제목 읽어주기
     */
    speakTitle(text) {
        if (!window.speechSynthesis) {
            alert('이 브라우저에서는 음성 기능을 지원하지 않습니다.');
            return;
        }

        // 기존 음성 중지
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.8; // 느린 속도 (아이용)
        utterance.pitch = 1.1;
        utterance.volume = 1;

        // TTS 버튼 상태 업데이트
        const ttsBtn = document.querySelector('.btn-tts');
        if (ttsBtn) {
            utterance.onstart = () => ttsBtn.classList.add('playing');
            utterance.onend = () => ttsBtn.classList.remove('playing');
            utterance.onerror = () => ttsBtn.classList.remove('playing');
        }

        window.speechSynthesis.speak(utterance);
    }
};

// ---- 앱 시작 ----
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
