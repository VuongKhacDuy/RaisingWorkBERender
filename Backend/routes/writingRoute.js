const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/writingController');
const authenticate = require('../middleware/authenticate');

// ── CMS routes ──────────────────────────────────────────────────────────────
router.get('/cms/prompts', ctrl.listPrompts);
router.post('/cms/prompts', ctrl.createPrompt);
router.put('/cms/prompts/:id', ctrl.updatePrompt);
router.delete('/cms/prompts/:id', ctrl.deletePrompt);

router.get('/cms/rounds', ctrl.listRounds);
router.post('/cms/rounds', ctrl.createRound);
router.put('/cms/rounds/:id', ctrl.updateRound);
router.delete('/cms/rounds/:id', ctrl.deleteRound);
router.get('/cms/rounds/:id/submissions', ctrl.listRoundSubmissions);
router.post('/cms/rounds/:id/publish', ctrl.publishRound);

router.get('/cms/submissions/:id', ctrl.getSubmission);
router.put('/cms/submissions/:id/review', ctrl.saveReview);
router.post('/cms/submissions/:id/send', ctrl.sendReview);

// ── iOS routes (auth required) ──────────────────────────────────────────────
router.get('/ios/home', authenticate, ctrl.getHomeForIOS);
router.get('/ios/rounds/:id', authenticate, ctrl.getRoundForIOS);
router.post('/ios/rounds/:id/submit', authenticate, ctrl.submitForIOS);
router.get('/ios/rounds/:id/ranking', authenticate, ctrl.getRankingForIOS);
router.get('/ios/submissions', authenticate, ctrl.listMySubmissionsForIOS);
router.post('/ios/submissions/:id/ack-result', authenticate, ctrl.ackResultForIOS);

module.exports = router;
