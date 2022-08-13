module.exports = (err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
        // jwt error
        return res.status(401).json({message: 'The user is not authorized'});
    }

    if (err.name === 'ValidationError') {
        // validation error
        return res.status(401).json({message: err});
    }

    console.log(req, err);

    // internal server error
    return res.status(500).json({message: err})
}
