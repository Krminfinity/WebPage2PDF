const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const archiver = require('archiver');
const multer = require('multer');
const { parse } = require('csv-parse');

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア設定
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// リクエストログ追加（デバッグ用）
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// 静的ファイルは最後に設定
app.use(express.static('public'));

// ダウンロードディレクトリの作成
const downloadsDir = path.join(__dirname, 'downloads');
fs.mkdir(downloadsDir, { recursive: true }).catch(console.error);

// アップロードディレクトリの作成
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Multer設定（CSVファイルアップロード用）
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('CSVファイルのみアップロード可能です'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB制限
    }
});

// URLの妥当性をチェックする関数
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// URLを正規化する関数（httpまたはhttpsプロトコルを追加）
function normalizeUrl(url) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'https://' + url;
    }
    return url;
}

// ファイル名を安全にする関数
function sanitizeFilename(url) {
    return url.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
}

// CSVファイルからURLを抽出する関数
async function extractUrlsFromCsv(filePath) {
    return new Promise((resolve, reject) => {
        const urls = [];
        const fileContent = require('fs').createReadStream(filePath);
        
        console.log('CSVファイルを解析中:', filePath);
        
        fileContent
            .pipe(parse({
                delimiter: ',',
                quote: '"',
                escape: '"',
                skip_empty_lines: true,
                trim: true,
                relax_column_count: true, // 列数の不一致を許可
                skip_records_with_error: true, // エラーレコードをスキップ
                columns: false // ヘッダーを自動認識しない
            }))
            .on('data', (row) => {
                try {
                    // 各行の各列をチェックしてURLを探す
                    for (const cell of row) {
                        if (typeof cell === 'string' && cell.trim()) {
                            const trimmedCell = cell.trim();
                            // URLらしい文字列を検出（より厳密なチェック）
                            if (isUrlLike(trimmedCell)) {
                                urls.push(trimmedCell);
                            }
                        }
                    }
                } catch (rowError) {
                    console.warn('行の処理中にエラー:', rowError.message);
                }
            })
            .on('end', () => {
                // 重複を除去
                const uniqueUrls = [...new Set(urls)];
                console.log(`CSV解析完了: ${uniqueUrls.length}個のユニークURLを発見`);
                resolve(uniqueUrls);
            })
            .on('error', (error) => {
                console.error('CSV解析エラー:', error);
                reject(new Error(`CSV解析エラー: ${error.message}`));
            });
    });
}

// URLらしい文字列かどうかをチェックする関数
function isUrlLike(str) {
    if (!str || typeof str !== 'string') return false;
    
    const trimmed = str.trim();
    
    // 明確にHTTP/HTTPSで始まるもの
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return true;
    }
    
    // www.で始まるもの
    if (trimmed.startsWith('www.') && trimmed.includes('.')) {
        return true;
    }
    
    // ドメイン名の形式（例: example.com）
    const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/;
    if (domainPattern.test(trimmed)) {
        return true;
    }
    
    // パスを含むURL（例: example.com/path）
    const urlWithPathPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})\/.*$/;
    if (urlWithPathPattern.test(trimmed)) {
        return true;
    }
    
    return false;
}

