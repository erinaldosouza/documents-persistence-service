
   import { ObjectID } from 'mongodb';

   export class DocumentsPersistenceService {
       

    public config(app: any, passport: any, passportSession: any, eurekaClient: any, gfs: any, upload: any) {

        // Read all files from MongoDB
        // Saying that the url / must have the api key
        app.get('/', passport.authenticate('headerapikey', passportSession), (_req: any, res: any) => {
            gfs.find().toArray((err: any, files: any) => { 
                if (err) console.log(err);
                if(!files || files.lengh === 0) {
                    return res.status(404).json({
                        err: 'No file found'
                    });
                }
                return res.json(files);
            })
        });

        app.get('/info', passport.authenticate('headerapikey', passportSession), (_req: any, res: any) => {
            return res.json(eurekaClient.config.instance);
        })

        // Read a specific file from MongoDB
        app.get('/:id', passport.authenticate('headerapikey', passportSession), (req: any, res: any) => {
            gfs.find(new ObjectID(req.params.id)).next((err: any, files: any) => {  
                if (err) console.log(err);
                if(!files || files.lengh === 0) {
                    return res.status(404).json({
                        err: 'No file found'
                    });
                }
                return res.json(files);
            })
        });

        // display a single file from MongoDB
        app.get('/img/:id', passport.authenticate('headerapikey', passportSession), (req: any, res: any) => {
            gfs.find(new ObjectID(req.params.id)).next((err: any, file: any) => {  
                if (err) console.log(err);
                if(!file || file.lengh === 0) {
                    return res.status(404).json({
                        err: 'No file found'
                    });
                }

                if(file.contentType === "image/jpeg" || file.contentType === "image/png") {
                    const readStream = gfs.openDownloadStream(file._id);
                    readStream.pipe(res);
                } else {
                    res.status(404).json({
                        err: 'Not an image'
                    })
                }
            })
        })

        app.post('/', passport.authenticate('headerapikey', passportSession), upload.single('file'), (req: any, res: any) => {
            res.json({ file: req.file })
        });
        
        app.post('/files', passport.authenticate('headerapikey', passportSession), upload.array('files'), (req: any, res: any) => {
            res.json({ files: req.files })
        });

        app.put('/:id', passport.authenticate('headerapikey', passportSession), upload.single('file'), (req: any, res: any) => {
            gfs.delete(new ObjectID(req.params.id), (err: any) => {
                if(err) {
                    return res.status(500).json({err: err});
                }
            })
            res.json({ file: req.file })
        });

        app.delete('/:id', passport.authenticate('headerapikey', passportSession), (req: any, res: any) => {
            gfs.delete(new ObjectID(req.params.id), (err: any) => {
                if(err) {
                    return res.status(500).json({err: err});
                }
                return res.status(200).json({msg: 'success'})
            })
        })

    }
};
