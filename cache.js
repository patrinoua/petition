const redis = require('../../config/redis');
const app = express();
const cache = require('./cache');

const leo = {
    age : 43,
    name : 'leonardo',
    oscars : 4
}

cache.setex('leo', 25, JSON.stringify(leo)).then(function(){
    return cache.get('leo');
}).then(function(val){
    console.log(val);
});

var client = redis.createClient({
    host: 'localhost',
    port: 6379
});

client.on('error', function(err) {
    console.log(err);
});

client.set('day','thursday', function(err,data){
    console.log(err, data);
})

//key duration value
client.setex('month',15,'april', function(err,data){
    console.log(err, data);
})

exports.get = function(key){
    return new Promise(function(resolve,reject){
        client.get(key,function(err,data){
            if(err){
                reject(err);
            }else {
                resolve(data);
            }
        })
    })
}

exports.del = function(key){
    return new Promise(function(resolve,reject){
        client.get(key,function(err,data){
            if(err){
                reject(err);
            }else {
                resolve(data);
            }
        })
    })
}
