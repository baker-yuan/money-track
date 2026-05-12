/**
 * Tests for expense creation flow.
 * Covers FK constraint validation, data integrity, and edge cases.
 */

import type { UUID, CurrencyCode, CreateExpenseInput } from '../types';

// Mock expo modules
jest.mock('expo-crypto', () => ({
  randomUUID: () => `uuid-${Date.now()}-${Math.random().toString(36).slice(2)}`,
}));

jest.mock('expo-constants', () => ({
  default: { deviceName: 'Test Device' },
}));

// Track calls for assertions
const mockRunAsync = jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 });
const mockGetFirstAsync = jest.fn();
const mockGetAllAsync = jest.fn().mockResolvedValue([]);
const mockExecAsync = jest.fn();
const mockWithTransactionAsync = jest.fn(async (task: () => Promise<void>) => {
  await task();
});

const mockSQLiteDb = {
  runAsync: mockRunAsync,
  getFirstAsync: mockGetFirstAsync,
  getAllAsync: mockGetAllAsync,
  execAsync: mockExecAsync,
  withTransactionAsync: mockWithTransactionAsync,
};

jest.mock('../database', () => ({
  getDatabase: jest.fn(async () => mockSQLiteDb),
}));

// Import after mocks
import { ExpenseRepository } from '../database/repositories/expense.repository';
import { CategoryRepository } from '../database/repositories/category.repository';

// Helper
function uuid(id: string): UUID {
  return id as UUID;
}
function currencyCode(code: string): CurrencyCode {
  return code as CurrencyCode;
}

/**
 * Setup standard mock responses:
 * - device query returns a device
 * - project FK check returns the project
 * - category FK check returns the category
 */
function setupValidMocks() {
  mockGetFirstAsync.mockImplementation(async (sql: string, ...params: unknown[]) => {
    if (sql.includes('FROM device')) {
      return { id: 'device-001' };
    }
    if (sql.includes('FROM projects')) {
      return { id: 'project-001' };
    }
    if (sql.includes('FROM categories')) {
      return { id: 'category-001' };
    }
    return null;
  });
}

