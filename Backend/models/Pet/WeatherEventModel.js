const mongoose = require("mongoose");

const HABITATS = ["plains", "mountain", "ocean", "river", "lake", "grassland", "sky"];
const WEATHER_TYPES = ["sunny", "cloudy", "rain", "storm", "snow", "fog", "windy", "heatwave"];

// Admin-scheduled weather for one pet habitat; used by evolution conditions.
const weatherEventSchema = new mongoose.Schema({
    habitat: { type: String, enum: HABITATS, required: true },
    weather: { type: String, enum: WEATHER_TYPES, required: true },
    temperature: { type: Number, default: 25 }, // °C, display only
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    note: { type: String, default: "" },
}, { timestamps: true });

weatherEventSchema.index({ habitat: 1, startAt: 1, endAt: 1 });

module.exports = mongoose.model("WeatherEvent", weatherEventSchema);
module.exports.HABITATS = HABITATS;
module.exports.WEATHER_TYPES = WEATHER_TYPES;