// CSVファイルアップロードエンドポイント
app.post('/upload-csv', (req, res) => {
    console.log('CSVアップロードエンドポイントに到達');
    console.log('Content-Type:', req.headers['content-type']);
    
    upload.single('csvFile')(req, res, async (err) => {
        try {
            // Multerのエラーチェック
            if (err) {
                console.error('Multerエラー:', err);
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'ファイルサイズが大きすぎます（5MB以下にしてください）' });
                }
                if (err.message.includes('CSVファイルのみ')) {
                    return res.status(400).json({ error: 'CSVファイル以外はアップロードできません' });
                }
                return res.status(400).json({ error: `ファイルアップロードエラー: ${err.message}` });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'CSVファイルがアップロードされていません' });
            }

            console.log('CSVファイルを受信:', req.file.originalname, 'サイズ:', req.file.size);
            
            const filePath = req.file.path;
            
            // CSVからURLを抽出
            const urls = await extractUrlsFromCsv(filePath);
            
            // アップロードされたファイルを削除
            setTimeout(async () => {
                try {
                    await fs.unlink(filePath);
                    console.log('アップロードファイルを削除しました:', req.file.filename);
                } catch (error) {
                    console.error('アップロードファイル削除エラー:', error);
                }
            }, 1000);

            if (urls.length === 0) {
                return res.status(400).json({ error: 'CSVファイルからURLが見つかりませんでした' });
            }

            if (urls.length > 50) {
                return res.status(400).json({ 
                    error: `CSVファイルから${urls.length}個のURLが見つかりましたが、最大50個まで処理可能です`,
                    foundUrls: urls.length
                });
            }

            console.log(`CSVから${urls.length}個のURLを抽出しました:`, urls.slice(0, 3));
            
            res.json({
                message: `CSVファイルから${urls.length}個のURLを抽出しました`,
                urls: urls,
                count: urls.length
            });

        } catch (error) {
            console.error('CSVアップロード処理エラー:', error);
            
            // エラー時もファイルを削除
            if (req.file) {
                setTimeout(async () => {
                    try {
                        await fs.unlink(req.file.path);
                    } catch (deleteError) {
                        console.error('エラー時ファイル削除失敗:', deleteError);
                    }
                }, 1000);
            }
            
            res.status(500).json({ 
                error: 'CSVファイルの処理中にエラーが発生しました',
                details: error.message 
            });
        }
    });
});

