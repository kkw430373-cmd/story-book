/* ============================================
   K-Story Readers - Data Layer
   구글 스프레드시트에서 데이터 불러오기
   ============================================ */

const DataService = {
    stories: [],
    categories: new Set(),
    isLoading: false,
    error: null,

    /**
     * 구글 스프레드시트에서 데이터 로드
     * Google Visualization API를 사용하여 JSON으로 가져옴
     */
    async fetchFromSheet() {
        try {
            this.isLoading = true;
            this.error = null;

            // 캐시 확인
            const cached = this.getCache();
            if (cached) {
                console.log('📦 캐시에서 데이터 로드');
                this.stories = cached;
                this.extractCategories();
                return this.stories;
            }

            // 방법 1: CSV 방식으로 데이터 로드 (가장 안정적)
            console.log('🌐 구글 스프레드시트에서 데이터 로드 중 (CSV)...');
            
            const csvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/export?format=csv&sheet=${encodeURIComponent(CONFIG.SHEET_NAME)}`;
            
            let data = null;
            
            try {
                const response = await fetch(csvUrl);
                if (response.ok) {
                    const csvText = await response.text();
                    data = this.parseCSV(csvText);
                    console.log('✅ CSV 방식으로 로드 성공');
                }
            } catch (e) {
                console.warn('⚠️ CSV 방식 실패, Visualization API 시도...', e);
            }

            // 방법 2: Google Visualization API 폴백
            if (!data) {
                console.log('🔄 Google Visualization API로 시도...');
                const response = await fetch(CONFIG.SHEET_URL);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: 데이터를 불러올 수 없습니다.`);
                }
                
                const text = await response.text();
                data = this.parseVisualizationAPI(text);
            }

            if (!data || data.length === 0) {
                console.warn('⚠️ 스프레드시트에 데이터가 없습니다.');
                this.stories = [];
                return this.stories;
            }

            this.stories = data;
            console.log(`✅ ${this.stories.length}개 스토리 로드 완료`);
            
            // 카테고리 추출
            this.extractCategories();
            
            // 캐시 저장
            this.setCache(this.stories);
            
            return this.stories;

        } catch (error) {
            console.error('❌ 데이터 로드 실패:', error);
            this.error = error.message;
            
            // 캐시에서 폴백 시도 (만료된 캐시라도)
            const fallback = this.getCache(true);
            if (fallback) {
                console.log('📦 만료된 캐시에서 폴백 데이터 로드');
                this.stories = fallback;
                this.extractCategories();
                return this.stories;
            }
            
            throw error;
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * CSV 텍스트를 파싱하여 스토리 배열 반환
     */
    parseCSV(csvText) {
        const lines = this.csvToArray(csvText);
        if (lines.length < 2) return []; // 헤더 + 최소 1행

        const headers = lines[0].map(h => h.trim());
        console.log('📋 CSV 헤더:', headers);

        const colMap = this.mapColumns(headers);
        console.log('🗂️ 컬럼 매핑:', colMap);

        const stories = [];
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i];
            try {
                const getValue = (colIndex) => {
                    if (colIndex === -1 || !row[colIndex]) return '';
                    return row[colIndex].trim();
                };

                const step = parseInt(getValue(colMap.step)) || 0;
                if (step < 1 || step > 5) continue;

                const title = getValue(colMap.title);
                if (!title) continue;

                stories.push({
                    id: stories.length + 1,
                    step: step,
                    title: title,
                    titleKr: getValue(colMap.titleKr),
                    link: getValue(colMap.link),
                    thumbnail: getValue(colMap.thumbnail),
                    category: getValue(colMap.category),
                    description: getValue(colMap.description)
                });
            } catch (e) {
                console.warn(`⚠️ 행 ${i + 1} 파싱 오류:`, e);
            }
        }
        return stories;
    },

    /**
     * CSV 문자열을 2차원 배열로 변환 (따옴표 처리 포함)
     */
    csvToArray(csvText) {
        const rows = [];
        let currentRow = [];
        let currentCell = '';
        let insideQuotes = false;

        for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];
            const nextChar = csvText[i + 1];

            if (insideQuotes) {
                if (char === '"' && nextChar === '"') {
                    currentCell += '"';
                    i++; // 이스케이프된 따옴표
                } else if (char === '"') {
                    insideQuotes = false;
                } else {
                    currentCell += char;
                }
            } else {
                if (char === '"') {
                    insideQuotes = true;
                } else if (char === ',') {
                    currentRow.push(currentCell);
                    currentCell = '';
                } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
                    currentRow.push(currentCell);
                    currentCell = '';
                    if (currentRow.some(cell => cell.trim() !== '')) {
                        rows.push(currentRow);
                    }
                    currentRow = [];
                    if (char === '\r') i++; // \r\n 처리
                } else {
                    currentCell += char;
                }
            }
        }
        // 마지막 행 처리
        currentRow.push(currentCell);
        if (currentRow.some(cell => cell.trim() !== '')) {
            rows.push(currentRow);
        }

        return rows;
    },

    /**
     * Google Visualization API 응답 파싱
     */
    parseVisualizationAPI(text) {
        const jsonStr = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
        if (!jsonStr || !jsonStr[1]) {
            throw new Error('스프레드시트 응답을 파싱할 수 없습니다.');
        }
        
        const json = JSON.parse(jsonStr[1]);
        
        if (json.status === 'error') {
            throw new Error(json.errors?.[0]?.message || '스프레드시트 오류');
        }
        
        const table = json.table;
        if (!table || !table.rows || table.rows.length === 0) {
            return [];
        }

        // 헤더 매핑 - label이 비어있으면 첫 번째 행 데이터에서 추출
        let headers = table.cols.map(col => (col.label || '').trim());
        let dataStartIndex = 0;
        
        // 헤더가 모두 비어있으면 첫 번째 데이터 행을 헤더로 사용
        if (headers.every(h => !h)) {
            const firstRow = table.rows[0];
            if (firstRow && firstRow.c) {
                headers = firstRow.c.map(cell => cell && cell.v ? cell.v.toString().trim() : '');
                dataStartIndex = 1; // 첫 번째 행은 헤더이므로 건너뜀
            }
        }
        
        console.log('📋 Viz API 헤더:', headers);
        const colMap = this.mapColumns(headers);
        console.log('🗂️ 컬럼 매핑:', colMap);

        const stories = [];
        for (let i = dataStartIndex; i < table.rows.length; i++) {
            const row = table.rows[i];
            try {
                const getValue = (colIndex) => {
                    if (colIndex === -1 || !row.c || !row.c[colIndex]) return '';
                    return (row.c[colIndex].v || '').toString().trim();
                };

                const step = parseInt(getValue(colMap.step)) || 0;
                if (step < 1 || step > 5) continue;

                const title = getValue(colMap.title);
                if (!title) continue;

                stories.push({
                    id: stories.length + 1,
                    step: step,
                    title: title,
                    titleKr: getValue(colMap.titleKr),
                    link: getValue(colMap.link),
                    thumbnail: getValue(colMap.thumbnail),
                    category: getValue(colMap.category),
                    description: getValue(colMap.description)
                });
            } catch (e) {
                console.warn(`⚠️ 행 ${i + 1} 파싱 오류:`, e);
            }
        }
        return stories;
    },

    /**
     * 시트 헤더를 내부 컬럼명에 매핑
     * 다양한 헤더 형식에 유연하게 대응
     */
    mapColumns(headers) {
        const find = (keywords) => {
            const idx = headers.findIndex(h => {
                const lower = h.toLowerCase().replace(/[\s_]/g, '');
                return keywords.some(kw => lower.includes(kw));
            });
            return idx;
        };

        return {
            step: find(['단계', 'step', 'level']),
            title: find(['제목', 'title', 'name']),
            titleKr: find(['제목_한글', '한글제목', '제목한글', 'titlekr', 'korean', '한글']),
            link: find(['링크', 'link', 'url', '주소']),
            thumbnail: find(['썸네일', 'thumbnail', 'image', '이미지', '표지']),
            category: find(['카테고리', 'category', '분류', '주제']),
            description: find(['설명', 'description', 'desc', '소개'])
        };
    },

    /**
     * 카테고리 목록 추출
     */
    extractCategories() {
        this.categories = new Set();
        this.stories.forEach(story => {
            if (story.category) {
                this.categories.add(story.category);
            }
        });
    },

    /**
     * 필터링된 스토리 반환
     */
    getFiltered({ step = 'all', category = 'all', search = '' } = {}) {
        let filtered = [...this.stories];

        // 단계 필터
        if (step !== 'all') {
            const stepNum = parseInt(step);
            filtered = filtered.filter(s => s.step === stepNum);
        }

        // 카테고리 필터
        if (category !== 'all') {
            filtered = filtered.filter(s => s.category === category);
        }

        // 검색 필터
        if (search) {
            const query = search.toLowerCase();
            filtered = filtered.filter(s =>
                s.title.toLowerCase().includes(query) ||
                s.titleKr.toLowerCase().includes(query) ||
                s.description.toLowerCase().includes(query) ||
                s.category.toLowerCase().includes(query)
            );
        }

        return filtered;
    },

    /**
     * 단계별 스토리 수 반환
     */
    getStepCounts() {
        const counts = { all: this.stories.length };
        for (let i = 1; i <= 5; i++) {
            counts[i] = this.stories.filter(s => s.step === i).length;
        }
        return counts;
    },

    // ---- 캐시 관리 ----
    setCache(data) {
        try {
            const cacheData = {
                timestamp: Date.now(),
                data: data
            };
            localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(cacheData));
        } catch (e) {
            console.warn('캐시 저장 실패:', e);
        }
    },

    getCache(ignoreExpiry = false) {
        try {
            const raw = localStorage.getItem(CONFIG.CACHE_KEY);
            if (!raw) return null;
            
            const cached = JSON.parse(raw);
            if (!ignoreExpiry && (Date.now() - cached.timestamp > CONFIG.CACHE_DURATION)) {
                return null; // 만료
            }
            return cached.data;
        } catch (e) {
            return null;
        }
    },

    clearCache() {
        try {
            localStorage.removeItem(CONFIG.CACHE_KEY);
        } catch (e) {}
    }
};
