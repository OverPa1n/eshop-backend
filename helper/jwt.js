const {expressjwt} = require('express-jwt');

module.exports = () => {
    const secret = process.env.SECRET;
    const api = process.env.API_URL;

    return expressjwt({
        secret,
        algorithms: ['HS256'],
        isRevoked
    }).unless({
        path: [
            { url: /\/public\/uploads(.*)/, methods: ['GET', 'OPTIONS'] },
            { url: /\/api\/v1\/products(.*)/, methods: ['GET', 'OPTIONS'] },
            { url: /\/api\/v1\/categories(.*)/, methods: ['GET', 'OPTIONS'] },
            { url: /\/api\/v1\/orders(.*)/, methods: ['GET', 'OPTIONS', 'POST'] },
            `${api}/users/login`,
            `${api}/users/register`
        ]
    })
}

async function isRevoked(req, token) {
    if (!token.payload.isAdmin) {
        return true;
    }
}