// PDFを生成するエンドポイント
app.post('/generate-pdf', async (req, res) => {
    try {
        const { urls } = req.body;
        
        if (!urls || typeof urls !== 'string') {
            return res.status(400).json({ error: 'URLsが必要です' });
        }

        // URLを分割してトリミング
        const urlList = urls.split(',').map(url => url.trim()).filter(url => url);
        
        if (urlList.length === 0) {
            return res.status(400).json({ error: '有効なURLを入力してください' });
        }

        // 最大50個のURLまでに制限
        if (urlList.length > 50) {
            return res.status(400).json({ error: 'URLは最大50個まで入力できます' });
        }

        // 既存のブラウザインスタンスに接続を試行、失敗したら新しいインスタンスを起動
        let browser;
        let usingExistingBrowser = false;
        
        // まず既存のChromeデバッグポートへの接続を試行
        const debugPorts = [9222, 9223, 9224]; // 複数のポートを試行
        
        for (const port of debugPorts) {
            try {
                browser = await puppeteer.connect({
                    browserURL: `http://localhost:${port}`,
                    defaultViewport: null
                });
                usingExistingBrowser = true;
                console.log(`✅ ポート${port}で既存のブラウザインスタンスに接続しました（同じウィンドウで処理）`);
                break;
            } catch (connectError) {
                console.log(`ポート${port}への接続に失敗: ${connectError.message}`);
                continue;
            }
        }
        
        // 既存ブラウザへの接続に失敗した場合の案内を詳細化
        if (!browser) {
            console.log('❌ 既存のブラウザに接続できませんでした。');
            console.log('');
            console.log('🎯 同じウィンドウで処理するには:');
            console.log('   方法1: PowerShellスクリプトを使用');
            console.log('      powershell -ExecutionPolicy Bypass -File connect-current-chrome.ps1');
            console.log('');
            console.log('   方法2: 手動でChromeをデバッグモードで起動');
            console.log('      1. 現在のChromeを閉じる');
            console.log('      2. 以下のコマンドを実行:');
            console.log('         chrome.exe --remote-debugging-port=9222');
            console.log('      3. Mercariにログイン');
            console.log('      4. 再度PDF生成を実行');
            console.log('');
            console.log('⚠️ 現在は新しいブラウザウィンドウで処理を続行します...');
            
            // フォールバック: 新しい可視ブラウザを起動（ヘッドレスモード無効）
            browser = await puppeteer.launch({
                headless: false, // ブラウザウィンドウを表示
                devtools: false, // 開発者ツールは無効にして見た目をスッキリ
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--start-maximized' // ウィンドウを最大化
                ]
            });
            console.log('⚠️ 新しい可視ブラウザウィンドウを起動しました（ログイン情報なし）');
        }

        const results = [];

        for (let i = 0; i < urlList.length; i++) {
            try {
                const url = normalizeUrl(urlList[i]);
                
                if (!isValidUrl(url)) {
                    results.push({
                        url: urlList[i],
                        success: false,
                        error: '無効なURL形式です'
                    });
                    continue;
                }

                let page;
                let isNewTab = false;
                
                if (usingExistingBrowser) {
                    // 既存ブラウザの場合、既存タブを再利用するか新しいタブを作成
                    const pages = await browser.pages();
                    console.log(`既存ブラウザに${pages.length}個のタブが開いています`);
                    
                    // 空白タブや新しいタブを探す
                    const emptyPage = pages.find(p => 
                        p.url() === 'chrome://newtab/' || 
                        p.url() === 'about:blank' || 
                        p.url().startsWith('chrome-extension://')
                    );
                    
                    if (emptyPage && !emptyPage.isClosed()) {
                        page = emptyPage;
                        console.log(`既存の空白タブを再利用: ${page.url()}`);
                    } else {
                        page = await browser.newPage();
                        isNewTab = true;
                        console.log('同じウィンドウ内に新しいタブを作成しました');
                    }
                } else {
                    page = await browser.newPage();
                    isNewTab = true;
                }
                
                // ユーザーエージェントを設定
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
                
                // ビューポートを設定
                await page.setViewport({ width: 1366, height: 768 });
                
                console.log(`URLにアクセス中: ${url} ${isNewTab ? '(新しいタブ)' : '(既存タブ)'}`);
                
                // ページにアクセス
                await page.goto(url, { 
                    waitUntil: 'networkidle2', 
                    timeout: 60000 // タイムアウトを60秒に延長
                });
                
                console.log(`ページロード完了: ${url}`);
                
                // 処理を視覚的に確認できるように長めに待機
                console.log('ページの内容を確認中... (5秒待機)');
                await new Promise(resolve => setTimeout(resolve, 5000));

                // 現在のURLを確認（リダイレクトされていないか）
                const currentUrl = page.url();
                console.log(`現在のURL: ${currentUrl}`);
                
                // ページタイトルを取得してログイン状態を確認
                const pageTitle = await page.title();
                console.log(`ページタイトル: ${pageTitle}`);
                
                // Mercariのログインページにリダイレクトされているかチェック
                if (currentUrl.includes('login') || currentUrl.includes('signin') || 
                    pageTitle.toLowerCase().includes('login') || pageTitle.toLowerCase().includes('ログイン')) {
                    console.log(`⚠️ ログインページにリダイレクトされました: ${currentUrl}`);
                    console.log('このURLはログインが必要です。既存ブラウザでログインしてから再実行してください。');
                    
                    // ログインページの場合、さらに長く待機して手動ログインの機会を提供
                    console.log('手動でログインしてください... (20秒待機)');
                    await new Promise(resolve => setTimeout(resolve, 20000));
                }
                
                // ページの内容を少し確認（エラーページでないか）
                const bodyText = await page.evaluate(() => {
                    return document.body ? document.body.innerText.substring(0, 200) : '';
                });
                console.log(`ページ内容の一部: ${bodyText.substring(0, 100)}...`);

                console.log('PDF生成開始...');
                
                // ファイル名を生成
                const filename = `${sanitizeFilename(url)}_${Date.now()}.pdf`;
                const filepath = path.join(downloadsDir, filename);

                // PDFを生成
                await page.pdf({
                    path: filepath,
                    format: 'A4',
                    printBackground: true,
                    margin: {
                        top: '1cm',
                        right: '1cm',
                        bottom: '1cm',
                        left: '1cm'
                    }
                });

                console.log(`PDF生成完了: ${filename}`);
                
                // PDF生成完了を視覚的に確認できるように少し待機
                console.log('PDF生成完了を確認中... (3秒待機)');
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // タブを閉じる（既存ブラウザの場合は最後のタブのみ保持）
                if (usingExistingBrowser && isNewTab) {
                    // 新しく作成したタブのみ閉じる
                    console.log('新しく作成したタブを閉じています...');
                    await page.close();
                    console.log('新しく作成したタブを閉じました');
                } else if (!usingExistingBrowser) {
                    // 可視ブラウザの場合は少し待ってから閉じる
                    console.log('可視ブラウザのタブを3秒後に閉じます...');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    await page.close();
                    console.log('タブを閉じました');
                } else {
                    // 既存タブを再利用した場合は閉じずに残す
                    console.log('既存タブを保持します（タブは開いたまま）');
                }

                results.push({
                    url: urlList[i],
                    success: true,
                    filename: filename,
                    downloadUrl: `/download/${filename}`,
                    actualUrl: currentUrl,
                    pageTitle: pageTitle,
                    usingExistingBrowser: usingExistingBrowser,
                    tabInfo: isNewTab ? '新しいタブで実行' : '既存タブで実行'
                });

            } catch (error) {
                console.error(`URL ${urlList[i]} の処理中にエラー:`, error);
                results.push({
                    url: urlList[i],
                    success: false,
                    error: 'PDF生成中にエラーが発生しました'
                });
            }
        }

        // 既存のブラウザを使用している場合は閉じない
        if (browser && browser.disconnect) {
            await browser.disconnect();
            console.log('既存のブラウザから切断しました');
        } else if (browser && browser.close) {
            console.log('可視ブラウザを5秒後に閉じます...');
            setTimeout(async () => {
                try {
                    await browser.close();
                    console.log('可視ブラウザを閉じました');
                } catch (error) {
                    console.log('ブラウザは既に閉じられています');
                }
            }, 5000);
        }

        res.json({
            message: 'PDF生成が完了しました',
            results: results,
            batchId: Date.now().toString(), // 一括ダウンロード用のID
            successCount: results.filter(r => r.success).length,
            totalCount: results.length
        });

    } catch (error) {
        console.error('PDF生成エラー:', error);
        res.status(500).json({ 
            error: 'サーバーエラーが発生しました',
            details: error.message 
        });
    }
});

