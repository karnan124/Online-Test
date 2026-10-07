import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { 
  Creator, Test, Question, QuestionOption, QuestionBankItem,
  ParticipantResponse, ParticipantAnswer, CloudWatchLog, S3File,
  TestAnalytics, CreatorStats
} from './src/types/index';

dotenv.config();

const app = express();
app.use(express.json());

// ==========================================
// IN-MEMORY MULTI-TENANT RELATIONAL STORE
// (Mirrors AWS RDS MySQL relational database)
// ==========================================

const creators: Creator[] = [];
const passwords: Record<string, string> = {}; // creatorId -> bcrypt hash
const tests: Test[] = []; // Starts clean with NO default tests!
const questions: Question[] = []; // Starts clean
const questionBank: QuestionBankItem[] = []; // Starts clean
const responses: ParticipantResponse[] = []; // Starts clean
const cloudWatchLogs: CloudWatchLog[] = [];
const s3Files: S3File[] = [];

// Helper to generate unpredictable random public codes (e.g., "7H2K9X")
function generatePublicCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (tests.some(t => t.publicCode === code)) {
    return generatePublicCode();
  }
  return code;
}

// Log event to CloudWatch
function logCloudWatch(
  service: CloudWatchLog['service'], 
  level: CloudWatchLog['level'], 
  message: string, 
  latencyMs: number = Math.floor(Math.random() * 25) + 5
) {
  const log: CloudWatchLog = {
    id: 'cw-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
    latencyMs
  };
  cloudWatchLogs.unshift(log);
  if (cloudWatchLogs.length > 250) cloudWatchLogs.pop();
}

// ==========================================
// INITIAL SETUP (Clean Slate - No Default Tests)
// ==========================================
async function seedDatabase() {
  const salt = await bcrypt.genSalt(10);

  // Default Organizer / Creator Account
  const c1Id = 'creator-01';
  passwords[c1Id] = await bcrypt.hash('Password@123', salt);
  creators.push({
    id: c1Id,
    name: 'Test Creator',
    email: 'creator@testcloud.io',
    organization: 'Assessment Workspace',
    createdAt: new Date().toISOString(),
    status: 'ACTIVE'
  });

  // Zero default tests seeded! 
  // Tests will be created by the user and then accessed.

  logCloudWatch('EC2-AppServer', 'INFO', 'TestCloud SaaS Platform initialized on AWS EC2 (t3.medium)');
  logCloudWatch('RDS-MySQL', 'INFO', 'HikariCP connection pool initialized (AWS RDS MySQL 8.0)');
  logCloudWatch('CloudWatch-Agent', 'INFO', 'Anti-cheating anti-copy protection layer active');

  console.log('TestCloud database initialized with clean slate (no default tests).');
}

// ==========================================
// AUTHENTICATION & MULTI-TENANT ISOLATION
// ==========================================

function authenticateCreator(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  const [creatorId] = token.split(':');
  const creator = creators.find(c => c.id === creatorId);

  if (!creator || creator.status !== 'ACTIVE') {
    return res.status(401).json({ success: false, message: 'Session invalid or expired' });
  }

  (req as any).creator = creator;
  next();
}

// ==========================================
// REST APIS
// ==========================================

