import  Amqp, { Channel }  from 'amqplib';
import { GridFSBucket } from 'mongodb';
import Crypto from 'crypto';

export class AmpqClient {

    conn!: Amqp.Connection;
    private static gfs: GridFSBucket;
    private static channel: Channel;

    constructor() {

    }

    config(gfs: any) {
        AmpqClient.gfs = gfs;

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
                AmpqClient.channel = channel;
                this.startListening();
            });

            connection.on('close', (() => {
                console.error("Connection closed... trying to reconnect.");
                return setTimeout(this.config, 1000);
            }));
           
      });
    }

    private startListening() {
        AmpqClient.channel.bindQueue("user-document-operation-queue", "user-persistence-document-exchange", "user-document-operation-routingkey")
        AmpqClient.channel.prefetch(250);
       
        AmpqClient.channel.assertQueue("user-document-operation-queue", { durable: true }).done(()=> {
            AmpqClient.channel.consume("user-document-operation-queue", this.consume );
        });
    }

    private static startPublishing(msg:any) {
       console.log(msg)
       AmpqClient.channel.publish("user-persistence-document-exchange", "user-document-sinc-routingkey",
                                  Buffer.from(JSON.stringify(msg)), 
                                  { contentType: 'application/json'})
    }

    private consume(msg: any) {

        const object = JSON.parse(msg.content.toString());
        
        switch(object.operationCod) {
            case 1: AmpqClient.saveDocument(object, msg); break;
            case 2: AmpqClient.updateDocument(object, msg); break;
            case 3: AmpqClient.deleteDocument(object, msg); break;
        }
 
    }

    private static saveDocument(object: any, message: any) {
        Crypto.randomBytes(16, (err: any, buf: any) => {
            if(err) {
                throw err;                    
            }

            const buffer = Buffer.from(object.bytes, "binary");
            const uploadStream = AmpqClient.gfs.openUploadStream(buf.toString('hex'), {contentType: "image/jpeg"});

            uploadStream.write(buffer);

            uploadStream.end(()=> {
                AmpqClient.startPublishing({ userId: object.userId, documentId: uploadStream.id });
                AmpqClient.channel.ack(message);
            });
        })

    }

    private static updateDocument(_object: any, _message: any) {

    }

    private static deleteDocument(_object: any, _message: any) {
 
    }
    
}
