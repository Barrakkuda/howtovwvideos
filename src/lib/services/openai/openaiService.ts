import OpenAI from "openai";

export interface OpenAIAnalysisResponse {
  isHowToVWVideo: boolean;
  categories?: string[];
  vwTypes?: string[];
  tags?: string[];
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeTranscriptWithOpenAI(
  transcript: string,
  existingCategoryNames: string[],
  availableVWTypeNames: string[],
): Promise<{
  success: boolean;
  data?: OpenAIAnalysisResponse;
  error?: string;
}> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key is not configured.");
    return {
      success: false,
      error: "OpenAI API key not configured on the server.",
    };
  }

  if (!transcript || transcript.trim() === "") {
    return { success: false, error: "Transcript is empty or not provided." };
  }

  const vwTypesString = availableVWTypeNames.join(", ");
  const categoriesString = existingCategoryNames.join(", ");

  const prompt = `Analyze the following video transcript.

First, determine if this is a how-to video specifically about vintage air-cooled Volkswagen vehicles.
If it is NOT a how-to video about vintage air-cooled Volkswagens, respond with:
{ "isHowToVWVideo": false }

If it IS a how-to video about vintage air-cooled Volkswagens, please provide a JSON object with the following structure:
{
  "isHowToVWVideo": true,
  "vwTypes": ["<SUGGESTED_VW_TYPE_1>", "<SUGGESTED_VW_TYPE_2>", ...],
  "categories": ["<SUGGESTED_CATEGORY_1>", "<SUGGESTED_CATEGORY_2>", ...],
  "tags": ["<TAG_1>", "<TAG_2>", "<TAG_3>", "<TAG_4>", "<TAG_5>"]
}

Instructions for when "isHowToVWVideo" is true:
1.  "vwTypes": Select one or more relevant VW types from the following list: [${vwTypesString}]. The "ALL" type can be used if the content is broadly applicable.
2.  "categories": Select one or more relevant categories from the following list of existing categories: [${categoriesString}].
3.  "tags": Suggest up to 5 concise, relevant tags (1-3 words each) based on the specific topics and keywords in the transcript. These should be new, specific keywords, not necessarily from the provided category list.

Transcript: "${transcript}"`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      try {
        const jsonData = JSON.parse(content) as OpenAIAnalysisResponse;
        if (typeof jsonData.isHowToVWVideo !== "boolean") {
          console.error(
            "OpenAI response missing 'isHowToVWVideo' boolean:",
            jsonData,
          );
          return {
            success: false,
            error:
              "Invalid JSON response structure from OpenAI (missing isHowToVWVideo).",
          };
        }
        return { success: true, data: jsonData };
      } catch (parseError) {
        console.error(
          "Failed to parse OpenAI JSON response:",
          parseError,
          "Content:",
          content,
        );
        return {
          success: false,
          error: "Failed to parse JSON response from OpenAI.",
        };
      }
    } else {
      console.error("No content in OpenAI response:", completion);
      return { success: false, error: "No content in OpenAI response." };
    }
  } catch (error) {
    console.error("OpenAI API call failed:", error);
    let errorMessage = "An unexpected error occurred with the OpenAI API.";
    if (error instanceof OpenAI.APIError) {
      errorMessage = `OpenAI API Error: ${error.status} ${error.name} ${error.message}`;
    }
    return { success: false, error: errorMessage };
  }
}
