import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().trim().email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  turnstileToken: z.string().optional(),
});

export type Credentials = z.infer<typeof credentialsSchema>;
