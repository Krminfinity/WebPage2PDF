// DOM要素の取得とUIコントロール
class WebPage2PDFApp {
    constructor() {
        this.form = document.getElementById('pdfForm');
        this.urlsInput = document.getElementById('urls');
        this.generateBtn = document.getElementById('generateBtn');
        this.manualLoginBtn = document.getElementById('manualLoginBtn');
        this.loadingSection = document.getElementById('loadingSection');
        this.loginSection = document.getElementById('loginSection');
        this.resultsSection = document.getElementById('resultsSection');
        this.resultsContainer = document.getElementById('results');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');
        this.csvFileInput = document.getElementById('csvFile');
        this.uploadCsvBtn = document.getElementById('uploadCsvBtn');
        this.startPdfBtn = document.getElementById('startPdfBtn');
        this.cancelLoginBtn = document.getElementById('cancelLoginBtn');
        this.loginUrlInfo = document.getElementById('loginUrlInfo');
        this.urlCountInfo = document.getElementById('urlCountInfo');
        this.loginSpinner = document.getElementById('loginSpinner');
        
        // 状態管理
        this.generatedFiles = [];
        this.currentSessionId = null;
        this.isProcessing = false;
        
        this.initializeEventListeners();
        this.initializeAnimations();
    }

    initializeEventListeners() {
        // CSVファイル選択時の処理
        this.csvFileInput.addEventListener('change', (e) => this.handleCsvFileChange(e));
        
        // CSVアップロードボタン
        this.uploadCsvBtn.addEventListener('click', () => this.handleCsvUpload());
        
        // メインフォーム送信
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // 手動ログインボタン
        this.manualLoginBtn.addEventListener('click', () => this.handleManualLogin());
        
        // PDF生成開始ボタン
        this.startPdfBtn.addEventListener('click', () => this.handleStartPdfGeneration());
        
        // キャンセルボタン
        this.cancelLoginBtn.addEventListener('click', () => this.handleCancelLogin());
        
        // 全てダウンロードボタン
        this.downloadAllBtn.addEventListener('click', () => this.handleDownloadAll());
        
        // フォーカス管理とUX改善
        this.setupFormValidation();
    }

