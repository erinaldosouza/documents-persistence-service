const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer  = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const bodyParser = require('body-parser');
const passport = require('passport');
const HeaderAPIKeyStrategy = require('passport-headerapikey').HeaderAPIKeyStrategy;
const { GridFSBucket, ObjectID } = require('mongodb')

const app = express();

// Middleware
app.use(bodyParser.json());

const port = 5000;

app.listen(port, ()=> {
    console.log(`Server started on port ${port}`)
})

// Config api key
const securityHeaderConfig = { header: 'api-key', prefix: 'Api-Key-' }; 

const API_KEY = 'a';
    
// Verifying api key
passport.use(new HeaderAPIKeyStrategy(securityHeaderConfig, false, (apikey, done) => {
        return done(null, API_KEY === apikey)
    }
));

const passportSession = { session: false };
app.use(passport.initialize());

// Init gfs
let gfs;

// Mongo uri
const mongoURI = "mongodb://localhost:27017/test_db";
const mongoOptions = { useNewUrlParser: true }

// Create Mongo connection
mongoose.connect(mongoURI, mongoOptions, (err, conn) => {
    
    if(err) console.log(err);
    
    gfs = new GridFSBucket(conn.db, {bucketName: 'user_docs'});

});

// Create a store object
const storage = new GridFsStorage({
    url: mongoURI,
    options: mongoOptions,    
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
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

const upload = multer({ storage });

// Read all files from MongoDB
// Saying that the url / must have the api key
app.get('/', passport.authenticate('headerapikey', passportSession), (req, res) => {
    gfs.find().toArray((err, files) => {  
        if(!files || files.lengh === 0) {
            return res.status(404).json({
                err: 'No file found'
            });
        }
        return res.json(files);
    })
});

// Read a specific file from MongoDB
app.get('/:id', passport.authenticate('headerapikey', passportSession), (req, res) => {
    gfs.find(new ObjectID(req.params.id)).next((err, files) => {  
        if(!files || files.lengh === 0) {
            return res.status(404).json({
                err: 'No file found'
            });
        }
        return res.json(files);
    })
});

// display a single file from MongoDB
app.get('/img/:id', passport.authenticate('headerapikey', passportSession), (req, res) => {
    gfs.find(new ObjectID(req.params.id)).next((err, file) => {  
        if(!file || file.lengh === 0) {
            return res.status(404).json({
                err: 'No file found'
            });
        }

        if(file.contentType === "image/jpeg" || file.contentType === "image/png") {
            const readStream = gfs.openDownloadStream(file._id);
            readStream.pipe(res);
        } else {
            resizeTo.status(404).json({
                err: 'Not an image'
            })
        }
    })
})

app.post('/', upload.single('file'), (req, res) => {
    res.json({ file: req.file })
});

app.delete('/:id', passport.authenticate('headerapikey', passportSession), (req, res) => {
    console.log("ID", req.params.id)
    gfs.delete(new ObjectID(req.params.id), (err, gridStore) => {
         if(err) {
             return res.status(500).json({err: err});
         }
         return res.status(200).json({msg: 'success'})
    })
});