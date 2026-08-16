const round2 = (n) => Math.round(n * 100) / 100;

const addExam = async (student, examData) => {
  student.exams.push(examData);
  await student.save();
  return student.exams[student.exams.length - 1];
};

const updateExam = async (student, examId, examData) => {
  const exam = student.exams.id(examId);
  if (!exam) return null;
  Object.assign(exam, examData);
  await student.save();
  return exam;
};

const addStudyProgress = async (student, progressData) => {
  student.studyProgress.push(progressData);
  await student.save();
  return student.studyProgress[student.studyProgress.length - 1];
};

const updateStudyProgress = async (student, progressId, progressData) => {
  const progress = student.studyProgress.id(progressId);
  if (!progress) return null;
  Object.assign(progress, progressData);
  progress.lastUpdated = Date.now();
  await student.save();
  return progress;
};

const buildPerformanceSummary = (student) => {
  const exams = [...student.exams].sort((a, b) => b.examDate - a.examDate);
  const latestExam = exams[0] || null;
  const percentages = exams
    .map((e) => e.percentage)
    .filter((p) => p !== null && typeof p === "number");
  const overallExamAverage =
    percentages.length > 0
      ? round2(percentages.reduce((sum, p) => sum + p, 0) / percentages.length)
      : null;

  const studyProgressSummary = (() => {
    const total = student.studyProgress.length;
    const notStarted = student.studyProgress.filter((p) => p.status === "not_started").length;
    const inProgress = student.studyProgress.filter((p) => p.status === "in_progress").length;
    const completed = student.studyProgress.filter((p) => p.status === "completed").length;
    const averageProgressPercentage =
      total > 0
        ? round2(student.studyProgress.reduce((sum, p) => sum + p.progressPercentage, 0) / total)
        : 0;
    return { total, completed, inProgress, notStarted, averageProgressPercentage };
  })();

  const needsAttention = [];
  if (studyProgressSummary.total === 0) {
    needsAttention.push("no study-progress record");
  } else if (studyProgressSummary.averageProgressPercentage < 50) {
    needsAttention.push("average study progress below 50%");
  }
  if (exams.length === 0) {
    needsAttention.push("no exam record");
  } else if (overallExamAverage !== null && overallExamAverage < 40) {
    needsAttention.push("overall exam average below 40%");
  }

  return { exams, latestExam, overallExamAverage, studyProgressSummary, needsAttention };
};

module.exports = {
  addExam,
  updateExam,
  addStudyProgress,
  updateStudyProgress,
  buildPerformanceSummary
};
