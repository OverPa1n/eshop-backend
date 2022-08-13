const {User} = require('../models/user');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const mongoose = require("mongoose");
const jwt = require('jsonwebtoken');
const {Product} = require("../models/product");

router.get(`/`, async (req, res) =>{
    const userList = await User.find().select('-passwordHash');

    if(!userList) {
        return res.status(404).json({success: false})
    };

    return res.send(userList);
})

router.get(`/:id`, async (req, res) =>{
    const user = await User.findById(req.params.id).select('-passwordHash');

    if(!user) {
        return res.status(404).json({success: false})
    };

    return res.send(user);
})

router.post('/', async(req,res) => {
    const password = bcrypt.hashSync(req.body.password, 10);
    let user = new User({...req.body, passwordHash: password});

    user = await user.save();

    if (!user) {
        return res.status(404).send('the user cannot be created');
    }

    return res.send(user);
})

router.put('/:id', async(req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).send('Invalid User Id');
    }

    let password;
    const userExist = await User.findById(req.params.id);

    if (req.body.password) {
        password = bcrypt.hashSync(req.body.password, 10);
    } else {
        password = userExist.passwordHash;
    }

    try {
        const user = await User.findByIdAndUpdate(req.params.id, {...req.body, passwordHash: password}, {new: true})

        if (!user) {
            return res.status(404).send('user not found');
        }

        return res.send(user);
    } catch (e) {
        return res.status(500).json({success: false, error: e})
    }
})

router.post('/login', async (req, res) => {
    const user = await User.findOne({email: req.body.email});

    if (!user) {
        return res.status(404).send('The user not found');
    }

    if (bcrypt.compareSync(req.body.password, user.passwordHash)) {
        const token = jwt.sign(
            {
                userId: user.id,
                isAdmin: user.isAdmin
            },
            process.env.SECRET,
            {
                expiresIn: '1d'
            }
        )

       return res.status(200).send({email: user.email, token});
    } else {
        return res.status(400).send('password is wrong');
    }
})

router.get(`/get/count`, async(req,res) => {
    try {
        const usersCount = await User.count();

        if (!usersCount) {
            return res.status(400).json({success: false});
        }

        return res.send({count: usersCount});
    } catch (e) {
        return res.status(500).json({error: e, success: false})
    }
})

router.delete('/:id', async(req,res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).send('Invalid User Id');
    }

    try {
        const deletedUser = await User.findByIdAndRemove(req.params.id);

        if (deletedUser) {
            return res.status(200).json({success: true, message: 'the user is deleted'});
        } else {
            return res.status(404).json({success: false, message: 'user not found'})
        }
    } catch (e) {
        return res.status(500).json({success: false, error: e})
    }
})

module.exports =router;
