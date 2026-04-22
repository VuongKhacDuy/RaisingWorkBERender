const UserPet = require("../models/Pet/UserPetModel");
const PetTemplate = require("../models/Pet/PetTemplateModel");

// ──────────────────────────────────────────────────────────────
// Helper: tính chỉ số dựa trên base + level
// Formula đơn giản: stat = base + (base * 0.1 * (level - 1))
// ──────────────────────────────────────────────────────────────
const calcStat = (base, level) => Math.round(base + base * 0.1 * (level - 1));

// XP cần để level up lên level tiếp theo
const xpRequiredForLevelUp = (level) => Math.floor(100 * Math.pow(level, 1.5));

// ──────────────────────────────────────────────────────────────
// POST /api/pets/my/catch — Bắt pet
// Body: { petTemplateId }
// ──────────────────────────────────────────────────────────────
const catchPet = async (req, res) => {
    try {
        const { petTemplateId } = req.body;
        if (!petTemplateId) {
            return res.status(400).json({ message: "Thiếu petTemplateId." });
        }

        const template = await PetTemplate.findById(petTemplateId);
        if (!template) {
            return res.status(404).json({ message: "Không tìm thấy pet template." });
        }

        // Kiểm tra tỉ lệ bắt (catchRate)
        if (Math.random() > template.catchRate) {
            return res.status(200).json({ success: false, message: "Pet đã thoát! Thử lại sau." });
        }

        const level = 1;
        const newPet = new UserPet({
            userId: req.userId,
            petTemplateId: template._id,
            level,
            xp: 0,
            hp: calcStat(template.baseHp, level),
            mana: calcStat(template.baseMana, level),
            power: calcStat(template.basePower, level),
        });

        await newPet.save();

        // Populate thông tin template để trả về đầy đủ
        const populated = await UserPet.findById(newPet._id).populate("petTemplateId");
        res.status(201).json({ success: true, message: `Bắt được ${template.name}!`, data: populated });
    } catch (err) {
        console.error("catchPet error:", err);
        res.status(500).json({ message: "Lỗi server khi bắt pet." });
    }
};

// ──────────────────────────────────────────────────────────────
// GET /api/pets/my — Lấy toàn bộ pet của user
// Optional query: ?isActive=true
// ──────────────────────────────────────────────────────────────
const getMyPets = async (req, res) => {
    try {
        const filter = { userId: req.userId };
        if (req.query.isActive !== undefined) {
            filter.isActive = req.query.isActive === "true";
        }

        const pets = await UserPet.find(filter)
            .populate("petTemplateId")
            .sort({ level: -1, caughtAt: -1 });

        res.status(200).json({ data: pets, total: pets.length });
    } catch (err) {
        console.error("getMyPets error:", err);
        res.status(500).json({ message: "Lỗi server khi lấy danh sách pet." });
    }
};

// ──────────────────────────────────────────────────────────────
// GET /api/pets/my/:id — Lấy 1 pet theo ID (phải là của user)
// ──────────────────────────────────────────────────────────────
const getMyPetById = async (req, res) => {
    try {
        const pet = await UserPet.findOne({ _id: req.params.id, userId: req.userId })
            .populate("petTemplateId");

        if (!pet) return res.status(404).json({ message: "Không tìm thấy pet." });
        res.status(200).json({ data: pet });
    } catch (err) {
        console.error("getMyPetById error:", err);
        res.status(500).json({ message: "Lỗi server." });
    }
};

// ──────────────────────────────────────────────────────────────
// POST /api/pets/my/:id/addxp — Cộng XP cho pet
// Body: { xp: Number }
// ──────────────────────────────────────────────────────────────
const addXpToPet = async (req, res) => {
    try {
        const { xp } = req.body;
        if (!xp || xp <= 0) return res.status(400).json({ message: "XP phải lớn hơn 0." });

        const pet = await UserPet.findOne({ _id: req.params.id, userId: req.userId })
            .populate("petTemplateId");
        if (!pet) return res.status(404).json({ message: "Không tìm thấy pet." });

        pet.xp += xp;
        await pet.save();
        res.status(200).json({
            message: `Cộng ${xp} XP thành công.`,
            data: pet,
            xpToNextLevel: xpRequiredForLevelUp(pet.level),
        });
    } catch (err) {
        console.error("addXpToPet error:", err);
        res.status(500).json({ message: "Lỗi server khi cộng XP." });
    }
};

// ──────────────────────────────────────────────────────────────
// POST /api/pets/my/:id/levelup — Tăng cấp pet (dùng XP tích lũy)
// ──────────────────────────────────────────────────────────────
const levelUpPet = async (req, res) => {
    try {
        const pet = await UserPet.findOne({ _id: req.params.id, userId: req.userId })
            .populate("petTemplateId");
        if (!pet) return res.status(404).json({ message: "Không tìm thấy pet." });

        const template = pet.petTemplateId;
        if (pet.level >= template.maxLevel) {
            return res.status(400).json({ message: `Pet đã đạt cấp tối đa (${template.maxLevel}).` });
        }

        const required = xpRequiredForLevelUp(pet.level);
        if (pet.xp < required) {
            return res.status(400).json({
                message: `Không đủ XP. Cần ${required} XP, hiện có ${pet.xp} XP.`,
                xpRequired: required,
                xpCurrent: pet.xp,
            });
        }

        pet.xp -= required;
        pet.level += 1;
        pet.hp = calcStat(template.baseHp, pet.level);
        pet.mana = calcStat(template.baseMana, pet.level);
        pet.power = calcStat(template.basePower, pet.level);

        await pet.save();
        res.status(200).json({
            message: `${template.name} đã lên cấp ${pet.level}!`,
            data: pet,
            xpToNextLevel: pet.level < template.maxLevel ? xpRequiredForLevelUp(pet.level) : null,
        });
    } catch (err) {
        console.error("levelUpPet error:", err);
        res.status(500).json({ message: "Lỗi server khi tăng cấp pet." });
    }
};

