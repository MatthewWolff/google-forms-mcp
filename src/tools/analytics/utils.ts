import type { FormsClient } from '../../auth.js';

export function findQuestionIdByTitle(form: any, title: string): string | null {
  for (const item of form.items || []) {
    if (item.questionItem?.question && item.title === title) {
      return item.questionItem.question.questionId;
    }
    if (item.questionGroupItem?.questions) {
      for (const q of item.questionGroupItem.questions) {
        if (q.rowQuestion && item.title === title) {
          return q.questionId;
        }
      }
    }
  }
  return null;
}

export function extractQuestionTitles(form: any): string[] {
  const titles: string[] = [];
  for (const item of form.items || []) {
    if (item.questionItem?.question && item.title) {
      titles.push(item.title);
    }
    if (item.questionGroupItem && item.title) {
      titles.push(item.title);
    }
  }
  return titles;
}

const MAX_RESPONSES = 10_000;

export async function getAllResponses(client: FormsClient, formId: string): Promise<any[]> {
  const all: any[] = [];
  let pageToken: string | undefined;

  do {
    const params: Record<string, unknown> = { formId, pageSize: 5000 };
    if (pageToken) params.pageToken = pageToken;

    const resp = await client.forms.responses.list(params as { formId: string });
    if (resp.data.responses) {
      all.push(...resp.data.responses);
    }
    pageToken = resp.data.nextPageToken ?? undefined;

    if (all.length >= MAX_RESPONSES) break;
  } while (pageToken);

  return all;
}
