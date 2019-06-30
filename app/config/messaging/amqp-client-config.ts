import  Amqp, { Channel }  from 'amqplib';
import { GridFSBucket, ObjectID } from 'mongodb';

export class AmqpClientConfig {

    conn!: Amqp.Connection;
    private static gfs: GridFSBucket;
    private static channel: Channel;

    constructor() {

    }

    config(gfs: any) {
        AmqpClientConfig.gfs = gfs;

        const options = {
            username: 'admin',
            password: 'admin'
        }
        
        Amqp.connect("amqp://192.168.100.107", options).then((connection: Amqp.Connection) => {
           
            connection.on('error', (error => {
                throw error;
            }));

            this.conn = connection;
            this.conn.createChannel().then((channel) => {
            console.log("AMPQ Connected succefully");
            AmqpClientConfig.channel = channel;
                this.startListening();
            });

            connection.on('close', (() => {
                console.error("Connection closed... trying to reconnect.");
                return setTimeout(this.config, 1000);
            }));
           
      });
    }

    private startListening() {
        AmqpClientConfig.channel.bindQueue("user-document-operation-queue", "user-persistence-document-exchange", "user-document-operation-routingkey")
        AmqpClientConfig.channel.prefetch(250);
       
        AmqpClientConfig.channel.assertQueue("user-document-operation-queue", { durable: true }).done(()=> {
            AmqpClientConfig.channel.consume("user-document-operation-queue", this.consume );
        });
    }

    private static startPublishing(msg:any) {
        AmqpClientConfig.channel.publish("user-persistence-document-exchange", "user-document-sinc-routingkey",
                                  Buffer.from(JSON.stringify(msg)), 
                                  { contentType: 'application/json'})
    }

    private consume(msg: any) {

        const object = JSON.parse(msg.content.toString());
        switch(object.operationCod) {
            case 1: AmqpClientConfig.saveDocument(object, msg); break;
            case 2: AmqpClientConfig.updateDocument(object, msg); break;
            case 3: AmqpClientConfig.deleteDocument(object, msg); break;
        }
    }

    private static saveDocument(object: any, msg: any) {
        
        //const buffer = Buffer.from(object.bytes, "binary");
        const uploadStream = AmqpClientConfig.gfs.openUploadStream(object.filename, { contentType: object.contentType });

        uploadStream.write(Buffer.from(object.bytes, 'base64'));

        uploadStream.end(()=> {
            AmqpClientConfig.startPublishing({ userId: object.userId, documentId: uploadStream.id, operationCod: 1 });
            AmqpClientConfig.channel.ack(msg);           
        });
    }

    private static updateDocument(object: any,  msg: any) {
        AmqpClientConfig.gfs.delete(new ObjectID(object.documentId), (error) => { 

           if (error) {
               console.error("Error", error);
          
            } else {
                const uploadStream = AmqpClientConfig.gfs.openUploadStreamWithId(new ObjectID(object.documentId), object.filename, { contentType: object.contentType });
                uploadStream.write(Buffer.from(object.bytes, 'base64'));

                uploadStream.end(()=> {
                    AmqpClientConfig.startPublishing({ userId: object.userId, documentId: uploadStream.id, operationCod: 2 });
                    AmqpClientConfig.channel.ack(msg);
                });
           }
        })
    }

    private static deleteDocument(object: any, msg: any) {
        AmqpClientConfig.gfs.delete(new ObjectID(object.documentId), (error) => { 
           
            if (error) {
                console.error("Error", error)
            
            } else {
                AmqpClientConfig.startPublishing({ documentId: object.documentId, operationCod: 3 });
                AmqpClientConfig.channel.ack(msg);
            }

        })
    }
}
