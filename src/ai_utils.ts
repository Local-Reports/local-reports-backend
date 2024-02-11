export const AI_URL = "https://royal-scene-68bf.local-reports.workers.dev";

export async function translateText(text: string, target_lang: string, source_lang?: string): Promise<string> {
  if (source_lang === undefined) {
    const response = await fetch(AI_URL + "/lang_ident", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    const resp = await response.json();

    if (resp.language !== undefined) {
      source_lang = resp.language;
    } else {
      source_lang = "en";
    }
  }

  const response = await fetch(AI_URL + "/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, source_lang, target_lang}),
  });

  return await response.json();
}
