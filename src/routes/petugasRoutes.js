const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');

// Apply authentication and petugas/admin authorization to all routes
router.use(authenticate);
router.use(authorize(['admin', 'petugas']));

// Import controllers (will be created)
const petugasEventController = require('../controllers/petugas/eventController');
const petugasDonorController = require('../controllers/petugas/donorController');

// Event Access Routes
router.get('/my-events', petugasEventController.getMyEvents);
router.get('/events/:id', petugasEventController.getEventById);

// Donor Registration & Examination Routes
router.post('/events/:eventId/donors', petugasDonorController.createDonorWithExamination);
router.get('/events/:eventId/donors', petugasDonorController.getDonorsByEvent);
router.get('/events/:eventId/donors/:donorId', petugasDonorController.getDonorById);
router.put('/events/:eventId/donors/:donorId', petugasDonorController.updateDonorWithExamination);

// Donor Evaluation Results Routes
router.get('/events/:eventId/results', petugasDonorController.getEventResults);
router.get('/events/:eventId/donors/:donorId/results', petugasDonorController.getDonorResults);

// Report Routes with Pagination
router.get('/reports/:eventId', petugasDonorController.getEventReportPaginated);

module.exports = router;
