/**
 * AIHelpers.gs — Worker API 通信 + 智能解析
 */

/**
 * 调用 Worker AI 解析自然语言输入
 * @param {string} text - 用户输入（如 "coffee 4.50"）
 * @param {string} licenseKey
 * @returns {Array} [{date, amount, category, notes, flag, confidence, _fallback}]
 */
function callClassify(text, licenseKey) {
  const url = WORKER_BASE_URL + '/classify';

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      text: text,
      licenseKey: licenseKey,
      today: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    }),
    muteHttpExceptions: true,
    timeout: 15000,
  };

  try {
    const resp = UrlFetchApp.fetch(url, options);
    const code = resp.getResponseCode();
    const data = JSON.parse(resp.getContentText());

    if (code === 200) {
      if (data.entries && data.entries.length > 0) {
        // Detect AI fallback mode — worker had trouble but returned a result
        if (data._ai_fallback) {
          // Mark entries so UI can show "offline/simplified" indicator
          data.entries.forEach(function(e) { e._fallback = true; });
        }
        return data.entries;
      }
      throw new Error(data.error || 'Empty response');
    }
    if (code === 403) {
      updateStatus(_('license_invalid'));
      throw new Error('License invalid. Please re-activate from the menu.');
    }
    throw new Error(data.error || 'Worker error (' + code + ')');
  } catch (e) {
    // Network error or Worker down → local fallback
    const fallback = localParse(text);
    fallback._fallback = true;  // mark as offline
    return [fallback];
  }
}

/**
 * 调用 Worker 生成 AI 月度报告
 * @param {Array} transactions - 当月交易数据
 * @param {string} licenseKey
 * @returns {Object} {summary, highlights, anomalies, suggestions, topCategories}
 */
function callReport(transactions, licenseKey) {
  const url = WORKER_BASE_URL + '/report';

  // Read language from settings
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName(SHEET_NAME_SETTINGS);
  let language = 'en';
  if (settingsSheet) {
    language = String(settingsSheet.getRange('B4').getValue()).trim() || 'en';
  }

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      transactions: transactions,
      licenseKey: licenseKey,
      language: language,
    }),
    muteHttpExceptions: true,
    timeout: 20000,
  };

  try {
    const resp = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(resp.getContentText());
    if (data.error) throw new Error(data.error);
    return data;
  } catch (e) {
    // Compute a useful offline summary from the data itself
    const totals = {};
    let totalSpent = 0;
    let maxCat = '';
    let maxAmt = 0;
    let flagCount = 0;

    transactions.forEach(function(t) {
      const cat = t.category || 'Other';
      const amt = parseFloat(t.amount) || 0;
      totals[cat] = (totals[cat] || 0) + amt;
      totalSpent += amt;
      if (t.flag) flagCount++;
    });

    // Sort categories by spend
    const sorted = Object.entries(totals).sort(function(a, b) { return b[1] - a[1]; });
    if (sorted.length > 0) {
      maxCat = sorted[0][0];
      maxAmt = sorted[0][1];
    }

    const topCats = sorted.slice(0, 3).map(function(c) {
      return { category: c[0], amount: c[1], percentage: totalSpent > 0 ? +(c[1] / totalSpent * 100).toFixed(1) : 0 };
    });

    const count = transactions.length;
    const avg = count > 0 ? totalSpent / count : 0;
    const summary = 'You had ' + count + ' transaction' + (count > 1 ? 's' : '') +
      ' this period totaling $' + totalSpent.toFixed(2) +
      '. Average $' + avg.toFixed(2) + ' per entry. ' +
      'Top category: ' + maxCat + ' ($' + maxAmt.toFixed(2) + '). ' +
      (flagCount > 0 ? flagCount + ' transaction' + (flagCount > 1 ? 's were' : ' was') + ' flagged for review. ' : '') +
      'Connect to the internet and click "AI Monthly Report" again for AI-powered insights.';

    return {
      summary: summary,
      highlights: [
        'Total spending: $' + totalSpent.toFixed(2) + ' across ' + count + ' entries',
        'Highest category: ' + maxCat + ' ($' + maxAmt.toFixed(2) + ')',
        'Average per transaction: $' + avg.toFixed(2),
      ],
      anomalies: flagCount > 0 ? [flagCount + ' transactions flagged for review'] : [],
      suggestions: [
        'Connect to the web and run the report again for AI-powered analysis',
        'Review your ' + maxCat + ' spending — it was ' + (maxAmt / (totalSpent || 1) * 100).toFixed(0) + '% of total',
      ],
      topCategories: topCats,
      _fallback: true,
    };
  }
}

/**
 * 通知 Worker 用户的分类修正（智能学习）
 */
function callLearn(text, category, licenseKey) {
  const url = WORKER_BASE_URL + '/learn';

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      text: text,
      category: category,
      licenseKey: licenseKey,
    }),
    muteHttpExceptions: true,
    timeout: 5000,
  };

  try {
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    // Silent — learning is non-critical
  }
}

/**
 * 批量分类（用于 CSV 导入）
 * @param {string[]} descriptions - 描述数组
 * @param {string} licenseKey
 * @returns {Array} [{date, amount, category, notes, flag, confidence}]
 */
