import OpenAI from "openai";

export interface OpenAIAnalysisResponse {
  isHowToVWVideo: boolean;
  category?: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeTranscriptWithOpenAI(transcript: string): Promise<{
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

  const prompt = `Based on the following transcript, determine if this is a how-to video about a vintage air-cooled Volkswagen. If yes, return a JSON object like { "isHowToVWVideo": true, "categories": ["Engine Tuning", "Performance"] }. If no, return { "isHowToVWVideo": false }. Transcript: "${transcript}"`;

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