// 一括ダウンロード用エンドポイント
app.post('/download-batch', async (req, res) => {
    try {
        const { filenames } = req.body;
        
        if (!filenames || !Array.isArray(filenames)) {
            return res.status(400).json({ error: 'ファイル名のリストが必要です' });
        }

        // 存在するファイルのみをフィルタリング
        const existingFiles = [];
        for (const filename of filenames) {
            const filepath = path.join(downloadsDir, filename);
            try {
                await fs.access(filepath);
                existingFiles.push({ filename, filepath });
            } catch (error) {
                console.log(`ファイルが見つかりません: ${filename}`);
            }
        }

        if (existingFiles.length === 0) {
            return res.status(404).json({ error: 'ダウンロード可能なファイルがありません' });
        }

        // ZIPファイル名を生成
        const zipFilename = `webpage2pdf_batch_${Date.now()}.zip`;
        const zipPath = path.join(downloadsDir, zipFilename);

        // ZIPファイルを作成
        const output = require('fs').createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // 最高圧縮レベル
        });

        archive.pipe(output);

        // ファイルをZIPに追加
        for (const file of existingFiles) {
            archive.file(file.filepath, { name: file.filename });
        }

        await archive.finalize();

        // ZIPファイルが作成されるまで待機
        await new Promise((resolve, reject) => {
            output.on('close', resolve);
            output.on('error', reject);
        });

        // ZIPファイルをダウンロード
        res.download(zipPath, zipFilename, (err) => {
            if (err) {
                console.error('一括ダウンロードエラー:', err);
                res.status(500).json({ error: 'ダウンロードエラーが発生しました' });
            } else {
                // ダウンロード後にZIPファイルを削除（2分後）
                setTimeout(async () => {
                    try {
                        await fs.unlink(zipPath);
                        console.log(`ZIPファイルを削除しました: ${zipFilename}`);
                    } catch (error) {
                        console.error(`ZIPファイル削除エラー: ${zipFilename}`, error);
                    }
                }, 120000);
            }
        });

    } catch (error) {
        console.error('一括ダウンロードエラー:', error);
        res.status(500).json({ 
            error: '一括ダウンロード中にエラーが発生しました',
            details: error.message 
        });
    }
});

