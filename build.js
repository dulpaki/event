const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const SERVICE_ID = 'vqgzv200km';
const API_KEY = process.env.MICROCMS_API_KEY;
const distDir = path.join(__dirname, 'dist');

// microCMSから全お知らせを取得
async function getAllNews() {
  console.log('Fetching all news from microCMS...');
  const response = await fetch(`https://${SERVICE_ID}.microcms.io/api/v1/news?limit=1000`, {
    headers: { 'X-MICROCMS-API-KEY': API_KEY },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch news: ${response.statusText}`);
  }
  const data = await response.json();
  console.log(`Fetched ${data.contents.length} news items.`);
  return data.contents;
}

// テンプレートファイルを読み込む
function readTemplate(filePath) {
  return fs.readFileSync(path.join(__dirname, filePath), 'utf8');
}

// ファイルを書き出す（ディレクトリがなければ作成）
function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
}

// 日付をフォーマットするヘルパー関数
function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('ja-JP');
}

// メインのビルド関数
async function buildSite() {
  try {
    // --- 1. 全お知らせデータを取得 ---
    const allNews = await getAllNews();

    // --- 2. トップページ (index.html) の生成 ---
    console.log('Building: /index.html');
    let topTemplate = readTemplate('index.html');
    const topNewsHtml = allNews.slice(0, 3).map(item => `
      <li class="c-newsList__item">
        <a class="c-newsList__contents" href="./news/${item.id}.html">
          <dl>
            <dt class="c-newsList__head">
              <time datetime="${item.updatedAt}">${formatDate(item.updatedAt)}</time>
              <span class="c-newsList__label">${item.category}</span>
            </dt>
            <dd>${item.title}</dd>
          </dl>
        </a>
      </li>
    `).join('');
    topTemplate = topTemplate.replace('<div id="js-getNewsList"></div>', `<ol class="c-newsList">${topNewsHtml}</ol>`);
    writeFile(path.join(distDir, 'index.html'), topTemplate);

    // --- 3. お知らせ一覧ページ (news/index.html) の生成 ---
    console.log('Building: /news/index.html');
    let newsListTemplate = readTemplate('news/index.html');
    const allNewsHtml = allNews.map(item => `
      <li class="c-newsList__item">
        <a class="c-newsList__contents" href="./${item.id}.html">
          <dl>
            <dt class="c-newsList__head">
              <time datetime="${item.updatedAt}">${formatDate(item.updatedAt)}</time>
              <span class="c-newsList__label">${item.category}</span>
            </dt>
            <dd>${item.title}</dd>
          </dl>
        </a>
      </li>
    `).join('');
    newsListTemplate = newsListTemplate.replace('<div id="js-getNewsList"></div>', `<ol class="c-newsList">${allNewsHtml}</ol>`);
    writeFile(path.join(distDir, 'news', 'index.html'), newsListTemplate);

    // --- 4. お知らせ詳細ページ (news/[id].html) の生成 ---
    const postTemplate = readTemplate('news/post.html');
    for (const item of allNews) {
      console.log(`Building: /news/${item.id}.html`);
      let singlePostHtml = postTemplate;
      singlePostHtml = singlePostHtml.replace('<h1 class="p-columnPostTitle" id="js-postTitle"></h1>', `<h1 class="p-columnPostTitle">${item.title}</h1>`);
      singlePostHtml = singlePostHtml.replace('<div id="js-postCategory"></div>', item.category ? `<p class="c-label">${item.category}</p>` : '');
      singlePostHtml = singlePostHtml.replace('<span id="js-publishedDate"></span>', formatDate(item.publishedAt || item.createdAt));
      singlePostHtml = singlePostHtml.replace('<time datetime="" id="js-updatedDate"></time>', `<time datetime="${item.updatedAt}">${formatDate(item.updatedAt)}</time>`);
      singlePostHtml = singlePostHtml.replace('<div id="js-postThumbnail"></div>', item.thumbnail ? `<img src="${item.thumbnail.url}" alt="" class="p-columnPostThumbnail">` : '');
      singlePostHtml = singlePostHtml.replace('<div id="js-post"></div>', `<div class="c-post">${item.body || ''}</div>`);
      writeFile(path.join(distDir, 'news', `${item.id}.html`), singlePostHtml);
    }

    // --- 5. 静的ファイルのコピー ---
    console.log('Copying static assets...');
    const staticDirs = ['assets', 'img'];
    for (const dir of staticDirs) {
        const srcDir = path.join(__dirname, dir);
        const destDir = path.join(distDir, dir);
        if (fs.existsSync(srcDir)) {
            fs.cpSync(srcDir, destDir, { recursive: true });
        }
    }

    console.log('✨ Build successful! All files are in /dist directory.');

  } catch (error) {
    console.error('Build failed:', error);
  }
}

buildSite();