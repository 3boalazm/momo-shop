import { z } from "zod";

// trim() before validating — guards against browser autofill adding stray
// leading/trailing whitespace to name/email fields
export const signupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(8).max(200),
  phone: z.string().trim().max(30).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(1).max(200),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const staffCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(8).max(200),
  role: z.enum(["support", "manager", "super_admin"]),
});

export const staffUpdateSchema = z.object({
  id: z.number().int().positive(),
  role: z.enum(["support", "manager", "super_admin"]).optional(),
  isActive: z.boolean().optional(),
});

export type StaffCreateInput = z.infer<typeof staffCreateSchema>;
export type StaffUpdateInput = z.infer<typeof staffUpdateSchema>;