describe('ExpenseRepository.create', () => {
  let expenseRepo: ExpenseRepository;

  const validInput: CreateExpenseInput = {
    project_id: uuid('project-001'),
    category_id: uuid('category-001'),
    amount: 100,
    currency: currencyCode('CNY'),
    title: '机场大巴',
    date: '2026-05-11',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    expenseRepo = new ExpenseRepository();
    setupValidMocks();
  });

  it('should create expense with valid project_id and category_id', async () => {
    const result = await expenseRepo.create(validInput);

    expect(result).toBeDefined();
    expect(result.project_id).toBe('project-001');
    expect(result.category_id).toBe('category-001');
    expect(result.amount).toBe(100);
    expect(result.title).toBe('机场大巴');
    expect(result.base_amount).toBe(100);
    expect(mockWithTransactionAsync).toHaveBeenCalledTimes(1);
  });

  it('should throw clear error when project_id does not exist', async () => {
    mockGetFirstAsync.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM device')) return { id: 'device-001' };
      if (sql.includes('FROM projects')) return null; // project not found
      if (sql.includes('FROM categories')) return { id: 'category-001' };
      return null;
    });

    const input: CreateExpenseInput = {
      ...validInput,
      project_id: uuid('nonexistent-project'),
    };

    await expect(expenseRepo.create(input)).rejects.toThrow('项目不存在');
  });

  it('should throw clear error when category_id does not exist', async () => {
    mockGetFirstAsync.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM device')) return { id: 'device-001' };
      if (sql.includes('FROM projects')) return { id: 'project-001' };
      if (sql.includes('FROM categories')) return null; // category not found
      return null;
    });

    const input: CreateExpenseInput = {
      ...validInput,
      category_id: uuid('nonexistent-category'),
    };

    await expect(expenseRepo.create(input)).rejects.toThrow('分类不存在');
  });

  it('should throw when project_id is empty string', async () => {
    mockGetFirstAsync.mockImplementation(async (sql: string, ...params: unknown[]) => {
      if (sql.includes('FROM device')) return { id: 'device-001' };
      if (sql.includes('FROM projects')) return null; // empty id won't match
      if (sql.includes('FROM categories')) return { id: 'category-001' };
      return null;
    });

    const input: CreateExpenseInput = {
      ...validInput,
      project_id: uuid(''),
    };

    await expect(expenseRepo.create(input)).rejects.toThrow('项目不存在');
  });

  it('should throw when category_id is empty string', async () => {
    mockGetFirstAsync.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM device')) return { id: 'device-001' };
      if (sql.includes('FROM projects')) return { id: 'project-001' };
      if (sql.includes('FROM categories')) return null; // empty id won't match
      return null;
    });

    const input: CreateExpenseInput = {
      ...validInput,
      category_id: uuid(''),
    };

    await expect(expenseRepo.create(input)).rejects.toThrow('分类不存在');
  });

  it('should calculate base_amount correctly with exchange_rate', async () => {
    const input: CreateExpenseInput = {
      ...validInput,
      amount: 50,
      currency: currencyCode('USD'),
      exchange_rate: 7.2,
    };

    const result = await expenseRepo.create(input);

    expect(result.exchange_rate).toBe(7.2);
    expect(result.base_amount).toBeCloseTo(360);
  });

  it('should default exchange_rate to 1 when not provided', async () => {
    const result = await expenseRepo.create(validInput);

    expect(result.exchange_rate).toBe(1);
    expect(result.base_amount).toBe(validInput.amount);
  });

  it('should default optional fields to empty strings', async () => {
    const result = await expenseRepo.create(validInput);

    expect(result.notes).toBe('');
    expect(result.paid_by).toBe('');
    expect(result.location).toBe('');
    expect(result.split_method).toBe('full');
  });

  it('should set version to 1 for new expense', async () => {
    const result = await expenseRepo.create(validInput);
    expect(result.version).toBe(1);
  });

  it('should set deleted_at to null for new expense', async () => {
    const result = await expenseRepo.create(validInput);
    expect(result.deleted_at).toBeNull();
  });

  it('should convert date string to ISO format', async () => {
    const result = await expenseRepo.create(validInput);
    expect(result.date).toContain('2026-05-11');
  });

  it('should use project-specific category', async () => {
    mockGetFirstAsync.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM device')) return { id: 'device-001' };
      if (sql.includes('FROM projects')) return { id: 'project-001' };
      if (sql.includes('FROM categories')) return { id: 'category-project-001' };
      return null;
    });

    const input: CreateExpenseInput = {
      ...validInput,
      category_id: uuid('category-project-001'),
    };

    const result = await expenseRepo.create(input);
    expect(result.category_id).toBe('category-project-001');
  });

  it('should call INSERT with correct number of parameters', async () => {
    await expenseRepo.create(validInput);

    // The INSERT should be called inside the transaction
    const insertCall = mockRunAsync.mock.calls.find(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT INTO expenses')
    );
    expect(insertCall).toBeDefined();
    // 17 columns = 17 params + 1 SQL string = 18 total args
    expect(insertCall!.length).toBe(18);
  });

  it('should log change after insert', async () => {
    await expenseRepo.create(validInput);

    // change_log INSERT should also be called
    const logCall = mockRunAsync.mock.calls.find(
      (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('INSERT INTO change_log')
    );
    expect(logCall).toBeDefined();
  });
});

describe('Device initialization dependency', () => {
  let expenseRepo: ExpenseRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    expenseRepo = new ExpenseRepository();
  });

  it('should throw "Device not initialized" when device table is empty', async () => {
    mockGetFirstAsync.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM device')) return null; // no device!
      if (sql.includes('FROM projects')) return { id: 'project-001' };
      if (sql.includes('FROM categories')) return { id: 'category-001' };
      return null;
    });

    const input: CreateExpenseInput = {
      project_id: uuid('project-001'),
      category_id: uuid('category-001'),
      amount: 100,
      currency: currencyCode('CNY'),
      title: 'Test',
      date: '2026-05-11',
    };

    await expect(expenseRepo.create(input)).rejects.toThrow('Device not initialized');
  });

  it('should succeed when device exists', async () => {
    setupValidMocks();
    const input: CreateExpenseInput = {
      project_id: uuid('project-001'),
      category_id: uuid('category-001'),
      amount: 100,
      currency: currencyCode('CNY'),
      title: 'Test',
      date: '2026-05-11',
    };

    const result = await expenseRepo.create(input);
    expect(result).toBeDefined();
    expect(result.device_id).toBe('device-001');
  });
});

