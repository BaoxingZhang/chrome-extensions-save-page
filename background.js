// 1. 监听插件图标点击
chrome.action.onClicked.addListener((tab) => {
    console.log('Plugin clicked on tab:', tab.url);
    
    // 安全检查：确保不在浏览器内部页面运行
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
        console.warn('Cannot save internal browser pages');
        return;
    }

    // 注入content script到当前页面
    console.log('Injecting content script...');
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
    }).then(() => {
        console.log('Content script injected successfully');
    }).catch(error => {
        console.error('Failed to execute content script:', error);
    });
});

// 2. 监听来自content script的消息，处理下载请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);
    
    if (request.action === 'download') {
        console.log('Starting download process...');
        
        try {
            // 生成带时间戳的文件名
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${timestamp}-${request.filename}`;
            console.log('Generated filename:', filename);

            // 使用Chrome下载API保存文件
            console.log('Initiating download...');
            chrome.downloads.download({
                url: request.url,
                filename: filename,
                saveAs: false
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.error('Download failed:', chrome.runtime.lastError);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    console.log('Download started with ID:', downloadId);
                    sendResponse({ success: true, downloadId: downloadId });
                }
            });
        } catch (error) {
            console.error('Error in download process:', error);
            sendResponse({ success: false, error: error.message });
        }
        
        return true; // 保持消息通道开放
    }
});
