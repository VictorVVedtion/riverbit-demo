/**
 * RiverBit 搜索索引服务
 * Search Index Service - Advanced Search Optimization
 */

import { Asset, AssetType, AssetCategory } from '../types/asset';

export interface SearchResult {
  asset: Asset;
  score: number;
  matchType: 'symbol' | 'name' | 'category' | 'tag';
  matchText: string;
}

export interface SearchOptions {
  limit?: number;
  minScore?: number;
  includeInactive?: boolean;
  fuzzyMatch?: boolean;
  categoryBoost?: Record<AssetCategory, number>;
  typeBoost?: Record<AssetType, number>;
}

export interface IndexEntry {
  id: string;
  asset: Asset;
  searchableText: string;
  tokens: string[];
  categories: string[];
  tags: string[];
  weight: number;
}

export class SearchIndexService {
  private index: Map<string, IndexEntry> = new Map();
  private symbolIndex: Map<string, string[]> = new Map();
  private nameIndex: Map<string, string[]> = new Map();
  private categoryIndex: Map<string, string[]> = new Map();
  private tagIndex: Map<string, string[]> = new Map();
  
  // 搜索配置
  private readonly config = {
    minTokenLength: 2,
    maxResults: 50,
    defaultMinScore: 0.1,
    fuzzyThreshold: 0.7,
    
    // 权重配置
    weights: {
      symbol: 10,
      name: 5,
      category: 3,
      tag: 2,
      trending: 1.5,
      popular: 1.3,
      favorite: 2.0
    },
    
    // 分类和类型权重
    categoryBoosts: {
      [AssetCategory.MAGNIFICENT_7]: 1.5,
      [AssetCategory.LAYER_1]: 1.3,
      [AssetCategory.DEFI]: 1.2,
      [AssetCategory.MEME]: 1.1,
      [AssetCategory.AI]: 1.4,
      [AssetCategory.GAMING]: 1.1,
      [AssetCategory.TECH]: 1.2,
      [AssetCategory.FAANG]: 1.4,
      [AssetCategory.SP500]: 1.1,
      [AssetCategory.MAJOR_PAIRS]: 1.3,
      [AssetCategory.PRECIOUS_METALS]: 1.1,
      [AssetCategory.ENERGY]: 1.1,
      [AssetCategory.LAYER_2]: 1.2
    },
    
    typeBoosts: {
      [AssetType.CRYPTO]: 1.2,
      [AssetType.STOCK]: 1.1,
      [AssetType.COMMODITY]: 1.0,
      [AssetType.FOREX]: 1.0,
      [AssetType.INDEX]: 1.0
    }
  };

  constructor() {
    console.log('Search Index Service initialized');
  }

  // 构建搜索索引
  public async buildIndex(assets: Asset[]): Promise<void> {
    console.log(`Building search index for ${assets.length} assets...`);
    
    // 清空现有索引
    this.clearIndex();

    for (const asset of assets) {
      await this.addToIndex(asset);
    }

    console.log(`Search index built with ${this.index.size} entries`);
  }

  // 添加资产到索引
  public async addToIndex(asset: Asset): Promise<void> {
    const entry = this.createIndexEntry(asset);
    this.index.set(asset.id, entry);
    
    // 更新各种索引
    this.updateSymbolIndex(asset);
    this.updateNameIndex(asset);
    this.updateCategoryIndex(asset);
    this.updateTagIndex(asset);
  }

  // 从索引移除资产
  public removeFromIndex(assetId: string): void {
    const entry = this.index.get(assetId);
    if (!entry) return;

    this.index.delete(assetId);
    
    // 从各种索引中移除
    this.removeFromSymbolIndex(entry.asset);
    this.removeFromNameIndex(entry.asset);
    this.removeFromCategoryIndex(entry.asset);
    this.removeFromTagIndex(entry.asset);
  }

  // 更新索引中的资产
  public async updateIndex(asset: Asset): Promise<void> {
    this.removeFromIndex(asset.id);
    await this.addToIndex(asset);
  }

  // 搜索资产
  public async search(
    query: string, 
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!query || query.length < this.config.minTokenLength) {
      return [];
    }

    const {
      limit = this.config.maxResults,
      minScore = this.config.defaultMinScore,
      includeInactive = false,
      fuzzyMatch = true,
      categoryBoost = {},
      typeBoost = {}
    } = options;

    const normalizedQuery = this.normalizeText(query);
    const queryTokens = this.tokenize(normalizedQuery);
    