// PDFファイルをダウンロードするエンドポイント
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(downloadsDir, filename);
    
    res.download(filepath, (err) => {
        if (err) {
            console.error('ダウンロードエラー:', err);
            res.status(404).json({ error: 'ファイルが見つかりません' });
        } else {
            // ダウンロード後にファイルを削除（1分後）
            setTimeout(async () => {
                try {
                    await fs.unlink(filepath);
                    console.log(`ファイルを削除しました: ${filename}`);
                } catch (error) {
                    console.error(`ファイル削除エラー: ${filename}`, error);
                }
            }, 60000);
        }
    });
});

// 手動ログイン用エンドポイント
app.post('/prepare-login', async (req, res) => {
    try {
        const { urls } = req.body;
        
        if (!urls || typeof urls !== 'string') {
            return res.status(400).json({ error: 'URLsが必要です' });
        }

        // URLを分割してトリミング
        const urlList = urls.split(',').map(url => url.trim()).filter(url => url);
        
        if (urlList.length === 0) {
            return res.status(400).json({ error: '有効なURLを入力してください' });
        }

        // 最大50個のURLまでに制限
        if (urlList.length > 50) {
            return res.status(400).json({ error: 'URLは最大50個まで入力できます' });
        }

        // 既存のブラウザインスタンスに接続を試行
        let browser;
        let usingExistingBrowser = false;
        
        const debugPorts = [9222, 9223, 9224];
        
        for (const port of debugPorts) {
            try {
                browser = await puppeteer.connect({
                    browserURL: `http://localhost:${port}`,
                    defaultViewport: null
                });
                usingExistingBrowser = true;
                console.log(`✅ ポート${port}で既存のブラウザに接続しました（手動ログイン用）`);
                break;
            } catch (connectError) {
                continue;
            }
        }
        
        if (!browser) {
            // 新しい可視ブラウザを起動
            browser = await puppeteer.launch({
                headless: false,
                devtools: false,
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox',
                    '--start-maximized'
                ]
            });
            console.log('新しい可視ブラウザを起動しました（手動ログイン用）');
        }

        // 最初のURLでログインページを開く
        const firstUrl = normalizeUrl(urlList[0]);
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });
        
        console.log(`手動ログイン用ページを開いています: ${firstUrl}`);
        await page.goto(firstUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // ブラウザ情報をセッションに保存（簡易実装）
        global.loginSession = {
            browser: browser,
            urls: urlList,
            usingExistingBrowser: usingExistingBrowser,
            loginPage: page,
            sessionId: Date.now().toString()
        };

        res.json({
            message: 'ログインページを開きました。ログイン完了後に「PDF生成開始」ボタンをクリックしてください。',
            sessionId: global.loginSession.sessionId,
            loginUrl: firstUrl,
            totalUrls: urlList.length,
            usingExistingBrowser: usingExistingBrowser
        });

    } catch (error) {
        console.error('ログインページ準備エラー:', error);
        res.status(500).json({ 
            error: 'ログインページの準備中にエラーが発生しました',
            details: error.message 
        });
    }
});

