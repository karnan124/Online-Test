export type TestStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';

export type QuestionType = 'MCQ' | 'MULTIPLE_SELECT' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'LONG_ANSWER';

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export type ResultReleaseMode = 'IMMEDIATE' | 'SCORE_ONLY' | 'MANUAL_RELEASE';

export type ResponseStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED' | 'PENDING_MANUAL_EVALUATION';

export interface Creator {
  id: string;
  name: string;
  email: string;
  organization?: string;
  createdAt: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface QuestionOption {
  id: string;
  optionText: string;
  isCorrect: boolean;
  optionOrder: number;
}

export interface Question {
  id: string;
  testId: string;
  questionType: QuestionType;
  questionText: string;
  marks: number;
  negativeMarks: number;
  difficulty: DifficultyLevel;
  orderNumber: number;
  explanation?: string;
  options?: QuestionOption[];
  correctShortAnswer?: string;
}

export interface Test {
  id: string;
  creatorId: string;
  creatorName?: string;
  publicCode: string; // e.g. "7H2K9X"
  title: string;
  description: string;
  subject: string;
  instructions: string;
  durationMinutes: number;
  startTime: string | null;
  endTime: string | null;
  accessCode?: string | null;
  status: TestStatus;
  
  // Response settings
  requireName: boolean;
  requireRollNumber: boolean;
  requireEmail: boolean;
  oneResponsePerIdentifier: boolean;

  // Security & Anti-Cheating
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  enableFullscreen: boolean;
  enableTabSwitchDetection: boolean;
  disableCopyPaste: boolean; // Anti-copy protection

  // Evaluation & Results
  resultReleaseMode: ResultReleaseMode;
  isResultsReleased: boolean;
  negativeMarkingEnabled: boolean;
  negativeMarks: number;
  passingPercentage: number;
  
  totalMarks: number;
  questionsCount?: number;
  responsesCount?: number;
  averageScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionBankItem {
  id: string;
  creatorId: string;
  category: string;
  questionType: QuestionType;
  questionText: string;
  marks: number;
  difficulty: DifficultyLevel;
  options?: QuestionOption[];
  correctShortAnswer?: string;
  explanation?: string;
  createdAt: string;
}

export interface ParticipantAnswer {
  id: string;
  questionId: string;
  selectedOptionIds?: string[];
  textAnswer?: string;
  isCorrect?: boolean;
  marksAwarded?: number;
  isMarkedForReview?: boolean;
  answeredAt: string;
}

export interface ParticipantResponse {
  id: string;
  testId: string;
  testTitle?: string;
  testSubject?: string;
  publicCode?: string;
  participantName: string;
  rollNumber: string;
  email?: string;
  startedAt: string;
  expiresAt: string;
  submittedAt?: string;
  timeTakenSeconds?: number;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  status: ResponseStatus;
  focusLossCount: number;
  copyAttemptCount: number; // Anti-cheat copy attempts recorded
  randomizedQuestionOrder?: string[];
  answers: Record<string, ParticipantAnswer>;
  createdAt: string;
}

export interface CreatorStats {
  activeTestsCount: number;
  totalTestsCount: number;
  totalResponsesCount: number;
  averageScore: number;
  passRate: number;
  recentTests: Test[];
}

export interface TestAnalytics {
  testId: string;
  title: string;
  totalResponses: number;
  averageScore: number;
  medianScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  avgTimeTakenMinutes: number;
  fastestTimeMinutes: number;
  longestTimeMinutes: number;
  scoreDistribution: { range: string; count: number }[];
  questionAnalytics: {
    questionId: string;
    questionText: string;
    questionType: QuestionType;
    difficulty: DifficultyLevel;
    correctRate: number;
    calculatedDifficulty: 'EASY' | 'MEDIUM' | 'DIFFICULT';
    totalAnswers: number;
    correctCount: number;
    wrongCount: number;
    optionDistribution?: { optionText: string; chosenPercentage: number; isCorrect: boolean }[];
  }[];
}

export interface CloudWatchLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  service: 'EC2-AppServer' | 'RDS-MySQL' | 'S3-ObjectStore' | 'CloudWatch-Agent';
  message: string;
  latencyMs: number;
}

export interface S3File {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  bucketName: string;
  uploadedBy: string;
  uploadedByName: string;
  url: string;
  createdAt: string;
}
