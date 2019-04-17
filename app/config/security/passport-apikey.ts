import HeaderAPIKeyStrategy from 'passport-headerapikey';
import passport from 'passport';
import randomstring from 'randomstring';


export class ApiKeySecurityConfig {

    // Config api key
    private securityHeaderConfig = { header: 'api-key', prefix: 'Api-Key-' }; 
    private API_KEY = randomstring.generate(100);

    public configApiKey() {
                   
        // Verifying api key
        passport.use(new HeaderAPIKeyStrategy(this.securityHeaderConfig, false, (apikey: any, done: any) => {
                return done(null, this.API_KEY === apikey)
            }
        ));

        return passport;
    }

    public getApiKey(): string {
        return this.API_KEY;
    }
}