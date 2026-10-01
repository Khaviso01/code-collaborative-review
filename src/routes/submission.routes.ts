import { Router } from 'express';
import {
  createSubmission,
  getSubmission,
  updateSubmissionStatus,
  deleteSubmission,
} from '../controllers/submission.controller';
import { createComment, listComments } from '../controllers/comment.controller';
import { approveSubmission, requestChanges, getReviewHistory } from '../controllers/review.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createSubmissionSchema,
  updateStatusSchema,
  createCommentSchema,
  reviewDecisionSchema,
} from '../utils/schemas';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate);

// Sprint 4: submissions
router.post('/', validate(createSubmissionSchema), asyncHandler(createSubmission));
router.get('/:id', asyncHandler(getSubmission));
router.patch('/:id/status', validate(updateStatusSchema), asyncHandler(updateSubmissionStatus));
router.delete('/:id', asyncHandler(deleteSubmission));

// Sprint 5: comments, nested under a submission
router.post('/:id/comments', validate(createCommentSchema), asyncHandler(createComment));
router.get('/:id/comments', asyncHandler(listComments));

// Sprint 6: review workflow, nested under a submission
router.post('/:id/approve', validate(reviewDecisionSchema), asyncHandler(approveSubmission));
router.post('/:id/request-changes', validate(reviewDecisionSchema), asyncHandler(requestChanges));
router.get('/:id/reviews', asyncHandler(getReviewHistory));

export default router;