    const results: SearchResult[] = [];

    // 搜索各种索引
    const symbolMatches = this.searchSymbolIndex(normalizedQuery, queryTokens);
    const nameMatches = this.searchNameIndex(normalizedQuery, queryTokens);
    const categoryMatches = this.searchCategoryIndex(normalizedQuery, queryTokens);
    const tagMatches = this.searchTagIndex(normalizedQuery, queryTokens);

    // 合并所有匹配结果
    const allMatches = new Map<string, SearchResult>();

    // 处理符号匹配
    for (const result of symbolMatches) {
      allMatches.set(result.asset.id, result);
    }

    // 处理名称匹配
    for (const result of nameMatches) {
      const existing = allMatches.get(result.asset.id);
      if (existing) {
        existing.score += result.score * 0.7; // 降低权重避免重复计分
      } else {
        allMatches.set(result.asset.id, result);
      }
    }

    // 处理分类匹配
    for (const result of categoryMatches) {
      const existing = allMatches.get(result.asset.id);
      if (existing) {
        existing.score += result.score * 0.5;
      } else {
        allMatches.set(result.asset.id, result);
      }
    }

    // 处理标签匹配
    for (const result of tagMatches) {
      const existing = allMatches.get(result.asset.id);
      if (existing) {
        existing.score += result.score * 0.3;
      } else {
        allMatches.set(result.asset.id, result);
      }
    }

    // 应用额外权重和过滤
    for (const result of allMatches.values()) {
      const asset = result.asset;
      
      // 过滤非活跃资产
      if (!includeInactive && !asset.isActive) {
        continue;
      }

      // 应用分类权重提升
      const categoryBoostValue = categoryBoost[asset.category] || 
        this.config.categoryBoosts[asset.category] || 1;
      result.score *= categoryBoostValue;

      // 应用类型权重提升
      const typeBoostValue = typeBoost[asset.type] || 
        this.config.typeBoosts[asset.type] || 1;
      result.score *= typeBoostValue;

      // 应用资产状态权重
      if (asset.isFavorite) {
        result.score *= this.config.weights.favorite;
      }
      if (asset.trending) {
        result.score *= this.config.weights.trending;
      }
      if (asset.isPopular) {
        result.score *= this.config.weights.popular;
      }

      // 应用模糊匹配（如果启用）
      if (fuzzyMatch) {
        const fuzzyScore = this.calculateFuzzyScore(query, asset);
        result.score *= (1 + fuzzyScore * 0.2);
      }

      if (result.score >= minScore) {
        results.push(result);
      }
    }

    // 排序并限制结果数量
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  // 获取建议（自动完成）
  public getSuggestions(query: string, limit: number = 10): string[] {
    const normalizedQuery = this.normalizeText(query).toLowerCase();
    const suggestions = new Set<string>();

    // 从符号索引获取建议
    for (const [symbol] of this.symbolIndex.entries()) {
      if (symbol.toLowerCase().startsWith(normalizedQuery)) {
        suggestions.add(symbol);
      }
    }

    // 从名称索引获取建议
    for (const [name] of this.nameIndex.entries()) {
      if (name.toLowerCase().startsWith(normalizedQuery)) {
        suggestions.add(name);
      }
    }

    // 从分类索引获取建议
    for (const [category] of this.categoryIndex.entries()) {
      if (category.toLowerCase().startsWith(normalizedQuery)) {
        suggestions.add(category);
      }
    }

    return Array.from(suggestions).slice(0, limit);
  }

  // 获取热门搜索词
  public getPopularSearches(): string[] {
    // 返回基于资产受欢迎程度的搜索词
    const assets = Array.from(this.index.values())
      .map(entry => entry.asset)
      .filter(asset => asset.isPopular || asset.trending)
      .sort((a, b) => {
        const scoreA = (a.isPopular ? 1 : 0) + (a.trending ? 1 : 0);
        const scoreB = (b.isPopular ? 1 : 0) + (b.trending ? 1 : 0);
        return scoreB - scoreA;
      });

    return assets.slice(0, 10).map(asset => asset.symbol);
  }

  // 私有方法

  // 创建索引条目
  private createIndexEntry(asset: Asset): IndexEntry {
    const searchableText = this.createSearchableText(asset);
    const tokens = this.tokenize(searchableText);
    
    // 计算基础权重
    let weight = 1;
    if (asset.isFavorite) weight *= 1.5;
    if (asset.trending) weight *= 1.3;
    if (asset.isPopular) weight *= 1.2;

    return {
      id: asset.id,
      asset,
      searchableText,
      tokens,
      categories: [asset.category],
      tags: asset.tags,
      weight
    };
  }

