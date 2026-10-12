const WeatherEvent = require("../models/Pet/WeatherEventModel");
const { HABITATS, WEATHER_TYPES } = WeatherEvent;

// Weather of a habitat when no event is running
const DEFAULT_WEATHER = {
    plains: { weather: "sunny", temperature: 26 },
    mountain: { weather: "cloudy", temperature: 12 },
    ocean: { weather: "sunny", temperature: 28 },
    river: { weather: "cloudy", temperature: 22 },
    lake: { weather: "fog", temperature: 18 },
    grassland: { weather: "sunny", temperature: 27 },
    sky: { weather: "windy", temperature: 8 },
};

// Weather each habitat can roll in "Random", with a temperature range per weather
const RANDOM_POOL = {
    plains: ["sunny", "cloudy", "rain", "storm", "windy", "heatwave"],
    mountain: ["cloudy", "snow", "fog", "windy", "storm", "sunny"],
    ocean: ["sunny", "cloudy", "rain", "storm", "windy", "heatwave"],
    river: ["sunny", "cloudy", "rain", "fog", "storm"],
    lake: ["fog", "cloudy", "sunny", "rain", "snow"],
    grassland: ["sunny", "cloudy", "rain", "windy", "heatwave"],
    sky: ["windy", "cloudy", "storm", "sunny", "snow"],
};
const TEMPERATURE = {
    sunny: [22, 32], cloudy: [15, 25], rain: [14, 24], storm: [12, 22],
    snow: [-10, 2], fog: [6, 16], windy: [5, 18], heatwave: [35, 42],
};

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (list) => list[Math.floor(Math.random() * list.length)];

const validate = (body) => {
    if (body.habitat !== undefined && !HABITATS.includes(body.habitat)) return "Khu vực không hợp lệ.";
    if (body.weather !== undefined && !WEATHER_TYPES.includes(body.weather)) return "Thời tiết không hợp lệ.";
    if (body.startAt && body.endAt && new Date(body.endAt) <= new Date(body.startAt)) return "Thời gian kết thúc phải sau thời gian bắt đầu.";
    return null;
};

// GET /api/weather/current — weather right now for every habitat (event or default)
const getCurrentWeather = async (req, res) => {
    try {
        const now = new Date();
        const active = await WeatherEvent.find({ startAt: { $lte: now }, endAt: { $gt: now } }).sort({ startAt: -1 }).lean();
        const data = HABITATS.map((habitat) => {
            const event = active.find((e) => e.habitat === habitat);
            return event
                ? { habitat, weather: event.weather, temperature: event.temperature, endAt: event.endAt, isDefault: false }
                : { habitat, ...DEFAULT_WEATHER[habitat], endAt: null, isDefault: true };
        });
        res.status(200).json({ data, serverTime: now });
    } catch (err) {
        console.error("getCurrentWeather error:", err);
        res.status(500).json({ message: "Lỗi server khi lấy thời tiết." });
    }
};

// GET /api/weather/events?from=&to= — schedule for the CMS table
const listEvents = async (req, res) => {
    try {
        const filter = {};
        if (req.query.from) filter.endAt = { $gt: new Date(req.query.from) };
        if (req.query.to) filter.startAt = { $lt: new Date(req.query.to) };
        const events = await WeatherEvent.find(filter).sort({ startAt: 1, habitat: 1 }).lean();
        res.status(200).json({ data: events, defaults: DEFAULT_WEATHER, habitats: HABITATS, weatherTypes: WEATHER_TYPES });
    } catch (err) {
        console.error("listEvents error:", err);
        res.status(500).json({ message: "Lỗi server khi lấy lịch thời tiết." });
    }
};

const createEvent = async (req, res) => {
    try {
        const error = validate(req.body);
        if (error) return res.status(400).json({ message: error });
        const event = await WeatherEvent.create(req.body);
        res.status(201).json({ data: event });
    } catch (err) {
        console.error("createEvent error:", err);
        res.status(500).json({ message: "Lỗi server khi tạo thời tiết." });
    }
};

const updateEvent = async (req, res) => {
    try {
        const current = await WeatherEvent.findById(req.params.id);
        if (!current) return res.status(404).json({ message: "Không tìm thấy lịch thời tiết." });
        const error = validate({ startAt: current.startAt, endAt: current.endAt, ...req.body });
        if (error) return res.status(400).json({ message: error });
        Object.assign(current, req.body);
        await current.save();
        res.status(200).json({ data: current });
    } catch (err) {
        console.error("updateEvent error:", err);
        res.status(500).json({ message: "Lỗi server khi sửa thời tiết." });
    }
};

const deleteEvent = async (req, res) => {
    try {
        const deleted = await WeatherEvent.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Không tìm thấy lịch thời tiết." });
        res.status(200).json({ data: deleted });
    } catch (err) {
        console.error("deleteEvent error:", err);
        res.status(500).json({ message: "Lỗi server khi xoá thời tiết." });
    }
};

// POST /api/weather/random { days = 7, habitats?, replace = true }
// Fills the next N days with back-to-back random blocks (6–24h) per habitat.
const randomizeSchedule = async (req, res) => {
    try {
        const days = Math.min(30, Math.max(1, Number(req.body.days) || 7));
        const habitats = Array.isArray(req.body.habitats) && req.body.habitats.length
            ? req.body.habitats.filter((h) => HABITATS.includes(h))
            : HABITATS;
        const start = new Date();
        start.setMinutes(0, 0, 0);
        const end = new Date(start.getTime() + days * 24 * 3600 * 1000);

        // Replace upcoming events of those habitats so the new schedule doesn't overlap the old one
        if (req.body.replace !== false) {
            await WeatherEvent.deleteMany({ habitat: { $in: habitats }, endAt: { $gt: start } });
        }

        const events = [];
        for (const habitat of habitats) {
            let cursor = new Date(start);
            while (cursor < end) {
                const blockEnd = new Date(Math.min(end.getTime(), cursor.getTime() + randInt(6, 24) * 3600 * 1000));
                const weather = pick(RANDOM_POOL[habitat]);
                const [tMin, tMax] = TEMPERATURE[weather];
                events.push({ habitat, weather, temperature: randInt(tMin, tMax), startAt: cursor, endAt: blockEnd, note: "random" });
                cursor = blockEnd;
            }
        }
        const created = await WeatherEvent.insertMany(events);
        res.status(201).json({ data: created, total: created.length });
    } catch (err) {
        console.error("randomizeSchedule error:", err);
        res.status(500).json({ message: "Lỗi server khi tạo thời tiết ngẫu nhiên." });
    }
};

module.exports = { getCurrentWeather, listEvents, createEvent, updateEvent, deleteEvent, randomizeSchedule };