    initializeAnimations() {
        // スクロール時のアニメーション
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animationPlayState = 'running';
                }
            });
        }, observerOptions);

        document.querySelectorAll('.fade-in-up').forEach(el => {
            observer.observe(el);
        });
    }

    setupFormValidation() {
        // リアルタイムバリデーション
        this.urlsInput.addEventListener('input', () => {
            this.validateUrls();
        });

        // Enter キーでの送信を改善
        this.urlsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                this.handleFormSubmit(e);
            }
        });
    }

    validateUrls() {
        const urls = this.urlsInput.value.trim();
        if (!urls) {
            this.setFormValidation(null);
            return;
        }

        const urlList = urls.split(',').map(url => url.trim()).filter(url => url);
        
        if (urlList.length > 50) {
            this.setFormValidation(false, 'URLは最大50個まで入力できます');
            return;
        }

        // 簡単なURL形式チェック
        const invalidUrls = urlList.filter(url => !this.isValidUrl(url));
        if (invalidUrls.length > 0) {
            this.setFormValidation(false, `無効なURL形式が含まれています: ${invalidUrls.slice(0, 3).join(', ')}${invalidUrls.length > 3 ? '...' : ''}`);
            return;
        }

        this.setFormValidation(true, `${urlList.length}個のURLが入力されています`);
    }

    setFormValidation(isValid, message = '') {
        const feedback = document.querySelector('.url-feedback') || this.createFeedbackElement();
        
        if (isValid === null) {
            feedback.style.display = 'none';
            this.urlsInput.classList.remove('is-valid', 'is-invalid');
        } else if (isValid) {
            feedback.className = 'form-text text-success url-feedback';
            feedback.innerHTML = `<i class="fas fa-check-circle me-1"></i>${message}`;
            feedback.style.display = 'block';
            this.urlsInput.classList.remove('is-invalid');
            this.urlsInput.classList.add('is-valid');
        } else {
            feedback.className = 'form-text text-danger url-feedback';
            feedback.innerHTML = `<i class="fas fa-exclamation-circle me-1"></i>${message}`;
            feedback.style.display = 'block';
            this.urlsInput.classList.remove('is-valid');
            this.urlsInput.classList.add('is-invalid');
        }
    }

    createFeedbackElement() {
        const feedback = document.createElement('div');
        feedback.className = 'form-text url-feedback';
        this.urlsInput.parentNode.appendChild(feedback);
        return feedback;
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    handleCsvFileChange(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            
            // ファイルサイズチェック (5MB)
            if (file.size > 5 * 1024 * 1024) {
                this.showAlert('ファイルサイズは5MB以下にしてください', 'warning');
                e.target.value = '';
                return;
            }
            
            this.uploadCsvBtn.style.display = 'inline-block';
            this.urlsInput.disabled = true;
            this.urlsInput.value = '';
            this.urlsInput.placeholder = 'CSVファイルが選択されています。URLは自動で抽出されます。';
            this.setFormValidation(null);
        } else {
            this.uploadCsvBtn.style.display = 'none';
            this.urlsInput.disabled = false;
            this.urlsInput.placeholder = '複数のURLを入力する場合は、カンマ（,）で区切ってください\\n例：https://example.com, https://google.com, https://github.com';
        }
    }

    async handleCsvUpload() {
        const file = this.csvFileInput.files[0];
        if (!file) {
            this.showAlert('CSVファイルを選択してください', 'warning');
            return;
        }

        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showAlert('CSVファイルを選択してください', 'warning');
            return;
        }

        try {
            this.setButtonLoading(this.uploadCsvBtn, true);
            
            const formData = new FormData();
            formData.append('csvFile', file);

            const response = await fetch('/upload-csv', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                this.urlsInput.value = result.urls.join(', ');
                this.urlsInput.disabled = false;
                this.csvFileInput.value = '';
                this.uploadCsvBtn.style.display = 'none';
                this.showAlert(`CSVファイルから${result.count}個のURLを抽出しました`, 'success');
                this.validateUrls();
            } else {
                throw new Error(result.error || 'CSVファイルの処理中にエラーが発生しました');
            }
        } catch (error) {
            console.error('CSV upload error:', error);
            this.showAlert(`CSVアップロードエラー: ${error.message}`, 'danger');
        } finally {
            this.setButtonLoading(this.uploadCsvBtn, false);
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();

        if (this.isProcessing) return;

        const urls = this.urlsInput.value.trim();
        if (!urls) {
            this.showAlert('URLを入力してください', 'warning');
            return;
        }

        try {
            this.isProcessing = true;
            this.showLoading(true);
            this.hideAllSections();

            const response = await fetch('/generate-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ urls: urls })
            });

            const result = await response.json();

            if (response.ok) {
                this.generatedFiles = result.results;
                this.displayResults(result);
            } else {
                throw new Error(result.error || 'PDF生成中にエラーが発生しました');
            }
        } catch (error) {
            console.error('PDF generation error:', error);
            this.showAlert(`PDF生成エラー: ${error.message}`, 'danger');
        } finally {
            this.isProcessing = false;
            this.showLoading(false);
        }
    }

    async handleManualLogin() {
        const urls = this.urlsInput.value.trim();
        if (!urls) {
            this.showAlert('URLを入力してください', 'warning');
            return;
        }

        try {
            this.setButtonLoading(this.manualLoginBtn, true);

            const response = await fetch('/prepare-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ urls: urls })
            });

            const result = await response.json();

            if (response.ok) {
                this.currentSessionId = result.sessionId;
                this.showLoginSection(result);
                this.setupLoginCheck();
            } else {
                throw new Error(result.error || '手動ログインの準備中にエラーが発生しました');
            }
        } catch (error) {
            console.error('Manual login error:', error);
            this.showAlert(`手動ログインエラー: ${error.message}`, 'danger');
        } finally {
            this.setButtonLoading(this.manualLoginBtn, false);
        }
    }

    async handleStartPdfGeneration() {
        if (!this.currentSessionId) {
            this.showAlert('セッションが無効です。再度ログインしてください。', 'warning');
            return;
        }

        try {
            this.setButtonLoading(this.startPdfBtn, true);
            this.hideAllSections();
            this.showLoading(true);

            const response = await fetch('/start-pdf-generation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sessionId: this.currentSessionId })
            });

            const result = await response.json();

            if (response.ok) {
                this.generatedFiles = result.results;
                this.displayResults(result);
            } else {
                throw new Error(result.error || 'PDF生成中にエラーが発生しました');
            }
        } catch (error) {
            console.error('PDF generation error:', error);
            this.showAlert(`PDF生成エラー: ${error.message}`, 'danger');
        } finally {
            this.setButtonLoading(this.startPdfBtn, false);
            this.showLoading(false);
            this.currentSessionId = null;
        }
    }

    handleCancelLogin() {
        this.hideAllSections();
        this.currentSessionId = null;
        this.showAlert('手動ログインをキャンセルしました', 'info');
    }

    async handleDownloadAll() {
        if (this.generatedFiles.length === 0) {
            this.showAlert('ダウンロード可能なファイルがありません', 'warning');
            return;
        }

        try {
            this.setButtonLoading(this.downloadAllBtn, true);

            const filenames = this.generatedFiles
                .filter(file => file.success)
                .map(file => file.filename);

            const response = await fetch('/download-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filenames: filenames })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `webpage2pdf_${new Date().getTime()}.zip`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showAlert('ZIPファイルのダウンロードを開始しました', 'success');
            } else {
                throw new Error('ファイルのダウンロード中にエラーが発生しました');
            }
        } catch (error) {
            console.error('Download all error:', error);
            this.showAlert(`ダウンロードエラー: ${error.message}`, 'danger');
        } finally {
            this.setButtonLoading(this.downloadAllBtn, false);
        }
    }

    showLoginSection(result) {
        this.hideAllSections();
        this.loginSection.style.display = 'block';
        this.loginUrlInfo.textContent = result.loginUrl;
        this.urlCountInfo.textContent = `総URL数: ${result.totalUrls}個`;
        
        // 少し遅延してボタンを有効化
        setTimeout(() => {
            this.startPdfBtn.disabled = false;
        }, 3000);
    }

    setupLoginCheck() {
        // 定期的にログイン状態をチェック（仮実装）
        let checkCount = 0;
        const maxChecks = 60; // 5分間

        const checkInterval = setInterval(() => {
            checkCount++;
            
            if (checkCount >= maxChecks) {
                clearInterval(checkInterval);
                this.showAlert('ログイン待機時間が超過しました。再度お試しください。', 'warning');
                this.handleCancelLogin();
            }
        }, 5000);
    }

    displayResults(result) {
        this.hideAllSections();
        this.resultsSection.style.display = 'block';
        
        let html = '';
        
        if (result.results && result.results.length > 0) {
            result.results.forEach((item, index) => {
                if (item.success) {
                    html += `
                        <div class="result-item result-success mb-3 animate__animated animate__fadeInUp" style="animation-delay: ${index * 0.1}s">
                            <div class="d-flex justify-content-between align-items-start">
                                <div class="flex-grow-1">
                                    <h6 class="mb-2 text-success">
                                        <i class="fas fa-check-circle me-2"></i>成功
                                    </h6>
                                    <p class="mb-1"><strong>URL:</strong> ${item.url}</p>
                                    <p class="mb-1"><strong>ファイル名:</strong> ${item.filename}</p>
                                    ${item.pageTitle ? `<p class="mb-1"><strong>ページタイトル:</strong> ${item.pageTitle}</p>` : ''}
                                    ${item.tabInfo ? `<p class="mb-0 text-muted small">${item.tabInfo}</p>` : ''}
                                </div>
                                <div>
                                    <a href="${item.downloadUrl}" class="btn btn-primary btn-sm" download>
                                        <i class="fas fa-download me-1"></i>ダウンロード
                                    </a>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="result-item result-error mb-3 animate__animated animate__fadeInUp" style="animation-delay: ${index * 0.1}s">
                            <div class="d-flex justify-content-between align-items-start">
                                <div class="flex-grow-1">
                                    <h6 class="mb-2 text-danger">
                                        <i class="fas fa-exclamation-circle me-2"></i>エラー
                                    </h6>
                                    <p class="mb-1"><strong>URL:</strong> ${item.url}</p>
                                    <p class="mb-0 text-danger">${item.error}</p>
                                </div>
                            </div>
                        </div>
                    `;
                }
            });

            // 成功したファイルがある場合は一括ダウンロードボタンを表示
            const successCount = result.results.filter(r => r.success).length;
            if (successCount > 1) {
                this.downloadAllBtn.style.display = 'inline-block';
            }
        }

        this.resultsContainer.innerHTML = html;
    }

    showLoading(show) {
        if (show) {
            this.hideAllSections();
            this.loadingSection.style.display = 'block';
        } else {
            this.loadingSection.style.display = 'none';
        }
    }

    hideAllSections() {
        this.loadingSection.style.display = 'none';
        this.loginSection.style.display = 'none';
        this.resultsSection.style.display = 'none';
        this.downloadAllBtn.style.display = 'none';
    }

    setButtonLoading(button, loading) {
        if (loading) {
            button.disabled = true;
            const originalText = button.innerHTML;
            button.dataset.originalText = originalText;
            button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>処理中...';
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText || button.innerHTML;
        }
    }

    showAlert(message, type = 'info') {
        // アラート表示の改善
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
        
        alertDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${this.getAlertIcon(type)} me-2"></i>
                <span>${message}</span>
                <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        document.body.appendChild(alertDiv);
        
        // 5秒後に自動削除
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    getAlertIcon(type) {
        const icons = {
            'success': 'check-circle',
            'warning': 'exclamation-triangle',
            'danger': 'exclamation-circle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new WebPage2PDFApp();
});

// Progressive Web App対応
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
