const ShopProduct = require('../models/ShopProductModel');
const UserProgress = require('../models/User/UserProgressModel');
const CoinTransaction = require('../models/User/CoinTransactionModel');
const mongoose = require('mongoose');

const mapProduct = (product) => ({
    _id: product._id,
    code: product.code,
    name: product.name,
    description: product.description,
    category: product.category,
    itemType: product.itemType,
    quantity: product.quantity,
    priceCoins: product.priceCoins,
    iconName: product.iconName,
    isActive: product.isActive,
    sortOrder: product.sortOrder
});

const ensureDefaultProducts = async () => {
    const count = await ShopProduct.countDocuments();
    if (count > 0) return;

    await ShopProduct.create([
        {
            code: 'small_potion_1',
            name: 'Small Potion',
            description: 'Restores 30% HP to your active pet.',
            category: 'consumable',
            itemType: 'small_potion',
            quantity: 1,
            priceCoins: 30,
            iconName: 'cross.case.fill',
            sortOrder: 10,
            isActive: true
        },
        {
            code: 'small_potion_5',
            name: 'Small Potion Pack',
            description: 'A pack of 5 small potions for longer pet sessions.',
            category: 'bundle',
            itemType: 'small_potion',
            quantity: 5,
            priceCoins: 125,
            iconName: 'shippingbox.fill',
            sortOrder: 20,
            isActive: true
        }
    ]);
};

exports.listProducts = async (req, res) => {
    try {
        await ensureDefaultProducts();
        const includeInactive = req.query.includeInactive === 'true';
        const query = includeInactive ? {} : { isActive: true };
        const products = await ShopProduct.find(query).sort({ sortOrder: 1, createdAt: -1 });
        res.status(200).json({ data: products.map(mapProduct) });
    } catch (error) {
        console.error('[Shop] list products error:', error);
        res.status(500).json({ message: 'Failed to fetch shop products.' });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const product = await ShopProduct.create(req.body);
        res.status(201).json({ data: mapProduct(product) });
    } catch (error) {
        console.error('[Shop] create product error:', error);
        res.status(400).json({ message: error.message || 'Failed to create shop product.' });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const product = await ShopProduct.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }
        res.status(200).json({ data: mapProduct(product) });
    } catch (error) {
        console.error('[Shop] update product error:', error);
        res.status(400).json({ message: error.message || 'Failed to update shop product.' });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const product = await ShopProduct.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }
        res.status(200).json({ message: 'Product deleted.' });
    } catch (error) {
        console.error('[Shop] delete product error:', error);
        res.status(500).json({ message: 'Failed to delete shop product.' });
    }
};

exports.purchaseProduct = async (req, res) => {
    try {
        const userId = req.userId;
        const { productId, quantity = 1 } = req.body;
        const parsedQuantity = Number.parseInt(quantity, 10);
        const purchaseQuantity = Number.isFinite(parsedQuantity) ? Math.max(1, parsedQuantity) : 1;
        const productQuery = [{ code: productId }];

        if (mongoose.Types.ObjectId.isValid(productId)) {
            productQuery.push({ _id: productId });
        }

        const product = await ShopProduct.findOne({
            $or: productQuery,
            isActive: true
        });

        if (!product) {
            return res.status(404).json({ message: 'Product not found or inactive.' });
        }

        let progress = await UserProgress.findOne({ userId });
        if (!progress) {
            progress = new UserProgress({ userId });
        }

        const totalPrice = product.priceCoins * purchaseQuantity;
        if ((progress.totalCoins || 0) < totalPrice) {
            return res.status(400).json({ message: 'Not enough coins.' });
        }

        progress.totalCoins -= totalPrice;
        const grantedQuantity = product.quantity * purchaseQuantity;

        switch (product.itemType) {
            case 'small_potion':
                progress.smallPotionCount = (progress.smallPotionCount || 0) + grantedQuantity;
                break;
            default:
                return res.status(400).json({ message: 'This product type is not supported yet.' });
        }

        await progress.save();

        await CoinTransaction.create({
            userId,
            amount: -totalPrice,
            type: 'SPEND',
            source: 'pet_shop',
            description: `Purchased ${product.name} x${purchaseQuantity}`,
            balanceAfter: progress.totalCoins
        });

        res.status(200).json({
            message: 'Purchase completed.',
            data: {
                product: mapProduct(product),
                purchasedQuantity: purchaseQuantity,
                grantedQuantity,
                totalCoins: progress.totalCoins,
                smallPotionCount: progress.smallPotionCount
            }
        });
    } catch (error) {
        console.error('[Shop] purchase error:', error);
        res.status(500).json({ message: 'Failed to purchase product.' });
    }
};
