const express = require('express');
const router = express.Router();
const {Product} = require('../models/product');
const {Category} = require("../models/category");
const mongoose = require('mongoose');
const multer = require('multer');

const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg',
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isValidFile = FILE_TYPE_MAP[file.mimetype];
        let uploadError = new Error('invalid image type');

        if (isValidFile) {
            uploadError = null;
        }

        cb(uploadError, 'public/uploads')
    },
    filename: function (req, file, cb) {
        const fileName = file.originalname.split(' ').join('-');
        const extension = FILE_TYPE_MAP[file.mimetype];

        cb(null, `${fileName}-${Date.now()}.${extension}`)
    }
})

const uploadOptions = multer({ storage: storage })

router.get(`/`, async(req,res) => {
    try {
        const productIds = req.query.productsId || [];
        let filter = productIds.length ? {_id: {$in: productIds.split(',')}} : {};

        if (req.query.categories) {
            filter = {category: req.query.categories.split(',')};
        }

        const productList = await Product.find(filter).populate('category');

        if (!productList) {
            return res.status(400).json({success: false});
        }

        return res.json(productList);
    } catch (e) {
        return res.status(500).json({error: e, success: false})
    }
})

router.get(`/:id`, async(req,res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).send('Invalid Product Id');
    }

    try {
        const product = await Product.findById(req.params.id).populate('category')

        if (!product) {
            return res.status(500).json({success: false});
        }

        return res.json(product);
    } catch (e) {
        return res.status(500).json({error: e, success: false})
    }
})

router.post(`/`, uploadOptions.single('image'), async(req,res) => {
    try {
        const category = await Category.findById(req.body.category);

        if (!category) {
            return res.status(400).send('Invalid Category');
        }

        const file = req.file;

        if (!file) {
            return res.status(404).send('No image in the request')
        }

        const fileName = req.file.filename;
        const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
        const product = new Product({
            ...req.body,
            image: `${basePath}${fileName}`
        });

        const createdProduct = await product.save();

        if (!createdProduct) {
            return res.status(400).send('The product cannot be created');
        }

        return res.status(200).send(createdProduct);
    } catch (e) {
        return res.status(500).json({error: e, success: false})
    }
})

router.put('/:id', uploadOptions.single('image'), async(req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
       return res.status(400).send('Invalid Product Id');
    }

    try {
        const category = await Category.findById(req.body.category);

        if (!category) {
            return res.status(400).send('Invalid Category');
        }

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).send('product not found');
        }

        const file = req.file;
        let imagePath;

        if (file) {
            const fileName = req.file.filename;
            const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;

            imagePath = `${basePath}${fileName}`;
        } else {
            imagePath = product.image;
        }

        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, {...req.body, image: imagePath}, {new: true})

        return res.send(updatedProduct);
    } catch (e) {
        return res.status(500).json({success: false, error: e})
    }
})

router.delete('/:id', async(req,res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).send('Invalid Product Id');
    }

    try {
        const deletedProduct = await Product.findByIdAndRemove(req.params.id);

        if (deletedProduct) {
            return res.status(200).json({success: true, message: 'the category is deleted'});
        } else {
            return res.status(404).json({success: false, message: 'category not found'})
        }
    } catch (e) {
        return res.status(500).json({success: false, error: e})
    }
})

router.get(`/get/count`, async(req,res) => {
    try {
        const productCount = await Product.count();

        if (!productCount) {
            return res.status(400).json({success: false});
        }

        return res.send({count: productCount});
    } catch (e) {
        return res.status(500).json({error: e, success: false})
    }
})

router.get(`/get/featured/:count`, async(req,res) => {
    try {
        const count = req.params.count ?? 0;
        const featureProducts = await Product.find({isFeatured: true}).limit(+count);

        if (!featureProducts) {
            return res.status(400).json({success: false});
        }

        return res.send(featureProducts);
    } catch (e) {
        return res.status(500).json({error: e, success: false})
    }
})

router.put('/gallery-images/:id', uploadOptions.array('images', 10), async(req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).send('Invalid Product Id');
        }

        const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
        const files = req.files;
        let imagesPaths = [];

        if (files) {
            files.map(file => {
                imagesPaths.push(`${basePath}${file.filename}`)
            })
        }


        const product = await Product.findByIdAndUpdate(req.params.id, {images: imagesPaths}, {new: true});

        if (!product) {
            return res.status(404).send('category not found');
        }

        return res.send(product);
    } catch (e) {
        throw e;
    }
})

module.exports = router;
