import Report from '../models/report.model.js';

// Simple content analysis for auto-moderation
export const analyzeContent = (content) => {
  if (!content) return { score: 0, flags: [] };

  const flags = [];
  let score = 0;

  // Convert to lowercase for analysis
  const text = content.toLowerCase();

  // Spam keywords detection
  const spamKeywords = [
    'buy now', 'click here', 'free money', 'get rich quick',
    'limited time', 'urgent', 'act now', 'guaranteed',
    'no questions asked', 'risk free', 'this is not spam'
  ];

  const spamMatches = spamKeywords.filter(keyword => text.includes(keyword));
  if (spamMatches.length > 0) {
    flags.push(`Potential spam keywords: ${spamMatches.join(', ')}`);
    score += spamMatches.length * 2;
  }

  // Excessive links detection
  const linkCount = (content.match(/https?:\/\/[^\s]+/g) || []).length;
  if (linkCount > 3) {
    flags.push(`Too many links: ${linkCount}`);
    score += linkCount;
  }

  // Excessive caps detection
  const capsCount = (content.match(/[A-Z]/g) || []).length;
  const totalChars = content.replace(/\s/g, '').length;
  const capsPercentage = totalChars > 0 ? (capsCount / totalChars) * 100 : 0;
  
  if (capsPercentage > 60 && totalChars > 10) {
    flags.push('Excessive capital letters');
    score += 3;
  }

  // Repetitive content detection
  const words = text.split(/\s+/);
  const wordCounts = {};
  words.forEach(word => {
    if (word.length > 3) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  });

  const repetitiveWords = Object.entries(wordCounts)
    .filter(([word, count]) => count > 5)
    .map(([word]) => word);

  if (repetitiveWords.length > 0) {
    flags.push(`Repetitive words: ${repetitiveWords.join(', ')}`);
    score += repetitiveWords.length * 2;
  }

  // Inappropriate content keywords (basic)
  const inappropriateKeywords = [
    'hate', 'stupid', 'idiot', 'moron', 'dumb',
    // Add more as needed, but be careful with false positives
  ];

  const inappropriateMatches = inappropriateKeywords.filter(keyword => 
    text.includes(keyword) && !text.includes(`not ${keyword}`)
  );

  if (inappropriateMatches.length > 0) {
    flags.push(`Potentially inappropriate language`);
    score += inappropriateMatches.length * 3;
  }

  return { score, flags };
};

// Auto-flag content if it exceeds threshold
export const autoFlagContent = async (contentType, contentId, content, userId) => {
  const analysis = analyzeContent(content);
  
  // Auto-flag if score is high
  if (analysis.score >= 8) {
    const priority = analysis.score >= 15 ? 'high' : 'medium';
    
    await Report.create({
      reportType: contentType,
      targetId: contentId,
      reportedBy: null, // System report
      contentOwner: userId,
      reason: 'spam',
      description: `Auto-flagged: ${analysis.flags.join('; ')}`,
      priority,
      autoFlagged: true,
      severityScore: analysis.score,
      status: 'pending'
    });

    return true;
  }

  return false;
};

// Check user posting patterns for spam detection
export const checkPostingPattern = async (userId) => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // This would require tracking user posts - implement based on your needs
  // For now, return false (no spam detected)
  return {
    isSpamming: false,
    reason: null
  };
};

export default {
  analyzeContent,
  autoFlagContent,
  checkPostingPattern
};
