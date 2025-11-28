document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('loader');
    const mainStage = document.getElementById('main-stage');
    const thumbnailGallery = document.getElementById('thumbnail-gallery');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.querySelector('.lightbox-close');
    const scrollIndicator = document.querySelector('.scroll-down-indicator');
    const gallerySection = document.getElementById('gallery-section');

    // --- 設定 -------------------------------------------------
    const mainVisualImage = 'images/main-visual.jpg'; 
    const totalPhotos = 10; 
    const photoImageFiles = [];
    for (let i = 1; i <= totalPhotos; i++) {
        photoImageFiles.push(`images/${i}.jpeg`);
    }
    const illustrationFiles = [/* 'images/illust1.png' */];
    const allStreamingImages = [...photoImageFiles, ...illustrationFiles];

    // --- ★★★ スマホ判定を追加 ★★★ ---
    const isMobile = window.innerWidth <= 768;

    // --- アニメーション設定 ---
    const rowDurations = [28, 35, 24]; 
    const rowDirections = ['scroll-left-to-right', 'scroll-right-to-left', 'scroll-left-to-right'];
    const rowStates = [
        // スマホの場合はクールダウンを長くして、重なりを減らす
        { busy: false, cooldown: isMobile ? 8000 : 5000 }, 
        { busy: false, cooldown: isMobile ? 8000 : 5000 }, 
        { busy: false, cooldown: isMobile ? 8000 : 5000 }
    ];
    // -----------------------------------------------------------

    // --- 画像の事前読み込み ---
    function preloadImages(paths) {
        const promises = paths.map(path => new Promise((resolve, reject) => {
            const img = new Image();
            img.src = path;
            img.onload = resolve;
            img.onerror = reject;
        }));
        return Promise.all(promises);
    }

    // --- メインの処理 ---
    function initialize() {
        loader.classList.add('hidden');
        // setupMainVisual(); // HTMLに直接書いたので不要
        setupThumbnailGallery();
        startStreamingAnimation();
        setupEventListeners();
    }

    // メインビジュアルはHTMLに直接記述したため、この関数は不要になりました。
    /* function setupMainVisual() {
        const mainImg = document.createElement('img');
        mainImg.src = mainVisualImage;
        mainImg.id = 'main-visual-img';
        mainStage.appendChild(mainImg);
    } */

    function setupThumbnailGallery() {
        photoImageFiles.forEach(src => {
            const thumbImg = document.createElement('img');
            thumbImg.src = src;
            thumbImg.addEventListener('click', () => {
                lightbox.style.display = 'flex';
                lightboxImg.src = src;
            });
            thumbnailGallery.appendChild(thumbImg);
        });
    }

    // --- アニメーション関連 ---
    function createStreamingImage(row) {
        if (allStreamingImages.length === 0) return;
        const randomSrc = allStreamingImages[Math.floor(Math.random() * allStreamingImages.length)];
        const img = document.createElement('img');
        img.src = randomSrc;
        img.className = 'streaming-image';
        const size = isMobile ? (Math.random() * 8 + 10) : (Math.random() * 10 + 15); // スマホ: 10-18vh, PC: 15-25vh
        const topPosition = [10, 40, 70];
        img.style.top = `${topPosition[row]}%`;
        img.style.height = `${size}vh`;
        img.style.width = 'auto';
        const duration = rowDurations[row];
        const direction = rowDirections[row];
        img.style.animationName = direction;
        img.style.animationDuration = `${duration}s`;
        mainStage.appendChild(img);
        setTimeout(() => img.remove(), duration * 1000);
    }

    // アニメーションを開始する関数（スマホ判定を反映）
    function startStreamingAnimation() {
        // スマホの場合は画像生成の間隔を長くする
        const creationInterval = isMobile ? 2500 : 1000;

        setInterval(() => {
            const availableRows = [];
            for (let i = 0; i < rowStates.length; i++) {
                if (!rowStates[i].busy) {
                    availableRows.push(i);
                }
            }
            if (availableRows.length > 0) {
                const chosenRow = availableRows[Math.floor(Math.random() * availableRows.length)];
                createStreamingImage(chosenRow);
                rowStates[chosenRow].busy = true;
                setTimeout(() => {
                    rowStates[chosenRow].busy = false;
                }, rowStates[chosenRow].cooldown);
            }
        }, creationInterval);
    }

    // --- その他のイベントリスナー ---
    function setupEventListeners() {
        lightboxClose.addEventListener('click', () => {
            lightbox.style.display = 'none';
        });
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                lightbox.style.display = 'none';
            }
        });
        scrollIndicator.addEventListener('click', () => {
            gallerySection.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // --- 実行 ---
    const allImagesToLoad = [mainVisualImage, ...photoImageFiles, ...illustrationFiles];
    preloadImages(allImagesToLoad)
        .then(() => {
            console.log('All images preloaded successfully!');
            initialize();
        })
        .catch(error => {
            console.error('画像のプリロード中にエラーが発生しました:', error);
            loader.innerHTML = '<p>画像の読み込みに失敗しました。ページを再読み込みしてみてください。</p>';
        });
});
