import { Mongoose }  from 'mongoose';
import assert from 'assert';
import { GridFSBucket, MongoError } from 'mongodb';
import GridFsStorage from 'multer-gridfs-storage';
import Crypto from 'crypto';
import multer from 'multer'

export class MongoDBConfig {

    private mongoURI: string;
    private mongoOptions: object;

    constructor() {
        // MongoDB - connection
        this.mongoURI = "mongodb://10.0.2.84:27017?authMechanism=SCRAM-SHA-256";
        this.mongoOptions = {
            useNewUrlParser: true,
            dbName: 'test_db', 
            user: 'app_admin', 
            pass: 'app_admin', 
            auth: { 
                authdb: 'admin'
            }
        };
    }

    public configDB(callback: Function) {    
        // Create Mongo connection
        new Mongoose().connect(this.mongoURI, this.mongoOptions).then((mongoose: Mongoose) => {
            let gfs = new GridFSBucket(mongoose.connection.db, { bucketName: 'user_docs' });
            let storage = this.configStorage();
            
            callback(gfs,  multer( { storage } ));
            console.log(`Database connected: ${this.mongoURI}`)

        }).catch((err: MongoError) => {
            assert.ifError(err);
            callback(err);
        });
    }

    private configStorage(): GridFsStorage {
        // Create a store object
        return new GridFsStorage({
            url: this.mongoURI,
            options: this.mongoOptions,    
            file: (_file: any) => {
                return new Promise((resolve, reject) => {
                     Crypto.randomBytes(16, (err: any, buf: any) => {
                        if(err) {
                            return reject(err);                    
                        }

                        const fileInfo = {
                            fileName: buf.toString('hex'),
                            bucketName: 'user_docs'
                        };

                        resolve(fileInfo);
                    })
                })
            }
        });
    }
} 