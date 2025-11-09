import { z } from "zod";

// Remotion Video Configuration
export const COMP_NAME = "BeatVideo";
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const VIDEO_FPS = 30;
export const DURATION_IN_FRAMES = 510; // 17초 at 30fps (음악 마지막 beat 16.05초 + 여유 1초)

// Image Schema
const ImageSchema = z.object({
  url: z.string(),
  orientation: z.enum(["landscape", "portrait"]).default("landscape"),
  aspectRatio: z.number().default(16 / 9),
});

// Composition Props Schema (Zod)
export const CompositionProps = z.object({
  title: z.string().optional(),
  images: z.array(ImageSchema).default([]),
  music: z.string().optional(),
  tripId: z.string().optional(),
});

// TypeScript Type (inferred from Zod schema)
export type CompositionPropsType = z.infer<typeof CompositionProps>;

// Default Props
export const defaultMyCompProps: CompositionPropsType = {
  title: "",
  images: [],
  music: "/music.mp3",
  tripId: undefined,
};
