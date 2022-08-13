const {Order} = require('../models/order');
const express = require('express');
const {OrderItem} = require("../models/order-item");
const mongoose = require("mongoose");
const {Product} = require("../models/product");
const stripe = require("stripe")('sk_test_51LU4jsLx1PQms9JgCnGiVy2DQjGBLgK1udgfesrmlIZ5RLsNwOlb435poHykqFu53N6opC3NU6Hxi3vnynJMqAao00NdgtloXU');
const router = express.Router();

router.get(`/`, async (req, res) =>{
    const orderList = await Order.find()
        .populate('user', 'name')
        .sort({'dateOrdered': -1})

    if(!orderList) {
        res.status(500).json({success: false})
    } 
    return res.send(orderList);
})

router.get(`/:id`, async (req, res) =>{
    const order = await Order.findById(req.params.id)
        .populate('user', 'name')
        .populate({
            path: 'orderItems', populate: {
                path: 'product', populate: 'category'
            }})

    if(!order) {
        return res.status(404).json({success: false})
    }

    return res.send(order);
})

router.post('/', async(req,res) => {
    const createOrderItem = async (orderItem) => {
        let newOrderItem = new OrderItem({
            ...orderItem
        });

        newOrderItem = await newOrderItem.save();

        return newOrderItem;
    }
    const countTotalPrice = async(orderItem) => {
        const orderItemWithProduct = await orderItem.populate('product', 'price');

        return orderItemWithProduct.product.price * orderItemWithProduct.quantity;
    }
    const orderItems = await Promise.all(req.body.orderItems.map(createOrderItem));
    const totalPrice = (await Promise.all(orderItems.map(countTotalPrice)))
        .reduce((a, b) => a + b, 0)
    const orderItemsIds = orderItems.map(orderItem => orderItem._id);
    let order = new Order({...req.body, orderItems: orderItemsIds, totalPrice});

    order = await order.save();

    if (!order) {
        return res.status(404).send('the order cannot be created');
    }

    return res.send(order);
})
router.post('/create-checkout-session', async (req, res) => {
    const orderItems = req.body;

    if (!orderItems) {
        return res.status(400).send('checkout session cannot be created - check the order items');
    }

    const lineItems = await Promise.all(
        orderItems.map(async (item) => {
            const product = await Product.findById(item.product);

            return (
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: product.name,
                        },
                        unit_amount: product.price * 100,
                    },
                    quantity: item.quantity,
                }
            )
        })
    );
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: 'http://localhost:4200/success',
        cancel_url: 'http://localhost:4200/error'
    });

   await res.json({id: session.id});
})

router.put('/:id', async(req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).send('Invalid Order Id');
    }

    try {
        const order = await Order.findByIdAndUpdate(req.params.id, {status: req.body.status}, {new: true})

        if (!order) {
            return res.status(404).send('order not found');
        }

        return res.send(order);
    } catch (e) {
        return res.status(500).json({success: false, error: e})
    }
})

router.delete('/:id', async(req,res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).send('Invalid Order Id');
    }

    try {
        const deletedOrder = await Order.findByIdAndRemove(req.params.id);

        if (deletedOrder) {
            await OrderItem.deleteMany({_id: {$in: deletedOrder.orderItems}})

            return res.status(200).json({success: true, message: 'the order is deleted'});
        } else {
            return res.status(404).json({success: false, message: 'order not found'})
        }
    } catch (e) {
        return res.status(500).json({success: false, error: e})
    }
})

router.get('/get/totalsales', async(req,res) => {
    const totalSales = await Order.aggregate([
        {
            $group: {_id: null, totalSales: {$sum: '$totalPrice'}}
        }
    ])

    if (!totalSales) {
        return res.status(404).send('The order sales cannot be generated')
    }

    return res.send({totalSales: totalSales.pop().totalSales});
})

router.get(`/get/count`, async(req,res) => {
    try {
        const orderCount = await Order.count();

        if (!orderCount) {
            return res.status(400).json({success: false});
        }

        return res.send({count: orderCount});
    } catch (e) {
        return res.status(500).json({error: e, success: false})
    }
})

router.get(`/get/userorders/:userid`, async (req, res) =>{
    const userOrderList = await Order.find({user: req.params.userid})
        .populate({
            path: 'orderItems', populate: {
                path: 'product', populate: 'category'
            }})
        .sort({'dateOrdered': -1})

    if(!userOrderList) {
        res.status(500).json({success: false})
    }

    return res.send(userOrderList);
})

module.exports =router;
