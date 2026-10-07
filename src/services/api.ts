import { 
  Creator, Test, Question, QuestionBankItem, ParticipantResponse,
  TestAnalytics, CreatorStats, CloudWatchLog, S3File 
} from '../types/index';

const TOKEN_KEY = 'testcloud_creator_token';
const CREATOR_KEY = 'testcloud_creator_data';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getStoredCreator(): Creator | null {
  const data = localStorage.getItem(CREATOR_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setStoredCreator(creator: Creator | null) {
  if (creator) {
    localStorage.setItem(CREATOR_KEY, JSON.stringify(creator));
  } else {
    localStorage.removeItem(CREATOR_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `HTTP error ${response.status}`);
  }

  return data as T;
}

export const api = {
  auth: {
    login: async (email: string, pass: string) => {
      const data = await request<{ success: boolean; token: string; creator: Creator }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass }),
      });
      setStoredToken(data.token);
      setStoredCreator(data.creator);
      return data;
    },
    register: async (payload: { name: string; email: string; password: string; organization?: string }) => {
      const data = await request<{ success: boolean; message: string; creator: Creator }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      // Do not auto-login on register as required: user must sign in from Sign In page
      return data;
    },
    getMe: async () => {
      return request<{ success: boolean; creator: Creator }>('/api/auth/me');
    },
    logout: () => {
      setStoredToken(null);
      setStoredCreator(null);
    },
    deleteAccount: async () => {
      const data = await request<{ success: boolean; message: string }>('/api/account', {
        method: 'DELETE',
      });
      setStoredToken(null);
      setStoredCreator(null);
      return data;
    },
  },

  tests: {
    getAll: async () => {
      const res = await request<{ success: boolean; tests: Test[] }>('/api/tests');
      return res.tests;
    },
    getById: async (id: string) => {
      return request<{ success: boolean; test: Test; questions: Question[] }>(`/api/tests/${id}`);
    },
    create: async (testData: Partial<Test>) => {
      const res = await request<{ success: boolean; test: Test }>('/api/tests', {
        method: 'POST',
        body: JSON.stringify(testData),
      });
      return res.test;
    },
    update: async (id: string, testData: Partial<Test>) => {
      const res = await request<{ success: boolean; test: Test }>(`/api/tests/${id}`, {
        method: 'PUT',
        body: JSON.stringify(testData),
      });
      return res.test;
    },
    delete: async (id: string) => {
      return request<{ success: boolean; message: string }>(`/api/tests/${id}`, {
        method: 'DELETE',
      });
    },
    publish: async (id: string) => {
      return request<{ success: boolean; test: Test }>(`/api/tests/${id}/publish`, {
        method: 'POST',
      });
    },
    close: async (id: string) => {
      return request<{ success: boolean; test: Test }>(`/api/tests/${id}/close`, {
        method: 'POST',
      });
    },
    archive: async (id: string) => {
      return request<{ success: boolean; test: Test }>(`/api/tests/${id}/archive`, {
        method: 'POST',
      });
    },
    duplicate: async (id: string) => {
      const res = await request<{ success: boolean; test: Test }>(`/api/tests/${id}/duplicate`, {
        method: 'POST',
      });
      return res.test;
    },
    releaseResults: async (id: string) => {
      return request<{ success: boolean; test: Test }>(`/api/tests/${id}/release-results`, {
        method: 'POST',
      });
    },
    getResponses: async (id: string) => {
      const res = await request<{ success: boolean; responses: ParticipantResponse[] }>(`/api/tests/${id}/responses`);
      return res.responses;
    },
    getAnalytics: async (id: string) => {
      const res = await request<{ success: boolean; analytics: TestAnalytics }>(`/api/tests/${id}/analytics`);
      return res.analytics;
    },
  },

  questions: {
    getByTest: async (testId: string) => {
      const res = await request<{ success: boolean; questions: Question[] }>(`/api/tests/${testId}/questions`);
      return res.questions;
    },
    create: async (testId: string, qData: Partial<Question>) => {
      const res = await request<{ success: boolean; question: Question }>(`/api/tests/${testId}/questions`, {
        method: 'POST',
        body: JSON.stringify(qData),
      });
      return res.question;
    },
    update: async (id: string, qData: Partial<Question>) => {
      const res = await request<{ success: boolean; question: Question }>(`/api/questions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(qData),
      });
      return res.question;
    },
    delete: async (id: string) => {
      return request<{ success: boolean; message: string }>(`/api/questions/${id}`, {
        method: 'DELETE',
      });
    },
  },

  questionBank: {
    getAll: async () => {
      const res = await request<{ success: boolean; items: QuestionBankItem[] }>('/api/question-bank');
      return res.items;
    },
    create: async (item: Partial<QuestionBankItem>) => {
      const res = await request<{ success: boolean; item: QuestionBankItem }>('/api/question-bank', {
        method: 'POST',
        body: JSON.stringify(item),
      });
      return res.item;
    },
    importToTest: async (testId: string, questionBankItemIds: string[]) => {
      return request<{ success: boolean; importedCount: number }>('/api/question-bank/import-to-test', {
        method: 'POST',
        body: JSON.stringify({ testId, questionBankItemIds }),
      });
    },
  },

  public: {
    getTest: async (publicCode: string) => {
      return request<{ success: boolean; test: any }>(`/api/public/tests/${publicCode}`);
    },
    startAttempt: async (publicCode: string, payload: { participantName: string; rollNumber: string; email?: string; accessCode?: string }) => {
      return request<{ success: boolean; resumed: boolean; responseId: string; expiresAt: string }>(`/api/public/tests/${publicCode}/start`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  },

  attempts: {
    getById: async (attemptId: string) => {
      return request<{
        success: boolean;
        attempt: ParticipantResponse;
        test: any;
        questions: Question[];
      }>(`/api/attempts/${attemptId}`);
    },
    saveAnswer: async (
      attemptId: string,
      questionId: string,
      selectedOptionIds?: string[],
      textAnswer?: string,
      isMarkedForReview?: boolean
    ) => {
      return request<{ success: boolean; savedAt: string }>(`/api/attempts/${attemptId}/answers`, {
        method: 'POST',
        body: JSON.stringify({ questionId, selectedOptionIds, textAnswer, isMarkedForReview }),
      });
    },
    recordTabSwitch: async (attemptId: string) => {
      return request<{ success: boolean; focusLossCount: number }>(`/api/attempts/${attemptId}/tab-switch`, {
        method: 'POST',
      });
    },
    recordCopyAttempt: async (attemptId: string) => {
      return request<{ success: boolean; copyAttemptCount: number }>(`/api/attempts/${attemptId}/copy-attempt`, {
        method: 'POST',
      });
    },
    submit: async (attemptId: string) => {
      return request<{ success: boolean; attempt: ParticipantResponse }>(`/api/attempts/${attemptId}/submit`, {
        method: 'POST',
      });
    },
  },

  analytics: {
    getCreatorStats: async () => {
      const res = await request<{ success: boolean; stats: CreatorStats }>('/api/analytics/creator');
      return res.stats;
    },
  },

  cloud: {
    getStatus: async () => {
      return request<any>('/api/cloud/status');
    },
    getLogs: async () => {
      return request<CloudWatchLog[]>('/api/cloud/logs');
    },
    getS3Files: async () => {
      return request<S3File[]>('/api/cloud/s3/files');
    },
  },
};
