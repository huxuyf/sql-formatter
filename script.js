document.addEventListener('DOMContentLoaded', function() {
    // 初始化 CodeMirror 编辑器
    const inputEditor = CodeMirror.fromTextArea(document.getElementById('input-sql'), {
        mode: 'text/x-sql',
        lineNumbers: true,
        theme: 'default',
        indentWithTabs: false,
        indentUnit: 4,
        lineWrapping: true,
        tabSize: 4
    });

    const outputEditor = CodeMirror.fromTextArea(document.getElementById('output-sql'), {
        mode: 'text/x-sql',
        lineNumbers: true,
        theme: 'default',
        indentWithTabs: false,
        indentUnit: 4,
        lineWrapping: true,
        tabSize: 4,
        readOnly: true
    });

    // 获取按钮元素
    const formatBtn = document.getElementById('format-btn');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');
    const notification = document.getElementById('notification');

    // 显示通知函数
    function showNotification(message, type) {
        notification.textContent = message;
        notification.classList.remove('hidden', 'success', 'error');
        notification.classList.add(type);
        
        // 3秒后自动隐藏
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }

    // 格式化按钮点击事件
    formatBtn.addEventListener('click', function() {
        const rawSQL = inputEditor.getValue();
        
        if (!rawSQL.trim()) {
            showNotification('请输入SQL代码', 'error');
            return;
        }

        try {
            // 使用 sql-formatter 格式化 SQL
            const formattedSQL = sqlFormatter.format(rawSQL, {
                language: 'sql', // 使用标准SQL方言
                uppercase: true,     // 关键字转为大写
                linesBetweenQueries: 2, // 查询之间的空行数
                keywordCase: 'upper',    // 关键字大写
                identifierCase: 'upper', // 标识符大写
                functionCase: 'upper',   // 函数名大写
                indentation: '    ',     // 使用4个空格作为缩进
                expressionWidth: 80      // 表达式宽度限制
            });
            
            // 设置格式化后的SQL到输出编辑器
            outputEditor.setValue(formattedSQL);
            
            // 显示成功通知
            showNotification('SQL格式化成功', 'success');
        } catch (error) {
            console.error('SQL格式化错误:', error);
            showNotification('SQL格式化失败: ' + error.message, 'error');
        }
    });

    // 复制按钮点击事件
    copyBtn.addEventListener('click', function() {
        const formattedSQL = outputEditor.getValue();
        
        if (!formattedSQL.trim()) {
            showNotification('没有可复制的内容', 'error');
            return;
        }

        // 使用 Clipboard API 复制文本
        navigator.clipboard.writeText(formattedSQL)
            .then(() => {
                showNotification('已复制到剪贴板', 'success');
            })
            .catch(err => {
                console.error('复制失败:', err);
                showNotification('复制失败', 'error');
                
                // 备用复制方法
                fallbackCopy(formattedSQL);
            });
    });

    // 备用复制方法（兼容性考虑）
    function fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            showNotification('已复制到剪贴板', 'success');
        } catch (err) {
            console.error('备用复制方法失败:', err);
            showNotification('复制失败', 'error');
        }
        
        document.body.removeChild(textarea);
    }

    // 清空按钮点击事件
    clearBtn.addEventListener('click', function() {
        inputEditor.setValue('');
        outputEditor.setValue('');
        showNotification('内容已清空', 'success');
    });

    // 简单的SQL语法预检查
    function checkSQLSyntax(sql) {
        // 检查括号是否匹配
        let openParenCount = 0;
        for (let i = 0; i < sql.length; i++) {
            if (sql[i] === '(') {
                openParenCount++;
            } else if (sql[i] === ')') {
                openParenCount--;
                if (openParenCount < 0) {
                    return false;
                }
            }
        }
        return openParenCount === 0;
    }
});
