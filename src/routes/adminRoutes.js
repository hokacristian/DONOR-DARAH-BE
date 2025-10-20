const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authorize');
const authorize = require('../middlewares/authorize');

// Apply authentication and admin authorization to all routes
router.use(require('../middlewares/authenticate'));
router.use(authorize(['admin']));

// Import controllers (will be created)
const petugasController = require('../controllers/admin/petugasController');
const criteriaController = require('../controllers/admin/criteriaController');
const eventController = require('../controllers/admin/eventController');
const reportController = require('../controllers/admin/reportController');

// Petugas Management Routes
router.get('/petugas', petugasController.getAllPetugas);
router.get('/petugas/:id', petugasController.getPetugasById);
router.put('/petugas/:id', petugasController.updatePetugas);
router.delete('/petugas/:id', petugasController.deletePetugas);

// Criteria Management Routes
router.get('/criteria', criteriaController.getAllCriteria);
router.get('/criteria/:id', criteriaController.getCriteriaById);
router.post('/criteria', criteriaController.createCriteria);
router.put('/criteria/:id', criteriaController.updateCriteria);
router.delete('/criteria/:id', criteriaController.deleteCriteria);

// Sub Criteria Management Routes
router.get('/sub-criteria', criteriaController.getAllSubCriteria);
router.post('/sub-criteria', criteriaController.createSubCriteria);
router.put('/sub-criteria/:id', criteriaController.updateSubCriteria);
router.delete('/sub-criteria/:id', criteriaController.deleteSubCriteria);

// Event Management Routes
router.get('/events', eventController.getAllEvents);
router.get('/events/:id', eventController.getEventById);
router.post('/events', eventController.createEventValidation, eventController.createEvent);
router.put('/events/:id', eventController.updateEventValidation, eventController.updateEvent);
router.delete('/events/:id', eventController.deleteEvent);
router.patch('/events/:id/status', eventController.updateEventStatus);

// Event Officer Assignment Routes
router.get('/events/:id/officers', eventController.getEventOfficers);
router.post('/events/:id/officers', eventController.assignOfficer);
router.delete('/events/:eventId/officers/:officerId', eventController.removeOfficer);

// System Settings Routes
router.get('/settings', reportController.getAllSettings);
router.put('/settings/:key', reportController.updateSetting);

// Reports & Analytics Routes
router.get('/reports', reportController.getAllReports);
router.get('/reports/:eventId', reportController.getEventReport);
router.get('/dashboard/statistics', reportController.getDashboardStatistics);

module.exports = router;
