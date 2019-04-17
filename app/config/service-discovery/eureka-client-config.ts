

import os from 'os';
import { Eureka, EurekaClient } from 'eureka-js-client';
import randomstring from 'randomstring';

export class EurekaClientConfig {

    private localIpAddress: string;

    private eurekaInstance: any;

    constructor() {
        this.localIpAddress = this.getLocalIpAddress();
    }

    private getLocalIpAddress (): string {
        let localIp = 'N/A';
        
        const ifaces = os.networkInterfaces();

        // getting the local ip adress
        Object.keys(ifaces).forEach((ifname) => {
            ifaces[ifname].forEach((iface: any) => {
                if ('Ethernet' === ifname) {
                    localIp =  iface.address;
                }     
            });
        });

        return localIp;
    }

    // Config eureka client
    public configEurekaClient(servicePort: number, apikey: string): Eureka {

        const dataCenterName: EurekaClient.DataCenterName = 'MyOwn';
        const portWrapper: EurekaClient.LegacyPortWrapper = {
                '$': servicePort,
                '@enabled': true
        }

        const client = {
            instance: {
                app: 'document-persistence-service',
                hostName: 'document-persistence-service:' +  randomstring.generate(32),
                ipAddr: this.localIpAddress,
                port: portWrapper,
                vipAddress: 'document-persistence-service',
                statusPageUrl: ("http://" + this.localIpAddress + ":" +  servicePort + "/info"),
                homePageUrl: "http://" + this.localIpAddress + ":" + portWrapper['$'],
                dataCenterInfo: {
                    '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
                    name: dataCenterName,
                },
                metadata: {
                    "api-key": apikey
                }
              },        
              eureka: {
                useLocalMetadata: true,
                // eureka server host / port
                host: '127.0.0.1',
                port: 8761,
                servicePath: '/eureka/apps',
              }
            }
            
         return this.eurekaInstance = new Eureka(client); 
    }

    public getClientInstance(): Eureka {
        return this.eurekaInstance;
    }
}