const express = require("express");
const router = express.Router();
const {
    getCurrentWeather,
    listEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    randomizeSchedule,
} = require("../controllers/weatherController");

// App: weather right now per habitat (evolution conditions)
router.get("/current", getCurrentWeather);

// CMS: schedule management
router.get("/events", listEvents);
router.post("/events", createEvent);
router.put("/events/:id", updateEvent);
router.delete("/events/:id", deleteEvent);
router.post("/random", randomizeSchedule);

module.exports = router;
