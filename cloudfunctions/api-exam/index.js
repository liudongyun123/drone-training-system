"use strict";
const cloudbase = require("@cloudbase/node-sdk");
const app = cloudbase.init({ env: process.env.TCB_ENV_ID || "rcwljy-5ghmq2ex26764978" });
const db = app.database();
const _ = db.command;
const isWxEnv = false;
const { getCorsHeaders } = require("./lib/cors");
function normalizeQuestion(q) {
  if (!q) return null;
  const title = q.title || q.question || q.content || "";
  let type = (q.type || "single").toLowerCase();
  if (type === "judgment") type = "judge";
  const answer = q.answer || q.correctAnswer || "";
  const analysis = q.analysis || q.explanation || "";
  let options = [];
  if (Array.isArray(q.options)) {
    options = q.options.map((opt, idx) => {
      if (typeof opt === "string") return opt;
      if (opt.content) return opt.content;
      if (opt.text) return opt.text;
      if (opt.key && opt.content) return `${opt.key}. ${opt.content}`;
      if (opt.key && opt.text) return `${opt.key}. ${opt.text}`;
      return `\u9009\u9879${String.fromCharCode(65 + idx)}`;
    });
  }
  return {
    _id: q._id,
    type,
    title,
    options,
    answer,
    analysis,
    difficulty: q.difficulty || "",
    score: q.score || 1,
    bankId: q.bankId || ""
  };
}
async function loadQuestionsFromBanks(bankIds, limit = 0) {
  let allQuestions = [];
  const qResult = await db.collection("questions").where({ bankId: _.in(bankIds) }).get();
  allQuestions = allQuestions.concat(qResult.data);
  let normalized = allQuestions.map(normalizeQuestion).filter(Boolean);
  if (limit > 0 && normalized.length > limit) {
    normalized = normalized.slice(0, limit);
  }
  return normalized;
}
function normalizeBank(b) {
  return {
    _id: b._id,
    title: b.name || b.title || "\u672A\u547D\u540D\u9898\u5E93",
    name: b.name || b.title || "\u672A\u547D\u540D\u9898\u5E93",
    description: b.description || "",
    category: b.category || "\u7EFC\u5408",
    level: b.level || "\u521D\u7EA7",
    questionCount: b.questionCount || 0,
    courseId: b.courseId || "",
    duration: b.duration || b.timeLimit || 60,
    passScore: b.passScore || b.passingScore || 60,
    totalScore: b.totalScore || 100,
    createdAt: b.createdAt || ""
  };
}
function getOpenId(event) {
  if (isWxEnv) {
    return cloud.getWXContext().OPENID;
  }
  return event.userId || event._openid || "";
}
async function getBanks(params = {}) {
  const { page = 1, pageSize = 100, courseId = "", status = "" } = params;
  let where = {};
  if (status) {
    where.status = status;
  }
  if (courseId) {
    where.courseId = courseId;
  }
  const countResult = await db.collection("questionBanks").where(where).count();
  const banks = await db.collection("questionBanks").where(where).orderBy("createdAt", "desc").skip((page - 1) * pageSize).limit(pageSize).get();
  return {
    success: true,
    data: {
      list: banks.data.map(normalizeBank),
      total: countResult.total,
      page,
      pageSize
    }
  };
}
async function getBankDetail(bankId, params = {}) {
  const { shuffle = true, limit = 0 } = params;
  const bank = await db.collection("questionBanks").doc(bankId).get();
  if (!bank.data) {
    return { success: false, error: "\u9898\u5E93\u4E0D\u5B58\u5728" };
  }
  let questionList = await loadQuestionsFromBanks([bankId], limit);
  if (shuffle) {
    questionList = questionList.sort(() => Math.random() - 0.5);
  }
  const questionsForPractice = questionList.map((q) => ({
    _id: q._id,
    type: q.type,
    title: q.title,
    options: q.options,
    score: q.score
  }));
  const bankData = normalizeBank(bank.data);
  return {
    success: true,
    data: {
      ...bankData,
      questionCount: questionList.length,
      questions: questionsForPractice
    }
  };
}
async function getExams(params = {}) {
  const { page = 1, pageSize = 100, courseId = "", status = "" } = params;
  let where = {};
  if (status) {
    where.status = status;
  }
  if (courseId) {
    where.courseId = courseId;
  }
  const countResult = await db.collection("exams").where(where).count();
  const exams = await db.collection("exams").where(where).orderBy("createdAt", "desc").skip((page - 1) * pageSize).limit(pageSize).get();
  return {
    success: true,
    data: {
      list: exams.data.map((e) => ({
        _id: e._id,
        title: e.title || e.name || "\u672A\u547D\u540D\u8003\u8BD5",
        description: e.description || "",
        courseId: e.courseId || "",
        duration: e.duration || e.timeLimit || 60,
        questionCount: e.questionCount || 0,
        totalScore: e.totalScore || 100,
        passScore: e.passScore || e.passingScore || 60,
        startTime: e.startTime,
        endTime: e.endTime,
        attemptLimit: e.attemptLimit || 1
      })),
      total: countResult.total,
      page,
      pageSize
    }
  };
}
async function getExamDetail(examId) {
  const exam = await db.collection("exams").doc(examId).get();
  if (!exam.data) {
    return { success: false, error: "\u8003\u8BD5\u4E0D\u5B58\u5728" };
  }
  const e = exam.data;
  let questions = [];
  if (e.bankIds && e.bankIds.length > 0) {
    questions = await loadQuestionsFromBanks(e.bankIds);
  }
  const questionsForExam = questions.map((q) => ({
    _id: q._id,
    type: q.type,
    title: q.title,
    options: q.options,
    score: q.score
  }));
  return {
    success: true,
    data: {
      _id: e._id,
      title: e.title || e.name || "\u672A\u547D\u540D\u8003\u8BD5",
      description: e.description || "",
      courseId: e.courseId || "",
      duration: e.duration || e.timeLimit || 60,
      totalScore: e.totalScore || 100,
      passScore: e.passScore || e.passingScore || 60,
      startTime: e.startTime,
      endTime: e.endTime,
      attemptLimit: e.attemptLimit || 1,
      questionCount: questions.length,
      questions: questionsForExam
    }
  };
}
async function startExam(examId, data, userId) {
  const phone = data.phone || "";
  const openid = userId || getOpenId({ userId: data.userId });
  const exam = await db.collection("exams").doc(examId).get();
  if (!exam.data) {
    return { success: false, error: "\u8003\u8BD5\u4E0D\u5B58\u5728" };
  }
  const now = /* @__PURE__ */ new Date();
  if (exam.data.startTime && new Date(exam.data.startTime) > now) {
    return { success: false, error: "\u8003\u8BD5\u5C1A\u672A\u5F00\u59CB" };
  }
  if (exam.data.endTime && new Date(exam.data.endTime) < now) {
    return { success: false, error: "\u8003\u8BD5\u5DF2\u7ED3\u675F" };
  }
  let attempts;
  if (phone) {
    attempts = await db.collection("examAttempts").where({ examId, phone }).count();
  } else {
    attempts = await db.collection("examAttempts").where({ examId, userId: openid }).count();
  }
  const attemptLimit = exam.data.attemptLimit || 1;
  if (attempts.total >= attemptLimit) {
    return { success: false, error: "\u5DF2\u8FBE\u6700\u5927\u7B54\u9898\u6B21\u6570" };
  }
  const attemptId = `${examId}_${phone || openid}_${Date.now()}`;
  const now2 = (/* @__PURE__ */ new Date()).toISOString();
  const attemptData = {
    _id: attemptId,
    examId,
    courseId: exam.data.courseId,
    status: "in_progress",
    startTime: now2,
    score: 0,
    answers: [],
    createdAt: now2
  };
  if (phone) {
    attemptData.phone = phone;
  }
  if (openid) {
    attemptData.userId = openid;
  }
  await db.collection("examAttempts").add({
    data: attemptData
  });
  return {
    success: true,
    data: {
      attemptId,
      examId,
      startTime: now2,
      duration: exam.data.duration || 60
    }
  };
}
async function submitExam(data, userId) {
  const { attemptId, answers } = data;
  const phone = data.phone || "";
  const openid = userId || getOpenId({ userId: data.userId });
  const attempt = await db.collection("examAttempts").doc(attemptId).get();
  if (!attempt.data) {
    return { success: false, error: "\u7B54\u9898\u8BB0\u5F55\u4E0D\u5B58\u5728" };
  }
  if (attempt.data.status !== "in_progress") {
    return { success: false, error: "\u8003\u8BD5\u5DF2\u63D0\u4EA4" };
  }
  const questionIds = answers.map((a) => a.questionId);
  const questions = await db.collection("questions").where({ _id: _.in(questionIds) }).get();
  const questionsMap = new Map(questions.data.map((q) => [q._id, q]));
  let totalScore = 0;
  const scoredAnswers = answers.map((a) => {
    const question = questionsMap.get(a.questionId);
    if (!question) {
      return { questionId: a.questionId, userAnswer: a.answer, isCorrect: false, score: 0 };
    }
    const isCorrect = checkAnswer(question, a.answer);
    const score = isCorrect ? question.score || 1 : 0;
    totalScore += score;
    return {
      questionId: a.questionId,
      userAnswer: a.answer,
      correctAnswer: question.answer,
      isCorrect,
      score
    };
  });
  const exam = await db.collection("exams").doc(attempt.data.examId).get();
  const passScore = exam.data?.passScore || 60;
  const passStatus = totalScore >= passScore;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.collection("examAttempts").doc(attemptId).update({
    status: "completed",
    score: totalScore,
    passStatus,
    answers: scoredAnswers,
    submitTime: now,
    duration: Math.round((new Date(now) - new Date(attempt.data.startTime)) / 6e4),
    updatedAt: now
  });
  return {
    success: true,
    data: {
      attemptId,
      examId: attempt.data.examId,
      score: totalScore,
      passStatus,
      passScore,
      totalQuestions: answers.length,
      correctCount: scoredAnswers.filter((a) => a.isCorrect).length,
      submitTime: now
    }
  };
}
function checkAnswer(question, userAnswer) {
  const correctAnswer = question.answer;
  if (question.type === "boolean" || question.type === "judgment") {
    const userVal = String(userAnswer).toLowerCase();
    const correctVal = String(correctAnswer).toLowerCase();
    return userVal === correctVal || correctVal === "true" && userVal === "a" || correctVal === "false" && userVal === "b";
  }
  if (typeof correctAnswer === "string" && /^[A-D]$/i.test(String(correctAnswer))) {
    return String(userAnswer).toUpperCase() === String(correctAnswer).toUpperCase();
  }
  if (Array.isArray(correctAnswer)) {
    const userArr = Array.isArray(userAnswer) ? userAnswer.map(String).sort() : [String(userAnswer)];
    const correctArr = correctAnswer.map(String).sort();
    return JSON.stringify(userArr) === JSON.stringify(correctArr);
  }
  return String(userAnswer).toUpperCase() === String(correctAnswer).toUpperCase();
}
async function getAttempts(params, userId) {
  const phone = params.phone || "";
  const openid = userId || getOpenId({ userId: params.userId });
  const { examId = "", page = 1, pageSize = 20 } = params;
  let where = {};
  if (phone) {
    where.phone = phone;
  } else if (openid) {
    where.userId = openid;
  }
  if (examId) {
    where.examId = examId;
  }
  const countResult = await db.collection("examAttempts").where(where).count();
  const attempts = await db.collection("examAttempts").where(where).orderBy("submitTime", "desc").skip((page - 1) * pageSize).limit(pageSize).get();
  return {
    success: true,
    data: {
      list: attempts.data.map((a) => ({
        _id: a._id,
        examId: a.examId,
        courseId: a.courseId,
        score: a.score || 0,
        passStatus: a.passStatus,
        status: a.status,
        startTime: a.startTime,
        submitTime: a.submitTime,
        duration: a.duration
      })),
      total: countResult.total,
      page,
      pageSize
    }
  };
}
async function getAttemptDetail(attemptId, userId) {
  const openid = userId || getOpenId({ userId });
  const attempt = await db.collection("examAttempts").doc(attemptId).get();
  if (!attempt.data) {
    return { success: false, error: "\u7B54\u9898\u8BB0\u5F55\u4E0D\u5B58\u5728" };
  }
  if (attempt.data.userId !== openid) {
    return { success: false, error: "\u65E0\u6743\u67E5\u770B\u6B64\u8BB0\u5F55" };
  }
  return {
    success: true,
    data: {
      _id: attempt.data._id,
      examId: attempt.data.examId,
      courseId: attempt.data.courseId,
      score: attempt.data.score || 0,
      passStatus: attempt.data.passStatus,
      status: attempt.data.status,
      startTime: attempt.data.startTime,
      submitTime: attempt.data.submitTime,
      duration: attempt.data.duration,
      answers: attempt.data.answers || []
    }
  };
}
exports.main = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: getCorsHeaders(event.headers?.origin),
      body: JSON.stringify({ code: 0, message: "OK" })
    };
  }
  let action = event.action || "";
  let data = event.data || event;
  if (event.body) {
    try {
      const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
      action = body.action || action;
      data = body.data || body;
    } catch (e) {
    }
  }
  const userId = data.userId || data._openid || (isWxEnv ? cloud.getWXContext().OPENID : "");
  try {
    let result;
    switch (action) {
      // 题库
      case "banks":
      case "getBanks":
        result = await getBanks(data);
        break;
      case "bankDetail":
      case "getBankDetail":
        result = await getBankDetail(data.bankId, data);
        break;
      // 考试
      case "exams":
      case "getExams":
        result = await getExams(data);
        break;
      case "examDetail":
      case "getExamDetail":
        result = await getExamDetail(data.examId);
        break;
      case "startExam":
        result = await startExam(data.examId, data, userId);
        break;
      case "submitExam":
        result = await submitExam(data, userId);
        break;
      // 答题记录
      case "attempts":
      case "getAttempts":
        result = await getAttempts(data, userId);
        break;
      case "attemptDetail":
      case "getAttemptDetail":
        result = await getAttemptDetail(data.attemptId, userId);
        break;
      default:
        result = { success: false, error: "\u672A\u77E5\u7684\u64CD\u4F5C: " + action };
    }
    if (event.httpMethod || event.headers) {
      return {
        statusCode: result.success ? 200 : 400,
        headers: getCorsHeaders(event.headers?.origin),
        body: JSON.stringify(result)
      };
    }
    return result;
  } catch (error) {
    console.error("[api-exam] \u9519\u8BEF:", error);
    const errorResult = { success: false, error: error.message };
    if (event.httpMethod || event.headers) {
      return {
        statusCode: 500,
        headers: getCorsHeaders(),
        body: JSON.stringify(errorResult)
      };
    }
    return errorResult;
  }
};