// 1. AUTHENTICATION & CREATOR WORKSPACE
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, organization } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
  }

  if (creators.some(c => c.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ success: false, message: 'Email is already registered' });
  }

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  const newId = 'creator-' + Date.now();
  passwords[newId] = hash;

  const newCreator: Creator = {
    id: newId,
    name,
    email,
    organization: organization || 'General Workspace',
    createdAt: new Date().toISOString(),
    status: 'ACTIVE'
  };
  creators.push(newCreator);

  logCloudWatch('RDS-MySQL', 'INFO', `INSERT into creators: Account created "${name}" (${email})`);

  const token = `${newCreator.id}:${Date.now()}`;
  res.status(201).json({ 
    success: true, 
    message: 'Account created successfully! Please sign in with your credentials.', 
    token: null, 
    creator: newCreator 
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const creator = creators.find(c => c.email.toLowerCase() === email.toLowerCase());
  if (!creator) {
    logCloudWatch('EC2-AppServer', 'WARN', `Failed login attempt for email: ${email}`);
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const storedHash = passwords[creator.id];
  const isMatch = await bcrypt.compare(password, storedHash || '');
  if (!isMatch) {
    logCloudWatch('EC2-AppServer', 'WARN', `Failed password check for: ${email}`);
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const token = `${creator.id}:${Date.now()}`;
  logCloudWatch('EC2-AppServer', 'INFO', `Creator authenticated: ${creator.name}`);
  res.json({ success: true, token, creator });
});

app.get('/api/auth/me', authenticateCreator, (req, res) => {
  const creator = (req as any).creator as Creator;
  res.json({ success: true, creator });
});

// Permanent Account and Data Deletion
app.delete('/api/account', authenticateCreator, (req, res) => {
  const creator = (req as any).creator as Creator;

  // Delete all tests owned by this creator
  const creatorTestIds = tests.filter(t => t.creatorId === creator.id).map(t => t.id);

  // Cascade delete responses, questions, bank items
  for (let i = responses.length - 1; i >= 0; i--) {
    if (creatorTestIds.includes(responses[i].testId)) {
      responses.splice(i, 1);
    }
  }
  for (let i = questions.length - 1; i >= 0; i--) {
    if (creatorTestIds.includes(questions[i].testId)) {
      questions.splice(i, 1);
    }
  }
  for (let i = tests.length - 1; i >= 0; i--) {
    if (tests[i].creatorId === creator.id) {
      tests.splice(i, 1);
    }
  }
  for (let i = questionBank.length - 1; i >= 0; i--) {
    if (questionBank[i].creatorId === creator.id) {
      questionBank.splice(i, 1);
    }
  }

  const cIdx = creators.findIndex(c => c.id === creator.id);
  if (cIdx !== -1) creators.splice(cIdx, 1);
  delete passwords[creator.id];

  logCloudWatch('RDS-MySQL', 'WARN', `CASCADE DELETE: Creator account and all associated tests erased for ${creator.email}`);
  res.json({ success: true, message: 'Account and all associated assessments permanently deleted' });
});

// 2. CREATOR TESTS MANAGEMENT
app.get('/api/tests', authenticateCreator, (req, res) => {
  const creator = (req as any).creator as Creator;
  
  const myTests = tests.filter(t => t.creatorId === creator.id).map(t => {
    const qCount = questions.filter(q => q.testId === t.id).length;
    const rList = responses.filter(r => r.testId === t.id && (r.status === 'SUBMITTED' || r.status === 'AUTO_SUBMITTED'));
    const avg = rList.length > 0 ? Math.round(rList.reduce((acc, r) => acc + r.percentage, 0) / rList.length) : 0;
    return {
      ...t,
      questionsCount: qCount,
      responsesCount: rList.length,
      averageScore: avg
    };
  });

  res.json({ success: true, tests: myTests });
});

app.post('/api/tests', authenticateCreator, (req, res) => {
  const creator = (req as any).creator as Creator;
  const {
    title, description, subject, instructions, durationMinutes,
    startTime, endTime, accessCode, requireName, requireRollNumber,
    requireEmail, oneResponsePerIdentifier, randomizeQuestions,
    randomizeOptions, enableFullscreen, enableTabSwitchDetection,
    disableCopyPaste, resultReleaseMode, negativeMarkingEnabled, 
    negativeMarks, passingPercentage
  } = req.body;

  if (!title || !subject || !durationMinutes) {
    return res.status(400).json({ success: false, message: 'Title, subject, and duration are required' });
  }

  const publicCode = generatePublicCode();
  const newTest: Test = {
    id: 'test-' + Date.now(),
    creatorId: creator.id,
    creatorName: creator.name,
    publicCode,
    title,
    description: description || '',
    subject,
    instructions: instructions || 'Answer all questions. Once the timer starts, it cannot be paused.',
    durationMinutes: Number(durationMinutes),
    startTime: startTime || null,
    endTime: endTime || null,
    accessCode: accessCode ? accessCode.trim().toUpperCase() : null,
    status: 'DRAFT',
    requireName: requireName !== false,
    requireRollNumber: requireRollNumber !== false,
    requireEmail: !!requireEmail,
    oneResponsePerIdentifier: oneResponsePerIdentifier !== false,
    randomizeQuestions: randomizeQuestions !== false,
    randomizeOptions: randomizeOptions !== false,
    enableFullscreen: !!enableFullscreen,
    enableTabSwitchDetection: enableTabSwitchDetection !== false,
    disableCopyPaste: disableCopyPaste !== false, // Anti-copy enabled by default!
    resultReleaseMode: resultReleaseMode || 'IMMEDIATE',
    isResultsReleased: (resultReleaseMode === 'MANUAL_RELEASE' || resultReleaseMode === 'HIDDEN') ? false : true,
    negativeMarkingEnabled: !!negativeMarkingEnabled,
    negativeMarks: negativeMarkingEnabled ? Number(negativeMarks || 0) : 0,
    passingPercentage: Number(passingPercentage || 40),
    totalMarks: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  tests.unshift(newTest);
  logCloudWatch('RDS-MySQL', 'INFO', `Created test "${title}" with public code ${publicCode}`);
  res.status(201).json({ success: true, test: newTest });
});

app.get('/api/tests/:id', authenticateCreator, (req, res) => {
  const creator = (req as any).creator as Creator;
  const test = tests.find(t => t.id === req.params.id && t.creatorId === creator.id);
  if (!test) {
    return res.status(404).json({ success: false, message: 'Test not found or access denied' });
  }
  const testQuestions = questions.filter(q => q.testId === test.id);
  const respList = responses.filter(r => r.testId === test.id && (r.status === 'SUBMITTED' || r.status === 'AUTO_SUBMITTED'));

  res.json({
    success: true,
    test: {
      ...test,
      questionsCount: testQuestions.length,
      responsesCount: respList.length
    },
    questions: testQuestions
  });
});

app.put('/api/tests/:id', authenticateCreator, (req, res) => {
  const creator = (req as any).creator as Creator;
  const testIdx = tests.findIndex(t => t.id === req.params.id && t.creatorId === creator.id);
  if (testIdx === -1) {
    return res.status(404).json({ success: false, message: 'Test not found or access denied' });
  }

  const current = tests[testIdx];
  const updated: Test = {
    ...current,
    ...req.body,
    id: current.id,
    creatorId: current.creatorId,
    publicCode: current.publicCode,
    updatedAt: new Date().toISOString()
  };

  tests[testIdx] = updated;
  res.json({ success: true, test: updated });
});

app.delete('/api/tests/:id', authenticateCreator, (req, res) => {
  const creator = (req as any).creator as Creator;
  const testIdx = tests.findIndex(t => t.id === req.params.id && t.creatorId === creator.id);
  if (testIdx === -1) {
    return res.status(404).json({ success: false, message: 'Test not found' });
  }

  const testId = tests[testIdx].id;
  for (let i = questions.length - 1; i >= 0; i--) {
    if (questions[i].testId === testId) questions.splice(i, 1);
  }
  for (let i = responses.length - 1; i >= 0; i--) {
    if (responses[i].testId === testId) responses.splice(i, 1);
  }
  tests.splice(testIdx, 1);

  logCloudWatch('RDS-MySQL', 'INFO', `Deleted test ${testId} and all associated items`);
  res.json({ success: true, message: 'Test and responses deleted' });
});

app.post('/api/tests/:id/publish', authenticateCreator, (req, res) => {
  const creator = (req as any).creator as Creator;
  const test = tests.find(t => t.id === req.params.id && t.creatorId === creator.id);
  if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

  test.status = 'PUBLISHED';
  test.updatedAt = new Date().toISOString();
  logCloudWatch('EC2-AppServer', 'INFO', `Published test "${test.title}" -> Code: ${test.publicCode}`);
  res.json({ success: true, test });
});

app.post('/api/tests/:id/close', authenticateCreator, (req, res) => {
  const creator = (req as any).creator as Creator;
  const test = tests.find(t => t.id === req.params.id && t.creatorId === creator.id);
  if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

  test.status = 'CLOSED';
  test.updatedAt = new Date().toISOString();
  logCloudWatch('EC2-AppServer', 'INFO', `Closed test "${test.title}"`);
  res.json({ success: true, test });
});

app.post('/api/tests/:id/archive', authenticateCreator, (req, res) => {
  const creator = (req as any).creator as Creator;
  const test = tests.find(t => t.id === req.params.id && t.creatorId === creator.id);
  if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

  test.status = 'ARCHIVED';
  test.updatedAt = new Date().toISOString();
  res.json({ success: true, test });
});

app.post('/api/tests/:id/duplicate', authenticateCreator, (req, res) => {
  const creator = (req as any).creator as Creator;
  const test = tests.find(t => t.id === req.params.id && t.creatorId === creator.id);
  if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

  const newPublicCode = generatePublicCode();
  const newTestId = 'test-' + Date.now();
  const duplicatedTest: Test = {
    ...test,
    id: newTestId,
    publicCode: newPublicCode,
    title: `${test.title} (Copy)`,
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  tests.unshift(duplicatedTest);

  // Duplicate its questions
  const sourceQuestions = questions.filter(q => q.testId === test.id);
  sourceQuestions.forEach((sq, idx) => {
    const newQId = `q-dup-${Date.now()}-${idx}`;
    questions.push({
      ...sq,
      id: newQId,
      testId: newTestId,
      options: sq.options?.map((o, oIdx) => ({
        ...o,
        id: `opt-dup-${newQId}-${oIdx}`
      }))
    });
  });

  logCloudWatch('RDS-MySQL', 'INFO', `Duplicated test ${test.id} -> ${newTestId} (${newPublicCode})`);
  res.status(201).json({ success: true, test: duplicatedTest });
});

app.post('/api/tests/:id/release-results', authenticateCreator, (req, res) => {
  const creator = (req as any).creator as Creator;
  const test = tests.find(t => t.id === req.params.id && t.creatorId === creator.id);
  if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

  test.isResultsReleased = true;
  test.updatedAt = new Date().toISOString();
  res.json({ success: true, message: 'Results released to participants', test });
});

// 3. QUESTIONS MANAGEMENT
app.get('/api/tests/:testId/questions', authenticateCreator, (req, res) => {
  const creator = (req as any).creator as Creator;
  const test = tests.find(t => t.id === req.params.testId && t.creatorId === creator.id);
  if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

  const testQuestions = questions.filter(q => q.testId === test.id).sort((a, b) => a.orderNumber - b.orderNumber);
  res.json({ success: true, questions: testQuestions });
});

app.post('/api/tests/:testId/questions', authenticateCreator, (req, res) => {
  const creator = (req as any).creator as Creator;
  const test = tests.find(t => t.id === req.params.testId && t.creatorId === creator.id);
  if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

  const { questionType, questionText, marks, negativeMarks, difficulty, explanation, options, correctShortAnswer } = req.body;
  if (!questionText) {
    return res.status(400).json({ success: false, message: 'Question prompt text is required' });
  }

  const existingCount = questions.filter(q => q.testId === test.id).length;
  const newQId = 'q-' + Date.now();

  const formattedOptions: QuestionOption[] = (options || []).map((o: any, idx: number) => ({
    id: o.id || `opt-${newQId}-${idx}`,
    optionText: o.optionText || `Option ${idx + 1}`,
    isCorrect: !!o.isCorrect,
    optionOrder: idx + 1
  }));

  const newQuestion: Question = {
    id: newQId,
    testId: test.id,
    questionType: questionType || 'MCQ',
    questionText,
    marks: Number(marks || 1),
    negativeMarks: Number(negativeMarks || 0),
    difficulty: difficulty || 'MEDIUM',
    orderNumber: existingCount + 1,
    explanation: explanation || '',
    options: formattedOptions,
    correctShortAnswer: correctShortAnswer || undefined
  };

  questions.push(newQuestion);
  test.totalMarks = questions.filter(q => q.testId === test.id).reduce((sum, q) => sum + q.marks, 0);

  res.status(201).json({ success: true, question: newQuestion });
});

app.put('/api/questions/:id', authenticateCreator, (req, res) => {
  const creator = (req as any).creator as Creator;
  const qIdx = questions.findIndex(q => q.id === req.params.id);
  if (qIdx === -1) return res.status(404).json({ success: false, message: 'Question not found' });

  const targetQ = questions[qIdx];
  const test = tests.find(t => t.id === targetQ.testId && t.creatorId === creator.id);
  if (!test) return res.status(403).json({ success: false, message: 'Access denied' });

  questions[qIdx] = {
    ...targetQ,
    ...req.body,
    id: targetQ.id,
    testId: targetQ.testId
  };

  test.totalMarks = questions.filter(q => q.testId === test.id).reduce((sum, q) => sum + q.marks, 0);
  res.json({ success: true, question: questions[qIdx] });
});

app.delete('/api/questions/:id', authenticateCreator, (req, res) => {
  const creator = (req as any).creator as Creator;
  const qIdx = questions.findIndex(q => q.id === req.params.id);
  if (qIdx === -1) return res.status(404).json({ success: false, message: 'Question not found' });

  const targetQ = questions[qIdx];
  const test = tests.find(t => t.id === targetQ.testId && t.creatorId === creator.id);
  if (!test) return res.status(403).json({ success: false, message: 'Access denied' });

  questions.splice(qIdx, 1);
  test.totalMarks = questions.filter(q => q.testId === test.id).reduce((sum, q) => sum + q.marks, 0);
  res.json({ success: true, message: 'Question deleted' });
});

// 4. QUESTION BANK (Reusable pool)
app.get('/api/question-bank', authenticateCreator, (req, res) => {
  const creator = (req as any).creator as Creator;
  const items = questionBank.filter(qb => qb.creatorId === creator.id);
  res.json({ success: true, items });
});

app.post('/api/question-bank', authenticateCreator, (req, res) => {
  const creator = (req as any).creator as Creator;
  const { category, questionType, questionText, marks, difficulty, explanation, options, correctShortAnswer } = req.body;

  const newItem: QuestionBankItem = {
    id: 'qb-' + Date.now(),
    creatorId: creator.id,
    category: category || 'General',
    questionType: questionType || 'MCQ',
    questionText,
    marks: Number(marks || 1),
    difficulty: difficulty || 'MEDIUM',
    explanation: explanation || '',
    options: options || [],
    correctShortAnswer: correctShortAnswer || undefined,
    createdAt: new Date().toISOString()
  };

  questionBank.unshift(newItem);
  res.status(201).json({ success: true, item: newItem });
});

app.post('/api/question-bank/import-to-test', authenticateCreator, (req, res) => {
  const creator = (req as any).creator as Creator;
  const { testId, questionBankItemIds } = req.body;
  const test = tests.find(t => t.id === testId && t.creatorId === creator.id);
  if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

  const itemsToImport = questionBank.filter(qb => questionBankItemIds.includes(qb.id) && qb.creatorId === creator.id);
  let orderCount = questions.filter(q => q.testId === test.id).length;

  itemsToImport.forEach(item => {
    const newQId = 'q-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    orderCount++;
    questions.push({
      id: newQId,
      testId: test.id,
      questionType: item.questionType,
      questionText: item.questionText,
      marks: item.marks,
      negativeMarks: test.negativeMarkingEnabled ? test.negativeMarks : 0,
      difficulty: item.difficulty,
      orderNumber: orderCount,
      explanation: item.explanation,
      options: item.options?.map((o, idx) => ({ ...o, id: `opt-${newQId}-${idx}` })),
      correctShortAnswer: item.correctShortAnswer
    });
  });

  test.totalMarks = questions.filter(q => q.testId === test.id).reduce((sum, q) => sum + q.marks, 0);
  res.json({ success: true, importedCount: itemsToImport.length });
});

// 5. PUBLIC PARTICIPANT ENDPOINTS (NO ACCOUNT REQUIRED!)
app.get('/api/public/tests/:publicCode', (req, res) => {
  const code = req.params.publicCode.toUpperCase();
  const test = tests.find(t => t.publicCode === code);

  if (!test) {
    return res.status(404).json({ success: false, message: 'Test not found. Please verify the examination code or link.' });
  }

  const now = new Date();
  let availabilityStatus: 'OPEN' | 'NOT_STARTED' | 'CLOSED' | 'DRAFT' = 'OPEN';

  if (test.status === 'DRAFT') {
    availabilityStatus = 'DRAFT';
  } else if (test.status === 'CLOSED' || test.status === 'ARCHIVED') {
    availabilityStatus = 'CLOSED';
  } else {
    if (test.startTime && new Date(test.startTime) > now) {
      availabilityStatus = 'NOT_STARTED';
    } else if (test.endTime && new Date(test.endTime) < now) {
      availabilityStatus = 'CLOSED';
    }
  }

  const qCount = questions.filter(q => q.testId === test.id).length;

  res.json({
    success: true,
    test: {
      publicCode: test.publicCode,
      title: test.title,
      description: test.description,
      subject: test.subject,
      instructions: test.instructions,
      durationMinutes: test.durationMinutes,
      startTime: test.startTime,
      endTime: test.endTime,
      isProtected: !!test.accessCode,
      requireName: test.requireName,
      requireRollNumber: test.requireRollNumber,
      requireEmail: test.requireEmail,
      negativeMarkingEnabled: test.negativeMarkingEnabled,
      negativeMarks: test.negativeMarks,
      totalMarks: test.totalMarks,
      totalQuestions: qCount,
      disableCopyPaste: test.disableCopyPaste,
      availabilityStatus
    }
  });
});

// Start examination attempt (or resume existing attempt!)
app.post('/api/public/tests/:publicCode/start', (req, res) => {
  const code = req.params.publicCode.toUpperCase();
  const test = tests.find(t => t.publicCode === code);

  if (!test) {
    return res.status(404).json({ success: false, message: 'Test not found' });
  }

  if (test.status !== 'PUBLISHED') {
    return res.status(400).json({ success: false, message: `This test is currently ${test.status.toLowerCase()} and cannot be started.` });
  }

  const now = new Date();
  if (test.startTime && new Date(test.startTime) > now) {
    return res.status(400).json({ success: false, message: 'This examination has not opened yet according to schedule.' });
  }
  if (test.endTime && new Date(test.endTime) < now) {
    return res.status(400).json({ success: false, message: 'This examination window has ended and is no longer accepting new attempts.' });
  }

  const { participantName, rollNumber, email, accessCode } = req.body;

  if (test.requireName && !participantName) {
    return res.status(400).json({ success: false, message: 'Participant full name is required' });
  }
  if (test.requireRollNumber && !rollNumber) {
    return res.status(400).json({ success: false, message: 'Roll number or ID is required' });
  }
  if (test.requireEmail && !email) {
    return res.status(400).json({ success: false, message: 'Email address is required' });
  }

  if (test.accessCode) {
    if (!accessCode || accessCode.trim().toUpperCase() !== test.accessCode.toUpperCase()) {
      return res.status(403).json({ success: false, message: 'Invalid examination access code' });
    }
  }

  const identifier = rollNumber ? rollNumber.trim().toUpperCase() : (email ? email.trim().toLowerCase() : participantName.trim());
  if (test.oneResponsePerIdentifier) {
    const pastCompleted = responses.find(r => 
      r.testId === test.id &&
      (r.rollNumber.toUpperCase() === identifier || (r.email && r.email.toLowerCase() === identifier)) &&
      (r.status === 'SUBMITTED' || r.status === 'AUTO_SUBMITTED')
    );
    if (pastCompleted) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already submitted your attempt for this examination. Multiple attempts are not permitted.',
        responseId: pastCompleted.id
      });
    }
  }

  const activeExisting = responses.find(r => 
    r.testId === test.id &&
    (r.rollNumber.toUpperCase() === identifier || (r.email && r.email.toLowerCase() === identifier)) &&
    r.status === 'IN_PROGRESS'
  );

  if (activeExisting) {
    if (new Date(activeExisting.expiresAt) < now) {
      finalizeAttempt(activeExisting, 'AUTO_SUBMITTED');
      return res.status(400).json({
        success: false,
        message: 'Your examination duration has expired and was automatically submitted.',
        responseId: activeExisting.id
      });
    }

    logCloudWatch('EC2-AppServer', 'INFO', `Participant ${activeExisting.participantName} (${activeExisting.rollNumber}) resumed test ${test.publicCode}`);
    return res.json({
      success: true,
      resumed: true,
      responseId: activeExisting.id,
      expiresAt: activeExisting.expiresAt
    });
  }

  const testQuestions = questions.filter(q => q.testId === test.id);
  if (testQuestions.length === 0) {
    return res.status(400).json({ success: false, message: 'This test does not have any questions configured yet.' });
  }

  let qOrder = testQuestions.map(q => q.id);
  if (test.randomizeQuestions) {
    qOrder = [...qOrder];
    for (let i = qOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [qOrder[i], qOrder[j]] = [qOrder[j], qOrder[i]];
    }
  }

  const durationMs = test.durationMinutes * 60 * 1000;
  let expiresAtMs = now.getTime() + durationMs;
  if (test.endTime) {
    const endMs = new Date(test.endTime).getTime();
    if (endMs < expiresAtMs) {
      expiresAtMs = endMs;
    }
  }

  const responseId = 'resp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  const newResponse: ParticipantResponse = {
    id: responseId,
    testId: test.id,
    testTitle: test.title,
    testSubject: test.subject,
    publicCode: test.publicCode,
    participantName: participantName || 'Anonymous Participant',
    rollNumber: rollNumber || 'N/A',
    email: email || undefined,
    startedAt: now.toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
    score: 0,
    totalMarks: test.totalMarks,
    percentage: 0,
    passed: false,
    status: 'IN_PROGRESS',
    focusLossCount: 0,
    copyAttemptCount: 0,
    randomizedQuestionOrder: qOrder,
    answers: {},
    createdAt: now.toISOString()
  };

  responses.push(newResponse);
  logCloudWatch('EC2-AppServer', 'INFO', `Participant ${newResponse.participantName} started attempt on test "${test.title}"`);

  res.status(201).json({
    success: true,
    resumed: false,
    responseId: newResponse.id,
    expiresAt: newResponse.expiresAt
  });
});

