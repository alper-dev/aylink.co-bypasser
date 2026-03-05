// ==UserScript==
// @name         TRLink Bypasser
// @namespace    https://github.com/alper-dev/aylink.co-bypasser
// @version      1.6
// @description  Bypass aylink.co and cpmlink.pro short links automatically.
// @author       alperdev
// @license      MIT
// @match        *://aylink.co/*
// @match        *://cpmlink.pro/*
// @icon         https://raw.githubusercontent.com/alper-dev/aylink.co-bypasser/refs/heads/main/icon.ico
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
    'use strict';

    const host = location.host.replace('www.', '').toLowerCase();
    if (host !== 'aylink.co' && host !== 'cpmlink.pro') return;

    if (!/^\/[A-Za-z0-9]+$/.test(location.pathname)) return;

    const translate = (() => {
        const lang = (navigator.language || navigator.userLanguage || '').startsWith('tr') ? 'tr' : 'en';
        const dict = {
            en: {
                bypassing: 'Bypassing...',
                ok: 'OK',
                captchaWait: '🤖 Please pass the verification first, then the process will continue automatically.',
                dataExtractError: 'Error: Could not extract necessary data. Please check the console.',
                tokenError: 'Error: Could not fetch token. Please check the console.',
                redirectError: 'Error: No redirect address found. Please check the console.',
                criticalError: 'Critical Error: ',
                checkConsole: 'See console for details.',
                logCaptcha:
                    '[TRLink Bypasser] Captcha (Turnstile/reCAPTCHA) detected. Waiting for verification to pass...',
                logDataExtract:
                    '[TRLink Bypasser] Error: Necessary data (_a, _t, _d) could not be extracted from the page. The site structure may have changed.',
                logAliasExtract:
                    '[TRLink Bypasser] Error: Could not extract alias or csrf values. The site structure may have changed.',
                logTokenError: '[TRLink Bypasser] Error: Could not fetch token from server. Response:',
                logRegexWarn:
                    '[TRLink Bypasser] Warning: Could not find URL with regex in bildirim.vip. Redirecting to incoming URL:',
                logRedirectError:
                    '[TRLink Bypasser] Error: /links/go2 request was successful but returned no URL. Full Response:',
                logCriticalError: '[TRLink Bypasser] Unexpected Critical Error:',
            },
            tr: {
                bypassing: 'Geçiliyor...',
                ok: 'Tamam',
                captchaWait: '🤖 Lütfen önce doğrulamayı geçin, ardından işlem otomatik devam edecektir.',
                dataExtractError: 'Hata: Gerekli veriler çekilemedi. Lütfen konsolu kontrol edin.',
                tokenError: 'Hata: Token alınamadı. Lütfen konsolu kontrol edin.',
                redirectError: 'Hata: Yönlendirme adresi bulunamadı. Lütfen konsolu kontrol edin.',
                criticalError: 'Kritik Hata: ',
                checkConsole: 'Detaylar için konsola bakınız.',
                logCaptcha:
                    '[TRLink Bypasser] Captcha (Turnstile/reCAPTCHA) algılandı. Doğrulamanın geçilmesi bekleniyor...',
                logDataExtract:
                    '[TRLink Bypasser] Hata: Sayfadan gerekli veriler (_a, _t, _d) çekilemedi. Site yapısı değişmiş olabilir.',
                logAliasExtract:
                    '[TRLink Bypasser] Hata: Sayfadan alias veya csrf değerleri çekilemedi. Site yapısı değişmiş olabilir.',
                logTokenError: '[TRLink Bypasser] Hata: Sunucudan token alınamadı. Yanıt:',
                logRegexWarn:
                    "[TRLink Bypasser] Uyarı: bildirim.vip içinde regex ile URL bulunamadı. Gelen URL'ye yönlendiriliyor:",
                logRedirectError:
                    '[TRLink Bypasser] Hata: /links/go2 isteği başarılı oldu ancak URL döndürmedi. Tam Yanıt:',
                logCriticalError: '[TRLink Bypasser] Beklenmeyen Kritik Hata:',
            },
        };
        return key => dict[lang][key] || dict['en'][key];
    })();

    const showBypassingAnimation = (() => {
        let styleInjected = false;
        return () => {
            if (!styleInjected) {
                document.head.insertAdjacentHTML(
                    'beforeend',
                    `
                    <style id="bypass-anim-style">
                        #bypass-anim {
                            position: fixed; inset: 0; width: 100vw; height: 100vh;
                            background: rgba(0, 0, 0, 0.5); 
                            backdrop-filter: blur(10px);
                            -webkit-backdrop-filter: blur(10px);
                            z-index: 99999; display: flex;
                            align-items: center; justify-content: center;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        }
                        .bypass-container {
                            display: flex;
                            align-items: center;
                            gap: 20px;
                        }
                        .bypass-spinner {
                            width: 30px; height: 30px; 
                            border: 4px solid rgba(255, 255, 255, 0.3);
                            border-top: 4px solid #fff; 
                            border-radius: 50%;
                            animation: spin 0.8s linear infinite; 
                        }
                        .bypass-text {
                            font-size: 1.4em;
                            font-weight: 600;
                            color: #fff;
                            margin: 0;
                            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
                        }
                        @keyframes spin { to { transform: rotate(360deg); } }
                    </style>
                `,
                );
                styleInjected = true;
            }
            const div = document.createElement('div');
            div.id = 'bypass-anim';
            div.innerHTML = `
                <div class="bypass-container">
                    <div class="bypass-spinner"></div>
                    <p class="bypass-text">${translate('bypassing')}</p>
                </div>
            `;
            document.body.appendChild(div);
            return () => div.remove();
        };
    })();

    const showErrorMessage = (() => {
        let styleInjected = false;
        return message => {
            if (!styleInjected) {
                document.head.insertAdjacentHTML(
                    'beforeend',
                    `
                    <style id="bypass-error-style">
                        #bypass-error {
                            position: fixed; inset: 0; width: 100vw; height: 100vh;
                            background: rgba(0, 0, 0, 0.6); 
                            backdrop-filter: blur(8px);
                            -webkit-backdrop-filter: blur(8px);
                            z-index: 99999; display: flex;
                            align-items: center; justify-content: center;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            animation: fadeIn 0.3s ease;
                        }
                        .bypass-error-box {
                            background: #fff;
                            border-radius: 12px;
                            padding: 30px 40px;
                            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                            max-width: 400px;
                            text-align: center;
                            animation: slideUp 0.3s ease;
                        }
                        .bypass-error-icon {
                            color: #e53935;
                            font-size: 48px;
                            margin-bottom: 15px;
                            line-height: indulgence;
                        }
                        .bypass-error-text {
                            font-size: 1.1em;
                            color: #333;
                            margin: 0 0 25px 0;
                            line-height: 1.5;
                        }
                        .bypass-error-btn {
                            background: #2196f3;
                            color: #fff;
                            border: none;
                            padding: 10px 30px;
                            font-size: 1em;
                            font-weight: 600;
                            border-radius: 6px;
                            cursor: pointer;
                            transition: background 0.2s ease;
                        }
                        .bypass-error-btn:hover {
                            background: #1976d2;
                        }
                        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                    </style>
                `,
                );
                styleInjected = true;
            }
            const div = document.createElement('div');
            div.id = 'bypass-error';
            div.innerHTML = `
                <div class="bypass-error-box">
                    <div class="bypass-error-icon">⚠</div>
                    <p class="bypass-error-text">${message}</p>
                    <button class="bypass-error-btn">${translate('ok')}</button>
                </div>
            `;
            document.body.appendChild(div);

            div.querySelector('.bypass-error-btn').addEventListener('click', () => {
                div.remove();
            });
        };
    })();

    function makeRequest(url, method = 'GET', data = null, headers = {}, retries = 3, timeout = 30000) {
        return new Promise((resolve, reject) => {
            let attemptCount = 0;

            const attemptRequest = () => {
                attemptCount++;
                GM_xmlhttpRequest({
                    method,
                    url,
                    headers,
                    data,
                    timeout: timeout,
                    onload: res => {
                        try {
                            if (headers.Accept && headers.Accept.includes('application/json')) {
                                resolve(JSON.parse(res.responseText));
                            } else {
                                resolve(res.responseText);
                            }
                        } catch {
                            resolve(res.responseText);
                        }
                    },
                    onerror: err => {
                        if (attemptCount < retries) {
                            // wait before retrying
                            const delay = Math.min(1000 * Math.pow(2, attemptCount - 1), 5000);
                            console.log(
                                `Request failed, retrying in ${delay}ms... (Attempt ${attemptCount}/${retries})`,
                            );
                            setTimeout(attemptRequest, delay);
                        } else {
                            reject(
                                new Error(
                                    'Network error after ' + retries + ' attempts: ' + (err.error || 'Unknown error'),
                                ),
                            );
                        }
                    },
                    ontimeout: () => {
                        if (attemptCount < retries) {
                            // wait before retrying
                            const delay = Math.min(1000 * Math.pow(2, attemptCount - 1), 5000);
                            console.log(
                                `Request timeout, retrying in ${delay}ms... (Attempt ${attemptCount}/${retries})`,
                            );
                            setTimeout(attemptRequest, delay);
                        } else {
                            reject(new Error('Request timeout after ' + retries + ' attempts'));
                        }
                    },
                });
            };

            attemptRequest();
        });
    }

    async function bypassAylink() {
        if (
            document.getElementById('turnstile-form') ||
            document.querySelector('.cf-turnstile') ||
            document.getElementById('recaptcha-form') ||
            document.querySelector('.g-recaptcha')
        ) {
            console.log(translate('logCaptcha'));

            if (!document.getElementById('bypass-info-style')) {
                document.head.insertAdjacentHTML(
                    'beforeend',
                    `<style id="bypass-info-style">
                        #bypass-captcha-info {
                            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
                            background: rgba(33, 150, 243, 0.95); color: #fff;
                            padding: 12px 24px; border-radius: 30px; z-index: 999999;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            font-size: 14px; font-weight: 500;
                            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                            backdrop-filter: blur(5px);
                            animation: slideDownInfo 0.4s ease;
                            pointer-events: none;
                        }
                        @keyframes slideDownInfo { from { transform: translate(-50%, -20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
                    </style>`,
                );
            }
            const infoDiv = document.createElement('div');
            infoDiv.id = 'bypass-captcha-info';
            infoDiv.innerHTML = translate('captchaWait');
            document.body.appendChild(infoDiv);

            return;
        }

        const removeAnim = showBypassingAnimation();
        try {
            const html = document.documentElement.outerHTML;
            const m = html.match(/_a\s*=\s*'([^']+)',\s*_t\s*=\s*'([^']+)',\s*_d\s*=\s*'([^']+)'/);
            if (!m) {
                console.error(translate('logDataExtract'));
                removeAnim();
                return showErrorMessage(translate('dataExtractError'));
            }
            const [_a, _t, _d] = m.slice(1);
            const m2 = html.match(/name="alias"\s+value="([^"]+)"[\s\S]+?name="csrf"\s+value="([^"]+)"/);
            if (!m2) {
                console.error(translate('logAliasExtract'));
                removeAnim();
                return showErrorMessage(translate('dataExtractError'));
            }
            const [alias, csrf] = m2.slice(1);

            const headers = {
                Accept: 'application/json, text/javascript, */*; q=0.01',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                Referer: location.href,
                'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
            };

            const tkData = await makeRequest(`https://${host}/get/tk`, 'POST', `_a=${_a}&_t=${_t}&_d=${_d}`, headers);

            if (!tkData.status) {
                console.error(translate('logTokenError'), tkData);
                removeAnim();
                return showErrorMessage(translate('tokenError'));
            }
            const tkn = tkData.th;

            const go2Data = await makeRequest(
                `https://${host}/links/go2`,
                'POST',
                `alias=${alias}&csrf=${csrf}&tkn=${tkn}`,
                headers,
            );

            if (go2Data.url) {
                if (go2Data.url.includes('bildirim.vip')) {
                    const finalHtml = await makeRequest(go2Data.url, 'GET');
                    console.log('Bildirim.vip HTML response:', finalHtml);
                    const match = finalHtml.match(/url\s*=\s*'([^']+)'/) || finalHtml.match(/uri_full:\s*'([^']*)'/);
                    if (match) {
                        removeAnim();
                        location.href = match[1];
                    } else {
                        console.error(translate('logRegexWarn'), go2Data.url);
                        removeAnim();
                        location.href = go2Data.url;
                    }
                } else {
                    removeAnim();
                    location.href = go2Data.url;
                }
            } else {
                console.error(translate('logRedirectError'), go2Data);
                removeAnim();
                showErrorMessage(translate('redirectError'));
            }
        } catch (e) {
            console.error(translate('logCriticalError'), e);
            removeAnim();
            showErrorMessage(
                translate('criticalError') + e.message + `<br><small>${translate('checkConsole')}</small>`,
            );
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bypassAylink);
    } else {
        bypassAylink();
    }
})();
