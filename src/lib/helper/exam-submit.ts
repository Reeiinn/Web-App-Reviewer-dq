/**
 * Re-sends the answers whose save has not come back, before a sitting is
 * scored, and says which ones still did not save.
 *
 * Scoring counts only the answers the server holds, so completing a sitting
 * while one is missing would mark a question the learner did answer as
 * blank. The caller stops instead and asks them to submit again.
 *
 * A few go at a time: the server saves each answer in a transaction, and the
 * whole paper at once would queue them behind each other until some timed
 * out.
 */
export async function resendAnswers(
  questionIds: string[],
  send: (questionId: string) => Promise<boolean>,
  concurrency = 4,
): Promise<string[]> {
  const failed = new Set<string>();
  let next = 0;

  const worker = async () => {
    while (next < questionIds.length) {
      const id = questionIds[next++];
      const saved = await send(id).catch(() => false);
      if (!saved) failed.add(id);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, questionIds.length) }, worker),
  );
  return questionIds.filter((id) => failed.has(id));
}
