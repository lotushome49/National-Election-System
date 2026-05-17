import { Router } from 'express';
import { notificationController } from './notification.controller';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { sendNotificationSchema, broadcastSchema, notificationQuerySchema } from './notification.schema';

const router = Router();

router.use(authenticate);

// Every authenticated user can read their own notifications
router.get('/',        validate(notificationQuerySchema, 'query'), notificationController.list);
router.patch('/:id/read', notificationController.markRead);

// Admin-only: send targeted or broadcast notifications
router.post('/send',      requirePermission('MANAGE_USERS'), validate(sendNotificationSchema), notificationController.send);
router.post('/broadcast', requirePermission('MANAGE_USERS'), validate(broadcastSchema), notificationController.broadcast);

export default router;