app.get('/api/attempts/:id', (req, res) => {
  const resp = responses.find(r => r.id === req.params.id);
  if (!resp) return res.status(404).json({ success: false, message: 'Attempt not found' });

  const test = tests.find(t => t.id === resp.testId);
  if (!test) return res.status(404).json({ success: false, message: 'Associated test not found' });

  const now = new Date();
  if (resp.status === 'IN_PROGRESS' && new Date(resp.expiresAt) < now) {
    finalizeAttempt(resp, 'AUTO_SUBMITTED');
  }

  const testQuestions = questions.filter(q => q.testId === test.id);
  let ordered = testQuestions;
  if (resp.randomizedQuestionOrder && resp.randomizedQuestionOrder.length > 0) {
    const orderMap = new Map(resp.randomizedQuestionOrder.map((qId, idx) => [qId, idx]));
    ordered = [...testQuestions].sort((a, b) => {
      const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999;
      const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999;
      return idxA - idxB;
    });
  }

  if (resp.status === 'IN_PROGRESS') {
    const sanitized = ordered.map(q => {
      let opts = q.options?.map(o => ({
        id: o.id,
        optionText: o.optionText,
        optionOrder: o.optionOrder
      }));

      if (test.randomizeOptions && opts) {
        opts = [...opts].sort(() => Math.random() - 0.5);
      }

      return {
        id: q.id,
        questionType: q.questionType,
        questionText: q.questionText,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        difficulty: q.difficulty,
        orderNumber: q.orderNumber,
        options: opts
      };
    });

    return res.json({
      success: true,
      attempt: {
        id: resp.id,
        participantName: resp.participantName,
        rollNumber: resp.rollNumber,
        startedAt: resp.startedAt,
        expiresAt: resp.expiresAt,
        status: resp.status,
        focusLossCount: resp.focusLossCount,
        copyAttemptCount: resp.copyAttemptCount,
        answers: resp.answers
      },
      test: {
        title: test.title,
        subject: test.subject,
        durationMinutes: test.durationMinutes,
        negativeMarkingEnabled: test.negativeMarkingEnabled,
        negativeMarks: test.negativeMarks,
        enableFullscreen: test.enableFullscreen,
        enableTabSwitchDetection: test.enableTabSwitchDetection,
        disableCopyPaste: test.disableCopyPaste
      },
      questions: sanitized
    });
  }

  res.json({
    success: true,
    attempt: resp,
    test: {
      title: test.title,
      subject: test.subject,
      passingPercentage: test.passingPercentage,
      resultReleaseMode: test.resultReleaseMode,
      isResultsReleased: test.isResultsReleased
    },
    questions: ordered
  });
});

