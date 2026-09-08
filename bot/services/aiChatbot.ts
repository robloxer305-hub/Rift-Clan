import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export class AIChatbot {
  private client: GoogleGenAI | null;

  constructor() {
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  isEnabled(): boolean {
    return Boolean(this.client);
  }

  async ask(prompt: string): Promise<string> {
    if (!this.client) {
      return "AI is not configured yet. Add GEMINI_API_KEY to your environment to enable chatbot responses.";
    }

    try {
      const response = await this.client.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
      });

      return (
        response.text ??
        "I couldn’t produce a response right now. Please try again in a moment."
      );
    } catch (error) {
      console.error("AI chatbot error:", error);
      return "The AI service failed to respond. Please try again later.";
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const prompt = messages
      .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
      .join("\n\n");

    return this.ask(prompt);
  }
}

export const aiChatbot = new AIChatbot();
