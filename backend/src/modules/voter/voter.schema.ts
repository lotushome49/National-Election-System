import { z } from 'zod';

export const registerVoterSchema = z.object({
  fullName:        z.string().min(2).max(255).trim(),
  nationalId:      z.string().min(5).max(50).trim(),
  dateOfBirth:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  gender:          z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  phone:           z.string().max(20).optional(),
  email:           z.string().email().optional(),
  address:         z.string().max(500).optional(),
  regionId:        z.string().uuid().optional(),
  districtId:      z.string().uuid().optional(),
  pollingStationId:z.string().uuid().optional(),
  biometricHash:   z.string().min(10, 'Biometric data required'),
});

export const updateVoterSchema = z.object({
  phone:           z.string().max(20).optional(),
  email:           z.string().email().optional(),
  address:         z.string().max(500).optional(),
  pollingStationId:z.string().uuid().optional(),
  isVerified:      z.boolean().optional(),
});

export const voterQuerySchema = z.object({
  page:             z.coerce.number().int().min(1).default(1),
  limit:            z.coerce.number().int().min(1).max(100).default(20),
  regionId:         z.string().uuid().optional(),
  districtId:       z.string().uuid().optional(),
  pollingStationId: z.string().uuid().optional(),
  isVerified:       z.coerce.boolean().optional(),
  search:           z.string().max(100).optional(),
});

export type RegisterVoterDto = z.infer<typeof registerVoterSchema>;
export type UpdateVoterDto   = z.infer<typeof updateVoterSchema>;
export type VoterQuery       = z.infer<typeof voterQuerySchema>;