  // 创建可搜索文本
  private createSearchableText(asset: Asset): string {
    const parts = [
      asset.symbol,
      asset.name,
      asset.category,
      ...asset.tags
    ];

    return parts.join(' ').toLowerCase();
  }

  // 文本标准化
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // 移除特殊字符
      .replace(/\s+/g, ' ') // 合并多个空格
      .trim();
  }

  // 文本分词
  private tokenize(text: string): string[] {
    return text
      .split(/\s+/)
      .filter(token => token.length >= this.config.minTokenLength);
  }

  // 搜索符号索引
  private searchSymbolIndex(query: string, tokens: string[]): SearchResult[] {
    const results: SearchResult[] = [];

    for (const [symbol, assetIds] of this.symbolIndex.entries()) {
      const score = this.calculateMatchScore(symbol, query, tokens, 'symbol');
      if (score > 0) {
        for (const assetId of assetIds) {
          const entry = this.index.get(assetId);
          if (entry) {
            results.push({
              asset: entry.asset,
              score: score * this.config.weights.symbol * entry.weight,
              matchType: 'symbol',
              matchText: symbol
            });
          }
        }
      }
    }

    return results;
  }

  // 搜索名称索引
  private searchNameIndex(query: string, tokens: string[]): SearchResult[] {
    const results: SearchResult[] = [];

    for (const [name, assetIds] of this.nameIndex.entries()) {
      const score = this.calculateMatchScore(name, query, tokens, 'name');
      if (score > 0) {
        for (const assetId of assetIds) {
          const entry = this.index.get(assetId);
          if (entry) {
            results.push({
              asset: entry.asset,
              score: score * this.config.weights.name * entry.weight,
              matchType: 'name',
              matchText: name
            });
          }
        }
      }
    }

    return results;
  }

  // 搜索分类索引
  private searchCategoryIndex(query: string, tokens: string[]): SearchResult[] {
    const results: SearchResult[] = [];

    for (const [category, assetIds] of this.categoryIndex.entries()) {
      const score = this.calculateMatchScore(category, query, tokens, 'category');
      if (score > 0) {
        for (const assetId of assetIds) {
          const entry = this.index.get(assetId);
          if (entry) {
            results.push({
              asset: entry.asset,
              score: score * this.config.weights.category * entry.weight,
              matchType: 'category',
              matchText: category
            });
          }
        }
      }
    }

    return results;
  }

  // 搜索标签索引
  private searchTagIndex(query: string, tokens: string[]): SearchResult[] {
    const results: SearchResult[] = [];

    for (const [tag, assetIds] of this.tagIndex.entries()) {
      const score = this.calculateMatchScore(tag, query, tokens, 'tag');
      if (score > 0) {
        for (const assetId of assetIds) {
          const entry = this.index.get(assetId);
          if (entry) {
            results.push({
              asset: entry.asset,
              score: score * this.config.weights.tag * entry.weight,
              matchType: 'tag',
              matchText: tag
            });
          }
        }
      }
    }

    return results;
  }

  // 计算匹配分数
  private calculateMatchScore(
    text: string, 
    query: string, 
    tokens: string[], 
    type: string
  ): number {
    const normalizedText = this.normalizeText(text);
    const textTokens = this.tokenize(normalizedText);

    let score = 0;

    // 完全匹配（最高分）
    if (normalizedText === query) {
      score += 1.0;
    }
    // 前缀匹配
    else if (normalizedText.startsWith(query)) {
      score += 0.8;
    }
    // 包含匹配
    else if (normalizedText.includes(query)) {
      score += 0.6;
    }

    // 令牌匹配
    for (const token of tokens) {
      for (const textToken of textTokens) {
        if (textToken === token) {
          score += 0.3;
        } else if (textToken.startsWith(token)) {
          score += 0.2;
        }
      }
    }

    return Math.min(score, 1.0);
  }

  // 计算模糊匹配分数
  private calculateFuzzyScore(query: string, asset: Asset): number {
    const searchTargets = [asset.symbol, asset.name, ...asset.tags];
    let maxScore = 0;

    for (const target of searchTargets) {
      const score = this.levenshteinSimilarity(
        this.normalizeText(query),
        this.normalizeText(target)
      );
      maxScore = Math.max(maxScore, score);
    }

    return maxScore >= this.config.fuzzyThreshold ? maxScore : 0;
  }

  // Levenshtein距离相似度
  private levenshteinSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  // Levenshtein距离
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[j][i] = matrix[j - 1][i - 1];
        } else {
          matrix[j][i] = Math.min(
            matrix[j - 1][i - 1] + 1, // 替换
            matrix[j][i - 1] + 1,     // 插入
            matrix[j - 1][i] + 1      // 删除
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  // 更新符号索引
  private updateSymbolIndex(asset: Asset): void {
    const symbol = this.normalizeText(asset.symbol);
    if (!this.symbolIndex.has(symbol)) {
      this.symbolIndex.set(symbol, []);
    }
    this.symbolIndex.get(symbol)!.push(asset.id);
  }

  // 更新名称索引
  private updateNameIndex(asset: Asset): void {
    const name = this.normalizeText(asset.name);
    if (!this.nameIndex.has(name)) {
      this.nameIndex.set(name, []);
    }
    this.nameIndex.get(name)!.push(asset.id);
  }

  // 更新分类索引
  private updateCategoryIndex(asset: Asset): void {
    const category = this.normalizeText(asset.category);
    if (!this.categoryIndex.has(category)) {
      this.categoryIndex.set(category, []);
    }
    this.categoryIndex.get(category)!.push(asset.id);
  }

  // 更新标签索引
  private updateTagIndex(asset: Asset): void {
    for (const tag of asset.tags) {
      const normalizedTag = this.normalizeText(tag);
      if (!this.tagIndex.has(normalizedTag)) {
        this.tagIndex.set(normalizedTag, []);
      }
      this.tagIndex.get(normalizedTag)!.push(asset.id);
    }
  }

  // 从符号索引移除
  private removeFromSymbolIndex(asset: Asset): void {
    const symbol = this.normalizeText(asset.symbol);
    const assetIds = this.symbolIndex.get(symbol);
    if (assetIds) {
      const index = assetIds.indexOf(asset.id);
      if (index > -1) {
        assetIds.splice(index, 1);
        if (assetIds.length === 0) {
          this.symbolIndex.delete(symbol);
        }
      }
    }
  }

  // 从名称索引移除
  private removeFromNameIndex(asset: Asset): void {
    const name = this.normalizeText(asset.name);
    const assetIds = this.nameIndex.get(name);
    if (assetIds) {
      const index = assetIds.indexOf(asset.id);
      if (index > -1) {
        assetIds.splice(index, 1);
        if (assetIds.length === 0) {
          this.nameIndex.delete(name);
        }
      }
    }
  }

  // 从分类索引移除
  private removeFromCategoryIndex(asset: Asset): void {
    const category = this.normalizeText(asset.category);
    const assetIds = this.categoryIndex.get(category);
    if (assetIds) {
      const index = assetIds.indexOf(asset.id);
      if (index > -1) {
        assetIds.splice(index, 1);
        if (assetIds.length === 0) {
          this.categoryIndex.delete(category);
        }
      }
    }
  }

  // 从标签索引移除
  private removeFromTagIndex(asset: Asset): void {
    for (const tag of asset.tags) {
      const normalizedTag = this.normalizeText(tag);
      const assetIds = this.tagIndex.get(normalizedTag);
      if (assetIds) {
        const index = assetIds.indexOf(asset.id);
        if (index > -1) {
          assetIds.splice(index, 1);
          if (assetIds.length === 0) {
            this.tagIndex.delete(normalizedTag);
          }
        }
      }
    }
  }

  // 清空索引
  private clearIndex(): void {
    this.index.clear();
    this.symbolIndex.clear();
    this.nameIndex.clear();
    this.categoryIndex.clear();
    this.tagIndex.clear();
  }

  // 获取索引统计信息
  public getIndexStats(): {
    totalEntries: number;
    symbolEntries: number;
    nameEntries: number;
    categoryEntries: number;
    tagEntries: number;
    averageTokensPerEntry: number;
  } {
    const totalTokens = Array.from(this.index.values())
      .reduce((sum, entry) => sum + entry.tokens.length, 0);

    return {
      totalEntries: this.index.size,
      symbolEntries: this.symbolIndex.size,
      nameEntries: this.nameIndex.size,
      categoryEntries: this.categoryIndex.size,
      tagEntries: this.tagIndex.size,
      averageTokensPerEntry: this.index.size > 0 ? totalTokens / this.index.size : 0
    };
  }

  // 清理资源
  public destroy(): void {
    this.clearIndex();
  }
}

export default SearchIndexService;