// ──────────────────────────────────────────────────────────────
// PATCH /api/pets/my/:id/nickname — Đặt biệt danh
// Body: { nickname: String }
// ──────────────────────────────────────────────────────────────
const setNickname = async (req, res) => {
    try {
        const { nickname } = req.body;
        if (nickname === undefined) return res.status(400).json({ message: "Thiếu nickname." });

        const pet = await UserPet.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { $set: { nickname: nickname.trim() } },
            { new: true }
        ).populate("petTemplateId");

        if (!pet) return res.status(404).json({ message: "Không tìm thấy pet." });
        res.status(200).json({ message: "Đặt biệt danh thành công.", data: pet });
    } catch (err) {
        console.error("setNickname error:", err);
        res.status(500).json({ message: "Lỗi server khi đặt biệt danh." });
    }
};

// ──────────────────────────────────────────────────────────────
// DELETE /api/pets/my/:id — Thả pet (xoá khỏi collection của user)
// ──────────────────────────────────────────────────────────────
const releasePet = async (req, res) => {
    try {
        const pet = await UserPet.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!pet) return res.status(404).json({ message: "Không tìm thấy pet." });
        res.status(200).json({ message: "Đã thả pet.", data: pet });
    } catch (err) {
        console.error("releasePet error:", err);
        res.status(500).json({ message: "Lỗi server khi thả pet." });
    }
};

const syncPets = async (req, res) => {
    try {
        const { pets } = req.body;
        if (!pets || !Array.isArray(pets)) {
            return res.status(400).json({ message: "Dữ liệu pet không hợp lệ (cần mảng)." });
        }

        const userId = req.userId;
        const results = [];

        for (const petData of pets) {
            const {
                instanceId,
                mascotId,
                level,
                xp,
                hp,
                maxHp,
                mana,
                maxMana,
                power,
                defense,
                speed,
                isActive,
                nickname
            } = petData;

            // Tìm template id từ mascotId
            // iOS có thể gửi _id dạng string hoặc tên tùy vào phiên bản
            let template = await PetTemplate.findById(mascotId);
            if (!template) {
                // Fallback tìm theo field name nếu mascotId là tên
                template = await PetTemplate.findOne({ name: mascotId });
            }
            if (!template) continue;

            // Tìm instanceId tồn tại (Dùng instanceId làm key chính để đồng bộ)
            let userPet = await UserPet.findOne({ userId, instanceId });

            if (userPet) {
                // Update
                userPet.petTemplateId = template._id; // Cập nhật lại template nếu cần
                userPet.level = level || userPet.level;
                userPet.xp = xp !== undefined ? xp : userPet.xp;
                userPet.hp = hp !== undefined ? hp : userPet.hp;
                userPet.maxHp = maxHp !== undefined ? maxHp : userPet.maxHp;
                userPet.mana = mana !== undefined ? mana : userPet.mana;
                userPet.maxMana = maxMana !== undefined ? maxMana : userPet.maxMana;
                userPet.power = power !== undefined ? power : userPet.power;
                userPet.defense = defense !== undefined ? defense : userPet.defense;
                userPet.speed = speed !== undefined ? speed : userPet.speed;
                userPet.baseHp = petData.baseHp !== undefined ? petData.baseHp : userPet.baseHp;
                userPet.baseMana = petData.baseMana !== undefined ? petData.baseMana : userPet.baseMana;
                userPet.basePower = petData.basePower !== undefined ? petData.basePower : userPet.basePower;
                userPet.baseDefense = petData.baseDefense !== undefined ? petData.baseDefense : userPet.baseDefense;
                userPet.baseSpeed = petData.baseSpeed !== undefined ? petData.baseSpeed : userPet.baseSpeed;
                userPet.isActive = isActive !== undefined ? isActive : userPet.isActive;
                userPet.nickname = nickname || userPet.nickname;
                await userPet.save();
            } else {
                // Create
                userPet = new UserPet({
                    userId,
                    instanceId, // Lưu instanceId từ App
                    petTemplateId: template._id,
                    level: level || 1,
                    xp: xp || 0,
                    hp: hp || template.baseHp,
                    maxHp: maxHp || template.baseHp,
                    mana: mana || template.baseMana,
                    maxMana: maxMana || template.baseMana,
                    power: power || template.basePower,
                    defense: defense || 10,
                    speed: speed || 10,
                    baseHp: petData.baseHp || hp || template.baseHp,
                    baseMana: petData.baseMana || mana || template.baseMana,
                    basePower: petData.basePower || power || template.basePower,
                    baseDefense: petData.baseDefense || defense || 10,
                    baseSpeed: petData.baseSpeed || speed || 10,
                    isActive: isActive || false,
                    nickname: nickname || ''
                });
                await userPet.save();
            }
            results.push(userPet);
        }

        res.status(200).json({ success: true, message: "Đã đồng bộ danh sách pet.", count: results.length });
    } catch (err) {
        console.error("syncPets error:", err);
        res.status(500).json({ message: "Lỗi server khi đồng bộ pet." });
    }
};

module.exports = {
    catchPet,
    getMyPets,
    getMyPetById,
    addXpToPet,
    levelUpPet,
    setNickname,
    releasePet,
    syncPets
};
