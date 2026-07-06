const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Sally API — Clinica Meridiem',
            version: '1.0.0',
            description: 'Documentazione API per il sistema di gestione dei percorsi terapeutici della Clinica Meridiem',
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Server locale',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ['./routes/*.js'],
};

module.exports = swaggerJsdoc(options);