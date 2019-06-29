import  Amqp, { Channel }  from 'amqplib';
/*import { start } from 'repl';
import { connect } from 'net';
import { any } from 'bluebird';*/
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
            username: 'root',
            password: 'root'
        }
        
        Amqp.connect("amqp://192.168.100.107", options).then((connection: Amqp.Connection) => {
           
            connection.on('error', (error => {

                console.log(error)
                throw error;
            }));

            this.conn = connection;
            this.conn.createChannel().then((channel) => {
                AmpqClient.channel = channel;
                this.startListening();
            });

            connection.on('close', (() => {
                console.error("Connection closed... trying to reconnect.");
                return setTimeout(this.config, 1000);
            }));

            console.log("AMPQ Connected succefully");
           
      });
    }

    private startListening() {
        AmpqClient.channel.bindQueue("user-document-operation-queue", "user-persistence-document-exchange", "user-document-operation-routingkey")
        AmpqClient.channel.prefetch(250);
        AmpqClient.channel.assertQueue("user-document-operation-queue", {durable: false})
        AmpqClient.channel.consume("user-document-operation-queue", this.consume);

    }

    private static startPublishing(msg:any) {
        console.log(msg)
       AmpqClient.channel.publish("user-persistence-document-exchange", "user-document-sinc-routingkey", Buffer.from(JSON.stringify(msg)))
    }

    private consume(msg: any) {
        const object = JSON.parse(msg.content.toString("utf-8"));
        console.log(object)

        switch(object.operationCod) {
            case 1:  AmpqClient.saveDocument(object, msg); break;
            case 2: AmpqClient.updateDocument(object, msg); break;
            case 3: AmpqClient.deleteDocument(object, msg); break;
        }
 
    }

    private static saveDocument(object: any, message: any) {
        Crypto.randomBytes(16, (err: any, buf: any) => {
            if(err) {
                throw err;                    
            }

            var uploadStream = AmpqClient.gfs.openUploadStream(buf.toString('hex'));

            uploadStream.write(Buffer.from(object.bytes), (err)=> {
               console.log("aqui", err);
            });

            uploadStream.end(()=> {
                AmpqClient.startPublishing({ id: object.id, documentId:uploadStream.id });
                AmpqClient.channel.ack(message);
            });
        })

    }

    private static updateDocument(_object: any, _message: any) {

    }

    private static deleteDocument(_object: any, _message: any) {
 
    }
    
}
