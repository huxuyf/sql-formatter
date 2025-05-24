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

    // 自定义SQL后处理包装函数
    function customSqlPostFormatter(sql) {
        // 定义基本缩进单位
        const INDENT = '    '; // 4个空格
        
        // 分割SQL为行数组
        let lines = sql.split('\n');
        let result = [];
        
        // 跟踪当前缩进级别和上下文
        let indentLevel = 0;
        let inWhereClause = false;
        let inCaseStatement = false;
        let inSelectClause = false;
        let parenthesesLevel = 0;
        let inJoinClause = false;
        
        // 主要关键字列表（需要在新行开始）
        const mainClauses = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET'];
        
        // JOIN类型列表
        const joinTypes = ['JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN', 'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'FULL OUTER JOIN'];
        
        // 条件连接词
        const conditionConnectors = ['AND', 'OR'];
        
        // CASE语句相关关键字
        const caseKeywords = ['CASE', 'WHEN', 'THEN', 'ELSE', 'END'];
        
        // 处理每一行
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            
            // 跳过空行
            if (!line) {
                result.push('');
                continue;
            }
            
            // 更新括号级别
            let openParenCount = (line.match(/\(/g) || []).length;
            let closeParenCount = (line.match(/\)/g) || []).length;
            
            // 检测主要子句
            let isMainClause = mainClauses.some(clause => line.startsWith(clause));
            
            // 检测JOIN类型
            let isJoinClause = joinTypes.some(join => line.startsWith(join));
            
            // 检测条件连接词
            let isConditionConnector = conditionConnectors.some(conn => line.startsWith(conn));
            
            // 检测CASE语句关键字
            let isCaseKeyword = caseKeywords.some(keyword => line.startsWith(keyword));
            
            // 更新上下文状态
            if (line.startsWith('SELECT')) {
                inSelectClause = true;
                inWhereClause = false;
                inJoinClause = false;
            } else if (line.startsWith('FROM')) {
                inSelectClause = false;
                inWhereClause = false;
                inJoinClause = false;
            } else if (line.startsWith('WHERE')) {
                inWhereClause = true;
                inSelectClause = false;
                inJoinClause = false;
            } else if (isJoinClause) {
                inJoinClause = true;
                inSelectClause = false;
                inWhereClause = false;
            } else if (line.startsWith('CASE')) {
                inCaseStatement = true;
            } else if (line.startsWith('END')) {
                inCaseStatement = false;
            }
            
            // 调整缩进级别
            if (isMainClause && !inCaseStatement) {
                // 主要子句重置缩进级别
                indentLevel = 0;
            } else if (isJoinClause) {
                // JOIN子句保持与FROM同级
                indentLevel = 1;
            } else if (isConditionConnector && inWhereClause) {
                // WHERE子句中的AND/OR额外缩进
                indentLevel = 1;
            }
            
            // CASE语句特殊处理
            if (isCaseKeyword) {
                if (line.startsWith('CASE')) {
                    // CASE开始，缩进不变
                } else if (line.startsWith('WHEN')) {
                    // WHEN比CASE多一级缩进
                    indentLevel = Math.max(1, indentLevel);
                } else if (line.startsWith('THEN') || line.startsWith('ELSE')) {
                    // THEN和ELSE比WHEN多一级缩进
                    indentLevel = Math.max(2, indentLevel);
                } else if (line.startsWith('END')) {
                    // END与CASE同级
                    indentLevel = Math.max(0, indentLevel - 1);
                }
            }
            
            // 处理注释行
            if (line.startsWith('--') || line.startsWith('/*')) {
                // 注释保持当前缩进级别
            }
            
            // 处理多行注释的内部行
            if (line.startsWith('*') && !line.startsWith('*/')) {
                // 多行注释内部行保持与注释开始行相同的缩进
            }
            
            // 应用当前缩进
            let currentIndent = INDENT.repeat(indentLevel);
            result.push(currentIndent + line);
            
            // 更新括号级别
            parenthesesLevel += openParenCount - closeParenCount;
        }
        
        return result.join('\n');
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
            let formattedSQL = sqlFormatter.format(rawSQL, {
                language: 'sql', // 使用标准SQL方言
                uppercase: true,     // 关键字转为大写
                linesBetweenQueries: 2, // 查询之间的空行数
                keywordCase: 'upper',    // 关键字大写
                identifierCase: 'upper', // 标识符大写
                functionCase: 'upper',   // 函数名大写
                indentation: '    ',     // 使用4个空格作为缩进
                expressionWidth: 80      // 表达式宽度限制
            });
            
            // 应用自定义后处理
            formattedSQL = customSqlPostFormatter(formattedSQL);
            
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