describe('CategoryRepository.createDefaultsForProject', () => {
  let categoryRepo: CategoryRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    categoryRepo = new CategoryRepository();
  });

  it('should skip creation when project already has categories', async () => {
    mockGetAllAsync.mockResolvedValueOnce([{ id: 'existing-001', name: '交通' }]);

    await categoryRepo.createDefaultsForProject(uuid('project-001'));

    // No transaction should be called since we skip
    expect(mockWithTransactionAsync).not.toHaveBeenCalled();
  });

  it('should create categories when project has none', async () => {
    mockGetAllAsync.mockResolvedValueOnce([]); // no existing categories
    mockGetFirstAsync.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM device')) return { id: 'device-001' };
      return null;
    });

    await categoryRepo.createDefaultsForProject(uuid('project-001'));

    // Should have called withTransactionAsync for each default category (10 defaults)
    expect(mockWithTransactionAsync.mock.calls.length).toBeGreaterThan(0);
  });

  it('should fail if device not initialized during category creation', async () => {
    mockGetAllAsync.mockResolvedValueOnce([]); // no existing categories
    mockGetFirstAsync.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM device')) return null; // no device
      return null;
    });

    await expect(categoryRepo.createDefaultsForProject(uuid('project-001'))).rejects.toThrow('Device not initialized');
  });
});

describe('Edge Cases', () => {
  let expenseRepo: ExpenseRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    expenseRepo = new ExpenseRepository();
    setupValidMocks();
  });

  it('should handle zero amount', async () => {
    const input: CreateExpenseInput = {
      project_id: uuid('project-001'),
      category_id: uuid('category-001'),
      amount: 0,
      currency: currencyCode('CNY'),
      title: 'Zero amount',
      date: '2026-05-11',
    };

    const result = await expenseRepo.create(input);
    expect(result.amount).toBe(0);
    expect(result.base_amount).toBe(0);
  });

  it('should handle very large amounts', async () => {
    const input: CreateExpenseInput = {
      project_id: uuid('project-001'),
      category_id: uuid('category-001'),
      amount: 9999999.99,
      currency: currencyCode('CNY'),
      title: 'Large expense',
      date: '2026-05-11',
    };

    const result = await expenseRepo.create(input);
    expect(result.amount).toBe(9999999.99);
  });

  it('should handle special characters in title and notes', async () => {
    const input: CreateExpenseInput = {
      project_id: uuid('project-001'),
      category_id: uuid('category-001'),
      amount: 50,
      currency: currencyCode('CNY'),
      title: '机场大巴 — "快线" & 接驳',
      notes: "SQL注入测试'; DROP TABLE expenses;--",
      date: '2026-05-11',
    };

    const result = await expenseRepo.create(input);
    expect(result.title).toBe('机场大巴 — "快线" & 接驳');
    expect(result.notes).toBe("SQL注入测试'; DROP TABLE expenses;--");
  });

  it('should preserve paid_by value', async () => {
    const input: CreateExpenseInput = {
      project_id: uuid('project-001'),
      category_id: uuid('category-001'),
      amount: 50,
      currency: currencyCode('CNY'),
      title: 'Test',
      date: '2026-05-11',
      paid_by: '张三',
    };

    const result = await expenseRepo.create(input);
    expect(result.paid_by).toBe('张三');
  });

  it('should handle different split methods', async () => {
    const input: CreateExpenseInput = {
      project_id: uuid('project-001'),
      category_id: uuid('category-001'),
      amount: 200,
      currency: currencyCode('CNY'),
      title: 'Split dinner',
      date: '2026-05-11',
      split_method: 'equal',
    };

    const result = await expenseRepo.create(input);
    expect(result.split_method).toBe('equal');
  });

  it('should generate unique IDs for each expense', async () => {
    const result1 = await expenseRepo.create(validInput());
    const result2 = await expenseRepo.create(validInput());

    expect(result1.id).not.toBe(result2.id);
  });
});

function validInput(): CreateExpenseInput {
  return {
    project_id: uuid('project-001'),
    category_id: uuid('category-001'),
    amount: 100,
    currency: currencyCode('CNY'),
    title: '测试支出',
    date: '2026-05-11',
  };
}
