const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

console.log('Starting build process...');

const SERVICE_ID = 'vqgzv200km';
const API_KEY = process.env.MICROCMS_API_KEY;
const distDir = path.join(__dirname, 'dist');

// microCMSから全お知らせを取得
async function getAllNews() {
  console.log('Fetching all news from microCMS...');
  const response = await fetch(`https://${SERVICE_ID}.microcms.io/api/v1/news`, {
    headers: { 'X-MICROCMS-API-KEY': API_KEY },
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to fetch news: ${response.statusText} - ${errorBody}`);
  }
  const data = await response.json();
  console.log(`Fetched ${data.contents.length} news items.`);
  return data.contents;
}

// テンプレートファイルを読み込む
function readTemplate(filePath) {
  const fullPath = path.join(__dirname, filePath);
  console.log(`Reading template from: ${fullPath}`);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Template file not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

// ファイルを書き出す（ディレクトリがなければ作成）
function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
  console.log(`Writing file to: ${filePath}`);
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
    if (!API_KEY) {
      throw new Error('MICROCMS_API_KEY is not set. Check your Netlify environment variables.');
    }

    const allNews = await getAllNews();

    // --- 2. トップページ (index.html) の生成 ---
    console.log('\nBuilding: /index.html');
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
    
    // js-newsMoreButtonを生成
    const moreButtonHtml = `
      <div class="u-text-left u-mt-sp-48 u-mt-tab-40">
        <p><a class="c-button" href="./news/">全てみる</a></p>
      </div>
    `;
    topTemplate = topTemplate.replace('<div id="js-newsMoreButton"></div>', moreButtonHtml);

    writeFile(path.join(distDir, 'index.html'), topTemplate);

    console.log('\nBuilding: /news/index.html');
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

    console.log('\nBuilding detail pages...');
    const postTemplate = readTemplate('news/post.html');
    for (const item of allNews) {
      console.log(`- Building: /news/${item.id}.html`);
      let singlePostHtml = postTemplate;
      // ★ 修正点: <article>タグにはクラスを付与しない
      // singlePostHtml = singlePostHtml.replace('<article>', '<article class="p-columnPost">'); // この行を削除
      singlePostHtml = singlePostHtml.replace('<h1 class="p-columnPostTitle" id="js-postTitle"></h1>', `<h1 class="p-columnPostTitle">${item.title}</h1>`);
      singlePostHtml = singlePostHtml.replace('<div id="js-postCategory"></div>', item.category ? `<p class="c-label">${item.category}</p>` : '');
      singlePostHtml = singlePostHtml.replace('<span id="js-publishedDate"></span>', formatDate(item.publishedAt || item.createdAt));
      singlePostHtml = singlePostHtml.replace('<time datetime="" id="js-updatedDate"></time>', `<time datetime="${item.updatedAt}">${formatDate(item.updatedAt)}</time>`);
      // p-columnThumbnailクラスを持つdivで画像を囲む
      singlePostHtml = singlePostHtml.replace('<div id="js-postThumbnail"></div>', item.thumbnail ? `<div class="p-columnPostThumbnail"><img src="${item.thumbnail.url}" alt=""></div>` : '');
      
      // ★ 修正点: id="js-post"のプレースホルダーを、<div class="c-postEditor">で囲まれたitem.bodyに置き換える
      singlePostHtml = singlePostHtml.replace('<div id="js-post"></div>', `<div id="js-post"><div class="c-postEditor">${item.body || ''}</div></div>`);

      singlePostHtml = singlePostHtml.replace('href="../news/"', 'href="./index.html"');
      writeFile(path.join(distDir, 'news', `${item.id}.html`), singlePostHtml);
    }

    console.log('\nCopying static assets...');
    const staticDirs = ['assets', 'img'];
    for (const dir of staticDirs) {
        const srcDir = path.join(__dirname, dir);
        const destDir = path.join(distDir, dir);
        console.log(`Checking for source directory: ${srcDir}`);
        if (fs.existsSync(srcDir)) {
            console.log(`Copying directory: ${srcDir} to ${destDir}`);
            fs.cpSync(srcDir, destDir, { recursive: true });
        }
    }

    console.log('\n✨ Build successful! All files are in /dist directory.');

  } catch (error) {
    console.error('\n🚨 Build failed:', error);
    process.exit(1);
  }
}

buildSite();