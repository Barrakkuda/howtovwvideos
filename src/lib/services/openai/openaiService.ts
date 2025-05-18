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
  videoTitle: string,
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

  const prompt = `You are an expert in vintage air-cooled Volkswagen vehicles, including Beetles, Buses, Ghias, and related models. You are helping to classify YouTube videos that may be educational or instructional ("how-to") content specifically about working on these types of vehicles.

Your job is to analyze the provided video title and transcript, then decide if the video is a how-to video about vintage air-cooled Volkswagens. If so, classify the vehicle types, relevant topic categories, and provide up to 5 specific tags.

Use the following decision logic:

1. The video **must** be instructional or demonstrative in nature (not purely opinion, entertainment, or historical overview). The title might provide clues.
2. The video **must clearly relate to** vintage air-cooled Volkswagen vehicles. If the car brand is not clearly stated or clearly implied from title or transcript, assume it is not VW.
3. If the video qualifies, classify it accordingly using the format below.
4. If the video does not qualify, return the rejection format exactly.

Allowed "vwTypes": [${vwTypesString}]
Allowed "categories": [${categoriesString}]
Tags: Max 5. Short (1-3 words), specific, not generic labels.

Respond in **exact JSON format**.

If the video **does not** qualify:
{ "isHowToVWVideo": false }

If the video does qualify:
{
  "isHowToVWVideo": true,
  "vwTypes": ["<SUGGESTED_VW_TYPE_1>", "<SUGGESTED_VW_TYPE_2>"],
  "categories": ["<CATEGORY_1>", "<CATEGORY_2>"],
  "tags": ["<TAG_1>", "<TAG_2>", "<TAG_3>", "<TAG_4>", "<TAG_5>"]
}

Video Title: "${videoTitle}"
Video Transcript: "${transcript}"`;

  // console.log("Sending the following prompt to OpenAI:\n", prompt);

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
