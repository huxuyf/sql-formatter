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
        lineWrapping: false, // 设置为 false 以允许横向滚动
        tabSize: 4,
        readOnly: true
    });

    // 获取放大/还原按钮
    const expandBtn = document.getElementById('expand-btn');
    
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
    /**
     * 根据特定规则对格式化后的SQL进行后处理
     * 1. 移除所有行首的空格和制表符
     * 2. 将所有换行符替换为空格
     * 3. 将连续的多个空格合并为一个空格
     * 4. 在特定关键词前添加换行符
     * 5. 将数据类型全部大写
     * 
     * @param {string} sql - 已格式化的SQL字符串
     * @returns {string} - 后处理后的SQL字符串
     */
    function customSqlPostFormatter(sql) {
        // 1. 将所有换行符替换为空格
        sql = sql.replace(/\r?\n/g, ' ');
        
        // 2. 将连续的多个空格合并为一个空格
        sql = sql.replace(/\s+/g, ' ');
        
        // 3. 移除所有行首的空格和制表符
        sql = sql.replace(/^[ \t]+/gm, '');
        
        // 新增：将所有"( "替换为"("，" )"替换为")"
        sql = sql.replace(/\( /g, '(');
        sql = sql.replace(/ \)/g, ')');

        // 4. 在特定关键词前添加换行符，但括号内的AND和OR关键词除外
        // 分为两组关键词：常规关键词和特殊处理的关键词(AND, OR)
        const regularKeywords = ['SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING',
            'UPDATE', 'SET', 'JOIN', 'LEFT JOIN', 'CREATE',
            'INSERT', 'VALUES'];
        const specialKeywords = ['AND', 'OR'];
        
        // 先处理常规关键词，这些关键词总是添加换行符
        regularKeywords.forEach(keyword => {
            // 使用正则表达式确保只匹配完整的关键词
            const regex = new RegExp(`\\s${keyword}\\s`, 'gi');
            sql = sql.replace(regex, `\n${keyword} `);
        });
        
        // 特殊处理CASE...WHEN...END结构
        // 先处理CASE关键词，添加换行符
        sql = sql.replace(/\s(CASE)\s/gi, '\nCASE ');
        
        // 处理WHEN关键词，需要区分第一个WHEN和后续WHEN
        // 找出所有CASE...END块
        let result = '';
        let lastPos = 0;
        let casePattern = /\bCASE\b.*?\bEND\b/gis;
        let match;
        
        while ((match = casePattern.exec(sql)) !== null) {
            // 添加CASE之前的内容
            result += sql.substring(lastPos, match.index);
            
            // 获取CASE...END块
            let caseBlock = match[0];
            let caseStartIndex = caseBlock.toUpperCase().indexOf('CASE');
            let firstWhenIndex = caseBlock.toUpperCase().indexOf('WHEN', caseStartIndex);
            
            if (firstWhenIndex > -1) {
                // 处理第一个WHEN，不换行
                let processedBlock = caseBlock.substring(0, firstWhenIndex) + 
                                    caseBlock.substring(firstWhenIndex, firstWhenIndex + 4) + ' ' +
                                    caseBlock.substring(firstWhenIndex + 4);
                
                // 处理后续的WHEN，换行并缩进
                processedBlock = processedBlock.replace(/\s(WHEN)\s(?!.*?\bCASE\b.*?\1)/gi, '\n    WHEN ');
                
                // 处理END关键词，换行但不缩进
                processedBlock = processedBlock.replace(/\s(END)\b/gi, '\nEND');
                
                result += processedBlock;
            } else {
                result += caseBlock;
            }
            
            lastPos = match.index + match[0].length;
        }
        
        // 添加剩余部分
        if (lastPos < sql.length) {
            result += sql.substring(lastPos);
        }
        
        sql = result;
        
        // 然后处理特殊关键词(AND, OR)，只有在括号外且不在CASE...END块内才添加换行符
        result = '';
        let inParentheses = 0;
        let inCaseBlock = false;
        let lastIndex = 0;
        
        // 遍历SQL字符串，跟踪括号嵌套层级和CASE块
        for (let i = 0; i < sql.length; i++) {
            // 检查是否进入CASE块
            if (i + 4 <= sql.length && sql.substring(i, i + 4).toUpperCase() === 'CASE' && 
                (i === 0 || /\s/.test(sql[i-1]))) {
                inCaseBlock = true;
            }
            // 检查是否离开CASE块
            else if (i + 3 <= sql.length && sql.substring(i, i + 3).toUpperCase() === 'END' && 
                    (i + 3 === sql.length || /\s/.test(sql[i+3]))) {
                inCaseBlock = false;
            }
            
            if (sql[i] === '(') {
                inParentheses++;
            } else if (sql[i] === ')') {
                inParentheses--;
                if (inParentheses < 0) inParentheses = 0; // 防止括号不匹配的情况
            } else if (inParentheses === 0 && !inCaseBlock) {
                // 只在不在括号内且不在CASE块内时检查特殊关键词
                for (const keyword of specialKeywords) {
                    // 检查当前位置是否是关键词的开始
                    if (i > 0 && sql[i-1] === ' ' && 
                        sql.substring(i, i + keyword.length).toUpperCase() === keyword && 
                        i + keyword.length < sql.length && sql[i + keyword.length] === ' ') {
                        
                        // 找到关键词，添加换行符
                        result += sql.substring(lastIndex, i) + '\n' + keyword + ' ';
                        lastIndex = i + keyword.length + 1; // 跳过关键词和后面的空格
                        i = lastIndex - 1; // 调整索引，考虑循环会自增i
                        break;
                    }
                }
            }
        }
        
        // 添加剩余部分
        if (lastIndex < sql.length) {
            result += sql.substring(lastIndex);
            sql = result;
        }
        
        // 5. 将数据类型全部大写
        const dataTypes = ['number', 'date', 'varchar', 'char', 'int', 'float', 'decimal', 'boolean', 'text', 'timestamp', 'datetime'];
        dataTypes.forEach(type => {
            // 使用正则表达式确保只匹配完整的数据类型
            const regex = new RegExp(`\\b${type}\\b`, 'gi');
            sql = sql.replace(regex, type.toUpperCase());
        });
        
        // 6. 在分号后面添加换行符
        sql = sql.replace(/;/g, ';\n');
        
        // 7. 对不是以关键词开头的行添加缩进
        const lines = sql.split('\n');
        const indentedLines = lines.map(line => {
            // 跳过空行
            if (!line.trim()) return line;
            
            // 检查行是否以关键词开头
            const startsWithKeyword = regularKeywords.some(keyword => 
                line.trim().toUpperCase().startsWith(keyword));

            const startsWithSpecialKeyword = specialKeywords.some(keyword => 
                line.trim().toUpperCase().startsWith(keyword));

            // 如果不是以任何关键词开头，则添加缩进
            if (!startsWithKeyword && !startsWithSpecialKeyword) { // 避免重复缩进
                return '    ' + line;
            }
            
            return line;
        });
        
        sql = indentedLines.join('\n');
        
        // 新增：处理以"--"开头的行，删除行首的空白符
        sql = sql.replace(/^\s+--/gm, '\n--');
        
        // 调用处理多行括号缩进的函数
        sql = indentMultiLineParentheses(sql);
        
        return sql;
    }

    /**
     * 处理以(开头，以)结尾的多行字符串，从第二行开始在首部加上缩进。
     * 对于括号里面还有括号的情况，左括号是与离它最远的右括号配对。
     *
     * @param {string} sql - SQL字符串
     * @returns {string} - 处理缩进后的SQL字符串
     */
    function indentMultiLineParentheses(sql) {
        // 先找出所有以(开头，以)结尾的块
        const parenthesesBlocks = [];
        let openParenIndices = []; // 存储所有左括号的位置
        
        for (let i = 0; i < sql.length; i++) {
            if (sql[i] === '(') {
                // 记录左括号位置
                openParenIndices.push(i);
            } else if (sql[i] === ')' && openParenIndices.length > 0) {
                // 找到右括号时，取出最早的左括号位置（确保左括号与最远的右括号配对）
                // const openParenIndex = openParenIndices.shift();
                let openParenIndex = openParenIndices.pop();
                
                // 只处理最外层的括号块（没有嵌套在其他括号内的块）
                if (openParenIndices.length === 0) {
                    // 找到一个完整的括号块
                    parenthesesBlocks.push({
                        start: openParenIndex,
                        end: i,
                        content: sql.substring(openParenIndex, i + 1)
                    });
                }
            }
        }
        
        // 处理每个括号块
        for (const block of parenthesesBlocks) {
            const content = block.content;
            
            // 检查是否包含换行符
            if (content.includes('\n')) {
                const lines = content.split('\n');
                // 第一行保持不变，从第二行开始添加缩进
                for (let i = 1; i < lines.length; i++) {
                    if (!lines[i].startsWith('    ')) { // 避免重复缩进
                        lines[i] = '    ' + lines[i];
                    }
                }
                const newContent = lines.join('\n');
                // 替换原内容
                sql = sql.replace(block.content, newContent);
            }
        }
        return sql;
    }

    // 格式化SQL的函数
    function formatSQL() {
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
                identifierCase: 'lower', // 标识符大写
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
    }
    
    // 监听输入区文本变化，自动更新输出区
    inputEditor.on('change', function() {
        formatSQL();
    });

    // 复制函数
    function copyFormattedSQL() {
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
    }
    
    // 输出区域双击复制内容
    outputEditor.on('dblclick', function() {
            copyFormattedSQL();
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

    // 清空函数
    function clearContent() {
        inputEditor.setValue('');
        outputEditor.setValue('');
        showNotification('内容已清空', 'success');
    }
    
    // 为输入区域添加双击事件，双击时清空内容
    inputEditor.on('dblclick', function() {
        clearContent();
    });
    
    // 放大/还原按钮点击事件
    let isExpanded = false;

    const leftPanel = document.querySelector('.md\\:w-1\\/2:first-child');
    const rightPanel = document.querySelector('.md\\:w-1\\/2:last-child');
    
    expandBtn.addEventListener('click', function() {
        if (!isExpanded) {
            // 放大模式
            leftPanel.style.display = 'none';
            rightPanel.classList.remove('md:w-1/2');
            rightPanel.classList.add('w-full');
            expandBtn.textContent = '还原';
        } else {
            // 还原模式
            leftPanel.style.display = '';
            rightPanel.classList.add('md:w-1/2');
            rightPanel.classList.remove('w-full');
            expandBtn.textContent = '放大';
        }
        isExpanded = !isExpanded;
    });

});