app.post('/api/attempts/:id/answers', (req, res) => {
  const resp = responses.find(r => r.id === req.params.id);
  if (!resp) return res.status(404).json({ success: false, message: 'Attempt not found' });

  if (resp.status !== 'IN_PROGRESS') {
    return res.status(400).json({ success: false, message: 'Attempt is already finalized' });
  }

  const now = new Date();
  if (new Date(resp.expiresAt) < now) {
    finalizeAttempt(resp, 'AUTO_SUBMITTED');
    return res.status(400).json({ success: false, message: 'Time expired! Your test was automatically submitted.', expired: true });
  }

  const { questionId, selectedOptionIds, textAnswer, isMarkedForReview } = req.body;
  if (!questionId) return res.status(400).json({ success: false, message: 'questionId is required' });

  resp.answers[questionId] = {
    id: `ans-${resp.id}-${questionId}`,
    questionId,
    selectedOptionIds: selectedOptionIds || [],
    textAnswer: textAnswer || undefined,
    isMarkedForReview: !!isMarkedForReview,
    answeredAt: now.toISOString()
  };

  res.json({ success: true, savedAt: now.toISOString() });
});

app.post('/api/attempts/:id/tab-switch', (req, res) => {
  const resp = responses.find(r => r.id === req.params.id);
  if (!resp || resp.status !== 'IN_PROGRESS') return res.status(200).json({ success: true });

  resp.focusLossCount = (resp.focusLossCount || 0) + 1;
  logCloudWatch('CloudWatch-Agent', 'WARN', `Anti-Cheat: Focus loss detected for ${resp.participantName} (${resp.rollNumber}) -> Count: ${resp.focusLossCount}`);
  res.json({ success: true, focusLossCount: resp.focusLossCount });
});

