const {Category} = require('../models/category');
const express = require('express');
const mongoose = require("mongoose");
const router = express.Router();

router.get(`/`, async (req, res) =>{
    const categoryList = await Category.find();

    if(!categoryList) {
        res.status(404).json({success: false})
    } 
    return res.send(categoryList);
})

router.get('/:id', async(req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).send('Invalid Category Id');
    }

    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({message: 'The category with the given ID was not found'})
        }

        return res.status(200).send(category);
    } catch (e) {
        return res.status(500).json({success: false, error: e})
    }
})

router.post('/', async(req,res) => {
    let category = new Category({...req.body});

    category = await category.save();

    if (!category) {
        return res.status(404).send('the category cannot be created');
    }

    return res.send(category);
})

router.put('/:id', async(req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).send('Invalid Category Id');
    }

    try {
        const category = await Category.findByIdAndUpdate(req.params.id, {...req.body}, {new: true})

        if (!category) {
            return res.status(404).send('category not found');
        }

        return res.send(category);
    } catch (e) {
        return res.status(500).json({success: false, error: e})
    }
})

router.delete('/:id', async(req,res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).send('Invalid Category Id');
    }

    try {
        const deletedCategory = await Category.findByIdAndRemove(req.params.id);

        if (deletedCategory) {
            return res.status(200).json({success: true, message: 'the category is deleted'});
        } else {
            return res.status(404).json({success: false, message: 'category not found'})
        }
    } catch (e) {
        return res.status(500).json({success: false, error: e})
    }
})

module.exports =router;