// ログイン完了後のPDF生成開始エンドポイント
app.post('/start-pdf-generation', async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!global.loginSession || global.loginSession.sessionId !== sessionId) {
            return res.status(400).json({ error: 'セッションが無効です。再度ログインしてください。' });
        }

        const { browser, urls, usingExistingBrowser, loginPage } = global.loginSession;
        const results = [];

        console.log('ログイン完了を確認しました。PDF生成を開始します...');
        
        // ログインページの現在のURLとタイトルを確認
        const currentUrl = loginPage.url();
        const pageTitle = await loginPage.title();
        
        console.log(`現在のURL: ${currentUrl}`);
        console.log(`ページタイトル: ${pageTitle}`);
        
        // ログインページかどうかチェック
        if (currentUrl.includes('login') || currentUrl.includes('signin') || 
            pageTitle.toLowerCase().includes('login') || pageTitle.toLowerCase().includes('ログイン')) {
            return res.status(400).json({ 
                error: 'まだログインページです。ログインを完了してから再度お試しください。',
                currentUrl: currentUrl,
                pageTitle: pageTitle
            });
        }

        // 全URLに対してPDF生成を実行
        for (let i = 0; i < urls.length; i++) {
            try {
                const url = normalizeUrl(urls[i]);
                let page;
                let isNewTab = false;
                
                if (i === 0) {
                    // 最初のURLは既に開いているページを使用
                    page = loginPage;
                    console.log(`最初のURL（既存タブ使用）: ${url}`);
                } else {
                    // 2つ目以降は新しいタブを作成
                    page = await browser.newPage();
                    isNewTab = true;
                    
                    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
                    await page.setViewport({ width: 1366, height: 768 });
                    
                    console.log(`新しいタブでURLにアクセス: ${url}`);
                    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
                }
                
                // 少し待機してJavaScriptが実行されるのを待つ
                console.log('ページの内容を確認中... (3秒待機)');
                await new Promise(resolve => setTimeout(resolve, 3000));

                // 現在のURLとタイトルを取得
                const actualUrl = page.url();
                const actualTitle = await page.title();
                
                console.log(`実際のURL: ${actualUrl}`);
                console.log(`ページタイトル: ${actualTitle}`);

                // ファイル名を生成
                const filename = `${sanitizeFilename(url)}_${Date.now()}.pdf`;
                const filepath = path.join(downloadsDir, filename);

                console.log(`PDF生成開始: ${filename}`);

                // PDFを生成
                await page.pdf({
                    path: filepath,
                    format: 'A4',
                    printBackground: true,
                    margin: {
                        top: '1cm',
                        right: '1cm',
                        bottom: '1cm',
                        left: '1cm'
                    }
                });

                console.log(`PDF生成完了: ${filename}`);
                
                // 新しいタブのみ閉じる
                if (isNewTab) {
                    await page.close();
                    console.log('新しいタブを閉じました');
                }

                results.push({
                    url: urls[i],
                    success: true,
                    filename: filename,
                    downloadUrl: `/download/${filename}`,
                    actualUrl: actualUrl,
                    pageTitle: actualTitle,
                    usingExistingBrowser: usingExistingBrowser,
                    tabInfo: isNewTab ? '新しいタブで実行' : 'ログインタブで実行'
                });

            } catch (error) {
                console.error(`URL ${urls[i]} の処理中にエラー:`, error);
                results.push({
                    url: urls[i],
                    success: false,
                    error: 'PDF生成中にエラーが発生しました'
                });
            }
        }

        // セッションをクリア
        if (!usingExistingBrowser && browser) {
            setTimeout(async () => {
                try {
                    await browser.close();
                    console.log('ブラウザを閉じました');
                } catch (error) {
                    console.log('ブラウザは既に閉じられています');
                }
            }, 5000);
        }
        
        global.loginSession = null;

        res.json({
            message: 'PDF生成が完了しました',
            results: results,
            successCount: results.filter(r => r.success).length,
            totalCount: results.length
        });

    } catch (error) {
        console.error('PDF生成エラー:', error);
        res.status(500).json({ 
            error: 'PDF生成中にエラーが発生しました',
            details: error.message 
        });
    }
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404エラーハンドラー
app.use((req, res, next) => {
    console.log(`404 - リクエストが見つかりません: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'エンドポイントが見つかりません' });
});

// エラーハンドラー
app.use((err, req, res, next) => {
    console.error('サーバーエラー:', err);
    res.status(500).json({ 
        error: 'サーバー内部エラーが発生しました',
        details: process.env.NODE_ENV === 'development' ? err.message : '詳細は非表示'
    });
});

app.listen(PORT, () => {
    console.log(`WebPage2PDFサーバーがポート${PORT}で起動しました`);
    console.log(`http://localhost:${PORT} でアクセスできます`);
});