// Anti-Cheat: Record copy attempt restriction event!
app.post('/api/attempts/:id/copy-attempt', (req, res) => {
  const resp = responses.find(r => r.id === req.params.id);
  if (!resp || resp.status !== 'IN_PROGRESS') return res.status(200).json({ success: true });

  resp.copyAttemptCount = (resp.copyAttemptCount || 0) + 1;
  logCloudWatch('CloudWatch-Agent', 'WARN', `Anti-Cheat: Blocked copy attempt by ${resp.participantName} (${resp.rollNumber}) -> Count: ${resp.copyAttemptCount}`);
  res.json({ success: true, copyAttemptCount: resp.copyAttemptCount });
});

app.post('/api/attempts/:id/submit', (req, res) => {
  const resp = responses.find(r => r.id === req.params.id);
  if (!resp) return res.status(404).json({ success: false, message: 'Attempt not found' });

  if (resp.status !== 'IN_PROGRESS') {
    return res.status(400).json({ success: false, message: 'Attempt has already been submitted' });
  }

  const finalAttempt = finalizeAttempt(resp, 'SUBMITTED');
  res.json({ success: true, attempt: finalAttempt });
});

function finalizeAttempt(resp: ParticipantResponse, targetStatus: 'SUBMITTED' | 'AUTO_SUBMITTED'): ParticipantResponse {
  const test = tests.find(t => t.id === resp.testId);
  const testQuestions = questions.filter(q => q.testId === resp.testId);

  let totalScore = 0;
  const negativeMarkPerWrong = (test?.negativeMarkingEnabled && test.negativeMarks) ? test.negativeMarks : 0;

  // Accurately compute total max marks from question weights
  const totalMax = testQuestions.length > 0 
    ? testQuestions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0)
    : (test?.totalMarks || 1);
  if (test) test.totalMarks = totalMax;

  testQuestions.forEach(q => {
    const studentAns = resp.answers[q.id];
    const qMarks = Number(q.marks) || 1;

    if (q.questionType === 'MCQ' || q.questionType === 'TRUE_FALSE') {
      const correctOpt = q.options?.find(o => o.isCorrect);
      if (studentAns && studentAns.selectedOptionIds && studentAns.selectedOptionIds.length > 0) {
        const selectedId = studentAns.selectedOptionIds[0];
        // Match by option ID or option text (e.g. True/False)
        const isCorrect = selectedId === correctOpt?.id || 
          (q.questionType === 'TRUE_FALSE' && correctOpt && q.options?.find(o => o.id === selectedId)?.optionText.toLowerCase() === correctOpt.optionText.toLowerCase());
        studentAns.isCorrect = !!isCorrect;
        if (isCorrect) {
          studentAns.marksAwarded = qMarks;
          totalScore += qMarks;
        } else {
          studentAns.marksAwarded = negativeMarkPerWrong > 0 ? -negativeMarkPerWrong : 0;
          if (negativeMarkPerWrong > 0) totalScore -= negativeMarkPerWrong;
        }
      } else if (studentAns) {
        studentAns.isCorrect = false;
        studentAns.marksAwarded = 0;
      }
    } else if (q.questionType === 'MULTIPLE_SELECT') {
      const correctIds = q.options?.filter(o => o.isCorrect).map(o => o.id) || [];
      if (studentAns && studentAns.selectedOptionIds && studentAns.selectedOptionIds.length > 0) {
        const selected = studentAns.selectedOptionIds;
        const matchesAll = correctIds.length === selected.length && correctIds.every(id => selected.includes(id));
        studentAns.isCorrect = matchesAll;
        if (matchesAll) {
          studentAns.marksAwarded = qMarks;
          totalScore += qMarks;
        } else {
          studentAns.marksAwarded = negativeMarkPerWrong > 0 ? -negativeMarkPerWrong : 0;
          if (negativeMarkPerWrong > 0) totalScore -= negativeMarkPerWrong;
        }
      } else if (studentAns) {
        studentAns.isCorrect = false;
        studentAns.marksAwarded = 0;
      }
    } else if (q.questionType === 'SHORT_ANSWER') {
      if (studentAns && studentAns.textAnswer && q.correctShortAnswer) {
        const isMatch = studentAns.textAnswer.trim().toLowerCase() === q.correctShortAnswer.trim().toLowerCase();
        studentAns.isCorrect = isMatch;
        studentAns.marksAwarded = isMatch ? qMarks : 0;
        if (isMatch) totalScore += qMarks;
      } else if (studentAns) {
        studentAns.isCorrect = false;
        studentAns.marksAwarded = 0;
      }
    }
  });

  const now = new Date();
  const startMs = new Date(resp.startedAt).getTime();
  const timeTaken = Math.max(1, Math.round((now.getTime() - startMs) / 1000));

  const finalScore = Math.max(0, Math.round(totalScore * 100) / 100);
  const percentage = Math.round((finalScore / totalMax) * 10000) / 100;
  const passThreshold = test?.passingPercentage || 40;
  const passed = percentage >= passThreshold;

  resp.submittedAt = now.toISOString();
  resp.timeTakenSeconds = timeTaken;
  resp.score = finalScore;
  resp.totalMarks = totalMax;
  resp.percentage = percentage;
  resp.passed = passed;
  resp.status = targetStatus;

  logCloudWatch('EC2-AppServer', 'INFO', `Evaluation finished for ${resp.participantName}: ${finalScore}/${totalMax} (${percentage}%, ${passed ? 'PASS' : 'FAIL'})`);
  return resp;
}