function callBatchClassify(descriptions, licenseKey) {
  const url = WORKER_BASE_URL + '/batch-classify';

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      descriptions: descriptions,
      licenseKey: licenseKey,
      today: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    }),
    muteHttpExceptions: true,
    timeout: 30000,
  };

  try {
    const resp = UrlFetchApp.fetch(url, options);
    const code = resp.getResponseCode();
    const data = JSON.parse(resp.getContentText());

    if (code === 200 && data.entries && data.entries.length > 0) {
      if (data._ai_fallback) {
        data.entries.forEach(function(e) { e._fallback = true; });
      }
      return data.entries;
    }
    throw new Error(data.error || 'Batch classify failed');
  } catch (e) {
    throw e; // Let caller handle fallback
  }
}

/**
 * 本地解析（Worker 不可达时的 fallback）
 * 确保产品离线也能用
 * 置信度：有金额+有分类匹配=0.7，有金额无分类=0.5，无金额=0.3
 */
function localParse(input) {
  const lower = String(input).toLowerCase().trim();
  if (!lower) {
    return { date: today(), amount: 0, category: 'Other', notes: '', flag: null, confidence: 0 };
  }

  // Extract amount
  const amountMatch = lower.match(/\$?(\d+[.,]?\d*)/);
  let amount = 0;
  let hasAmount = false;
  if (amountMatch) {
    amount = parseFloat(amountMatch[1].replace(',', '.'));
    if (amount > 0) hasAmount = true;
  }

  // Smart category matching
  const patterns = getCategoryPatterns();
  let category = 'Other';
  let bestScore = 0;
  for (const { regex, cat } of patterns) {
    const matches = (lower.match(regex) || []).length;
    if (matches > bestScore) {
      bestScore = matches;
      category = cat;
    }
  }

  const hasCategory = bestScore > 0;

  // Confidence: both amount and category = 0.7, only amount = 0.5, only category = 0.4, neither = 0.2
  let confidence = 0.2;
  if (hasAmount && hasCategory) confidence = 0.7;
  else if (hasAmount) confidence = 0.5;
  else if (hasCategory) confidence = 0.4;

  // Clean notes: remove amount, keep descriptive text
  let notes = lower
    .replace(/\$?(\d+[.,]?\d*)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If notes is empty after cleaning, use original
  if (!notes) notes = lower;

  // Flag: amount unusually high
  let flag = null;
  if (amount > 1000) {
    flag = '⚠️ Amount over $1,000 — please verify';
  } else if (amount > 500) {
    flag = '⚠️ Amount is higher than usual';
  } else if (!hasAmount && hasCategory) {
    flag = '🔍 No amount detected — edit to add';
  }

  return {
    date: today(),
    amount: amount,
    category: category,
    notes: notes,
    flag: flag,
    confidence: confidence,
  };
}

function today() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function getCategoryPatterns() {
  return [
    { regex: /\b(coffee|latte|espresso|starbucks|dunkin|cafe|bakery|croissant)\b/, cat: 'Food & Drink' },
    { regex: /\b(grocery|supermarket|kroger|safeway|wholefoods|aldi|publix|wegmans)\b/, cat: 'Groceries' },
    { regex: /\b(uber|lyft|taxi|gas|fuel|parking|toll|metro|bus|train|subway|lyft)\b/, cat: 'Transportation' },
    { regex: /\b(rent|mortgage|lease|apartment|condo)\b/, cat: 'Rent' },
    { regex: /\b(movie|netflix|spotify|concert|game|ticket|cinema|hulu|disney\+|youtube)\b/, cat: 'Entertainment' },
    { regex: /\b(doctor|dentist|hospital|pharmacy|medical|clinic|therapy|vision|eye)\b/, cat: 'Healthcare' },
    { regex: /\b(amazon|shopping|mall|clothes|shoe|zara|nike|adidas|target|bestbuy|costco)\b/, cat: 'Shopping' },
    { regex: /\b(course|class|tuiton|book|udemy|coursera|skillshare|training)\b/, cat: 'Education' },
    { regex: /\b(electric|water|gas|bill|phone|internet|utility|comcast|verizon|att|t-mobile)\b/, cat: 'Utilities' },
    { regex: /\b(salary|paycheck|income|deposit|refund|bonus)\b/, cat: 'Salary' },
    { regex: /\b(transfer|venmo|paypal|zelle|wire|move)\b/, cat: 'Transfer' },
    { regex: /\b(lunch|dinner|breakfast|restaurant|food|takeout|delivery|doordash|ubereats|grubhub|pizza|sushi)\b/, cat: 'Food & Drink' },
    { regex: /\b(hotel|flight|airbnb|travel|vacation|trip|booking|expedia|airline|stay)\b/, cat: 'Travel' },
    { regex: /\b(insurance|aetna|bluecross|kaiser|unitedhealth)\b/, cat: 'Insurance' },
    { regex: /\b(subscription|membership|patreon|iwara|fanbox|subscribestar)\b/, cat: 'Subscription' },
  ];
}
