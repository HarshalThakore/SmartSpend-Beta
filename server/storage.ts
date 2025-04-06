import { users, categories, transactions, budgets, alerts, forumTopics, forumReplies, deals } from "@shared/schema";
import type { User, InsertUser, Category, InsertCategory, Transaction, InsertTransaction, Budget, InsertBudget, Alert, InsertAlert, ForumTopic, InsertForumTopic, ForumReply, InsertForumReply, Deal, InsertDeal } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

// Define system settings type
export interface SystemSettings {
  allowRegistration: boolean;
  maintenanceMode: boolean;
  appName: string;
  contactEmail: string;
  backupFrequency: string;
  lastBackup: Date | null;
}

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  // Category methods
  getCategories(): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Transaction methods
  getTransactionsByUser(userId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction>;
  deleteTransaction(id: number): Promise<boolean>;
  getAllTransactions(): Promise<Transaction[]>;
  
  // Budget methods
  getBudgetsByUser(userId: number): Promise<Budget[]>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudget(id: number, budget: Partial<InsertBudget>): Promise<Budget>;
  deleteBudget(id: number): Promise<boolean>;
  getAllBudgets(): Promise<Budget[]>;
  
  // Alert methods
  getAlertsByUser(userId: number): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(id: number): Promise<boolean>;
  getAllAlerts(): Promise<Alert[]>;
  
  // Forum methods
  getAllForumTopics(): Promise<ForumTopic[]>;
  getForumTopicById(id: number): Promise<ForumTopic | undefined>;
  createForumTopic(topic: InsertForumTopic): Promise<ForumTopic>;
  getRepliesByTopic(topicId: number): Promise<ForumReply[]>;
  createForumReply(reply: InsertForumReply): Promise<ForumReply>;
  getAllForumReplies(): Promise<ForumReply[]>;
  
  // Deals methods
  getAllDeals(): Promise<Deal[]>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  
  // System settings
  getSystemSettings(): Promise<any>;
  updateSystemSettings(settings: any): Promise<any>;
  
  // Backup and restore
  restoreFromBackup(backup: any): Promise<boolean>;
  
  // Session store
  sessionStore: any;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private transactions: Map<number, Transaction>;
  private budgets: Map<number, Budget>;
  private alerts: Map<number, Alert>;
  private forumTopics: Map<number, ForumTopic>;
  private forumReplies: Map<number, ForumReply>;
  private deals: Map<number, Deal>;
  
  sessionStore: any;
  
  currentUserId: number = 1;
  currentCategoryId: number = 1;
  currentTransactionId: number = 1;
  currentBudgetId: number = 1;
  currentAlertId: number = 1;
  currentForumTopicId: number = 1;
  currentForumReplyId: number = 1;
  currentDealId: number = 1;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.transactions = new Map();
    this.budgets = new Map();
    this.alerts = new Map();
    this.forumTopics = new Map();
    this.forumReplies = new Map();
    this.deals = new Map();
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Initialize with default categories
    this.initDefaultCategories();
  }
  
  private initDefaultCategories() {
    const defaultCategories: InsertCategory[] = [
      { name: "Housing", type: "fixed", color: "#1976D2" },
      { name: "Groceries", type: "variable", color: "#4CAF50" },
      { name: "Transportation", type: "variable", color: "#FF9800" },
      { name: "Entertainment", type: "discretionary", color: "#9C27B0" },
      { name: "Education", type: "fixed", color: "#607D8B" },
      { name: "Income", type: "income", color: "#00897B" },
    ];
    
    defaultCategories.forEach(category => {
      this.createCategory(category);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      isAdmin: false,
      mfaEnabled: false,
      mfaSecret: null,
      lastLogin: null,
      resetToken: null,
      resetTokenExpiry: null,
      createdAt: now 
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  // Category methods
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }
  
  async getCategoryById(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }
  
  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.currentCategoryId++;
    const category: Category = { ...insertCategory, id };
    this.categories.set(id, category);
    return category;
  }
  
  // Transaction methods
  async getTransactionsByUser(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      transaction => transaction.userId === userId
    );
  }
  
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentTransactionId++;
    // Ensure isIncome is always a boolean
    const isIncome = typeof insertTransaction.isIncome === 'boolean' 
      ? insertTransaction.isIncome 
      : false;
    
    const transaction: Transaction = { 
      ...insertTransaction, 
      id,
      isIncome 
    };
    
    this.transactions.set(id, transaction);
    return transaction;
  }
  
  async updateTransaction(id: number, updateData: Partial<InsertTransaction>): Promise<Transaction> {
    const transaction = this.transactions.get(id);
    if (!transaction) {
      throw new Error(`Transaction with id ${id} not found`);
    }
    
    const updatedTransaction: Transaction = { ...transaction, ...updateData };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }
  
  async deleteTransaction(id: number): Promise<boolean> {
    return this.transactions.delete(id);
  }
  
  async getAllTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values());
  }
  
  // Budget methods
  async getBudgetsByUser(userId: number): Promise<Budget[]> {
    return Array.from(this.budgets.values()).filter(
      budget => budget.userId === userId
    );
  }
  
  async createBudget(insertBudget: InsertBudget): Promise<Budget> {
    const id = this.currentBudgetId++;
    
    const budget: Budget = { 
      ...insertBudget, 
      id
    };
    
    this.budgets.set(id, budget);
    return budget;
  }
  
  async updateBudget(id: number, updateData: Partial<InsertBudget>): Promise<Budget> {
    const budget = this.budgets.get(id);
    if (!budget) {
      throw new Error(`Budget with id ${id} not found`);
    }
    
    const updatedBudget: Budget = { ...budget, ...updateData };
    this.budgets.set(id, updatedBudget);
    return updatedBudget;
  }
  
  async deleteBudget(id: number): Promise<boolean> {
    return this.budgets.delete(id);
  }
  
  async getAllBudgets(): Promise<Budget[]> {
    return Array.from(this.budgets.values());
  }
  
  // Alert methods
  async getAlertsByUser(userId: number): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .filter(alert => alert.userId === userId)
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }
  
  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = this.currentAlertId++;
    const now = new Date();
    const alert: Alert = { 
      ...insertAlert, 
      id, 
      read: false, 
      createdAt: now 
    };
    this.alerts.set(id, alert);
    return alert;
  }
  
  async markAlertAsRead(id: number): Promise<boolean> {
    const alert = this.alerts.get(id);
    if (!alert) {
      return false;
    }
    
    alert.read = true;
    this.alerts.set(id, alert);
    return true;
  }
  
  async getAllAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values());
  }
  
  // Forum methods
  async getAllForumTopics(): Promise<ForumTopic[]> {
    return Array.from(this.forumTopics.values())
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }
  
  async getForumTopicById(id: number): Promise<ForumTopic | undefined> {
    return this.forumTopics.get(id);
  }
  
  async createForumTopic(insertTopic: InsertForumTopic): Promise<ForumTopic> {
    const id = this.currentForumTopicId++;
    const now = new Date();
    const topic: ForumTopic = { 
      ...insertTopic, 
      id,
      likes: 0,
      views: 0,
      createdAt: now
    };
    this.forumTopics.set(id, topic);
    return topic;
  }
  
  async getRepliesByTopic(topicId: number): Promise<ForumReply[]> {
    return Array.from(this.forumReplies.values())
      .filter(reply => reply.topicId === topicId)
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
  }
  
  async createForumReply(insertReply: InsertForumReply): Promise<ForumReply> {
    const id = this.currentForumReplyId++;
    const now = new Date();
    const reply: ForumReply = { 
      ...insertReply, 
      id,
      createdAt: now
    };
    this.forumReplies.set(id, reply);
    
    // Increment the topic's view count
    const topic = this.forumTopics.get(insertReply.topicId);
    if (topic) {
      topic.views += 1;
      this.forumTopics.set(topic.id, topic);
    }
    
    return reply;
  }
  
  async getAllForumReplies(): Promise<ForumReply[]> {
    return Array.from(this.forumReplies.values());
  }
  
  // Deals methods
  async getAllDeals(): Promise<Deal[]> {
    return Array.from(this.deals.values())
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }
  
  async createDeal(insertDeal: InsertDeal): Promise<Deal> {
    const id = this.currentDealId++;
    const now = new Date();
    const deal: Deal = { 
      ...insertDeal, 
      id,
      createdAt: now,
      validUntil: insertDeal.validUntil || null
    };
    this.deals.set(id, deal);
    return deal;
  }
  
  // System settings - stored in memory
  private systemSettings: SystemSettings = {
    allowRegistration: true,
    maintenanceMode: false,
    appName: "Smart Spend",
    contactEmail: "support@smartspend.com",
    backupFrequency: "daily",
    lastBackup: null
  };
  
  async getSystemSettings(): Promise<SystemSettings> {
    return { ...this.systemSettings };
  }
  
  async updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    this.systemSettings = { ...this.systemSettings, ...settings };
    return this.systemSettings;
  }
  
  // Backup and restore functionality
  async restoreFromBackup(backup: any): Promise<boolean> {
    try {
      if (!backup || !backup.timestamp) {
        return false;
      }
      
      // Clear existing data
      this.users.clear();
      this.categories.clear();
      this.transactions.clear();
      this.budgets.clear();
      this.alerts.clear();
      this.forumTopics.clear();
      this.forumReplies.clear();
      this.deals.clear();
      
      // Restore users
      if (Array.isArray(backup.users)) {
        backup.users.forEach((user: User) => {
          this.users.set(user.id, user);
        });
        // Update the ID counters
        this.currentUserId = Math.max(...Array.from(this.users.keys()), 0) + 1;
      }
      
      // Restore categories
      if (Array.isArray(backup.categories)) {
        backup.categories.forEach((category: Category) => {
          this.categories.set(category.id, category);
        });
        this.currentCategoryId = Math.max(...Array.from(this.categories.keys()), 0) + 1;
      }
      
      // Restore transactions
      if (Array.isArray(backup.transactions)) {
        backup.transactions.forEach((transaction: Transaction) => {
          this.transactions.set(transaction.id, transaction);
        });
        this.currentTransactionId = Math.max(...Array.from(this.transactions.keys()), 0) + 1;
      }
      
      // Restore budgets
      if (Array.isArray(backup.budgets)) {
        backup.budgets.forEach((budget: Budget) => {
          this.budgets.set(budget.id, budget);
        });
        this.currentBudgetId = Math.max(...Array.from(this.budgets.keys()), 0) + 1;
      }
      
      // Restore alerts
      if (Array.isArray(backup.alerts)) {
        backup.alerts.forEach((alert: Alert) => {
          this.alerts.set(alert.id, alert);
        });
        this.currentAlertId = Math.max(...Array.from(this.alerts.keys()), 0) + 1;
      }
      
      // Restore forum topics
      if (Array.isArray(backup.forumTopics)) {
        backup.forumTopics.forEach((topic: ForumTopic) => {
          this.forumTopics.set(topic.id, topic);
        });
        this.currentForumTopicId = Math.max(...Array.from(this.forumTopics.keys()), 0) + 1;
      }
      
      // Restore forum replies
      if (Array.isArray(backup.forumReplies)) {
        backup.forumReplies.forEach((reply: ForumReply) => {
          this.forumReplies.set(reply.id, reply);
        });
        this.currentForumReplyId = Math.max(...Array.from(this.forumReplies.keys()), 0) + 1;
      }
      
      // Restore deals
      if (Array.isArray(backup.deals)) {
        backup.deals.forEach((deal: Deal) => {
          this.deals.set(deal.id, deal);
        });
        this.currentDealId = Math.max(...Array.from(this.deals.keys()), 0) + 1;
      }
      
      // Update system settings to record the backup restoration
      this.systemSettings.lastBackup = new Date();
      
      return true;
    } catch (error) {
      console.error("Error restoring from backup:", error);
      return false;
    }
  }
}

export const storage = new MemStorage();
