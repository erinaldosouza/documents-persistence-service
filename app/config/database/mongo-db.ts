import { Mongoose }  from 'mongoose';
import assert from 'assert';
import { GridFSBucket, MongoError } from 'mongodb';
import GridFsStorage from 'multer-gridfs-storage';
import Crypto from 'crypto';
import path from 'path';
import multer from 'multer'

export class MongoDBConfig {

    constructor(private mongoURI: string, private mongoOptions: Object) {
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
            file: (file: any) => {
                return new Promise((resolve, reject) => {
                     Crypto.randomBytes(16, (err: any, buf: any) => {
                        if(err) {
                            return reject(err);                    
                        }

                        const fileName = buf.toString('hex') + path.extname(file.originalname);
                        const fileInfo = {
                            fileName: fileName,
                            bucketName: 'user_docs'
                        };

                        resolve(fileInfo);
                    })
                })
            }
        });
    }
} 