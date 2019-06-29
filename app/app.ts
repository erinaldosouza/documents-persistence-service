import assert from 'assert';
import express from 'express';
import bodyParser from 'body-parser';

import { EurekaClientConfig } from './config/service-discovery/eureka-client-config';
import { MongoDBConfig } from './config/database/mongo-db';
import { ApiKeySecurityConfig } from './config/security/passport-apikey';
import { DocumentsPersistenceService } from './persistence-services/documentos-persistence-service';
import { AmpqClient } from './config/messaging/ampq';

const port = 5000;

const app = express();

// Middleware
app.use(bodyParser.json());

let eurekaClient: any;

app.listen(port, () => {
    // MongoDB - connection
    const mongoURI = "mongodb://localhost:27017/test_db";
    const mongoOptions = { useNewUrlParser: true }

    // Call init to start doing configurations after connected with database
    new MongoDBConfig(mongoURI, mongoOptions).configDB(init);
});

const init = (gfs: any, upload: any, err?: any) => {
    // stop when error with database connection
    assert.ifError(err);    

    // Api key configuration
    const passportSession = { session: false };
    const apiKeySecurityConfig = new ApiKeySecurityConfig();
    const passport = apiKeySecurityConfig.configApiKey();
    app.use(passport.initialize());

    // Eureka Service Discovery - registry
    eurekaClient = new EurekaClientConfig().configEurekaClient(port, apiKeySecurityConfig.getApiKey());
    eurekaClient.start((err: any) => {
                        assert.ifError(err);     
                });

    // Endpoints configuration
    new DocumentsPersistenceService().config(app, passport, passportSession, eurekaClient, gfs, upload);

    new AmpqClient().config(gfs);

    console.log(`Service started on port ${port}`);
};