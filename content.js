(async function() {
    // 清理文件名，移除非法字符
    function sanitizeFilename(filename) {
        return filename
            .replace(/[^a-zA-Z0-9._-]/g, '_')  // 只保留字母数字和部分符号
            .replace(/_{2,}/g, '_')            // 多个下划线合并为一个  
            .replace(/^[._-]+|[._-]+$/g, '')   // 删除首尾的特殊字符
            || 'webpage';                      // 如果文件名为空则使用默认名
    }

    // 收集所有样式
    async function getAllStyles() {
        const styles = [];
        try {
            // 收集外部样式表
            const styleSheets = Array.from(document.styleSheets);
            for (const sheet of styleSheets) {
                try {
                    const rules = Array.from(sheet.cssRules || sheet.rules);
                    const cssText = rules.map(rule => rule.cssText).join('\n');
                    if (cssText) {
                        styles.push(cssText);
                    }
                } catch (e) {
                    // 处理跨域样式表
                    if (sheet.href) {
                        try {
                            const response = await fetch(sheet.href);
                            const css = await response.text();
                            styles.push(css);
                        } catch (error) {
                            console.warn('Unable to load stylesheet:', sheet.href, error);
                        }
                    }
                }
            }

            const styleElements = document.getElementsByTagName('style');
            for (const style of styleElements) {
                styles.push(style.textContent);
            }
        } catch (error) {
            console.error('Error collecting styles:', error);
        }
        return styles.join('\n');
    }
    // 收集所有图片
    async function getAllImages() {
        const images = document.getElementsByTagName('img');
        for (const img of images) {
            if (!img.src) continue;
            try {
                const response = await fetch(img.src);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const blob = await response.blob();
                const reader = new FileReader();
                const dataUrl = await new Promise((resolve, reject) => {
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                img.src = dataUrl;
            } catch (error) {
                console.warn('Unable to convert image:', img.src, error);
            }
        }
    }

    // 开始保存页面
    try {
        console.log('Starting page save process...');
        
        // 克隆当前文档
        const clone = document.documentElement.cloneNode(true);
        console.log('Document cloned');
        
        // 获取所有样式
        console.log('Collecting styles...');
        const styles = await getAllStyles();
        console.log('Styles collected');
        
        // 创建样式元素
        const styleElement = document.createElement('style');
        styleElement.textContent = styles;
        clone.querySelector('head').appendChild(styleElement);
        console.log('Styles appended to clone');

        // 内联所有图片
        console.log('Processing images...');
        await getAllImages();
        console.log('Images processed');

        // 获取完整的HTML
        const html = '<!DOCTYPE html>\n' + clone.outerHTML;
        console.log('HTML content generated, size:', html.length, 'bytes');

        // 创建文件名
        const filename = sanitizeFilename(document.title || 'webpage') + '.html';
        console.log('Generated filename:', filename);
        
        // 创建data URL
        const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
        console.log('Data URL created');
        
        // 发送消息给background script
        console.log('Sending message to background script...');
        chrome.runtime.sendMessage({
            action: 'download', // 下载请求 
            url: dataUrl,       // 数据URL
            filename: filename  // 文件名
        }, response => {
            if (chrome.runtime.lastError) {
                console.error('Error sending message:', chrome.runtime.lastError);
                return;
            }
            console.log('Message sent successfully, response:', response);
        });
        
    } catch (error) {
        console.error('Error in save process:', error);
    }
})();