// 6. CREATOR RESPONSES & ANALYTICS
app.get('/api/tests/:id/responses', authenticateCreator, (req, res) => {
  const creator = (req as any).creator as Creator;
  const test = tests.find(t => t.id === req.params.id && t.creatorId === creator.id);
  if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

  const testResponses = responses.filter(r => r.testId === test.id && (r.status === 'SUBMITTED' || r.status === 'AUTO_SUBMITTED'));
  res.json({ success: true, responses: testResponses });
});

app.get('/api/tests/:id/analytics', authenticateCreator, (req, res) => {
  const creator = (req as any).creator as Creator;
  const test = tests.find(t => t.id === req.params.id && t.creatorId === creator.id);
  if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

  const testResponses = responses.filter(r => r.testId === test.id && (r.status === 'SUBMITTED' || r.status === 'AUTO_SUBMITTED'));
  const testQuestions = questions.filter(q => q.testId === test.id);

  const total = testResponses.length;
  const avgScore = total > 0 ? Math.round(testResponses.reduce((acc, r) => acc + r.percentage, 0) / total) : 0;
  const scores = testResponses.map(r => r.percentage).sort((a, b) => a - b);
  const median = total > 0 ? scores[Math.floor(total / 2)] : 0;
  const highest = total > 0 ? Math.max(...scores) : 0;
  const lowest = total > 0 ? Math.min(...scores) : 0;
  const passedCount = testResponses.filter(r => r.passed).length;
  const passRate = total > 0 ? Math.round((passedCount / total) * 100) : 0;

  const times = testResponses.map(r => Math.round((r.timeTakenSeconds || 60) / 60));
  const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const fastest = times.length > 0 ? Math.min(...times) : 0;
  const longest = times.length > 0 ? Math.max(...times) : 0;

  const scoreDistribution = [
    { range: '0–20%', count: testResponses.filter(r => r.percentage <= 20).length },
    { range: '21–40%', count: testResponses.filter(r => r.percentage > 20 && r.percentage <= 40).length },
    { range: '41–60%', count: testResponses.filter(r => r.percentage > 40 && r.percentage <= 60).length },
    { range: '61–80%', count: testResponses.filter(r => r.percentage > 60 && r.percentage <= 80).length },
    { range: '81–100%', count: testResponses.filter(r => r.percentage > 80).length },
  ];

  const questionAnalytics = testQuestions.map(q => {
    let qAnswers = 0;
    let correct = 0;
    let wrong = 0;
    const optionCounts: Record<string, number> = {};

    testResponses.forEach(r => {
      const a = r.answers[q.id];
      if (a && a.selectedOptionIds && a.selectedOptionIds.length > 0) {
        qAnswers++;
        if (a.isCorrect) correct++;
        else wrong++;
        a.selectedOptionIds.forEach(optId => {
          optionCounts[optId] = (optionCounts[optId] || 0) + 1;
        });
      }
    });

    const correctRate = qAnswers > 0 ? Math.round((correct / qAnswers) * 100) : 0;
    let calculatedDifficulty: 'EASY' | 'MEDIUM' | 'DIFFICULT' = 'MEDIUM';
    if (correctRate >= 80) calculatedDifficulty = 'EASY';
    else if (correctRate < 50) calculatedDifficulty = 'DIFFICULT';

    const optionDist = q.options?.map(o => ({
      optionText: o.optionText,
      chosenPercentage: qAnswers > 0 ? Math.round(((optionCounts[o.id] || 0) / qAnswers) * 100) : 0,
      isCorrect: o.isCorrect
    }));

    return {
      questionId: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      difficulty: q.difficulty,
      correctRate,
      calculatedDifficulty,
      totalAnswers: qAnswers,
      correctCount: correct,
      wrongCount: wrong,
      optionDistribution: optionDist
    };
  });

  const analyticsData: TestAnalytics = {
    testId: test.id,
    title: test.title,
    totalResponses: total,
    averageScore: avgScore,
    medianScore: median,
    highestScore: highest,
    lowestScore: lowest,
    passRate,
    avgTimeTakenMinutes: avgTime,
    fastestTimeMinutes: fastest,
    longestTimeMinutes: longest,
    scoreDistribution,
    questionAnalytics
  };

  res.json({ success: true, analytics: analyticsData });
});

