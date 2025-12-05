
import { GoogleGenAI, Type } from "@google/genai";
import { Difficulty } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const getPromptForDifficulty = (difficulty: Difficulty) => {
  switch (difficulty) {
    case Difficulty.EASY:
      return "Generate 15 simple, short sentences (5-8 words) using common words. Topics: Cars, driving, fun.";
    case Difficulty.MEDIUM:
      return "Generate 15 standard sentences (10-15 words) with moderate vocabulary. Topics: Racing, travel, nature.";
    case Difficulty.HARD:
      return "Generate 15 long, complex sentences (15-25 words) with advanced vocabulary and punctuation. Topics: Sci-fi, philosophy, intense action.";
    case Difficulty.EXPERT:
      return "Generate 15 very long, intricate sentences (25+ words) with technical, archaic, or abstract vocabulary. Topics: Quantum physics, ancient history, cyberpunk lore.";
    default:
      return "Generate 10 sentences for a typing game.";
  }
};

export const fetchSentences = async (difficulty: Difficulty): Promise<string[]> => {
  try {
    const prompt = getPromptForDifficulty(difficulty);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No data returned");
    
    return JSON.parse(jsonText) as string[];
  } catch (error) {
    console.error("Failed to fetch sentences from Gemini:", error);
    // Robust Fallback sentences if API fails
    return getFallbackSentences(difficulty);
  }
};

const getFallbackSentences = (difficulty: Difficulty) => {
  const easy = [
    "The car is fast.",
    "I like to drive.",
    "The road is long.",
    "Green light means go.",
    "Watch out for the turn.",
    "Keep your eyes open.",
    "Steer with both hands.",
    "The engine is loud.",
    "Race to the finish line.",
    "Do not crash the car."
  ];

  const medium = [
    "The neon lights blurred as the speed increased.",
    "Driving at night requires focus and calm nerves.",
    "The engine roared like a beast awakening from slumber.",
    "Every turn brings a new challenge to the driver.",
    "Rain slicked the asphalt, making traction difficult.",
    "The champion racer never looks back at the competition.",
    "Shift gears at the perfect moment for maximum power.",
    "The scenery flew by in a wash of green and blue.",
    "Victory awaits those who can master their machine.",
    "Silence filled the cabin as the finish line approached."
  ];

  const hard = [
    "Navigating the treacherous mountain pass requires not just skill, but an intuitive understanding of physics.",
    "The aerodynamic chassis sliced through the air, minimizing drag and maximizing fuel efficiency.",
    "As the sun dipped below the horizon, the golden light reflected blindingly off the polished chrome.",
    "Adrenaline coursed through his veins as the speedometer climbed higher into the red zone.",
    "The relationship between a driver and their car is a symbiotic bond forged in high-speed pursuit.",
    "Complex mechanical systems worked in harmony to propel the vehicle forward at breakneck speeds.",
    "Suddenly, the rear tires lost their grip, sending the vehicle into a controlled drift across the apex.",
    "Precision engineering is the hallmark of modern automotive design, blending art with raw power.",
    "The crowd's roar was drowned out by the thunderous symphony of twelve cylinders firing in unison.",
    "To hesitate for even a fraction of a second is to concede defeat in the world of professional racing."
  ];

  const expert = [
    "The juxtaposition of the serene landscape against the violent mechanical fury of the engine created a surreal, almost cinematic experience.",
    "Quantum mechanics suggests that the observer affects the observed, much like how a driver's anxiety can seemingly alter the behavior of the machine.",
    "Navigating the labyrinthine streets of the cybernetic metropolis required a neural link directly to the vehicle's navigation mainframe.",
    "The visceral sensation of acceleration is merely the body's interpretation of increasing velocity overcoming inertia.",
    "In the annals of motorsport history, few have dared to challenge the theoretical limits of friction and gravity on such a perilous track.",
    "The chaotic turbulence of the wake created by the leading vehicle made overtaking a maneuver fraught with catastrophic potential.",
    "Synthesizing the data from the heads-up display, the pilot made a split-second calculation that would determine the outcome of the championship.",
    "Beneath the veneer of technological sophistication lies the primal urge to conquer distance and time through sheer mechanical will.",
    "The iridescent shimmer of the force field acted as a barrier against the abrasive dust of the Martian wasteland.",
    "Only through the rigorous application of discipline and reflex can one hope to transcend the limitations of human reaction time."
  ];

  switch (difficulty) {
    case Difficulty.EASY: return easy;
    case Difficulty.MEDIUM: return medium;
    case Difficulty.HARD: return hard;
    case Difficulty.EXPERT: return expert;
    default: return medium;
  }
}
