import { z } from 'zod';

export const sendNotificationSchema = z.object({
  userId:  z.string().uuid(),
  type:    z.enum(['EMAIL', 'SMS', 'IN_APP', 'PUSH']),
  subject: z.string().min(1).max(255).trim(),
  body:    z.string().min(1).max(5000).trim(),
  metadata: z.record(z.unknown()).optional(),
});

export const broadcastSchema = z.object({
  roleCode: z.string().optional(),
  type:     z.enum(['EMAIL', 'SMS', 'IN_APP', 'PUSH']),
  subject:  z.string().min(1).max(255).trim(),
  body:     z.string().min(1).max(5000).trim(),
  metadata: z.record(z.unknown()).optional(),
});

export const notificationQuerySchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ']).optional(),
  type:   z.enum(['EMAIL', 'SMS', 'IN_APP', 'PUSH']).optional(),
});

export type SendNotificationDto = z.infer<typeof sendNotificationSchema>;
export type BroadcastDto        = z.infer<typeof broadcastSchema>;
export type NotificationQuery   = z.infer<typeof notificationQuerySchema>;
