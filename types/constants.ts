import { z } from "zod";

export const CompositionProps = z.object({
  title: z.string(),
  images: z.array(z.object({
    id: z.string().optional(),
    url: z.string(),
    name: z.string().optional(),
    timestamp: z.number().optional(),
    orientation: z.enum(['landscape', 'portrait']).optional(),
    aspectRatio: z.number().optional(),
  })).optional(),
  music: z.string().optional(),
  tripId: z.string().optional(),
});

export type CompositionProps = z.infer<typeof CompositionProps>;

// Video constants
export const DURATION_IN_FRAMES = 300;
export const VIDEO_FPS = 30;
export const VIDEO_HEIGHT = 1080;
export const VIDEO_WIDTH = 1920;