app.get('/api/analytics/creator', authenticateCreator, (req, res) => {
  const creator = (req as any).creator as Creator;
  const myTests = tests.filter(t => t.creatorId === creator.id);
  const myTestIds = myTests.map(t => t.id);

  const activeCount = myTests.filter(t => t.status === 'PUBLISHED').length;
  const myResponses = responses.filter(r => myTestIds.includes(r.testId) && (r.status === 'SUBMITTED' || r.status === 'AUTO_SUBMITTED'));

  const totalResponses = myResponses.length;
  const avg = totalResponses > 0 ? Math.round(myResponses.reduce((acc, r) => acc + r.percentage, 0) / totalResponses) : 0;
  const passed = myResponses.filter(r => r.passed).length;
  const passRate = totalResponses > 0 ? Math.round((passed / totalResponses) * 100) : 0;

  const stats: CreatorStats = {
    activeTestsCount: activeCount,
    totalTestsCount: myTests.length,
    totalResponsesCount: totalResponses,
    averageScore: avg,
    passRate,
    recentTests: myTests.slice(0, 5)
  };

  res.json({ success: true, stats });
});

// 7. CLOUD & AWS TELEMETRY ENDPOINTS
app.get('/api/cloud/status', (req, res) => {
  res.json({
    infrastructure: {
      provider: 'Amazon Web Services (AWS)',
      region: 'ap-south-1 (Mumbai)',
      tenantModel: 'SaaS Shared Multi-Tenant Database with Row-Level Isolation'
    },
    compute: {
      service: 'AWS EC2',
      instanceId: 'i-0b82f14e82b79a1',
      instanceType: 't3.medium',
      vCPUs: 2,
      ramTotalGB: 4.0,
      cpuUtilization: Math.floor(16 + Math.random() * 8),
      autoScalingGroup: { desiredCapacity: 2, healthyInstances: 2 }
    },
    database: {
      service: 'AWS RDS MySQL 8.0',
      endpoint: 'testcloud-rds-prod.c3b9x.ap-south-1.rds.amazonaws.com:3306',
      multiAZ: true,
      allocatedStorageGB: 20,
      activeConnections: 12 + Math.floor(Math.random() * 5)
    },
    storage: {
      service: 'AWS S3',
      bucketName: 'testcloud-secure-storage-prod',
      encryption: 'AES-256 SSE',
      totalFiles: s3Files.length
    },
    monitoring: {
      service: 'AWS CloudWatch',
      alarmStatus: 'OK',
      logsCount: cloudWatchLogs.length
    }
  });
});

app.get('/api/cloud/logs', (req, res) => {
  res.json(cloudWatchLogs);
});

app.get('/api/cloud/s3/files', (req, res) => {
  res.json(s3Files);
});

// ==========================================
// BOOTSTRAP EXPRESS SERVER
// ==========================================
async function startServer() {
  await seedDatabase();

  const isProduction = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT) || 3000;

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`TestCloud Server running at http://0.0.0.0:${port}`);
    logCloudWatch('EC2-AppServer', 'INFO', `TestCloud server initialized on port ${port}.`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
