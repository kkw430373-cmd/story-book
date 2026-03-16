/* ============================================
   K-Story Readers - Configuration
   ============================================ */

const CONFIG = {
    // Google Sheets 설정
    // 공개 스프레드시트를 CSV로 가져오기 위한 URL
    SHEET_ID: '18_yhqxl_iOmIv5fDiyrgdOoOVeVp2laOjloGK2CQU3s',
    SHEET_NAME: '스토리북',
    
    // Google Sheets CSV export URL 생성
    get SHEET_URL() {
        return `https://docs.google.com/spreadsheets/d/${this.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(this.SHEET_NAME)}`;
    },

    // 단계 정보
    STEPS: {
        1: {
            name: 'Step 1',
            subtitle: 'Ready to Read',
            icon: '🌱',
            description: '유치원~초등 저학년 대상. 큰 글자, 쉬운 단어, 리듬감 있는 문장으로 구성되어 있어요.',
            target: '유치원 ~ 초등 저학년',
            color: 'step-1'
        },
        2: {
            name: 'Step 2',
            subtitle: 'Reading with Help',
            icon: '🌿',
            description: '기본 어휘와 짧은 문장으로 된 단순한 이야기 구조입니다. 부모님과 함께 읽기 좋아요.',
            target: '초등 저학년',
            color: 'step-2'
        },
        3: {
            name: 'Step 3',
            subtitle: 'Reading on Your Own',
            icon: '🌳',
            description: '독자적인 캐릭터와 매력적인 줄거리가 있는 이야기입니다. 혼자서 읽어볼 수 있어요.',
            target: '초등 1~3학년',
            color: 'step-3'
        },
        4: {
            name: 'Step 4',
            subtitle: 'Reading Paragraphs',
            icon: '🏔️',
            description: '어려운 어휘와 문단 구조가 등장합니다. 비문학(Non-fiction) 주제도 다뤄요.',
            target: '초등 중학년',
            color: 'step-4'
        },
        5: {
            name: 'Step 5',
            subtitle: 'Ready for Chapters',
            icon: '🚀',
            description: '챕터북 수준의 긴 문단과 복잡한 내용을 다루는 단계입니다.',
            target: '초등 고학년',
            color: 'step-5'
        }
    },

    // 카테고리 정보
    CATEGORIES: {
        '음식': { emoji: '🍚', color: '#FF6B6B' },
        '명절': { emoji: '🎊', color: '#FFD93D' },
        '역사': { emoji: '🏯', color: '#6BCB77' },
        '자연': { emoji: '🌸', color: '#4D96FF' },
        '인물': { emoji: '👤', color: '#9B59B6' },
        '문화': { emoji: '🎭', color: '#FF8E53' },
        '과학': { emoji: '🔬', color: '#00BCD4' },
        '예술': { emoji: '🎨', color: '#E91E63' },
        '전래동화': { emoji: '📖', color: '#FF9800' },
        '일상': { emoji: '🏠', color: '#795548' },
        '지리': { emoji: '🗺️', color: '#607D8B' },
        '스포츠': { emoji: '⚽', color: '#8BC34A' }
    },

    // 단계별 기본 썸네일 이모지
    DEFAULT_THUMBNAILS: {
        1: '🌱',
        2: '🌿',
        3: '🌳',
        4: '🏔️',
        5: '🚀'
    },

    // 단계별 기본 배경 그라디언트 (썸네일 없을 때 사용)
    DEFAULT_BG: {
        1: 'linear-gradient(135deg, #a8e6cf 0%, #dcedc1 100%)',
        2: 'linear-gradient(135deg, #a8d8ea 0%, #aa96da 100%)',
        3: 'linear-gradient(135deg, #fcbad3 0%, #aa96da 100%)',
        4: 'linear-gradient(135deg, #d4a5ff 0%, #9896f1 100%)',
        5: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
    },

    // 캐시 설정
    CACHE_KEY: 'kstory_data',
    CACHE_DURATION: 5 * 60 * 1000, // 5분 (ms)
};
